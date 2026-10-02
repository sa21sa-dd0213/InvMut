
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Optional



class Outcome:
    DUPLICATE_EXACT_CHANGE = "duplicate_exact_change"
    DID_NOT_COMPILE = "did_not_compile"
    FORMAT_ERROR = "format_error"
    LOW_VALUE_CHANGE = "low_value_change"
    ALREADY_CAUGHT = "already_caught"
    VISIBLE_DIFFERENCE = "visible_difference"
    NO_DIFFERENCE = "no_difference"
    INCONCLUSIVE = "inconclusive"
    CONTINUE = "continue"


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

RENDERED_ALREADY_TRIED = frozenset({Outcome.DUPLICATE_EXACT_CHANGE, Outcome.LOW_VALUE_CHANGE})

ALLOWED_OPERATIONS = ("replace", "insert", "delete", "move")



@dataclass(frozen=True)
class Candidate:
    target_id: str
    unit_id: str
    operation: str
    change_summary: str
    mutated_unit_code: str

    def change_hash(self) -> str:
        return change_hash(self.unit_id, self.mutated_unit_code)


_WS = re.compile(r"\s+")


def change_hash(unit_id: str, mutated_unit_code: str) -> str:
    norm = _WS.sub(" ", mutated_unit_code).strip()
    return hashlib.sha256(f"{unit_id}\x00{norm}".encode()).hexdigest()



@dataclass
class StageResult:
    stage: str
    outcome: str
    detail: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.outcome == Outcome.CONTINUE



@dataclass
class ValidationResult:
    candidate: Candidate
    change_hash: str
    outcome: str
    stage_reached: str
    stages: list[StageResult] = field(default_factory=list)
    confirmed_difference: Optional[dict] = None
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
