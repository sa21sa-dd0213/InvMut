"""Data model for the Doc 2 mutation-candidate validation pipeline.

The complete JSON contract is fixed HERE up front (per the project policy of nailing the schema
before wiring stages, to avoid mid-experiment data churn). Three record types:

- `Candidate`  — the LLM's proposed one-statement edit (Doc prompts → Doc 2 §0.2 input).
- `StageResult`— one stage's verdict + evidence (mechanical; feeds the memory record).
- `ValidationResult` — the terminal outcome of the whole pipeline for one candidate, including
  the confirmed-difference block (Doc 2 §8) when a visible difference is confirmed.

Outcome strings are the SINGLE source for Doc 2 §7's memory/next-prompt table.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Optional


# --- outcome vocabulary (Doc 2 §0.2 / §7) -------------------------------------------------

class Outcome:
    """Terminal pipeline outcomes (Doc 2 §7) plus the internal CONTINUE sentinel."""
    DUPLICATE_EXACT_CHANGE = "duplicate_exact_change"  # stage 0  → Prompt A (counts to budget)
    DID_NOT_COMPILE = "did_not_compile"                # stage 1  → Prompt B
    FORMAT_ERROR = "format_error"                      # stage 2  → Prompt B
    LOW_VALUE_CHANGE = "low_value_change"              # stage 2  → Prompt A (filter on only)
    ALREADY_CAUGHT = "already_caught"                  # stage 3  → Prompt A (silent)
    VISIBLE_DIFFERENCE = "visible_difference"          # stage 4/5 → test loop
    NO_DIFFERENCE = "no_difference"                    # stage 5  → Prompt A
    INCONCLUSIVE = "inconclusive"                      # stage 3/5 infra → Prompt A
    # internal: a stage passed and the pipeline should proceed to the next stage.
    CONTINUE = "continue"


# next-prompt routing for Doc 2 §7 (the loop reads this; "test_loop" hands to Doc 3).
NEXT_PROMPT = {
    Outcome.DID_NOT_COMPILE: "B",
    Outcome.FORMAT_ERROR: "B",
    Outcome.LOW_VALUE_CHANGE: "A",
    Outcome.DUPLICATE_EXACT_CHANGE: "A",
    Outcome.ALREADY_CAUGHT: "A",
    Outcome.VISIBLE_DIFFERENCE: "test_loop",
    Outcome.NO_DIFFERENCE: "A",
    Outcome.INCONCLUSIVE: "A",
}

# outcomes that, when rendered into {{MUTATION_MEMORY}}, read as "already tried" (Doc 2 §7).
RENDERED_ALREADY_TRIED = frozenset({Outcome.DUPLICATE_EXACT_CHANGE, Outcome.LOW_VALUE_CHANGE})

ALLOWED_OPERATIONS = ("replace", "insert", "delete", "move")


# --- candidate (LLM output) ---------------------------------------------------------------

@dataclass(frozen=True)
class Candidate:
    """One LLM-proposed mutant (Doc 2 §0.2). `mutated_unit_code` is the FULL replacement source
    for the unit identified by `unit_id` (signature + body), still using P's original contract
    name `C` (renaming happens only in the R2 harness, Doc 2 §6.3)."""
    target_id: str
    unit_id: str
    operation: str
    change_summary: str
    mutated_unit_code: str

    def change_hash(self) -> str:
        """Stage-0 dedup key (Doc 2 §1): unit_id + whitespace-normalized mutated code."""
        return change_hash(self.unit_id, self.mutated_unit_code)


_WS = re.compile(r"\s+")


def change_hash(unit_id: str, mutated_unit_code: str) -> str:
    """Normalize whitespace (collapse all runs to one space, strip) so reformatting alone does
    not evade the dedup; hash with the unit_id so the same text under a different unit is a
    distinct change (Doc 2 §1)."""
    norm = _WS.sub(" ", mutated_unit_code).strip()
    return hashlib.sha256(f"{unit_id}\x00{norm}".encode()).hexdigest()


# --- per-stage result ---------------------------------------------------------------------

@dataclass
class StageResult:
    """One stage's verdict. `outcome` is Outcome.CONTINUE when the stage passed and the pipeline
    should advance, otherwise a terminal Outcome.*. `detail` carries stage-specific evidence
    (changed_lines, diff hunks, compiler diagnostics, verifier command/verdict, ...)."""
    stage: str
    outcome: str
    detail: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.outcome == Outcome.CONTINUE


# --- terminal validation result -----------------------------------------------------------

@dataclass
class ValidationResult:
    """Terminal outcome of the whole pipeline for one candidate (Doc 2 §7 + §8)."""
    candidate: Candidate
    change_hash: str
    outcome: str                         # terminal Outcome.*
    stage_reached: str                   # last stage that ran ("stage0".."stage5")
    stages: list[StageResult] = field(default_factory=list)
    confirmed_difference: Optional[dict] = None   # Doc 2 §8 block (visible_difference only)
    memory_record: dict[str, Any] = field(default_factory=dict)

    @property
    def next_prompt(self) -> str:
        return NEXT_PROMPT[self.outcome]

    @property
    def rendered_already_tried(self) -> bool:
        return self.outcome in RENDERED_ALREADY_TRIED

    def to_dict(self) -> dict[str, Any]:
        return {
            "candidate": {
                "target_id": self.candidate.target_id,
                "unit_id": self.candidate.unit_id,
                "operation": self.candidate.operation,
                "change_summary": self.candidate.change_summary,
                "mutated_unit_code": self.candidate.mutated_unit_code,
            },
            "change_hash": self.change_hash,
            "outcome": self.outcome,
            "next_prompt": self.next_prompt,
            "stage_reached": self.stage_reached,
            "stages": [{"stage": s.stage, "outcome": s.outcome, "detail": s.detail}
                       for s in self.stages],
            "confirmed_difference": self.confirmed_difference,
            "memory_record": self.memory_record,
        }
