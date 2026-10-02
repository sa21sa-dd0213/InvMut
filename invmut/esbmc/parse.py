
from __future__ import annotations

from dataclasses import dataclass

FAILED = "FAILED"
SUCCESSFUL = "SUCCESSFUL"
UNKNOWN = "UNKNOWN"
TIMEOUT = "TIMEOUT"
SOLVER_ABORT = "SOLVER_ABORT"
VERIFIER_ERROR = "VERIFIER_ERROR"

_V_FAILED = "VERIFICATION FAILED"
_V_SUCCESSFUL = "VERIFICATION SUCCESSFUL"
_V_UNKNOWN = "VERIFICATION UNKNOWN"

BASE_CASE_MARKER = "No bug has been found in the base case"


_V_TOKENS = {_V_FAILED: FAILED, _V_SUCCESSFUL: SUCCESSFUL, _V_UNKNOWN: UNKNOWN}

_MULTI_PROPERTY_PREFIX = "[Multi-property]"
_CLAIM_FAILED_PREFIX = "✗ FAILED:"


@dataclass(frozen=True)
class VerdictResult:
    verdict: str
    bound_exhausted: bool
    has_funccall_trace: bool
    multi_property: bool = False
    claim_violations_present: bool = False


def _lines(stdout: str) -> list[str]:
    return [ln.strip() for ln in stdout.splitlines()]


def classify_verdict(stdout: str, stderr: str, returncode: int, timed_out: bool) -> VerdictResult:
    if timed_out:
        return VerdictResult(TIMEOUT, False, False)

    combined = stdout + "\n" + stderr
    lines = _lines(combined)

    has_trace = "[Counterexample]" in combined
    bound_exhausted = any(BASE_CASE_MARKER in ln for ln in lines)
    multi_property = any(ln.startswith(_MULTI_PROPERTY_PREFIX) for ln in lines)
    claim_violations_present = any(ln.startswith(_CLAIM_FAILED_PREFIX) for ln in lines)

    agg: str | None = None
    solver_abort = False
    for ln in lines:
        if ln in _V_TOKENS:
            agg = _V_TOKENS[ln]
        elif ln.startswith("ERROR:") and "SMT solver" in ln:
            solver_abort = True

    if agg is not None:
        return VerdictResult(agg, bound_exhausted, has_trace, multi_property, claim_violations_present)
    if solver_abort:
        return VerdictResult(SOLVER_ABORT, bound_exhausted, has_trace, multi_property, claim_violations_present)
    return VerdictResult(VERIFIER_ERROR, bound_exhausted, has_trace, multi_property, claim_violations_present)



def r2_outcome(v: VerdictResult) -> str:
    if v.verdict == FAILED:
        return "visible_difference"
    if v.verdict == SUCCESSFUL:
        return "no_difference"
    if v.verdict == UNKNOWN and v.bound_exhausted:
        return "no_difference_within_bound"
    return "inconclusive"


def r2_multi_property_outcome(v: VerdictResult) -> str:
    if v.verdict == FAILED:
        return "visible_difference" if v.has_funccall_trace else "inconclusive"
    if v.claim_violations_present and v.has_funccall_trace:
        return "visible_difference"
    if v.verdict == SUCCESSFUL:
        return "no_difference"
    if v.verdict == UNKNOWN and v.bound_exhausted and not v.claim_violations_present:
        return "no_difference_within_bound"
    return "inconclusive"


@dataclass(frozen=True)
class Violation:
    check: str
    function: str
    line: int
    file: str

    def diff_key(self, func_start: int | None = None) -> tuple:
        line = self.line if func_start is None else (self.line - func_start)
        return (self.check, self.function, line)


def _rel_key(v: "Violation", starts_map: dict | None) -> tuple:
    if not starts_map:
        return v.diff_key()
    starts = starts_map.get(v.function)
    if starts is None:
        return v.diff_key()
    if isinstance(starts, int):
        starts = [starts]
    uniq = sorted(set(starts))
    enclosing = [s for s in uniq if s <= v.line]
    base = max(enclosing) if enclosing else min(uniq)
    occ = uniq.index(base)
    return (v.check, v.function, occ, v.line - base)


def extract_violation_set(stdout: str, stderr: str) -> list[Violation]:
    import os
    import re

    pat = re.compile(
        r"FAILED:\s*'(?P<claim>.+?) at file (?P<file>\S+) line (?P<line>\d+)"
        r"(?: column \d+)? function (?P<fn>\S+)'"
    )
    out: list[Violation] = []
    seen: set = set()
    for ln in (stdout + "\n" + stderr).splitlines():
        m = pat.search(ln)
        if not m:
            continue
        v = Violation(
            check=_normalize_claim(m.group("claim")),
            function=m.group("fn"),
            line=int(m.group("line")),
            file=os.path.basename(m.group("file")),
        )
        k = (v.check, v.function, v.line, v.file)
        if k not in seen:
            seen.add(k)
            out.append(v)
    return out


def _normalize_claim(claim: str) -> str:
    c = claim.strip()
    for kind in ("division by zero", "arithmetic overflow on div", "arithmetic overflow on mul",
                 "arithmetic overflow on add", "arithmetic overflow on sub",
                 "array bounds violated", "arithmetic overflow", "NaN"):
        if c.startswith(kind):
            return kind
    return c


def r1_differential(
    p_baseline: list[Violation],
    m_violations: list[Violation],
    p_func_starts: dict[str, int] | None = None,
    m_func_starts: dict[str, int] | None = None,
) -> list[Violation]:
    base = {_rel_key(v, p_func_starts) for v in p_baseline}
    return [v for v in m_violations if _rel_key(v, m_func_starts) not in base]


@dataclass(frozen=True)
class R1Assessment:
    outcome: str
    introduced: list
    note: str


def r1_assess(
    p_base: list[Violation], p_ok: bool, p_timed_out: bool,
    m_viol: list[Violation], m_ok: bool, m_timed_out: bool,
    p_func_starts: dict[str, int] | None = None,
    m_func_starts: dict[str, int] | None = None,
) -> R1Assessment:
    if not p_ok and not p_base:
        return R1Assessment("inconclusive", [], "p_baseline_run_unusable")
    if not m_ok and not m_viol:
        return R1Assessment("inconclusive", [], "m_run_unusable")
    introduced = r1_differential(p_base, m_viol, p_func_starts, m_func_starts)
    if introduced:
        return R1Assessment("visible_difference", introduced,
                            "timeout_with_violations" if m_timed_out else "ok")
    if m_timed_out and not m_ok:
        return R1Assessment("inconclusive", [], "m_nonconverged_no_new_violation")
    return R1Assessment("clean", [], "no_introduced_safety_fault")
