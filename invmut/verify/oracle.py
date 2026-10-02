"""Doc 3 §6 — verdict parsing + the failure-location oracle, and §6.3 per-direction result.

The k-induction verdict is read by `parse.classify_verdict` (line-exact, last-aggregate, V20). A
FAILED is then LOCATED: parse the `Violated property:` block (the `file ... line ... function ...`
line IMMEDIATELY after the header — measured robust even when `--show-funccall-trace` interleaves a
`Function call trace:` block before the claim text) and compare the line to the test's own
`assert` line. On-target ⇒ the property was really violated; off-target ⇒ a claim inside C's own
source (the only other claim source in this stage, §0.1) ⇒ inconclusive, never accepted.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from invmut.esbmc import parse

# §6.3 per-direction results
PROVED = "PROVED"
REFUTED_AT_TARGET = "REFUTED_AT_TARGET"
FAILED_OFF_TARGET = "FAILED_OFF_TARGET"
TIMEOUT = "TIMEOUT"
UNKNOWN = "UNKNOWN"
SOLVER_ABORT = "SOLVER_ABORT"
VERIFIER_ERROR = "VERIFIER_ERROR"

_VIOLATED_HDR = "Violated property:"
_LOC = re.compile(r"file (?P<file>\S+) line (?P<line>\d+)(?: column \d+)? function (?P<fn>\S+)")


@dataclass(frozen=True)
class FailureLocation:
    file: str
    line: int
    function: str

    def as_dict(self) -> dict:
        return {"file": self.file, "line": self.line, "function": self.function}


def parse_violated_location(stdout: str, stderr: str) -> Optional[FailureLocation]:
    """Parse the `Violated property:` block (Doc 3 §6.2). Returns None if the header is absent or
    the following line does not carry the expected fields (→ caller maps to VERIFIER_ERROR)."""
    combined = stdout + "\n" + stderr
    idx = combined.find(_VIOLATED_HDR)
    if idx < 0:
        return None
    # the location is on the first line after the header that matches `file ... line ... function`.
    tail = combined[idx + len(_VIOLATED_HDR):]
    for ln in tail.splitlines():
        m = _LOC.search(ln)
        if m:
            return FailureLocation(m.group("file"), int(m.group("line")), m.group("fn"))
        if ln.strip() and not ln.strip().startswith("file"):
            # the immediately-following non-empty line should be the location; if it isn't, stop.
            break
    return None


@dataclass(frozen=True)
class DirectionResult:
    result: str                              # one of the §6.3 constants
    location: Optional[FailureLocation] = None
    raw_verdict: str = ""


def direction_result(
    stdout: str, stderr: str, returncode: int, timed_out: bool,
    target_assert_line: int, body_line_range: Optional[tuple[int, int]] = None,
) -> DirectionResult:
    """Map one ESBMC run on an assembled program to a §6.3 per-direction result, applying the
    location oracle on a FAILED. `target_assert_line` is the test's own assert line in THIS
    program; `body_line_range` is the (start,end) of the test body as a fallback matcher (§6.2)."""
    v = parse.classify_verdict(stdout, stderr, returncode, timed_out)
    if v.verdict == parse.TIMEOUT:
        return DirectionResult(TIMEOUT, raw_verdict=v.verdict)
    if v.verdict == parse.SUCCESSFUL:
        # A SUCCESSFUL whose run left a loop NOT fully unwound is a BOUNDED result, not a real
        # proof over all inputs (codex F5: k-induction fell back to a bounded base case). Do NOT
        # trust it as PROVED — downgrade to UNKNOWN so Dir1 → nonconverging_proof (fallback) and
        # Dir2 → m_no_cex_within_bound, never a false accepted/holds_on_modified.
        if _loop_not_unwound(stdout, stderr):
            return DirectionResult(UNKNOWN, raw_verdict=v.verdict)
        return DirectionResult(PROVED, raw_verdict=v.verdict)
    if v.verdict == parse.SOLVER_ABORT:
        return DirectionResult(SOLVER_ABORT, raw_verdict=v.verdict)
    if v.verdict == parse.UNKNOWN:
        return DirectionResult(UNKNOWN, raw_verdict=v.verdict)
    if v.verdict == parse.FAILED:
        loc = parse_violated_location(stdout, stderr)
        if loc is None:
            return DirectionResult(VERIFIER_ERROR, raw_verdict=v.verdict)  # §6.2: malformed block
        on_target = loc.line == target_assert_line
        if not on_target and body_line_range is not None:
            lo, hi = body_line_range
            # fallback matcher: within the body range AND the claim is an assertion (§6.2)
            on_target = (lo <= loc.line <= hi) and _claim_is_assertion(stdout, stderr)
        return DirectionResult(REFUTED_AT_TARGET if on_target else FAILED_OFF_TARGET,
                               location=loc, raw_verdict=v.verdict)
    return DirectionResult(VERIFIER_ERROR, raw_verdict=v.verdict)


# ESBMC's OWN operational models live under its build-tree path `.../esbmc/src/c2goto/library/…`
# (solidity_mapping.c / solidity_address.c for the mapping/balance/transfer modeling EVERY value-flow
# test triggers, plus the C stdlib models string.c etc.). That path token is embedded at ESBMC build
# time and can NEVER collide with a runtime user/scratchpad source path, so it is a safe anchor.
# (codex 2026-06-24: the previous bare `/library/` substring was UNSOUND — a user file at
# `contracts/library/Foo.sol` would be wrongly suppressed → a bounded SUCCESSFUL trusted as PROVED.)
_ESBMC_MODEL_PATH = "c2goto/library/"


def _loop_not_unwound(stdout: str, stderr: str) -> bool:
    """ESBMC prints `Not unwinding loop <id> iteration <n>   file <path>` when a loop is cut at the
    bound; a SUCCESSFUL alongside a USER-code loop is bounded, not a proof over all inputs (codex F5).
    Loops inside ESBMC's OWN models (`_ESBMC_MODEL_PATH`) are an internal modeling artifact, NOT a gap in
    the user's property — ignore those, else every deposit/withdraw/refund proof is wrongly UNKNOWN."""
    for line in (stdout + stderr).splitlines():
        if "Not unwinding loop" in line and _ESBMC_MODEL_PATH not in line:
            return True
    return False


def _claim_is_assertion(stdout: str, stderr: str) -> bool:
    """True if the violated claim text begins with `assertion` (the fallback matcher, §6.2)."""
    combined = stdout + "\n" + stderr
    idx = combined.find(_VIOLATED_HDR)
    if idx < 0:
        return False
    for ln in combined[idx:].splitlines():
        if ln.strip().startswith("assertion "):
            return True
    return False
