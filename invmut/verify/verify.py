"""Doc 3 — test-verification orchestrator (§5 run, §6 oracle, §7 mapping, §11 output).

verify_test assembles the two programs, proves the property on P (Direction 1) and — only if that
proves — refutes it on M (Direction 2), then maps to an outcome and emits the §11 object. A
SOLVER_ABORT triggers the one `--cvc5` retry (§5). The §8 fallback narrowing and §9 payable funding
are layered on in Phase 3c.
"""

from __future__ import annotations

import re

from typing import Optional

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.esbmc import parse
from invmut.esbmc.runner import RunFn, make_run_fn, temp_sol
from invmut.mutation.static_stages import CompileFn
from invmut.verify import oracle as o
from invmut.verify import outcome as oc
from invmut.verify.assemble import Assembly, assemble
from invmut.verify.canonical import ShapeError


_BUMP_MAX_K = 20   # §5 depth bump on non-convergence (default max_k_step is 10 in config)


def _run_direction(config: Config, program: str, test_name: str, target_line: int,
                   body_range: tuple[int, int], run_fn: RunFn, hold: bool) -> tuple[o.DirectionResult, str, str]:
    """Run one direction with the §5 retries: one `--cvc5` on a solver abort, then one `--max-k-step`
    bump on a non-convergent UNKNOWN. Returns (result, cmd, raw_output)."""
    builder = cmd.build_doc3_hold_command if hold else cmd.build_doc3_break_command

    def _go(argv):
        run = run_fn(argv)
        dr = o.direction_result(run.stdout, run.stderr, run.returncode, run.timed_out,
                                target_line, body_range)
        return dr, run.stdout + "\n" + run.stderr

    with temp_sol(program, prefix="invmut_d3p_") as path:
        argv = builder(config, path, test_name)
        dr, raw = _go(argv)
        if dr.result == o.SOLVER_ABORT:
            argv = cmd.with_cvc5(argv)
            dr, raw = _go(argv)
        if dr.result == o.UNKNOWN:   # §5: raise the bound once before concluding non-convergence
            argv = builder(config, path, test_name, max_k_step=_BUMP_MAX_K)
            dr, raw = _go(argv)
    return dr, " ".join(argv), raw


def _reach_on_p(config: Config, asm, run_fn: RunFn) -> tuple[str, str]:
    """Reach(P,T): does any execution of the test on P actually REACH its oracle?

    "Passes on P" is satisfied vacuously by a test whose assertion never executes, so acceptance
    without this premise is missing a condition. The query is the paper's: the same assembled P
    program with `assert(false)` placed at the oracle site, run in the refutation direction. A
    counterexample IS the reaching execution; a proof says the site is never reached and the test's
    pass on P says nothing.

    The probe is INSERTED before the assertion rather than replacing it, so a multi-line assertion
    cannot be broken in half; the inserted line becomes the target claim and the body range grows
    by exactly one line.

    Returns (verdict, command) with verdict in {"reachable", "unreachable", "unreachable_bounded",
    "undecided"}.
    """
    lines = asm.p_program.splitlines()
    i = asm.p_assert_line - 1
    if not (0 <= i < len(lines)):
        return "undecided", ""
    indent = re.match(r"[ \t]*", lines[i]).group(0)
    lines.insert(i, f"{indent}assert(false);")
    lo, hi = asm.p_body_range
    dr, cmd_text, raw = _run_direction(config, "\n".join(lines), asm.test_name,
                                       asm.p_assert_line, (lo, hi + 1), run_fn, hold=False)
    if dr.result == o.REFUTED_AT_TARGET:
        return "reachable", cmd_text
    if dr.result == o.PROVED:
        return "unreachable", cmd_text
    # The refutation direction runs --incremental-bmc, which never PROVES; its way of saying "no
    # execution reaches this" is to exhaust the base case with no counterexample. That is the same
    # signal _run_and_map already reads as a dead path (break_base_case_exhausted), so read it the
    # same way here -- but keep the name honest: it holds within the bound.
    if dr.result == o.UNKNOWN and "No bug has been found in the base case" in (raw or ""):
        return "unreachable_bounded", cmd_text
    return "undecided", cmd_text


def _callback_entered(trace: str) -> bool:
    """§10: did the M counterexample's funccall trace re-enter receive()/fallback()? ESBMC names
    them `@F@receive`/`@F@fallback` in the trace."""
    return "@F@receive" in trace or "@F@fallback" in trace


def _body_reentered(trace: str, body_name: str) -> bool:
    """The test's PUBLIC body appears MORE THAN ONCE in the trace — a re-entrant call into it (the
    §10 spurious case). A dormant `receive()` (declared only to accept ETH) does not re-enter the
    body, so its normal refutation is NOT spurious (codex C2)."""
    return trace.count(f"@F@{body_name}") > 1


def _is_spurious_callback(trace: str, body_name: str) -> bool:
    """§10: a refutation is spurious iff a callback re-entered the test's public body and the trace
    did NOT enter receive()/fallback(). A normal refutation (no re-entry) is accepted even when the
    test happens to declare a receive()."""
    return _body_reentered(trace, body_name) and not _callback_entered(trace)


def _run_and_map(config: Config, asm: Assembly, witness: Optional[dict], run_fn: RunFn) -> dict:
    """Break-first (V40): refute on M FIRST, prove on P only if M was refuted. Map to the §11 object
    for ONE assembly (no fallback). `hold_counterexample` carries P's violation trace so the require-only
    reflection (phase B) can show the model the inputs on which P fails its own rule."""
    # DeepSeek Pro arm 2026-09-07 (config.test_break_timeout_s > 0): the BREAK run on M gets its own shorter cap.
    # Every accepted DeepSeek Pro test so far was refuted on M in 2-7 s; a 60 s break timeout (plus the 20-step
    # bump) made one dead-path attempt cost 90 s of a ~200 s test phase. The HOLD proof keeps the full cap.
    _bt = int(getattr(config, "test_break_timeout_s", 0) or 0)
    _run_break = make_run_fn(config, timeout_s=_bt) if _bt > 0 else run_fn
    dM, break_cmd, m_raw = _run_direction(config, asm.m_program, asm.test_name, asm.m_assert_line,
                                          asm.m_body_range, _run_break, hold=False)
    break_loc = dM.location.as_dict() if dM.location else None
    # §10 reentrancy: reject ONLY a refutation that rests on a SPURIOUS public-body re-entry the AST
    # callback over-approximation allows (codex F4); a dormant receive()/normal refutation is accepted.
    if asm.has_callback and dM.result == o.REFUTED_AT_TARGET \
            and _is_spurious_callback(m_raw, asm.body_name):
        out = _result(oc.INCONCLUSIVE, "spurious_callback", asm)
        out["verifier"] = {"hold_command": None, "hold_result": None, "hold_failure_location": None,
                           "hold_counterexample": None, "break_command": break_cmd,
                           "break_result": dM.result, "break_failure_location": break_loc}
        return out

    dP, hold_cmd, p_raw, p_loc = None, None, None, None
    if oc.should_run_hold(dM):
        dP, hold_cmd, p_raw = _run_direction(config, asm.p_program, asm.test_name, asm.p_assert_line,
                                             asm.p_body_range, run_fn, hold=True)
        p_loc = dP.location.as_dict() if dP.location else None

    outcome, reason = oc.map_outcome(dM, dP)
    out = _result(outcome, reason, asm)
    out["verifier"] = {
        "hold_command": hold_cmd, "hold_result": dP.result if dP else None,
        "hold_failure_location": p_loc,
        "hold_counterexample": (p_raw if outcome == oc.FAILS_ON_ORIGINAL else None),
        "break_command": break_cmd, "break_result": dM.result,
        "break_failure_location": break_loc,
        # incremental-bmc reached its bound with no counterexample in the base case: the assert is
        # unreachable/equal on every path from deployment (state-conditioned difference), not a depth issue
        "break_base_case_exhausted": bool(dM.result == o.UNKNOWN and "No bug has been found in the base case" in (m_raw or "")),
        # the checker's own claim text for an off-target failure (overflow / division / c's require...),
        # for the precise non_target_failure diagnosis (DeepSeek Pro arm 2026-09-07)
        "break_violated_property": _violated_block(m_raw),
        "hold_violated_property": _violated_block(p_raw),
    }
    if outcome == oc.ACCEPTED and getattr(config, "require_reachable_oracle", False):
        # The third premise, run only on a test that already holds on P and breaks on M, so it costs
        # one query per ACCEPTED test rather than one per attempt.
        verdict, reach_cmd = _reach_on_p(config, asm, run_fn)
        out["verifier"]["reach_result"] = verdict
        out["verifier"]["reach_command"] = reach_cmd
        if verdict.startswith("unreachable") or (verdict == "undecided"
                                                 and getattr(config, "reject_undecided_reach", False)):
            # a vacuous pass on P: the test states a rule the fix never executes
            return _result(oc.INCONCLUSIVE, f"oracle_{verdict}_on_P", asm) | {
                "verifier": out["verifier"]}
    if outcome == oc.ACCEPTED:
        out["accepted_bundle"] = _accepted_bundle(asm, witness)
    return out


def _narrowing_ladder(asm: Assembly, witness: Optional[dict]) -> list[list[str]]:
    """§8 narrowing levels (each a list of require conditions). Level 1: a generous range on the
    first integer param (keeps the witness). Level 2: pin every param to its witness value."""
    levels = []
    int_params = [(t, n) for t, n in (asm.params or []) if t.startswith(("uint", "int"))]
    if int_params:
        levels.append([f"{int_params[0][1]} <= 1000000000"])
    wp = (witness or {}).get("params") or {}
    if wp:
        pins = [f"{n} == {wp[n]}" for _, n in (asm.params or []) if n in wp]
        if pins:
            levels.append(pins)
    return levels


def verify_test(
    config: Config, p_source: str, m_source: str, t_source: str,
    construction: dict, witness: Optional[dict] = None,
    run_fn: Optional[RunFn] = None, compile_fn: Optional[CompileFn] = None,
) -> dict:
    """Verify one candidate test (Doc 3 §11 object). On a non-convergent proof on P, run the §8
    narrowing fallback (range require → witness pin) and re-verify; a test accepted via the
    fallback is `accepted` with `narrowed = true`."""
    run_fn = run_fn or make_run_fn(config)
    if getattr(config, "rename_reserved_identifiers", False):
        from invmut.render.foundry import rename_reserved_identifiers
        try:
            t_source, _n = rename_reserved_identifiers(t_source)
        except Exception:
            pass
    if getattr(config, "lowlevel_call_rewrite", False):
        # `(bool ok,) = address(c).call(abi.encode..(f, args))` -> `try c.f(args)`; see
        # invmut/render/foundry.py:rewrite_lowlevel_handle_calls. Off = published behaviour.
        from invmut.render.foundry import rewrite_lowlevel_handle_calls
        try:
            t_source, _n = rewrite_lowlevel_handle_calls(t_source)
        except Exception:
            pass

    def _assemble(extra):
        asm = assemble(config.solc_bin, p_source, m_source, t_source, construction, witness, extra,
                       include_decls=bool(getattr(config, "esbmc_harness_construction_decls", False)))
        if isinstance(asm, ShapeError):
            return asm
        if compile_fn is not None:
            for prog in (asm.p_program, asm.m_program):
                cr = compile_fn(prog)
                if not cr.ok:
                    # carry the real solc diagnostic so the reflection shows the compile error (codex)
                    return ShapeError("harness_compile_failed", detail=(cr.diagnostics or "")[:1500])
        return asm

    asm = _assemble(())
    if isinstance(asm, ShapeError):
        return _result(oc.INCONCLUSIVE, asm.reason, detail=asm.detail)
    if getattr(config, "render_param_only", False) and not asm.params:
        # config.render_param_only: the form check requires a parameterised input.  Rejecting HERE, not
        # at render time, lets the reflection loop see why; otherwise the proof is spent on a test the
        # renderer then refuses (MEASURED: fw14 smoke, old_blockhash_2round t1 D0001 -- accepted, then
        # render_error, 0 booked).
        return _result(oc.INCONCLUSIVE, "malformed_test",
                       detail="the public function declares no parameters, so it checks one fixed input; "
                              "declare at least one parameter that the property ranges over")

    out = _run_and_map(config, asm, witness, run_fn)
    if out["outcome"] == oc.ACCEPTED or out["reason"] != "nonconverging_proof":
        return out

    # §8 fallback — only on Direction-1 nonconverging_proof
    for level in _narrowing_ladder(asm, witness):
        asm2 = _assemble(level)
        if isinstance(asm2, ShapeError):
            continue
        out2 = _run_and_map(config, asm2, witness, run_fn)
        if out2["outcome"] == oc.ACCEPTED:
            out2["accepted_bundle"]["narrowed"] = True
            out2["accepted_bundle"]["narrowing_requires"] = level
            return out2
    return out  # stays inconclusive(nonconverging_proof)


def _hold_and_reach_on_p(config: Config, asm: Assembly, run_fn: RunFn) -> dict:
    """The P-only obligations for one assembly: Hold(P,T) then, on a proof, Reach(P,T)."""
    import time as _t
    t0 = _t.time()
    dP, hold_cmd, p_raw = _run_direction(config, asm.p_program, asm.test_name, asm.p_assert_line,
                                         asm.p_body_range, run_fn, hold=True)
    hold_s = round(_t.time() - t0, 1)
    p_loc = dP.location.as_dict() if dP.location else None
    if dP.result == o.PROVED:
        outcome, reason = oc.ACCEPTED, None
    elif dP.result == o.REFUTED_AT_TARGET:
        outcome, reason = oc.FAILS_ON_ORIGINAL, None
    elif dP.result == o.FAILED_OFF_TARGET:
        outcome, reason = oc.INCONCLUSIVE, "non_target_failure_on_original"
    elif dP.result == o.TIMEOUT:
        outcome, reason = oc.INCONCLUSIVE, "timeout"
    elif dP.result == o.UNKNOWN:
        outcome, reason = oc.INCONCLUSIVE, "nonconverging_proof"
    elif dP.result == o.SOLVER_ABORT:
        outcome, reason = oc.INCONCLUSIVE, "solver_abort"
    else:
        outcome, reason = oc.INCONCLUSIVE, "verifier_error"
    out = _result(outcome, reason, asm)
    out["verifier"] = {
        "hold_command": hold_cmd, "hold_result": dP.result, "hold_failure_location": p_loc,
        "hold_counterexample": (p_raw if outcome == oc.FAILS_ON_ORIGINAL else None),
        "hold_violated_property": _violated_block(p_raw), "hold_s": hold_s,
        "break_result": None,
    }
    if outcome == oc.ACCEPTED and getattr(config, "require_reachable_oracle", False):
        t1 = _t.time()
        verdict, reach_cmd = _reach_on_p(config, asm, run_fn)
        out["verifier"].update(reach_result=verdict, reach_command=reach_cmd,
                               reach_s=round(_t.time() - t1, 1))
        if verdict.startswith("unreachable") or (verdict == "undecided"
                                                 and getattr(config, "reject_undecided_reach", False)):
            return _result(oc.INCONCLUSIVE, f"oracle_{verdict}_on_P", asm) | {"verifier": out["verifier"]}
    if outcome == oc.ACCEPTED:
        out["accepted_bundle"] = _accepted_bundle(asm, None)
    return out


def verify_test_on_p(config: Config, p_source: str, t_source: str, construction: dict,
                     run_fn: Optional[RunFn] = None, compile_fn: Optional[CompileFn] = None) -> dict:
    """P-only verification for the arms that have no mutant (run_mode direct_pbt / no_mg): the SAME
    assembly, shape checks and ESBMC commands as verify_test, but only the obligations that do not need
    M -- Hold(P,T) (prove the property on P) and, on a proof, Reach(P,T) (the oracle site is reached by
    some execution on P). There is no Break direction, so there is no break-first ordering, no spurious
    callback check and no assert lock. The §8 narrowing ladder applies to a non-convergent proof, with
    no witness (level 1 only). Outcomes: accepted / fails_on_original / inconclusive(<reason>)."""
    run_fn = run_fn or make_run_fn(config)
    if getattr(config, "rename_reserved_identifiers", False):
        from invmut.render.foundry import rename_reserved_identifiers
        try:
            t_source, _n = rename_reserved_identifiers(t_source)
        except Exception:
            pass
    if getattr(config, "lowlevel_call_rewrite", False):
        from invmut.render.foundry import rewrite_lowlevel_handle_calls
        try:
            t_source, _n = rewrite_lowlevel_handle_calls(t_source)
        except Exception:
            pass

    def _assemble(extra):
        # M := P. Only asm.p_program is ever run, so only it is compiled.
        asm = assemble(config.solc_bin, p_source, p_source, t_source, construction, None, extra,
                       include_decls=bool(getattr(config, "esbmc_harness_construction_decls", False)))
        if isinstance(asm, ShapeError):
            return asm
        if compile_fn is not None:
            cr = compile_fn(asm.p_program)
            if not cr.ok:
                return ShapeError("harness_compile_failed", detail=(cr.diagnostics or "")[:1500])
        return asm

    asm = _assemble(())
    if isinstance(asm, ShapeError):
        return _result(oc.INCONCLUSIVE, asm.reason, detail=asm.detail)
    if getattr(config, "render_param_only", False) and not asm.params:
        return _result(oc.INCONCLUSIVE, "malformed_test",
                       detail="the public function declares no parameters, so it checks one fixed input; "
                              "declare at least one parameter that the property ranges over")
    out = _hold_and_reach_on_p(config, asm, run_fn)
    if out["outcome"] == oc.ACCEPTED or out["reason"] != "nonconverging_proof":
        return out
    for level in _narrowing_ladder(asm, None):
        asm2 = _assemble(level)
        if isinstance(asm2, ShapeError):
            continue
        out2 = _hold_and_reach_on_p(config, asm2, run_fn)
        if out2["outcome"] == oc.ACCEPTED:
            out2["accepted_bundle"]["narrowed"] = True
            out2["accepted_bundle"]["narrowing_requires"] = level
            return out2
    return out


def _violated_block(raw: Optional[str], n: int = 4) -> Optional[str]:
    """First n non-empty lines after ESBMC's `Violated property:` header (location + claim), or None."""
    if not raw:
        return None
    i = raw.find("Violated property:")
    if i < 0:
        return None
    lines = [ln.strip() for ln in raw[i + len("Violated property:"):].splitlines() if ln.strip()]
    return "\n".join(lines[:n]) or None


def _result(outcome: str, reason: Optional[str], asm: Optional[Assembly] = None,
            detail: str = "") -> dict:
    d = {
        "outcome": outcome, "reason": reason,
        "compiler_error": detail,   # solc diagnostic for did_not_compile / harness_compile_failed (codex)
        "contract_name": "C",
        "original_test_name": "InvMutTest",
        "verification_test_name": asm.test_name if asm else "InvMutTest",
        "body_name": asm.body_name if asm else None,
        "target_assert_location": ({"file": "M_program.sol", "line": asm.m_assert_line}
                                   if asm else None),
        "verifier": None,
        "accepted_bundle": None,
    }
    return d


def _accepted_bundle(asm: Assembly, witness: Optional[dict]) -> dict:
    return {
        "construction": {
            "kind": asm.construction["kind"],
            "args_text": asm.construction["args_text"],
            "value": asm.construction["value"],
            "construction_source": asm.construction["source"],
        },
        "payable": asm.payable,
        # RQ3 #10: c is funded in ESBMC iff _is_value_test = value_amounts OR has_balance_require;
        # surface the same predicate so Doc-4 vm.deal(c) matches (else value-OUT props with no
        # {value:} call go unfunded in Foundry → trivially true on P AND M → foundry_regression_passed_on_M).
        "fund_c": bool(asm.payable or asm.has_balance_require),
        "value_calls": [{"amount_expr": a} for a in (asm.value_amounts or [])],
        "narrowed": False,
        "narrowing_requires": [],
        "verified_test_source": asm.foundry_test,   # Foundry-renderable form (V24); ESBMC proved
        "esbmc_test_source": asm.canonical_test,     # the __ESBMC_reverted form actually verified
        "witness": witness,
    }
