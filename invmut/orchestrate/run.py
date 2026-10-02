"""Doc 5 §1 — the mutation loop + test loop driver.

`run_unit(rc)` runs Doc-1 selection on the (renamed-to-C) source, then for each target runs the mutation
loop; each confirmed visible difference enters the test loop; an accepted test is Doc-4 rendered and its
statement marked covered. Budgets (Doc 5 §9 / prompts §14): per-statement 3, per-goal 20, reflection 1,
per-difference test attempts 5. Infra (LLM API) errors consume 0 budget and abort the unit as resumable.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

from invmut import select
from invmut.agents import mutate_agent as MA
from invmut.agents import prompts
from invmut.agents import test_agent as TA
from invmut.agents.client import LLMClient, LLMInfraError
from invmut.agents.memory import TestMemory
from invmut.config import Config
from invmut.esbmc.runner import make_run_fn
from invmut.mutation import r1 as r1mod
from invmut.mutation import static_stages as st
from invmut.mutation.compile import make_solc_compile_fn
from invmut.mutation.model import Candidate, Outcome
from invmut.replay import stage as _replay_branch
from invmut.mutation.validate import (ValidationContext, validate_candidate, validate_candidate_static, _unit_record,
                                      prescreen_candidate, finish_screened)
from invmut.orchestrate import prep
from invmut.render import RenderInput, render_only
from invmut.render import pipeline as _pipeline
from invmut.verify.verify import verify_test
from concurrent.futures import ThreadPoolExecutor


@dataclass
class ModelSpec:
    """Which model/thinking the agents use this run (RQ3 axis)."""
    model: Optional[str] = None
    thinking: Optional[bool] = None
    # role split (USER 2026-06-29): cheaper model for MUTANT generation (a high-volume enumeration task),
    # while TEST generation keeps `model` (the hard property-reasoning task). None => mutants use `model` too.
    mutant_model: Optional[str] = None


@dataclass
class RunContext:
    config: Config
    p_source: str                 # the (renamed) reference source, primary contract C — FULL flattened file
    contract: str                 # "C"
    doc1: dict                    # Doc-1 selection JSON
    client: LLMClient
    spec: ModelSpec = field(default_factory=ModelSpec)
    # LLM-FACING slice of p_source: the target contract C + its inheritance chain + file-level decls ONLY
    # (not the hundreds of unrelated libs/interfaces a flattened file carries). Prompts read this; compile/
    # verify still use the full p_source. Cuts prompt tokens ~40x on real-world flattened sources
    # (906KB->22KB observed). Falls back to p_source when unset/extraction failed.
    prompt_source: Optional[str] = None
    # diff-anchored mutation (USER 2026-06-30): the (renamed) BUG source for this case, set by run_case when
    # config.diff_anchored_mutation is on. We DETERMINISTICALLY inject the bug's version of each fix-changed
    # unit as an extra mutant candidate (M = the un-patched / vulnerable unit), so the mutant faithfully
    # reproduces the real vulnerability: an on-target mutant whose generated test
    # catches the real bug. None ⇒ classic bug-agnostic mutation. (Earlier patch_diff/prompt-suffix approach
    # superseded — deterministic injection is reliable + adds exactly ONE candidate per cell so it cannot
    # starve later candidates the way an LLM swarm of slow-R2 mutants did.)
    bug_source: Optional[str] = None
    patch_diff: Optional[str] = None
    import_path: str = "../src/C_under_test.sol"
    pragma: str = "pragma solidity ^0.8.0;"
    construction: dict = field(default_factory=lambda: {"kind": "no_arg", "value": "0"})
    # NO test/mutant-count caps (ERRORS #143). The ONLY global terminator of mutation generation is the
    # reflection limit (config.max_reflections=5, DEVIATIONS V9): a SINGLE counter, shared across ALL
    # targets, of consecutive mutation attempts that produced no new visible-difference; any success resets
    # it to 0; reaching 5 stops the WHOLE mutation loop. (max_mutation_attempts_per_goal is NOT used — it was
    # a per-target cap that diverged from V9; ERRORS #145.) test side: max_test_attempts_per_confirmed_
    # difference (=5) per mutant, stop on first pass. Every accepted test is kept and kill-checked.
    mutation_budget: Optional[int] = None       # override config.max_reflections for the global miss counter
    test_attempts: Optional[int] = None         # default = config.max_test_attempts_per_confirmed_difference (5)
    # wall (time.time()) after which run_unit stops STARTING new targets/mutations and returns the
    # accepted-so-far, so run_case can still kill-check them. Without it a productive large contract is
    # SIGKILLed mid-mutation-loop (rq3_run hard cap) before kill_check ever runs → its accepted tests get
    # 0 credit (observed: ct_5 had 10 accepted + 11 visible_difference, scored 0 on case_timeout).
    mutation_deadline: Optional[float] = None
    # A later wall for deferred test work. Layout: R2 until mutation_deadline, deferred tests until
    # fuzz_deadline, then kill_check on the remainder. The legacy field name is retained for compatibility.
    fuzz_deadline: Optional[float] = None
    test_deadline: Optional[float] = None   # deferred test phase wall (set by _deferred_test_phase)
    # ABLATION REPLAY (DEVIATIONS V39): path to a prior trial's mutants.jsonl. When set, run_unit does NOT
    # call the LLM to generate mutants — it replays the EXACT recorded mutant set (per cell, pre-filter) so
    # an ablation evaluates an identical mutant input under a different config (e.g. proactive_focus off,
    # test_attempts=1). Generation is frozen; only the downstream (focus/R1/R2/test loop) varies. The test
    # side stays live (test generation/reflection still call the LLM) unless the ablation caps test_attempts.
    replay_manifest: Optional[str] = None
    # Published ablation arms, set by dataset.harness._apply_ablation:
    #   differential=False   -> no_dv: no R1 baseline and no differential verification of a candidate
    #   property_focus=False -> no_pf: one unfocused queue entry per target instead of its boundary cells
    differential: bool = True
    property_focus: bool = True
    on_event: Optional[Callable[[dict], None]] = None
    # incremental per-attempt persistence: called with each test_records dict as it is produced, so a run
    # KILLED mid-case still leaves the raw test source + solc error on disk (the end-of-case _write_artifacts
    # would otherwise lose every did_not_compile sample on termination).
    attempt_sink: Optional[Callable[[dict], None]] = None
    # filled lazily
    _vctx: Optional[ValidationContext] = None

    def emit(self, **ev) -> None:
        if self.on_event:
            self.on_event(ev)


@dataclass
class AcceptedTest:
    target_id: str
    unit_id: str
    difference_id: str
    property_summary: str
    rendered_test: Optional[str]
    render_status: str
    validation_status: str
    esbmc_test_source: Optional[str] = None
    # RQ3 diagnosis persistence (codex NEW BUG (a)): keep every source + the forge evidence so a
    # validation_error (e.g. foundry_fuzz_failed_on_P) can be diagnosed from data, not speculation.
    validation_error: Optional[str] = None    # the specific Doc-4 code, when validation failed
    workspace_P_log: Optional[str] = None      # forge JSON on P (reference)
    workspace_M_log: Optional[str] = None      # forge JSON on M (mutant)
    # The mutant itself (so a kill can be hand-reviewed from data): the mutated unit's source and the
    # LLM's one-line description of the edit. Held only in MutantMemory at runtime otherwise.
    mutated_unit_code: Optional[str] = None    # the variant Solidity unit (what P was changed into)
    change_summary: Optional[str] = None       # human-readable description of the single edit
    llm_test_source: Optional[str] = None      # V40: the raw LLM InvMutTest source, re-verified against the REAL bug
    # Which experiment path produced this accepted test: "primary" for InvMut and "llm_only" for no_pa.
    # Threaded into the per-kill record (_score_kills) for attribution.
    origin: str = "primary"
    # CE-derived oracle attribution is orthogonal to `origin`: `origin` says how the test was generated;
    # these fields say whether a later deterministic recovery step strengthened it with a reused CE.
    success_route: Optional[str] = None
    oracle_origin: Optional[str] = None
    kill_entrypoint: Optional[str] = None
    property_based_core: Optional[bool] = None
    standalone_replay: Optional[bool] = None
    # Reach(P,T): did an execution of this test on the reference actually reach its oracle?
    # "proved"/"structural" = yes (verifier counterexample / a straight-line body that ran to its
    # end), "unreachable" = no, "undecided" = the query did not settle, None = not asked.
    oracle_reach: Optional[str] = None
    ce_id: Optional[str] = None
    source_difference_id: Optional[str] = None
    source_property_focus: Optional[str] = None
    confirmed_difference: Optional[dict] = None


@dataclass
class UnitResult:
    accepted_tests: list = field(default_factory=list)
    mutation_records: list = field(default_factory=list)
    # The FULL generated mutant set, one entry per (target, boundary) cell, captured PRE-filter (every FOM
    # the LLM proposed, including the ones ESBMC later drops). This is the frozen "mutant input" an ablation
    # replays via rc.replay_manifest (DEVIATIONS V39). Persisted to <artifact_dir>/mutants.jsonl ALWAYS
    # (even on a 0-kill case), so every trial's exact input is on disk for later alignment.
    mutant_sets: list = field(default_factory=list)
    test_records: list = field(default_factory=list)
    infra_aborted: bool = False
    infra_reason: Optional[str] = None
    mutation_deadline_hit: bool = False   # mutation phase stopped early to reserve case wall for kill_check
    deferred_tests: list = field(default_factory=list)   # (tjson, cand, result) awaiting the deferred test phase
    deferred_done: int = 0                                # how many deferred_tests entries have run
    live_tests: list = field(default_factory=list)       # (k, gen) started in-cell (confirmed_first_cell_wall)
    dropped_cands: list = field(default_factory=list)    # (tjson, boundary, [cands]) cut by the cell wall
    tokens: dict = field(default_factory=lambda: {"prompt": 0, "completion": 0, "reasoning": 0})
    # run_mode direct_pbt / no_mg with config.direct_score_inline: the V-score of each accepted test, made
    # right after acceptance (orchestrate/direct.py); run_case scores only the tests not listed here.
    inline_scored: list = field(default_factory=list)


def _vctx(rc: RunContext) -> ValidationContext:
    if rc._vctx is None:
        run_fn = make_run_fn(rc.config)
        # V44: a short-timeout run_fn for the unfocused-first R2 probe (fail-fast; see config).
        run_fn_fast = make_run_fn(rc.config, timeout_s=rc.config.verifier.r2_unfocused_timeout_s)
        compile_fn = make_solc_compile_fn(rc.config)
        if (not rc.differential
                or getattr(getattr(rc.config, "ablation", None), "disable_r1", False)):
            baseline = r1mod.R1Run([], True, False, {}, [], "R1_DISABLED")
        else:
            baseline = r1mod.precompute_r1_baseline(rc.config, rc.p_source, rc.contract, run_fn)
        rc._vctx = ValidationContext(rc.config, rc.p_source, rc.contract, rc.doc1, run_fn, compile_fn,
                                     baseline, low_value_filter=False, run_fn_fast=run_fn_fast,
                                     # canary: if R1 on P itself spins, start the very first candidate
                                     # focused (FOCUS_FUNCTION_PLAN) instead of letting R2 time out.
                                     focus_latched=baseline.timed_out)
    return rc._vctx


def _acc_tokens(res: UnitResult, attempt) -> None:
    for r in attempt.llm_results:
        res.tokens["prompt"] += r.prompt_tokens
        res.tokens["completion"] += r.completion_tokens
        res.tokens["reasoning"] += r.reasoning_tokens
        # cached input is billed at a fraction of fresh input on both providers, so the cost
        # of a run cannot be read off "prompt" alone.  Carried here so case.log records it.
        res.tokens["cached"] = res.tokens.get("cached", 0) + getattr(r, "prompt_cache_hit_tokens", 0)


def run_unit(rc: RunContext) -> UnitResult:
    """Batch full pipeline (DEVIATIONS V35). For each target y, for each boundary x
    (a driving public/external entry), one LLM call emits ALL first-order mutants of x's behavior; each
    FOM is ESBMC-filtered (R1/R2 as a PURE FILTER — no mutation reflection) and every confirmed visible
    difference enters the unchanged test loop. Terminators: targets/cells exhausted, or mutation_deadline
    (the case-wall reservation for kill_check). NO global miss counter (it was the old single-mutant
    loop's terminator). Case-level mutant dedup lives in the shared ValidationContext.seen_change_hashes.

    ABLATION REPLAY (DEVIATIONS V39): when rc.replay_manifest is set, generation is bypassed entirely and
    the recorded mutant set is replayed instead (see _run_unit_replay)."""
    res = UnitResult()
    _mutation_phase(rc, res)
    _deferred_test_phase(rc, res)
    _dropped_sweep_phase(rc, res)
    return res


def _dropped_sweep_phase(rc: RunContext, res: UnitResult) -> None:
    """config.resume_dropped_candidates (DeepSeek Pro arm 2026-09-07): after the queued test loops, spend the wall
    that is still left before fuzz_deadline on the candidates the cell wall cut (R2 + their test loops, same
    cell wall per cell, GT-blind arrival order). Without it a case that finished its queue early ends idle
    (CVE_2019_15078 t1: done at 487 s with 2 candidates of the first cell never evaluated)."""
    if not getattr(getattr(rc, "config", None), "resume_dropped_candidates", False) or not res.dropped_cands:
        return
    deadline = getattr(rc, "fuzz_deadline", None) or rc.mutation_deadline
    if deadline is None or time.time() >= deadline:
        return
    saved = rc.mutation_deadline
    # a candidate may take up to a full cell wall (fast probe + fallback + focused runs); never START one
    # that cannot finish before the phase deadline (a 616 s case = row lost under the 600 s wall)
    wall = float(getattr(rc.config, "r2_cell_wall_s", 0) or 0) or 120.0
    rc.mutation_deadline = deadline - wall
    if time.time() >= rc.mutation_deadline:
        rc.mutation_deadline = saved
        return
    queue, res.dropped_cands = res.dropped_cands, []
    try:
        for tjson, x, rest in queue:
            if time.time() >= deadline:
                break
            rc.emit(event="dropped_sweep", target_id=tjson.get("id"), boundary=x, n=len(rest))
            _eval_candidates(rc, tjson, x, rest, res)
            _deferred_test_phase(rc, res)
    except LLMInfraError as e:
        res.infra_aborted = True
        res.infra_reason = e.kind
        rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
    finally:
        rc.mutation_deadline = saved


def _deferred_test_phase(rc: RunContext, res: UnitResult) -> None:
    """Run the test loops queued by _eval_candidates (config.deferred_test_phase) until the LATER
    fuzz_deadline (default: mutation_deadline); the remainder of the case wall stays for kill_check."""
    if not res.deferred_tests and not res.live_tests:
        return
    deadline = getattr(rc, "fuzz_deadline", None) or rc.mutation_deadline
    rc.test_deadline = deadline
    if getattr(getattr(rc, "config", None), "deferred_test_round_robin", False):
        _deferred_round_robin(rc, res, deadline)
        return
    for k in range(res.deferred_done, len(res.deferred_tests)):
        tjson, cand, result = res.deferred_tests[k]
        if deadline is not None and time.time() >= deadline:
            rc.emit(event="test_phase_deadline", skipped=len(res.deferred_tests) - k)
            break
        res.deferred_done = k + 1
        try:
            _run_test_loop(rc, res, tjson, cand, result)
        except LLMInfraError as e:
            res.infra_aborted = True
            res.infra_reason = e.kind
            rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
            return


def _deferred_round_robin(rc: RunContext, res: UnitResult, deadline) -> None:
    """One attempt per queued difference per round, in arrival order (DeepSeek Pro arm 2026-09-07): under a phase
    deadline, 8 attempts on the first difference starved the other five (CVE_2019_15078 t2: differences
    D0003..D0006 never got a first attempt). GT-blind: no difference is preferred, only interleaved."""
    order = list(range(res.deferred_done, len(res.deferred_tests)))
    if getattr(getattr(rc, "config", None), "deferred_test_boundary_interleave", False):
        # Interleave by BOUNDARY, not only by difference (2026-09-23): one boundary that confirms many
        # differences (acfix_022_CVE_2018_19833 t2: `burn` 14 of 23) took every slot of the phase while
        # `freezeAccount`/`transfer` got none and `owned` 1 of 3. Rank = position of the difference among
        # its own boundary's differences, ties by arrival -> the first round reaches every boundary once.
        # GT-blind: boundaries are treated alike; nothing depends on where the bug is.
        seen = {}
        def _rank(k):
            b = ((res.deferred_tests[k][2].confirmed_difference or {}).get("boundary")) or ""
            seen[b] = seen.get(b, -1) + 1
            return seen[b]
        ranks = {k: _rank(k) for k in order}
        order.sort(key=lambda k: (ranks[k], k))
    live = []
    # config.confirmed_first_cell_wall: differences already started in-cell continue first, from their yield
    live, res.live_tests = list(res.live_tests), []
    for k in order:
        tjson, cand, result = res.deferred_tests[k]
        live.append((k, _test_loop_gen(rc, res, tjson, cand, result)))
    res.deferred_done = len(res.deferred_tests)
    try:
        while live:
            if deadline is not None and time.time() >= deadline:
                rc.emit(event="test_phase_deadline", skipped=len(live))
                break
            for item in list(live):
                if deadline is not None and time.time() >= deadline:
                    break
                try:
                    next(item[1])
                except StopIteration:
                    live.remove(item)
    except LLMInfraError as e:
        res.infra_aborted = True
        res.infra_reason = e.kind
        rc.emit(event="infra_error", kind=e.kind, detail=e.detail)


def _mutation_phase(rc: RunContext, res: UnitResult) -> None:
    if getattr(rc, "replay_manifest", None):   # getattr: some test stubs build a partial RunContext
        _run_unit_replay(rc, res)
        return
    # V44: ROUND-ROBIN over targets (diagnosis G1 fix). The old loop drained each target fully before
    # the next, so a fault-bearing LATE target (e.g. a `return` TOD target) was starved when early
    # targets' cells consumed the case wall. Build one cell-queue per target and process ONE cell per
    # target per round, so every target is reached early; the mutation_deadline still terminates.
    if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
        res.mutation_deadline_hit = True   # past deadline before any work: reserve wall for kill_check
        return
    queues: list[tuple[dict, list]] = []
    for tjson in rc.doc1.get("targets", []):
        if not rc.property_focus:
            queues.append((tjson, [None]))
            continue
        cells = prep.cell_boundaries(tjson)
        if not cells:
            # user point 3: a target no public boundary drives is skipped entirely (saves tokens).
            res.mutation_records.append({"target_id": tjson.get("id"), "outcome": "no_qualifying_boundary"})
            rc.emit(event="mutation", target_id=tjson.get("id"), outcome="no_qualifying_boundary")
            continue
        queues.append((tjson, list(cells)))
    # S-ORD, config-gated: the round-robin above reaches every
    # target early only if the targets themselves are not ordered badly. MEASURED on the 6
    # cases whose fault cell was never reached (scratchpad/sord_dryrun.out, zero LLM): the
    # walk pops 1-9 of 17-44 planned cells inside the mutation deadline, and doc1 order puts
    # trivial getters FIRST, so the popped cells are dominated by `owner`/`debt`/`factory`
    # style boundaries while the fault-bearing writer sits at index 3-27.
    #   Ordering by `mutation_state_writers_first` sends a target whose ONLY editable
    # statement is a bare RETURN to the back. That signal is read from doc1 built on the
    # REFERENCE source alone -- the bug/fix diff is never consulted, so this is not ground
    # truth and does not violate the bug-agnostic rule.
    #   Fault-cell index, doc1 order -> S-ORD: pop_049_Cooler 9->2, pop_020_GSPFunding
    # 27->2, pop_051_LiquidityPool 26->15, pop_058_PuttyV2 19->0, pop_077_MergingPool 3->1,
    # pop_018_PrivatePool 14->15. Every cell is still popped eventually; only the order and
    # therefore WHICH cells survive the deadline change.
    def _apply_sord(qs, emit):
        if not getattr(rc.config, "mutation_state_writers_first", False):
            return qs
        def key(tc):
            units = (tc[0].get("scope") or {}).get("mutable_units") or []
            stmts = [s for u in units for s in (u.get("statements") or [])]
            kinds = {s.get("node_type") for s in stmts}
            trivial_getter = len(stmts) <= 1 and kinds <= {"RETURN"}
            return (1 if trivial_getter else 0, -len(stmts))
        qs = sorted(qs, key=key)                         # stable: ties keep doc1 order
        if emit:
            rc.emit(event="cell_order", policy="state_writers_first",
                    order=[t.get("id") for t, _c in qs])
        return qs

    # X-CALL ordering, config-gated (2026-09-22): doc1 lists state targets first and then the
    # explicit_revert targets in SOURCE order, and source order carries no methodological meaning --
    # in MONEY_BOX (rcx_reentrancy__0xbe4041..) the ONLY unit that makes an external call, Collect,
    # is last, so the round-robin reaches T0000..T0005 and the mutation deadline fires 2 s before
    # T0006. MEASURED (scripts/focus_census.py, trial 1): REAL utilization is 22.7% (262 of 1155
    # planned cells attempted) and 52 of the 58 starved REAL rows failed, so WHICH cells survive the
    # deadline decides the cell.
    #   A unit that sends value or makes a low-level/contract call has strictly more observable
    # surface than a pure setter (revert path, callee behaviour, re-entrancy, balance), so it is
    # ordered first. The signal is read from the REFERENCE source already in rc.p_source -- the
    # bug/fix diff is never consulted -- so this is bug-agnostic, exactly like _apply_sord.
    _XCALL_RE = re.compile(r"\.call\s*[{(]|\.delegatecall\s*\(|\.transfer\s*\(|\.send\s*\(")

    def _unit_text(u) -> str:
        a, b = u.get("start_line"), u.get("end_line")
        if not isinstance(a, int) or not isinstance(b, int) or a < 1:
            return ""
        lines = (rc.p_source or "").splitlines()
        if b > len(lines):
            return ""
        return "\n".join(lines[a - 1:b])

    def _has_xcall(tjson) -> bool:
        units = (tjson.get("scope") or {}).get("mutable_units") or []
        return any(_XCALL_RE.search(_unit_text(u)) for u in units)

    def _apply_xcall(qs, emit):
        if not getattr(rc.config, "mutation_external_call_units_first", False):
            return qs
        # 1) targets whose editable units make an external call go first (stable: ties keep order)
        qs = sorted(qs, key=lambda tc: 0 if _has_xcall(tc[0]) else 1)
        # 2) inside each target, a boundary whose own function makes an external call goes first
        by_fn = {}
        for tjson, _cells in qs:
            for u in (tjson.get("scope") or {}).get("mutable_units") or []:
                nm = (u.get("signature") or "").split("(")[0] or u.get("canonical_name") or ""
                if nm:
                    by_fn[nm] = by_fn.get(nm, False) or bool(_XCALL_RE.search(_unit_text(u)))
        out = []
        for tjson, cells in qs:
            if cells and all(isinstance(c, str) for c in cells):
                cells = sorted(cells, key=lambda x: 0 if by_fn.get(str(x).split("(")[0]) else 1)
            out.append((tjson, cells))
        if emit:
            rc.emit(event="cell_order", policy="external_call_units_first",
                    order=[t.get("id") for t, _c in out],
                    boundaries=[list(c) for _t, c in out])
        return out

    # NON-VIEW-FIRST, config-gated (2026-09-22, config.mutation_non_view_boundaries_first). doc1 order
    # lists a contract's members in source order, which in practice puts the inherited / OpenZeppelin
    # getters (`paused`, `supportsInterface`, `getRoleAdmin`, `hasRole`, `owner`) FIRST. A `view`/`pure`
    # boundary cannot exhibit a state-mutation fault at all, yet it consumes the same cell budget: in
    # pop_001_Multicall trial 1 (DeepSeek Pro arm) all 39 test attempts landed on those four getters and the
    # patched boundary `multicall` -- planned at index 28 of 30 -- was never popped inside the deadline.
    #   The signal is the boundary's own stateMutability, read from the REFERENCE source alone; the
    # bug/fix diff is never consulted, so this is bug-agnostic exactly like S-ORD and x-call-first.
    #   MEASURED over the 25 cases whose patched function is selectable but was never scheduled, against
    # each cell's actual popped-cell depth (scratchpad/order2.py, zero LLM): 4 cases / 18 cells move from
    # beyond the depth to inside it (acfix_002_Templedao 13->7, acfix_llama3_002_Templedao 13->7,
    # acfix_fixlink_Product 28->11, pop_001_Multicall 28->2) and ZERO cases move the other way.
    _VIEW_RE = re.compile(r"\b(view|pure)\b")

    def _is_view_fn(name: str) -> bool:
        """True iff the LAST declaration of `name` that has a body is view/pure. The last one is the
        implementation: an interface/abstract declaration ends in `;` and is skipped."""
        src = rc.p_source or ""
        seen = False
        for m in re.finditer(r"function\s+" + re.escape(name) + r"\s*\(", src):
            i = src.find("{", m.end() - 1)
            semi = src.find(";", m.end() - 1)
            if i < 0 or (semi != -1 and semi < i):
                continue
            seen = bool(_VIEW_RE.search(src[m.start():i]))
        return seen

    def _apply_nonview(qs, emit):
        if not getattr(rc.config, "mutation_non_view_boundaries_first", False):
            return qs
        out = []
        for tjson, cells in qs:
            if cells and all(isinstance(c, str) for c in cells):
                cells = sorted(cells, key=lambda x: 1 if _is_view_fn(str(x).split("(")[0]) else 0)
            out.append((tjson, cells))
        out = sorted(out, key=lambda tc: 1 if (tc[1] and isinstance(tc[1][0], str)
                                               and _is_view_fn(str(tc[1][0]).split("(")[0])) else 0)
        if emit:
            rc.emit(event="cell_order", policy="non_view_boundaries_first",
                    order=[t.get("id") for t, _c in out],
                    boundaries=[list(c) for _t, c in out])
        return out

    queues = _apply_sord(queues, emit=True)
    queues = _apply_xcall(queues, emit=True)
    queues = _apply_nonview(queues, emit=True)
    # Config-gated: failed cells may leave most of the phase budget unused after one pass.
    # When mutation_passes_until_deadline > 1, refill the queues and run extra
    # passes (fresh LLM sampling each pass) until the mutation deadline; every pass obeys
    # the same deadline/infra terminators, so the case wall is unchanged.
    max_passes = max(1, int(getattr(rc.config, "mutation_passes_until_deadline", 1) or 1))
    for _pass in range(max_passes):
        if _pass:
            if rc.mutation_deadline is None:
                break   # no wall to spend: single pass only
            if time.time() >= rc.mutation_deadline - 30:
                break   # not enough wall left for a meaningful pass
            queues = [(tjson, list(prep.cell_boundaries(tjson)))
                      for tjson in rc.doc1.get("targets", [])]
            queues = [(t, c) for t, c in queues if c]
            # the refill rebuilds from doc1 order, so S-ORD has to be reapplied or passes
            # 2+ would walk the unordered queue the first pass was reordered away from
            queues = _apply_sord(queues, emit=False)
            queues = _apply_xcall(queues, emit=False)
            queues = _apply_nonview(queues, emit=False)
            rc.emit(event="mutation_extra_pass", n=_pass + 1)
        # The walk order, materialised: one cell per target per round -- byte-identical to the nested
        # while/for loop it replaces, but indexable, which is what lets the prefetcher look ahead.
        order = []
        _qs = [(t, list(c)) for t, c in queues]
        while any(c for _, c in _qs):
            for t, c in _qs:
                if c:
                    order.append((t, c.pop(0)))
        # config.mutation_prefetch_workers (2026-09-22): issue the NEXT cells' mutation LLM calls while
        # the current cell is being validated. MEASURED on acfix_002_Templedao t1 (Pro, DeepSeek flex
        # tier): a cell costs 52-180 s wall of which the batch mutation call is the bulk (T0002 12:41:58
        # -> 12:44:22 = 144 s, T0006 12:45:38 -> 12:48:38 = 180 s), so a 462 s mutation budget bought 3 of
        # 19 planned cells and the patched boundary `migrateStake`, at index 8 after non-view-first
        # ordering, was never popped. The calls are independent -- one batch per (target, boundary),
        # built from the REFERENCE source only -- and everything order-dependent (seen_change_hashes
        # dedup, the records, the emits) still happens serially in _run_cell, in the same walk order.
        # 0 = no prefetch, i.e. published behaviour.
        _nw = int(getattr(rc.config, "mutation_prefetch_workers", 0) or 0)
        _ex = ThreadPoolExecutor(max_workers=_nw) if _nw > 0 else None
        _futs: dict = {}
        try:
            i = 0
            while i < len(order):
                if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
                    res.mutation_deadline_hit = True   # reserve remaining case budget for kill_check
                    return
                if _ex is not None:
                    for j in range(i, min(i + _nw + 1, len(order))):
                        if j in _futs:
                            continue
                        _inp = _cell_inputs(rc, order[j][0], order[j][1])
                        _futs[j] = (_ex.submit(_propose_cell, rc, order[j][1], _inp)
                                    if _inp is not None else None)
                tjson, x = order[i]
                try:
                    _pre = _futs[i].result() if (_ex is not None and _futs.get(i) is not None) else None
                    _run_cell(rc, tjson, x, res, prefetched=_pre)
                except LLMInfraError as e:
                    res.infra_aborted = True
                    res.infra_reason = e.kind
                    rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
                    return
                _futs.pop(i, None)
                i += 1
        finally:
            if _ex is not None:
                for _f in _futs.values():
                    if _f is not None:
                        _f.cancel()
                _ex.shutdown(wait=False)
    return


def _extract_function(src: str, name: str) -> Optional[str]:
    """Return the full source text of function/fallback/receive/constructor `name` from a flat contract,
    matched by balanced braces. None if not found. (Diff-anchored mutation, USER 2026-06-30.)"""
    if not src or not name:
        return None
    pat = (r"\bfallback\b" if name == "fallback" else r"\breceive\b" if name == "receive"
           else r"\bconstructor\b" if name == "constructor" else r"\bfunction\s+" + re.escape(name) + r"\b")
    m = re.search(pat, src)
    if not m:
        return None
    i = src.find("{", m.start())
    if i < 0:
        return None
    depth = 0
    for j in range(i, len(src)):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                return src[m.start():j + 1]
    return None


def _diff_anchored_candidate(rc: RunContext, tjson: dict, x: str):
    """DETERMINISTIC diff-anchored mutant (USER 2026-06-30): the BUG's version of boundary x's unit, injected
    as one extra Candidate so the mutant reproduces the real vulnerability (an on-target M). Returns a
    Candidate or None (bug source absent / fn not found / fn identical between fix and bug / no matching
    mutable unit). Exactly ONE candidate per cell, so it cannot starve later candidates."""
    if not getattr(rc, "bug_source", None):
        return None
    fn = (x or "").split("(")[0].strip()
    bug_unit = _extract_function(rc.bug_source, fn)
    fix_unit = _extract_function(rc.p_source, fn)
    norm = lambda s: re.sub(r"\s+", " ", s or "").strip()
    if not bug_unit or not fix_unit or norm(bug_unit) == norm(fix_unit):
        return None
    uid = None
    for u in (tjson.get("scope", {}) or {}).get("mutable_units", []) or []:
        cn = (u.get("canonical_name") or "").split("(")[0].split(".")[-1]
        sg = (u.get("signature") or "").split("(")[0]
        if cn == fn or sg == fn:
            uid = u.get("unit_id"); break
    if uid is None:
        return None
    # operation MUST be a whitelisted op (model.py ALLOWED_OPERATIONS) or stage2 rejects it as format_error
    # (codex audit 2026-06-30): the whole unit is replaced by the bug's version, so "replace" is correct.
    return Candidate(tjson.get("id"), uid, "replace",
                     "Restore the vulnerable pre-patch version of this unit (revert the fix's change).",
                     bug_unit)


def _cell_inputs(rc: RunContext, tjson: dict, x: str):
    """Everything the cell's mutation LLM call needs, computed from the REFERENCE source only.
    Returns (editable, goal, fewshot, fewshot_on) or None when x is not an editable unit.

    Split out of _run_cell so config.mutation_prefetch_workers can issue the call for later cells while
    the current one is being validated -- the calls are independent (one batch per (target, boundary))
    and the only case-level shared state, ValidationContext.seen_change_hashes, is touched in
    _eval_candidates, which still runs serially in the walk order."""
    _stmt_cov = bool(getattr(rc.config, "mutate_statement_coverage", False))
    editable = prep.render_editable_units_for_boundary(
        tjson, x, rc.p_source, include_internal=getattr(rc.config, "editable_internal_units", False),
        with_statements=_stmt_cov)
    if editable is None:
        return None
    _alias_er = bool(getattr(rc.config, "revert_goal_for_explicit_revert", False))
    goal = prep.render_goal(tjson, boundary=x, alias_explicit_revert=_alias_er)
    fewshot = None
    fewshot_on = bool(getattr(rc.config, "mutation_fewshot", False))
    if fewshot_on:
        fewshot = prompts.fewshot_block(
            tjson.get("category"),
            ((tjson.get("target", {}) or {}).get("state_type", {}) or {}).get("kind"),
            alias_explicit_revert=_alias_er)
    return editable, goal, fewshot, fewshot_on


def _propose_cell(rc: RunContext, x: str, inputs) -> object:
    """The cell's mutation LLM call alone. Touches only rc.client, so it is safe to run in a worker."""
    editable, goal, fewshot, _fs_on = inputs
    return MA.propose_llm_mutants(
        rc.client, contract_code=(rc.prompt_source or rc.p_source), editable_units=editable, goal=goal,
        boundaries=x, max_json_retries=rc.config.max_json_retries_per_call,
        model=(rc.spec.mutant_model or rc.spec.model), thinking=rc.spec.thinking,
        patch_diff=rc.patch_diff,
        precondition_note=(prompts._PRECONDITION_NOTE
                           if getattr(rc.config, "mutate_preconditions", False) else ""),
        statement_coverage=bool(getattr(rc.config, "mutate_statement_coverage", False)),
        call_order=bool(getattr(rc.config, "mutate_call_order", False)),
        fewshot=fewshot)


def _run_cell(rc: RunContext, tjson: dict, x: str, res: UnitResult, prefetched=None) -> None:
    """One (target y, boundary x) cell: ONE batch LLM call → all FOMs of x's behavior; each FOM is
    validated with R1/R2 focused on x (pinned_boundary=x) and used as a pure filter — NO reflection,
    NO regeneration. A failed FOM (dup/compile/format/no-difference) is dropped with a recorded reason.

    `prefetched` is the already-completed mutation attempt for this cell (config.mutation_prefetch_workers);
    None ⇒ make the call here, exactly as before."""
    target_id = tjson.get("id")
    # editable units narrowed to x's body + the modifiers x invokes (user point 3); None ⇒ x is not an
    # editable unit (e.g. a dependency) → skip this cell.
    inputs = _cell_inputs(rc, tjson, x)
    if inputs is None:
        res.mutation_records.append({"target_id": target_id, "boundary": x, "outcome": "no_editable_unit"})
        rc.emit(event="mutation", target_id=target_id, boundary=x, outcome="no_editable_unit")
        return
    editable, goal, fewshot, fewshot_on = inputs
    # PROVENANCE, on every cell (see the 2026-09-10 note): `attached` distinguishes "flag on but this
    # focus shape has no exemplar" from "flag off".
    rc.emit(event="fewshot", target_id=target_id, boundary=x,
            enabled=fewshot_on, attached=bool(fewshot), chars=len(fewshot or ""))
    attempt = prefetched if prefetched is not None else _propose_cell(rc, x, inputs)
    _acc_tokens(res, attempt)
    # ALWAYS snapshot the full generated set (pre-filter) so an ablation can replay this exact input (V39),
    # even when parse failed (empty candidates ⇒ replay reproduces the same no-op) or 0 mutants survive.
    res.mutant_sets.append({
        "target_id": target_id, "boundary": x, "parse_ok": attempt.parse_ok,
        "candidates": [{"unit_id": c.unit_id, "operation": c.operation,
                        "change_summary": c.change_summary, "mutated_unit_code": c.mutated_unit_code}
                       for c in attempt.candidates]})
    # diff-anchored mutation (USER 2026-06-30): inject the bug's version of this boundary's unit as one
    # extra on-target candidate, evaluated EVEN IF the LLM mutation parse failed (so the un-patch mutant
    # is never lost to a bad mutate-LLM reply). Snapshot it so a replay reproduces it.
    da = _diff_anchored_candidate(rc, tjson, x)
    if da is not None:
        res.mutant_sets.append({"target_id": target_id, "boundary": x, "parse_ok": True, "diff_anchored": True,
                                "candidates": [{"unit_id": da.unit_id, "operation": da.operation,
                                                "change_summary": da.change_summary,
                                                "mutated_unit_code": da.mutated_unit_code}]})
    if not attempt.parse_ok:
        res.mutation_records.append({"target_id": target_id, "boundary": x, "outcome": "json_parse_error"})
        rc.emit(event="mutation", target_id=target_id, boundary=x, outcome="json_parse_error")
        if da is None:
            return
        cands = [da]
    else:
        cands = [Candidate(target_id, c.unit_id, c.operation, c.change_summary, c.mutated_unit_code)
                 for c in attempt.candidates]
        if da is not None:
            cands = [da] + cands   # un-patch mutant FIRST so its test loop runs before the budget expires
    _eval_candidates(rc, tjson, x, cands, res)


def _eval_candidates(rc: RunContext, tjson: dict, x: str, cands: list, res: UnitResult) -> None:
    """Validate a FIXED list of FOMs for cell (target y, boundary x) and run the test loop on each confirmed
    visible difference. Shared by live generation (_run_cell) and ablation replay (_run_unit_replay) so both
    paths evaluate mutants identically — the ONLY difference between a baseline trial and its ablation is
    where `cands` came from (LLM vs recorded manifest) and the config governing focus/test."""
    target_id = tjson.get("id")
    vctx = _vctx(rc)   # lazily precompute the R1 baseline once per case; reused across all cells
    # packed R2 screen (config.r2_pack_screen, mutation/r2pack.py): stages 0-3 per mutant, then ONE
    # multi-property ESBMC run over every compiled mutant of the cell; only flagged mutants pay the
    # ordinary single-mutant R2 below (resume=), the others are closed as inconclusive:pack_screen_*.
    pack_plan: dict[int, tuple] = {}
    if getattr(rc.config, "r2_pack_screen", False) and len(cands) >= 2 \
            and not (rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline):
        from invmut.mutation.r2pack import screen_cell
        pre = [prescreen_candidate(vctx, c) for c in cands]
        live = [(i, p) for i, p in enumerate(pre) if p[0] is None and p[1]]
        if len(live) >= 2:
            scr = screen_cell(rc.config, rc.p_source, [p[1] for _, p in live], rc.contract,
                              tjson, x, vctx.run_fn, vctx.compile_fn)
            if hasattr(scr, "outcomes"):
                res.mutation_records.append({"target_id": target_id, "boundary": x, "outcome": "pack_screen",
                                             "reason": scr.reason, "k": len(live),
                                             "flagged": sum(o == "visible_difference" for o in scr.outcomes),
                                             "elapsed_s": round(scr.elapsed_s, 1)})
                rc.emit(event="pack_screen", target_id=target_id, boundary=x, k=len(live),
                        reason=scr.reason, flagged=sum(o == "visible_difference" for o in scr.outcomes),
                        elapsed_s=round(scr.elapsed_s, 1))
                detail = {"reason": scr.reason, "r2_command": scr.argv, "elapsed_s": scr.elapsed_s}
                for (i, p), o in zip(live, scr.outcomes):
                    pack_plan[i] = ("confirm", p) if o == "visible_difference" else ("closed", p, o, detail)
            else:
                rc.emit(event="pack_screen", target_id=target_id, boundary=x, k=len(live),
                        reason=f"assembly_error:{scr.reason[:80]}")
        for i, p in enumerate(pre):
            if i not in pack_plan:
                pack_plan[i] = ("early", p) if p[0] is not None else ("confirm", p)
    cell_wall = getattr(rc.config, "r2_cell_wall_s", 0) or 0
    r2_spent = 0.0   # accumulated validation seconds of this cell (test loops excluded)
    # r2_parallel_workers (DeepSeek Pro arm 2026-09-07): validate the cell's candidates in an N-thread pool.
    # ESBMC/solc are single-core subprocesses with their own timeouts, so threads only overlap waiting;
    # per-candidate temp files are unique. Semantics preserved: results are POST-PROCESSED strictly in
    # submission order below, so records/deferred-test order match the serial path. Two deliberate
    # deviations, both wall-clock-only: the cell wall gates on ELAPSED cell time (not summed candidate
    # seconds), and stage0 dedup keeps its GIL-atomic set (two identical candidates racing can both run
    # R2 — wasted seconds, never a wrong verdict; ESBMC is a pure filter). Gated off (0) = serial.
    _workers = int(getattr(rc.config, "r2_parallel_workers", 0) or 0)
    if _workers > 1 and not pack_plan and len(cands) > 1:
        from concurrent.futures import ThreadPoolExecutor
        _t0 = time.time()
        _deadline = rc.mutation_deadline
        _results: dict[int, object] = {}
        # HARD cell wall (config.r2_cell_wall_hard, 2026-09-23). The pool can only cancel candidates that
        # have not STARTED; with 6 workers every candidate starts at once, and one candidate is a chain
        # of ESBMC stages (unfocused R1 -> focus latch -> focused R1 baseline + M -> R2 escalations), so
        # a 60 s wall became 420 s (rcx_reentrancy__0x4e73..SmartFix t3: first cell 486 s of the 660 s
        # case; acfix_3_5_101_ANCHToken: 570 s). Past the wall, every NEW ESBMC call returns an
        # immediate timeout instead of starting: the wrapper sits OUTSIDE the cache (nothing fake is
        # cached) and a timeout can only make a stage inconclusive -- it never manufactures a difference.
        _saved_fns = None
        if getattr(rc.config, "r2_cell_wall_hard", False) and (cell_wall > 0 or _deadline is not None):
            from invmut.esbmc.runner import EsbmcRun as _ER
            _hard = min([x for x in ((_t0 + cell_wall) if cell_wall > 0 else None, _deadline) if x is not None])
            _faked = set()
            def _wrap(fn):
                if fn is None:
                    return None
                def _g(argv, *a, **k):
                    if time.time() >= _hard:
                        _faked.add(tuple(argv))
                        return _ER(stdout="", stderr="invmut: cell wall reached before start", returncode=124,
                                   timed_out=True, elapsed_s=0.0)
                    return fn(argv, *a, **k)
                return _g
            _saved_fns = (vctx.run_fn, vctx.run_fn_fast)
            vctx.run_fn, vctx.run_fn_fast = _wrap(vctx.run_fn), _wrap(vctx.run_fn_fast)
        with ThreadPoolExecutor(max_workers=_workers) as _ex:
            _futs = {_ex.submit(validate_candidate, vctx, c, pinned_boundary=x): i
                     for i, c in enumerate(cands)}
            for _f, _i in list(_futs.items()):
                _budget = []
                if cell_wall > 0:
                    _budget.append(_t0 + cell_wall - time.time())
                if _deadline is not None:
                    _budget.append(_deadline - time.time())
                _left = min(_budget) if _budget else None
                if _left is not None and _left <= 0 and not _f.done():
                    _f.cancel()
                    continue
                try:
                    _results[_i] = _f.result(timeout=None if _left is None else max(_left, 1.0))
                except Exception:   # timeout: let the pool drain; running calls end at their own ESBMC caps
                    if not _f.cancel():
                        _results[_i] = _f.result()   # already running -> bounded by the per-call timeout
        if _saved_fns is not None:
            vctx.run_fn, vctx.run_fn_fast = _saved_fns
            # a focused P baseline computed from a faked timeout must not outlive this cell
            for _fn_name, _b in list(vctx._focused_baselines.items()):
                if tuple(getattr(_b, "command", None) or ()) in _faked:
                    del vctx._focused_baselines[_fn_name]
        r2_spent = time.time() - _t0
        _dropped = [i for i in range(len(cands)) if i not in _results]
        if _dropped:
            res.mutation_records.append({"target_id": target_id, "boundary": x, "outcome": Outcome.INCONCLUSIVE,
                                         "reason": "cell_r2_wall_exhausted", "dropped": len(_dropped),
                                         "r2_spent_s": round(r2_spent, 1)})
            rc.emit(event="mutation", target_id=target_id, boundary=x, outcome=Outcome.INCONCLUSIVE,
                    reason=f"cell_r2_wall_exhausted dropped={len(_dropped)} spent={r2_spent:.0f}s (parallel)")
            _dc = [cands[i] for i in _dropped]
            res.dropped_cands.append((tjson, x, _dc))
            if _deadline is not None and time.time() >= _deadline:
                res.mutation_deadline_hit = True
        for ci in sorted(_results):
            cand, result = cands[ci], _results[ci]
            _post_candidate(rc, res, tjson, x, cand, result)
        return
    for ci, cand in enumerate(cands):
        if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
            # Past the R2/mutation deadline, stop starting new validation work.
            res.mutation_deadline_hit = True
            break
        if cell_wall > 0 and r2_spent >= cell_wall:
            n_left = len(cands) - ci
            res.mutation_records.append({"target_id": target_id, "boundary": x, "outcome": Outcome.INCONCLUSIVE,
                                         "reason": "cell_r2_wall_exhausted", "dropped": n_left,
                                         "r2_spent_s": round(r2_spent, 1)})
            rc.emit(event="mutation", target_id=target_id, boundary=x, outcome=Outcome.INCONCLUSIVE,
                    reason=f"cell_r2_wall_exhausted dropped={n_left} spent={r2_spent:.0f}s")
            _dc = list(cands[ci:])
            res.dropped_cands.append((tjson, x, _dc))
            break
        _v0 = time.time()
        # case-level dedup is inside validate_candidate (stage0 vs ctx.seen_change_hashes).
        plan = pack_plan.get(ci)
        if plan is None:
            result = (validate_candidate(vctx, cand, pinned_boundary=x) if rc.differential
                      else validate_candidate_static(vctx, cand))
        elif plan[0] == "early":
            result = plan[1][0]
        elif plan[0] == "confirm":
            _early, m_src, stages, ch, urec = plan[1]
            result = (validate_candidate(vctx, cand, pinned_boundary=x, resume=(stages, ch, m_src, urec))
                      if rc.differential else validate_candidate_static(vctx, cand))
        else:
            _early, m_src, stages, ch, urec = plan[1]
            o = Outcome.NO_DIFFERENCE if plan[2] == "no_difference" else Outcome.INCONCLUSIVE
            result = finish_screened(cand, ch, stages, o, plan[3]["reason"], plan[3])
        r2_spent += time.time() - _v0
        _post_candidate(rc, res, tjson, x, cand, result)


def _post_candidate(rc: "RunContext", res: "UnitResult", tjson: dict, x: str, cand, result) -> None:
    """Record + route ONE validated candidate (shared by the serial and parallel R2 paths)."""
    target_id = tjson.get("id")
    cd = result.confirmed_difference or {}
    stmt_id = cd.get("edited_statement_id") \
        or (result.memory_record.get("stage_detail", {}) or {}).get("edited_statement_id")
    # persist the stage sub-reason on EVERY record (F1 diagnosis enabler): reason ∈ {FORMAT_REASON,
    # nonconverging_proof, timeout, m_no_cex_within_bound, boundary_unreachable, ...}.
    _reason = (result.memory_record.get("stage_detail", {}) or {}).get("reason")
    res.mutation_records.append({"target_id": target_id, "boundary": x, "unit_id": cand.unit_id,
                                 "outcome": result.outcome, "statement_id": stmt_id, "reason": _reason})
    rc.emit(event="mutation", target_id=target_id, boundary=x, outcome=result.outcome, reason=_reason)
    if result.outcome == Outcome.VISIBLE_DIFFERENCE and (result.confirmed_difference
                                                      or not rc.differential):
        result.confirmed_difference.setdefault("boundary", x)   # cell boundary (boundary_guard_trap_stop)
        # generate a test for EVERY confirmed difference; keep ALL accepted tests (kill-check runs
        # each against the bug). NO test/mutant-count cap (ERRORS #143).
        if getattr(rc.config, "deferred_test_phase", False):
            # two-phase schedule (DeepSeek Pro arm 2026-09-07): finish the R2 sweep over ALL cells first
            # (cell walls keep it bounded), then run the test loops in arrival order — an early cell's 5x50 s
            # test loops can no longer starve a later cell (L1: 55 REAL rows never reached their fault cell).
            res.deferred_tests.append((tjson, cand, result))
            rc.emit(event="test_deferred", difference_id=(result.confirmed_difference or {}).get("confirmed_difference_id"),
                    target_id=target_id, boundary=x)
        else:
            _run_test_loop(rc, res, tjson, cand, result)


def _read_mutant_manifest(path: str) -> list:
    """Parse a mutants.jsonl (one JSON cell record per line) written by a prior trial's _write_artifacts."""
    cells = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                cells.append(json.loads(line))
    return cells


def _run_unit_replay(rc: RunContext, res: UnitResult) -> None:
    """Re-evaluate a FROZEN mutant set recorded by a prior trial (DEVIATIONS V39) — the ablation primitive.
    Iterates the recorded cells (NOT live cell_boundaries, so the input is fixed even if selection or scope
    config drifts), maps each back to its doc1 target by id, reconstructs the exact Candidates, and runs the
    SAME _eval_candidates as a live trial. No mutation-side LLM call happens; the current config governs
    focus/R1/R2/test. A recorded target absent from the current doc1 is surfaced, not silently skipped."""
    by_id = {t.get("id"): t for t in rc.doc1.get("targets", [])}
    for cell in _read_mutant_manifest(rc.replay_manifest):
        if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
            res.mutation_deadline_hit = True
            return
        tid, x = cell.get("target_id"), cell.get("boundary")
        # echo the frozen cell back into this run's mutant_sets so the ablation's artifacts are self-describing
        res.mutant_sets.append(cell)
        tjson = by_id.get(tid)
        if tjson is None:
            res.mutation_records.append({"target_id": tid, "boundary": x, "outcome": "replay_target_missing"})
            rc.emit(event="mutation", target_id=tid, boundary=x, outcome="replay_target_missing")
            continue
        if not cell.get("parse_ok", True):
            # mirror the live _run_cell parse-failure branch EXACTLY so an ablation's mutation_records match
            # the baseline's even for a cell whose generation produced no parseable FOM (codex Q3, LOW).
            res.mutation_records.append({"target_id": tid, "boundary": x, "outcome": "json_parse_error"})
            rc.emit(event="mutation", target_id=tid, boundary=x, outcome="json_parse_error")
            continue
        cands = [Candidate(tid, c["unit_id"], c["operation"], c["change_summary"], c["mutated_unit_code"])
                 for c in cell.get("candidates", [])]
        try:
            _eval_candidates(rc, tjson, x, cands, res)
        except LLMInfraError as e:   # the test side is still live (test reflection kept) → may hit auth errors
            res.infra_aborted = True
            res.infra_reason = e.kind
            rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
            return


def _run_test_loop(rc: RunContext, res: UnitResult, tjson: dict, cand: Candidate,
                   mut_result) -> Optional[AcceptedTest]:
    """Drive one difference's test loop to completion (the original sequential behaviour)."""
    g = _test_loop_gen(rc, res, tjson, cand, mut_result)
    try:
        while True:
            next(g)
    except StopIteration as e:
        return e.value


def _test_loop_gen(rc: RunContext, res: UnitResult, tjson: dict, cand: Candidate, mut_result):
    """Generator form of the test loop: yields once BEFORE every attempt after the first, so the deferred
    phase can interleave several differences round-robin (config.deferred_test_round_robin). Return value
    (StopIteration.value) = the AcceptedTest or None, exactly as _run_test_loop."""
    # no_dv (rc.differential=False) reaches here with NO confirmed difference, so `cd` may be None
    # and carry no id; mint one from the validation context exactly as the published package did.
    cd = mut_result.confirmed_difference or {}
    diff_id = cd.get("confirmed_difference_id") or _vctx(rc).next_confirmed_id()
    tm = TestMemory()
    unit_record = _unit_record(tjson, cand.unit_id)
    s1, m_source = st.stage1_build_compile(cand, rc.p_source, unit_record, _vctx(rc).compile_fn)
    if not s1.passed:
        return None
    # The witness-replay branch (config.witness_replay). It runs HERE -- after M compiles, before the
    # first LLM call -- so it is independent of whether the property branch below succeeds and spends
    # none of its attempt budget. Its accepted test goes straight into res.accepted_tests; this loop's
    # own return value still belongs to the property branch.
    _replay_branch.run_replay_branch(rc, res, tjson, cand, diff_id, m_source, cd)
    if getattr(rc.config, "replay_only", False):
        # config.replay_only: harvest the replay branch alone. Stopping here is exactly what the
        # property branch would have contributed had its budget been zero, so the replays are the
        # same ones a full run emits -- it does not make them easier to keep.
        return None
    change = cand.change_summary
    difference = cd.get("rendered_difference", "")
    # CE-derived call order + observation category → pre-filled run() scaffold (prompts §7 / V30).
    call_sequence = cd.get("call_sequence") or []
    category = cd.get("difference_kind")
    # V43: a difference observable only DURING the boundary's external call (CEI/reentrancy) needs the
    # receive() observer test shape; scaffold it (the LLM still authors + verify_test gates).
    during_call = bool(cd.get("during_call"))
    observer_getter = cd.get("observer_getter")
    budget = rc.test_attempts or rc.config.max_test_attempts_per_confirmed_difference
    attempt = None
    dead_unknowns = 0   # consecutive base-case-exhausted m_no_cex outcomes (dead_difference_unknown_limit)
    assert_locked = False   # V40: once M is refuted (assert separates P/M), lock assert → reflect on require only
    locked_assert = None    # the canonical assert text frozen at lock time (audit: detect a reflection that changed it)
    for i in range(budget):
        if i:
            yield i
        _td = getattr(rc, "test_deadline", None)
        if _td is not None and time.time() >= _td:
            rc.emit(event="test", difference_id=diff_id, outcome="abandoned", reason="test_phase_deadline")
            break
        if attempt is None:
            # minimal-prompt (USER 2026-06-30): under no-think the heavy CE scaffold mechanically steers the
            # model into wrong/benign tests (fails_on_original, holds_on_modified). The minimal template drops
            # the CE/`{DIFFERENCE}` scaffold so the model writes a correct rule from P+mutant alone (verified).
            _tmpl = "minimal" if getattr(rc.config, "minimal_test_prompt", False) else "full"
            attempt = TA.propose_test(
                rc.client, contract_code=(rc.prompt_source or rc.p_source), contract_name=rc.contract, change=change,
                modified_unit_code=cand.mutated_unit_code, difference=difference,
                test_memory=tm.render(), max_json_retries=rc.config.max_json_retries_per_call,
                model=rc.spec.model, thinking=rc.spec.thinking,
                call_sequence=call_sequence, category=category, template=_tmpl,
                during_call=during_call, observer_getter=observer_getter)
        _acc_tokens(res, attempt)
        if not attempt.parse_ok:
            res.test_records.append({"difference_id": diff_id, "outcome": "json_parse_error"})
            attempt = None
            continue
        tcand = attempt.candidate
        vr = verify_test(rc.config, rc.p_source, m_source, tcand.test_code, rc.construction,
                         witness=None, run_fn=_vctx(rc).run_fn, compile_fn=_vctx(rc).compile_fn)
        outcome = vr["outcome"]
        reason = vr.get("reason")
        tm.add(tcand.property_summary, reason or outcome)
        # persist the raw LLM source for EVERY attempt (codex NEW BUG (a)): the ~95% malformed/rejected
        # tests need auditing too, and resume needs the source. compiler_error helps diagnose did_not_compile.
        rec = {"difference_id": diff_id, "outcome": outcome, "reason": reason,
               "test_code": tcand.test_code, "property_summary": tcand.property_summary,
               "compiler_error": vr.get("compiler_error") or None,
               # verifier summary (DeepSeek Pro arm 2026-09-07): where/what failed, so a rejected attempt can be audited
               # offline without re-running ESBMC
               "verifier": {k: (vr.get("verifier") or {}).get(k) for k in
                            ("break_result", "break_failure_location", "break_violated_property", "hold_result",
                             "hold_failure_location", "hold_violated_property", "break_base_case_exhausted")}}
        # audit (codex 2026-06-27): a phase-B require-only reflection must NOT alter the locked assert.
        # The prompt forbids it but nothing enforces it; flag a violation for the record (non-blocking —
        # ESBMC still gates acceptance, so this is a quality signal, not a soundness gate).
        if assert_locked and locked_assert is not None and _extract_assert(tcand.test_code) != locked_assert:
            rec["assert_changed_under_lock"] = True
        res.test_records.append(rec)
        if rc.attempt_sink:
            rc.attempt_sink(rec)
        rc.emit(event="test", difference_id=diff_id, outcome=outcome, reason=reason)

        if outcome == "accepted":
            _acc = _render_accepted(rc, res, tjson, cand, diff_id, m_source, tcand, vr,
                                    confirmed_difference=cd)
            if _acc is not None:
                return _acc
            # gate-hardening declined it: keep iterating like any other rejected attempt.
            continue
        lim = getattr(rc.config, "dead_difference_unknown_limit", 0) or 0
        if lim > 0:
            if reason == "m_no_cex_within_bound" and (vr.get("verifier") or {}).get("break_base_case_exhausted"):
                dead_unknowns += 1
            elif (vr.get("verifier") or {}).get("break_result"):
                dead_unknowns = 0   # the checker ran and saw something else: the path is not dead
            # a compile/shape failure says nothing about the path: keep the count (CVE_2019_15078 t2: 5 dead
            # verdicts interleaved with one did_not_compile never reached the limit of 3)
            if dead_unknowns >= lim:
                res.test_records.append({"difference_id": diff_id, "outcome": "abandoned", "reason": "dead_difference"})
                rc.emit(event="test", difference_id=diff_id, outcome="abandoned", reason="dead_difference")
                break
        if getattr(rc.config, "boundary_guard_trap_stop", False) and reason == "non_target_failure_on_modified":
            # the checker trapped on an assert INSIDE the boundary function itself (or one of its inlined
            # modifiers, ESBMC names them `<fn>_<modifier>`), e.g. an msg.data.length payload guard the ESBMC
            # model cannot pass: every test must call the boundary, so no test can ever be decided
            # (CVE_2019_15078 transferFrom_onlyPayloadSize: 2 attempts × ~50 s wasted). Verifier fact, GT-blind.
            _loc = (vr.get("verifier") or {}).get("break_failure_location") or {}
            _fn = _loc.get("function") or ""
            _b = (cd.get("boundary") or getattr(cand, "boundary", None) or "").split("(")[0]
            if _b and (_fn == _b or _fn.startswith(_b + "_")):
                res.test_records.append({"difference_id": diff_id, "outcome": "abandoned",
                                         "reason": f"boundary_guard_trap:{_fn}"})
                rc.emit(event="test", difference_id=diff_id, outcome="abandoned", reason=f"boundary_guard_trap:{_fn}")
                break

        # --- two-phase reflection state machine (V40, break-first oracle) ---
        cc = rc.prompt_source or rc.p_source
        common = dict(max_json_retries=rc.config.max_json_retries_per_call,
                      model=rc.spec.model, thinking=rc.spec.thinking)
        if outcome == "fails_on_original":
            # assert already separates P/M (M was refuted) but P violates the rule too → lock the assert,
            # reflect on require ONLY, showing P's counterexample. No mutant info (USER 2026-06-27).
            if not assert_locked:
                assert_locked = True
                locked_assert = _extract_assert(tcand.test_code)
            cex = _trim_cex((vr.get("verifier") or {}).get("hold_counterexample"))
            attempt = TA.reflect_test_require(rc.client, contract_code=cc, contract_name=rc.contract,
                                              test_code=tcand.test_code, test_memory=tm.render(),
                                              mode="tighten", counterexample=cex,
                                              allow_setup=getattr(rc.config, "precise_test_diags", False), **common)
        elif assert_locked:
            # post-lock (codex 2026-06-27): NEVER feed mutant/difference info back. holds_on_modified →
            # require too strict, M stopped breaking → LOOSEN. Any other failure (compile/malformed/
            # inconclusive) → require-only 'fix', keeping the locked assert. The full Prompt-D (with mutant
            # info, which can rewrite the assert) is used ONLY before the assert is locked.
            if outcome == "holds_on_modified":
                attempt = TA.reflect_test_require(rc.client, contract_code=cc, contract_name=rc.contract,
                                                  test_code=tcand.test_code, test_memory=tm.render(),
                                                  mode="loosen", counterexample=None, **common)
            else:
                hint = vr.get("compiler_error") or reason or outcome
                attempt = TA.reflect_test_require(rc.client, contract_code=cc, contract_name=rc.contract,
                                                  test_code=tcand.test_code, test_memory=tm.render(),
                                                  mode="fix", error_hint=hint, **common)
        else:
            # phase A (assert not locked): holds_on_modified → strengthen the ASSERT; plus the mechanical
            # diagnoses (compile/malformed/inconclusive) handled by the original Prompt-D routing.
            diag = _test_diag(outcome, reason, vr, precise=getattr(rc.config, "precise_test_diags", False))
            if diag is None:
                attempt = None
                continue
            attempt = TA.reflect_test(
                rc.client, contract_code=cc, contract_name=rc.contract, change=change,
                modified_unit_code=cand.mutated_unit_code, difference=difference, test_memory=tm.render(),
                call_sequence=call_sequence, category=category,
                during_call=during_call, observer_getter=observer_getter, **common, **diag)

    return None


def _extract_assert(test_code: str) -> str:
    """The whitespace-stripped argument of the test's single `assert(...)` (audit helper, V40). Uses
    paren-matching (not a greedy regex, which would over-match across a trailing receive()/extra `);`).
    Empty if none found — a mismatch then just won't false-positive the assert-changed flag."""
    import re
    s = test_code or ""
    m = re.search(r"\bassert\s*\(", s)
    if not m:
        return ""
    j, depth, start = m.end(), 1, m.end()
    while j < len(s) and depth:
        depth += (s[j] == "(") - (s[j] == ")")
        j += 1
    return re.sub(r"\s+", "", s[start:j - 1]) if depth == 0 else ""


def _trim_cex(raw: Optional[str], limit: int = 3000) -> str:
    """Keep the TAIL of an ESBMC run for the require-reflection prompt — the counterexample state block +
    'Violated property' sit at the end of the output."""
    if not raw:
        return "(no counterexample available)"
    raw = raw.strip()
    return raw if len(raw) <= limit else "...(truncated)...\n" + raw[-limit:]


def _test_diag(outcome: str, reason: Optional[str], vr: dict, precise: bool = False) -> Optional[dict]:
    """Map a Doc-3 outcome to a Prompt-D diagnosis (prompts §11). precise=config.precise_test_diags."""
    if outcome == "accepted":
        return None
    r = reason or outcome
    if precise:
        v = vr.get("verifier") or {}
        if r == "m_no_cex_within_bound" and v.get("break_base_case_exhausted"):
            return {"diag_kind": "m_no_cex_dead_path"}
        if r == "non_target_failure_on_modified":
            loc = v.get("break_failure_location") or {}
            fn = loc.get("function") or ""
            if fn and fn != "run" and not fn.startswith("_ESBMC"):
                # the trap is INSIDE c (an assert/guard of the contract itself fired under the checker's model,
                # e.g. an msg.data.length payload guard): the test must avoid that call path, not its arithmetic
                return {"diag_kind": "non_target_failure",
                        "FAIL_WHERE": f"an assert inside c's function `{fn}` (not in your test). The checker cannot pass that guard, so any test calling through `{fn}` is undecidable: drive the difference through another public entry if one exists, otherwise use a different observation"}
            claim = (v.get("break_violated_property") or "").replace("\n", " | ")
            where = f"line {loc.get('line')} of your own test body" if loc.get("line") else "a statement of your own test body"
            return {"diag_kind": "non_target_failure",
                    "FAIL_WHERE": where + (f" (checker claim: {claim[:300]})" if claim else "")}
    # a compile failure (the test did not compile, or the assembled harness did not) must show the LLM its
    # REAL solc error, not flat-shape/wrong-form guidance (codex root-cause #1 + the harness_compile_failed
    # vagueness bug). The Prompt-D did_not_compile branch renders {{COMPILER_ERROR}}.
    if r in ("did_not_compile", "harness_compile_failed"):
        return {"diag_kind": "did_not_compile", "COMPILER_ERROR": (vr.get("compiler_error") or r)[:1500]}
    if r in ("malformed_test",):
        # precise: the shape checker's own reason (canonical.py ShapeError.detail, forwarded as compiler_error)
        fr = (vr.get("compiler_error") or "") if precise else ""
        return {"diag_kind": "malformed_test", "FORM_REASON": fr or "a call on c was not a top-level statement"}
    if r == "uses_msg_value":
        return {"diag_kind": "uses_msg_value"}
    if r in ("construction_unknown", "construction_value_unknown"):
        return {"diag_kind": "wrong_form", "FORM_REASON": r}
    if outcome == "fails_on_original" or r == "fails_on_original":
        # surface WHERE P violates the rule (the assert line, already in the verifier block) + a
        # weakening directive — the static "fails on P" string gave the agent nothing to act on and
        # left fails_on_original the dominant reentrancy-case failure after the msg.value fix.
        loc = (vr.get("verifier") or {}).get("hold_failure_location") or {}
        where = f" at {loc.get('file', '?')}:{loc.get('line')}" if loc.get("line") else ""
        return {"diag_kind": "fails_on_original",
                "ORIGINAL_FAIL": (f"the assertion fails on P itself{where} — for some inputs P already "
                                  "violates your rule. Either exclude those inputs with require(...), or "
                                  "weaken the rule. For a revert difference, constrain ONLY the `reverted` "
                                  "flag under a precondition you control; do not assert internal "
                                  "balances/credits (P may legitimately revert via its own require/guards).")}
    if outcome == "holds_on_modified" or r == "holds_on_modified":
        return {"diag_kind": "holds_on_modified"}
    if r == "m_no_cex_within_bound":
        return {"diag_kind": "m_no_cex_within_bound"}
    if r in ("nonconverging_proof", "timeout", "solver_unknown", "solver_abort"):
        return {"diag_kind": "inconclusive"}
    return {"diag_kind": "inconclusive"}


def _solc_version_for(rc):
    from invmut.orchestrate.concrete import _solc_version   # lazy: avoid circular import
    return _solc_version(rc.config)


def _reach_verdict(vr) -> Optional[str]:
    """Reach(P,T) as the verifier reported it: 'proved' when its assert(false) query at the oracle
    site returned a counterexample, else its own word, None when the premise was not asked for."""
    r = (vr.get("verifier") or {}).get("reach_result")
    return {"reachable": "proved"}.get(r, r)


def _render_accepted(rc, res, tjson, cand, diff_id, m_source, tcand, vr, *,
                     confirmed_difference=None) -> AcceptedTest:
    bundle = vr["accepted_bundle"]
    ri = RenderInput(bundle=bundle, c_scope_source=rc.p_source, m_scope_source=m_source,
                     import_path=rc.import_path, pragma=rc.pragma, contract_name=rc.contract)
    # V40 (USER 2026-06-27): ESBMC `accepted` (P-hold ∧ M-break, both --bound --k-induction) IS the kill.
    # We still RENDER the Foundry PoC as a deliverable, but NEVER run forge — no validation, no
    # compile-repair. validation_status stays "skipped"; render_status records only whether the
    # deterministic renderer produced a *.t.sol. Forge no longer gates success.
    rres = render_only(rc.config, ri)
    # ACCEPTANCE HARDENING on the V40/ESBMC path (DeepSeek Pro arm, verifier.accept_gate_fuzz_runs).
    # On this path forge is never run -- ESBMC's accept IS the kill -- so a test can be accepted
    # whose property does not survive the OFFICIAL gate's régime (10000 runs, seed InvMut, the
    # gate's vm.assume reject budget).  MEASURED on rc_access_control__phishable__SmartFix__phishable
    # t2: all 4 accepted tests were origin=primary validation=skipped, and the gate returned
    # FAIL/FAIL with causes assume_budget and body_reverted, so the converted cell was never credited.
    # With the flag on, run that exact differential here and DECLINE the test if it does not hold;
    # the caller then keeps iterating instead of banking an un-gateable kill.  0 = official behaviour.
    if (int(getattr(rc.config.verifier, "accept_gate_fuzz_runs", 0) or 0) > 0
            and rres.render_status == "rendered" and rres.rendered_test):
        import tempfile as _tf
        _g = _pipeline._gate_recheck(rc.config, ri, rres.rendered_test,
                                     rres.test_name or "InvMutTest", _tf.mkdtemp(),
                                     _solc_version_for(rc), 1)
        if _g is not None:
            # test_code MUST be here: dataset/harness.py only persists a rejected attempt that
            # carries one, so without it this whole rejection class never reached the artifact.
            from invmut.render.validate import forge_diagnostic as _fd
            rec = {"difference_id": diff_id, "boundary": tjson.get("id"),
                   "outcome": "validation_error", "reason": _g.error,
                   "test_code": tcand.test_code,
                   "property_summary": tcand.property_summary,
                   "p_diagnostic": _fd(_g.p_outcome), "m_diagnostic": _fd(_g.m_outcome)}
            res.test_records.append(rec)
            if rc.attempt_sink:
                rc.attempt_sink(rec)
            rc.emit(event="test", difference_id=diff_id, outcome="validation_error", reason=_g.error)
            return None
    acc = AcceptedTest(tjson.get("id"), cand.unit_id, diff_id, tcand.property_summary,
                       rres.rendered_test, rres.render_status, rres.validation_status,
                       esbmc_test_source=bundle.get("esbmc_test_source"),
                       validation_error=rres.validation_error,
                       workspace_P_log=rres.workspace_P_log, workspace_M_log=rres.workspace_M_log,
                       mutated_unit_code=cand.mutated_unit_code, change_summary=cand.change_summary,
                       llm_test_source=tcand.test_code,
                       oracle_reach=_reach_verdict(vr),
                       confirmed_difference=confirmed_difference)
    res.accepted_tests.append(acc)
    rc.emit(event="accepted", difference_id=diff_id, render_status=rres.render_status,
            validation_status=rres.validation_status, validation_error=rres.validation_error)
    return acc


def build_run_context(config: Config, p_source: str, doc1: dict, client: LLMClient, spec: ModelSpec,
                      pragma: str = "pragma solidity ^0.8.0;", mutation_budget: Optional[int] = None,
                      test_attempts: Optional[int] = None) -> RunContext:
    """Budgets default to the SPEC values (config.max_mutation_attempts_per_goal=20,
    max_test_attempts_per_confirmed_difference=5). NO test/mutant-count caps (ERRORS #143)."""
    construction = prep.resolve_construction(config, p_source, "C") or {"kind": "no_arg", "value": "0"}
    prompt_source = None
    if getattr(config, "abi_block_in_test_prompt", False):
        block = prep.render_public_abi(config.solc_bin, p_source, "C")
        prompt_source = (block + "\n" + p_source) if block else None
    if getattr(config, "test_prompt_notes", False):
        from invmut.agents.prompts import TEST_NOTES
        prompt_source = TEST_NOTES + "\n" + (prompt_source or p_source)
    return RunContext(config=config, p_source=p_source, contract="C", doc1=doc1, client=client,
                      spec=spec, construction=construction, pragma=pragma, prompt_source=prompt_source,
                      mutation_budget=mutation_budget, test_attempts=test_attempts)
