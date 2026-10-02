
from __future__ import annotations

import re
import time
import tempfile
from typing import Any, Optional

from invmut.esbmc.runner import temp_sol
from invmut.mutation.harness import HarnessTarget
from invmut.mutation.r2 import doc1_target_to_harness_target
from invmut.mutation.solast import analyze_contract
from invmut.render import pipeline as _pipeline
from invmut.render.model import RenderInput
from invmut.replay.build import REPLAY_FN_PREFIX, render_test_source, translate
from invmut.replay.translate import declared_dependency_etch_lines

ORIGIN = "witness_replay"


def _p_analysis(rc):
    cached = getattr(rc, "_replay_p_info", None)
    if cached is not None:
        return cached[0]
    try:
        with temp_sol(rc.p_source, prefix="invmut_replay_p_") as path:
            info = analyze_contract(rc.config.solc_bin, rc.p_source, path, rc.contract)
    except Exception:
        info = None
    rc._replay_p_info = (info,)
    return info


def _constructor_fixture(rc):
    if not getattr(rc.config, "witness_replay_constructor_fixture", False):
        return None
    cached = getattr(rc, "_replay_ctor_fixture", None)
    if cached is not None:
        return cached[0]
    from invmut.orchestrate.prep import resolve_construction
    try:
        fixture = resolve_construction(rc.config, rc.p_source, rc.contract)
    except Exception:
        fixture = None
    rc._replay_ctor_fixture = (fixture,)
    return fixture


def _failure_excerpt(outcome, limit: int = 240) -> str | None:
    if outcome is None:
        return None
    for name, tr in (getattr(outcome, "tests", {}) or {}).items():
        if name.startswith(REPLAY_FN_PREFIX) and tr.get("status") == "Failure":
            return str(tr.get("reason") or "no_reason")[:limit]
    if getattr(outcome, "setup_reason", None):
        return f"setup:{outcome.setup_reason}"[:limit]
    return f"kind:{getattr(outcome, 'kind', '?')}"[:limit]


def _record(rc, res, diff_id, target_id, outcome, reason=None, **extra):
    rec = {"difference_id": diff_id, "boundary": target_id, "branch": "witness_replay",
           "outcome": outcome, "reason": reason, **extra}
    res.test_records.append(rec)
    if rc.attempt_sink:
        rc.attempt_sink(rec)
    rc.emit(event="replay", difference_id=diff_id, outcome=outcome, reason=reason)


_VARIANTS = (
    ("base", {}, None),
    ("separate_deployer", {"separate_deployer": True}, None),
    ("reverting_receiver", {}, ["revert();"]),
    ("separate_deployer+reverting_receiver", {"separate_deployer": True}, ["revert();"]),
)


def run_replay_branch(rc, res, tjson: dict, cand, diff_id: str, m_source: str,
                      cd: dict) -> Optional[Any]:
    from invmut.orchestrate.run import AcceptedTest

    if not getattr(rc.config, "witness_replay", False) or not cd:
        return None
    target_id = tjson.get("id")
    info = _p_analysis(rc)
    if info is None:
        _record(rc, res, diff_id, target_id, "replay_not_rendered", "reference_analysis_failed")
        return None
    boundary = cd.get("boundary")
    htarget = doc1_target_to_harness_target(tjson, info.entries, boundary)
    if not isinstance(htarget, HarnessTarget):
        _record(rc, res, diff_id, target_id, "replay_not_rendered",
                f"harness_target:{getattr(htarget, 'reason', 'unknown')}")
        return None
    adaptive = bool(getattr(rc.config, "witness_replay_adaptive_rendering", False))
    emit_all = bool(getattr(rc.config, "witness_replay_emit_all_variants", False))
    deadline = getattr(rc, "fuzz_deadline", None) or getattr(rc, "mutation_deadline", None)
    variants = _VARIANTS if adaptive else _VARIANTS[:1]

    base_kwargs = dict(
        target_json=tjson, htarget=htarget, entries=info.entries,
        constructor=info.constructor, boundary=boundary, contract_type=rc.contract,
        constructor_fixture=_constructor_fixture(rc),
        actor_from_address_key=bool(getattr(rc.config, "witness_replay_actor_from_address_key", False)),
        fabricated_entry_state=bool(getattr(rc.config, "witness_replay_fabricated_entry_state", False)),
        eoa_actor=bool(getattr(rc.config, "witness_replay_eoa_actor", False)),
        default_unbound_args=bool(getattr(rc.config, "witness_replay_default_unbound_args", False)),
        during_call_observer=bool(getattr(rc.config, "witness_replay_during_call_observer", False)),
        separate_deployer=bool(getattr(rc.config, "witness_replay_separate_deployer", False)),
        safety_check_oracle=bool(getattr(rc.config, "witness_replay_safety_check_oracle", False)))

    first = None
    kept = None
    tried: list[str] = []
    seen_src: set[str] = set()
    _dk = str(cd.get("difference_kind") or "")
    for vname, overrides, receive_override in variants:
        if receive_override is not None and _dk in ("state", "return"):
            tried.append(f"{vname}(差分不是 revert 型)")
            continue
        if tried and deadline is not None and time.time() >= deadline:
            break
        try:
            body, meta, err = translate(cd, **{**base_kwargs, **overrides})
        except Exception as e:
            body, meta, err = None, {}, f"renderer_exception:{type(e).__name__}:{e}"[:200]
        if err or not body:
            if first is None:
                first = ("replay_not_rendered", err or "empty_body", None, {}, None, None, None)
            tried.append(vname)
            continue

        _wv = ((cd.get("oracle_asset") or {}).get("witness_values")
               or (cd.get("witness_detail") or {}).get("witness_values") or {})
        _wd = cd.get("witness_detail") if isinstance(cd.get("witness_detail"), dict) else {}
        meta = {**meta, "witness_keys": sorted(_wv.keys()) if isinstance(_wv, dict) else [],
                "during_call": bool(cd.get("during_call") or _wd.get("during_call")),
                "difference_kind": cd.get("difference_kind")}
        if bool(getattr(rc.config, "witness_replay_deploy_declared_dependencies", False)):
            etch = declared_dependency_etch_lines(rc.p_source, rc.contract)
            if etch:
                body = [*etch, *body]
        receive_body = receive_override if receive_override is not None else meta.get("receive_body")
        src, fn = render_test_source(body, difference_id=diff_id, pragma=rc.pragma,
                                     import_path=rc.import_path, contract_type=rc.contract,
                                     contract_members=meta.get("contract_members"),
                                     receive_body=receive_body)
        if src in seen_src:
            tried.append(f"{vname}(=前一个变体)")
            continue
        seen_src.add(src)
        ri = RenderInput(bundle={}, c_scope_source=rc.p_source, m_scope_source=m_source,
                         import_path=rc.import_path, pragma=rc.pragma, contract_name=rc.contract)
        root = tempfile.mkdtemp(prefix="invmut_replay_ws_")
        verdict, p_log, m_log = _pipeline._validate_rendered(
            rc.config, ri, src, "InvMutTest", root, _pipeline._solc_version(rc.config),
            force_pm=True, fuzz_runs=1)
        straight_line = not re.search(r"\b(if|for|while)\s*\(", "\n".join(body))
        p_ran = (verdict.p_outcome is not None
                 and verdict.p_outcome.status_of("testReplay_") == "Success")
        tried.append(vname)
        if verdict.status != "passed" or not p_ran:
            if first is None:
                first = ("replay_rejected",
                         verdict.error or ("p_test_did_not_run" if not p_ran else "unknown"),
                         src, meta, _failure_excerpt(verdict.p_outcome),
                         _failure_excerpt(verdict.m_outcome), None)
            continue

        this_id = diff_id if kept is None else f"{diff_id}~{vname.split('+')[0][:2]}{len(tried)}"
        acc = AcceptedTest(
            target_id, cand.unit_id, this_id,
            f"concrete replay of counterexample {diff_id} ({meta.get('template')}, {vname})",
            src, "rendered", "passed",
            workspace_P_log=p_log, workspace_M_log=m_log,
            mutated_unit_code=cand.mutated_unit_code, change_summary=cand.change_summary,
            origin=ORIGIN, standalone_replay=True, property_based_core=False,
            oracle_reach=("structural" if straight_line else "undecided"),
            oracle_origin="ce_witness_replay", kill_entrypoint=fn,
            ce_id=cd.get("confirmed_difference_id"), source_difference_id=diff_id,
            confirmed_difference=cd)
        res.accepted_tests.append(acc)
        _record(rc, res, this_id, target_id, "replay_accepted", None,
                template=meta.get("template"), test_code=src,
                witness_keys=meta.get("witness_keys"), during_call=meta.get("during_call"),
                difference_kind=meta.get("difference_kind"),
                variant=vname, variants_tried=list(tried))
        rc.emit(event="accepted", difference_id=this_id, render_status="rendered",
                validation_status="passed", origin=ORIGIN)
        if kept is None:
            kept = acc
        if not emit_all:
            return kept
        continue

    if kept is not None:
        return kept
    outcome, reason, src, meta, pf, mf, _ = first or (
        "replay_not_rendered", "empty_body", None, {}, None, None, None)
    _oa = cd.get("oracle_asset") if isinstance(cd.get("oracle_asset"), dict) else {}
    _refusal = {
        "observed_pair": _oa.get("observed_pair") or cd.get("observed_pair"),
        "observed_values": sorted((_oa.get("observed_values") or {}).keys()),
        "assertion_id": _oa.get("assertion_id"),
        "boundary": boundary,
        "trace_len": (_oa.get("witness_values") or {}).get("__invmut_trace_len"),
        "trace_overflow": (_oa.get("witness_values") or {}).get("__invmut_trace_overflow"),
        "ctor_params": len(getattr(info.constructor, "params", []) or []),
        "ctor_args_bound": len([k for k in (_oa.get("witness_values") or {}) if "ctor_arg" in k]),
        "claim": str(((cd.get("witness_detail") or {}).get("claim")) or "")[:400],
        "difference_kind": cd.get("difference_kind"),
        "focus_function": _oa.get("focus_function"),
        "witness_keys_n": len(_oa.get("witness_values") or {}),
    }
    _record(rc, res, diff_id, target_id, outcome, reason,
            template=meta.get("template"), test_code=src,
            witness_keys=meta.get("witness_keys"), during_call=meta.get("during_call"),
            difference_kind=meta.get("difference_kind"),
            p_failure=pf, m_failure=mf, variants_tried=list(tried), refusal=_refusal)
    return None
