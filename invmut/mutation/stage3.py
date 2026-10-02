"""Doc 2 Stage 3 — duplicates pre-filter (execution; deterministic config).

The only execution step (a unit-test runner), distinct from the ESBMC verification in 4-5. A
mutant that an existing PASSING test catches is discarded as `already_caught` (silent to the LLM,
does NOT mark the statement covered). Sound by construction: a discard requires an OBSERVED test
failure on M, so there are no false positives (a parameterized test that misses its killing input
is a tolerated false negative — M proceeds). Doc 2 §4.

The forge workspace assembly lives in Doc 4 (rendering); here we take an injected runner so the
filter logic is testable and so a run with no oracle suite is simply a no-op pass (the filter is
an optimization, never a correctness gate)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Optional

from invmut.mutation.model import Outcome, StageResult


@dataclass(frozen=True)
class SuiteResult:
    any_failed: bool        # at least one oracle test was OBSERVED to fail on M
    infra_error: bool = False   # the test infra failed to compile/run (→ inconclusive, §4)
    detail: str = ""


# takes the mutant source; returns whether the pre-existing+accepted suite catches it.
TestRunFn = Callable[[str], SuiteResult]


def stage3_duplicates(m_source: str, test_runner: Optional[TestRunFn]) -> StageResult:
    """Doc 2 §4. No runner / no suite → CONTINUE (no-op). A suite infra failure → INCONCLUSIVE
    (Stage-5-style, not did_not_compile). An observed failure → ALREADY_CAUGHT (silent)."""
    if test_runner is None:
        return StageResult("stage3", Outcome.CONTINUE, {"skipped": "no_test_runner"})
    res = test_runner(m_source)
    if res.infra_error:
        return StageResult("stage3", Outcome.INCONCLUSIVE,
                           {"reason": "infra_error", "detail": res.detail})
    if res.any_failed:
        return StageResult("stage3", Outcome.ALREADY_CAUGHT, {"detail": res.detail, "silent": True})
    return StageResult("stage3", Outcome.CONTINUE, {})
