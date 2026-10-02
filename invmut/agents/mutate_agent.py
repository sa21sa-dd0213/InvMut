
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from invmut.agents import prompts
from invmut.agents.client import LLMClient, LLMResult
from invmut.agents.jsonio import extract_json, has_keys

_MUT_KEYS = ("unit_id", "operation", "change_summary", "mutated_unit_code")


@dataclass
class MutationCandidate:
    unit_id: str
    operation: str
    change_summary: str
    mutated_unit_code: str


@dataclass
class MutationAttempt:
    prompt_label: str
    parse_ok: bool
    candidate: Optional[MutationCandidate]
    llm_results: list = field(default_factory=list)


@dataclass
class MutationBatchAttempt:
    prompt_label: str
    parse_ok: bool
    candidates: list
    llm_results: list = field(default_factory=list)


def _run(client: LLMClient, msgs: list[dict], max_retries: int, model: Optional[str],
         thinking: Optional[bool]) -> tuple[Optional[dict], list[LLMResult]]:
    results: list[LLMResult] = []
    for _ in range(max_retries + 1):
        r = client.chat(msgs, model=model, thinking=thinking, max_tokens=4096)
        results.append(r)
        d = extract_json(r.content)
        if d is not None and has_keys(d, _MUT_KEYS):
            return d, results
    return None, results


def propose_mutation(client: LLMClient, *, contract_code: str, editable_units: str, goal: str,
                     mutation_memory: str, avoid_statements: str, max_json_retries: int = 2,
                     model: Optional[str] = None, thinking: Optional[bool] = None) -> MutationAttempt:
    msgs = prompts.build_prompt_a(contract_code, editable_units, goal, mutation_memory, avoid_statements)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("A", d, results)


def propose_llm_mutant(client: LLMClient, *, contract_code: str, editable_units: str, goal: str,
                       boundary: str, mutation_memory: str, max_json_retries: int = 2,
                       model: Optional[str] = None, thinking: Optional[bool] = None) -> MutationAttempt:
    msgs = prompts.build_prompt_llm_mutate(contract_code, editable_units, goal, boundary, mutation_memory)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("LLM_MUT", d, results)


def _salvage_mutants(text: str) -> list[MutationCandidate]:
    import json as _json
    out: list[MutationCandidate] = []
    stack: list[int] = []
    in_str = False
    esc = False
    for i, ch in enumerate(text):
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
            stack.append(i)
        elif ch == "}" and stack:
            start = stack.pop()
            try:
                m = _json.loads(text[start:i + 1])
            except (ValueError, _json.JSONDecodeError):
                m = None
            if isinstance(m, dict) and has_keys(m, _MUT_KEYS):
                out.append(MutationCandidate(str(m["unit_id"]), str(m["operation"]),
                                             str(m["change_summary"]), str(m["mutated_unit_code"])))
    return out


def propose_llm_mutants(client: LLMClient, *, contract_code: str, editable_units: str, goal: str,
                        boundaries: str, max_json_retries: int = 2, model: Optional[str] = None,
                        thinking: Optional[bool] = None,
                        patch_diff: Optional[str] = None,
                        fewshot: Optional[str] = None,
                        precondition_note: str = "",
                        statement_coverage: bool = False,
                        call_order: bool = False) -> MutationBatchAttempt:
    msgs = prompts.build_prompt_llm_mutate_batch(contract_code, editable_units, goal, boundaries,
                                                 patch_diff=patch_diff, fewshot=fewshot,
                                                 precondition_note=precondition_note,
                                                 statement_coverage=statement_coverage,
                                                 call_order=call_order)
    results: list[LLMResult] = []
    for _ in range(max_json_retries + 1):
        r = client.chat(msgs, model=model, thinking=thinking, max_tokens=16384)
        results.append(r)
        d = extract_json(r.content)
        items = d.get("mutants") if isinstance(d, dict) else None
        if isinstance(items, list):
            cands = [MutationCandidate(str(m["unit_id"]), str(m["operation"]), str(m["change_summary"]),
                                       str(m["mutated_unit_code"]))
                     for m in items if isinstance(m, dict) and has_keys(m, _MUT_KEYS)]
            if cands:
                return MutationBatchAttempt("LLM_MUT_BATCH", True, cands, results)
        salvaged = _salvage_mutants(r.content)
        if salvaged:
            return MutationBatchAttempt("LLM_MUT_BATCH", True, salvaged, results)
    return MutationBatchAttempt("LLM_MUT_BATCH", False, [], results)


def reflect_mutation(client: LLMClient, *, contract_code: str, editable_units: str, goal: str,
                     mutation_memory: str, avoid_statements: str, diag_kind: str,
                     max_json_retries: int = 2, model: Optional[str] = None,
                     thinking: Optional[bool] = None, **diag) -> MutationAttempt:
    msgs = prompts.build_prompt_b(contract_code, editable_units, goal, mutation_memory, avoid_statements,
                                  diag_kind, **diag)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("B", d, results)


def _attempt(label: str, d: Optional[dict], results: list[LLMResult]) -> MutationAttempt:
    if d is None:
        return MutationAttempt(label, False, None, results)
    cand = MutationCandidate(str(d["unit_id"]), str(d["operation"]), str(d["change_summary"]),
                             str(d["mutated_unit_code"]))
    return MutationAttempt(label, True, cand, results)
