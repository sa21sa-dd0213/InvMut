
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
    model: Optional[str] = None
    thinking: Optional[bool] = None
    mutant_model: Optional[str] = None


@dataclass
class RunContext:
    config: Config
    p_source: str
    contract: str
    doc1: dict
    client: LLMClient
    spec: ModelSpec = field(default_factory=ModelSpec)
    prompt_source: Optional[str] = None
    bug_source: Optional[str] = None
    patch_diff: Optional[str] = None
    import_path: str = "../src/C_under_test.sol"
    pragma: str = "pragma solidity ^0.8.0;"
    construction: dict = field(default_factory=lambda: {"kind": "no_arg", "value": "0"})
    mutation_budget: Optional[int] = None
    test_attempts: Optional[int] = None
    mutation_deadline: Optional[float] = None
    fuzz_deadline: Optional[float] = None
    test_deadline: Optional[float] = None
    replay_manifest: Optional[str] = None
    differential: bool = True
    property_focus: bool = True
    on_event: Optional[Callable[[dict], None]] = None
    attempt_sink: Optional[Callable[[dict], None]] = None
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
    validation_error: Optional[str] = None
    workspace_P_log: Optional[str] = None
    workspace_M_log: Optional[str] = None
    mutated_unit_code: Optional[str] = None
    change_summary: Optional[str] = None
    llm_test_source: Optional[str] = None
    origin: str = "primary"
    success_route: Optional[str] = None
    oracle_origin: Optional[str] = None
    kill_entrypoint: Optional[str] = None
    property_based_core: Optional[bool] = None
    standalone_replay: Optional[bool] = None
    oracle_reach: Optional[str] = None
    ce_id: Optional[str] = None
    source_difference_id: Optional[str] = None
    source_property_focus: Optional[str] = None
    confirmed_difference: Optional[dict] = None


@dataclass
class UnitResult:
    accepted_tests: list = field(default_factory=list)
    mutation_records: list = field(default_factory=list)
    mutant_sets: list = field(default_factory=list)
    test_records: list = field(default_factory=list)
    infra_aborted: bool = False
    infra_reason: Optional[str] = None
    mutation_deadline_hit: bool = False
    deferred_tests: list = field(default_factory=list)
    deferred_done: int = 0
    live_tests: list = field(default_factory=list)
    dropped_cands: list = field(default_factory=list)
    tokens: dict = field(default_factory=lambda: {"prompt": 0, "completion": 0, "reasoning": 0})
    inline_scored: list = field(default_factory=list)


def _vctx(rc: RunContext) -> ValidationContext:
    if rc._vctx is None:
        run_fn = make_run_fn(rc.config)
        run_fn_fast = make_run_fn(rc.config, timeout_s=rc.config.verifier.r2_unfocused_timeout_s)
        compile_fn = make_solc_compile_fn(rc.config)
        if (not rc.differential
                or getattr(getattr(rc.config, "ablation", None), "disable_r1", False)):
            baseline = r1mod.R1Run([], True, False, {}, [], "R1_DISABLED")
        else:
            baseline = r1mod.precompute_r1_baseline(rc.config, rc.p_source, rc.contract, run_fn)
        rc._vctx = ValidationContext(rc.config, rc.p_source, rc.contract, rc.doc1, run_fn, compile_fn,
                                     baseline, low_value_filter=False, run_fn_fast=run_fn_fast,
                                     focus_latched=baseline.timed_out)
    return rc._vctx


def _acc_tokens(res: UnitResult, attempt) -> None:
    for r in attempt.llm_results:
        res.tokens["prompt"] += r.prompt_tokens
        res.tokens["completion"] += r.completion_tokens
        res.tokens["reasoning"] += r.reasoning_tokens
        res.tokens["cached"] = res.tokens.get("cached", 0) + getattr(r, "prompt_cache_hit_tokens", 0)


def run_unit(rc: RunContext) -> UnitResult:
    res = UnitResult()
    _mutation_phase(rc, res)
    _deferred_test_phase(rc, res)
    _dropped_sweep_phase(rc, res)
    return res


def _dropped_sweep_phase(rc: RunContext, res: UnitResult) -> None:
    if not getattr(getattr(rc, "config", None), "resume_dropped_candidates", False) or not res.dropped_cands:
        return
    deadline = getattr(rc, "fuzz_deadline", None) or rc.mutation_deadline
    if deadline is None or time.time() >= deadline:
        return
    saved = rc.mutation_deadline
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
    order = list(range(res.deferred_done, len(res.deferred_tests)))
    if getattr(getattr(rc, "config", None), "deferred_test_boundary_interleave", False):
        seen = {}
        def _rank(k):
            b = ((res.deferred_tests[k][2].confirmed_difference or {}).get("boundary")) or ""
            seen[b] = seen.get(b, -1) + 1
            return seen[b]
        ranks = {k: _rank(k) for k in order}
        order.sort(key=lambda k: (ranks[k], k))
    live = []
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
    if getattr(rc, "replay_manifest", None):
        _run_unit_replay(rc, res)
        return
    if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
        res.mutation_deadline_hit = True
        return
    queues: list[tuple[dict, list]] = []
    for tjson in rc.doc1.get("targets", []):
        if not rc.property_focus:
            queues.append((tjson, [None]))
            continue
        cells = prep.cell_boundaries(tjson)
        if not cells:
            res.mutation_records.append({"target_id": tjson.get("id"), "outcome": "no_qualifying_boundary"})
            rc.emit(event="mutation", target_id=tjson.get("id"), outcome="no_qualifying_boundary")
            continue
        queues.append((tjson, list(cells)))
    def _apply_sord(qs, emit):
        if not getattr(rc.config, "mutation_state_writers_first", False):
            return qs
        def key(tc):
            units = (tc[0].get("scope") or {}).get("mutable_units") or []
            stmts = [s for u in units for s in (u.get("statements") or [])]
            kinds = {s.get("node_type") for s in stmts}
            trivial_getter = len(stmts) <= 1 and kinds <= {"RETURN"}
            return (1 if trivial_getter else 0, -len(stmts))
        qs = sorted(qs, key=key)
        if emit:
            rc.emit(event="cell_order", policy="state_writers_first",
                    order=[t.get("id") for t, _c in qs])
        return qs

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
        qs = sorted(qs, key=lambda tc: 0 if _has_xcall(tc[0]) else 1)
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

    _VIEW_RE = re.compile(r"\b(view|pure)\b")

    def _is_view_fn(name: str) -> bool:
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
    max_passes = max(1, int(getattr(rc.config, "mutation_passes_until_deadline", 1) or 1))
    for _pass in range(max_passes):
        if _pass:
            if rc.mutation_deadline is None:
                break
            if time.time() >= rc.mutation_deadline - 30:
                break
            queues = [(tjson, list(prep.cell_boundaries(tjson)))
                      for tjson in rc.doc1.get("targets", [])]
            queues = [(t, c) for t, c in queues if c]
            queues = _apply_sord(queues, emit=False)
            queues = _apply_xcall(queues, emit=False)
            queues = _apply_nonview(queues, emit=False)
            rc.emit(event="mutation_extra_pass", n=_pass + 1)
        order = []
        _qs = [(t, list(c)) for t, c in queues]
        while any(c for _, c in _qs):
            for t, c in _qs:
                if c:
                    order.append((t, c.pop(0)))
        _nw = int(getattr(rc.config, "mutation_prefetch_workers", 0) or 0)
        _ex = ThreadPoolExecutor(max_workers=_nw) if _nw > 0 else None
        _futs: dict = {}
        try:
            i = 0
            while i < len(order):
                if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
                    res.mutation_deadline_hit = True
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
    return Candidate(tjson.get("id"), uid, "replace",
                     "Restore the vulnerable pre-patch version of this unit (revert the fix's change).",
                     bug_unit)


def _cell_inputs(rc: RunContext, tjson: dict, x: str):
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
    target_id = tjson.get("id")
    inputs = _cell_inputs(rc, tjson, x)
    if inputs is None:
        res.mutation_records.append({"target_id": target_id, "boundary": x, "outcome": "no_editable_unit"})
        rc.emit(event="mutation", target_id=target_id, boundary=x, outcome="no_editable_unit")
        return
    editable, goal, fewshot, fewshot_on = inputs
    rc.emit(event="fewshot", target_id=target_id, boundary=x,
            enabled=fewshot_on, attached=bool(fewshot), chars=len(fewshot or ""))
    attempt = prefetched if prefetched is not None else _propose_cell(rc, x, inputs)
    _acc_tokens(res, attempt)
    res.mutant_sets.append({
        "target_id": target_id, "boundary": x, "parse_ok": attempt.parse_ok,
        "candidates": [{"unit_id": c.unit_id, "operation": c.operation,
                        "change_summary": c.change_summary, "mutated_unit_code": c.mutated_unit_code}
                       for c in attempt.candidates]})
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
            cands = [da] + cands
    _eval_candidates(rc, tjson, x, cands, res)


def _eval_candidates(rc: RunContext, tjson: dict, x: str, cands: list, res: UnitResult) -> None:
    target_id = tjson.get("id")
    vctx = _vctx(rc)
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
    r2_spent = 0.0
    _workers = int(getattr(rc.config, "r2_parallel_workers", 0) or 0)
    if _workers > 1 and not pack_plan and len(cands) > 1:
        from concurrent.futures import ThreadPoolExecutor
        _t0 = time.time()
        _deadline = rc.mutation_deadline
        _results: dict[int, object] = {}
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
                except Exception:
                    if not _f.cancel():
                        _results[_i] = _f.result()
        if _saved_fns is not None:
            vctx.run_fn, vctx.run_fn_fast = _saved_fns
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
    target_id = tjson.get("id")
    cd = result.confirmed_difference or {}
    stmt_id = cd.get("edited_statement_id") \
        or (result.memory_record.get("stage_detail", {}) or {}).get("edited_statement_id")
    _reason = (result.memory_record.get("stage_detail", {}) or {}).get("reason")
    res.mutation_records.append({"target_id": target_id, "boundary": x, "unit_id": cand.unit_id,
                                 "outcome": result.outcome, "statement_id": stmt_id, "reason": _reason})
    rc.emit(event="mutation", target_id=target_id, boundary=x, outcome=result.outcome, reason=_reason)
    if result.outcome == Outcome.VISIBLE_DIFFERENCE and (result.confirmed_difference
                                                      or not rc.differential):
        result.confirmed_difference.setdefault("boundary", x)
        if getattr(rc.config, "deferred_test_phase", False):
            res.deferred_tests.append((tjson, cand, result))
            rc.emit(event="test_deferred", difference_id=(result.confirmed_difference or {}).get("confirmed_difference_id"),
                    target_id=target_id, boundary=x)
        else:
            _run_test_loop(rc, res, tjson, cand, result)


def _read_mutant_manifest(path: str) -> list:
    cells = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                cells.append(json.loads(line))
    return cells


def _run_unit_replay(rc: RunContext, res: UnitResult) -> None:
    by_id = {t.get("id"): t for t in rc.doc1.get("targets", [])}
    for cell in _read_mutant_manifest(rc.replay_manifest):
        if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
            res.mutation_deadline_hit = True
            return
        tid, x = cell.get("target_id"), cell.get("boundary")
        res.mutant_sets.append(cell)
        tjson = by_id.get(tid)
        if tjson is None:
            res.mutation_records.append({"target_id": tid, "boundary": x, "outcome": "replay_target_missing"})
            rc.emit(event="mutation", target_id=tid, boundary=x, outcome="replay_target_missing")
            continue
        if not cell.get("parse_ok", True):
            res.mutation_records.append({"target_id": tid, "boundary": x, "outcome": "json_parse_error"})
            rc.emit(event="mutation", target_id=tid, boundary=x, outcome="json_parse_error")
            continue
        cands = [Candidate(tid, c["unit_id"], c["operation"], c["change_summary"], c["mutated_unit_code"])
                 for c in cell.get("candidates", [])]
        try:
            _eval_candidates(rc, tjson, x, cands, res)
        except LLMInfraError as e:
            res.infra_aborted = True
            res.infra_reason = e.kind
            rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
            return


def _run_test_loop(rc: RunContext, res: UnitResult, tjson: dict, cand: Candidate,
                   mut_result) -> Optional[AcceptedTest]:
    g = _test_loop_gen(rc, res, tjson, cand, mut_result)
    try:
        while True:
            next(g)
    except StopIteration as e:
        return e.value


def _test_loop_gen(rc: RunContext, res: UnitResult, tjson: dict, cand: Candidate, mut_result):
    cd = mut_result.confirmed_difference or {}
    diff_id = cd.get("confirmed_difference_id") or _vctx(rc).next_confirmed_id()
    tm = TestMemory()
    unit_record = _unit_record(tjson, cand.unit_id)
    s1, m_source = st.stage1_build_compile(cand, rc.p_source, unit_record, _vctx(rc).compile_fn)
    if not s1.passed:
        return None
    _replay_branch.run_replay_branch(rc, res, tjson, cand, diff_id, m_source, cd)
    if getattr(rc.config, "replay_only", False):
        return None
    change = cand.change_summary
    difference = cd.get("rendered_difference", "")
    call_sequence = cd.get("call_sequence") or []
    category = cd.get("difference_kind")
    during_call = bool(cd.get("during_call"))
    observer_getter = cd.get("observer_getter")
    budget = rc.test_attempts or rc.config.max_test_attempts_per_confirmed_difference
    attempt = None
    dead_unknowns = 0
    assert_locked = False
    locked_assert = None
    for i in range(budget):
        if i:
            yield i
        _td = getattr(rc, "test_deadline", None)
        if _td is not None and time.time() >= _td:
            rc.emit(event="test", difference_id=diff_id, outcome="abandoned", reason="test_phase_deadline")
            break
        if attempt is None:
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
        rec = {"difference_id": diff_id, "outcome": outcome, "reason": reason,
               "test_code": tcand.test_code, "property_summary": tcand.property_summary,
               "compiler_error": vr.get("compiler_error") or None,
               "verifier": {k: (vr.get("verifier") or {}).get(k) for k in
                            ("break_result", "break_failure_location", "break_violated_property", "hold_result",
                             "hold_failure_location", "hold_violated_property", "break_base_case_exhausted")}}
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
            continue
        lim = getattr(rc.config, "dead_difference_unknown_limit", 0) or 0
        if lim > 0:
            if reason == "m_no_cex_within_bound" and (vr.get("verifier") or {}).get("break_base_case_exhausted"):
                dead_unknowns += 1
            elif (vr.get("verifier") or {}).get("break_result"):
                dead_unknowns = 0
            if dead_unknowns >= lim:
                res.test_records.append({"difference_id": diff_id, "outcome": "abandoned", "reason": "dead_difference"})
                rc.emit(event="test", difference_id=diff_id, outcome="abandoned", reason="dead_difference")
                break
        if getattr(rc.config, "boundary_guard_trap_stop", False) and reason == "non_target_failure_on_modified":
            _loc = (vr.get("verifier") or {}).get("break_failure_location") or {}
            _fn = _loc.get("function") or ""
            _b = (cd.get("boundary") or getattr(cand, "boundary", None) or "").split("(")[0]
            if _b and (_fn == _b or _fn.startswith(_b + "_")):
                res.test_records.append({"difference_id": diff_id, "outcome": "abandoned",
                                         "reason": f"boundary_guard_trap:{_fn}"})
                rc.emit(event="test", difference_id=diff_id, outcome="abandoned", reason=f"boundary_guard_trap:{_fn}")
                break

        cc = rc.prompt_source or rc.p_source
        common = dict(max_json_retries=rc.config.max_json_retries_per_call,
                      model=rc.spec.model, thinking=rc.spec.thinking)
        if outcome == "fails_on_original":
            if not assert_locked:
                assert_locked = True
                locked_assert = _extract_assert(tcand.test_code)
            cex = _trim_cex((vr.get("verifier") or {}).get("hold_counterexample"))
            attempt = TA.reflect_test_require(rc.client, contract_code=cc, contract_name=rc.contract,
                                              test_code=tcand.test_code, test_memory=tm.render(),
                                              mode="tighten", counterexample=cex,
                                              allow_setup=getattr(rc.config, "precise_test_diags", False), **common)
        elif assert_locked:
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
    if not raw:
        return "(no counterexample available)"
    raw = raw.strip()
    return raw if len(raw) <= limit else "...(truncated)...\n" + raw[-limit:]


def _test_diag(outcome: str, reason: Optional[str], vr: dict, precise: bool = False) -> Optional[dict]:
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
                return {"diag_kind": "non_target_failure",
                        "FAIL_WHERE": f"an assert inside c's function `{fn}` (not in your test). The checker cannot pass that guard, so any test calling through `{fn}` is undecidable: drive the difference through another public entry if one exists, otherwise use a different observation"}
            claim = (v.get("break_violated_property") or "").replace("\n", " | ")
            where = f"line {loc.get('line')} of your own test body" if loc.get("line") else "a statement of your own test body"
            return {"diag_kind": "non_target_failure",
                    "FAIL_WHERE": where + (f" (checker claim: {claim[:300]})" if claim else "")}
    if r in ("did_not_compile", "harness_compile_failed"):
        return {"diag_kind": "did_not_compile", "COMPILER_ERROR": (vr.get("compiler_error") or r)[:1500]}
    if r in ("malformed_test",):
        fr = (vr.get("compiler_error") or "") if precise else ""
        return {"diag_kind": "malformed_test", "FORM_REASON": fr or "a call on c was not a top-level statement"}
    if r == "uses_msg_value":
        return {"diag_kind": "uses_msg_value"}
    if r in ("construction_unknown", "construction_value_unknown"):
        return {"diag_kind": "wrong_form", "FORM_REASON": r}
    if outcome == "fails_on_original" or r == "fails_on_original":
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
    from invmut.orchestrate.concrete import _solc_version
    return _solc_version(rc.config)


def _reach_verdict(vr) -> Optional[str]:
    r = (vr.get("verifier") or {}).get("reach_result")
    return {"reachable": "proved"}.get(r, r)


def _render_accepted(rc, res, tjson, cand, diff_id, m_source, tcand, vr, *,
                     confirmed_difference=None) -> AcceptedTest:
    bundle = vr["accepted_bundle"]
    ri = RenderInput(bundle=bundle, c_scope_source=rc.p_source, m_scope_source=m_source,
                     import_path=rc.import_path, pragma=rc.pragma, contract_name=rc.contract)
    rres = render_only(rc.config, ri)
    if (int(getattr(rc.config.verifier, "accept_gate_fuzz_runs", 0) or 0) > 0
            and rres.render_status == "rendered" and rres.rendered_test):
        import tempfile as _tf
        _g = _pipeline._gate_recheck(rc.config, ri, rres.rendered_test,
                                     rres.test_name or "InvMutTest", _tf.mkdtemp(),
                                     _solc_version_for(rc), 1)
        if _g is not None:
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
