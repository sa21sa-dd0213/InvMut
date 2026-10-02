
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from invmut.esbmc import parse

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
    combined = stdout + "\n" + stderr
    idx = combined.find(_VIOLATED_HDR)
    if idx < 0:
        return None
    tail = combined[idx + len(_VIOLATED_HDR):]
    for ln in tail.splitlines():
        m = _LOC.search(ln)
        if m:
            return FailureLocation(m.group("file"), int(m.group("line")), m.group("fn"))
        if ln.strip() and not ln.strip().startswith("file"):
            break
    return None


@dataclass(frozen=True)
class DirectionResult:
    result: str
    location: Optional[FailureLocation] = None
    raw_verdict: str = ""


def direction_result(
    stdout: str, stderr: str, returncode: int, timed_out: bool,
    target_assert_line: int, body_line_range: Optional[tuple[int, int]] = None,
) -> DirectionResult:
    v = parse.classify_verdict(stdout, stderr, returncode, timed_out)
    if v.verdict == parse.TIMEOUT:
        return DirectionResult(TIMEOUT, raw_verdict=v.verdict)
    if v.verdict == parse.SUCCESSFUL:
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
            return DirectionResult(VERIFIER_ERROR, raw_verdict=v.verdict)
        on_target = loc.line == target_assert_line
        if not on_target and body_line_range is not None:
            lo, hi = body_line_range
            on_target = (lo <= loc.line <= hi) and _claim_is_assertion(stdout, stderr)
        return DirectionResult(REFUTED_AT_TARGET if on_target else FAILED_OFF_TARGET,
                               location=loc, raw_verdict=v.verdict)
    return DirectionResult(VERIFIER_ERROR, raw_verdict=v.verdict)


_ESBMC_MODEL_PATH = "c2goto/library/"


def _loop_not_unwound(stdout: str, stderr: str) -> bool:
    for line in (stdout + stderr).splitlines():
        if "Not unwinding loop" in line and _ESBMC_MODEL_PATH not in line:
            return True
    return False


def _claim_is_assertion(stdout: str, stderr: str) -> bool:
    combined = stdout + "\n" + stderr
    idx = combined.find(_VIOLATED_HDR)
    if idx < 0:
        return False
    for ln in combined[idx:].splitlines():
        if ln.strip().startswith("assertion "):
            return True
    return False
