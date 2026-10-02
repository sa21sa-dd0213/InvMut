
from __future__ import annotations

import json
import os
import re
import tempfile
import time
from dataclasses import dataclass, field
from typing import Optional

from invmut.agents.client import LLMClient, LLMInfraError
from invmut.config import Config
from invmut.dataset.rename import RenameError, rename_to_C
from invmut.esbmc.runner import make_run_fn
from invmut.mutation.compile import make_solc_compile_fn
from invmut.orchestrate.run import ModelSpec, build_run_context, run_unit
from invmut.render.forge_parse import ForgeOutcome
from invmut.render.validate import run_forge
from invmut.render.workspace import build_workspace
from invmut.verify.verify import verify_test
from invmut import select

_PRAGMA = re.compile(r"pragma solidity[^;]*;")
_BASENAME = "C_under_test.sol"


def _pragma_of(src: str) -> str:
    m = _PRAGMA.search(src)
    return m.group(0) if m else "pragma solidity ^0.8.0;"


def kill_check(config: Config, rendered_test: str, test_name: str, bug_c_source: str,
               solc_version: str, forge_std_path: str, work_root: Optional[str] = None,
               match_test: str | None = None) -> str:
    cleanup = work_root is None
    root = work_root or tempfile.mkdtemp(prefix="invmut_kill_")
    try:
        ws = os.path.join(root, "workspace_bug")

        def _build_run(via_ir):
            build_workspace(ws, bug_c_source, _BASENAME, rendered_test, forge_std_path,
                            solc_version=solc_version, fuzz_runs=config.verifier.forge_fuzz_runs,
                            fuzz_seed=hex(config.verifier.forge_fuzz_seed), via_ir=via_ir)
            return run_forge(config, ws, test_name, match_test=match_test)

        out: ForgeOutcome = _build_run(via_ir=False)
        if out.kind == "compile_failed" and "Stack too deep" in (out.raw or ""):
            out = _build_run(via_ir=True)
        if out.kind == "compile_failed":
            return "bug_compile_failed"
        if out.kind == "setup_failed":
            return "bug_setup_failed"
        if out.kind == "timeout":
            return "bug_timeout"
        if out.kind in ("no_suite", "parse_error"):
            return "bug_source_suite_failed"
        return ("bug_property_failed"
                if out.any_failure(("testFuzz_", "testRegression_", "testReplay_")) else "bug_no_kill")
    finally:
        if cleanup:
            import shutil
            shutil.rmtree(root, ignore_errors=True)


def _kill_key(a) -> str:
    return (f"{a.difference_id}#replay" if getattr(a, "origin", "primary") == "witness_replay"
            else a.difference_id)


def _kill_decision(outcome: str, validation_status: str,
                   count_bug_compile_fail_as_kill: bool) -> tuple[bool, Optional[str]]:
    counts = validation_status == "passed"
    is_kill = outcome == "bug_property_failed"
    is_compile_kill = outcome == "bug_compile_failed" and count_bug_compile_fail_as_kill
    counts_toward_success = counts and (is_kill or is_compile_kill)
    kill_via = (("property_failed" if is_kill else "bug_build_failed")
                if counts_toward_success else None)
    return counts_toward_success, kill_via


def _esbmc_kill_against_bug(config: Config, fix_c: str, bug_c: str, a, construction: dict,
                            run_fn, compile_fn) -> tuple[str, Optional[str], bool]:
    vr = verify_test(config, fix_c, bug_c, a.llm_test_source, construction,
                     run_fn=run_fn, compile_fn=compile_fn)
    if vr["outcome"] == "accepted":
        return "bug_property_failed", "esbmc_property", True
    if vr.get("reason") == "harness_compile_failed":
        return "bug_compile_failed", "esbmc_compile", config.verifier.count_bug_compile_fail_as_kill
    detail = vr.get("reason") or vr["outcome"]
    return (f"bug_no_kill:{detail}", None, False)


def _foundry_kill_against_bug(config: Config, fix_c: str, bug_c: str, a, solc_version: str):
    if not (a.render_status == "rendered" and a.rendered_test):
        return None
    on_bug = kill_check(config, a.rendered_test, "InvMutTest", bug_c, solc_version, config.forge_std_path)
    if on_bug != "bug_property_failed":
        return None
    on_fix = kill_check(config, a.rendered_test, "InvMutTest", fix_c, solc_version, config.forge_std_path)
    if on_fix != "bug_no_kill":
        return None
    return ("bug_property_failed", "foundry_property", True)


def _norm_kill(outcome: Optional[str]) -> Optional[str]:
    return "bug_fail" if outcome in ("bug_property_failed", "bug_compile_failed") else outcome


def _norm_via(via: Optional[str]) -> Optional[str]:
    if via in ("esbmc_property", "esbmc_compile"):
        return "esbmc"
    if via in ("property_failed", "bug_build_failed", "foundry_property"):
        return "foundry"
    return via


def _score_kills(config: Config, accepted_tests: list, fix_c: str, bug_c: str, construction: dict,
                 solc_version: str, *, run_fn=None, compile_fn=None, deadline=None):
    llm_only = config.run_mode in ("llm_only", "no_pa")
    if llm_only:
        accepted = [a for a in accepted_tests if a.render_status == "rendered" and a.rendered_test]
        n_validated = sum(1 for a in accepted if a.validation_status == "passed")
    else:
        accepted = list(accepted_tests)
        n_validated = len(accepted)
        if run_fn is None:
            run_fn = make_run_fn(config)
        if compile_fn is None:
            compile_fn = make_solc_compile_fn(config)

    kills, n_killing, kill_by_diff = [], 0, {}
    for a in accepted:
        if deadline is not None and time.time() >= deadline:
            kill_by_diff.setdefault("_deadline_skipped", 0)
            kill_by_diff["_deadline_skipped"] += 1
            continue
        base = {"difference_id": a.difference_id, "property": a.property_summary[:120],
                "render": a.render_status, "validation": a.validation_status,
                "validation_error": a.validation_error,
                "origin": getattr(a, "origin", "primary"),
                "success_route": getattr(a, "success_route", None),
                "oracle_origin": getattr(a, "oracle_origin", None),
                "kill_entrypoint": getattr(a, "kill_entrypoint", None),
                "property_based_core": getattr(a, "property_based_core", None),
                "standalone_replay": getattr(a, "standalone_replay", None),
                "oracle_reach": getattr(a, "oracle_reach", None),
                "ce_id": getattr(a, "ce_id", None),
                "source_difference_id": getattr(a, "source_difference_id", None),
                "source_property_focus": getattr(a, "source_property_focus", None),
                "change_summary": a.change_summary, "mutated_unit_code": a.mutated_unit_code}
        _foundry_native = getattr(a, "origin", "primary") == "witness_replay"
        if llm_only or _foundry_native:
            outcome = kill_check(config, a.rendered_test, "InvMutTest", bug_c, solc_version,
                                 config.forge_std_path,
                                 match_test=getattr(a, "kill_entrypoint", None))
            counts, kill_via = _kill_decision(outcome, a.validation_status,
                                              config.verifier.count_bug_compile_fail_as_kill)
            kill_by_diff[_kill_key(a)] = _norm_kill(outcome)
            kills.append({**base, "kill": _norm_kill(outcome), "kill_via": _norm_via(kill_via),
                          "counts_toward_success": counts})
            n_killing += 1 if counts else 0
            continue
        outcome, kill_via, counts = _esbmc_kill_against_bug(config, fix_c, bug_c, a, construction,
                                                            run_fn, compile_fn)
        if not counts and getattr(config.verifier, "kill_esbmc_or_foundry", True):
            fk = _foundry_kill_against_bug(config, fix_c, bug_c, a, solc_version)
            if fk is not None:
                outcome, kill_via, counts = fk
        kill_by_diff[_kill_key(a)] = _norm_kill(outcome)
        kill = {**base, "kill": _norm_kill(outcome), "kill_via": _norm_via(kill_via),
                "counts_toward_success": counts}
        if config.verifier.esbmc_kill_forge_audit and a.render_status == "rendered" and a.rendered_test:
            kill["forge_audit"] = kill_check(config, a.rendered_test, "InvMutTest", bug_c, solc_version,
                                             config.forge_std_path)
        kills.append(kill)
        n_killing += 1 if counts else 0
    return accepted, n_validated, kills, n_killing, kill_by_diff


def _score_until(config: Config, accepted_tests: list, fix_c: str, bug_c: str, construction: dict,
                 solc_version: str, deadline: float):
    import threading
    done: list = []
    run_fn, compile_fn = make_run_fn(config), make_solc_compile_fn(config)

    def work():
        for a in accepted_tests:
            if time.time() >= deadline:
                return
            done.append((a, _score_kills(config, [a], fix_c, bug_c, construction, solc_version,
                                         run_fn=run_fn, compile_fn=compile_fn, deadline=deadline)))

    th = threading.Thread(target=work, daemon=True)
    th.start()
    th.join(max(0.0, deadline - time.time()))
    finished = list(done)
    kills, n_killing, kill_by_diff = [], 0, {}
    for _a, (_acc, _nv, k, nk, kbd) in finished:
        kills += k
        n_killing += nk
        for key, v in kbd.items():
            if key != "_deadline_skipped":
                kill_by_diff[key] = v
    unscored = len(accepted_tests) - sum(1 for _a, r in finished if r[2])
    if unscored:
        kill_by_diff["_deadline_skipped"] = unscored
    return list(accepted_tests), len(accepted_tests), kills, n_killing, kill_by_diff


@dataclass
class CaseResult:
    case_id: str
    config_label: str
    target_contract: str
    modification_kind: str
    feasible: bool = False
    reason: Optional[str] = None
    n_accepted: int = 0
    n_validated: int = 0
    n_killing: int = 0
    success: bool = False
    kills: list = field(default_factory=list)
    tokens: dict = field(default_factory=lambda: {"prompt": 0, "completion": 0, "reasoning": 0})
    wallclock_s: float = 0.0
    infra_error: Optional[str] = None
    code_rev: Optional[str] = None

    def as_dict(self) -> dict:
        return self.__dict__


def run_case(config: Config, case: dict, client: LLMClient, spec: ModelSpec,
             config_label: str, solc_version: str = "0.8.35", on_event=None,
             artifact_dir: Optional[str] = None, case_timeout_s: Optional[int] = None,
             replay_mutants_path: Optional[str] = None) -> CaseResult:
    t0 = time.time()
    cr = CaseResult(case["id"], config_label, case["target_contract"], case.get("modification_kind", ""))
    target = case["target_contract"]
    try:
        fix_src = open(case["fix"]).read()
        bug_src = open(case["bug"]).read()
    except OSError as e:
        cr.reason = f"read_error:{e}"
        cr.wallclock_s = time.time() - t0
        return cr

    fix_c = rename_to_C(config.solc_bin, fix_src, target)
    bug_c = rename_to_C(config.solc_bin, bug_src, target)
    if isinstance(fix_c, RenameError) or isinstance(bug_c, RenameError):
        cr.reason = "rename_failed"
        cr.wallclock_s = time.time() - t0
        return cr

    pragma = _pragma_of(fix_c)
    if config.run_mode == "direct_pbt":
        doc1 = {"targets": []}
    else:
        doc1 = None
    with tempfile.NamedTemporaryFile("w", suffix=".sol", delete=False) as f:
        f.write(fix_c)
        fix_path = f.name
    try:
        if doc1 is None:
            doc1 = select.analyze(fix_path, "C", config.solc_bin,
                              include_inherited_state=getattr(config, "select_inherited_state", False),
                              struct_leaf_projection=getattr(config, "select_struct_leaf_projection", False),
                              value_transfer_targets=getattr(config, "select_value_transfer_targets", False))
    except Exception as e:
        cr.reason = f"selection_failed:{str(e)[:80]}"
        cr.wallclock_s = time.time() - t0
        return cr
    finally:
        os.unlink(fix_path)

    if not doc1.get("targets") and config.run_mode != "direct_pbt":
        cr.reason = "selection_empty"
        cr.wallclock_s = time.time() - t0
        return cr

    rc = build_run_context(config, fix_c, doc1, client, spec, pragma=pragma)
    rc.on_event = on_event
    if getattr(config, "p_deploy_canary", False):
        from invmut.orchestrate import prep as _prep
        verdict, diag = _prep.p_deploy_canary(config, fix_c, rc.construction, pragma, solc_version)
        if verdict == "setup_reverts" and getattr(config, "ctor_nonzero_scalar_args", False):
            alt = _prep.resolve_construction(config, fix_c, "C", nonzero_scalars=False)
            if alt and alt != rc.construction:
                v2, d2 = _prep.p_deploy_canary(config, fix_c, alt, pragma, solc_version)
                if v2 == "ok":
                    rc.construction = alt
                    verdict, diag = "ok", None
                    if on_event:
                        on_event({"event": "deploy_canary", "verdict": "zero_scalar_fallback"})
        if on_event:
            on_event({"event": "deploy_canary", "verdict": verdict, "diagnostic": (diag or "")[:300]})
        if verdict == "setup_reverts":
            cr.reason = "p_deploy_reverts"
            cr.wallclock_s = time.time() - t0
            return cr
    rc.replay_manifest = replay_mutants_path
    _apply_ablation(rc, config.run_mode)
    try:
        from invmut.mutation.solast import target_scope_source
        rc.prompt_source = target_scope_source(config.solc_bin, fix_c, "C", pragma)
    except Exception:
        rc.prompt_source = fix_c
    if getattr(config, "diff_anchored_mutation", False) and config.run_mode != "llm_only":
        rc.bug_source = bug_c
    if case_timeout_s and not getattr(config, "no_mutation_deadline", False):
        mfrac = getattr(config, "mutation_deadline_fraction", 0.7)
        ffrac = getattr(config, "fuzz_deadline_fraction", 0.9)
        rc.mutation_deadline = t0 + case_timeout_s * mfrac
        rc.fuzz_deadline = t0 + case_timeout_s * ffrac
    if artifact_dir:
        _apath = os.path.join(artifact_dir, "tests", "attempts.jsonl")
        try:
            os.makedirs(os.path.dirname(_apath), exist_ok=True)

            rc.attempt_sink = lambda rec, _p=_apath: _append_attempt(_p, rec)
        except OSError:
            pass
    _k3 = int(getattr(config, "stage3_framework_abort_k", 0) or 0)
    if _k3 > 0:
        rc.attempt_sink = _stage3_gate(rc, rc.attempt_sink, _k3, on_event)
        _mpath = os.path.join(artifact_dir, "mutants.jsonl")
        try:
            os.makedirs(artifact_dir, exist_ok=True)
            rc.mutants_sink = lambda rec, _p=_mpath: _append_attempt(_p, rec)
        except OSError:
            pass
    try:
        if config.run_mode in ("llm_only", "no_pa"):
            from invmut.orchestrate.concrete import run_unit_llm_only
            res = run_unit_llm_only(rc)
        elif config.run_mode in ("direct_pbt", "no_mg"):
            from invmut.orchestrate.direct import run_unit_direct
            rc.t0 = t0
            rc.artifact_dir = artifact_dir
            rc.mutation_deadline = rc.fuzz_deadline = t0 + config.direct_generation_s
            rc.direct_score = {"bug_c": bug_c, "solc_version": solc_version,
                               "deadline": t0 + config.direct_score_until_s}
            if client is not None:
                client.hard_deadline = t0 + config.direct_score_until_s
            res = run_unit_direct(rc, focus=(config.run_mode == "no_mg"))
        else:
            res = run_unit(rc)
    except LLMInfraError as e:
        cr.infra_error = e.kind
        cr.reason = f"infra:{e.kind}"
        cr.wallclock_s = time.time() - t0
        return cr

    cr.tokens = res.tokens
    if res.infra_aborted:
        cr.infra_error = res.infra_reason
    if artifact_dir:
        _write_mutant_manifest(artifact_dir, res)
    _scored = {s["difference_id"]: s for s in getattr(res, "inline_scored", [])}
    if config.run_mode in ("direct_pbt", "no_mg"):
        _kdl = t0 + config.direct_score_until_s
    else:
        _kdl = (t0 + case_timeout_s) if (case_timeout_s and getattr(config, 'kill_check_hard_deadline', False)) else None
    _ks = time.time()
    _todo = [a for a in res.accepted_tests if a.difference_id not in _scored]
    if config.run_mode in ("direct_pbt", "no_mg"):
        accepted, cr.n_validated, cr.kills, cr.n_killing, kill_by_diff = _score_until(
            config, _todo, fix_c, bug_c, rc.construction, solc_version, _kdl)
    else:
        accepted, cr.n_validated, cr.kills, cr.n_killing, kill_by_diff = _score_kills(
            config, _todo, fix_c, bug_c, rc.construction, solc_version, deadline=_kdl)
    _ke = time.time()
    if _scored:
        accepted = list(res.accepted_tests)
        cr.n_validated += len(_scored)
        for s in _scored.values():
            cr.kills += s["kills"]
            cr.n_killing += s["n_killing"]
            for k, v in s["kill_by_diff"].items():
                if k == "_deadline_skipped":
                    kill_by_diff[k] = kill_by_diff.get(k, 0) + v
                else:
                    kill_by_diff[k] = v
    if config.run_mode in ("direct_pbt", "no_mg"):
        cr.direct = {"end_score_start_rel": round(_ks - t0, 1), "end_score_end_rel": round(_ke - t0, 1),
                     "score_deadline_rel": round(_kdl - t0, 1),
                     "n_accepted": len(res.accepted_tests), "n_scored": len(cr.kills),
                     "n_unscored_deadline": int(kill_by_diff.get("_deadline_skipped", 0)),
                     "stopped_on_kill": getattr(rc, "direct_stop", None),
                     "n_attempts": sum(1 for r in res.test_records if r.get("attempt") is not None),
                     "n_threads": len({r.get("difference_id") for r in res.test_records})}
    if getattr(config, "realize_rendered_tests", False):
        _enhance_rendered_tests(config, res.accepted_tests, fix_c, bug_c, solc_version)
    cr.n_accepted = len(accepted)
    if artifact_dir:
        _write_artifacts(artifact_dir, res, kill_by_diff)
    if not accepted:
        cr.reason = cr.reason or getattr(rc, "stage_abort", None) or "no_test_generated"
        cr.wallclock_s = time.time() - t0
        return cr
    cr.feasible = True
    cr.success = cr.n_killing > 0
    cr.wallclock_s = time.time() - t0
    return cr




def _apply_ablation(rc, run_mode: str) -> None:
    modes = set((run_mode or "full").split("+"))
    modes = {"no_pa" if m == "llm_only" else m for m in modes}
    _valid = {"full", "no_pf", "no_dv", "no_pa", "no_tr", "direct_pbt", "no_mg"}
    if not modes <= _valid:
        raise ValueError(f"unknown run_mode {run_mode!r}: valid arms are "
                         "full|no_pf|no_dv|no_pa|no_tr|direct_pbt|no_mg ('+'-combos of the flag arms)")
    for own in ("no_pa", "direct_pbt", "no_mg"):
        if own in modes and len(modes) > 1:
            raise ValueError(f"{own} is its own orchestrator and does not compose with other arms")
    if "no_pf" in modes:
        rc.property_focus = False
    if "no_dv" in modes:
        rc.differential = False
    if "no_tr" in modes:
        rc.test_attempts = 1


_STAGE3_REASONS = {"foundry_compile_failed_P", "foundry_setup_failed_P", "harness_compile_failed",
                   "did_not_compile"}


def _stage3_signature(rec: dict) -> Optional[tuple]:
    if str(rec.get("reason") or "") not in _STAGE3_REASONS:
        return None
    text = str(rec.get("compiler_error") or rec.get("p_diagnostic") or "")
    m = re.search(r"(Error|TypeError|DeclarationError|ParserError)[^\n]{0,200}", text)
    if not m:
        return None
    return (str(rec.get("reason")), re.sub(r"\d+", "N", m.group(0))[:160])


def _stage3_gate(rc, inner, k: int, on_event):
    state = {"sig": None, "n": 0, "dids": set(), "fired": False}

    def sink(rec):
        if inner:
            inner(rec)
        if state["fired"]:
            return
        sig = _stage3_signature(rec)
        if sig is None:
            state.update(sig=None, n=0, dids=set())
            return
        if sig != state["sig"]:
            state.update(sig=sig, n=0, dids=set())
        state["n"] += 1
        state["dids"].add(rec.get("difference_id"))
        if state["n"] >= k and len(state["dids"]) >= 2:
            state["fired"] = True
            now = time.time()
            for attr in ("mutation_deadline", "fuzz_deadline", "test_deadline"):
                setattr(rc, attr, now)
            rc.stage_abort = f"stage3_framework_abort:{sig[0]}"
            if on_event:
                on_event({"event": "stage_gate", "stage": 3, "reason": sig[0], "signature": sig[1],
                          "attempts": state["n"], "differences": len(state["dids"])})
    return sink


def _append_attempt(path: str, rec: dict) -> None:
    try:
        with open(path, "a") as f:
            f.write(json.dumps(rec) + "\n")
    except OSError:
        pass


def _realize_kills_bug(config: Config, rt: str, fix_c: str, bug_c: str, solc_version: str) -> bool:
    on_fix = kill_check(config, rt, "InvMutTest", fix_c, solc_version, config.forge_std_path)
    if on_fix != "bug_no_kill":
        return False
    on_bug = kill_check(config, rt, "InvMutTest", bug_c, solc_version, config.forge_std_path)
    return on_bug == "bug_property_failed"


def _enhance_rendered_tests(config: Config, accepted: list, fix_c: str, bug_c: str,
                            solc_version: str) -> None:
    from invmut.render.realize import realize
    primary = [a for a in accepted
               if getattr(a, "origin", "primary") == "primary" and getattr(a, "rendered_test", None)]
    if not primary:
        return
    _name, ts = realize(fix_c, bug_c, "C")
    if not ts or not _realize_kills_bug(config, ts, fix_c, bug_c, solc_version):
        return
    for a in primary:
        if not _realize_kills_bug(config, a.rendered_test, fix_c, bug_c, solc_version):
            a.rendered_test = ts


def _write_mutant_manifest(artifact_dir: str, res) -> None:
    try:
        os.makedirs(artifact_dir, exist_ok=True)
        with open(os.path.join(artifact_dir, "mutants.jsonl"), "w") as f:
            for cell in res.mutant_sets:
                f.write(json.dumps(cell) + "\n")
    except OSError:
        pass


def _write_artifacts(artifact_dir: str, res, kill_by_diff: dict) -> None:
    tdir = os.path.join(artifact_dir, "tests")
    try:
        os.makedirs(tdir, exist_ok=True)
        for a in res.accepted_tests:
            blob = {
                "difference_id": a.difference_id, "property_summary": a.property_summary,
                "render_status": a.render_status, "validation_status": a.validation_status,
                "validation_error": a.validation_error, "kill": kill_by_diff.get(_kill_key(a)),
                "origin": getattr(a, "origin", "primary"),
                "success_route": getattr(a, "success_route", None),
                "oracle_origin": getattr(a, "oracle_origin", None),
                "kill_entrypoint": getattr(a, "kill_entrypoint", None),
                "property_based_core": getattr(a, "property_based_core", None),
                "standalone_replay": getattr(a, "standalone_replay", None),
                "oracle_reach": getattr(a, "oracle_reach", None),
                "ce_id": getattr(a, "ce_id", None),
                "source_difference_id": getattr(a, "source_difference_id", None),
                "source_property_focus": getattr(a, "source_property_focus", None),
                "confirmed_difference": getattr(a, "confirmed_difference", None),
                "oracle_asset": ((getattr(a, "confirmed_difference", None) or {}).get("oracle_asset")
                                 if getattr(a, "confirmed_difference", None) else None),
                "change_summary": a.change_summary, "mutated_unit_code": a.mutated_unit_code,
                "esbmc_test_source": a.esbmc_test_source,
                "rendered_test": a.rendered_test,
                "workspace_P_log": a.workspace_P_log, "workspace_M_log": a.workspace_M_log,
            }
            with open(os.path.join(tdir, f"{_kill_key(a)}.accepted.json"), "w") as f:
                json.dump(blob, f, indent=1)
        rejected = [r for r in res.test_records
                    if r.get("branch") != "witness_replay"
                    and r.get("outcome") != "accepted" and r.get("test_code")]
        if rejected:
            with open(os.path.join(tdir, "rejected_attempts.jsonl"), "w") as f:
                for r in rejected:
                    f.write(json.dumps(r) + "\n")
        replays = [r for r in res.test_records if r.get("branch") == "witness_replay"]
        if replays:
            with open(os.path.join(tdir, "replay_attempts.jsonl"), "w") as f:
                for r in replays:
                    f.write(json.dumps(r) + "\n")
    except OSError:
        pass
