
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

_DIFF_ASSERT = re.compile(
    r"assert\((?:__invmut_snapP == __invmut_snapM && )?"
    r"__invmut_(?:vP\d*|revP) == __invmut_(?:vM\d*|revM)"
    r"(?: && __invmut_(?:arg\d+|key\d+|value) == __invmut_(?:arg\d+|key\d+|value))*\);")


def _boundary_reachable(config: Config, harness_src: str, run_fn: RunFn,
                        focus: Optional[str] = None) -> Optional[bool]:
    live = _DIFF_ASSERT.sub("assert(false);", harness_src)
    if "assert(false);" not in live:
        return None
    with temp_sol(live, prefix="invmut_live_") as path:
        run = run_fn(cmd.build_r2_command(config, path, focus_function=focus))
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    if v.verdict == parse.FAILED:
        return True
    if v.verdict == parse.UNKNOWN and v.bound_exhausted:
        return False
    return None


def public_writer_names(target_json: dict, entry_names: set[str]) -> list[str]:
    scope = target_json.get("scope", {})
    names: list[str] = []
    for u in scope.get("mutable_units", []) + scope.get("dependency_units", []):
        if u.get("inclusion_reason") == "writer_of_target_state" and u.get("kind") == "function":
            nm = (u.get("signature") or "").split("(")[0]
            if nm in entry_names and nm not in names:
                names.append(nm)
    return names


def _public_writer_names(target_json: dict, entry_names: set[str]) -> list[str]:
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
    parts = assemble_pair(config.solc_bin, p_source, m_source, contract)
    if isinstance(parts, AssemblyError):
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {"reason": parts.reason, "infra": not parts.unsupported})

    htarget = doc1_target_to_harness_target(target_json, parts.p_info.entries, pinned_boundary)
    if isinstance(htarget, AssemblyError):
        return StageResult("stage5", Outcome.INCONCLUSIVE, {"reason": htarget.reason})

    base_meta = {"ref_name": parts.ref_name, "mut_name": parts.mut_name}

    wide_targets: list[HarnessTarget] = []
    if getattr(config.verifier, "r2_wide_observation", False):
        for other in (all_targets or []):
            if other is target_json or other.get("id") == target_json.get("id"):
                continue
            ht = doc1_target_to_harness_target(other, parts.p_info.entries, None)
            if isinstance(ht, HarnessTarget):
                wide_targets.append(ht)

    if htarget.category == "state":
        return _stage5_state(config, parts, htarget, base_meta, run_fn, compile_fn, focus_mode,
                             run_fn_fast, wide_targets)

    x = build_r2_file(
        parts,
        htarget,
        record_witness_values=bool(getattr(config.verifier, "r2_record_witness_values", False)),
        trace_slot_count=int(getattr(config.verifier, "r2_solidity_max_tx", 2) or 2),
        record_post_balance=bool(getattr(config.verifier, "r2_record_post_balance", False)),
        extra_observation_targets=wide_targets,
        witness_live_copies=bool(getattr(config.verifier, "r2_witness_live_copies", False)),
    )
    if isinstance(x, AssemblyError):
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {"reason": x.reason, "report_back": x.unsupported})

    comp = compile_fn(x)
    if not comp.ok:
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {"reason": "harness_compile_failed", "infra": True,
                            "compiler_error": comp.diagnostics})

    meta = {**base_meta, "harness_source": x}

    if focus_mode:
        esc = _focused_escalation(config, parts, htarget, x, meta, run_fn)
        if esc is not None:
            return esc

    with temp_sol(x, prefix="invmut_r2_") as path:
        argv = cmd.build_r2_command(config, path)
        run = (run_fn_fast or run_fn)(argv) if not focus_mode else run_fn(argv)
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    outcome = parse.r2_outcome(v)

    base = {
        **meta,
        "r2_command": argv, "verdict": v.verdict, "r2_outcome": outcome,
        "stdout": run.stdout, "stderr": run.stderr,
    }
    if outcome == "visible_difference":
        return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
            **base, "source_stage": "R2",
            "difference_kind": htarget.category,
            "has_trace": v.has_funccall_trace,
        })
    if outcome in ("no_difference", "no_difference_within_bound"):
        reachable = _boundary_reachable(config, x, run_fn)
        if reachable is False:
            return StageResult("stage5", Outcome.INCONCLUSIVE,
                               {**base, "reason": "boundary_unreachable", "infra": False})
        return StageResult("stage5", Outcome.NO_DIFFERENCE, {**base, "boundary_reachable": reachable})
    esc = _focused_escalation(config, parts, htarget, x, meta, run_fn)
    if esc is not None:
        return esc
    return StageResult("stage5", Outcome.INCONCLUSIVE, {**base, "infra": False})


def _run_one(config: Config, x: str, run_fn: RunFn, compile_fn: CompileFn,
             focus: Optional[str] = None):
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
    writers = list(htarget.writer_names) or []
    if not writers:
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {**base_meta, "reason": "no_state_writer", "infra": False})

    attempts: list[dict] = []
    nonconverged: list[tuple[str, str]] = []
    first_x: Optional[str] = None
    for w in writers:
        x = build_r2_file(
            parts,
            replace(htarget, tb_writer=w),
            record_witness_values=bool(getattr(config.verifier, "r2_record_witness_values", False)),
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

    _rfb = run_fn
    if nonconverged and run_fn_fast is not None and getattr(config, "r2_fast_revert_retry_when_nonconverged", False):
        _rfb = run_fn_fast
    rdiff = _revert_fallback(config, parts, htarget, _rfb, wide_targets)
    if rdiff is not None:
        return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
            **base_meta, "source_stage": "R2", "difference_kind": "revert",
            "note": "revert_guard_change_on_state_target", "state_attempts": attempts, **rdiff})

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
            rp = _revert_probe(config, parts, w, run_fn, focus=focus, wide_targets=wide_targets)
            if rp is not None:
                return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                    **base_meta, "source_stage": "R2", "difference_kind": "revert",
                    "note": "revert_guard_change_on_state_target", "focus_function": focus,
                    "focus_escalation": True, "state_attempts": attempts, **rp})

    if nonconverged:
        return StageResult("stage5", Outcome.INCONCLUSIVE,
                           {**base_meta, "reason": "focused_no_difference", "infra": False,
                            "state_attempts": attempts})

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
    names = boundary_wrapper_names(parts, htarget)
    if not names:
        return None
    attempts = []
    for wname in names:
        bare = wname.split("_", 1)[1]
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
        if htarget.category == "state":
            rdiff = _revert_probe(config, parts, bare, run_fn, focus=wname)
            if rdiff is not None:
                return StageResult("stage5", Outcome.VISIBLE_DIFFERENCE, {
                    **base, "source_stage": "R2", "difference_kind": "revert",
                    "note": "revert_guard_change_on_state_target", "focus_function": wname,
                    "focus_escalation": True, "focus_attempts": attempts, **rdiff})
    if getattr(config.verifier, "focused_vacuity_probe", False) and attempts:
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
    rt = HarnessTarget(category="revert", fn_name=writer)
    rx = build_r2_file(
        parts,
        rt,
        record_witness_values=bool(getattr(config.verifier, "r2_record_witness_values", False)),
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
    for writer in htarget.writer_names:
        r = _revert_probe(config, parts, writer, run_fn, wide_targets=wide_targets)
        if r is not None:
            return r
    return None
