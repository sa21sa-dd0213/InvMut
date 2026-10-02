
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from invmut.esbmc.runner import temp_sol
from invmut.mutation.solast import AstError, get_ast, parse_src
from invmut.verify.canonical import _walk


@dataclass
class RenameError:
    reason: str


def _toplevel_contract_ids(ast: dict) -> dict[str, int]:
    out = {}
    for n in _walk(ast):
        if isinstance(n, dict) and n.get("nodeType") == "ContractDefinition" and n.get("name"):
            out[n["name"]] = n.get("id")
    return out


def _ref_spans_for(ast: dict, contract_id: int, contract_name: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    for n in _walk(ast):
        if not isinstance(n, dict):
            continue
        nt = n.get("nodeType")
        if nt == "ContractDefinition" and n.get("id") == contract_id:
            a, b = parse_src(n["src"])
            decl = n
            spans.append(_name_token_span(n, contract_name))
            continue
        ref = n.get("referencedDeclaration")
        if ref == contract_id and "src" in n:
            if nt in ("IdentifierPath", "Identifier", "UserDefinedTypeName"):
                spans.append(_node_name_span(n, contract_name))
    return [s for s in spans if s is not None]


def _name_token_span(cdef: dict, name: str) -> Optional[tuple[int, int]]:
    nl = cdef.get("nameLocation")
    if nl:
        a, ln, _ = nl.split(":")
        return (int(a), int(a) + int(ln))
    return None


def _node_name_span(node: dict, name: str) -> Optional[tuple[int, int]]:
    nl = node.get("nameLocations")
    if isinstance(nl, list) and nl:
        seg = nl[-1]
        a, ln, _ = seg.split(":")
        return (int(a), int(a) + int(ln))
    nl1 = node.get("nameLocation")
    if nl1:
        a, ln, _ = nl1.split(":")
        return (int(a), int(a) + int(ln))
    a, b = parse_src(node["src"])
    return (a, b)


def _apply_spans(src: str, spans: list[tuple[int, int]], new_name: str) -> str:
    b = src.encode("utf-8")
    nn = new_name.encode("utf-8")
    for a, e in sorted(set(spans), key=lambda s: s[0], reverse=True):
        b = b[:a] + nn + b[e:]
    return b.decode("utf-8")


def _fresh_name(taken: set[str]) -> str:
    i = 0
    while True:
        cand = f"C_collide_{i}"
        if cand not in taken:
            return cand
        i += 1


def _is_identifier(name: str) -> bool:
    return bool(name) and (name[0].isalpha() or name[0] == "_") and all(
        ch.isalnum() or ch == "_" for ch in name
    )


def rename_to_C(solc_bin: str, source: str, target_contract: str) -> str | RenameError:
    try:
        with temp_sol(source, prefix="invmut_rn_") as p:
            ast = get_ast(solc_bin, p)
    except AstError as e:
        return RenameError(f"ast_failed: {e}")
    ids = _toplevel_contract_ids(ast)
    if target_contract not in ids:
        return RenameError(f"target_contract {target_contract!r} not found")
    if target_contract == "C":
        return source

    work = source
    if "C" in ids:
        fresh = _fresh_name(set(ids))
        spans = _ref_spans_for(ast, ids["C"], "C")
        work = _apply_spans(work, spans, fresh)
        try:
            with temp_sol(work, prefix="invmut_rn2_") as p:
                ast = get_ast(solc_bin, p)
        except AstError as e:
            return RenameError(f"ast_failed_after_collide: {e}")
        ids = _toplevel_contract_ids(ast)

    spans = _ref_spans_for(ast, ids[target_contract], target_contract)
    if not spans:
        return RenameError("no rename spans located")
    out = _apply_spans(work, spans, "C")
    try:
        with temp_sol(out, prefix="invmut_rn3_") as p:
            get_ast(solc_bin, p)
    except AstError as e:
        return RenameError(f"renamed_ast_failed: {e}")
    return out


def rename_C_to(solc_bin: str, source: str, target_contract: str) -> str | RenameError:
    if target_contract == "C":
        return source
    if not _is_identifier(target_contract):
        return RenameError(f"invalid target_contract {target_contract!r}")
    try:
        with temp_sol(source, prefix="invmut_rn_from_c_") as p:
            ast = get_ast(solc_bin, p)
    except AstError as e:
        return RenameError(f"ast_failed: {e}")
    ids = _toplevel_contract_ids(ast)
    if "C" not in ids:
        return RenameError("contract 'C' not found")

    work = source
    if target_contract in ids and ids[target_contract] != ids["C"]:
        fresh = _fresh_name(set(ids) | {target_contract})
        spans = _ref_spans_for(ast, ids[target_contract], target_contract)
        work = _apply_spans(work, spans, fresh)
        try:
            with temp_sol(work, prefix="invmut_rn_from_c2_") as p:
                ast = get_ast(solc_bin, p)
        except AstError as e:
            return RenameError(f"ast_failed_after_collide: {e}")
        ids = _toplevel_contract_ids(ast)
        if "C" not in ids:
            return RenameError("contract 'C' not found after collider rename")

    spans = _ref_spans_for(ast, ids["C"], "C")
    if not spans:
        return RenameError("no rename spans located")
    out = _apply_spans(work, spans, target_contract)
    try:
        with temp_sol(out, prefix="invmut_rn_from_c3_") as p:
            get_ast(solc_bin, p)
    except AstError as e:
        return RenameError(f"renamed_ast_failed: {e}")
    return out
