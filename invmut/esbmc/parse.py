"""ESBMC output parsing — verdict classifier (Doc 3 §6.1, DEVIATIONS V14).

Line-exact matching (never substring): a verdict is a standalone line equal to the verdict
string after stripping whitespace, so a comment like `// expect VERIFICATION FAILED` cannot
trigger a false match. Precedence and the no-verdict fallback follow Doc 3 §6.1 and apply
uniformly to R1, R2, and Doc 3 (V14). Bound-exhaustion (incremental-bmc clean) is detected by
the exact ESBMC base-case marker line (pinned from measured 8.2.0 output).

This module will grow (location oracle, trace extraction, diagnostic extractor) in Phase 0d;
this first cut covers the verdict needed by the Phase-0c characterization.
"""

from __future__ import annotations

from dataclasses import dataclass

# Raw verdict enum — single source (Doc 5 §12.2 spelling; DEVIATIONS V5).
FAILED = "FAILED"
SUCCESSFUL = "SUCCESSFUL"
UNKNOWN = "UNKNOWN"
TIMEOUT = "TIMEOUT"
SOLVER_ABORT = "SOLVER_ABORT"
VERIFIER_ERROR = "VERIFIER_ERROR"

_V_FAILED = "VERIFICATION FAILED"
_V_SUCCESSFUL = "VERIFICATION SUCCESSFUL"
_V_UNKNOWN = "VERIFICATION UNKNOWN"

# Exact ESBMC 8.2.0 base-case marker for incremental-bmc bound-exhaustion (DEVIATIONS V14).
BASE_CASE_MARKER = "No bug has been found in the base case"


# Aggregate-verdict token -> raw verdict (line-exact membership).
_V_TOKENS = {_V_FAILED: FAILED, _V_SUCCESSFUL: SUCCESSFUL, _V_UNKNOWN: UNKNOWN}

# Measured 8.2.0: a `--multi-property` run prints a `[Multi-property]` aggregate summary line
# AND the final aggregate verdict (often UNKNOWN) AFTER one or more intermediate per-round
# verdict lines. The aggregate is always the LAST verdict line (DEVIATIONS V20).
_MULTI_PROPERTY_PREFIX = "[Multi-property]"
_CLAIM_FAILED_PREFIX = "✗ FAILED:"


@dataclass(frozen=True)
class VerdictResult:
    verdict: str                 # one of FAILED/SUCCESSFUL/UNKNOWN/TIMEOUT/SOLVER_ABORT/VERIFIER_ERROR
    bound_exhausted: bool        # UNKNOWN + base-case marker present (incremental-bmc clean)
    has_funccall_trace: bool     # a [Counterexample] block is present
    multi_property: bool = False           # a `[Multi-property]` aggregate summary line is present
    claim_violations_present: bool = False  # >=1 per-claim `✗ FAILED:` line (the real R1 signal)


def _lines(stdout: str) -> list[str]:
    return [ln.strip() for ln in stdout.splitlines()]


def classify_verdict(stdout: str, stderr: str, returncode: int, timed_out: bool) -> VerdictResult:
    """Map an esbmc run to a raw AGGREGATE verdict (Doc 3 §6.1; DEVIATIONS V14/V20).

    ESBMC 8.2.0 writes the verdict line and the counterexample/trace to STDERR (stdout holds
    only the version banner), so verdict classification scans both streams.

    The authoritative verdict is the LAST standalone `VERIFICATION X` line, NOT a type-precedence
    pick across all lines (DEVIATIONS V20, measured): under `--multi-property` ESBMC prints an
    intermediate `VERIFICATION FAILED` for the round that refuted a claim, then a final aggregate
    `VERIFICATION UNKNOWN` once the k-bound is exhausted. Type-precedence would mis-report the
    aggregate as FAILED. In single-property mode there is exactly one verdict line, so last==only
    and the change is a no-op there. The per-claim `✗ FAILED:` violations (R1's real signal) are
    surfaced via `claim_violations_present` / `extract_violation_set`, independent of the
    aggregate. Line-exact matching keeps the prose `... A VERIFICATION SUCCESSFUL result is
    bounded ...` warning line from ever matching a verdict token (measured 8.2.0).
    """
    if timed_out:
        return VerdictResult(TIMEOUT, False, False)

    combined = stdout + "\n" + stderr
    lines = _lines(combined)

    has_trace = "[Counterexample]" in combined
    bound_exhausted = any(BASE_CASE_MARKER in ln for ln in lines)
    multi_property = any(ln.startswith(_MULTI_PROPERTY_PREFIX) for ln in lines)
    claim_violations_present = any(ln.startswith(_CLAIM_FAILED_PREFIX) for ln in lines)

    # Aggregate verdict = the LAST standalone VERIFICATION line; track a solver abort seen with
    # no verdict line as the fallback.
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
    # No verdict line at all -> VERIFIER_ERROR, NEVER no_difference (V14).
    return VerdictResult(VERIFIER_ERROR, bound_exhausted, has_trace, multi_property, claim_violations_present)


# --- semantic mappings used by the loops (kept here so the rule is in one place) ---------

def r2_outcome(v: VerdictResult) -> str:
    """R2 (witness search) verdict -> loop outcome (Doc 2 §6.7; DEVIATIONS V2/V14)."""
    if v.verdict == FAILED:
        return "visible_difference"
    if v.verdict == SUCCESSFUL:
        return "no_difference"  # a real bounded proof of equality (rare under incremental-bmc)
    if v.verdict == UNKNOWN and v.bound_exhausted:
        return "no_difference_within_bound"  # no witness within bound; honest bounded miss
    # TIMEOUT / SOLVER_ABORT / bare UNKNOWN / VERIFIER_ERROR
    return "inconclusive"


def r2_multi_property_outcome(v: VerdictResult) -> str:
    """R2 local-pack verdict -> outcome.

    In ESBMC multi-property mode, the final aggregate verdict can be UNKNOWN
    even after one claim has already failed.  For CE-derived oracle generation,
    a failed claim is useful only when a counterexample trace is attached, so the
    rule is stricter than R1's violation-set parsing and different from normal
    single-property R2's aggregate-only rule.
    """
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
    """One safety-check violation from a (multi-property) R1 run (DEVIATIONS V16)."""
    check: str       # normalized claim kind, e.g. "division by zero", "arithmetic overflow on div"
    function: str    # enclosing function name
    line: int        # source line in that run's file
    file: str        # basename of the source file

    def diff_key(self, func_start: int | None = None) -> tuple:
        """Key for the P-vs-M set difference (DEVIATIONS V16).

        Filename-independent. When `func_start` (the violation's enclosing function start line
        in *its own* source) is given, the line is made FUNCTION-RELATIVE (`line - func_start`),
        which survives whole-file line shifts from an insert/delete above the function — the
        locked V16 key. Without it, the raw line is used (valid only when P and M are
        line-aligned, e.g. line-aligned fixtures)."""
        line = self.line if func_start is None else (self.line - func_start)
        return (self.check, self.function, line)


def _rel_key(v: "Violation", starts_map: dict | None) -> tuple:
    """Instance-aware function-relative key (DEVIATIONS V16; codex F1). `starts_map` is
    name -> start line(s). For an OVERLOADED name ESBMC reports the same bare `function f`, so we
    resolve the ENCLOSING definition (greatest start line <= the violation line) and fold its
    OCCURRENCE INDEX into the key. This stops a cosmetic edit that shifts a *sibling* overload's
    lines from looking like an introduced violation. occurrence index is stable across P/M because
    a confined edit never reorders function definitions."""
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
    """Parse the per-claim FAILED lines of a `--multi-property` run into a violation set
    (DEVIATIONS V16). Used by R1 (always multi-property) to compute M - P_baseline.

    ESBMC 8.2.0 multi-property emits one line per refuted claim (verified):
        ✗ FAILED: 'division by zero at file <file> line <N> function <fn>'
    These are robust (the `Violated property:` block is interleaved with the funccall trace
    under --show-funccall-trace, so we parse the FAILED claim lines instead).
    """
    import os
    import re

    # 'FAILED:' then a quoted "<claim> at file <file> line <N> [column <C>] function <fn>"
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
    """Reduce a claim line to a stable check kind (drop operand expressions)."""
    c = claim.strip()
    # claims like `!overflow("/", a, b)` are the formula line; prefer the human kind which
    # appears as the claim text (e.g. "arithmetic overflow on div", "division by zero").
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
    """M-only safety violations = introduced faults (DEVIATIONS V16). Subtract P's baseline.

    Pass `p_func_starts`/`m_func_starts` (function name -> start line in that source) to key on
    the FUNCTION-RELATIVE line (V16), so an insert/delete above a function does not desync P
    and M. Without them the raw line is used (line-aligned inputs only).
    """
    base = {_rel_key(v, p_func_starts) for v in p_baseline}
    return [v for v in m_violations if _rel_key(v, m_func_starts) not in base]


@dataclass(frozen=True)
class R1Assessment:
    """R1 outcome over a P/M pair (DEVIATIONS V16; addresses B1/M4)."""
    outcome: str                 # visible_difference | clean | inconclusive
    introduced: list             # the M-only violations (safety_check kinds)
    note: str


def r1_assess(
    p_base: list[Violation], p_ok: bool, p_timed_out: bool,
    m_viol: list[Violation], m_ok: bool, m_timed_out: bool,
    p_func_starts: dict[str, int] | None = None,
    m_func_starts: dict[str, int] | None = None,
) -> R1Assessment:
    """Map an R1 multi-property P/M run pair to a loop outcome (DEVIATIONS V16 timeout rule).

    `*_ok` = the run produced a usable verdict/violation listing (not a crash/VERIFIER_ERROR).
    A `--multi-property` run that TIMED OUT but already listed violations is NOT a failure: the
    violations found are real (V16). Only a run that found NOTHING and did not converge is
    inconclusive — distinguishing "no violations" from "crashed/empty" (M4).
    """
    # If P's baseline run crashed entirely (no verdict, no violations), we cannot trust the
    # subtraction -> inconclusive rather than over-reporting M's violations as introduced.
    if not p_ok and not p_base:
        return R1Assessment("inconclusive", [], "p_baseline_run_unusable")
    if not m_ok and not m_viol:
        return R1Assessment("inconclusive", [], "m_run_unusable")
    introduced = r1_differential(p_base, m_viol, p_func_starts, m_func_starts)
    if introduced:
        return R1Assessment("visible_difference", introduced,
                            "timeout_with_violations" if m_timed_out else "ok")
    # no introduced violation
    if m_timed_out and not m_ok:
        # M didn't converge and found nothing new -> can't claim clean
        return R1Assessment("inconclusive", [], "m_nonconverged_no_new_violation")
    return R1Assessment("clean", [], "no_introduced_safety_fault")
