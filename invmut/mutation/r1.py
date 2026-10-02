
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.esbmc import parse
from invmut.esbmc.runner import EsbmcRun, RunFn, temp_sol
from invmut.mutation.model import Outcome, StageResult

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
    ok: bool
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
    ok = v.verdict != parse.VERIFIER_ERROR or v.claim_violations_present or bool(viol)
    return R1Run(viol, ok, run.timed_out, func_starts_of(source), argv, v.verdict)


def precompute_r1_baseline(config: Config, p_source: str, contract: str, run_fn: RunFn,
                           focus: str | None = None) -> R1Run:
    return _run_r1(config, p_source, contract, run_fn, focus=focus)


def stage4_r1(
    config: Config, m_source: str, contract: str, baseline: R1Run, run_fn: RunFn,
    focus_function: str | None = None
) -> StageResult:
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
            "goal_rewrite": (f"the modified version triggers {safety_check} while the "
                             f"original does not"),
            "primary_violation": {
                "check": primary.check, "function": primary.function,
                "line": primary.line, "file": primary.file,
            },
        })

    return StageResult("stage4", Outcome.CONTINUE, {
        **common,
        "r1_outcome": a.outcome,
    })
