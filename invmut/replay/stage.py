"""The witness-replay branch, wired into the run loop.

Runs once per confirmed difference, right after the mutant compiles and BEFORE any LLM call, so it
neither spends nor depends on the property-test budget: the two branches of test synthesis are
independent, and a case can end with a replay, a property test, both, or neither.

Retention is the paper's rule and nothing weaker: the replay is kept only when its assertions
execute and pass on the reference P and at least one of them fails on the mutant M. That check is
the SAME `classify_validation` the property branch uses, so both branches are judged by one gate.
An incomplete witness produces no replay -- the renderers refuse rather than guess.
"""

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
    """entries + constructor of the reference contract C, analyzed once per case and cached on rc."""
    cached = getattr(rc, "_replay_p_info", None)
    if cached is not None:
        return cached[0]
    try:
        with temp_sol(rc.p_source, prefix="invmut_replay_p_") as path:
            info = analyze_contract(rc.config.solc_bin, rc.p_source, path, rc.contract)
    except Exception:  # noqa: BLE001 -- no AST => no replay for this case, never an abort
        info = None
    rc._replay_p_info = (info,)
    return info


def _constructor_fixture(rc):
    """The pipeline's own deployment recipe, used ONLY for constructor arguments the witness leaves
    unbound (witness-bound arguments always win in `_constructor_expr`)."""
    if not getattr(rc.config, "witness_replay_constructor_fixture", False):
        return None
    cached = getattr(rc, "_replay_ctor_fixture", None)
    if cached is not None:
        return cached[0]
    from invmut.orchestrate.prep import resolve_construction   # lazy: avoid an import cycle
    try:
        fixture = resolve_construction(rc.config, rc.p_source, rc.contract)
    except Exception:  # noqa: BLE001
        fixture = None
    rc._replay_ctor_fixture = (fixture,)
    return fixture


def _failure_excerpt(outcome, limit: int = 240) -> str | None:
    """WHY forge said no on this side, from the parsed run. Without it every rejection on P reads the
    same and the next lever has to be guessed instead of counted."""
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


# Rendering choices the counterexample leaves FREE, tried in order until one reproduces the
# witness on P.  Each is a translation of something the model bound but the default rendering
# silently resolved the other way, so trying them is faithfulness work, not search:
#
#   separate_deployer    the model's constructor runs with a msg.sender of its own (measured
#                        0x80000002 against a Harness at address 2), so a contract that stores
#                        `owner = msg.sender` has owner != caller there and owner == caller here.
#                        A witness that says P REVERTS on an owner-guarded entry is stating that
#                        configuration; deploying from a second account rebuilds it.
#   reverting_receiver   ESBMC treats a low-level send/call's return as NONDETERMINISTIC -- measured:
#                        with the callee funded, `require(payable(msg.sender).send(1))` still has a
#                        failing path.  So "P reverts" at a return-value-checking entry binds "the
#                        transfer failed", and the only way a concrete EVM realises that is a
#                        recipient that rejects the ether.
#
# The acceptance rule does not move: a variant is kept only if forge still says Pass(P) and
# Break(M).  Which one was kept is recorded on the row, so no row's provenance is guessed.
_VARIANTS = (
    ("base", {}, None),
    ("separate_deployer", {"separate_deployer": True}, None),
    ("reverting_receiver", {}, ["revert();"]),
    ("separate_deployer+reverting_receiver", {"separate_deployer": True}, ["revert();"]),
)


def run_replay_branch(rc, res, tjson: dict, cand, diff_id: str, m_source: str,
                      cd: dict) -> Optional[Any]:
    """Translate this difference's counterexample into a standalone test and keep it iff P/M agree
    with the paper's rule. Returns the AcceptedTest, or None with the reason recorded."""
    from invmut.orchestrate.run import AcceptedTest   # lazy: run.py imports this module

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
    # Keep EVERY variant that passes, not just the first. The variants resolve a choice the
    # counterexample left free, so one witness legitimately has more than one faithful rendering, and
    # which of them exposes a mutant is decided by forge under the unchanged Pass(P)/Break(M) rule --
    # the held-out bug never enters it. Without this the default rendering pre-empts the others
    # whenever it happens to break the mutant on its own.
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

    first = None            # what the DEFAULT rendering did, so a rejected row reads as before
    kept = None             # the first variant that passed, returned as this difference's test
    tried: list[str] = []
    # A variant only differs where its choice is reachable: on a state-kind difference the deployer
    # lever changes nothing, so two variants render the SAME source. Running forge twice on identical
    # text would buy nothing and would store the same test twice.
    seen_src: set[str] = set()
    # The rejecting receiver resolves what the callee of a low-level transfer does, and the only
    # thing the witness records about that is the boundary's revert flag. On a state- or return-kind
    # difference it can therefore never help: either the body sends nothing back and the rendering is
    # behaviourally identical, or it does and P now reverts, which fails the test on P. Skipping it
    # there keeps the case wall for mutants instead of spending it on forge runs that cannot pass.
    _dk = str(cd.get("difference_kind") or "")
    for vname, overrides, receive_override in variants:
        if receive_override is not None and _dk in ("state", "return"):
            tried.append(f"{vname}(差分不是 revert 型)")
            continue
        if tried and deadline is not None and time.time() >= deadline:
            break
        try:
            body, meta, err = translate(cd, **{**base_kwargs, **overrides})
        except Exception as e:  # noqa: BLE001 -- a renderer crash must not abort the case
            body, meta, err = None, {}, f"renderer_exception:{type(e).__name__}:{e}"[:200]
        if err or not body:
            if first is None:
                first = ("replay_not_rendered", err or "empty_body", None, {}, None, None, None)
            tried.append(vname)
            continue

        # Which fields the counterexample actually pinned. Diagnostic: a recorded harness field that
        # never shows up here was not printed by ESBMC, and any oracle built on it would be built on
        # nothing.
        _wv = ((cd.get("oracle_asset") or {}).get("witness_values")
               or (cd.get("witness_detail") or {}).get("witness_values") or {})
        _wd = cd.get("witness_detail") if isinstance(cd.get("witness_detail"), dict) else {}
        meta = {**meta, "witness_keys": sorted(_wv.keys()) if isinstance(_wv, dict) else [],
                # Whether the query saw this difference DURING the boundary's external call.
                # Diagnostic: the during-call renderer can only ever fire on these, so its footprint
                # is countable.
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
        # "assertions execute and pass on P". For a replay the two halves collapse: the body the
        # renderers emit is straight-line (the only control flow is a try/catch whose BOTH arms fall
        # through to the assertion), so reaching the end of the test implies reaching the assertion,
        # and a forge pass means the test reached its end. The guard below states that premise
        # instead of assuming it: if a renderer ever emits a branch, the reach verdict degrades to
        # undecided.
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

        # The default rendering keeps the difference's own id; an extra variant gets its own, because
        # kill_by_diff and the stored artifact are both keyed on it.
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
    # What the counterexample actually carried, on the rows that produced NO test. Without this a
    # refusal reason names the check that fired but not the input that tripped it, and the next fix
    # has to be guessed instead of read off the ledger.
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
        # the predicate ESBMC actually violated: it names the fields the CE should have bound, so an
        # empty observed_values can be told apart from "the harness never had those fields"
        "claim": str(((cd.get("witness_detail") or {}).get("claim")) or "")[:400],
        "difference_kind": cd.get("difference_kind"),
        "focus_function": _oa.get("focus_function"),
        "witness_keys_n": len(_oa.get("witness_values") or {}),
    }
    _record(rc, res, diff_id, target_id, outcome, reason,
            template=meta.get("template"), test_code=src,
            witness_keys=meta.get("witness_keys"), during_call=meta.get("during_call"),
            difference_kind=meta.get("difference_kind"),
            # WHY forge said no, not just that it did: without the revert string every rejection on P
            # looks alike and the next lever has to be guessed instead of counted.
            p_failure=pf, m_failure=mf, variants_tried=list(tried), refusal=_refusal)
    return None
