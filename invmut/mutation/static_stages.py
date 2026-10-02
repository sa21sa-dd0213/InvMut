"""Doc 2 static stages 0-2: exact-change dedup, build+compile, format check.

These run before any execution/verification (cost order, Doc 2 §0.2). They are pure/text
operations except the solc compile in Stage 1, which is injected as a `compile_fn` so the logic
is testable without a toolchain (the real compiler is `solc_compile_fn` in `compile.py`).
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from typing import Any, Callable, Optional

from invmut.mutation.model import ALLOWED_OPERATIONS, Candidate, Outcome, StageResult

MAX_CHANGED_LINES_DEFAULT = 4  # Doc 2 §3.2 (single-statement replace on a 2-line stmt = 4)


# --- M assembly ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BuildResult:
    m_source: Optional[str]      # the assembled mutant source, or None on a resolution error
    original_unit_text: str      # the unit's exact source span in P (for the format check)
    error: Optional[str]         # set iff m_source is None


def resolve_and_build(p_source: str, unit_record: dict, mutated_unit_code: str) -> BuildResult:
    """Splice `mutated_unit_code` over the unit's line span [start_line, end_line] in P, leaving
    everything else byte-identical (Doc 2 §2.2). Line-based per Doc 2 §3.1 ('start_line..end_line
    in Document 1's unit record'). The contract keeps its original name C."""
    kind = unit_record.get("kind")
    if kind not in ("function", "modifier"):
        # state-var (or other) units are never editable bodies (Doc 2 §3.1 assertion).
        return BuildResult(None, "", f"unit kind not editable: {kind}")
    start = unit_record.get("start_line")
    end = unit_record.get("end_line")
    if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
        return BuildResult(None, "", "unit has no usable start_line/end_line")

    lines = p_source.splitlines(keepends=True)
    if end > len(lines):
        return BuildResult(None, "", "unit end_line beyond source")
    prefix = "".join(lines[: start - 1])
    suffix = "".join(lines[end:])
    original_unit_text = "".join(lines[start - 1 : end])

    body = mutated_unit_code if mutated_unit_code.endswith("\n") else mutated_unit_code + "\n"
    m_source = prefix + body + suffix
    return BuildResult(m_source, original_unit_text, None)


# --- stage 0: exact-change dedup ----------------------------------------------------------

def stage0_dedup(candidate: Candidate, seen_change_hashes: set[str]) -> StageResult:
    """Doc 2 §1. A repeat (same unit + same normalized code) is `duplicate_exact_change`; it does
    NOT run later stages but DOES count toward budget (handled by the caller adding the hash)."""
    h = candidate.change_hash()
    if h in seen_change_hashes:
        return StageResult("stage0", Outcome.DUPLICATE_EXACT_CHANGE, {"change_hash": h})
    return StageResult("stage0", Outcome.CONTINUE, {"change_hash": h})


# --- stage 1: build + compile -------------------------------------------------------------

@dataclass(frozen=True)
class CompileResult:
    ok: bool
    diagnostics: str   # verbatim solc output captured as {{COMPILER_ERROR}} on failure


CompileFn = Callable[[str], CompileResult]


def stage1_build_compile(
    candidate: Candidate, p_source: str, unit_record: dict, compile_fn: CompileFn
) -> tuple[StageResult, Optional[str]]:
    """Doc 2 §2. Resolve unit → splice M → compile. Returns (result, m_source).

    A unit_id that does not resolve to an editable unit is a `format_error` (do not build, Doc 2
    §2.1). A solc error is `did_not_compile` with verbatim diagnostics for Prompt B (§2.3)."""
    if unit_record is None:
        return StageResult("stage1", Outcome.FORMAT_ERROR,
                           {"reason": "unit_id not in editable list"}), None

    build = resolve_and_build(p_source, unit_record, candidate.mutated_unit_code)
    if build.m_source is None:
        return StageResult("stage1", Outcome.FORMAT_ERROR, {"reason": build.error}), None

    comp = compile_fn(build.m_source)
    if not comp.ok:
        return StageResult("stage1", Outcome.DID_NOT_COMPILE,
                           {"compiler_error": comp.diagnostics}), None
    return StageResult("stage1", Outcome.CONTINUE,
                       {"original_unit_text": build.original_unit_text}), build.m_source


# --- stage 2: format check ----------------------------------------------------------------

_LOW_VALUE_PAT = re.compile(
    r"^\s*(revert\s*\(|revert\s+\w|assert\s*\(\s*false\s*\)|require\s*\(\s*false\b)", re.M
)


def _split_signature_body(unit_text: str) -> Optional[tuple[str, str]]:
    """(header, body) split at the FIRST '{' / LAST '}'. None if braces are missing/inverted."""
    first = unit_text.find("{")
    last = unit_text.rfind("}")
    if first < 0 or last < 0 or last <= first:
        return None
    return unit_text[:first], unit_text[first + 1 : last]


_WS = re.compile(r"\s+")
_LINE_COMMENT = re.compile(r"//[^\n]*")
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)


def _strip_comments(text: str) -> str:
    return _LINE_COMMENT.sub("", _BLOCK_COMMENT.sub("", text))


def _norm_header(header: str) -> str:
    """Collapse whitespace runs (incl. newlines/indent) to one space, strip. Tolerates LLM
    reindentation while still catching any real signature change (Doc 2 §3.1, intent-faithful)."""
    return _WS.sub(" ", header).strip()


# A Solidity function header between the param list's ')' and the body '{' is a free-order mix of
# reserved clauses (visibility / state-mutability / virtual / override / returns) and MODIFIER
# INVOCATIONS. A modifier is NOT part of the signature (DEVIATIONS V37): a mutant
# may add/remove/alter a modifier (e.g. drop an `onlyOwner` / `nonReentrant` guard) — that is a real
# behavioral edit, not a forbidden signature change. So the signature compare must ignore modifiers
# while still pinning name/params/return-list/visibility/mutability/override.
_HEADER_KEYWORDS = {"public", "external", "internal", "private", "pure", "view", "payable",
                    "nonpayable", "virtual", "override", "returns", "constant", "anonymous"}


def _match_paren(s: str, i: int) -> int:
    """Given s[i] == '(', return the index just past the matching ')'. Unmatched → len(s)."""
    depth = 0
    while i < len(s):
        if s[i] == "(":
            depth += 1
        elif s[i] == ")":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return len(s)


def _split_header_clauses(header: str) -> tuple[str, list[str], list[str]]:
    """Split a unit header into (prefix, kept_clauses, modifier_invocations).

    prefix = keyword + name + parameter list (up to and incl. the param list's ')').
    kept   = the signature-defining reserved clauses after it (visibility/mutability/virtual/
             override(...)/returns(...)); modifiers = everything else (a modifier name + optional
             (...) args). Paren-pairing keeps `override(A,B)` / `returns(uint,address)` whole so a
             base/type name is never misread as a modifier."""
    lp = header.find("(")
    if lp < 0:
        return header.strip(), [], []        # no param list (e.g. `modifier onlyOwner`) → all prefix
    rp = _match_paren(header, lp)
    prefix, tail = header[:rp], header[rp:]
    kept: list[str] = []
    mods: list[str] = []
    i, n = 0, len(tail)
    while i < n:
        if tail[i].isspace():
            i += 1
            continue
        j = i
        while j < n and (tail[j].isalnum() or tail[j] == "_"):
            j += 1
        tok = tail[i:j]
        if not tok:                          # stray punctuation — skip defensively
            i += 1
            continue
        is_kw = tok in _HEADER_KEYWORDS
        # only returns/override (reserved) and modifier invocations carry a (...) arg group; a plain
        # visibility/mutability keyword never does, so don't swallow a following '(' for those.
        arg = ""
        if (not is_kw) or tok in ("returns", "override"):
            k = j
            while k < n and tail[k].isspace():
                k += 1
            if k < n and tail[k] == "(":
                end = _match_paren(tail, k)
                arg = tail[k:end]
                j = end
        (kept if is_kw else mods).append(tok + arg)
        i = j
    return prefix, kept, mods


def _canonical_signature(header: str) -> str:
    """The signature identity of a header with modifier invocations REMOVED: prefix (name+params) +
    the sorted reserved clauses, all whitespace-normalized. Two headers that differ only in their
    modifier list share a canonical signature; any name/param/return/visibility/mutability change
    does not."""
    prefix, kept, _mods = _split_header_clauses(header)
    norm_kept = sorted(_WS.sub("", c) for c in kept)
    return _norm_header(prefix) + " || " + " ".join(norm_kept)


def _normalize_body_lines(body: str) -> list[str]:
    """Doc 2 §3.2 normalization for changed-line counting: per line strip BOTH leading and trailing
    whitespace, then collapse runs of consecutive blank lines to one and drop framing blanks.

    Leading whitespace (indentation) is stripped because Solidity indentation is non-semantic and a
    model re-emits the unit body at its OWN indent width: a unit stored at 8-space contract-nesting
    depth, re-emitted by the model at 4 spaces, otherwise diffs as EVERY body line changed
    (del@8sp + ins@4sp) — inflating a clean single-statement edit to ~2x the body length and falsely
    tripping the `edit too large` gate for any model that doesn't byte-preserve the source's
    indentation (observed: deepseek-pro → 100% false-reject of valid single-statement mutants).
    The §3.2 single-statement bound is about statement CONTENT, not cosmetic indentation."""
    out: list[str] = []
    prev_blank = False
    for ln in body.splitlines():
        ln = ln.strip()
        blank = ln == ""
        if blank and prev_blank:
            continue
        out.append(ln)
        prev_blank = blank
    # drop leading/trailing blank lines (pure framing)
    while out and out[0] == "":
        out.pop(0)
    while out and out[-1] == "":
        out.pop()
    return out


def _changed_lines(p_body: str, m_body: str) -> tuple[int, list[str]]:
    """Line-level unified diff of normalized bodies; changed = inserted + deleted (Doc 2 §3.2)."""
    pl = _normalize_body_lines(p_body)
    ml = _normalize_body_lines(m_body)
    hunks = list(difflib.unified_diff(pl, ml, lineterm="", n=1))
    changed = sum(
        1 for h in hunks
        if (h.startswith("+") and not h.startswith("+++"))
        or (h.startswith("-") and not h.startswith("---"))
    )
    return changed, hunks


def stage2_format_check(
    candidate: Candidate,
    original_unit_text: str,
    mutated_unit_code: str,
    unit_kind: str = "function",
    max_changed_lines: int = MAX_CHANGED_LINES_DEFAULT,
    low_value_filter: bool = False,
) -> StageResult:
    """Doc 2 §3: confinement (one unit only, signature unchanged) + body line-diff magnitude +
    operation self-report validation + optional low-value gate. M is built by splicing only the
    unit's lines (§2.2), so confinement-OUTSIDE is structural; the in-`mutated_unit_code` guards
    here stop a second declaration from being SMUGGLED into the unit span (golden §12.6/§12.7)."""
    detail: dict[str, Any] = {}

    # operation self-report (Doc 2 §3.3): absent/invalid → format_error.
    if candidate.operation not in ALLOWED_OPERATIONS:
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {"reason": f"invalid operation: {candidate.operation!r}"})

    p_split = _split_signature_body(original_unit_text)
    m_split = _split_signature_body(mutated_unit_code)
    if p_split is None or m_split is None:
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {"reason": "unit has no parseable {...} body"})
    p_header, p_body = p_split
    m_header, m_body = m_split

    # confinement (Doc 2 §3.1): exactly ONE unit — header begins with the unit's own keyword and
    # nothing but whitespace/comments follows the closing '}'. Blocks a smuggled extra decl.
    # The unit's keyword is the FIRST token of its ORIGINAL header — function / modifier / constructor
    # / fallback / receive. Do NOT hardcode "function": select.py records fallback/receive/constructor
    # with kind="function" but their header starts with their own keyword, so a hardcoded "function"
    # rejected EVERY mutation to such a unit (e.g. roulette's fallback-only contract → no valid mutant
    # → mislabeled no_test_generated). Derive it from P (line 202 already pins m_header == p_header).
    _kw_tokens = _norm_header(p_header).split("(", 1)[0].split()
    keyword = _kw_tokens[0] if _kw_tokens else ("modifier" if unit_kind == "modifier" else "function")
    if not _norm_header(m_header).startswith(keyword):
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {"reason": f"header does not start with {keyword!r}"})
    trailing = mutated_unit_code[mutated_unit_code.rfind("}") + 1 :]
    if _strip_comments(trailing).strip() != "":
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {"reason": "content after the unit body (more than one declaration)"})

    # signature unchanged (Doc 2 §3.1) — but a MODIFIER invocation is NOT part of the signature
    # (DEVIATIONS V37): compare the canonical signature (name/params/return-list/
    # visibility/mutability/override) with modifier invocations stripped, so dropping/adding/altering
    # an `onlyOwner` / `nonReentrant` guard is an allowed behavioral edit while a real param/return/
    # visibility change is still rejected.
    _p_pref, _p_kept, _p_mods = _split_header_clauses(p_header)
    _m_pref, _m_kept, _m_mods = _split_header_clauses(m_header)
    detail["modifiers_before"] = [_WS.sub(" ", x).strip() for x in _p_mods]
    detail["modifiers_after"] = [_WS.sub(" ", x).strip() for x in _m_mods]
    if _canonical_signature(p_header) != _canonical_signature(m_header):
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {**detail, "reason": "signature changed",
                            "original_signature": _canonical_signature(p_header),
                            "mutated_signature": _canonical_signature(m_header)})

    changed, hunks = _changed_lines(p_body, m_body)
    detail["changed_lines"] = changed
    detail["diff_hunks"] = hunks
    # a MODIFIER-only edit (DEVIATIONS V37) changes the header, not the body — so it is
    # a real behavioral edit even though the body line-diff is 0. Compare normalized modifier sets so a
    # mere reorder (`a b` -> `b a`) is still a no-op, but a drop/add/alter is not.
    modifiers_changed = sorted(detail["modifiers_before"]) != sorted(detail["modifiers_after"])

    if changed == 0 and not modifiers_changed:
        return StageResult("stage2", Outcome.FORMAT_ERROR, {**detail, "reason": "no-op edit"})
    if changed > max_changed_lines:
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {**detail, "reason": f"edit too large ({changed} > {max_changed_lines})"})

    # optional low-value gate (Doc 2 §3.4, default OFF): degenerate inserted/replaced statement.
    if low_value_filter and _is_low_value(p_body, m_body):
        return StageResult("stage2", Outcome.LOW_VALUE_CHANGE, {**detail, "reason": "low_value_change"})

    return StageResult("stage2", Outcome.CONTINUE, detail)


def _is_low_value(p_body: str, m_body: str) -> bool:
    """Detect a single inserted/replaced unconditional revert/assert(false)/require(false) that
    was NOT already present in P (Doc 2 §3.4). Conservative: only the clear degenerate forms."""
    m_hits = set(_LOW_VALUE_PAT.findall(m_body))
    p_hits = set(_LOW_VALUE_PAT.findall(p_body))
    return bool(m_hits - p_hits)
