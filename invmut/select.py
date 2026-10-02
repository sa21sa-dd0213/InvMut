"""Document 1 — static analysis and boundary selection (Slither).

Emits the deterministic SelectedTarget JSON (Doc 1 §7), EXTENDED per notes/DEVIATIONS.md:
- V3: stable `unit_id`, per-unit AST `statements[]` table, parsed `state_type` tree + getter
      availability (from Slither type objects), `entries` (drive_entries + reaches_unit).
- V4: `statement_id` = ordinal pre-order index in the unit body (the canonical statement
      inventory the covered ledger / mutation memory key on).
- V15: `State(address(this).balance)` is NOT emitted as a target (balance unobservable in R2).

This stage never mutates code. Slither only; no hand-written solc-AST walker; fail loud if
Slither cannot load the contract (Doc 1 §1, §13).
"""

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

# Doc 1 §7.5 allowed dropped-target reasons, PLUS the V3 extension `unsupported_state_type`
# (distinct from `unsupported_locus`: the locus exists but its type is not R2-projectable —
# bytes/string/dynamic-struct/contract leaf, F8-dropped balance). Documented in DEVIATIONS V3.
ALLOWED_DROP_REASONS = {
    "constant_state_var", "immutable_state_var", "no_non_constructor_writer",
    "no_mutable_scope_unit", "filter_not_matched", "unsupported_locus", "analysis_failed",
    "unsupported_state_type",  # V3 extension
    "private_state_not_externally_observable",  # direction-B: observation is public/external only
}

COMPONENT_RANK = {"State": 0, "Return": 1, "Revert": 2}

EXPLICIT_REVERT_CALLS = {
    "require(bool)", "require(bool,string)", "assert(bool)", "revert()", "revert(string)",
}

# value-type elementary leaves that R2 can project (DEVIATIONS V3). bytes/string excluded.
_VALUE_ELEM_PREFIXES = ("uint", "int", "bool", "address", "bytes")  # bytesN ok; bare 'bytes' filtered


class SelectionError(RuntimeError):
    pass


# --- type tree (V3) ----------------------------------------------------------------------

def _is_value_elementary(t: ElementaryType) -> bool:
    name = t.name
    if name in ("bytes", "string"):
        return False
    return name.startswith(_VALUE_ELEM_PREFIXES)


def build_state_type(t) -> dict[str, Any]:
    """Recursively walk a Slither type object into the V3 state_type tree."""
    if isinstance(t, ElementaryType):
        return {"kind": "scalar", "type": str(t), "value_typed": _is_value_elementary(t)}
    if isinstance(t, MappingType):
        # collect the full key chain through nested mappings
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
            for elem in u.elems_ordered:   # declaration order (mn1); elems_ordered holds vars
                ft = build_state_type(elem.type)
                fields.append({"name": elem.name, "type": ft})
                all_val = all_val and ft["value_typed"]
            return {"kind": "struct", "type": str(t), "struct_fields": fields,
                    "value_typed": all_val}
        if isinstance(u, Contract):
            return {"kind": "contract", "type": str(t), "value_typed": False}
    # catch-all: unknown class -> unsupported (no "assume value-type" default), V3
    return {"kind": "other", "type": str(t), "value_typed": False}


def _v1_unsupported_state(st: dict[str, Any]) -> bool:
    """True if the (possibly nested) type tree contains an ARRAY or STRUCT — both are listed in
    Doc 2 §6.6 but NOT yet implemented by the v1 R2 harness (which projects scalar + mapping(value
    leaf) + enum). Excluding here keeps Doc 1 selection consistent with the harness so the LLM is
    never handed a target Stage 5 can only return inconclusive on (codex F6)."""
    k = st.get("kind")
    if k in ("array", "struct"):
        return True
    if k == "mapping":
        return _v1_unsupported_state(st["value_type"])
    return False


def _struct_leaf_of(st: dict[str, Any]) -> dict[str, Any] | None:
    """The struct sitting under any mapping chain, or None. An ARRAY anywhere disqualifies: v1
    still cannot project an array index, and solc's synthesized getter for an array member does
    not return it. Only the mapping(K...)->struct shape is admitted here."""
    cur = st
    while cur.get("kind") == "mapping":
        cur = cur["value_type"]
    return cur if cur.get("kind") == "struct" else None


def _struct_components_of(struct_st: dict[str, Any]) -> list[dict[str, Any]] | None:
    """Per-field scalar projections of a struct, in declaration order, or None if the struct is
    not projectable.

    Why this is sound and not a fabricated observation point: for a PUBLIC state variable solc
    synthesizes a getter that returns exactly the struct's value-typed members as a tuple, in
    declaration order, so component index == tuple position and the observation genuinely exists
    on-chain through the contract's real deployed interface (same bar as the scalar/mapping path,
    select.py:525 comment).

    Restricted to ELEMENTARY fields on purpose: an enum- or contract-typed field has a DIFFERENT
    named type in the renamed C_ref / C_mut copies, so the two tuples could not be destructured
    into a common local type for the differential (this is the same reason `_cast_getter` casts
    enum leaves to uint256; a tuple element cannot be cast in place at declaration)."""
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
    """Getter availability per leaf-projectability (V3 / Doc 2 §6.6)."""
    if not state_type["value_typed"]:
        return {"available": False, "needs_injection": False, "signature": None,
                "reason": "unsupported_state_type"}
    # param list for the getter: mapping keys and array indices, tracking which is which so
    # names match Doc 2 §6.6 (mapping key -> `k`/`k1,k2`; array index -> `i`/`i1,i2`). (NI-2)
    params: list[tuple[str, str]] = []   # (solidity_type, role) role in {"key","idx"}
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
    # structured params (type/name/role) so Doc 2's harness builder reads them directly instead
    # of re-parsing the signature string (Doc 2 §6.6). Names match the signature exactly.
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
        # solc synthesizes a public getter named after the variable
        return {"available": True, "needs_injection": False, "getter_name": v.name,
                "params": struct_params,
                "signature": f"{v.name}({', '.join(p for p, _ in params)})", "leaf_type": leaf}
    # private/internal value-typed -> inject a symmetric view getter
    return {"available": False, "needs_injection": True, "getter_name": "__invmut_get",
            "params": struct_params,
            "signature": f"__invmut_get({sig_params}) external view returns ({leaf})",
            "leaf_type": leaf}


def _norm_type(t: str) -> str:
    """Normalize a solidity type for getter-signature matching (uint==uint256, int==int256)."""
    t = (t or "").strip()
    if t == "uint":
        return "uint256"
    if t == "int":
        return "int256"
    return t


def _explicit_getter_for(c, v, base_getter: dict[str, Any]) -> dict[str, Any] | None:
    """V45: a private/internal value-typed state var is still EXTERNALLY OBSERVABLE if the contract
    exposes an explicit public/external VIEW function that reads ONLY `v` and returns its leaf — e.g.
    `function getBalance(address u) public view returns (uint) { return userBalance[u]; }` (a very common
    hand-written getter, esp. in the reentrancy/CEI class). Recognize it so the differential can observe
    `v` through `c`'s real interface, instead of dropping the var as unobservable.

    Soundness: require view/pure + public/external + `state_variables_read == {v}` (reads nothing but v) +
    parameter types matching v's keys/indices + a single return matching the leaf. That is a faithful
    getter for v; even an imperfect match cannot manufacture a FALSE kill (the kill is gated by
    verify_test against the real bug — a difference in `c.f()` between P and M is a real behavioral
    difference), so this only RESTORES recall for an observation point that genuinely exists on-chain."""
    exp_types = [_norm_type(p["type"]) for p in base_getter.get("params", [])]
    leaf = _norm_type(base_getter.get("leaf_type") or "")
    for f in c.functions:
        if str(getattr(f, "visibility", "")) not in ("public", "external"):
            continue
        if not (getattr(f, "view", False) or getattr(f, "pure", False)):
            continue
        # codex (a) SOUNDNESS: reject a getter that references per-deployment CONTEXT (address(this),
        # block.*, msg.*, tx.*) — its value differs between the two copies even when `v` is IDENTICAL,
        # which would fabricate a P-vs-M difference (spurious R2 confirmation) and break P-vs-P. A
        # faithful getter of `v` reads NO solidity builtin variables.
        if getattr(f, "solidity_variables_read", None):
            continue
        try:
            # codex (b) RECALL: a getter reading `v` plus a constant/immutable is still faithful — drop
            # those from the read set before the exact-{v} faithfulness check.
            reads = {sv for sv in f.state_variables_read
                     if not getattr(sv, "is_constant", False) and not getattr(sv, "is_immutable", False)}
        except Exception:  # noqa: BLE001
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


# --- statement table (V4) ----------------------------------------------------------------

def _read_src(filename, srcs: dict[str, bytes]) -> bytes:
    """Bytes of a source file, cached by short name (M1: per-unit file, not just the primary).

    `filename` is a Slither Filename object with `.short` and `.absolute`. Inherited units
    live in OTHER files; their byte offsets index THAT file, so the statement-text slice must
    read the unit's own file."""
    key = filename.short
    if key not in srcs:
        srcs[key] = open(filename.absolute, "rb").read()
    return srcs[key]


def _unit_body_statements(unit, srcs: dict[str, bytes]) -> list[dict[str, Any]]:
    """Per-unit AST statement table (V4). statement_id = ordinal in source order of the
    body's statement-bearing nodes. Nodes before the body (modifier-call placeholders) and
    pure control markers (ENTRYPOINT/ENDIF/loop markers have expression==None) are excluded;
    a condition node (IF/IFLOOP) is a distinct, non-overlapping editable statement."""
    entry = unit.entry_point
    body_start = entry.source_mapping.start if (entry and entry.source_mapping) else -1
    nodes = []
    for n in unit.nodes:
        sm = n.source_mapping
        if sm is None:
            continue
        if n.expression is None:                      # control markers / entrypoint
            continue
        if sm.start < body_start:                     # modifier-call placeholder in signature
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
    """Resolve an edited byte span to its statement_id (DEVIATIONS V4, innermost rule).

    Block-spanning nodes (e.g. a `TRY` container) have ranges that NEST their inner statements,
    so ranges can overlap. The edit maps to the statement with the SMALLEST src_range that
    contains the edit span (the innermost enclosing statement). Used by Doc 2's single-edit
    classification; defined here because it is part of the V4 statement-table contract."""
    containing = [s for s in statements
                  if s["src_range"][0] <= edit_start and edit_end <= s["src_range"][1]]
    if not containing:
        return None
    return min(containing, key=lambda s: s["src_range"][1] - s["src_range"][0])


# --- helpers -----------------------------------------------------------------------------

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
    # Exclude Slither's SYNTHETIC `slitherConstructorVariables` function (FunctionType.
    # CONSTRUCTOR_VARIABLES, `is_constructor_variables`): it represents state-var INITIALIZERS, its
    # source range spans the WHOLE contract (not an editable body), and it is the only "writer" of a
    # var set just at declaration (e.g. `address public owner = msg.sender;`). Selecting it as the
    # mutable writer unit makes the LLM mutate a contract-spanning span — when it returns just the
    # function the splice destroys the `contract C {...}` wrapper → "Free functions cannot have
    # visibility" → did_not_compile, which (sharing the global miss budget) starves the REAL targets
    # (e.g. the revert target on the function that reads the var). A var written ONLY by its
    # initializer has no post-construction mutation anyway, so dropping it (no_non_constructor_writer)
    # is sound; its observable effect is still covered by the return/revert target.
    return [f for f in c.functions
            if (not f.is_constructor) and (not getattr(f, "is_constructor_variables", False))
            and (v in f.state_variables_written)]


def _drive_entries(c) -> list[str]:
    return sorted({f.full_name for f in c.functions_entry_points if _is_real_entry(f)})


def _reaches(unit, entry_fullnames: set[str]) -> bool:
    """Does a public/external entry reach this unit? Trivially true for an entry unit."""
    if _is_real_entry(unit):
        return True
    # USER 2026-06-30: fallback()/receive() are NOT in _is_real_entry (no callable signature) but ARE
    # externally drivable by a plain call / ether transfer. Treating them as unreachable wrongly stamped
    # their mutants `not_r2_checkable` (e.g. roulette's payable fallback), dropping a killable mutant. A
    # fuzz test can drive them via a direct send, so they ARE reachable for the diff-checkability purpose.
    if getattr(unit, "is_fallback", False) or getattr(unit, "is_receive", False):
        return True
    try:
        reach = {f.full_name for f in unit.all_reachable_from_functions}
    except Exception:  # noqa: BLE001 — Modifier or odd unit without the helper
        reach = {f.full_name for f in getattr(unit, "reachable_from_functions", [])}
    return bool(reach & entry_fullnames)


# --- unit + target construction ----------------------------------------------------------

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
    """Dedup by (kind, canonical_name, source_path, start_line, end_line); stricter
    (dependency-only) classification wins on conflict (Doc 1 §5.4)."""
    by_key: dict[tuple, dict] = {}
    for u in units:
        k = (u["kind"], u["canonical_name"], u["source_path"], u["start_line"], u["end_line"])
        if k not in by_key:
            by_key[k] = u
        else:
            if u["mutable"] is False:           # dependency-only wins
                by_key[k] = {**by_key[k], "mutable": False, "inclusion_reason": u["inclusion_reason"]}
                by_key[k].pop("statements", None)
    return list(by_key.values())


def _assign_unit_ids(mutable_units: list[dict], dep_units: list[dict]) -> None:
    """Stable per-target unit_id in scope-sort order (V3)."""
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

    # boundary (Doc 1 §6.1)
    if category == "state":
        boundary = {"category": "final_state", "signal": locus["canonical_name"],
                    "observation_point": "transaction_boundary", "entry": None}
    elif category == "return":
        boundary = {"category": "call_return", "signal": locus["canonical_name"],
                    "observation_point": "transaction_boundary", "entry": locus["signature"]}
    else:  # explicit_revert
        boundary = {"category": "call_revert", "signal": locus["canonical_name"],
                    "observation_point": "transaction_boundary", "entry": locus["signature"]}

    # reaches_unit for internal/private mutable units (V3). Pop the internal key from ALL
    # units (mutable + dependency) so it never leaks into the emitted JSON.
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


# --- scope-unit + candidate generators ---------------------------------------------------

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
        # v1: single-return only — ESBMC --bound returns NONDET tuple components for an external
        # call into the two-instance R2 harness, making multi-return differential unsound (F12).
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
    """V46: this Slither version's `c.state_variables` omits INHERITED declarations
    (measured: OZ ERC20 `_balances` absent on a token inheriting ERC20), so a fault
    in an inherited writer (e.g. an overridden `_transfer`) is never presented as a
    mutable unit.  Gated: official arms keep the shipped selection bit-identically."""
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
        # V45: before dropping a private/internal var as unobservable, see if an explicit public VIEW
        # getter function exposes it (common reentrancy/CEI pattern: private balance + getBalance()).
        if getter.get("needs_injection") and st.get("value_typed"):
            explicit = _explicit_getter_for(c, v, getter)
            if explicit is not None:
                getter = explicit
        # RQ semantics: observation is PUBLIC/EXTERNAL only. A private/internal state var has no
        # synthesized public getter, so it is NOT externally observable — a mutant whose effect is
        # confined to it is a WEAK mutant (the change cannot be witnessed through the contract's real
        # deployed interface). Drop it rather than inject an artificial __invmut_get (which would
        # fabricate an observation point that does not exist on-chain and contradicts the method). Effects
        # that DO surface are still captured by the public-state / return / revert / balance targets.
        if getter.get("needs_injection"):
            dropped.append({"category": "state", "candidate": v.canonical_name,
                            "reason": "private_state_not_externally_observable"})
            continue
        if not st["value_typed"]:
            dropped.append({"category": "state", "candidate": v.canonical_name, "reason": "unsupported_state_type"})
            continue
        # v1: the R2 harness projects scalar + mapping(value leaf) only; array length/index
        # projection (Doc 2 §6.6) is not implemented yet, so exclude any array-bearing type here
        # rather than select it and have Stage 5 silently return inconclusive (codex F6).
        state_components = None
        if _v1_unsupported_state(st):
            # struct-leaf projection (2026-09-21): mapping(K...)->struct with all-elementary fields
            # IS externally observable through solc's synthesized public getter, so dropping it was a
            # harness limitation, not an observability one. Keep it only when the getter already
            # exists (never inject) so the "no fabricated observation point" rule above still holds.
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
    """Internal/private functions f calls, transitively (Slither IR; robust to the 0.10/0.11 API split)."""
    seen, stack, out = set(), [f], []
    while stack:
        g = stack.pop()
        try:
            calls = g.all_internal_calls()
        except Exception:  # noqa: BLE001
            calls = []
        for ic in calls:
            fn = getattr(ic, "function", ic)
            if getattr(fn, "canonical_name", None) is None or not hasattr(fn, "can_send_eth"):
                continue            # SolidityFunction builtins
            if fn.canonical_name in seen:
                continue
            seen.add(fn.canonical_name)
            out.append(fn)
    return out


def balance_targets(c, dep_globs, srcs, entry_fns, warnings):
    """When enabled, add one `State(address(this).balance)` target whose scope is every public/external entry
    that can send ether plus the internal functions it reaches that do the sending.

    V15 kept balance out because R2 cannot observe it (ESBMC does not model ether balances). That is
    unchanged: R2 returns INCONCLUSIVE for state_kind "balance" before any ESBMC call. What the target
    adds is the MUTATION scope: the
    functions whose only effect is ether leaving c (e.g. `refund()` writing a private balance and
    transferring) were in no target, so no mutant could ever edit them."""
    senders = [f for f in c.functions_entry_points
               if not f.is_constructor and str(f.visibility) in ("public", "external")
               and getattr(f, "can_send_eth", lambda: False)()]
    if not senders:
        return []
    scope = []
    for f in senders:
        # a sender writes address(this).balance: tag it as the var's public writer so cell_boundaries and
        # R2's pinned-boundary set (r2.public_writer_names) both see it as a boundary.
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
            # Return(f)/Revert(f): the target locus IS function f.
            if t["category"] in ("return", "explicit_revert") and loc["canonical_name"] == name:
                kept.append(t)
            # State(v): keep iff f writes v, i.e. f is one of the target's writer units.
            # Search dependency units too (mn2) so a dep-only writer still matches the filter
            # and is later dropped with the correct `no_mutable_scope_unit` reason, not
            # `filter_not_matched`.
            elif t["category"] == "state" and any(
                    u["kind"] == "function" and u["canonical_name"] == name
                    for u in t["scope"]["mutable_units"] + t["scope"]["dependency_units"]):
                kept.append(t)
        else:  # state_var
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
    except Exception as e:  # noqa: BLE001
        # Complex contracts (real-world DeFi: PrivatePool/PuttyV2…) overflow solc's legacy codegen stack
        # ("Stack too deep"); crytic-compile's combined-json forces full codegen even though Slither only
        # needs the AST. Retry once with --via-ir (Yul pipeline) which compiles them. Conditional, so every
        # non-affected case is bit-identical to the no-viaIR path. USER 2026-06-28 (trial-1 finding).
        if "Stack too deep" in str(e):
            # Ladder, not a single retry (2026-09-10): --via-ir alone still overflows for some
            # contracts, and for others it is --via-ir that overflows while the plain optimizer
            # resolves the stack pressure. Measured directly with solc 0.8.29 on the renamed fix
            # source, the three cases that reach this path need three DIFFERENT flag sets:
            #   pop_058_PuttyV2      --via-ir FAILS, --optimize OK
            #   pop_077_MergingPool  --via-ir OK,    --optimize OK, both together FAIL
            #   pop_018_PrivatePool  --via-ir OK,    --optimize FAILS
            # so try them in turn and keep the first that loads.
            last = None
            for args in ("--optimize", "--via-ir", "--via-ir --optimize"):
                try:
                    sl = Slither(path, solc=solc_bin, solc_args=args)
                    break
                except Exception as e2:  # noqa: BLE001
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

    # per-file source-byte cache for statement-text slicing (M1: inherited units live in
    # other files; _read_src reads each unit's OWN file on demand, keyed by short name).
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
