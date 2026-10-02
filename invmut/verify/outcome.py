
from __future__ import annotations

from typing import Optional

from invmut.verify import oracle as o

ACCEPTED = "accepted"
FAILS_ON_ORIGINAL = "fails_on_original"
HOLDS_ON_MODIFIED = "holds_on_modified"
INCONCLUSIVE = "inconclusive"


def should_run_hold(dM: o.DirectionResult) -> bool:
    return dM.result == o.REFUTED_AT_TARGET


def map_outcome(dM: o.DirectionResult, dP: Optional[o.DirectionResult]) -> tuple[str, Optional[str]]:
    if dM.result == o.PROVED:
        return HOLDS_ON_MODIFIED, None
    if dM.result in (o.UNKNOWN, o.TIMEOUT):
        return INCONCLUSIVE, "m_no_cex_within_bound"
    if dM.result == o.FAILED_OFF_TARGET:
        return INCONCLUSIVE, "non_target_failure_on_modified"
    if dM.result == o.SOLVER_ABORT:
        return INCONCLUSIVE, "solver_abort"
    if dM.result == o.VERIFIER_ERROR:
        return INCONCLUSIVE, "verifier_error"

    assert dM.result == o.REFUTED_AT_TARGET
    if dP is None:
        return INCONCLUSIVE, "verifier_error"
    if dP.result == o.PROVED:
        return ACCEPTED, None
    if dP.result == o.REFUTED_AT_TARGET:
        return FAILS_ON_ORIGINAL, None
    if dP.result == o.FAILED_OFF_TARGET:
        return INCONCLUSIVE, "non_target_failure_on_original"
    if dP.result == o.TIMEOUT:
        return INCONCLUSIVE, "timeout"
    if dP.result == o.UNKNOWN:
        return INCONCLUSIVE, "nonconverging_proof"
    if dP.result == o.SOLVER_ABORT:
        return INCONCLUSIVE, "solver_abort"
    return INCONCLUSIVE, "verifier_error"
