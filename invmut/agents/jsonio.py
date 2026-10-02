
from __future__ import annotations

import json
import re
from typing import Optional


def _loads(s: str) -> Optional[dict]:
    try:
        v = json.loads(s, strict=False)
        return v if isinstance(v, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None


def _strip_trailing_commas(s: str) -> str:
    out = []
    in_str = False
    esc = False
    n = len(s)
    for i, ch in enumerate(s):
        if in_str:
            out.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            out.append(ch)
            continue
        if ch == ",":
            j = i + 1
            while j < n and s[j] in " \t\r\n":
                j += 1
            if j < n and s[j] in "}]":
                continue
        out.append(ch)
    return "".join(out)


def _first_object(s: str) -> Optional[str]:
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(s)):
        ch = s[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return None


def extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    s = text.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", s, re.DOTALL)
    if m:
        s = m.group(1).strip()
    for cand in (s, _first_object(s)):
        if not cand:
            continue
        d = _loads(cand)
        if d is not None:
            return d
        d = _loads(_strip_trailing_commas(cand))
        if d is not None:
            return d
    return None


def has_keys(d: dict, keys: tuple[str, ...]) -> bool:
    return all(k in d and d[k] is not None for k in keys)
