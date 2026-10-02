"""Doc 2 Stage 5 — R2 observational differential driver.

Maps a Doc 1 target record to a `HarnessTarget`, assembles the renamed single-file R2 harness,
compiles it once, runs ESBMC in the locked --bound mode (DEVIATIONS V1, via
`commands.build_r2_command`), and classifies the result (Doc 2 §6.7). A harness that cannot be
assembled/compiled after Stage 2 passed is `inconclusive` (infra), never `did_not_compile`
(§10)."""

from __future__ import annotations

import re
from dataclasses import replace
from typing import Optional, Sequence

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.esbmc import parse
from invmut.esbmc.runner import RunFn, temp_sol
from invmut.mutation.assemble import AssemblyError, assemble_pair
from invmut.mutation.harness import HarnessTarget, boundary_wrapper_names, build_r2_file
from invmut.mutation.model import Outcome, StageResult
from invmut.mutation.solast import FuncSig
from invmut.mutation.static_stages import CompileFn

_CATEGORY_MAP = {"state": "state", "return": "return", "explicit_revert": "revert"}

# the differential assert(s) the liveness probe rewrites to assert(false) (codex B1). V41: the state
# observer harness combines the during-call snapshot with the settlement value in one assert, so the
# optional `__invmut_snapP == __invmut_snapM && ` prefix is matched too.
_DIFF_ASSERT = re.compile(
    r"assert\((?:__invmut_snapP == __invmut_snapM && )?"
    r"__invmut_(?:vP\d*|revP) == __invmut_(?:vM\d*|revM)"
    r"(?: && __invmut_(?:arg\d+|key\d+|value) == __invmut_(?:arg\d+|key\d+|value))*\);")


def _boundary_reachable(config: Config, harness_src: str, run_fn: RunFn,
                        focus: Optional[str] = None) -> Optional[bool]:
    """Liveness probe (codex B1): rewrite the differential assert to `assert(false)` and re-run.
    If the boundary is reachable with BOTH sides non-reverted, assert(false) is violated → FAILED
    → returns True. If it is never reachable (every path pruned by the V18 __ESBMC_assume(!reverted),
    e.g. an access-control modifier the harness caller can never satisfy), nothing fails → the
    original no_difference was VACUOUS. Returns None if no probe could be formed."""
    live = _DIFF_ASSERT.sub("assert(false);", harness_src)
    if "assert(false);" not in live:
        return None
    with temp_sol(live, prefix="invmut_live_") as path:
        # `focus`: probe the SAME query that concluded "no difference". The unfocused probe cannot
        # speak for a --focus-function run: a wrapper can be unreachable under focused dispatch while
        # the unfocused harness still reaches the assert through another entry.
        run = run_fn(cmd.build_r2_command(config, path, focus_function=focus))
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    if v.verdict == parse.FAILED:
        return True
    if v.verdict == parse.UNKNOWN and v.bound_exhausted:
        return False   # bound exhausted with no feasible reaching path → vacuous
    return None        # timeout/abort → can't tell; don't override


def public_writer_names(target_json: dict, entry_names: set[str]) -> list[str]:
    """Public/external writers of the target VAR (Doc 1 scope, reason 'writer_of_target_state'), as
    BARE names that are real entries. NO fallback — empty means the var has no public-writer boundary.

    SHARED with `orchestrate.prep.cell_boundaries` (DEVIATIONS V35): the new full
    pipeline pins one writer x per (target, boundary) cell, and the pinned x MUST be in this exact set
    (same bare-name predicate) or R2's fallback below would fire and break the pin."""
    scope = target_json.get("scope", {})
    names: list[str] = []
    for u in scope.get("mutable_units", []) + scope.get("dependency_units", []):
        if u.get("inclusion_reason") == "writer_of_target_state" and u.get("kind") == "function":
            nm = (u.get("signature") or "").split("(")[0]
            if nm in entry_names and nm not in names:
                names.append(nm)
    return names


def _public_writer_names(target_json: dict, entry_names: set[str]) -> list[str]:
    """As `public_writer_names`, but with the legacy all-entry fallback: if a writer is internal the
    harness cannot call it directly (Doc 2 §6.4), so fall back to ALL public entries as boundaries so
    an internal writer's divergence is still observed after the reaching entry completes (V18-guarded
    per wrapper). The live pinned pipeline never hits the fallback (it drops such targets)."""
    return public_writer_names(target_json, set(entry_names)) or sorted(entry_names)


def doc1_target_to_harness_target(
    target_json: dict, entries: list[FuncSig], pinned_boundary: str | None = None
) -> HarnessTarget | AssemblyError:
    cat = _CATEGORY_MAP.get(target_json.get("category"))
    if cat is None:
        return AssemblyError(f"unknown target category: {target_json.get('category')}", unsupported=False)
    locus = target_json.get("target", {}).get("locus", {})
    entry_names = {e.name for e in entries}

    if cat == "state":
        getter = target_json.get("target", {}).get("getter", {}) or {}
        # batch pipeline (DEVIATIONS V35): pin the single boundary writer x so R2 checks
        # ONLY x's wrapper (the other entries stay assertion-free dispatch). Guarded by membership so an
        # off-set pin can never produce a vacuous (assert-less) harness.
        writers = _public_writer_names(target_json, entry_names)
        if pinned_boundary is not None and pinned_boundary in entry_names:
            writers = [pinned_boundary]
        return HarnessTarget(
            category="state",
            var_name=locus.get("name"),
            getter_name=getter.get("getter_name"),
            getter_params=getter.get("params", []),
            needs_getter_injection=bool(getter.get("needs_injection")),
            getter_inject_sig=getter.get("signature"),
            leaf_type=getter.get("leaf_type"),
            state_kind=target_json.get("target", {}).get("state_kind"),
            state_components=list(target_json.get("target", {}).get("state_components") or []),
            writer_names=writers,
        )
    if cat == "return":
        return HarnessTarget(category="return", fn_name=locus.get("name"),
                             return_types=target_json.get("target", {}).get("return_types", []))
    return HarnessTarget(category="revert", fn_name=locus.get("name"))


def stage5_r2(
    config: Config,
    p_source: str,
    m_source: str,
    contract: str,
    target_json: dict,
    run_fn: RunFn,
    compile_fn: CompileFn,
    focus_mode: bool = False,
    pinned_boundary: str | None = None,
    run_fn_fast: RunFn | None = None,
    all_targets: list[dict] | None = None,
) -> StageResult:
    """Doc 2 §6. Returns VISIBLE_DIFFERENCE (+ raw streams for §9 trace), NO_DIFFERENCE (clean
    within bound), or INCONCLUSIVE (timeout/abort/unsupported/infra).

    `focus_mode` (FOCUS_FUNCTION_PLAN — either latched by an earlier non-convergence, or set
    PROACTIVELY per (target, boundary) cell by the batch pipeline, DEVIATIONS V36):
    skip the unfocused full-harness run and query the focused per-wrapper differential directly.
    `pinned_boundary` (batch pipeline): pin a STATE target's R2 to ONLY this writer x's wrapper."""
    parts = assemble_pair(config.solc_bin, p_source, m_source, contract)
    if isinstance(parts, AssemblyError):
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {"reason": parts.reason, "infra": not parts.unsupported})

    htarget = doc1_target_to_harness_target(target_json, parts.p_info.entries, pinned_boundary)
    if isinstance(htarget, AssemblyError):
        return StageResult("stage5", Outcome.INCONCLUSIVE, {"reason": htarget.reason})

    base_meta = {"ref_name": parts.ref_name, "mut_name": parts.mut_name}

    # WIDE OBSERVATION (config.verifier.r2_wide_observation): the contract's other public scalars,
    # compared on both sides inside the SAME single differential assert. One scalar in the predicate
    # means one scalar in the replay's oracle; a defect that lands in another variable of the same
    # contract then passes the replay. Off by default -- it changes what counts as a difference.
    wide_targets: list[HarnessTarget] = []
    if getattr(config.verifier, "r2_wide_observation", False):
        for other in (all_targets or []):
            if other is target_json or other.get("id") == target_json.get("id"):
                continue
            ht = doc1_target_to_harness_target(other, parts.p_info.entries, None)
            if isinstance(ht, HarnessTarget):
                wide_targets.append(ht)

    # State target: icse.tex:556 — ONE differential assert per harness. A var with several public
    # writers therefore becomes one SINGLE-ASSERT harness per writer (the writer's boundary tb), each
    # run independently; the first writer whose harness exposes a difference is the kill (R1 fix).
    if htarget.category == "state":
        return _stage5_state(config, parts, htarget, base_meta, run_fn, compile_fn, focus_mode,
                             run_fn_fast, wide_targets)

    x = build_r2_file(
        parts,
        htarget,
        record_witness_values=bool(getattr(config.verifier, "r2_record_witness_values", False)),
        # One slot per transaction the query may take, so the recorded sequence can never be
        # shorter than the path the counterexample walked.
        trace_slot_count=int(getattr(config.verifier, "r2_solidity_max_tx", 2) or 2),
        record_post_balance=bool(getattr(config.verifier, "r2_record_post_balance", False)),
        extra_observation_targets=wide_targets,
        witness_live_copies=bool(getattr(config.verifier, "r2_witness_live_copies", False)),
    )
    if isinstance(x, AssemblyError):
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {"reason": x.reason, "report_back": x.unsupported})

    # harness compile (Doc 2 §10): a failure here is infra, not did_not_compile of the mutant.
    comp = compile_fn(x)
    if not comp.ok:
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {"reason": "harness_compile_failed", "infra": True,
                            "compiler_error": comp.diagnostics})

    meta = {**base_meta, "harness_source": x}

    # focus_mode: the canary already saw this case spin unfocused — go straight to the focused
    # differential and never run the spinning full-harness query (returns None only if there is no
    # focusable boundary wrapper, in which case we fall through to the normal run).
    if focus_mode:
        esc = _focused_escalation(config, parts, htarget, x, meta, run_fn)
        if esc is not None:
            return esc

    with temp_sol(x, prefix="invmut_r2_") as path:
        argv = cmd.build_r2_command(config, path)
        # V44: unfocused-first probe is fail-fast (short timeout); a real difference surfaces fast,
        # a no-diff/slow probe gives up and the focused escalation below (full timeout) concludes it.
        run = (run_fn_fast or run_fn)(argv) if not focus_mode else run_fn(argv)
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    outcome = parse.r2_outcome(v)

    base = {
        **meta,
        "r2_command": argv, "verdict": v.verdict, "r2_outcome": outcome,
        "stdout": run.stdout, "stderr": run.stderr,  # for §9 clean-trace extraction (Phase 2d)
    }
    if outcome == "visible_difference":
        return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
            **base, "source_stage": "R2",
            "difference_kind": htarget.category,
            "has_trace": v.has_funccall_trace,
        })
    if outcome in ("no_difference", "no_difference_within_bound"):
        # (state targets handle their §6.5 revert-guard fallback inside _stage5_state)
        # confirm the boundary was actually reachable; a vacuous success (all paths pruned by the
        # V18 revert guard — e.g. an unsatisfiable access-control modifier) is NOT a no_difference.
        reachable = _boundary_reachable(config, x, run_fn)
        if reachable is False:
            return StageResult("stage5", Outcome.INCONCLUSIVE,
                               {**base, "reason": "boundary_unreachable", "infra": False})
        return StageResult("stage5", Outcome.NO_DIFFERENCE, {**base, "boundary_reachable": reachable})
    # esbmc did not converge (timeout/abort/UNKNOWN, not a hard infra/unsupported error): the
    # unbounded full-harness dispatch spun. Escalate with --focus-function per boundary wrapper
    # (FOCUS_FUNCTION_PLAN) — a narrower-but-sound differential that usually converges fast. (Reached
    # only when focus_mode was off; with it on we focused above and never ran this spinning query.)
    esc = _focused_escalation(config, parts, htarget, x, meta, run_fn)
    if esc is not None:
        return esc
    return StageResult("stage5", Outcome.INCONCLUSIVE, {**base, "infra": False})


def _run_one(config: Config, x: str, run_fn: RunFn, compile_fn: CompileFn,
             focus: Optional[str] = None):
    """Compile + run a single harness. Returns (compile_result, verdict, outcome, run, argv); if the
    compile failed, verdict/outcome/run/argv are None and the caller reports infra."""
    comp = compile_fn(x)
    if not comp.ok:
        return comp, None, None, None, None
    with temp_sol(x, prefix="invmut_r2_") as path:
        argv = cmd.build_r2_command(config, path, focus_function=focus)
        run = run_fn(argv)
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    return comp, v, parse.r2_outcome(v), run, argv


def _stage5_state(config: Config, parts, htarget: HarnessTarget, base_meta: dict,
                  run_fn: RunFn, compile_fn: CompileFn, focus_mode: bool,
                  run_fn_fast: RunFn | None = None,
                  wide_targets: Sequence[HarnessTarget] = ()) -> StageResult:
    """R1 multi-assert fix (icse.tex:556 — one differential assert per harness). A state var with
    public writers W is checked by ONE single-assert harness per writer w∈W (w is the boundary tb;
    the other writers stay as plain dispatch wrappers for state-establishing sequencing). Iterate the
    writers; the first whose harness shows a visible difference is the kill. All-clean ⇒ NO_DIFFERENCE
    after the §6.5 revert-guard fallback + reachability check; a writer that does not converge is
    retried --focus-function on its own wrapper before we give up."""
    writers = list(htarget.writer_names) or []
    if not writers:
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {**base_meta, "reason": "no_state_writer", "infra": False})

    attempts: list[dict] = []
    nonconverged: list[tuple[str, str]] = []   # (writer, harness_src)
    first_x: Optional[str] = None
    for w in writers:
        x = build_r2_file(
            parts,
            replace(htarget, tb_writer=w),
            record_witness_values=bool(getattr(config.verifier, "r2_record_witness_values", False)),
            # One slot per transaction the query may take, so the recorded sequence can never be
            # shorter than the path the counterexample walked.
            trace_slot_count=int(getattr(config.verifier, "r2_solidity_max_tx", 2) or 2),
            record_post_balance=bool(getattr(config.verifier, "r2_record_post_balance", False)),
            extra_observation_targets=list(wide_targets),
        witness_live_copies=bool(getattr(config.verifier, "r2_witness_live_copies", False)),
        )
        if isinstance(x, AssemblyError):
            return StageResult("stage5", Outcome.INCONCLUSIVE,
                               {**base_meta, "reason": x.reason, "report_back": x.unsupported})
        if first_x is None:
            first_x = x
        wrap = boundary_wrapper_names(parts, replace(htarget, tb_writer=w))
        focus = wrap[0] if (focus_mode and wrap) else None
        # V44: the unfocused-first probe (focus is None) is fail-fast; the reactive focused escalation
        # below (r2.py nonconverged branch) keeps the full timeout.
        _rf = run_fn_fast if (focus is None and run_fn_fast is not None) else run_fn
        comp, v, outcome, run, argv = _run_one(config, x, _rf, compile_fn, focus=focus)
        if v is None:
            return StageResult("stage5", Outcome.INCONCLUSIVE,
                               {**base_meta, "reason": "harness_compile_failed", "infra": True,
                                "compiler_error": comp.diagnostics})
        attempts.append({"writer": w, "focus": focus, "verdict": v.verdict, "r2_outcome": outcome})
        if outcome == "visible_difference":
            return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                **base_meta, "harness_source": x, "source_stage": "R2", "difference_kind": "state",
                "has_trace": v.has_funccall_trace, "boundary_writer": w,
                "focus_function": focus, "focus_escalation": bool(focus), "state_attempts": attempts,
                "r2_command": argv, "verdict": v.verdict, "r2_outcome": outcome,
                "stdout": run.stdout, "stderr": run.stderr})
        if outcome not in ("no_difference", "no_difference_within_bound"):
            nonconverged.append((w, x))

    # No writer surfaced a state difference. First, the §6.5 revert-guard fallback (compares revert
    # FLAGS over each writer — sound, unaffected by the F9 state leak that forced the V18 guard).
    # DeepSeek Pro arm 2026-09-07 (config.r2_fast_revert_retry_when_nonconverged): when the unfocused state
    # run already did NOT converge (fast probe timed out), the UNFOCUSED revert probe on the same harness
    # will not converge either — measured on CVE_2019_15078/XBornID: 60 s TIMEOUT, while the focused
    # revert probe that follows finds the difference in 4.5 s (87 s -> ~27 s per candidate). Run that
    # fallback under the fast timeout so a nonconverging harness does not pay the full wall twice.
    _rfb = run_fn
    if nonconverged and run_fn_fast is not None and getattr(config, "r2_fast_revert_retry_when_nonconverged", False):
        _rfb = run_fn_fast
    rdiff = _revert_fallback(config, parts, htarget, _rfb, wide_targets)
    if rdiff is not None:
        return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
            **base_meta, "source_stage": "R2", "difference_kind": "revert",
            "note": "revert_guard_change_on_state_target", "state_attempts": attempts, **rdiff})

    # A writer that did not converge unfocused: retry it --focus-function on its own wrapper (skip if
    # we already focused above). A focused kill is still a real difference.
    if nonconverged and not focus_mode:
        for w, x in nonconverged:
            wrap = boundary_wrapper_names(parts, replace(htarget, tb_writer=w))
            focus = wrap[0] if wrap else None
            comp, v, outcome, run, argv = _run_one(config, x, run_fn, compile_fn, focus=focus)
            if v is None:
                continue
            attempts.append({"writer": w, "focus": focus, "verdict": v.verdict, "r2_outcome": outcome})
            if outcome == "visible_difference":
                return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                    **base_meta, "harness_source": x, "source_stage": "R2", "difference_kind": "state",
                    "has_trace": v.has_funccall_trace, "boundary_writer": w, "focus_function": focus,
                    "focus_escalation": True, "state_attempts": attempts, "r2_command": argv,
                    "verdict": v.verdict, "r2_outcome": outcome,
                    "stdout": run.stdout, "stderr": run.stderr})
            # focused revert probe on this writer (B3 consistency)
            rp = _revert_probe(config, parts, w, run_fn, focus=focus, wide_targets=wide_targets)
            if rp is not None:
                return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                    **base_meta, "source_stage": "R2", "difference_kind": "revert",
                    "note": "revert_guard_change_on_state_target", "focus_function": focus,
                    "focus_escalation": True, "state_attempts": attempts, **rp})

    if nonconverged:
        # never converged to a difference, but the full property stayed inconclusive on ≥1 writer —
        # do NOT over-claim NO_DIFFERENCE (parity with _focused_escalation's focused_no_difference).
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {**base_meta, "reason": "focused_no_difference", "infra": False,
                            "state_attempts": attempts})

    # Every writer converged clean. Confirm the boundary was actually reachable (a vacuous success —
    # all paths pruned by the V18 revert guard — is NOT a no_difference).
    reachable = _boundary_reachable(config, first_x, run_fn) if first_x else None
    if reachable is False:
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {**base_meta, "reason": "boundary_unreachable", "infra": False,
                            "state_attempts": attempts})
    return StageResult("stage5", Outcome.NO_DIFFERENCE,
                       {**base_meta, "harness_source": first_x, "boundary_reachable": reachable,
                        "state_attempts": attempts})


def _focused_escalation(config: Config, parts, htarget: HarnessTarget, x: str,
                        base: dict, run_fn: RunFn) -> Optional[StageResult]:
    """In-run upgrade for a non-converging R2 (FOCUS_FUNCTION_PLAN). For each asserting wrapper,
    re-run R2 with dispatch focused on it: 'same init state, dispatch ONLY this wrapper → diff'.

    - first focused FAILED (or focused revert-guard difference) => real kill (VISIBLE_DIFFERENCE);
    - all focused-clean => INCONCLUSIVE with reason=focused_no_difference. We do NOT promote this to
      NO_DIFFERENCE: focused-clean only establishes the narrow property, while the unfocused full
      property stayed inconclusive — claiming equivalence would over-state it. Returns None if there
      is no focusable wrapper."""
    names = boundary_wrapper_names(parts, htarget)
    if not names:
        return None
    attempts = []
    for wname in names:
        bare = wname.split("_", 1)[1]   # "s3_my_fn" -> "my_fn" (split on the s{idx}_ prefix only)
        with temp_sol(x, prefix="invmut_r2focus_") as path:
            argv = cmd.build_r2_command(config, path, focus_function=wname)
            run = run_fn(argv)
        v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
        outcome = parse.r2_outcome(v)
        attempts.append({"focus": wname, "verdict": v.verdict, "r2_outcome": outcome})
        if outcome == "visible_difference":
            return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                **base, "source_stage": "R2", "difference_kind": htarget.category,
                "has_trace": v.has_funccall_trace, "focus_function": wname,
                "focus_escalation": True, "focus_attempts": attempts,
                "r2_command": argv, "verdict": v.verdict, "r2_outcome": outcome,
                "stdout": run.stdout, "stderr": run.stderr})
        # focused state-target: a revert-guard change is masked by the V18 assume(!reverted) guard;
        # recover with the focused revert-DIFFERENTIAL probe on this same writer (B3 consistency).
        if htarget.category == "state":
            rdiff = _revert_probe(config, parts, bare, run_fn, focus=wname)
            if rdiff is not None:
                return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                    **base, "source_stage": "R2", "difference_kind": "revert",
                    "note": "revert_guard_change_on_state_target", "focus_function": wname,
                    "focus_escalation": True, "focus_attempts": attempts, **rdiff})
    # VACUITY, the same guarantee the unfocused path already gives (:195-203).  Without this the
    # focused escalation returns `focused_no_difference` whether the query saw no difference or saw
    # nothing at all: MEASURED on ct_5_Proposals_can_be_cancelled t5, 8 of its 14 focused_no_difference
    # mutants edit the OBSERVED signal itself (delete `proposalCount += 1`, make it `+= 2`, ...), which
    # a live query cannot call equal.  Config-gated (verifier.focused_vacuity_probe, default False =
    # official behaviour) because it costs one extra ESBMC call per focused wrapper.
    if getattr(config.verifier, "focused_vacuity_probe", False) and attempts:
        # record the probe verdict per wrapper: True = reachable, False = vacuous, None = the probe
        # itself did not converge.  Without that distinction a run reporting "0 unreachable" is
        # unreadable, because None is treated as live and a 60 s timeout looks exactly like a live
        # boundary.  MEASURED first without it: ct_5 t5 gave 0 focused_boundary_unreachable, which
        # could not be read either way.
        probes = {wn: _boundary_reachable(config, x, run_fn, focus=wn) for wn in names}
        live = [wn for wn, v in probes.items() if v is not False]
        base = {**base, "focus_probes": probes,
                "probe_summary": "live=%d vacuous=%d unknown=%d" % (
                    sum(1 for v in probes.values() if v is True),
                    sum(1 for v in probes.values() if v is False),
                    sum(1 for v in probes.values() if v is None))}
        if not live:
            return StageResult("stage5", Outcome.INCONCLUSIVE, {
                **base, "reason": "focused_boundary_unreachable", "infra": False,
                "focus_escalation": True, "focus_attempts": attempts,
                "probed_wrappers": names})
    _ps = base.get("probe_summary")
    return StageResult("stage5", Outcome.INCONCLUSIVE, {
        **base, "reason": "focused_no_difference" + (" [%s]" % _ps if _ps else ""), "infra": False,
        "focus_escalation": True, "focus_attempts": attempts})


def _revert_probe(config: Config, parts, writer: str, run_fn: RunFn,
                  focus: Optional[str] = None,
                  wide_targets: Sequence[HarnessTarget] = ()) -> Optional[dict]:
    """Revert-differential probe on ONE writer (revert-kind harness): returns the witness detail if
    the writer reverts on exactly one side, else None. Sound: comparing revert FLAGS is unaffected
    by the F9 state leak that forced the V18 guard. `focus` restricts dispatch to this writer's
    wrapper (B3: a focused main run must use a focused probe for a consistent reachability口径)."""
    rt = HarnessTarget(category="revert", fn_name=writer)
    rx = build_r2_file(
        parts,
        rt,
        record_witness_values=bool(getattr(config.verifier, "r2_record_witness_values", False)),
        # One slot per transaction the query may take, so the recorded sequence can never be
        # shorter than the path the counterexample walked.
        trace_slot_count=int(getattr(config.verifier, "r2_solidity_max_tx", 2) or 2),
        record_post_balance=bool(getattr(config.verifier, "r2_record_post_balance", False)),
        extra_observation_targets=list(wide_targets),
        witness_live_copies=bool(getattr(config.verifier, "r2_witness_live_copies", False)),
    )
    if isinstance(rx, AssemblyError):
        return None
    with temp_sol(rx, prefix="invmut_rdiff_") as path:
        argv = cmd.build_r2_command(config, path, focus_function=focus)
        run = run_fn(argv)
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    if parse.r2_outcome(v) == "visible_difference":
        return {"r2_command": argv, "verdict": v.verdict, "revert_writer": writer,
                "harness_source": rx, "stdout": run.stdout, "stderr": run.stderr,
                "has_trace": v.has_funccall_trace}
    return None


def _revert_fallback(config: Config, parts, htarget: HarnessTarget, run_fn: RunFn,
                     wide_targets: Sequence[HarnessTarget] = ()) -> Optional[dict]:
    """Unfocused revert-differential fallback over each writer of a STATE target. Returns the first
    witness detail dict, else None."""
    for writer in htarget.writer_names:
        r = _revert_probe(config, parts, writer, run_fn, wide_targets=wide_targets)
        if r is not None:
            return r
    return None
