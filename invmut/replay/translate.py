"""Witness Replay Translation: turn one differential counterexample into a fixed-input test.

Mechanical, no LLM. The renderers below take the counterexample's own call sequence, arguments,
transferred value and recorded reference observation, and emit assertions against the reference
values: an exit-status assertion for a reverting reference call, a state read for a state
observation, and the selected return components for a return observation.

Ported verbatim from the post-hoc planning script that produced the merged oracle blocks, with
four deliberate differences:
  * no coverage-search prefix and no region widening -- a replay reproduces the witness and nothing
    else; a state prefix synthesised by branch-coverage search is property-test work;
  * the emitted body becomes its own test entry point, not a block inlined into a property test;
  * the caller runs the result on both versions and keeps it only when the assertions pass on the
    reference and one of them fails on the mutant;
  * the state-replay actor adaptation degrades to the plain rendering when the witness's address key
    cannot serve as the caller, instead of refusing the whole witness -- the source script ran on a
    hand-picked cohort, this module runs on every difference the pipeline confirms.
"""

from __future__ import annotations

import json
import re
from typing import Any

from invmut.mutation.solast import FuncSig


def _truthy_bool(value: Any) -> bool | None:
    text = str(value).strip().lower()
    if text in {"1", "true", "yes"}:
        return True
    if text in {"0", "false", "no"}:
        return False
    return None


def _mentions_msg_sender_owner_guard(asset: dict[str, Any]) -> bool:
    blobs: list[str] = []
    for top_key in ("change_summary", "mutated_unit_code", "source_unit_code", "original_unit_code"):
        value = asset.get(top_key)
        if isinstance(value, str):
            blobs.append(value)
    for nested_key in ("candidate", "confirmed_difference"):
        value = asset.get(nested_key)
        if isinstance(value, dict):
            for field in ("change_summary", "mutated_unit_code", "source_unit_code", "original_unit_code", "operation"):
                field_value = value.get(field)
                if isinstance(field_value, str):
                    blobs.append(field_value)
    text = "\n".join(blobs)
    if not text:
        return False
    compact = re.sub(r"\s+", "", text.lower())
    return bool(
        re.search(r"msg\.sender==[a-z0-9_]*owner", compact)
        or re.search(r"[a-z0-9_]*owner==msg\.sender", compact)
        or (
            "require" in text.lower()
            and "allowing any caller" in text.lower()
            and str(_nested_confirmed_difference(asset).get("operation") or asset.get("operation") or "").lower()
            in {"delete", "remove", "replace"}
        )
    )


def _declared_boundary(asset: dict[str, Any]) -> str | None:
    """The function the verifier actually asserted on, as the asset itself names it.

    The bounded trace's LAST step is not always that call. MEASURED on the 251 recorded witnesses
    that carry a trace: 4 end on a different function (e.g. boundary `SetLogFile` with trace
    `[Collect]`). Rendering `trace[-1]` there states the revert flag of a call the difference was
    never about, so the boundary has to be located by name.
    """
    oa = _nested_oracle_asset(asset)
    cd = _nested_confirmed_difference(asset)
    observation = asset.get("packed_observation")
    observation = observation if isinstance(observation, dict) else {}
    for value in (oa.get("revert_writer"), oa.get("boundary_writer"),
                  observation.get("locus_name") if observation.get("category") == "explicit_revert" else None,
                  asset.get("boundary"), cd.get("boundary")):
        if isinstance(value, str) and _valid_identifier(value):
            return value
    return None


def _category_tokens(asset: dict[str, Any]) -> set[str]:
    raw = asset.get("observation_category_key")
    if isinstance(raw, str) and raw:
        return {part for part in raw.split("+") if part and part != "<none>"}
    return {
        str(value)
        for value in asset.get("observation_categories") or []
        if str(value)
    }


def _nonempty(value: Any) -> bool:
    return value not in (None, "", [], {})


def _nested_oracle_asset(asset: dict[str, Any]) -> dict[str, Any]:
    direct = asset.get("oracle_asset")
    if isinstance(direct, dict):
        return direct
    cd = asset.get("confirmed_difference")
    if isinstance(cd, dict) and isinstance(cd.get("oracle_asset"), dict):
        return cd["oracle_asset"]
    return {}


def _nested_confirmed_difference(asset: dict[str, Any]) -> dict[str, Any]:
    cd = asset.get("confirmed_difference")
    return cd if isinstance(cd, dict) else {}


def _category_from_observation(
    assertion_id: str,
    observation: dict[str, Any] | None,
    difference_kind: Any,
) -> str:
    if isinstance(observation, dict) and observation.get("category"):
        return str(observation.get("category"))
    if assertion_id.startswith("R_"):
        return "explicit_revert"
    if assertion_id.startswith("S_"):
        return "state"
    if assertion_id.startswith("V_"):
        return "return"
    if str(difference_kind or "") == "revert":
        return "explicit_revert"
    return str(difference_kind or "")


def _call_sequence_names(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    names: list[str] = []
    for item in raw:
        if isinstance(item, dict):
            name = str(item.get("function") or item.get("function_name") or "")
        else:
            name = str(item or "")
        if name:
            names.append(name)
    return names


def _trace_from_call_sequence(raw: Any) -> tuple[list[dict[str, Any]], bool]:
    if not isinstance(raw, list) or not raw:
        return [], False
    trace: list[dict[str, Any]] = []
    for slot, item in enumerate(raw):
        if not isinstance(item, dict):
            return [], False
        name = str(item.get("function") or item.get("function_name") or "")
        if not name:
            return [], False
        args = item.get("args")
        # `call_sequence` records the function NAMES of the path; only the boundary step carries the
        # recorded arguments (mutation/confirmed.py fills `args` for that step alone). Turning a
        # missing `args` into `[]` made a call whose arguments were never recorded look like a call
        # with no arguments -- the renderer then either failed `arg_arity_mismatch` or, for a
        # 0-parameter entry, emitted a call the witness never pinned. Mark it unsupported instead,
        # which makes the trace incomplete and the renderers refuse.
        supported = isinstance(args, list)
        if args is None:
            args = []
            supported = False
        if not isinstance(args, list):
            return [], False
        try:
            function_index = int(str(item.get("function_index") or slot + 1))
        except ValueError:
            function_index = slot + 1
        trace.append({
            "slot": slot,
            "function_index": function_index,
            "function_name": name,
            "argc": len(args),
            "args": [str(arg) for arg in args],
            "value": str(item.get("value") if item.get("value") is not None else "0"),
            "supported": supported,
        })
    return trace, all(step["supported"] for step in trace)


def _normalize_ce_asset_for_put_refinement(
    asset: dict[str, Any],
    *,
    fallback_rank: int,
) -> dict[str, Any]:
    """Normalize timing-cohort and local-pack CE assets into one planner shape.

    Older R2 local-pack assets kept the actual oracle fields under
    ``oracle_asset``/``confirmed_difference.oracle_asset``.  The PUT planner is
    intentionally assertion-local, so this adapter only hoists fields from that
    same asset record; it does not import data across trials, cases, or packs.
    """
    out = dict(asset)
    oa = _nested_oracle_asset(asset)
    cd = _nested_confirmed_difference(asset)
    witness_detail = cd.get("witness_detail") if isinstance(cd.get("witness_detail"), dict) else {}
    for key in (
        "source_stage",
        "pack_key",
        "assertion_id",
        "observed_pair",
        "observed_values",
        "witness_values",
        "packed_observation",
        "constructor_args",
    ):
        if not _nonempty(out.get(key)) and _nonempty(oa.get(key)):
            out[key] = oa.get(key)
        if not _nonempty(out.get(key)) and _nonempty(cd.get(key)):
            out[key] = cd.get(key)
        if not _nonempty(out.get(key)) and _nonempty(witness_detail.get(key)):
            out[key] = witness_detail.get(key)

    raw_call_sequence = out.get("call_sequence")
    if not _nonempty(raw_call_sequence):
        raw_call_sequence = oa.get("call_sequence") or cd.get("call_sequence")
    if isinstance(raw_call_sequence, list):
        out["call_sequence"] = _call_sequence_names(raw_call_sequence)

    if not isinstance(out.get("witness_trace"), list) or not out.get("witness_trace"):
        trace, complete = _trace_from_call_sequence(raw_call_sequence)
        if trace:
            out["witness_trace"] = trace
            out["witness_trace_complete"] = complete
    if "witness_trace_complete" not in out and _nonempty(oa.get("witness_trace_complete")):
        out["witness_trace_complete"] = oa.get("witness_trace_complete")

    observation = out.get("packed_observation")
    observation = observation if isinstance(observation, dict) else None
    assertion_id = str(out.get("assertion_id") or "")
    category = _category_from_observation(
        assertion_id,
        observation,
        out.get("assertion_category") or out.get("difference_kind") or oa.get("difference_kind"),
    )
    if category and not _nonempty(out.get("assertion_category")):
        out["assertion_category"] = category
    if category and not _nonempty(out.get("observation_category_key")):
        out["observation_category_key"] = category
    if not _nonempty(out.get("cohort_rank")):
        out["cohort_rank"] = out.get("validation_queue_rank") or fallback_rank
    if not _nonempty(out.get("source_stage")) and _nonempty(oa.get("source_stage")):
        out["source_stage"] = oa.get("source_stage")
    return out


def _valid_identifier(name: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name or ""))


def _is_address_like(type_text: str) -> bool:
    return bool(re.fullmatch(r"address(?:\s+payable)?", (type_text or "").strip()))


def _dyn_array_elem(type_text: str) -> str | None:
    typ = (type_text or "").strip()
    for loc in (" memory", " calldata", " storage"):
        if typ.endswith(loc):
            typ = typ[: -len(loc)].strip()
    if not typ.endswith("[]"):
        return None
    elem = typ[:-2].strip()
    if "[" in elem or "]" in elem:
        return None
    if _is_address_like(elem) or elem.startswith(("uint", "int", "bool", "bytes")):
        return elem
    return None


def _dyn_bytes(type_text: str) -> bool:
    typ = (type_text or "").strip()
    for loc in (" memory", " calldata", " storage"):
        if typ.endswith(loc):
            typ = typ[: -len(loc)].strip()
    return typ == "bytes"



_DECL_CONTRACT = re.compile(r"^\s*(?:abstract\s+)?contract\s+(\w+)", re.M)


def declared_dependency_etch_lines(p_source: str, contract_type: str) -> list[str]:
    """Install, at the address the subject itself names, the code of the dependency it itself declares.

    These subjects hold a handle to another contract declared in the SAME flattened source
    (`LogFile Log;`, or `LogFile Log = LogFile(0x0486...)`) and call it on the write path. ESBMC does
    not model `extcodesize`, so in the model that call returns without reverting and the
    counterexample's path goes through it. On a real EVM the address holds no code and the call
    reverts, so the replay dies before its assertion and the witness is thrown away -- measured on
    two single differences: P FAIL -> PASS once the code is there.

    Nothing here is invented: the contract TYPE is the subject's own declaration, the ADDRESS is the
    subject's own literal (or the 0 its declaration defaults to), and the code installed is that
    declared contract's own. It restores the callee the model assumed, it does not add behaviour.
    Only a dependency whose constructor takes no arguments is installed; anything else is left alone.
    """
    declared = set(_DECL_CONTRACT.findall(p_source or ""))
    declared.discard(contract_type)
    if not declared:
        return []
    # a dependency is only deployable here when its own constructor needs no arguments
    deployable = set()
    for name in declared:
        m = re.search(r"^\s*(?:abstract\s+)?contract\s+" + re.escape(name) + r"\b", p_source, re.M)
        if not m:
            continue
        nxt = _DECL_CONTRACT.search(p_source, m.end())
        body = p_source[m.start(): nxt.start() if nxt else len(p_source)]
        if re.search(r"\babstract\s+contract\b", body[:body.find("{") + 1] or ""):
            continue
        ctor = re.search(r"\bconstructor\s*\(([^)]*)\)", body)
        if ctor and ctor.group(1).strip():
            continue
        deployable.add(name)
    out: list[str] = []
    seen: set[str] = set()
    for m in re.finditer(r"^\s*(\w+)\s+(\w+)\s*(?:=\s*\1\s*\(\s*(0x[0-9a-fA-F]{40})\s*\)\s*)?;",
                         p_source or "", re.M):
        dep_type, _var, addr = m.group(1), m.group(2), m.group(3)
        if dep_type not in deployable:
            continue
        target = addr if addr else "address(0)"
        if target in seen:
            continue
        seen.add(target)
        out.append(f"vm.etch({target}, address(new {dep_type}()).code);")
    return out


def _default_literal_for_type(type_text: str) -> str | None:
    """The type's zero value, for a constructor parameter the counterexample never pinned.

    The R2 harness takes the subject's constructor parameters as its OWN, so in the model they are
    unconstrained nondeterministic values; a parameter whose type has no numeric witness projection
    (`string`, `bytes`, dynamic arrays) is additionally never recorded at all, so the counterexample
    binds nothing for it.  Concretising a value the witness left free is the same step the fuzz side
    already takes (09-05 ruling), and it decides nothing on its own: forge still has to say Pass(P)
    and Break(M).  Returns None for a type this function will not invent a value for.
    """
    typ = (type_text or "").strip()
    base = typ.split()[0] if typ else ""
    if base.endswith("[]") or "[" in base:
        return None
    if base.startswith("bool"):
        return "false"
    if base.startswith(("uint", "int")):
        return "0"
    if _is_address_like(typ):
        return "payable(address(uint160(0)))" if "payable" in typ else "address(uint160(0))"
    if re.fullmatch(r"bytes(?:[1-9]|[12][0-9]|3[0-2])", base):
        return f'hex"{"00" * int(base[5:])}"'
    if base == "string":
        return '""'
    if base == "bytes":
        return 'hex""'
    return None


def _literal_for_type(type_text: str, value: Any) -> tuple[str | None, str | None]:
    typ = (type_text or "").strip()
    raw = str(value).strip()
    if raw == "" or raw == "None":
        return None, "missing_value"
    low = raw.lower()
    if typ.startswith("bool"):
        if low in {"1", "true", "yes"}:
            return "true", None
        if low in {"0", "false", "no"}:
            return "false", None
        return None, "bad_bool_value"
    if typ.startswith(("uint", "int")):
        if re.fullmatch(r"-?(?:0x[0-9a-fA-F]+|\d+)", raw):
            return raw, None
        return None, "bad_integer_value"
    if _is_address_like(typ):
        if re.fullmatch(r"(?:0x[0-9a-fA-F]+|\d+)", raw):
            val = str(int(raw, 16)) if raw.lower().startswith("0x") else raw
            expr = f"address(uint160({val}))"
            return (f"payable({expr})" if "payable" in typ else expr), None
        return None, "bad_address_value"
    if re.fullmatch(r"bytes(?:[1-9]|[12][0-9]|3[0-2])", typ):
        n = int(typ[5:])
        try:
            val = int(raw, 16) if raw.lower().startswith("0x") else int(raw, 10)
        except ValueError:
            return None, "bad_fixed_bytes_value"
        if val < 0 or val >= (1 << (8 * n)):
            return None, "fixed_bytes_value_out_of_range"
        return f'hex"{val:0{2 * n}x}"', None
    return None, f"unsupported_type:{typ}"


def _ordered_witness_values(prefix: str, values: dict[str, Any]) -> list[Any]:
    out: list[Any] = []
    idx = 0
    while f"{prefix}{idx}" in values:
        out.append(values[f"{prefix}{idx}"])
        idx += 1
    return out


def _matching_paren(src: str, open_idx: int) -> int | None:
    depth = 0
    quote: str | None = None
    line_comment = False
    block_comment = False
    escaped = False
    i = open_idx
    while i < len(src):
        ch = src[i]
        nxt = src[i + 1] if i + 1 < len(src) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
            else:
                i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in {"'", '"'}:
            quote = ch
            i += 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return None


def _split_top_level_args(src: str) -> list[str] | None:
    args: list[str] = []
    start = 0
    depth = 0
    quote: str | None = None
    escaped = False
    for i, ch in enumerate(src):
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in {"'", '"'}:
            quote = ch
            continue
        if ch in "([{":
            depth += 1
            continue
        if ch in ")]}":
            depth -= 1
            if depth < 0:
                return None
            continue
        if ch == "," and depth == 0:
            arg = src[start:i].strip()
            if arg:
                args.append(arg)
            start = i + 1
    tail = src[start:].strip()
    if tail:
        args.append(tail)
    return args if depth == 0 and quote is None else None


def _carrier_constructor_args(
    rendered_test: str,
    contract_type: str,
) -> tuple[list[str] | None, str | None]:
    pattern = re.compile(
        rf"\bc\s*=\s*new\s+{re.escape(contract_type)}\s*\(",
        flags=re.M,
    )
    match = pattern.search(rendered_test or "")
    if not match:
        return None, "carrier_constructor_expr_not_found"
    open_idx = (rendered_test or "").rfind("(", 0, match.end())
    if open_idx < 0:
        return None, "carrier_constructor_open_paren_not_found"
    close_idx = _matching_paren(rendered_test, open_idx)
    if close_idx is None:
        return None, "carrier_constructor_expr_unbalanced"
    args = _split_top_level_args(rendered_test[open_idx + 1:close_idx])
    if args is None:
        return None, "carrier_constructor_args_unbalanced"
    return args, None


def _constructor_fixture_args(
    constructor: FuncSig | None,
    constructor_fixture: dict[str, Any] | None,
) -> list[str] | None:
    if constructor is None or not constructor.params:
        return []
    fixture_args = constructor_fixture.get("args") if isinstance(constructor_fixture, dict) else None
    if isinstance(fixture_args, list) and len(fixture_args) == len(constructor.params):
        return [str(arg) for arg in fixture_args]
    return None


def _single_entry(entries: list[FuncSig], name: str) -> tuple[FuncSig | None, str | None]:
    matches = [entry for entry in entries if entry.name == name]
    if not matches:
        return None, "boundary_not_public_entry"
    if len(matches) > 1:
        return None, "overloaded_boundary_unsupported"
    return matches[0], None


def _call_suffix(value: Any, *, payable: bool) -> tuple[str | None, str | None]:
    if not payable:
        if str(value) in {"", "None", "0", "0x0"}:
            return "", None
        return None, "nonpayable_call_has_value"
    if str(value) in {"", "None"}:
        return None, "payable_call_missing_value"
    if str(value) in {"0", "0x0"}:
        return "", None
    if re.fullmatch(r"(?:0x[0-9a-fA-F]+|\d+)", str(value)):
        return f"{{value: {value}}}", None
    return None, "bad_call_value"


def _call_args_with_prelude(
    entry: FuncSig,
    raw_args: list[Any],
    *,
    var_prefix: str,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, list[str], str | None]:
    if len(raw_args) != len(entry.params):
        return None, [], "arg_arity_mismatch"
    args: list[str] = []
    prelude: list[str] = []
    for idx, ((ptype, _pname), raw) in enumerate(zip(entry.params, raw_args)):
        elem = _dyn_array_elem(ptype)
        if elem is not None:
            lit, err = _literal_for_type(elem, raw)
            if err:
                return None, [], f"bad_array_arg:{err}"
            var_name = f"__invmut_{var_prefix}_arg{idx}"
            prelude.append(f"{elem}[] memory {var_name} = new {elem}[](1);")
            prelude.append(f"{var_name}[0] = {lit};")
            args.append(var_name)
            continue
        if _dyn_bytes(ptype):
            lit, err = _literal_for_type("uint8", raw)
            if err:
                return None, [], f"bad_bytes_arg:{err}"
            var_name = f"__invmut_{var_prefix}_arg{idx}"
            prelude.append(f"bytes memory {var_name} = new bytes(1);")
            prelude.append(f"{var_name}[0] = bytes1(uint8({lit}));")
            args.append(var_name)
            continue
        lit, err = _literal_for_type(ptype, raw)
        if err:
            # A parameter the counterexample never pinned (no value, or a type the recorder cannot
            # project) is free; concretise it rather than throwing the whole witness away.
            if default_unbound_args and err.split(":")[0] in ("missing_value", "unsupported_type"):
                lit = _default_literal_for_type(ptype)
                if lit is None:
                    return None, [], f"bad_arg:{err}"
                args.append(lit)
                continue
            return None, [], f"bad_arg:{err}"
        args.append(str(lit))
    return args, prelude, None


def _first_positive_uint_arg(entry: FuncSig, raw_args: list[Any]) -> str | None:
    for (ptype, _pname), raw in zip(entry.params, raw_args):
        if not str(ptype).strip().startswith("uint"):
            continue
        text = str(raw).strip()
        if not re.fullmatch(r"(?:0x[0-9a-fA-F]+|\d+)", text):
            continue
        value = int(text, 16) if text.lower().startswith("0x") else int(text)
        if value > 0:
            return str(value)
    return None


def _constructor_expr(
    contract_type: str,
    constructor: FuncSig | None,
    witness_values: dict[str, Any],
    constructor_fixture: dict[str, Any] | None = None,
    *,
    prefer_constructor_fixture: bool = False,
    default_unbound_args: bool = False,
) -> tuple[str | None, str | None]:
    if constructor is None or not constructor.params:
        return f"new {contract_type}()", None
    fixture_args = _constructor_fixture_args(constructor, constructor_fixture)
    if prefer_constructor_fixture and fixture_args is not None:
        return f"new {contract_type}({', '.join(fixture_args)})", None
    raw_args = _ordered_witness_values("__invmut_ctor_arg", witness_values)
    if len(raw_args) == len(constructor.params):
        args: list[str] = []
        for (ptype, _pname), raw in zip(constructor.params, raw_args):
            lit, err = _literal_for_type(ptype, raw)
            if err:
                return None, f"bad_constructor_arg:{err}"
            args.append(str(lit))
        return f"new {contract_type}({', '.join(args)})", None
    if fixture_args is not None:
        return f"new {contract_type}({', '.join(fixture_args)})", None
    if default_unbound_args:
        # Positional: keep whatever the counterexample DID pin, zero-fill the rest.
        args = []
        for i, (ptype, _pname) in enumerate(constructor.params):
            if i < len(raw_args):
                lit, err = _literal_for_type(ptype, raw_args[i])
                if not err and lit is not None:
                    args.append(str(lit))
                    continue
            lit = _default_literal_for_type(ptype)
            if lit is None:
                return None, f"constructor_param_not_defaultable:{ptype}"
            args.append(lit)
        return f"new {contract_type}({', '.join(args)})", None
    return None, "constructor_witness_arity_mismatch"


def _single_param_entry(entry: FuncSig, idx: int) -> FuncSig:
    return dataclasses_replace_funcsig(entry, params=[entry.params[idx]])


def dataclasses_replace_funcsig(entry: FuncSig, **kw: Any) -> FuncSig:
    import dataclasses as _dc
    return _dc.replace(entry, **kw)


def _uint_bits_of(ptype: str) -> int | None:
    typ = str(ptype).strip()
    if not typ.startswith("uint"):
        return None
    suffix = typ[4:]
    if not suffix:
        return 256
    try:
        return int(suffix)
    except ValueError:
        return None



def render_runtime_safety_block(
    asset: dict[str, Any],
    *,
    entries: list[FuncSig],
    constructor: FuncSig | None,
    contract_type: str,
    constructor_fixture: dict[str, Any] | None = None,
    wrapper_map: list[dict[str, Any]] | None = None,
    source_entries: list[FuncSig] | None = None,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, dict[str, Any], str | None]:
    """Replay an R1 (runtime-safety) finding.

    R1 does not run a differential harness: it verifies P and M separately and reports the safety
    checks the mutant INTRODUCED (`invmut/mutation/r1.py`). So there is no `__invmut_vP/vM` pair and
    the other renderers, which all read one, refuse. But the finding is still an observation about P,
    stated by the record itself: "Original: completes without <check> / Modified: violates <check> at
    <function>:<line>". Under solc 0.8 an introduced overflow / underflow / division by zero IS a
    Panic revert, so restating P's half -- that the named function does NOT revert -- is the same
    shape every other replay emits, and forge still decides Pass(P)/Break(M).

    The arguments are not pinned by anything (R1 records no witness fields), so they are concretised
    exactly like any other value the counterexample left free.
    """
    pv = asset.get("primary_violation") if isinstance(asset.get("primary_violation"), dict) else {}
    fn_name = str(pv.get("function") or "")
    if not fn_name:
        return None, {}, "runtime_safety_without_violation_function"
    entry, err = _single_entry(entries, fn_name)
    if err or entry is None:
        return None, {}, f"runtime_safety_{err}"
    if entry.visibility not in ("public", "external"):
        return None, {}, "runtime_safety_violation_not_public_entry"
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    ctor, err = _constructor_expr(contract_type, constructor, witness_values, constructor_fixture,
                                  default_unbound_args=default_unbound_args)
    if err or ctor is None:
        return None, {}, str(err)
    instance_name = f"__invmut_ce_{asset.get('cohort_rank')}"
    call_args, arg_prelude, err = _call_args_with_prelude(
        entry, [None] * len(entry.params),
        var_prefix=f"ce{asset.get('cohort_rank')}_rs",
        default_unbound_args=True)
    if err or call_args is None:
        return None, {}, str(err)
    suffix = "{value: 0}" if entry.payable else ""
    body_lines = [
        f"{contract_type} {instance_name} = {ctor};",
        *arg_prelude,
        "bool __invmut_reverted = false;",
        f"try {instance_name}.{entry.name}{suffix}({', '.join(call_args)}) {{",
        "    __invmut_reverted = false;",
        "} catch {",
        "    __invmut_reverted = true;",
        "}",
        (f'assertEq(__invmut_reverted, false, '
         f'"InvMut CE oracle {asset.get("cohort_rank")} R1 {pv.get("check") or "safety"}");'),
    ]
    meta = {
        "template": "replay_runtime_safety_fresh_instance",
        "safety_check": asset.get("safety_check") or pv.get("check"),
        "violation_function": fn_name,
        "violation_line": pv.get("line"),
        "replay_adapters": ["runtime_safety_args_concretised"],
    }
    return body_lines, meta, None


def render_explicit_revert_refinement_block(
    asset: dict[str, Any],
    *,
    entries: list[FuncSig],
    constructor: FuncSig | None,
    contract_type: str,
    constructor_fixture: dict[str, Any] | None = None,
    wrapper_map: list[dict[str, Any]] | None = None,
    source_entries: list[FuncSig] | None = None,
    fabricated_entry_state: bool = False,
    separate_deployer: bool = False,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, dict[str, Any], str | None]:
    if "explicit_revert" not in _category_tokens(asset):
        return None, {}, "unsupported_observation_category"
    # A multi-assertion local pack NAMES its assertions (`R_T0001` for the revert one, `S_T0000` for a
    # state one), so an id that is present must be the revert one or this asset is the wrong assertion
    # of that pack.  The pipeline's own R2 harness asserts ONCE per harness and names nothing, so a
    # live difference arrives with no id at all; there the category above -- read off the harness
    # target the query actually asserted on -- is what identifies the assertion, and demanding an `R_`
    # prefix refused every live explicit-revert witness.
    assertion_id = str(asset.get("assertion_id") or "")
    if assertion_id and not assertion_id.startswith("R_"):
        return None, {}, "assertion_not_explicit_revert"
    pair = asset.get("observed_pair") if isinstance(asset.get("observed_pair"), dict) else {}
    expected = _truthy_bool(pair.get("original"))
    modified = _truthy_bool(pair.get("modified"))
    if expected is None or modified is None:
        return None, {}, "observed_pair_missing_or_non_bool"
    if expected == modified:
        return None, {}, "observed_pair_not_differential"
    trace = asset.get("witness_trace") if isinstance(asset.get("witness_trace"), list) else []
    if not asset.get("witness_trace_complete") or not trace:
        return None, {}, _trace_refusal(asset, entries, trace)
    # Locate the asserted call in the trace rather than assuming it is the last step. A witness
    # whose trace never recorded that call does not pin its arguments, so there is nothing faithful
    # to translate and the renderer refuses instead of replaying a different function.
    declared = _declared_boundary(asset)
    boundary_index = len(trace) - 1
    if declared:
        hits = [i for i, s in enumerate(trace)
                if isinstance(s, dict) and s.get("function_name") == declared]
        if not hits:
            # Name the two sides in the reason: `declared` is what _declared_boundary read off the
            # asset and the list is what the bounded trace actually recorded. Without them the bucket
            # cannot be told apart from a witness that genuinely never called the boundary.
            recorded = ",".join(str(s.get("function_name")) for s in trace if isinstance(s, dict))
            vf = str((_nested_confirmed_difference(asset).get("witness_detail") or {}).get(
                "violated_function") or "")
            return None, {}, (
                f"witness_trace_missing_boundary:{declared}:[{recorded}]:vf={vf}")[:200]
        boundary_index = hits[-1]
    has_prefix = boundary_index > 0
    step = trace[boundary_index] if isinstance(trace[boundary_index], dict) else {}
    fn_name = str(step.get("function_name") or declared or asset.get("boundary") or "")
    if not _valid_identifier(fn_name):
        return None, {}, "invalid_boundary_name"
    entry, err = _trace_entry_for_step(entries, step, wrapper_map=wrapper_map, source_entries=source_entries)
    if err or entry is None:
        return None, {}, str(err)
    raw_args = step.get("args") if isinstance(step.get("args"), list) else []
    call_args, arg_prelude, err = _call_args_with_prelude(
        entry,
        raw_args,
        var_prefix=f"ce{asset.get('cohort_rank')}",
        default_unbound_args=default_unbound_args,
    )
    if err or call_args is None:
        return None, {}, str(err)
    suffix, err = _call_suffix(step.get("value"), payable=entry.payable)
    if err or suffix is None:
        return None, {}, str(err)
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    ctor, err = _constructor_expr(contract_type, constructor, witness_values, constructor_fixture,
                                 default_unbound_args=default_unbound_args)
    if err or ctor is None:
        return None, {}, str(err)
    instance_name = f"__invmut_ce_{asset.get('cohort_rank')}"
    actor_name = f"__invmut_actor_{asset.get('cohort_rank')}"
    # Both of these put the replayed call behind a caller the counterexample never named, so they are
    # entry state the witness does not bind (see `witness_replay_fabricated_entry_state`).
    use_same_actor_for_deploy_and_replay = fabricated_entry_state and expected is False
    use_non_owner_actor_for_replay = (
        fabricated_entry_state
        and expected is True
        and modified is False
        and _mentions_msg_sender_owner_guard(asset)
    )
    value = str(step.get("value") or "0")
    funding_lines = []
    if entry.payable and value not in {"0", "0x0"}:
        funding_lines.append(f"vm.deal(address(this), {value});")
        if use_same_actor_for_deploy_and_replay or use_non_owner_actor_for_replay:
            funding_lines.append(f"vm.deal({actor_name}, {value});")
    actor_lines: list[str] = []
    instance_funding_lines: list[str] = []
    pre_call_lines: list[str] = []
    stop_prank_lines: list[str] = []
    adapter_notes: list[str] = []
    if use_same_actor_for_deploy_and_replay:
        actor_lines.append(f"address {actor_name} = address(uint160(0xCE));")
        actor_lines.append(f"vm.startPrank({actor_name});")
        stop_prank_lines.append("vm.stopPrank();")
        adapter_notes.append("same_eoa_actor_for_fresh_deploy_and_replay")
    elif use_non_owner_actor_for_replay:
        actor_lines.append(f"address {actor_name} = address(uint160(0xCE));")
        pre_call_lines.append(f"vm.prank({actor_name});")
        adapter_notes.append("non_owner_actor_for_deleted_msg_sender_owner_guard")
    fund_amount = _first_positive_uint_arg(entry, raw_args)
    if (use_same_actor_for_deploy_and_replay or use_non_owner_actor_for_replay) and fund_amount is not None:
        instance_funding_lines.append(f"vm.deal(address({instance_name}), {fund_amount});")
        adapter_notes.append("fund_fresh_instance_with_first_positive_uint_arg")
    expected_literal = "true" if expected else "false"
    prefix_lines: list[str] = []
    if has_prefix:
        # the witness's own earlier calls, replayed verbatim on the same fresh instance
        prefix_lines, prefix_notes, err = _replay_trace_lines(
            asset,
            entries=entries,
            instance_name=instance_name,
            trace=trace[:boundary_index],
            wrapper_map=wrapper_map,
            source_entries=source_entries,
            replay_actor=(actor_name if use_same_actor_for_deploy_and_replay else None),
            all_steps_are_prefix=True,
            default_unbound_args=default_unbound_args,
        )
        if err or prefix_lines is None:
            return None, {}, str(err)
        adapter_notes.extend(prefix_notes)
    # A witness that says P REVERTS, on a harness whose deployer and caller are the same account, is
    # ESBMC telling us the two are NOT the same in its model: the constructor there runs with a
    # msg.sender of its own (measured 0x80000002 against a Harness at address 2), so an `owner` stored
    # at construction never equals the caller and every owner guard fails. On forge the test contract
    # deploys and calls, owner == caller, the guard passes and the replay is thrown away. Deploying
    # from a SEPARATE account reproduces the configuration the witness came from -- and only when the
    # witness asks for it, so the direction is read off the counterexample, not chosen.
    deployer_lines: list[str] = []
    post_deploy_actor_lines: list[str] = []
    if (separate_deployer and expected is True
            and not use_same_actor_for_deploy_and_replay
            and not use_non_owner_actor_for_replay):
        deployer_lines = [f"address {actor_name}_dep = address(uint160(0xDE9));",
                          f"vm.prank({actor_name}_dep, {actor_name}_dep);"]
        # the calls still run as the test contract, so a `msg.sender == tx.origin` boundary guard and
        # a `receive()` on the caller both keep working; only the deployer moves.
        post_deploy_actor_lines = ["vm.startPrank(address(this), address(this));"]
        stop_prank_lines.append("vm.stopPrank();")
        adapter_notes.append("separate_deployer_for_expected_revert")
    body_lines = [
        *deployer_lines,
        *actor_lines,
        f"{contract_type} {instance_name} = {ctor};",
        *post_deploy_actor_lines,
        *instance_funding_lines,
        *prefix_lines,
        *arg_prelude,
        *funding_lines,
        *_balance_delta_lines(asset, instance_name)[0],
        "bool __invmut_reverted = false;",
        *pre_call_lines,
        f"try {instance_name}.{entry.name}{suffix}({', '.join(call_args)}) {{",
        "    __invmut_reverted = false;",
        "} catch {",
        "    __invmut_reverted = true;",
        "}",
        *stop_prank_lines,
        (
            f'assertEq(__invmut_reverted, {expected_literal}, '
            f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")}");'
        ),
        *_wide_observation_assertions(asset, instance_name),
        *_balance_delta_lines(asset, instance_name)[1],
    ]
    meta = {
        "template": (
            "replay_explicit_revert_witness_prefix_fresh_instance"
            if has_prefix
            else "replay_explicit_revert_fresh_instance"
        ),
        "prefix_len": boundary_index,
        "expected_reverted_on_p": expected,
        "modified_reverted": modified,
        "boundary": entry.name,
        "call_value": value,
        "constructor_strategy": (
            "ce_witness_fresh_instance"
            if _ordered_witness_values("__invmut_ctor_arg", witness_values)
            else "same_row_accepted_put_fixture"
        ),
        "replay_adapters": adapter_notes,
        "fabricated_entry_state": bool(adapter_notes),
    }
    return body_lines, meta, None


def _cohort_materialized_observations(cohort_row: dict[str, Any] | None) -> list[dict[str, Any]]:
    materialized = (cohort_row or {}).get("materialization")
    if not isinstance(materialized, dict):
        return []
    return [obs for obs in materialized.get("observations") or [] if isinstance(obs, dict)]


def _observation_for_asset(
    asset: dict[str, Any],
    cohort_row: dict[str, Any] | None,
) -> dict[str, Any] | None:
    assertion_id = str(asset.get("assertion_id") or "")
    packed = asset.get("packed_observation")
    if isinstance(packed, dict) and str(packed.get("assertion_id") or "") == assertion_id:
        return packed
    for observation in _cohort_materialized_observations(cohort_row):
        if str(observation.get("assertion_id") or "") == assertion_id:
            return observation
    return None


def _trace_entry_for_step(
    entries: list[FuncSig],
    step: dict[str, Any],
    *,
    wrapper_map: list[dict[str, Any]] | None = None,
    fallback_returns: list[str] | None = None,
    source_entries: list[FuncSig] | None = None,
) -> tuple[FuncSig | None, str | None]:
    fn_name = str(step.get("function_name") or "")
    function_index = 0
    if not fn_name:
        try:
            function_index = int(str(step.get("function_index") or "0"))
        except ValueError:
            function_index = 0
        if 1 <= function_index <= len(entries):
            fn_name = entries[function_index - 1].name
    if not _valid_identifier(fn_name):
        return None, "invalid_trace_function_name"
    entry, err = _single_entry(entries, fn_name)
    if entry is not None or err != "boundary_not_public_entry":
        return entry, err
    for wrapper in wrapper_map or []:
        if not isinstance(wrapper, dict):
            continue
        wrapper_index = None
        try:
            wrapper_index = int(str(wrapper.get("function_index") or "0"))
        except ValueError:
            pass
        if str(wrapper.get("name") or "") != fn_name and wrapper_index != function_index:
            continue
        params = [(str(ptype), f"a{i}") for i, ptype in enumerate(wrapper.get("params") or [])]
        mutability = "payable" if wrapper.get("payable") else "nonpayable"
        return FuncSig(
            fn_name,
            "function",
            "public",
            mutability,
            params,
            list(fallback_returns or []),
            (0, 0),
        ), None
    if source_entries:
        entry, source_err = _single_entry(source_entries, fn_name)
        if entry is not None:
            if fallback_returns and not entry.returns:
                entry = FuncSig(
                    entry.name,
                    entry.kind,
                    entry.visibility,
                    entry.mutability,
                    entry.params,
                    list(fallback_returns or []),
                    entry.src,
                )
            return entry, None
        if source_err != "boundary_not_public_entry":
            return None, source_err
    return None, err


def _trace_refusal(asset: dict[str, Any], entries: list[FuncSig], trace: list[Any]) -> str:
    """The incomplete-trace refusal, with the field the counterexample left unpinned named."""
    from invmut.replay.build import witness_trace_defect  # local: build imports this module
    return (f"witness_trace_len_unsupported:{len(trace)}:"
            f"{witness_trace_defect(asset.get('witness_values'), entries)}")


def _replay_trace_lines(
    asset: dict[str, Any],
    *,
    entries: list[FuncSig],
    instance_name: str,
    trace: list[Any] | None = None,
    wrapper_map: list[dict[str, Any]] | None = None,
    source_entries: list[FuncSig] | None = None,
    replay_actor: str | None = None,
    all_steps_are_prefix: bool = False,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, list[str], str | None]:
    trace = trace if trace is not None else (
        asset.get("witness_trace") if isinstance(asset.get("witness_trace"), list) else []
    )
    if not asset.get("witness_trace_complete") or not trace:
        return None, [], _trace_refusal(asset, entries, trace)
    lines: list[str] = []
    adapter_notes: list[str] = []
    body_lines: list[str] = []
    replay_actor_fund_total = 0
    for step_index, raw_step in enumerate(trace):
        step = raw_step if isinstance(raw_step, dict) else {}
        entry, err = _trace_entry_for_step(entries, step, wrapper_map=wrapper_map, source_entries=source_entries)
        if err or entry is None:
            return None, [], str(err)
        raw_args = step.get("args") if isinstance(step.get("args"), list) else []
        call_args, arg_prelude, err = _call_args_with_prelude(
            entry,
            raw_args,
            var_prefix=f"ce{asset.get('cohort_rank')}_s{step_index}",
            default_unbound_args=default_unbound_args,
        )
        if err or call_args is None:
            return None, [], str(err)
        suffix, err = _call_suffix(step.get("value"), payable=entry.payable)
        if err or suffix is None:
            return None, [], str(err)
        value = str(step.get("value") or "0")
        if entry.payable and value not in {"0", "0x0"}:
            if replay_actor:
                replay_actor_fund_total += int(value, 16) if value.lower().startswith("0x") else int(value)
                adapter_notes.append("fund_replay_actor_for_payable_replay")
            else:
                body_lines.append(f"vm.deal(address(this), {value});")
                adapter_notes.append("fund_test_contract_for_payable_replay")
        body_lines.extend(arg_prelude)
        call = f"{instance_name}.{entry.name}{suffix}({', '.join(call_args)});"
        if all_steps_are_prefix or step_index < len(trace) - 1:
            # The R2 wrapper calls `p.f(..); m.f(..)` with no revert guard, and ESBMC does not
            # propagate a callee revert to the caller, so in the model a prefix step that reverts
            # leaves the run going. A bare call in forge aborts the whole test instead, which throws
            # the witness away over a step the query never required to succeed. `try/catch` is the
            # translation of the semantics the witness was produced under; the boundary step keeps
            # its bare call, because the oracle reads what it left behind.
            body_lines.append(f"try {call[:-1]} {{}} catch {{}}")
            adapter_notes.append("prefix_step_revert_tolerated")
        else:
            body_lines.append(call)
    if replay_actor:
        if replay_actor_fund_total > 0:
            lines.append(f"vm.deal({replay_actor}, {replay_actor_fund_total});")
        # tx.origin too: the R2 harness has one account deploying and calling, and a
        # `msg.sender == tx.origin` guard on that account holds in the model.
        lines.append(f"vm.startPrank({replay_actor}, {replay_actor});")
        lines.extend(body_lines)
        lines.append("vm.stopPrank();")
        adapter_notes.append("state_replay_actor_from_address_key")
    else:
        lines.extend(body_lines)
    adapter_notes = list(dict.fromkeys(adapter_notes))
    return lines, adapter_notes, None


_WIDE_OBS = re.compile(r"^__invmut_x([A-Za-z_]\w*)_vP$")


def _wide_observation_assertions(asset: dict[str, Any], instance_name: str) -> list[str]:
    """State every extra scalar the widened predicate made the counterexample bind.

    The harness puts the getter's NAME in the local's name (`__invmut_x<getter>_vP`), so each binding
    is self-describing and no mapping has to travel with the asset. Empty on a run that did not widen.
    """
    cd = _nested_confirmed_difference(asset)
    observed = cd.get("observed_values") if isinstance(cd.get("observed_values"), dict) else {}
    if not observed:
        oa = _nested_oracle_asset(asset)
        observed = oa.get("observed_values") if isinstance(oa.get("observed_values"), dict) else {}
    out: list[str] = []
    for key in sorted(observed):
        m = _WIDE_OBS.match(str(key))
        if not m:
            continue
        getter = m.group(1)
        p_raw, m_raw = observed.get(key), observed.get(f"__invmut_x{getter}_vM")
        if p_raw is None:
            continue
        lit, err = _literal_for_type("uint256", p_raw)
        if err or lit is None:
            continue
        out.append(f'assertEq(uint256({instance_name}.{getter}()), {lit}, '
                   f'"InvMut CE wide {asset.get("cohort_rank")} {getter}");')
    return out


def _balance_delta_lines(asset: dict[str, Any], instance_name: str) -> tuple[list[str], list[str]]:
    """(before-line, assertion-lines) for the ether the boundary call moved.

    The harness binds a DELTA across its own call, so the replay states the same delta: the two
    starting balances are independent nondeterministic values in the model and mean nothing here.
    Present only when the widened differential predicate was on; empty otherwise.
    """
    values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    raw = values.get("__invmut_balP")
    if raw is None:
        return [], []
    lit, err = _literal_for_type("uint256", raw)
    if err or lit is None:
        return [], []
    var = f"__invmut_bal0_{asset.get('cohort_rank')}"
    return ([f"uint256 {var} = address({instance_name}).balance;"],
            ["unchecked {",
             f'    assertEq(address({instance_name}).balance - {var}, {lit}, '
             f'"InvMut CE balance {asset.get("cohort_rank")}");',
             "}"])


def _wide_is_the_difference(asset: dict[str, Any]) -> bool:
    """The widened predicate found the difference in ANOTHER public scalar, not in the target."""
    cd = _nested_confirmed_difference(asset)
    observed = cd.get("observed_values") if isinstance(cd.get("observed_values"), dict) else {}
    if not observed:
        observed = _nested_oracle_asset(asset).get("observed_values") or {}
    for key in observed:
        m = _WIDE_OBS.match(str(key))
        if m and str(observed.get(key)) != str(observed.get(f"__invmut_x{m.group(1)}_vM")):
            return True
    return False


def _balance_is_the_difference(asset: dict[str, Any]) -> bool:
    """The widened predicate found the difference in the ETHER, not in the observed value."""
    values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    p, m = values.get("__invmut_balP"), values.get("__invmut_balM")
    return p is not None and m is not None and str(p) != str(m)


def _state_getter_call_and_expected(
    asset: dict[str, Any],
    observation: dict[str, Any],
    *,
    instance_name: str,
) -> tuple[str | None, str | None, str | None]:
    getter_name = str(observation.get("getter_name") or "")
    if not _valid_identifier(getter_name):
        return None, None, "invalid_state_getter_name"
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    key_args: list[str] = []
    for idx, param in enumerate(observation.get("getter_params") or []):
        if not isinstance(param, dict):
            return None, None, "bad_state_getter_param"
        key_name = f'__invmut_{asset.get("assertion_id")}_key{idx}_w'
        raw = witness_values.get(key_name)
        if raw is None:
            raw = witness_values.get(f"__invmut_key{idx}")
        lit, err = _literal_for_type(str(param.get("type") or ""), raw)
        if err or lit is None:
            return None, None, f"bad_state_getter_key:{err}"
        key_args.append(lit)
    leaf_type = str(observation.get("leaf_type") or "")
    expected_raw = (asset.get("observed_pair") or {}).get("original")
    expected_lit, err = _literal_for_type(leaf_type, expected_raw)
    if err or expected_lit is None:
        return None, None, f"bad_state_expected:{err}"
    getter = f"{instance_name}.{getter_name}({', '.join(key_args)})"
    return getter, expected_lit, None


def _during_call_detail(asset: dict[str, Any]) -> dict[str, Any]:
    """The V43 during-call record: the harness's receive() observer readings, if this difference is one."""
    cd = _nested_confirmed_difference(asset)
    wd = cd.get("witness_detail") if isinstance(cd.get("witness_detail"), dict) else {}
    obs = wd.get("during_call_observation") if isinstance(wd.get("during_call_observation"), dict) else {}
    during = bool(cd.get("during_call") or wd.get("during_call")
                  or _nested_oracle_asset(asset).get("during_call"))
    return {
        "during_call": during,
        "getter": (obs.get("getter") or cd.get("observer_getter")
                   or _nested_oracle_asset(asset).get("observer_getter")),
        "original": obs.get("original") if obs.get("original") is not None else cd.get("observer_value_p"),
        "modified": obs.get("modified"),
    }


def _during_call_observer_parts(
    asset: dict[str, Any],
    observation: dict[str, Any],
    instance_name: str,
    contract_type: str = "C",
) -> tuple[list[str], list[str], list[str], list[str], str | None]:
    """(members, receive_body, arm_lines, assertions, err) for the harness's during-call reading.

    The R2 harness's `receive()` observer snapshots the target getter while the callee still has
    control, and BOTH snapshots sit in the differential predicate (`snapP == snapM && vP == vM`), so
    the solver binds `snapP` whenever an observer was emitted -- not only when the two disagree. That
    reading is the CEI-sensitive quantity: a fix that updates state before it pays out and a defect
    that pays out first are identical once the call has settled and differ only here. Stating it turns
    every state replay into a test that a CEI-ordering defect has to violate.

    The caller must be a CONTRACT with this `receive()`, which is what the test contract already is.
    """
    detail = _during_call_detail(asset)
    raw = detail.get("original")
    if raw is None:
        return [], [], [], [], None
    # The harness leaves both snapshots at their zero init when no copy calls back, so a reading of 0
    # is the sentinel for "the observer never fired", not an observation. Asserting it would demand a
    # callback the witness never showed and would throw away a replay that is otherwise fine.
    try:
        if int(str(raw), 0) == 0:
            return [], [], [], [], None
    except (TypeError, ValueError):
        return [], [], [], [], None
    getter_name = str(detail.get("getter") or observation.get("getter_name") or "")
    if not _valid_identifier(getter_name):
        return [], [], [], [], "invalid_during_call_getter"
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    key_args: list[str] = []
    for idx, param in enumerate(observation.get("getter_params") or []):
        if not isinstance(param, dict):
            return [], [], [], [], "bad_state_getter_param"
        key = witness_values.get(f'__invmut_{asset.get("assertion_id")}_key{idx}_w')
        if key is None:
            key = witness_values.get(f"__invmut_key{idx}")
        lit, err = _literal_for_type(str(param.get("type") or ""), key)
        if err or lit is None:
            return [], [], [], [], f"bad_state_getter_key:{err}"
        key_args.append(lit)
    leaf_type = str(observation.get("leaf_type") or "uint256")
    decl_type = leaf_type if re.fullmatch(r"(?:u?int\d*|address|bool|bytes\d+)", leaf_type) else "uint256"
    lit, err = _literal_for_type(decl_type, raw)
    if err or lit is None:
        return [], [], [], [], f"bad_during_call_expected:{err}"
    rank = asset.get("cohort_rank")
    tgt, snap = "__invmut_obs_target", "__invmut_snap"
    members = [f"{contract_type} {tgt};", f"{decl_type} {snap};",
               "bool __invmut_snapped;", "bool __invmut_armed;"]
    receive_body = [
        "if (__invmut_armed && !__invmut_snapped) {",
        f"    {snap} = {decl_type}({tgt}.{getter_name}({', '.join(key_args)}));",
        "    __invmut_snapped = true;",
        "}",
    ]
    arm = [f"{tgt} = {instance_name};", "__invmut_armed = true;"]
    asserts = [
        f'assertTrue(__invmut_snapped, "InvMut CE oracle {rank} no during-call read");',
        f'assertEq({snap}, {lit}, "InvMut CE during-call {rank}");',
    ]
    return members, receive_body, arm, asserts, None


def render_during_call_refinement_block(
    asset: dict[str, Any],
    *,
    observation: dict[str, Any],
    entries: list[FuncSig],
    constructor: FuncSig | None,
    contract_type: str,
    constructor_fixture: dict[str, Any] | None = None,
    source_entries: list[FuncSig] | None = None,
    wrapper_map: list[dict[str, Any]] | None = None,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, dict[str, Any], str | None]:
    """CEI / reentrancy: state the value the harness read DURING the boundary's external call.

    The R2 harness's `receive()` observer snapshots the target getter while the callee still has
    control, and `assert(__invmut_snapP == __invmut_snapM && ...)` compares that reading as well as the
    settled one. When only the during-call readings differ, asserting the SETTLED value -- which is
    what the state renderer emits -- states a quantity the query found equal on both sides: the test
    then passes on P, passes on M, and is thrown away. This renderer emits the shape the harness had:
    the caller is a contract, its `receive()` reads the same getter, and the oracle is that reading.
    """
    detail = _during_call_detail(asset)
    if not detail["during_call"]:
        return None, {}, "not_a_during_call_difference"
    if detail["original"] is None or detail["modified"] is None:
        return None, {}, "during_call_pair_missing"
    if str(detail["original"]) == str(detail["modified"]):
        return None, {}, "during_call_pair_not_differential"
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    ctor, err = _constructor_expr(contract_type, constructor, witness_values, constructor_fixture,
                                 default_unbound_args=default_unbound_args)
    if err or ctor is None:
        return None, {}, str(err)
    instance_name = f"__invmut_ce_{asset.get('cohort_rank')}"
    replay_lines, adapter_notes, err = _replay_trace_lines(
        asset, entries=entries, instance_name=instance_name,
        wrapper_map=wrapper_map, source_entries=source_entries,
        default_unbound_args=default_unbound_args)
    if err or replay_lines is None:
        return None, {}, str(err)
    # The getter to snapshot: the observer's own, falling back to the target's.
    getter_name = str(detail["getter"] or observation.get("getter_name") or "")
    if not _valid_identifier(getter_name):
        return None, {}, "invalid_during_call_getter"
    key_args: list[str] = []
    for idx, param in enumerate(observation.get("getter_params") or []):
        if not isinstance(param, dict):
            return None, {}, "bad_state_getter_param"
        raw = witness_values.get(f'__invmut_{asset.get("assertion_id")}_key{idx}_w')
        if raw is None:
            raw = witness_values.get(f"__invmut_key{idx}")
        lit, err = _literal_for_type(str(param.get("type") or ""), raw)
        if err or lit is None:
            return None, {}, f"bad_state_getter_key:{err}"
        key_args.append(lit)
    leaf_type = str(observation.get("leaf_type") or "uint256")
    # An enum leaf is named differently in each copy; the harness casts it to uint256, so does this.
    decl_type = leaf_type if re.fullmatch(r"(?:u?int\d*|address|bool|bytes\d+)", leaf_type) else "uint256"
    expected_lit, err = _literal_for_type(decl_type, detail["original"])
    if err or expected_lit is None:
        return None, {}, f"bad_during_call_expected:{err}"
    snap = "__invmut_snap"
    target = "__invmut_obs_target"
    members = [
        f"{contract_type} {target};",
        f"{decl_type} {snap};",
        "bool __invmut_snapped;",
        "bool __invmut_armed;",
    ]
    receive_body = [
        "if (__invmut_armed && !__invmut_snapped) {",
        f"    {snap} = {decl_type}({target}.{getter_name}({', '.join(key_args)}));",
        "    __invmut_snapped = true;",
        "}",
    ]
    # The harness arms its observer with `__invmut_which = 1` immediately before handing off to p, so
    # the reading belongs to the BOUNDARY call and not to a prefix step that also paid out.
    armed_lines = [*replay_lines[:-1], "__invmut_armed = true;", replay_lines[-1]]
    body_lines = [
        "vm.startPrank(address(this), address(this));",
        f"{contract_type} {instance_name} = {ctor};",
        f"{target} = {instance_name};",
        *armed_lines,
        "vm.stopPrank();",
        f'assertTrue(__invmut_snapped, "InvMut CE oracle {asset.get("cohort_rank")} no during-call read");',
        (f'assertEq({snap}, {expected_lit}, '
         f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")}");'),
    ]
    meta = {
        "template": "during_call_observer_fresh_instance",
        "expected_during_call_on_p": detail["original"],
        "modified_during_call": detail["modified"],
        "observer_getter": getter_name,
        "leaf_type": decl_type,
        "replay_steps": len(asset.get("witness_trace") or []),
        "replay_adapters": list(dict.fromkeys(adapter_notes)),
        "contract_members": members,
        "receive_body": receive_body,
    }
    return body_lines, meta, None


def _state_replay_actor_from_address_key(
    asset: dict[str, Any],
    observation: dict[str, Any],
) -> tuple[str | None, str | None]:
    params = observation.get("getter_params") if isinstance(observation.get("getter_params"), list) else []
    address_params = [
        (idx, param)
        for idx, param in enumerate(params)
        if isinstance(param, dict) and _is_address_like(str(param.get("type") or ""))
    ]
    if len(address_params) != 1:
        return None, "state_replay_actor_requires_single_address_key"
    idx, _param = address_params[0]
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    raw = witness_values.get(f'__invmut_{asset.get("assertion_id")}_key{idx}_w')
    if raw is None:
        raw = witness_values.get(f"__invmut_key{idx}")
    if raw is None:
        return None, "state_replay_actor_key_missing"
    trace = asset.get("witness_trace") if isinstance(asset.get("witness_trace"), list) else []
    trace_args = [str(arg) for step in trace if isinstance(step, dict) for arg in (step.get("args") or [])]
    if str(raw) in trace_args:
        return None, "state_replay_actor_key_already_in_trace_args"
    actor, err = _literal_for_type("address", raw)
    if err or actor is None:
        return None, f"state_replay_actor_bad_key:{err}"
    return actor, None


def render_state_refinement_block(
    asset: dict[str, Any],
    *,
    observation: dict[str, Any],
    entries: list[FuncSig],
    constructor: FuncSig | None,
    contract_type: str,
    constructor_fixture: dict[str, Any] | None = None,
    source_entries: list[FuncSig] | None = None,
    replay_actor_from_address_key: bool = False,
    prefer_constructor_fixture: bool = False,
    during_call_observer: bool = False,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, dict[str, Any], str | None]:
    if observation.get("category") != "state":
        return None, {}, "unsupported_observation_category"
    pair = asset.get("observed_pair") if isinstance(asset.get("observed_pair"), dict) else {}
    expected = pair.get("original")
    modified = pair.get("modified")
    if expected is None or modified is None:
        return None, {}, "observed_pair_missing"
    if (str(expected) == str(modified) and not _balance_is_the_difference(asset)
            and not _wide_is_the_difference(asset)):
        return None, {}, "observed_pair_not_differential"
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    ctor, err = _constructor_expr(
        contract_type,
        constructor,
        witness_values,
        constructor_fixture,
        prefer_constructor_fixture=prefer_constructor_fixture,
        default_unbound_args=default_unbound_args,
    )
    if err or ctor is None:
        return None, {}, str(err)
    constructor_prelude = []
    if isinstance(constructor_fixture, dict):
        prelude = constructor_fixture.get("prelude")
        if isinstance(prelude, list):
            constructor_prelude = [str(line) for line in prelude]
    instance_name = f"__invmut_ce_{asset.get('cohort_rank')}"
    replay_actor = None
    actor_skipped = None
    if replay_actor_from_address_key:
        # Prefer the witness's own address key as the caller, but DEGRADE to the plain rendering when it
        # cannot be derived (several address keys, key missing, key already an explicit call argument).
        # The source cohort script refused outright; in the pipeline every difference arrives here, and
        # refusing would throw away replays the plain rendering handles (measured: 24 of 42 state
        # witnesses, of which 11 passed on P without the actor).
        replay_actor, actor_skipped = _state_replay_actor_from_address_key(asset, observation)
    replay_lines, adapter_notes, err = _replay_trace_lines(
        asset,
        entries=entries,
        instance_name=instance_name,
        source_entries=source_entries,
        replay_actor=replay_actor,
        default_unbound_args=default_unbound_args,
    )
    if err or replay_lines is None:
        return None, {}, str(err)
    getter_call, expected_literal, err = _state_getter_call_and_expected(
        asset,
        observation,
        instance_name=instance_name,
    )
    if err or getter_call is None or expected_literal is None:
        return None, {}, str(err)
    bal_pre, bal_assert = _balance_delta_lines(asset, instance_name)
    members: list[str] = []
    receive_body: list[str] = []
    arm: list[str] = []
    during_asserts: list[str] = []
    if during_call_observer:
        members, receive_body, arm, during_asserts, obs_err = _during_call_observer_parts(
            asset, observation, instance_name, contract_type)
        if obs_err:
            # The during-call reading is an ADD-ON, never the reason a replay is thrown away.
            members, receive_body, arm, during_asserts = [], [], [], []
    body_lines = [
        *constructor_prelude,
        f"{contract_type} {instance_name} = {ctor};",
        *replay_lines[:-1], *arm, *bal_pre, replay_lines[-1],
        (
            f'assertEq({getter_call}, {expected_literal}, '
            f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")}");'
        ),
        *during_asserts,
        *_wide_observation_assertions(asset, instance_name),
        *bal_assert,
    ]
    fixture_strategy = None
    fixture_adapter_notes: list[str] = []
    if isinstance(constructor_fixture, dict) and _constructor_fixture_args(constructor, constructor_fixture) is not None:
        fixture_strategy = str(constructor_fixture.get("strategy") or "same_row_accepted_put_fixture")
        raw_adapter_notes = constructor_fixture.get("adapter_notes")
        if isinstance(raw_adapter_notes, list):
            fixture_adapter_notes = [str(note) for note in raw_adapter_notes if str(note)]
    used_fixture = (
        fixture_strategy is not None
        and (
            prefer_constructor_fixture
            or not _ordered_witness_values("__invmut_ctor_arg", witness_values)
        )
    )
    meta = {
        "template": "inline_state_getter_fresh_instance",
        "expected_state_on_p": expected,
        "modified_state": modified,
        "getter_name": observation.get("getter_name"),
        "leaf_type": observation.get("leaf_type"),
        "getter_key_count": len(observation.get("getter_params") or []),
        "constructor_strategy": (
            fixture_strategy
            if used_fixture
            else "ce_witness_fresh_instance"
            if _ordered_witness_values("__invmut_ctor_arg", witness_values)
            else "same_row_accepted_put_fixture"
        ),
        "contract_members": members,
        "receive_body": receive_body,
        "during_call_asserted": bool(during_asserts),
        "state_replay_actor": replay_actor,
        "state_replay_actor_skipped": actor_skipped,
        "replay_steps": len(asset.get("witness_trace") or []),
        "replay_adapters": list(dict.fromkeys([*fixture_adapter_notes, *adapter_notes])),
    }
    return body_lines, meta, None


def _return_expected_literal(
    observation: dict[str, Any],
    expected: Any,
) -> tuple[str | None, str | None, str | None]:
    return_types = observation.get("return_types") if isinstance(observation.get("return_types"), list) else []
    if len(return_types) != 1:
        return None, None, f"unsupported_return_arity:{len(return_types)}"
    return_type = str(return_types[0])
    projection = str(observation.get("return_projection") or "direct")
    if projection == "address":
        literal, err = _literal_for_type("address", expected)
        return return_type, literal, err
    if projection != "direct":
        return None, None, f"unsupported_return_projection:{projection}"
    literal, err = _literal_for_type(return_type, expected)
    return return_type, literal, err


def _return_local_type(return_type: str, projection: str) -> str:
    if projection in {"struct_fields", "array_len_first"} and not any(
        token in return_type.split() for token in ("memory", "calldata", "storage")
    ):
        return f"{return_type} memory"
    return return_type


def _return_component_access(base: str, component: dict[str, Any]) -> str:
    path = component.get("path")
    if not isinstance(path, list) or not path:
        path = [component.get("name")]
    expr = base
    for field in path:
        expr += f".{field}"
    return expr


def _project_value_expr(expr: str, component: dict[str, Any]) -> tuple[str | None, str | None]:
    projection = str(component.get("projection") or "identity")
    if projection == "uint":
        return f"uint256({expr})", None
    if projection == "int":
        return f"int256({expr})", None
    if projection == "bool":
        return f"({expr} ? 1 : 0)", None
    if projection == "address":
        return f"uint256(uint160(address({expr})))", None
    if projection == "enum":
        return f"uint256({expr})", None
    if projection == "bytes":
        width = int(component.get("bytes_width") or 0)
        if width == 32:
            return f"uint256({expr})", None
        if 1 <= width < 32:
            return f"uint256(uint{width * 8}({expr}))", None
        return None, "bad_fixed_bytes_component_width"
    if projection.startswith("udt_"):
        unwrap_type = str(component.get("unwrap_type") or "")
        if not unwrap_type:
            return None, "missing_return_component_unwrap_type"
        unwrapped = f"{unwrap_type}.unwrap({expr})"
        if projection == "udt_uint":
            return f"uint256({unwrapped})", None
        if projection == "udt_int":
            return f"int256({unwrapped})", None
        if projection == "udt_address":
            return f"uint256(uint160(address({unwrapped})))", None
        if projection == "udt_bytes":
            width = int(component.get("bytes_width") or 0)
            if width == 32:
                return f"uint256({unwrapped})", None
            if 1 <= width < 32:
                return f"uint256(uint{width * 8}({unwrapped}))", None
            return None, "bad_fixed_bytes_udt_component_width"
    if projection == "identity":
        return expr, None
    return None, f"unsupported_return_component_projection:{projection}"


def _project_return_component(base: str, component: dict[str, Any]) -> tuple[str | None, str | None]:
    return _project_value_expr(_return_component_access(base, component), component)


def _component_return_expected_literals(
    observation: dict[str, Any],
    expected: Any,
) -> tuple[list[dict[str, Any]] | None, str | None]:
    components = observation.get("return_components")
    if not isinstance(components, list) or not components:
        return None, "component_return_components_missing"
    if not isinstance(expected, list):
        return None, "component_return_expected_not_component_list"
    if len(expected) != len(components):
        return None, "component_return_expected_arity_mismatch"
    out: list[dict[str, Any]] = []
    for index, (component, raw) in enumerate(zip(components, expected)):
        if not isinstance(component, dict):
            return None, "bad_component_return_component"
        projection_type = str(component.get("projection_type") or "uint256")
        literal, err = _literal_for_type(projection_type, raw)
        if err or literal is None:
            return None, f"bad_component_return_expected:{index}:{err}"
        out.append({"index": index, "component": component, "literal": literal})
    return out, None


def render_return_refinement_block(
    asset: dict[str, Any],
    *,
    observation: dict[str, Any],
    entries: list[FuncSig],
    constructor: FuncSig | None,
    contract_type: str,
    constructor_fixture: dict[str, Any] | None = None,
    wrapper_map: list[dict[str, Any]] | None = None,
    carrier_rendered_test: str | None = None,
    source_entries: list[FuncSig] | None = None,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, dict[str, Any], str | None]:
    if observation.get("category") != "return":
        return None, {}, "unsupported_observation_category"
    pair = asset.get("observed_pair") if isinstance(asset.get("observed_pair"), dict) else {}
    expected = pair.get("original")
    modified = pair.get("modified")
    if expected is None or modified is None:
        return None, {}, "observed_pair_missing"
    if str(expected) == str(modified):
        return None, {}, "observed_pair_not_differential"
    trace = asset.get("witness_trace") if isinstance(asset.get("witness_trace"), list) else []
    adapter_notes: list[str] = []
    used_call_sequence_fallback = False
    call_sequence = asset.get("call_sequence") if isinstance(asset.get("call_sequence"), list) else []
    if not asset.get("witness_trace_complete") or not trace:
        if not trace and len(call_sequence) == 1:
            trace = [{"function_name": str(call_sequence[0]), "args": [], "value": "0"}]
            adapter_notes.append("single_zero_arg_return_from_call_sequence")
            used_call_sequence_fallback = True
        else:
            return None, {}, _trace_refusal(asset, entries, trace)
    return_types = observation.get("return_types") if isinstance(observation.get("return_types"), list) else []
    if len(return_types) != 1:
        return None, {}, f"unsupported_return_arity:{len(return_types)}"
    projection = str(observation.get("return_projection") or "direct")
    component_expectations: list[dict[str, Any]] = []
    if projection in {"struct_fields", "array_len_first"}:
        component_expectations, err = _component_return_expected_literals(observation, expected)
        if err or component_expectations is None:
            return None, {}, str(err)
        return_type = str(return_types[0])
        expected_literal = None
    else:
        return_type, expected_literal, err = _return_expected_literal(observation, expected)
        if err or return_type is None or expected_literal is None:
            return None, {}, f"bad_return_expected:{err}"
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    ctor, err = _constructor_expr(contract_type, constructor, witness_values, constructor_fixture,
                                 default_unbound_args=default_unbound_args)
    pre_ctor_lines: list[str] = []
    constructor_strategy = (
        "ce_witness_fresh_instance"
        if _ordered_witness_values("__invmut_ctor_arg", witness_values)
        else "same_row_accepted_put_fixture"
    )
    if err == "constructor_witness_arity_mismatch":
        call_sequence = asset.get("call_sequence") if isinstance(asset.get("call_sequence"), list) else []
        locus = str(observation.get("locus_name") or asset.get("boundary") or "")
        is_zero_arg_owner_return = (
            projection == "direct"
            and return_type == "address"
            and expected_literal is not None
            and locus == "owner"
            and len(call_sequence) == 1
            and str(call_sequence[0]) == "owner"
            and used_call_sequence_fallback
            and constructor is not None
            and bool(constructor.params)
            and carrier_rendered_test
        )
        if is_zero_arg_owner_return:
            carrier_args, carrier_err = _carrier_constructor_args(
                carrier_rendered_test or "",
                contract_type,
            )
            if (
                carrier_err is None
                and carrier_args is not None
                and len(carrier_args) == len(constructor.params)
            ):
                deployer_name = f"__invmut_deployer_{asset.get('cohort_rank')}"
                pre_ctor_lines = [
                    f"address {deployer_name} = {expected_literal};",
                    f"vm.prank({deployer_name});",
                ]
                ctor = f"new {contract_type}({', '.join(carrier_args)})"
                err = None
                constructor_strategy = "carrier_constructor_args_ce_owner_deployer"
                adapter_notes.append(
                    "owner_return_deployer_from_observed_expected_and_carrier_constructor_args"
                )
    if err or ctor is None:
        return None, {}, str(err)
    instance_name = f"__invmut_ce_{asset.get('cohort_rank')}"
    body_lines = [*pre_ctor_lines, f"{contract_type} {instance_name} = {ctor};"]
    prefix_trace = trace[:-1]
    if prefix_trace:
        prefix_lines, prefix_notes, err = _replay_trace_lines(
            asset,
            entries=entries,
            instance_name=instance_name,
            trace=prefix_trace,
            wrapper_map=wrapper_map,
            source_entries=source_entries,
            default_unbound_args=default_unbound_args,
        )
        if err or prefix_lines is None:
            return None, {}, str(err)
        body_lines.extend(prefix_lines)
        adapter_notes.extend(prefix_notes)
    final_step = trace[-1] if isinstance(trace[-1], dict) else {}
    final_entry, err = _trace_entry_for_step(
        entries,
        final_step,
        wrapper_map=wrapper_map,
        fallback_returns=[return_type],
        source_entries=source_entries,
    )
    if err or final_entry is None:
        return None, {}, str(err)
    if not final_entry.returns:
        final_entry = FuncSig(
            final_entry.name,
            final_entry.kind,
            final_entry.visibility,
            final_entry.mutability,
            final_entry.params,
            [return_type],
            final_entry.src,
        )
    if adapter_notes and (final_entry.payable or final_entry.params):
        return None, {}, "call_sequence_fallback_requires_zero_arg_nonpayable_return"
    raw_args = final_step.get("args") if isinstance(final_step.get("args"), list) else []
    call_args, arg_prelude, err = _call_args_with_prelude(
        final_entry,
        raw_args,
        var_prefix=f"ce{asset.get('cohort_rank')}_ret",
        default_unbound_args=default_unbound_args,
    )
    if err or call_args is None:
        return None, {}, str(err)
    suffix, err = _call_suffix(final_step.get("value"), payable=final_entry.payable)
    if err or suffix is None:
        return None, {}, str(err)
    value = str(final_step.get("value") or "0")
    if final_entry.payable and value not in {"0", "0x0"}:
        body_lines.append(f"vm.deal(address(this), {value});")
        adapter_notes.append("fund_test_contract_for_payable_return_call")
    body_lines.extend(arg_prelude)
    ret_name = f"__invmut_return_{asset.get('cohort_rank')}"
    local_return_type = _return_local_type(return_type, projection)
    body_lines.extend(_balance_delta_lines(asset, instance_name)[0])
    body_lines.append(
        f"{local_return_type} {ret_name} = {instance_name}.{final_entry.name}{suffix}({', '.join(call_args)});"
    )
    if projection == "struct_fields":
        for item in component_expectations:
            component = item["component"]
            observed_expr, err = _project_return_component(ret_name, component)
            if err or observed_expr is None:
                return None, {}, str(err)
            component_name = ".".join(str(value) for value in component.get("path") or [component.get("name")])
            body_lines.append(
                (
                    f'assertEq({observed_expr}, {item["literal"]}, '
                    f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")} {component_name}");'
                )
            )
    elif projection == "array_len_first":
        if len(component_expectations) < 2:
            return None, {}, "array_return_expected_arity_mismatch"
        length_item = component_expectations[0]
        first_item = component_expectations[1]
        body_lines.append(
            (
                f'assertEq({ret_name}.length, {length_item["literal"]}, '
                f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")} length");'
            )
        )
        try:
            expected_len = int(str(length_item["literal"]), 0)
        except ValueError:
            expected_len = -1
        if expected_len > 0:
            observed_expr, err = _project_value_expr(f"{ret_name}[0]", first_item["component"])
            if err or observed_expr is None:
                return None, {}, str(err)
            body_lines.append(
                (
                    f'assertEq({observed_expr}, {first_item["literal"]}, '
                    f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")} first");'
                )
            )
    else:
        observed_expr = f"address({ret_name})" if projection == "address" else ret_name
        body_lines.append(
            (
                f'assertEq({observed_expr}, {expected_literal}, '
                f'"InvMut CE oracle {asset.get("cohort_rank")} {asset.get("assertion_id")}");'
            )
        )
    body_lines.extend(_wide_observation_assertions(asset, instance_name))
    body_lines.extend(_balance_delta_lines(asset, instance_name)[1])
    meta = {
        "template": "inline_return_fresh_instance",
        "expected_return_on_p": expected,
        "modified_return": modified,
        "return_type": return_type,
        "return_projection": projection,
        "return_component_count": len(component_expectations),
        "constructor_strategy": (
            constructor_strategy
        ),
        "replay_steps": len(trace),
        "prefix_replay_steps": len(prefix_trace),
        "replay_adapters": adapter_notes,
    }
    return body_lines, meta, None



def render_safety_check_block(
    asset: dict[str, Any],
    *,
    entries: list[FuncSig],
    constructor: FuncSig | None,
    contract_type: str,
    constructor_fixture: dict[str, Any] | None = None,
    wrapper_map: list[dict[str, Any]] | None = None,
    source_entries: list[FuncSig] | None = None,
    fabricated_entry_state: bool = False,
    separate_deployer: bool = False,
    default_unbound_args: bool = False,
) -> tuple[list[str] | None, dict[str, Any], str | None]:
    """Replay an R2 counterexample whose failing property is a SAFETY CHECK inside the mutant copy.

    `--multi-property` reports whichever property fails first, and that is not always the harness's
    differential assert. When the mutant introduces an overflow / underflow / bounds violation, solc
    0.8 compiles that check into the copy itself, so the run stops inside `C_mut` -- BEFORE the
    wrapper assigns `__invmut_revM`. The pair therefore comes back half-bound and every observation
    renderer refuses, although the counterexample pinned the whole witness (constructor args, the
    call sequence, its arguments and its value).

    It is still a difference, and a one-sided one: the trace's innermost frame is in `C_mut` while
    `C_ref` completed the same call. Under solc 0.8 that check is a Panic revert, so the faithful
    statement of the reference's half is "this call does not revert" -- the same shape the R1
    renderer emits. Everything the test replays comes from the witness; forge alone then decides
    Pass(P)/Break(M), and the held-out defective version never enters it.
    """
    sv = asset.get("safety_violation") if isinstance(asset.get("safety_violation"), dict) else {}
    if str(sv.get("side") or "") != "mut":
        return None, {}, f"safety_violation_side:{sv.get('side')}"
    trace = asset.get("witness_trace") if isinstance(asset.get("witness_trace"), list) else []
    if not asset.get("witness_trace_complete") or not trace:
        return None, {}, _trace_refusal(asset, entries, trace)
    # The check fired inside the LAST recorded call; earlier steps are the witness's own prefix.
    boundary_index = len(trace) - 1
    step = trace[boundary_index] if isinstance(trace[boundary_index], dict) else {}
    entry, err = _trace_entry_for_step(entries, step, wrapper_map=wrapper_map, source_entries=source_entries)
    if err or entry is None:
        return None, {}, str(err)
    raw_args = step.get("args") if isinstance(step.get("args"), list) else []
    call_args, arg_prelude, err = _call_args_with_prelude(
        entry, raw_args, var_prefix=f"ce{asset.get('cohort_rank')}_sc",
        default_unbound_args=default_unbound_args)
    if err or call_args is None:
        return None, {}, str(err)
    suffix, err = _call_suffix(step.get("value"), payable=entry.payable)
    if err or suffix is None:
        return None, {}, str(err)
    witness_values = asset.get("witness_values") if isinstance(asset.get("witness_values"), dict) else {}
    ctor, err = _constructor_expr(contract_type, constructor, witness_values, constructor_fixture,
                                  default_unbound_args=default_unbound_args)
    if err or ctor is None:
        return None, {}, str(err)
    instance_name = f"__invmut_ce_{asset.get('cohort_rank')}"
    value = str(step.get("value") or "0")
    funding_lines = []
    if entry.payable and value not in {"0", "0x0"}:
        funding_lines.append(f"vm.deal(address(this), {value});")
    adapter_notes: list[str] = []
    prefix_lines: list[str] = []
    if boundary_index > 0:
        prefix_lines, prefix_notes, err = _replay_trace_lines(
            asset, entries=entries, instance_name=instance_name, trace=trace[:boundary_index],
            wrapper_map=wrapper_map, source_entries=source_entries,
            all_steps_are_prefix=True, default_unbound_args=default_unbound_args)
        if err or prefix_lines is None:
            return None, {}, str(err)
        adapter_notes.extend(prefix_notes)
    check = str(sv.get("claim") or sv.get("function") or "safety").replace('"', "'")[:60]
    body_lines = [
        f"{contract_type} {instance_name} = {ctor};",
        *prefix_lines,
        *arg_prelude,
        *funding_lines,
        "bool __invmut_reverted = false;",
        f"try {instance_name}.{entry.name}{suffix}({', '.join(call_args)}) {{",
        "    __invmut_reverted = false;",
        "} catch {",
        "    __invmut_reverted = true;",
        "}",
        (f'assertEq(__invmut_reverted, false, '
         f'"InvMut CE oracle {asset.get("cohort_rank")} safety {check}");'),
    ]
    meta = {
        "template": ("replay_safety_check_witness_prefix_fresh_instance"
                     if boundary_index > 0 else "replay_safety_check_fresh_instance"),
        "prefix_len": boundary_index,
        "safety_check": sv.get("claim"),
        "violation_function": sv.get("function"),
        "violation_line": sv.get("line"),
        "boundary": entry.name,
        "call_value": value,
        "constructor_strategy": (
            "ce_witness_fresh_instance"
            if _ordered_witness_values("__invmut_ctor_arg", witness_values)
            else "same_row_accepted_put_fixture"
        ),
        "replay_adapters": adapter_notes,
        # PROVENANCE: only values entering the VIOLATED property's verification condition are pinned.
        # Here the violated property is the copy's own safety check, not the harness's differential
        # assert, so the witness self-equality terms never entered it and the recorded boundary
        # arguments are NOT pinned by this counterexample (measured: a CE claiming `b <= a` failed
        # while printing that same call's `__invmut_arg0 = 0`, which cannot violate it). They are
        # concretised, exactly like any value the counterexample left free.
        "witness_args_pinned": False,
    }
    return body_lines, meta, None
