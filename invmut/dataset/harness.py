"""RQ3 per-case runner: run InvMut on the (renamed) patched contract, then check whether each generated
Foundry test KILLS the real vulnerable contract.

Kill semantics (codex F2, structured — never exit-code): a KILL requires the rendered test's setUp to
SUCCEED on the bug source AND a testFuzz_*/testRegression_* to report a PROPERTY failure. Compile/setUp/
source-suite/timeout shapes are recorded distinctly and are NOT kills."""

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
    """Run `rendered_test` against the renamed bug source. Returns one structured outcome string."""
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
        # CONDITIONAL viaIR (codex #6): a complex bug contract that overflows legacy codegen ("Stack too
        # deep") would otherwise return bug_compile_failed — which count_bug_compile_fail_as_kill scores as
        # a SPURIOUS kill (a compiler limit, not a real fix->bug divergence). Recompile with viaIR (the same
        # setting the P/M validation used for these contracts) so the kill verdict is honest. False ⇒ every
        # non-affected case is unchanged.
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
        # testReplay_ is the witness-replay branch's entry point; without it here a replay that fails on
        # the bug would be scored "bug_no_kill".
        return ("bug_property_failed"
                if out.any_failure(("testFuzz_", "testRegression_", "testReplay_")) else "bug_no_kill")
    finally:
        if cleanup:
            import shutil
            shutil.rmtree(root, ignore_errors=True)


def _kill_key(a) -> str:
    """Key for kill_by_diff / the accepted-test artifact name. Both branches of test synthesis can
    accept a test for the SAME confirmed difference, so the replay branch gets its own suffix; every
    other origin keeps the bare difference_id, exactly as published."""
    return (f"{a.difference_id}#replay" if getattr(a, "origin", "primary") == "witness_replay"
            else a.difference_id)


def _kill_decision(outcome: str, validation_status: str,
                   count_bug_compile_fail_as_kill: bool) -> tuple[bool, Optional[str]]:
    """Decide whether one accepted test's kill_check outcome counts toward success, and how.
    SOUNDNESS (codex F2): only a test that PASSED Doc-4 validation on the fix P is a reliable oracle —
    `counts` gates everything. A `bug_property_failed` is always a kill. A `bug_compile_failed` (the
    P-validated test won't build against the real bug) is a kill ONLY when the production flag is on
    (USER 2026-06-25): a fix->bug divergence that breaks the build IS the kill; gated off in debug so a
    harness/test-gen build bug isn't silently scored. Returns (counts_toward_success, kill_via)."""
    counts = validation_status == "passed"
    is_kill = outcome == "bug_property_failed"
    is_compile_kill = outcome == "bug_compile_failed" and count_bug_compile_fail_as_kill
    counts_toward_success = counts and (is_kill or is_compile_kill)
    # kill_via is non-None IFF it actually counted (codex NIT): clean invariant for the audit trail.
    # A non-counted compile-fail is still findable in debug via the raw `kill` field ("bug_compile_failed").
    kill_via = (("property_failed" if is_kill else "bug_build_failed")
                if counts_toward_success else None)
    return counts_toward_success, kill_via


def _esbmc_kill_against_bug(config: Config, fix_c: str, bug_c: str, a, construction: dict,
                            run_fn, compile_fn) -> tuple[str, Optional[str], bool]:
    """V40 kill judged BY ESBMC AGAINST THE REAL BUG (USER 2026-06-27): the P-validated test is re-verified
    on the actual vulnerable contract via `verify_test(fix, bug, test)` — break-first, so it proves the rule
    on the fix and refutes it on the bug. Two kill conditions, both against the real bug, matching the
    authoritative kill semantics:
      • `accepted`  → the test HOLDS on the fix and is REFUTED on the bug  → ASSERTION-violation kill.
      • `harness_compile_failed` → the test compiles against the fix but NOT the bug → a fix→bug
        signature change → COMPILE-failure kill (gated by `count_bug_compile_fail_as_kill`, default true).
    Anything else (the test also holds on the bug, or an inconclusive proof) is NOT a kill. Returns
    (kill_outcome, kill_via, counts)."""
    vr = verify_test(config, fix_c, bug_c, a.llm_test_source, construction,
                     run_fn=run_fn, compile_fn=compile_fn)
    if vr["outcome"] == "accepted":
        return "bug_property_failed", "esbmc_property", True
    if vr.get("reason") == "harness_compile_failed":
        # fix+test compiled when the test was first accepted, so a compile failure here is the bug side
        # (signature change). count it iff the production flag is on (mirrors pre-V40 _kill_decision / V31).
        return "bug_compile_failed", "esbmc_compile", config.verifier.count_bug_compile_fail_as_kill
    detail = vr.get("reason") or vr["outcome"]
    return (f"bug_no_kill:{detail}", None, False)


def _foundry_kill_against_bug(config: Config, fix_c: str, bug_c: str, a, solc_version: str):
    """V47 (USER 2026-06-28): the Foundry side of the `ESBMC OR Foundry` kill. A SOUND Foundry kill =
    the rendered test PASSES on the fix AND fails (property violation) on the bug — a real differential.
    Requiring the pass-on-fix is what avoids the V40 spurious-success problem (a test failing IDENTICALLY
    on both — e.g. a vm.assume-rejected — is not a kill). Catches differences ESBMC's bounded model is
    too coarse for (e.g. an unchecked low-level call whose failure ESBMC models as always-succeeding).
    Returns (kill_outcome, kill_via, counts) or None if there is no rendered test to run.

    Residual (codex): Foundry's pass-on-fix is BOUNDED fuzz (fixed seed), not a proof — a fix-failing
    input the seed misses would falsely 'pass'. This is doubly-guarded: the test only reaches here
    because ESBMC ALREADY PROVED it holds on the fix (that is what `accepted` means), so a real
    fix-failing input would contradict that proof; and a `vm.assume`-rejected test produces `bug_no_kill`
    (not `bug_property_failed`) on the bug too, so it fails the `on_bug` gate. `kill_via='foundry_property'`
    keeps every Foundry-side kill auditable/re-checkable."""
    if not (a.render_status == "rendered" and a.rendered_test):
        return None
    on_bug = kill_check(config, a.rendered_test, "InvMutTest", bug_c, solc_version, config.forge_std_path)
    if on_bug != "bug_property_failed":
        return None
    on_fix = kill_check(config, a.rendered_test, "InvMutTest", fix_c, solc_version, config.forge_std_path)
    if on_fix != "bug_no_kill":   # must HOLD on the fix — else it is spurious, not a differential
        return None
    return ("bug_property_failed", "foundry_property", True)


def _norm_kill(outcome: Optional[str]) -> Optional[str]:
    """Published-artifact wire value: both bug-side failures are recorded as `bug_fail`."""
    return "bug_fail" if outcome in ("bug_property_failed", "bug_compile_failed") else outcome


def _norm_via(via: Optional[str]) -> Optional[str]:
    """Published-artifact wire value: which tool decided the kill."""
    if via in ("esbmc_property", "esbmc_compile"):
        return "esbmc"
    if via in ("property_failed", "bug_build_failed", "foundry_property"):
        return "foundry"
    return via


def _score_kills(config: Config, accepted_tests: list, fix_c: str, bug_c: str, construction: dict,
                 solc_version: str, *, run_fn=None, compile_fn=None, deadline=None):
    """run_mode-specific kill scoring (V40). Returns (accepted, n_validated, kills, n_killing, kill_by_diff).

    **llm_only (RQ1 baseline) is UNCHANGED** (USER 2026-06-27: must not affect llm_only reproduction): keep
    the pre-V40 forge `kill_check` + `_kill_decision` gate, and the render_status/validation filter, verbatim.
    **full pipeline (RQ3)** uses V40: the mutation loop is only how the test is GENERATED (and proven to hold
    on the fix); the KILL is judged BY ESBMC AGAINST THE REAL BUG via `_esbmc_kill_against_bug` — assertion
    violation OR a fix→bug signature-change compile failure (USER 2026-06-27). An optional NON-GATING forge
    audit (`verifier.esbmc_kill_forge_audit`, default off) additionally runs forge against the bug and records
    `forge_audit` — never changing the count."""
    llm_only = config.run_mode in ("llm_only", "no_pa")   # same arm, published name is no_pa
    if llm_only:
        accepted = [a for a in accepted_tests if a.render_status == "rendered" and a.rendered_test]
        n_validated = sum(1 for a in accepted if a.validation_status == "passed")
    else:
        accepted = list(accepted_tests)
        n_validated = len(accepted)   # tests proven to hold on the fix + separate a mutant (kill is vs the bug)
        if run_fn is None:
            run_fn = make_run_fn(config)
        if compile_fn is None:
            compile_fn = make_solc_compile_fn(config)

    kills, n_killing, kill_by_diff = [], 0, {}
    for a in accepted:
        # kill_check_deadline (DeepSeek Pro arm 2026-09-07): the 07f7e t1 run spent 99 s scoring 16 accepted
        # tests AFTER the test-phase deadline and blew the 600 s case wall (row lost by the budget rule).
        # A hard deadline stops scoring further tests; unscored accepted tests simply contribute no kill
        # -- conservative, never inflates. None (official arms) = unbounded, exactly the old behavior.
        if deadline is not None and time.time() >= deadline:
            kill_by_diff.setdefault("_deadline_skipped", 0)
            kill_by_diff["_deadline_skipped"] += 1
            continue
        base = {"difference_id": a.difference_id, "property": a.property_summary[:120],
                "render": a.render_status, "validation": a.validation_status,
                "validation_error": a.validation_error,
                # Which experiment path produced this kill ("primary", "llm_only", or witness replay).
                "origin": getattr(a, "origin", "primary"),
                # CE-derived oracle attribution. Keep this orthogonal to `origin`.
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
        # A witness replay carries no llm_test_source, and its
        # pass-on-P was established with forge at acceptance, so the bug side of that same differential
        # (kill_check, restricted to its own testReplay_ entry) is the sound kill judgement for it.
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
        # V40 full pipeline: kill = the test panics on the REAL bug, judged by ESBMC.
        outcome, kill_via, counts = _esbmc_kill_against_bug(config, fix_c, bug_c, a, construction,
                                                            run_fn, compile_fn)
        # V47 (USER 2026-06-28): ESBMC OR Foundry — if ESBMC did not kill, try a SOUND Foundry
        # differential (pass-on-fix, fail-on-bug). Catches what ESBMC's bounded model is too coarse for.
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
    """_score_kills one test at a time on a DAEMON thread, and stop waiting at `deadline`.

    _score_kills checks its deadline only before starting a test, and one test can run several ESBMC
    and forge queries, so a test started just before the deadline could carry the cell past the
    launcher's hard wall (MEASURED, direct pilot: acfix_3_5_077_L1Block Direct-PBT t1 was killed at
    662 s with 30 accepted tests, so the whole cell was lost). Here the tests scored by the deadline
    count, the one in flight and the rest are unscored (no kill), exactly as the deadline rule says;
    the daemon thread does not hold up the process exit. Same return shape as _score_kills."""
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
    reason: Optional[str] = None             # why infeasible / no test
    n_accepted: int = 0
    n_validated: int = 0                     # V40: == n_accepted (ESBMC-proved is the kill; forge not run)
    n_killing: int = 0
    success: bool = False
    kills: list = field(default_factory=list)         # per-test {prop, render, valid, kill}
    tokens: dict = field(default_factory=lambda: {"prompt": 0, "completion": 0, "reasoning": 0})
    wallclock_s: float = 0.0
    infra_error: Optional[str] = None
    code_rev: Optional[str] = None                    # invmut/+scripts/ rev that produced this result

    def as_dict(self) -> dict:
        return self.__dict__


def run_case(config: Config, case: dict, client: LLMClient, spec: ModelSpec,
             config_label: str, solc_version: str = "0.8.30", on_event=None,
             artifact_dir: Optional[str] = None, case_timeout_s: Optional[int] = None,
             replay_mutants_path: Optional[str] = None) -> CaseResult:
    """Full RQ3 pipeline for one case under one model config. Never raises on a scientific failure —
    records a reason. Only an LLM auth error (caller should abort the whole run) is recorded as infra."""
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
        # Direct-PBT has no property focus, so it does not run the Slither target selection (nor stop on
        # an empty one); what that saves stays inside the same end-to-end budget.
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
    except Exception as e:  # noqa: BLE001  (selection can crash on exotic sources)
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
        # Stage gate BEFORE any LLM spend (config.p_deploy_canary; see prep.p_deploy_canary).
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
    # ABLATION REPLAY (DEVIATIONS V39): freeze the mutant input to a prior trial's recorded set; run_unit
    # then replays those exact mutants under THIS config (V40 cell pipeline). None ⇒ generate via LLM.
    # (Ablation arms no_df/no_tt/no_re are on the alchemist-baseline-rq3 line; main line = V40+llm_only+SVF.)
    rc.replay_manifest = replay_mutants_path
    _apply_ablation(rc, config.run_mode)
    # LLM-facing prompt source = target contract C + inheritance chain + file-level decls only, NOT the whole
    # flattened multi-contract file (which is ~all dead libs/interfaces and saturates the prompt: a 906KB file
    # whose target is 2KB burned 1.24M prompt tokens for 0 tests). compile/verify still use the full fix_c.
    try:
        from invmut.mutation.solast import target_scope_source
        rc.prompt_source = target_scope_source(config.solc_bin, fix_c, "C", pragma)
    except Exception:  # noqa: BLE001 — any extraction failure → fall back to full source (never worse)
        rc.prompt_source = fix_c
    # diff-anchored mutation (USER 2026-06-30): give run_unit the (renamed) BUG source so it DETERMINISTICALLY
    # injects the bug's version of each fix-changed unit as an on-target mutant (M = the un-patched unit).
    # full pipeline only (llm_only is the untouched baseline).
    if getattr(config, "diff_anchored_mutation", False) and config.run_mode != "llm_only":
        rc.bug_source = bug_c
    # TWO-DEADLINE budget: cap R2/mutation work at mutation_frac (~0.7T), run deferred tests until the
    # later fuzz_frac (~0.9T), and reserve the rest for kill_check. Total case time stays bounded. The
    # `no_mutation_deadline` flag still forces BOTH off (fully unbounded) for special runs.
    if case_timeout_s and not getattr(config, "no_mutation_deadline", False):
        mfrac = getattr(config, "mutation_deadline_fraction", 0.7)
        ffrac = getattr(config, "fuzz_deadline_fraction", 0.9)
        rc.mutation_deadline = t0 + case_timeout_s * mfrac
        rc.fuzz_deadline = t0 + case_timeout_s * ffrac
    if artifact_dir:
        # incremental persistence: append every test attempt (raw source + solc error) as it happens, so a
        # run killed mid-case still leaves the did_not_compile samples for diagnosis. Best-effort.
        _apath = os.path.join(artifact_dir, "tests", "attempts.jsonl")
        try:
            os.makedirs(os.path.dirname(_apath), exist_ok=True)

            rc.attempt_sink = lambda rec, _p=_apath: _append_attempt(_p, rec)
        except OSError:
            pass
    _k3 = int(getattr(config, "stage3_framework_abort_k", 0) or 0)
    if _k3 > 0:
        rc.attempt_sink = _stage3_gate(rc, rc.attempt_sink, _k3, on_event)
        # mutant output (USER 2026-06-28): every generated candidate (raw source + origin + outcome) →
        # mutants.jsonl, so a later run can REPLAY them (no_df reuses no_tt). Best-effort.
        _mpath = os.path.join(artifact_dir, "mutants.jsonl")
        try:
            os.makedirs(artifact_dir, exist_ok=True)
            rc.mutants_sink = lambda rec, _p=_mpath: _append_attempt(_p, rec)
        except OSError:
            pass
    try:
        if config.run_mode in ("llm_only", "no_pa"):
            # RQ1 baseline: verifier-free arm. Same UnitResult shape, so everything below is unchanged.
            from invmut.orchestrate.concrete import run_unit_llm_only
            res = run_unit_llm_only(rc)
        elif config.run_mode in ("direct_pbt", "no_mg"):
            # no mutants: property-based tests for P alone (orchestrate/direct.py). The bug source is
            # handed over ONLY for the V-score of an accepted test; generation never sees it.
            from invmut.orchestrate.direct import run_unit_direct
            rc.t0 = t0
            rc.artifact_dir = artifact_dir
            # the "600+60" budget of these arms: generate until direct_generation_s, score until
            # direct_score_until_s (see config.py); replaces the fraction-of-T deadlines set above
            rc.mutation_deadline = rc.fuzz_deadline = t0 + config.direct_generation_s
            rc.direct_score = {"bug_c": bug_c, "solc_version": solc_version,
                               "deadline": t0 + config.direct_score_until_s}
            # no LLM request may outlive the scoring deadline (agents/client.py LLMDeadline)
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
    # Persist the FULL generated mutant set ALWAYS (even on a 0-kill / infeasible case) — it is the frozen
    # input a later ablation replays (DEVIATIONS V39). Must run before the `not accepted` short-circuit below.
    if artifact_dir:
        _write_mutant_manifest(artifact_dir, res)
    # Kill scoring is run_mode-specific (V40) — see `_score_kills`. llm_only (RQ1) keeps its exact pre-V40
    # forge gate; full pipeline judges the kill BY ESBMC AGAINST THE REAL BUG (fix_c vs bug_c).
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
        # direct_pbt / no_mg: tests V-scored at acceptance keep that verdict (orchestrate/direct.py)
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
        # the cell's scoring on record: how many accepted tests were scored, how many the deadline left
        # unscored (no kill), and whether/when the cell stopped on a gate-confirmed kill
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
    if artifact_dir:   # also on a 0-accepted case: rejected attempts are the audit trail (DeepSeek Pro arm)
        _write_artifacts(artifact_dir, res, kill_by_diff)
    if not accepted:
        cr.reason = cr.reason or getattr(rc, "stage_abort", None) or "no_test_generated"
        cr.wallclock_s = time.time() - t0
        return cr
    cr.feasible = True
    cr.success = cr.n_killing > 0
    cr.wallclock_s = time.time() - t0
    return cr


# The ablation arms are applied by `_apply_ablation` below; V40's native manifest replay
# (rc.replay_manifest) supplies the frozen mutant input an ablation run replays.


def _apply_ablation(rc, run_mode: str) -> None:
    """Published ablation arms. `llm_only` is the old name of the `no_pa` arm and is accepted as an alias."""
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


# Stage-3 gate (config.stage3_framework_abort_k; checklist G "find the problem early, do not run on").
# A P-side framework failure that repeats with ONE compiler/forge error across different differences
# is not something another LLM attempt can fix: every further attempt pays tokens for the same error.
_STAGE3_REASONS = {"foundry_compile_failed_P", "foundry_setup_failed_P", "harness_compile_failed",
                   "did_not_compile"}


def _stage3_signature(rec: dict) -> Optional[tuple]:
    if str(rec.get("reason") or "") not in _STAGE3_REASONS:
        return None
    text = str(rec.get("compiler_error") or rec.get("p_diagnostic") or "")
    m = re.search(r"(Error|TypeError|DeclarationError|ParserError)[^\n]{0,200}", text)
    if not m:
        return None   # no error text recorded: nothing says two failures share a cause
    return (str(rec.get("reason")), re.sub(r"\d+", "N", m.group(0))[:160])


def _stage3_gate(rc, inner, k: int, on_event):
    """Wrap rc.attempt_sink: after `k` consecutive attempts failing on P with the same signature, over
    at least two difference ids, close every remaining phase (all deadlines -> now) and record why.
    MEASURED offline (scratchpad overnight/stage3_sim.py) over the shipped attempts.jsonl: k=6 fires in
    2 of 664 RQ1 runs and 0 of 634 RQ4 runs, none of them a successful cell."""
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
    """Append one test-attempt record as a JSON line (incremental persistence so a killed run keeps its
    did_not_compile samples). Best-effort — a write failure must never abort a live run."""
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
    """Persist the per-cell full generated mutant set to <artifact_dir>/mutants.jsonl (DEVIATIONS V39):
    one JSON line per (target, boundary) cell with EVERY proposed FOM (pre-filter). This is the frozen
    "mutant input" an ablation run replays via run_case(replay_mutants_path=...). Best-effort."""
    try:
        os.makedirs(artifact_dir, exist_ok=True)
        with open(os.path.join(artifact_dir, "mutants.jsonl"), "w") as f:
            for cell in res.mutant_sets:
                f.write(json.dumps(cell) + "\n")
    except OSError:
        pass   # persistence is best-effort; never fail a case on an artifact write


def _write_artifacts(artifact_dir: str, res, kill_by_diff: dict) -> None:
    """Persist every generated test source + the forge evidence (codex NEW BUG (a)): accepted tests get
    raw/esbmc/rendered source, validation_error, and the P/M forge logs (so a foundry_fuzz_failed_on_P can
    be diagnosed from data); rejected attempts get their raw source + reason (audit the ~95% malformed)."""
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
        # rejected/malformed attempts (may be several per difference across the reflection loop)
        rejected = [r for r in res.test_records
                    if r.get("branch") != "witness_replay"
                    and r.get("outcome") != "accepted" and r.get("test_code")]
        if rejected:
            with open(os.path.join(tdir, "rejected_attempts.jsonl"), "w") as f:
                for r in rejected:
                    f.write(json.dumps(r) + "\n")
        # The replay branch writes no LLM attempts, so its records get their own file rather than
        # inflating the "rejected LLM attempt" audit trail.
        replays = [r for r in res.test_records if r.get("branch") == "witness_replay"]
        if replays:
            with open(os.path.join(tdir, "replay_attempts.jsonl"), "w") as f:
                for r in replays:
                    f.write(json.dumps(r) + "\n")
    except OSError:
        pass   # persistence is best-effort; never fail a case on an artifact write
