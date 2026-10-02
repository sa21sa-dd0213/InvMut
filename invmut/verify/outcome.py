"""Doc 3 §7 — outcome mapping from the two per-direction results.

VERIFICATION ORDER (DEVIATIONS V40, USER 2026-06-27): **break-first**. We run Direction 2 (refute on M)
FIRST; Direction 1 (prove on P) runs ONLY when M was REFUTED. This drives the two-phase test-reflection
state machine: `holds_on_modified` (M not broken) means the assert is too weak → reflect on the ASSERT;
`fails_on_original` (M broken but P not proved) means the assert already separates P/M but is too strong
→ reflect on the REQUIRE only. `accepted` still requires EXACTLY dM=REFUTED_AT_TARGET and dP=PROVED.

`dP is None` therefore means "P direction not run" (because M was not refuted)."""

from __future__ import annotations

from typing import Optional

from invmut.verify import oracle as o

# the four outcomes handed to the test loop (Doc 3 §7 / prompts doc)
ACCEPTED = "accepted"
FAILS_ON_ORIGINAL = "fails_on_original"
HOLDS_ON_MODIFIED = "holds_on_modified"
INCONCLUSIVE = "inconclusive"


def should_run_hold(dM: o.DirectionResult) -> bool:
    """Direction 1 (prove on P) runs only if the property was REFUTED on M (break-first, V40). If M was
    not broken there is nothing to prove on P — the assert is too weak and must be reflected on first."""
    return dM.result == o.REFUTED_AT_TARGET


def map_outcome(dM: o.DirectionResult, dP: Optional[o.DirectionResult]) -> tuple[str, Optional[str]]:
    """Return (outcome, reason) per the §7 table, break-first (V40): dM is the M(break) result, dP the
    P(hold) result or None when M was not refuted (so P was not run)."""
    # Direction-2-only terminal results (M not broken → dP not run)
    if dM.result == o.PROVED:
        return HOLDS_ON_MODIFIED, None                 # assert too weak: M satisfies it
    if dM.result in (o.UNKNOWN, o.TIMEOUT):
        return INCONCLUSIVE, "m_no_cex_within_bound"
    if dM.result == o.FAILED_OFF_TARGET:
        return INCONCLUSIVE, "non_target_failure_on_modified"
    if dM.result == o.SOLVER_ABORT:
        return INCONCLUSIVE, "solver_abort"
    if dM.result == o.VERIFIER_ERROR:
        return INCONCLUSIVE, "verifier_error"

    # dM == REFUTED → assert separates P/M; decide on dP (hold on P)
    assert dM.result == o.REFUTED_AT_TARGET
    if dP is None:
        return INCONCLUSIVE, "verifier_error"          # defensive: Dir1 should have run
    if dP.result == o.PROVED:
        return ACCEPTED, None
    if dP.result == o.REFUTED_AT_TARGET:
        return FAILS_ON_ORIGINAL, None                 # assert too strong: P violates it too
    if dP.result == o.FAILED_OFF_TARGET:
        return INCONCLUSIVE, "non_target_failure_on_original"
    if dP.result == o.TIMEOUT:
        return INCONCLUSIVE, "timeout"
    if dP.result == o.UNKNOWN:
        return INCONCLUSIVE, "nonconverging_proof"     # triggers the §8 fallback upstream
    if dP.result == o.SOLVER_ABORT:
        return INCONCLUSIVE, "solver_abort"
    return INCONCLUSIVE, "verifier_error"
