"""Doc-prompts §4 — mutation_memory (per target) + test_memory (per confirmed difference).

Memory is STATEFUL and passed to all four prompts. The LLM-visible rendering is PLAIN TEXT only (no ids,
no internal reason codes, §4.1/§4.5). Two dedup levels (§4.4): an exact change (unit_id+change_hash) is
excluded FOREVER under every outcome; a statement (unit_id+statement_id) is excluded only once COVERED."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Optional


def _norm_hash(text: str) -> str:
    """Whitespace-normalized hash of a code blob, so trivially-reformatted repeats dedup (§4.4). Runs of
    whitespace collapse to one space and spaces adjacent to common punctuation are removed, so cosmetic
    re-spacing (`a + 1 ;` vs `a + 1;`) is treated as the same change (avoids wasting mutation budget)."""
    s = re.sub(r"\s+", " ", text or "").strip()
    s = re.sub(r"\s*([;(){}\[\],])\s*", r"\1", s)
    return hashlib.sha256(s.encode()).hexdigest()[:16]


# outcome -> the single LLM-visible phrase (§4.5); reasons are hidden
_MUT_PHRASE = {
    "no_difference": "no visible difference",
    "inconclusive": "could not be analyzed",
    "visible_difference": "already produced a difference",
    "did_not_compile": "did not compile",
    "format_error": "not a single-statement edit",
    "duplicate_exact_change": "already tried",
    "already_caught": "already tried",
    "low_value_change": "already tried",
}


@dataclass
class MutationRecord:
    unit_id: str
    statement_id: Optional[str]
    change_hash: str
    change_summary: str
    outcome: str


@dataclass
class MutationMemory:
    records: list[MutationRecord] = field(default_factory=list)
    covered_statements: set[tuple[str, str]] = field(default_factory=set)   # (unit_id, statement_id)
    _change_keys: set[tuple[str, str]] = field(default_factory=set)         # (unit_id, change_hash)

    def seen_change(self, unit_id: str, mutated_unit_code: str) -> bool:
        return (unit_id, _norm_hash(mutated_unit_code)) in self._change_keys

    def is_covered(self, unit_id: str, statement_id: Optional[str]) -> bool:
        return statement_id is not None and (unit_id, statement_id) in self.covered_statements

    def add(self, unit_id: str, statement_id: Optional[str], mutated_unit_code: str,
            change_summary: str, outcome: str) -> None:
        ch = _norm_hash(mutated_unit_code)
        self._change_keys.add((unit_id, ch))
        self.records.append(MutationRecord(unit_id, statement_id, ch, change_summary, outcome))

    def mark_covered(self, unit_id: str, statement_id: str) -> None:
        self.covered_statements.add((unit_id, statement_id))

    # --- LLM-visible plain-text renderings -------------------------------------------------
    def render_memory(self) -> str:
        if not self.records:
            return "(none)"
        lines = []
        for r in self.records:
            phrase = _MUT_PHRASE.get(r.outcome, "already tried")
            lines.append(f"- {r.change_summary} ({phrase})")
        return "\n".join(lines)

    def render_avoid_statements(self, statement_text: dict[tuple[str, str], str] | None = None) -> str:
        if not self.covered_statements:
            return "(none)"
        out = []
        for key in sorted(self.covered_statements):
            txt = (statement_text or {}).get(key)
            out.append(f"- {txt}" if txt else f"- a statement already handled in unit {key[0]}")
        return "\n".join(out)


_TEST_PHRASE = {
    "accepted": "accepted",
    "did_not_compile": "did not compile",
    "wrong_form": "had the wrong shape",
    "malformed_test": "had the wrong shape",
    "not_parameterized": "used only fixed values",
    "trivial_assertion": "had a trivial assertion",
    "fails_on_original": "did not hold on the original",
    "holds_on_modified": "was not broken by the change",
    "m_no_cex_within_bound": "was too weak to catch the change",
    "inconclusive": "could not be analyzed",
}


@dataclass
class TestRecord:
    property_hash: str
    property_summary: str
    outcome: str


@dataclass
class TestMemory:
    records: list[TestRecord] = field(default_factory=list)
    _prop_keys: set[str] = field(default_factory=set)

    def seen_property(self, property_summary: str) -> bool:
        return _norm_hash(property_summary) in self._prop_keys

    def add(self, property_summary: str, outcome: str) -> None:
        h = _norm_hash(property_summary)
        self._prop_keys.add(h)
        self.records.append(TestRecord(h, property_summary, outcome))

    def render(self) -> str:
        if not self.records:
            return "(none)"
        return "\n".join(f"- {r.property_summary} ({_TEST_PHRASE.get(r.outcome, 'already tried')})"
                         for r in self.records)
