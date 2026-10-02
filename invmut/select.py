
from __future__ import annotations

import fnmatch
import hashlib
from typing import Any

from slither import Slither
from slither.core.solidity_types import (
    ArrayType,
    ElementaryType,
    MappingType,
    UserDefinedType,
)
from slither.core.declarations import Structure, Enum, Contract

SCHEMA_VERSION = "invmut-static-selection-v1"

ALLOWED_DROP_REASONS = {
    "constant_state_var", "immutable_state_var", "no_non_constructor_writer",
    "no_mutable_scope_unit", "filter_not_matched", "unsupported_locus", "analysis_failed",
    "unsupported_state_type",
    "private_state_not_externally_observable",
}

COMPONENT_RANK = {"State": 0, "Return": 1, "Revert": 2}

EXPLICIT_REVERT_CALLS = {
    "require(bool)", "require(bool,string)", "assert(bool)", "revert()", "revert(string)",
}

_VALUE_ELEM_PREFIXES = ("uint", "int", "bool", "address", "bytes")


class SelectionError(RuntimeError):
    pass



def _is_value_elementary(t: ElementaryType) -> bool:
    name = t.name
    if name in ("bytes", "string"):
        return False
    return name.startswith(_VALUE_ELEM_PREFIXES)


def build_state_type(t) -> dict[str, Any]:
    if isinstance(t, ElementaryType):
        return {"kind": "scalar", "type": str(t), "value_typed": _is_value_elementary(t)}
    if isinstance(t, MappingType):
        keys = []
        cur = t
        while isinstance(cur, MappingType):
            keys.append(str(cur.type_from))
            cur = cur.type_to
        value = build_state_type(cur)
        return {"kind": "mapping", "type": str(t), "key_types": keys,
                "value_type": value, "nesting_depth": len(keys),
                "value_typed": value["value_typed"]}
    if isinstance(t, ArrayType):
        elem = build_state_type(t.type)
        return {"kind": "array", "type": str(t), "elem_type": elem,
                "value_typed": elem["value_typed"]}
    if isinstance(t, UserDefinedType):
        u = t.type
        if isinstance(u, Enum):
            return {"kind": "enum", "type": str(t), "value_typed": True}
        if isinstance(u, Structure):
            fields = []
            all_val = True
            for elem in u.elems_ordered:
                ft = build_state_type(elem.type)
                fields.append({"name": elem.name, "type": ft})
                all_val = all_val and ft["value_typed"]
            return {"kind": "struct", "type": str(t), "struct_fields": fields,
                    "value_typed": all_val}
        if isinstance(u, Contract):
            return {"kind": "contract", "type": str(t), "value_typed": False}
    return {"kind": "other", "type": str(t), "value_typed": False}


def _v1_unsupported_state(st: dict[str, Any]) -> bool:
    k = st.get("kind")
    if k in ("array", "struct"):
        return True
    if k == "mapping":
        return _v1_unsupported_state(st["value_type"])
    return False


def _struct_leaf_of(st: dict[str, Any]) -> dict[str, Any] | None:
    cur = st
    while cur.get("kind") == "mapping":
        cur = cur["value_type"]
    return cur if cur.get("kind") == "struct" else None


def _struct_components_of(struct_st: dict[str, Any]) -> list[dict[str, Any]] | None:
    fields = struct_st.get("struct_fields") or []
    if not fields:
        return None
    comps: list[dict[str, Any]] = []
    for i, f in enumerate(fields):
        ft = f.get("type") or {}
        if ft.get("kind") != "scalar" or not ft.get("value_typed"):
            return None
        comps.append({"index": i, "name": f.get("name"), "projection_type": ft.get("type")})
    return comps


def _getter_for(v, state_type: dict[str, Any]) -> dict[str, Any]:
    if not state_type["value_typed"]:
        return {"available": False, "needs_injection": False, "signature": None,
                "reason": "unsupported_state_type"}
    params: list[tuple[str, str]] = []
    st = state_type
    while True:
        if st["kind"] == "mapping":
            params.extend((kt, "key") for kt in st["key_types"])
            st = st["value_type"]
        elif st["kind"] == "array":
            params.append(("uint256", "idx"))
            st = st["elem_type"]
        else:
            break
    leaf = st["type"]
    n_key = sum(1 for _, r in params if r == "key")
    n_idx = sum(1 for _, r in params if r == "idx")
    ki = ii = 0
    parts = []
    for ptype, role in params:
        if role == "key":
            ki += 1
            name = "k" if n_key == 1 else f"k{ki}"
        else:
            ii += 1
            name = "i" if n_idx == 1 else f"i{ii}"
        parts.append(f"{ptype} {name}")
    sig_params = ", ".join(parts)
    struct_params = []
    ki = ii = 0
    for ptype, role in params:
        if role == "key":
            ki += 1
            nm = "k" if n_key == 1 else f"k{ki}"
        else:
            ii += 1
            nm = "i" if n_idx == 1 else f"i{ii}"
        struct_params.append({"type": ptype, "name": nm, "role": role})
    visibility = str(getattr(v, "visibility", "") or "")
    if visibility in ("public",):
        return {"available": True, "needs_injection": False, "getter_name": v.name,
                "params": struct_params,
                "signature": f"{v.name}({', '.join(p for p, _ in params)})", "leaf_type": leaf}
    return {"available": False, "needs_injection": True, "getter_name": "__invmut_get",
            "params": struct_params,
            "signature": f"__invmut_get({sig_params}) external view returns ({leaf})",
            "leaf_type": leaf}


def _norm_type(t: str) -> str:
    t = (t or "").strip()
    if t == "uint":
        return "uint256"
    if t == "int":
        return "int256"
    return t


def _explicit_getter_for(c, v, base_getter: dict[str, Any]) -> dict[str, Any] | None:
    exp_types = [_norm_type(p["type"]) for p in base_getter.get("params", [])]
    leaf = _norm_type(base_getter.get("leaf_type") or "")
    for f in c.functions:
        if str(getattr(f, "visibility", "")) not in ("public", "external"):
            continue
        if not (getattr(f, "view", False) or getattr(f, "pure", False)):
            continue
        if getattr(f, "solidity_variables_read", None):
            continue
        try:
            reads = {sv for sv in f.state_variables_read
                     if not getattr(sv, "is_constant", False) and not getattr(sv, "is_immutable", False)}
        except Exception:
            continue
        if reads != {v}:
            continue
        if [_norm_type(str(p.type)) for p in f.parameters] != exp_types:
            continue
        rets = list(getattr(f, "returns", []) or [])
        if len(rets) != 1 or _norm_type(str(rets[0].type)) != leaf:
            continue
        return {"available": True, "needs_injection": False, "getter_name": f.name,
                "params": base_getter["params"],
                "signature": f"{f.name}({', '.join(exp_types)})", "leaf_type": base_getter.get("leaf_type")}
    return None



def _read_src(filename, srcs: dict[str, bytes]) -> bytes:
    key = filename.short
    if key not in srcs:
        srcs[key] = open(filename.absolute, "rb").read()
    return srcs[key]


def _unit_body_statements(unit, srcs: dict[str, bytes]) -> list[dict[str, Any]]:
    entry = unit.entry_point
    body_start = entry.source_mapping.start if (entry and entry.source_mapping) else -1
    nodes = []
    for n in unit.nodes:
        sm = n.source_mapping
        if sm is None:
            continue
        if n.expression is None:
            continue
        if sm.start < body_start:
            continue
        nodes.append(n)
    nodes.sort(key=lambda n: n.source_mapping.start)
    out = []
    for i, n in enumerate(nodes, start=1):
        sm = n.source_mapping
        text = _read_src(sm.filename, srcs)[sm.start:sm.start + sm.length].decode("utf-8", "replace")
        out.append({
            "statement_id": f"S{i:03d}",
            "ordinal": i,
            "node_type": str(n.type).split(".")[-1],
            "src_range": [sm.start, sm.start + sm.length],
            "line_start": sm.lines[0] if sm.lines else None,
            "line_end": sm.lines[-1] if sm.lines else None,
            "text_hash": hashlib.sha256(text.encode()).hexdigest()[:16],
        })
    return out


def map_edit_to_statement(statements: list[dict], edit_start: int, edit_end: int) -> dict | None:
    containing = [s for s in statements
                  if s["src_range"][0] <= edit_start and edit_end <= s["src_range"][1]]
    if not containing:
        return None
    return min(containing, key=lambda s: s["src_range"][1] - s["src_range"][0])



def _is_dep(path: str, dep_globs: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, g) for g in (dep_globs or []))


def _is_real_entry(f) -> bool:
    return (str(f.visibility) in ("public", "external")
            and not f.is_constructor and not f.is_fallback and not f.is_receive)


def has_explicit_revert(fn) -> bool:
    for sc in fn.solidity_calls:
        name = getattr(getattr(sc, "function", None), "name", "")
        if name in EXPLICIT_REVERT_CALLS or name.startswith("revert "):
            return True
    return False


def _writers_of(c, v) -> list:
    return [f for f in c.functions
            if (not f.is_constructor) and (not getattr(f, "is_constructor_variables", False))
            and (v in f.state_variables_written)]


def _drive_entries(c) -> list[str]:
    return sorted({f.full_name for f in c.functions_entry_points if _is_real_entry(f)})


def _reaches(unit, entry_fullnames: set[str]) -> bool:
    if _is_real_entry(unit):
        return True
    if getattr(unit, "is_fallback", False) or getattr(unit, "is_receive", False):
        return True
    try:
        reach = {f.full_name for f in unit.all_reachable_from_functions}
    except Exception:
        reach = {f.full_name for f in getattr(unit, "reachable_from_functions", [])}
    return bool(reach & entry_fullnames)



def _src_range_lines(obj):
    sm = obj.source_mapping
    return (sm.filename.short, sm.lines[0] if sm.lines else None,
            sm.lines[-1] if sm.lines else None)


def _unit_record(obj, kind: str, reason: str, dep_globs, srcs) -> dict[str, Any]:
    path, start, end = _src_range_lines(obj)
    if kind == "state_var":
        mutable = False
    else:
        mutable = not _is_dep(path, dep_globs)
    rec = {
        "kind": kind,
        "canonical_name": obj.canonical_name,
        "signature": (None if kind == "state_var" else obj.full_name),
        "visibility": (str(obj.visibility) if getattr(obj, "visibility", None) else None),
        "source_path": path,
        "start_line": start,
        "end_line": end,
        "mutable": mutable,
        "inclusion_reason": reason,
    }
    if mutable and kind in ("function", "modifier"):
        rec["statements"] = _unit_body_statements(obj, srcs)
    return rec


def _dedup_units(units: list[dict]) -> list[dict]:
    by_key: dict[tuple, dict] = {}
    for u in units:
        k = (u["kind"], u["canonical_name"], u["source_path"], u["start_line"], u["end_line"])
        if k not in by_key:
            by_key[k] = u
        else:
            if u["mutable"] is False:
                by_key[k] = {**by_key[k], "mutable": False, "inclusion_reason": u["inclusion_reason"]}
                by_key[k].pop("statements", None)
    return list(by_key.values())


def _assign_unit_ids(mutable_units: list[dict], dep_units: list[dict]) -> None:
    for i, u in enumerate(sorted(mutable_units, key=lambda u: (u["source_path"], u["start_line"] or 0)), 1):
        u["unit_id"] = f"U{i:03d}"
    base = len(mutable_units)
    for i, u in enumerate(sorted(dep_units, key=lambda u: (u["source_path"], u["start_line"] or 0)), 1):
        u["unit_id"] = f"D{i:03d}"


def _mk_target(c, category, component, locus, scope_units, dep_globs, entries, srcs,
               extra=None):
    units = _dedup_units(scope_units)
    mutable = [u for u in units if u["mutable"]]
    dependency = [u for u in units if not u["mutable"]]
    _assign_unit_ids(mutable, dependency)

    if category == "state":
        boundary = {"category": "final_state", "signal": locus["canonical_name"],
                    "observation_point": "transaction_boundary", "entry": None}
    elif category == "return":
        boundary = {"category": "call_return", "signal": locus["canonical_name"],
                    "observation_point": "transaction_boundary", "entry": locus["signature"]}
    else:
        boundary = {"category": "call_revert", "signal": locus["canonical_name"],
                    "observation_point": "transaction_boundary", "entry": locus["signature"]}

    reaches = {}
    for u in mutable:
        reaches[u["unit_id"]] = u.pop("_reaches", True)
    for u in dependency:
        u.pop("_reaches", None)

    target = {
        "category": category,
        "target": {"component": component, "locus": locus, **(extra or {})},
        "boundary": boundary,
        "scope": {"mutable_units": mutable, "dependency_units": dependency},
        "entries": {"drive_entries": entries["drive_entries"], "reaches_unit": reaches},
        "sort_key": {
            "source_path": locus["source_path"],
            "start_line": locus["start_line"],
            "component_rank": COMPONENT_RANK[component],
            "canonical_name": locus["canonical_name"],
        },
    }
    return target


def _func_locus(f) -> dict[str, Any]:
    path, start, end = _src_range_lines(f)
    return {"kind": "function", "name": f.name, "signature": f.full_name,
            "canonical_name": f.canonical_name, "source_path": path,
            "start_line": start, "end_line": end}


def _var_locus(v) -> dict[str, Any]:
    path, start, end = _src_range_lines(v)
    return {"kind": "state_var", "name": v.name, "signature": None,
            "canonical_name": v.canonical_name, "source_path": path,
            "start_line": start, "end_line": end}



def _scope_unit(obj, kind, reason, dep_globs, srcs, entry_fns) -> dict[str, Any]:
    rec = _unit_record(obj, kind, reason, dep_globs, srcs)
    if kind in ("function", "modifier"):
        rec["_reaches"] = _reaches(obj, entry_fns)
    return rec


def _modifier_units(f, dep_globs, srcs, entry_fns, reason):
    return [_scope_unit(m, "modifier", reason, dep_globs, srcs, entry_fns) for m in f.modifiers]


def return_targets(c, dep_globs, srcs, entry_fns, warnings):
    out = []
    for f in c.functions_entry_points:
        if _is_real_entry(f) and f.return_type and len(f.return_type) != 1:
            continue
        if _is_real_entry(f) and f.return_type:
            scope = [_scope_unit(f, "function", "return_function", dep_globs, srcs, entry_fns)]
            scope += _modifier_units(f, dep_globs, srcs, entry_fns, "modifier_of_return_function")
            out.append(_mk_target(
                c, "return", "Return", _func_locus(f), scope, dep_globs,
                {"drive_entries": sorted(entry_fns)}, srcs,
                extra={"return_types": [str(t) for t in f.return_type]}))
    return out


def _state_vars(c, include_inherited: bool = False):
    if not include_inherited:
        return list(c.state_variables)
    seen, out = set(), []
    for contract in [c] + list(c.inheritance):
        for v in contract.state_variables:
            if id(v) in seen:
                continue
            seen.add(id(v))
            out.append(v)
    return out


def state_targets(c, dep_globs, srcs, entry_fns, warnings, dropped, include_inherited_state=False,
                  struct_leaf_projection=False):
    out = []
    for v in _state_vars(c, include_inherited_state):
        if v.is_constant:
            dropped.append({"category": "state", "candidate": v.canonical_name, "reason": "constant_state_var"})
            continue
        if getattr(v, "is_immutable", False):
            dropped.append({"category": "state", "candidate": v.canonical_name, "reason": "immutable_state_var"})
            continue
        ws = _writers_of(c, v)
        if not ws:
            dropped.append({"category": "state", "candidate": v.canonical_name, "reason": "no_non_constructor_writer"})
            continue
        st = build_state_type(v.type)
        getter = _getter_for(v, st)
        if getter.get("needs_injection") and st.get("value_typed"):
            explicit = _explicit_getter_for(c, v, getter)
            if explicit is not None:
                getter = explicit
        if getter.get("needs_injection"):
            dropped.append({"category": "state", "candidate": v.canonical_name,
                            "reason": "private_state_not_externally_observable"})
            continue
        if not st["value_typed"]:
            dropped.append({"category": "state", "candidate": v.canonical_name, "reason": "unsupported_state_type"})
            continue
        state_components = None
        if _v1_unsupported_state(st):
            leaf = _struct_leaf_of(st) if struct_leaf_projection else None
            if leaf is not None and getter.get("available") and not getter.get("needs_injection"):
                state_components = _struct_components_of(leaf)
            if state_components is None:
                dropped.append({"category": "state", "candidate": v.canonical_name,
                                "reason": "unsupported_state_type", "detail": "array/struct projection (v1)"})
                continue
        scope = [_unit_record(v, "state_var", "target_state_declaration", dep_globs, srcs)]
        for w in ws:
            scope.append(_scope_unit(w, "function", "writer_of_target_state", dep_globs, srcs, entry_fns))
            scope += _modifier_units(w, dep_globs, srcs, entry_fns, "modifier_of_state_writer")
        out.append(_mk_target(
            c, "state", "State", _var_locus(v), scope, dep_globs,
            {"drive_entries": sorted(entry_fns)}, srcs,
            extra={"state_type": st, "getter": getter, "state_kind": st["kind"],
                   "is_mapping": st["kind"] == "mapping", "is_array": st["kind"] == "array",
                   "state_components": state_components}))
    return out


def _callee_functions(f):
    seen, stack, out = set(), [f], []
    while stack:
        g = stack.pop()
        try:
            calls = g.all_internal_calls()
        except Exception:
            calls = []
        for ic in calls:
            fn = getattr(ic, "function", ic)
            if getattr(fn, "canonical_name", None) is None or not hasattr(fn, "can_send_eth"):
                continue
            if fn.canonical_name in seen:
                continue
            seen.add(fn.canonical_name)
            out.append(fn)
    return out


def balance_targets(c, dep_globs, srcs, entry_fns, warnings):
    senders = [f for f in c.functions_entry_points
               if not f.is_constructor and str(f.visibility) in ("public", "external")
               and getattr(f, "can_send_eth", lambda: False)()]
    if not senders:
        return []
    scope = []
    for f in senders:
        scope.append(_scope_unit(f, "function", "writer_of_target_state", dep_globs, srcs, entry_fns))
        scope += _modifier_units(f, dep_globs, srcs, entry_fns, "modifier_of_value_transfer_function")
        for g in _callee_functions(f):
            if g.can_send_eth() and str(g.visibility) in ("internal", "private"):
                scope.append(_scope_unit(g, "function", "value_transfer_callee", dep_globs, srcs, entry_fns))
    path, start, end = _src_range_lines(c)
    locus = {"kind": "balance", "name": "balance", "signature": None,
             "canonical_name": f"{c.name}.balance", "source_path": path,
             "start_line": start, "end_line": end}
    st = {"kind": "balance", "value_typed": True}
    return [_mk_target(c, "state", "State", locus, scope, dep_globs,
                       {"drive_entries": sorted(entry_fns)}, srcs,
                       extra={"state_type": st, "getter": {"available": True, "kind": "balance"},
                              "state_kind": "balance", "is_mapping": False, "is_array": False,
                              "state_components": None})]


def revert_targets(c, dep_globs, srcs, entry_fns, warnings):
    out = []
    for f in c.functions_entry_points:
        if f.is_constructor or str(f.visibility) not in ("public", "external"):
            continue
        if has_explicit_revert(f) or any(has_explicit_revert(m) for m in f.modifiers):
            scope = [_scope_unit(f, "function", "explicit_revert_function", dep_globs, srcs, entry_fns)]
            scope += _modifier_units(f, dep_globs, srcs, entry_fns, "modifier_of_explicit_revert_function")
            out.append(_mk_target(
                c, "explicit_revert", "Revert", _func_locus(f), scope, dep_globs,
                {"drive_entries": sorted(entry_fns)}, srcs))
    return out


def _apply_filter(candidates, target_filter, dropped):
    if not target_filter:
        return candidates
    kind = target_filter.get("kind")
    name = target_filter.get("canonical_name")
    if kind not in ("function", "state_var") or not name:
        raise SelectionError(f"invalid target_filter: {target_filter!r}")
    kept = []
    for t in candidates:
        loc = t["target"]["locus"]
        if kind == "function":
            if t["category"] in ("return", "explicit_revert") and loc["canonical_name"] == name:
                kept.append(t)
            elif t["category"] == "state" and any(
                    u["kind"] == "function" and u["canonical_name"] == name
                    for u in t["scope"]["mutable_units"] + t["scope"]["dependency_units"]):
                kept.append(t)
        else:
            if t["category"] == "state" and loc["canonical_name"] == name:
                kept.append(t)
    if not kept:
        dropped.append({"category": None, "candidate": name, "reason": "filter_not_matched"})
    return kept


def analyze(path: str, contract_name: str, solc_bin: str, dep_globs=None, target_filter=None,
            slither_version: str = "0.11.5", include_inherited_state: bool = False,
            struct_leaf_projection: bool = False,
            value_transfer_targets: bool = False) -> dict[str, Any]:
    dep_globs = dep_globs or []
    try:
        sl = Slither(path, solc=solc_bin)
    except Exception as e:
        if "Stack too deep" in str(e):
            last = None
            for args in ("--optimize", "--via-ir", "--via-ir --optimize"):
                try:
                    sl = Slither(path, solc=solc_bin, solc_args=args)
                    break
                except Exception as e2:
                    last = (args, e2)
            else:
                raise SelectionError(
                    f"Slither failed to load {path} (retried --optimize, --via-ir, "
                    f"--via-ir --optimize; last {last[0]}): {last[1]}") from e
        else:
            raise SelectionError(f"Slither failed to load {path}: {e}") from e
    matches = sl.get_contract_from_name(contract_name)
    if not matches:
        raise SelectionError(f"contract not found: {contract_name}")
    if len(matches) > 1:
        raise SelectionError(f"ambiguous contract name: {contract_name}")
    c = matches[0]

    srcs: dict[str, bytes] = {}
    primary_path = c.source_mapping.filename.short

    entry_fns = set(_drive_entries(c))
    dropped: list[dict] = []
    warnings: list[dict] = []

    candidates = []
    candidates += return_targets(c, dep_globs, srcs, entry_fns, warnings)
    candidates += state_targets(c, dep_globs, srcs, entry_fns, warnings, dropped,
                                include_inherited_state=include_inherited_state,
                                struct_leaf_projection=struct_leaf_projection)
    candidates += revert_targets(c, dep_globs, srcs, entry_fns, warnings)
    if value_transfer_targets:
        candidates += balance_targets(c, dep_globs, srcs, entry_fns, warnings)

    candidates = _apply_filter(candidates, target_filter, dropped)

    selected = []
    for t in candidates:
        if not t["scope"]["mutable_units"]:
            dropped.append({"category": t["category"], "candidate": t["target"]["locus"]["canonical_name"],
                            "reason": "no_mutable_scope_unit"})
            continue
        selected.append(t)

    selected.sort(key=lambda t: (t["sort_key"]["source_path"], t["sort_key"]["start_line"] or 0,
                                 t["sort_key"]["component_rank"], t["sort_key"]["canonical_name"]))
    for i, t in enumerate(selected):
        t["order"] = i
        t["id"] = f"T{i:04d}"

    counts = {"state": 0, "return": 0, "explicit_revert": 0}
    for t in selected:
        counts[t["category"]] += 1

    return {
        "schema_version": SCHEMA_VERSION,
        "tool": {"name": "invmut-static-selection", "slither_version": slither_version,
                 "solc_bin": solc_bin},
        "contract": {"name": c.name, "source_path": primary_path},
        "selection": {
            "target_filter": target_filter,
            "ordering": "locus.source_path,locus.start_line,component_rank,locus.canonical_name",
            "total_selected": len(selected),
            "counts_by_category": counts,
        },
        "targets": selected,
        "dropped_targets": dropped,
        "warnings": warnings,
    }
