
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Optional

from invmut.mutation.model import Outcome, StageResult


@dataclass(frozen=True)
class SuiteResult:
    any_failed: bool
    infra_error: bool = False
    detail: str = ""


TestRunFn = Callable[[str], SuiteResult]


def stage3_duplicates(m_source: str, test_runner: Optional[TestRunFn]) -> StageResult:
    if test_runner is None:
        return StageResult("stage3", Outcome.CONTINUE, {"skipped": "no_test_runner"})
    res = test_runner(m_source)
    if res.infra_error:
        return StageResult("stage3", Outcome.INCONCLUSIVE,
                           {"reason": "infra_error", "detail": res.detail})
    if res.any_failed:
        return StageResult("stage3", Outcome.ALREADY_CAUGHT, {"detail": res.detail, "silent": True})
    return StageResult("stage3", Outcome.CONTINUE, {})
