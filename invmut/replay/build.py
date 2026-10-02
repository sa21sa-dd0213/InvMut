
from __future__ import annotations

import re
from typing import Any, Optional

from invmut.mutation.harness import HarnessTarget
from invmut.mutation.solast import FuncSig
from invmut.replay.translate import (
    render_runtime_safety_block,
    render_safety_check_block,
    render_during_call_refinement_block,
    _normalize_ce_asset_for_put_refinement,
    render_explicit_revert_refinement_block,
    render_return_refinement_block,
    render_state_refinement_block,
)

REPLAY_FN_PREFIX = "testReplay_"
SCHEMA = "invmut-witness-replay/v1"


_CATEGORY_TO_RENDERER = {"revert": "explicit_revert"}


def _renderer_category(category: Optional[str]) -> str:
    cat = str(category or "")
    return _CATEGORY_TO_RENDERER.get(cat, cat)


def observation_from_target(htarget: HarnessTarget, assertion_id: Optional[str]) -> dict[str, Any]:
    return {
        "assertion_id": assertion_id,
        "category": _renderer_category(htarget.category),
        "locus_name": htarget.var_name or htarget.fn_name,
        "getter_name": htarget.getter_name,
        "getter_params": list(htarget.getter_params or []),
        "leaf_type": htarget.leaf_type,
        "return_types": list(htarget.return_types or []),
        "return_projection": htarget.return_projection,
        "return_components": list(htarget.return_components or []),
    }


def witness_trace_from_values(values: dict, entries: list[FuncSig], *,
                             default_unbound_args: bool = False) -> tuple[list[dict], bool]:
    def _int(raw):
        try:
            return int(str(raw), 0)
        except (TypeError, ValueError):
            return None

    values = values if isinstance(values, dict) else {}
    trace_len = _int(values.get("__invmut_trace_len"))
    if trace_len is None or trace_len < 0:
        return [], False
    overflow = _int(values.get("__invmut_trace_overflow"))
    trace: list[dict] = []
    for slot in range(trace_len):
        pre = f"__invmut_step{slot}_"
        fn_index, argc = _int(values.get(pre + "fn")), _int(values.get(pre + "argc"))
        supported, value = _int(values.get(pre + "supported")), values.get(pre + "value")
        if fn_index is None or supported is None or value is None:
            return [], False
        if not (1 <= fn_index <= len(entries)):
            return [], False
        if supported != 1 and default_unbound_args:
            argc = len(entries[fn_index - 1].params)
        elif argc is None or argc < 0:
            return [], False
        if argc is None or argc < 0:
            return [], False
        args = []
        for i in range(argc):
            arg = values.get(pre + f"arg{i}")
            if arg is None:
                if not default_unbound_args:
                    return [], False
                arg = "0"
            args.append(str(arg))
        trace.append({"slot": slot, "function_index": fn_index,
                      "function_name": entries[fn_index - 1].name, "argc": argc, "args": args,
                      "value": str(value), "supported": supported == 1})
    complete = (overflow == 0 and len(trace) == trace_len
                and all((s["supported"] or default_unbound_args)
                        and len(s["args"]) == s["argc"] for s in trace))
    return trace, complete


def witness_trace_defect(values: dict, entries: list[FuncSig]) -> str:
    def _int(raw):
        try:
            return int(str(raw), 0)
        except (TypeError, ValueError):
            return None

    values = values if isinstance(values, dict) else {}
    trace_len = _int(values.get("__invmut_trace_len"))
    if trace_len is None:
        return "no_trace_len"
    if trace_len < 0:
        return "bad_trace_len"
    if _int(values.get("__invmut_trace_overflow")) != 0:
        return "overflow"
    for slot in range(trace_len):
        pre = f"__invmut_step{slot}_"
        fn_index = _int(values.get(pre + "fn"))
        if fn_index is None:
            return f"step{slot}_fn_unbound"
        if not (1 <= fn_index <= len(entries)):
            return f"step{slot}_fn_out_of_range"
        if values.get(pre + "value") is None:
            return f"step{slot}_value_unbound"
        if _int(values.get(pre + "supported")) != 1:
            return f"step{slot}_param_not_projectable"
        argc = _int(values.get(pre + "argc"))
        if argc is None or argc < 0:
            return f"step{slot}_argc_unbound"
        for i in range(argc):
            if values.get(pre + f"arg{i}") is None:
                return f"step{slot}_arg{i}_unbound"
    return "unknown"


def build_asset(confirmed_difference: dict, *, boundary: Optional[str], observation: dict,
                rank: int = 1) -> dict[str, Any]:
    raw = {
        "schema": SCHEMA,
        "confirmed_difference": confirmed_difference,
        "boundary": boundary,
        "packed_observation": observation,
        "cohort_rank": rank,
    }
    asset = _normalize_ce_asset_for_put_refinement(raw, fallback_rank=rank)
    if not asset.get("assertion_id") and observation.get("assertion_id"):
        asset["assertion_id"] = observation["assertion_id"]
    for key in ("primary_violation", "safety_check", "safety_violation"):
        if confirmed_difference.get(key) is not None:
            asset[key] = confirmed_difference[key]
    return asset


def translate(confirmed_difference: dict, *, target_json: dict, htarget: HarnessTarget,
              entries: list[FuncSig], constructor: Optional[FuncSig], boundary: Optional[str],
              contract_type: str = "C", constructor_fixture: Optional[dict] = None,
              wrapper_map: Optional[list[dict]] = None, source_entries: Optional[list[FuncSig]] = None,
              rank: int = 1,
              actor_from_address_key: bool = False,
              fabricated_entry_state: bool = False,
              eoa_actor: bool = False,
              default_unbound_args: bool = False,
              during_call_observer: bool = False,
              separate_deployer: bool = False,
              safety_check_oracle: bool = False) -> tuple[Optional[list[str]], dict[str, Any], Optional[str]]:
    assertion_id = ((confirmed_difference.get("oracle_asset") or {}).get("assertion_id")
                    or (confirmed_difference.get("witness_detail") or {}).get("assertion_id"))
    observation = observation_from_target(htarget, assertion_id)
    kind = _renderer_category(confirmed_difference.get("difference_kind"))
    if kind == "explicit_revert" and observation.get("category") != "explicit_revert":
        writer = (confirmed_difference.get("oracle_asset") or {}).get("revert_writer") or boundary
        observation = {"assertion_id": assertion_id, "category": "explicit_revert",
                       "locus_name": writer, "getter_name": None, "getter_params": [],
                       "leaf_type": None, "return_types": [], "return_projection": None,
                       "return_components": []}
        boundary = writer or boundary
    asset = build_asset(confirmed_difference, boundary=boundary, observation=observation, rank=rank)
    rebuilt, rebuilt_complete = witness_trace_from_values(
        asset.get("witness_values"), entries, default_unbound_args=default_unbound_args)
    declared = str(boundary or "")

    def _names(tr):
        return [s.get("function_name") for s in (tr or []) if isinstance(s, dict)]

    fallback = asset.get("witness_trace") if isinstance(asset.get("witness_trace"), list) else []
    fallback_complete = bool(asset.get("witness_trace_complete"))
    if rebuilt and rebuilt_complete:
        if (declared and declared not in _names(rebuilt) and declared in _names(fallback)
                and fallback_complete):
            pass
        else:
            asset["witness_trace"], asset["witness_trace_complete"] = rebuilt, rebuilt_complete
    elif not fallback:
        asset["witness_trace"], asset["witness_trace_complete"] = rebuilt, rebuilt_complete
    common = dict(entries=entries, constructor=constructor, contract_type=contract_type,
                  constructor_fixture=constructor_fixture, source_entries=source_entries,
                  default_unbound_args=default_unbound_args)
    category = _renderer_category(observation.get("category"))
    if during_call_observer:
        out = render_during_call_refinement_block(
            asset, observation=observation, wrapper_map=wrapper_map, **common)
        if out[0]:
            body_lines, meta, err = out
            return body_lines, {**meta, "eoa_actor": False}, err
    sv = asset.get("safety_violation") if isinstance(asset.get("safety_violation"), dict) else {}
    pair = asset.get("observed_pair") if isinstance(asset.get("observed_pair"), dict) else {}
    pair_incomplete = pair.get("original") is None or pair.get("modified") is None
    if safety_check_oracle and str(sv.get("side") or "") == "mut" and pair_incomplete:
        out = render_safety_check_block(
            asset, wrapper_map=wrapper_map, fabricated_entry_state=fabricated_entry_state,
            separate_deployer=separate_deployer, **common)
    elif str(confirmed_difference.get("difference_kind") or "") == "runtime_safety":
        out = render_runtime_safety_block(asset, wrapper_map=wrapper_map, **common)
    elif category == "explicit_revert" or str(asset.get("assertion_id") or "").startswith("R_"):
        out = render_explicit_revert_refinement_block(
            asset, wrapper_map=wrapper_map, fabricated_entry_state=fabricated_entry_state,
            separate_deployer=separate_deployer, **common)
    elif category == "state":
        out = render_state_refinement_block(asset, observation=observation,
                                            replay_actor_from_address_key=actor_from_address_key,
                                            during_call_observer=during_call_observer,
                                            **common)
    elif category == "return":
        out = render_return_refinement_block(asset, observation=observation, wrapper_map=wrapper_map,
                                             **common)
    else:
        return None, {}, f"unsupported_observation_category:{category}"
    body_lines, meta, err = out
    if eoa_actor and body_lines:
        body_lines, applied = _wrap_in_tx_origin_actor(body_lines)
        meta = {**meta, "eoa_actor": applied}
    return body_lines, meta, err


def _wrap_in_tx_origin_actor(body_lines: list[str]) -> tuple[list[str], bool]:
    if any("vm.prank(" in line or "vm.startPrank(" in line for line in body_lines):
        return body_lines, False
    return (["vm.startPrank(address(this), address(this));", *body_lines, "vm.stopPrank();"], True)


def _import_symbols(contract_type: str, body: str) -> str:
    out = [contract_type]
    for dep in re.findall(r"\bnew\s+([A-Z]\w*)\s*\(", body):
        if dep not in out:
            out.append(dep)
    return ", ".join(out)


def render_test_source(body_lines: list[str], *, difference_id: str, pragma: str, import_path: str,
                       contract_type: str = "C", test_contract: str = "InvMutTest",
                       contract_members: Optional[list[str]] = None,
                       receive_body: Optional[list[str]] = None) -> tuple[str, str]:
    fn = REPLAY_FN_PREFIX + re.sub(r"[^A-Za-z0-9_]", "_", difference_id or "ce")
    body = "\n".join(body_lines)
    members = list(contract_members or [])
    lines = [
        "// SPDX-License-Identifier: UNLICENSED",
        pragma.strip(),
        "",
        'import {Test} from "forge-std/Test.sol";',
        f'import {{{_import_symbols(contract_type, body + chr(10) + chr(10).join(members))}}} from "{import_path}";',
        "",
        f"contract {test_contract} is Test {{",
    ]
    lines += ["    " + m for m in members]
    if members:
        lines.append("")
    lines += [f"    function {fn}() public {{"]
    lines += ["        " + l for l in body_lines]
    lines += ["    }", ""]
    if receive_body:
        lines.append("    receive() external payable {")
        lines += ["        " + l for l in receive_body]
        lines.append("    }")
    else:
        lines.append("    receive() external payable {}")
    lines += ["}", ""]
    return "\n".join(lines), fn
