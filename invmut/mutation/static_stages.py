
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from typing import Any, Callable, Optional

from invmut.mutation.model import ALLOWED_OPERATIONS, Candidate, Outcome, StageResult

MAX_CHANGED_LINES_DEFAULT = 4



@dataclass(frozen=True)
class BuildResult:
    m_source: Optional[str]
    original_unit_text: str
    error: Optional[str]


def resolve_and_build(p_source: str, unit_record: dict, mutated_unit_code: str) -> BuildResult:
    kind = unit_record.get("kind")
    if kind not in ("function", "modifier"):
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



def stage0_dedup(candidate: Candidate, seen_change_hashes: set[str]) -> StageResult:
    h = candidate.change_hash()
    if h in seen_change_hashes:
        return StageResult("stage0", Outcome.DUPLICATE_EXACT_CHANGE, {"change_hash": h})
    return StageResult("stage0", Outcome.CONTINUE, {"change_hash": h})



@dataclass(frozen=True)
class CompileResult:
    ok: bool
    diagnostics: str


CompileFn = Callable[[str], CompileResult]


def stage1_build_compile(
    candidate: Candidate, p_source: str, unit_record: dict, compile_fn: CompileFn
) -> tuple[StageResult, Optional[str]]:
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



_LOW_VALUE_PAT = re.compile(
    r"^\s*(revert\s*\(|revert\s+\w|assert\s*\(\s*false\s*\)|require\s*\(\s*false\b)", re.M
)


def _split_signature_body(unit_text: str) -> Optional[tuple[str, str]]:
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
    return _WS.sub(" ", header).strip()


_HEADER_KEYWORDS = {"public", "external", "internal", "private", "pure", "view", "payable",
                    "nonpayable", "virtual", "override", "returns", "constant", "anonymous"}


def _match_paren(s: str, i: int) -> int:
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
    lp = header.find("(")
    if lp < 0:
        return header.strip(), [], []
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
        if not tok:
            i += 1
            continue
        is_kw = tok in _HEADER_KEYWORDS
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
    prefix, kept, _mods = _split_header_clauses(header)
    norm_kept = sorted(_WS.sub("", c) for c in kept)
    return _norm_header(prefix) + " || " + " ".join(norm_kept)


def _normalize_body_lines(body: str) -> list[str]:
    out: list[str] = []
    prev_blank = False
    for ln in body.splitlines():
        ln = ln.strip()
        blank = ln == ""
        if blank and prev_blank:
            continue
        out.append(ln)
        prev_blank = blank
    while out and out[0] == "":
        out.pop(0)
    while out and out[-1] == "":
        out.pop()
    return out


def _changed_lines(p_body: str, m_body: str) -> tuple[int, list[str]]:
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
    detail: dict[str, Any] = {}

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

    _kw_tokens = _norm_header(p_header).split("(", 1)[0].split()
    keyword = _kw_tokens[0] if _kw_tokens else ("modifier" if unit_kind == "modifier" else "function")
    if not _norm_header(m_header).startswith(keyword):
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {"reason": f"header does not start with {keyword!r}"})
    trailing = mutated_unit_code[mutated_unit_code.rfind("}") + 1 :]
    if _strip_comments(trailing).strip() != "":
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {"reason": "content after the unit body (more than one declaration)"})

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
    modifiers_changed = sorted(detail["modifiers_before"]) != sorted(detail["modifiers_after"])

    if changed == 0 and not modifiers_changed:
        return StageResult("stage2", Outcome.FORMAT_ERROR, {**detail, "reason": "no-op edit"})
    if changed > max_changed_lines:
        return StageResult("stage2", Outcome.FORMAT_ERROR,
                           {**detail, "reason": f"edit too large ({changed} > {max_changed_lines})"})

    if low_value_filter and _is_low_value(p_body, m_body):
        return StageResult("stage2", Outcome.LOW_VALUE_CHANGE, {**detail, "reason": "low_value_change"})

    return StageResult("stage2", Outcome.CONTINUE, detail)


def _is_low_value(p_body: str, m_body: str) -> bool:
    m_hits = set(_LOW_VALUE_PAT.findall(m_body))
    p_hits = set(_LOW_VALUE_PAT.findall(p_body))
    return bool(m_hits - p_hits)
