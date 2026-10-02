"""Doc-prompts §8/§9 — the mutation agent (Prompt A generate, Prompt B mechanical-reflection).

Wraps prompt build + LLMClient.chat + JSON parse with ≤max_json_retries_per_call retries (§14). The
returned MutationAttempt carries the parsed candidate (or parse_ok=False for a persistent json_parse_error)
plus every LLMResult for attempts.jsonl. Budgets + memory dedup are the orchestrator's job."""

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
    prompt_label: str                 # "A" | "B"
    parse_ok: bool
    candidate: Optional[MutationCandidate]
    llm_results: list = field(default_factory=list)


@dataclass
class MutationBatchAttempt:
    """RQ1 LLM-only batch: ONE call yields a LIST of FOMs (ERRORS #145). parse_ok iff at least one
    well-formed mutant parsed; malformed list items are skipped, not retried."""
    prompt_label: str                 # "LLM_MUT_BATCH"
    parse_ok: bool
    candidates: list                  # list[MutationCandidate]
    llm_results: list = field(default_factory=list)


def _run(client: LLMClient, msgs: list[dict], max_retries: int, model: Optional[str],
         thinking: Optional[bool]) -> tuple[Optional[dict], list[LLMResult]]:
    results: list[LLMResult] = []
    for _ in range(max_retries + 1):
        # generous cap so a mutated unit is NEVER truncated mid-source (truncation -> compile failure)
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
    """RQ1 LLM-only: one boundary-aware mutant for a (target y, boundary x) cell. No reflection — a failed
    proposal drops the cell (USER 2026-06-26). Same JSON schema/parser as Prompt A."""
    msgs = prompts.build_prompt_llm_mutate(contract_code, editable_units, goal, boundary, mutation_memory)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("LLM_MUT", d, results)


def _salvage_mutants(text: str) -> list[MutationCandidate]:
    """Recover every COMPLETE mutant object from `text`, even if the surrounding `{"mutants":[...]}` was cut
    off mid-array by a max_tokens truncation (codex review): scan balanced {...} blocks and keep the ones
    that json-parse to a dict with all _MUT_KEYS. So a truncated reply still yields its complete FOMs."""
    import json as _json
    out: list[MutationCandidate] = []
    stack: list[int] = []        # start index of each open '{' — captures balanced objects at ANY depth,
    in_str = False               # so the per-mutant objects inside an unterminated array are recovered
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
    """RQ1 LLM-only: ONE call per target → ALL FOMs of that target's behavior as a list (ERRORS #145, no
    per-boundary fan-out, no reflection). Returns every well-formed mutant; a failed parse drops the target.
    A max_tokens truncation does NOT lose the whole target — _salvage_mutants keeps the complete FOMs.
    `patch_diff` (diff-anchored mutation, USER 2026-06-30): when set, the mutate prompt is told to ALSO emit a
    mutant that reverts the patch (M ~= the real bug), so the mutant faithfully proxies the vulnerability."""
    msgs = prompts.build_prompt_llm_mutate_batch(contract_code, editable_units, goal, boundaries,
                                                 patch_diff=patch_diff, fewshot=fewshot,
                                                 precondition_note=precondition_note,
                                                 statement_coverage=statement_coverage,
                                                 call_order=call_order)
    results: list[LLMResult] = []
    for _ in range(max_json_retries + 1):
        # generous cap: a target yields many mutated unit BODIES in one reply (you only pay for tokens
        # actually emitted, so a high cap is free insurance against truncating the FOM list).
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
        # primary parse failed (e.g. truncated/unterminated array) — salvage complete objects before retry
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
