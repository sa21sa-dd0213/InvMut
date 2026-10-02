"""Doc 2 Stage 4 — R1 safety-property differential (on M, baseline on P).

R1 is a POSITIVE-only short-circuit: if the edit introduces a standard safety fault that P does
not have, ESBMC's own counterexample is the witness and we skip R2 (Doc 2 §5). A clean OR an
unusable/non-converged R1 both fall through to R2 (R1 never *rejects* a candidate; the absence of
an introduced safety fault is just "no cheap win"). The introduced set is computed
function-relative so an insert/delete above a function does not desync P and M line numbers
(DEVIATIONS V16). The locked R1 esbmc mode (--unbound --incremental-bmc --multi-property, the
per-claim violation listing) lives in `commands.build_r1_command`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.esbmc import parse
from invmut.esbmc.runner import EsbmcRun, RunFn, temp_sol
from invmut.mutation.model import Outcome, StageResult

# map ESBMC's normalized claim-kind text -> the Doc 2 §8 safety_check enum.
_SAFETY_CHECK_ENUM = {
    "division by zero": "div_by_zero",
    "arithmetic overflow on add": "overflow",
    "arithmetic overflow on sub": "overflow",
    "arithmetic overflow on mul": "overflow",
    "arithmetic overflow on div": "overflow",
    "arithmetic overflow on neg": "overflow",
    "arithmetic overflow": "overflow",
    "array bounds violated": "bounds",
}

_FUNC_RE = re.compile(r"\b(?:function|modifier)\s+([A-Za-z_]\w*)\b")
_CTOR_RE = re.compile(r"\bconstructor\s*\(")


def func_starts_of(source: str) -> dict[str, list[int]]:
    """Map function/modifier name (and `constructor`) -> ALL 1-based start lines, for the V16
    instance-aware function-relative differential key (codex F1). Overloads share a name but get
    distinct start lines, so the keying resolves each violation to its enclosing definition."""
    starts: dict[str, list[int]] = {}
    for i, ln in enumerate(source.splitlines(), start=1):
        m = _FUNC_RE.search(ln)
        if m:
            starts.setdefault(m.group(1), []).append(i)
        if _CTOR_RE.search(ln):
            starts.setdefault("constructor", []).append(i)
    return starts


@dataclass(frozen=True)
class R1Run:
    violations: list
    ok: bool          # a usable verdict/listing was produced (not VERIFIER_ERROR) — B1/M4
    timed_out: bool
    func_starts: dict
    command: list = field(default_factory=list)
    verdict: str = ""


def _run_r1(config: Config, source: str, contract: str, run_fn: RunFn,
            focus: str | None = None) -> R1Run:
    with temp_sol(source, prefix="invmut_r1_") as path:
        argv = cmd.build_r1_command(config, path, contract, focus_function=focus)
        run: EsbmcRun = run_fn(argv)
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    viol = parse.extract_violation_set(run.stdout, run.stderr)
    # A multi-property run is "ok" if it produced a real aggregate verdict OR listed any claim
    # violation — an UNKNOWN aggregate with per-claim FAILEDs is the normal R1 success shape (V20).
    ok = v.verdict != parse.VERIFIER_ERROR or v.claim_violations_present or bool(viol)
    return R1Run(viol, ok, run.timed_out, func_starts_of(source), argv, v.verdict)


def precompute_r1_baseline(config: Config, p_source: str, contract: str, run_fn: RunFn,
                           focus: str | None = None) -> R1Run:
    """Run R1 on P once per reference (Doc 2 §5 'precompute once per P'). The caller caches this
    across all candidates of the same P. `focus` builds a per-function focused baseline (cached by
    the caller) so a focused M-R1 differential is compared against a focus-consistent P baseline."""
    return _run_r1(config, p_source, contract, run_fn, focus=focus)


def stage4_r1(
    config: Config, m_source: str, contract: str, baseline: R1Run, run_fn: RunFn,
    focus_function: str | None = None
) -> StageResult:
    """Doc 2 §5. Returns VISIBLE_DIFFERENCE (skip R2 → test loop) on an introduced safety fault;
    otherwise CONTINUE (→ R2), distinguishing a converged-clean R1 from an unusable/non-converged
    one in the detail note (both proceed).

    `focus_function` (the mutated fn's bare name) runs M's R1 focused on it (FOCUS_FUNCTION_PLAN);
    the caller MUST pass a focus-consistent `baseline` (P focused on the same fn) so the introduced
    set stays a sound differential. R1 is the canary: `r1_timed_out` is surfaced so the orchestrator
    can latch focus mode for every later candidate of this case."""
    m = _run_r1(config, m_source, contract, run_fn, focus=focus_function)
    a = parse.r1_assess(
        baseline.violations, baseline.ok, baseline.timed_out,
        m.violations, m.ok, m.timed_out,
        baseline.func_starts, m.func_starts,
    )
    common = {"r1_command": m.command, "r1_verdict": m.verdict, "note": a.note,
              "r1_timed_out": m.timed_out, "r1_focus": focus_function}

    if a.outcome == "visible_difference":
        kinds = sorted({v.check for v in a.introduced})
        primary = a.introduced[0]
        safety_check = _SAFETY_CHECK_ENUM.get(primary.check, primary.check)
        return StageResult("stage4", Outcome.VISIBLE_DIFFERENCE, {
            **common,
            "source_stage": "R1",
            "difference_kind": "runtime_safety",
            "safety_check": safety_check,
            "introduced_checks": kinds,
            # goal rewrite for the test agent (Doc 2 §5): target-independent safety property.
            "goal_rewrite": (f"the modified version triggers {safety_check} while the "
                             f"original does not"),
            "primary_violation": {
                "check": primary.check, "function": primary.function,
                "line": primary.line, "file": primary.file,
            },
        })

    # clean (converged, no introduced fault) OR inconclusive (unusable/non-converged): both → R2.
    return StageResult("stage4", Outcome.CONTINUE, {
        **common,
        "r1_outcome": a.outcome,  # "clean" | "inconclusive"
    })
