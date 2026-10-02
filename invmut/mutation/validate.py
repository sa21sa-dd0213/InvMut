"""Doc 2 — top-level mutation-candidate validation pipeline (stages 0-5 orchestration).

`validate_candidate` threads one candidate through dedup → build+compile → format → duplicates →
R1 → R2, short-circuiting at the first terminal outcome, and returns a `ValidationResult` carrying
the per-stage evidence, the §7 memory record, and (on a visible difference) the §8
confirmed-difference JSON with a §9 clean trace. The loop/memory layer (Doc prompts §5.1) consumes
`result.next_prompt` and `result.memory_record`."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from invmut import select
from invmut.config import Config
from invmut.esbmc.runner import RunFn
from invmut.mutation import r1 as r1mod
from invmut.mutation import r2 as r2mod
from invmut.mutation import stage3 as s3mod
from invmut.mutation import static_stages as st
from invmut.mutation.confirmed import build_confirmed_difference
from invmut.mutation.model import Candidate, Outcome, StageResult, ValidationResult
from invmut.mutation.static_stages import CompileFn
from invmut.mutation.stage3 import TestRunFn
from invmut.mutation.trace import parse_counterexample, render_difference


@dataclass
class ValidationContext:
    config: Config
    p_source: str
    contract: str
    doc1: dict
    run_fn: RunFn
    compile_fn: CompileFn
    r1_baseline: r1mod.R1Run
    seen_change_hashes: set = field(default_factory=set)
    test_runner: Optional[TestRunFn] = None
    run_fn_fast: Optional[RunFn] = None   # V44: short-timeout run_fn for the unfocused-first R2 probe
    low_value_filter: bool = False
    # FOCUS_FUNCTION_PLAN: once R1 (the canary) or R2 fails to converge on this case, latch focus
    # mode so EVERY later candidate runs R1/R2 focused from the start — R2 never re-spins. Persists
    # for the life of the ctx (one ctx per case/P, reused across all targets & candidates).
    focus_latched: bool = False
    _focused_baselines: dict = field(default_factory=dict)
    _cd_counter: int = 0

    def next_confirmed_id(self) -> str:
        self._cd_counter += 1
        return f"D{self._cd_counter:04d}"

    def focused_r1_baseline(self, fn_name: str) -> r1mod.R1Run:
        """Per-function focused R1 baseline on P, cached so a focused M-R1 differential is compared
        against a focus-consistent P baseline (sound introduced-fault set)."""
        if getattr(getattr(self.config, "ablation", None), "disable_r1", False):
            return r1mod.R1Run([], True, False, {}, [], "R1_DISABLED")
        b = self._focused_baselines.get(fn_name)
        if b is None:
            b = r1mod.precompute_r1_baseline(self.config, self.p_source, self.contract,
                                             self.run_fn, focus=fn_name)
            self._focused_baselines[fn_name] = b
        return b

    def target_json(self, target_id: str) -> Optional[dict]:
        for t in self.doc1.get("targets", []):
            if t.get("id") == target_id:
                return t
        return None


def _r1_focus_name(unit_record: Optional[dict], p_source: str, m_source: str) -> Optional[str]:
    """The bare name to focus R1 on: the edited unit, only when it is a plain (non-overloaded)
    function present uniquely in BOTH P and M (so focus resolves the same definition on each side).
    Returns None for modifiers/constructors/overloads — those fall back to unfocused R1 (B4)."""
    if not unit_record or unit_record.get("kind") != "function":
        return None
    nm = ((unit_record.get("signature") or "").split("(")[0]).strip()
    if not nm:
        return None
    if len(r1mod.func_starts_of(p_source).get(nm, [])) != 1:
        return None
    if len(r1mod.func_starts_of(m_source).get(nm, [])) != 1:
        return None
    return nm


def _unit_record(target_json: dict, unit_id: str) -> Optional[dict]:
    if not target_json:
        return None
    for u in target_json.get("scope", {}).get("mutable_units", []):
        if u.get("unit_id") == unit_id:
            return u
    return None


def _edit_span(p: str, m: str) -> tuple[int, int]:
    """Byte span in P that differs from M (confined to the edited unit by construction)."""
    n = min(len(p), len(m))
    i = 0
    while i < n and p[i] == m[i]:
        i += 1
    j = 0
    while j < n - i and p[-1 - j] == m[-1 - j]:
        j += 1
    return i, len(p) - j


def _edited_statement_id(unit_record: dict, p_source: str, m_source: str) -> Optional[str]:
    stmts = (unit_record or {}).get("statements")
    if not stmts:
        return None
    a, b = _edit_span(p_source, m_source)
    s = select.map_edit_to_statement(stmts, a, b)
    return s["statement_id"] if s else None


def _finish(candidate: Candidate, change_hash: str, stage: str, stages: list[StageResult],
            confirmed=None) -> ValidationResult:
    last = stages[-1]
    res = ValidationResult(candidate, change_hash, last.outcome, stage, stages, confirmed)
    res.memory_record = {
        "change_hash": change_hash, "outcome": last.outcome,
        "operation": candidate.operation, "change_summary": candidate.change_summary,
        "unit_id": candidate.unit_id, "target_id": candidate.target_id,
        "rendered_already_tried": res.rendered_already_tried,
        "silent": bool(last.detail.get("silent")),
        "stage_detail": last.detail,
    }
    return res


def prescreen_candidate(ctx: ValidationContext, candidate: Candidate):
    """Stages 0-3 only (dedup / build+compile / format / duplicates), for the packed R2 screen.
    Returns (early_result_or_None, m_source, stages, change_hash, unit_record): when early_result
    is set the candidate is terminal before R2; otherwise resume with validate_candidate(...,
    resume=(stages, change_hash, m_source, unit_record))."""
    stages: list[StageResult] = []
    target_json = ctx.target_json(candidate.target_id)
    unit_record = _unit_record(target_json, candidate.unit_id)
    s0 = st.stage0_dedup(candidate, ctx.seen_change_hashes)
    stages.append(s0)
    ch = s0.detail["change_hash"]
    if not s0.passed:
        return _finish(candidate, ch, "stage0", stages), None, stages, ch, unit_record
    ctx.seen_change_hashes.add(ch)
    s1, m_source = st.stage1_build_compile(candidate, ctx.p_source, unit_record, ctx.compile_fn)
    stages.append(s1)
    if not s1.passed:
        return _finish(candidate, ch, "stage1", stages), None, stages, ch, unit_record
    s2 = st.stage2_format_check(candidate, s1.detail["original_unit_text"], candidate.mutated_unit_code,
                               unit_kind=(unit_record or {}).get("kind", "function"),
                               low_value_filter=ctx.low_value_filter)
    stages.append(s2)
    if not s2.passed:
        return _finish(candidate, ch, "stage2", stages), None, stages, ch, unit_record
    s3 = s3mod.stage3_duplicates(m_source, ctx.test_runner)
    stages.append(s3)
    if not s3.passed:
        return _finish(candidate, ch, "stage3", stages), None, stages, ch, unit_record
    return None, m_source, stages, ch, unit_record


def finish_screened(candidate: Candidate, change_hash: str, stages: list[StageResult],
                    outcome: str, reason: str, screen_detail: dict) -> ValidationResult:
    """Terminal stage-5 result for a mutant the packed screen did not flag (no per-mutant R2 run)."""
    s5 = StageResult("stage5", outcome, {"reason": reason, "infra": False, "pack_screen": screen_detail})
    return _finish(candidate, change_hash, "stage5", [*stages, s5])


def validate_candidate(ctx: ValidationContext, candidate: Candidate, *,
                       pinned_boundary: Optional[str] = None,
                       resume: Optional[tuple] = None) -> ValidationResult:
    """`pinned_boundary` (batch pipeline, DEVIATIONS V35 + proactive-focus): the bare
    driving-entry name x of this (target, boundary) cell. When set (and config.verifier.proactive_focus),
    R1/R2 are focused on x from the start (R1 on the edited unit, R2 pinned to x's wrapper) — ESBMC is a
    pure filter, so the narrowing only costs recall (no false kill). When None, the legacy reactive
    focus_latched path is used (back-compat for non-pinned callers/tests)."""
    stages: list[StageResult] = []
    target_json = ctx.target_json(candidate.target_id)
    unit_record = _unit_record(target_json, candidate.unit_id)
    focus_active = pinned_boundary is not None and getattr(ctx.config.verifier, "proactive_focus", True)
    if resume is not None:
        # packed screen already ran stages 0-3 (prescreen_candidate); jump to R1/R2 with its results
        pre_stages, ch, m_source, unit_record = resume
        stages = list(pre_stages)
        _suppress_proactive = ((target_json or {}).get("category") in ("state", "return")
                               and getattr(ctx.config.verifier, "focus_skip_multitx", True))
        return _stages_4_5(ctx, candidate, target_json, unit_record, stages, ch, m_source,
                           focus_active, _suppress_proactive, pinned_boundary)
    # V42/V44: state/return differences can require a multi-tx state-establishing prefix through OTHER
    # entries (e.g. TOD deposit→setRewardRate→claim, or a reentrancy deposit→withdraw); --focus-function
    # prunes that prefix and SUPPRESSES the difference. Suppress focus for these categories ENTIRELY —
    # including the reactive `focus_latched` (which the R1 canary sets at init for ANY contract whose
    # unbound R1 spins, i.e. exactly the .call/reentrancy class we must keep unfocused). The V44 fail-fast
    # probe (run_fn_fast, 15s) bounds the unfocused cost; `_stage5_state` still escalates focused on a
    # non-converging writer. revert (single-boundary) is unaffected. Keep the per-cell writer PIN.
    _suppress_proactive = ((target_json or {}).get("category") in ("state", "return")
                           and getattr(ctx.config.verifier, "focus_skip_multitx", True))

    # Stage 0 — dedup
    s0 = st.stage0_dedup(candidate, ctx.seen_change_hashes)
    stages.append(s0)
    ch = s0.detail["change_hash"]
    if not s0.passed:
        # a repeat still counts toward budget (the hash is already in seen)
        return _finish(candidate, ch, "stage0", stages)
    ctx.seen_change_hashes.add(ch)  # so a later identical repeat is caught

    # Stage 1 — build + compile
    s1, m_source = st.stage1_build_compile(candidate, ctx.p_source, unit_record, ctx.compile_fn)
    stages.append(s1)
    if not s1.passed:
        return _finish(candidate, ch, "stage1", stages)
    original_unit_text = s1.detail["original_unit_text"]

    # Stage 2 — format check
    s2 = st.stage2_format_check(candidate, original_unit_text, candidate.mutated_unit_code,
                               unit_kind=(unit_record or {}).get("kind", "function"),
                               low_value_filter=ctx.low_value_filter)
    stages.append(s2)
    if not s2.passed:
        return _finish(candidate, ch, "stage2", stages)

    # Stage 3 — duplicates pre-filter
    s3 = s3mod.stage3_duplicates(m_source, ctx.test_runner)
    stages.append(s3)
    if not s3.passed:
        return _finish(candidate, ch, "stage3", stages)

    return _stages_4_5(ctx, candidate, target_json, unit_record, stages, ch, m_source,
                       focus_active, _suppress_proactive, pinned_boundary)


def _stages_4_5(ctx, candidate, target_json, unit_record, stages, ch, m_source,
                focus_active, _suppress_proactive, pinned_boundary):
    # Stage 4 — R1 safety differential (the canary: an unbound R1 timeout latches focus mode for
    # this case, so R2 below and every later candidate go focused and never spin — FOCUS_FUNCTION_PLAN).
    r1_focus = _r1_focus_name(unit_record, ctx.p_source, m_source)
    # focused = proactive per-cell focus (batch pipeline) OR the legacy reactive canary latch.
    focused = focus_active or ctx.focus_latched
    if getattr(getattr(ctx.config, "ablation", None), "disable_r1", False):
        s4 = StageResult("stage4", Outcome.CONTINUE,
                         {"r1_outcome": "disabled_by_config",
                          "note": "R1 disabled; continuing directly to R2",
                          "r1_timed_out": False})
    elif focused and r1_focus:
        s4 = r1mod.stage4_r1(ctx.config, m_source, ctx.contract,
                             ctx.focused_r1_baseline(r1_focus), ctx.run_fn, focus_function=r1_focus)
    elif focused:
        # focus is active but this unit is a modifier/overload R1 cannot focus (codex Finding 4): the
        # unbound R1 would just re-spin to timeout. SKIP it — R1 is a positive-only cheap-win shortcut,
        # and every fault class it would catch (div-by-zero/bounds → revert diff; narrowing →
        # state/return diff) is still caught by the focused R2 below. (Now also the modifier-MUTATION
        # path: a mutated modifier body — DEVIATIONS V37 — yields r1_focus=None here.)
        s4 = StageResult("stage4", Outcome.CONTINUE,
                         {"r1_outcome": "skipped_unfocusable_focused",
                          "note": "R1 skipped: focus active but unit not a unique plain function",
                          "r1_timed_out": False})
    else:
        s4 = r1mod.stage4_r1(ctx.config, m_source, ctx.contract, ctx.r1_baseline, ctx.run_fn)
        if s4.detail.get("r1_timed_out"):
            ctx.focus_latched = True  # canary tripped → latch for every later candidate of this case
            if r1_focus:              # re-run THIS mutant focused so it is not wasted
                s4 = r1mod.stage4_r1(ctx.config, m_source, ctx.contract,
                                     ctx.focused_r1_baseline(r1_focus), ctx.run_fn,
                                     focus_function=r1_focus)
    stages.append(s4)
    if s4.outcome == Outcome.VISIBLE_DIFFERENCE:
        confirmed = _confirm_r1(ctx, candidate, target_json, unit_record, s4, m_source)
        return _finish(candidate, ch, "stage4", stages, confirmed)
    # s4 is CONTINUE (clean or inconclusive) → R2

    # reachability guard (Doc 2 §6.4 / V3): if the edited unit is not reached by any public/
    # external entry, the harness cannot drive it and R2 would falsely report no_difference on
    # an unobservable cell — report not_r2_checkable instead (codex F2).
    reaches = (target_json or {}).get("entries", {}).get("reaches_unit", {})
    if candidate.unit_id in reaches and reaches[candidate.unit_id] is False:
        s_guard = StageResult("stage5", Outcome.INCONCLUSIVE,
                              {"reason": "not_r2_checkable", "detail": "edited unit unreachable from any entry"})
        stages.append(s_guard)
        return _finish(candidate, ch, "stage5", stages)

    # Stage 5 — R2 observational differential. focus_mode ⇒ query the focused differential directly
    # (proactive per-cell focus for the batch pipeline, or the reactive canary latch); pinned_boundary
    # pins a STATE target's R2 to ONLY this cell's writer x.
    s5 = r2mod.stage5_r2(ctx.config, ctx.p_source, m_source, ctx.contract, target_json,
                         ctx.run_fn, ctx.compile_fn,
                         focus_mode=((focus_active or ctx.focus_latched) and not _suppress_proactive),
                         pinned_boundary=(pinned_boundary if focus_active else None),
                         run_fn_fast=ctx.run_fn_fast,
                         all_targets=ctx.doc1.get("targets", []))
    if s5.detail.get("focus_escalation"):   # R2 itself had to focus → latch for later candidates too
        ctx.focus_latched = True
    stages.append(s5)
    if s5.outcome == Outcome.VISIBLE_DIFFERENCE:
        confirmed = _confirm_r2(ctx, candidate, target_json, unit_record, s5, m_source)
        return _finish(candidate, ch, "stage5", stages, confirmed)
    return _finish(candidate, ch, "stage5", stages)


def validate_candidate_static(ctx: ValidationContext, candidate: Candidate) -> ValidationResult:
    """no_df ablation (verifier-free FRONT-END): run ONLY the static stages 0-2 (dedup → build+compile
    → format), NO R1/R2 differential and NO confirmed_difference. A candidate that passes the static
    gate is reported as VISIBLE_DIFFERENCE with `confirmed=None` — i.e. an UNVERIFIED mutant candidate
    (possibly equivalent/weak) proceeds to the ESBMC test stage with NO verifier guidance (no CE, no
    strong-mutant guarantee). This is the SAME static gate as full-mode validate_candidate's stages 0-2,
    so failure outcomes/records match; it simply stops before stage 3+R1+R2. Mirrors record shape via
    _finish so the orchestrator and artifacts are unchanged."""
    stages: list[StageResult] = []
    target_json = ctx.target_json(candidate.target_id)
    unit_record = _unit_record(target_json, candidate.unit_id)

    s0 = st.stage0_dedup(candidate, ctx.seen_change_hashes)
    stages.append(s0)
    ch = s0.detail["change_hash"]
    if not s0.passed:
        return _finish(candidate, ch, "stage0", stages)
    ctx.seen_change_hashes.add(ch)

    s1, m_source = st.stage1_build_compile(candidate, ctx.p_source, unit_record, ctx.compile_fn)
    stages.append(s1)
    if not s1.passed:
        return _finish(candidate, ch, "stage1", stages)
    original_unit_text = s1.detail["original_unit_text"]

    s2 = st.stage2_format_check(candidate, original_unit_text, candidate.mutated_unit_code,
                               unit_kind=(unit_record or {}).get("kind", "function"),
                               low_value_filter=ctx.low_value_filter)
    stages.append(s2)
    if not s2.passed:
        return _finish(candidate, ch, "stage2", stages)

    # passed the static gate → "productive" (advances to test stage) but UNVERIFIED: no R1/R2,
    # confirmed=None. The test stage's ESBMC oracle (verify_test) is what then filters equivalent
    # mutants (holds_on_modified), at the cost full-mode avoids by confirming non-equivalence here.
    s_ok = StageResult("static_gate", Outcome.VISIBLE_DIFFERENCE,
                       {"reason": "static_gate_passed_no_verifier", "silent": False})
    stages.append(s_ok)
    return _finish(candidate, ch, "static_gate", stages, confirmed=None)


def _confirm_r1(ctx, candidate, target_json, unit_record, s4, m_source) -> dict:
    pv = s4.detail.get("primary_violation", {})
    check = s4.detail.get("safety_check", "")
    rendered = (f"Call sequence:\n1. (the introduced fault triggers on M)\n"
                f"Observed difference (runtime_safety: {check}):\n"
                f"- Original: completes without {check}\n"
                f"- Modified: violates {check} at {pv.get('function')}:{pv.get('line')}")
    return build_confirmed_difference(
        confirmed_difference_id=ctx.next_confirmed_id(), candidate=candidate,
        target_json=target_json or {}, stage_result=s4, rendered_difference=rendered,
        edited_statement_id=_edited_statement_id(unit_record, ctx.p_source, m_source))


def _confirm_r2(ctx, candidate, target_json, unit_record, s5, m_source) -> dict:
    ce = parse_counterexample(s5.detail.get("stdout", ""), s5.detail.get("stderr", ""))
    kind = s5.detail.get("difference_kind")
    tgt = (target_json or {}).get("target", {})
    locus = tgt.get("locus", {})
    getter = tgt.get("getter", {}) or {}
    # a state target may report a REVERT difference via the §6.5 revert fallback; render it against
    # the writer that reverts (revert_writer), not the state var's locus name.
    fn_name = s5.detail.get("revert_writer") or locus.get("name")
    rendered = render_difference(
        ce, kind, var_name=locus.get("name"), fn_name=fn_name,
        getter_keys=[p["name"] for p in getter.get("params", [])],
        ref_name=s5.detail.get("ref_name", "C_ref"), mut_name=s5.detail.get("mut_name", "C_mut"))
    # V43: a state difference whose observer snapshots differ (snapP != snapM) is visible only DURING
    # the boundary's external call (CEI/reentrancy). Flag it + carry the view getter to snapshot in
    # receive() and P's during-call reading (a HINT, not pinned — witness-specific, codex Q3).
    during_call = kind == "state" and ce.during_call
    return build_confirmed_difference(
        confirmed_difference_id=ctx.next_confirmed_id(), candidate=candidate,
        target_json=target_json or {}, stage_result=s5, rendered_difference=rendered,
        counterexample=ce,
        edited_statement_id=_edited_statement_id(unit_record, ctx.p_source, m_source),
        during_call=during_call,
        observer_getter=(getter.get("getter_name") if during_call else None),
        observer_value_p=(ce.snap_p if during_call else None))
