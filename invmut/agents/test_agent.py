
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from invmut.agents import prompts
from invmut.agents.client import LLMClient, LLMResult
from invmut.agents.jsonio import extract_json, has_keys

_TEST_KEYS = ("property_summary", "test_code")


@dataclass
class TestCandidate:
    property_summary: str
    test_code: str


@dataclass
class TestAttempt:
    prompt_label: str
    parse_ok: bool
    candidate: Optional[TestCandidate]
    llm_results: list = field(default_factory=list)


def _run(client: LLMClient, msgs: list[dict], max_retries: int, model: Optional[str],
         thinking: Optional[bool]) -> tuple[Optional[dict], list[LLMResult]]:
    results: list[LLMResult] = []
    for _ in range(max_retries + 1):
        r = client.chat(msgs, model=model, thinking=thinking, max_tokens=6144)
        results.append(r)
        d = extract_json(r.content)
        if d is not None and has_keys(d, _TEST_KEYS):
            return d, results
    return None, results


def propose_test(client: LLMClient, *, contract_code: str, contract_name: str, change: str,
                 modified_unit_code: str, difference: str, test_memory: str, max_json_retries: int = 2,
                 model: Optional[str] = None, thinking: Optional[bool] = None,
                 call_sequence: Optional[list] = None, category: Optional[str] = None,
                 template: str = "full", during_call: bool = False,
                 observer_getter: Optional[str] = None) -> TestAttempt:
    msgs = prompts.build_prompt_c(contract_code, contract_name, change, modified_unit_code, difference,
                                  test_memory, call_sequence=call_sequence, category=category,
                                  template=template, during_call=during_call,
                                  observer_getter=observer_getter)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("C", d, results)


def reflect_test(client: LLMClient, *, contract_code: str, contract_name: str, change: str,
                 modified_unit_code: str, difference: str, test_memory: str, diag_kind: str,
                 max_json_retries: int = 2, model: Optional[str] = None,
                 thinking: Optional[bool] = None, call_sequence: Optional[list] = None,
                 category: Optional[str] = None, template: str = "full", during_call: bool = False,
                 observer_getter: Optional[str] = None, **diag) -> TestAttempt:
    msgs = prompts.build_prompt_d(contract_code, contract_name, change, modified_unit_code, difference,
                                  test_memory, diag_kind, call_sequence=call_sequence, category=category,
                                  template=template, during_call=during_call,
                                  observer_getter=observer_getter, **diag)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("D", d, results)


def reflect_test_require(client: LLMClient, *, contract_code: str, contract_name: str, test_code: str,
                         test_memory: str, mode: str, counterexample: Optional[str] = None,
                         error_hint: Optional[str] = None, max_json_retries: int = 2,
                         model: Optional[str] = None, thinking: Optional[bool] = None,
                         allow_setup: bool = False) -> TestAttempt:
    msgs = prompts.build_prompt_require(contract_code, contract_name, test_code, test_memory,
                                        mode=mode, counterexample=counterexample, error_hint=error_hint,
                                        allow_setup=allow_setup)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("REQ", d, results)


def propose_llm_test(client: LLMClient, *, contract_code: str, contract_name: str, change: str,
                     modified_unit_code: str, goal: str, boundary: str, import_path: str, pragma: str,
                     construction: str, test_memory: str, construction_body: str = "",
                     construction_decls: str = "", public_surface: str = "",
                      observer_helper: bool = False, live_callback: bool = False, sig_cheats: bool = False,
                     file_types: str = "",
                      max_json_retries: int = 2,
                     model: Optional[str] = None, thinking: Optional[bool] = None) -> TestAttempt:
    msgs = prompts.build_prompt_llm_test(contract_code, contract_name, change, modified_unit_code, goal,
                                         boundary, import_path, pragma, construction, test_memory,
                                         construction_body, construction_decls, public_surface,
                                         observer_helper, live_callback, sig_cheats, file_types)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("LLM_TEST", d, results)


def reflect_llm_test(client: LLMClient, *, contract_code: str, contract_name: str, change: str,
                     modified_unit_code: str, goal: str, boundary: str, import_path: str, pragma: str,
                     construction: str, test_memory: str, diag_kind: str, construction_body: str = "",
                     construction_decls: str = "", public_surface: str = "",
                      observer_helper: bool = False, live_callback: bool = False, sig_cheats: bool = False,
                     file_types: str = "",
                      max_json_retries: int = 2,
                     model: Optional[str] = None, thinking: Optional[bool] = None, **diag) -> TestAttempt:
    msgs = prompts.build_prompt_llm_test_reflect(contract_code, contract_name, change, modified_unit_code,
                                                 goal, boundary, import_path, pragma, construction,
                                                 test_memory, diag_kind, construction_body,
                                                 construction_decls, public_surface,
                                                 observer_helper, live_callback, sig_cheats, file_types, **diag)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("LLM_TEST_R", d, results)


def _attempt(label: str, d: Optional[dict], results: list[LLMResult]) -> TestAttempt:
    if d is None:
        return TestAttempt(label, False, None, results)
    return TestAttempt(label, True, TestCandidate(str(d["property_summary"]), str(d["test_code"])), results)


def propose_pbt(client: LLMClient, *, contract_code: str, contract_name: str, focus: Optional[str] = None,
                boundary: Optional[str] = None, accepted_memory: str = "", test_memory: str = "",
                previous_test: Optional[str] = None, diag_kind: Optional[str] = None,
                max_json_retries: int = 2, model: Optional[str] = None, thinking: Optional[bool] = None,
                **diag) -> TestAttempt:
    msgs = prompts.build_prompt_pbt(contract_code, contract_name, focus=focus, boundary=boundary,
                                    accepted_memory=accepted_memory, test_memory=test_memory,
                                    previous_test=previous_test, diag_kind=diag_kind, **diag)
    d, results = _run(client, msgs, max_json_retries, model, thinking)
    return _attempt("PBT_R" if diag_kind else "PBT", d, results)
