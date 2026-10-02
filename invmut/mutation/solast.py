
from __future__ import annotations

import json
import subprocess
import re
from dataclasses import dataclass, field
from typing import Any, Optional


class AstError(RuntimeError):
    pass


def parse_src(src: str) -> tuple[int, int]:
    start, length, _ = src.split(":")
    return int(start), int(start) + int(length)


def byte_slice(source: str, a: int, b: int) -> str:
    return source.encode("utf-8")[a:b].decode("utf-8")


def _diagnostic(stderr: str | None, cap: int = 400) -> str:
    text = (stderr or "").strip()
    if not text:
        return ""
    lines, keep = text.splitlines(), []
    for i, ln in enumerate(lines):
        if "Error:" in ln:
            keep.extend(lines[i:i + 4])
    out = "\n".join(keep) if keep else text
    return out[:cap]


def get_ast(solc_bin: str, source_path: str, timeout_s: int = 60) -> dict:
    try:
        proc = subprocess.run([solc_bin, "--ast-compact-json", source_path],
                              capture_output=True, text=True, timeout=timeout_s)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise AstError(f"solc AST invocation failed: {e}") from e
    if proc.returncode != 0 or "Error:" in (proc.stderr or ""):
        raise AstError(f"solc could not produce AST: {_diagnostic(proc.stderr)}")
    out = proc.stdout
    i = out.find("{")
    if i < 0:
        raise AstError("no JSON in solc AST output")
    try:
        return json.loads(out[i:])
    except json.JSONDecodeError as e:
        raise AstError(f"AST JSON parse failed: {e}") from e


def target_scope_source(solc_bin: str, full_source: str, contract_name: str,
                        pragma: str = "pragma solidity ^0.8.0;") -> str:
    import os
    import tempfile

    path = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".sol", delete=False,
                                         encoding="utf-8", newline="") as f:
            f.write(full_source)
            path = f.name
        ast = get_ast(solc_bin, path)
    except (AstError, OSError):
        return full_source
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass
    top = ast.get("nodes") or []
    contracts = {n["id"]: n for n in top
                 if isinstance(n, dict) and n.get("nodeType") == "ContractDefinition" and "id" in n}
    target = next((n for n in contracts.values() if n.get("name") == contract_name), None)
    if target is None:
        return full_source
    keep_contract_ids = set(target.get("linearizedBaseContracts") or [target["id"]])
    frontier = [cid for cid in keep_contract_ids if cid in contracts]
    while frontier:
        node = contracts.get(frontier.pop())
        if node is None:
            continue
        for sub in _walk(node):
            if isinstance(sub, dict):
                ref = sub.get("referencedDeclaration")
                if isinstance(ref, int) and ref in contracts and ref not in keep_contract_ids:
                    keep_contract_ids.add(ref)
                    frontier.append(ref)
    parts = []
    target_present = False
    for n in top:
        if not isinstance(n, dict) or "src" not in n:
            continue
        nt = n.get("nodeType")
        if nt in ("PragmaDirective", "ImportDirective"):
            continue
        if nt == "ContractDefinition":
            if n.get("id") not in keep_contract_ids:
                continue
            if n.get("id") == target["id"]:
                target_present = True
        a, b = parse_src(n["src"])
        parts.append(byte_slice(full_source, a, b))
    if not parts or not target_present:
        return full_source
    return (pragma + "\n\n" + "\n\n".join(parts)).strip() + "\n"


@dataclass
class FuncSig:
    name: str
    kind: str
    visibility: str
    mutability: str
    params: list[tuple[str, str]]
    returns: list[str]
    src: tuple[int, int]
    qparams: list[str] = field(default_factory=list)

    @property
    def is_entry(self) -> bool:
        return (self.kind == "function" and self.visibility in ("public", "external"))

    @property
    def payable(self) -> bool:
        return self.mutability == "payable"


@dataclass
class ContractInfo:
    name: str
    cid: int
    span: tuple[int, int]
    name_loc: tuple[int, int]
    base_names: list[str]
    self_ref_spans: list[tuple[int, int]]
    external_ref_spans: list[tuple[int, int]]
    functions: list[FuncSig]
    constructor: Optional[FuncSig] = None
    internal_types: frozenset[str] = frozenset()

    @property
    def entries(self) -> list[FuncSig]:
        return [f for f in self.functions if f.is_entry]


def _walk(node: Any):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def _type_text(source: str, type_node: dict | None) -> str:
    if not type_node or "src" not in type_node:
        return ""
    a, b = parse_src(type_node["src"])
    return byte_slice(source, a, b)


def _param_type(source: str, p: dict) -> str:
    base = _type_text(source, p.get("typeName"))
    loc = p.get("storageLocation", "default")
    if loc and loc != "default" and loc not in base:
        return f"{base} {loc}"
    return base


def _qualified_param_type(source: str, p: dict) -> str:
    text = _param_type(source, p)
    ts = (p.get("typeDescriptions") or {}).get("typeString") or ""
    if not ts or "function" in ts or "mapping" in ts:
        return text
    q = re.sub(r"\b(?:struct|enum|contract)\s+", "", ts)
    q = re.sub(r" storage (?:pointer|ref)$", " storage", q)
    q = re.sub(r" (?:memory|calldata|storage)$", "", q)
    if "." in q.split()[0] and "." not in (text.split()[0] if text else ""):
        loc = p.get("storageLocation", "default")
        return f"{q} {loc}" if loc and loc != "default" else q
    return text


def _func_sig(source: str, fn: dict) -> FuncSig:
    kind = fn.get("kind") or ("constructor" if fn.get("isConstructor") else "function")
    params = []
    for p in (fn.get("parameters", {}) or {}).get("parameters", []):
        params.append((_param_type(source, p), p.get("name") or ""))
    returns = [_param_type(source, p)
               for p in (fn.get("returnParameters", {}) or {}).get("parameters", [])]
    return FuncSig(
        name=fn.get("name") or kind,
        kind=kind,
        visibility=fn.get("visibility", ""),
        mutability=fn.get("stateMutability", "nonpayable"),
        params=params,
        returns=returns,
        src=parse_src(fn["src"]),
        qparams=[_qualified_param_type(source, p)
                 for p in (fn.get("parameters", {}) or {}).get("parameters", [])],
    )


def analyze_contract(solc_bin: str, source: str, source_path: str, contract_name: str) -> ContractInfo:
    ast = get_ast(solc_bin, source_path)

    cdef = None
    for n in _walk(ast):
        if n.get("nodeType") == "ContractDefinition" and n.get("name") == contract_name:
            cdef = n
            break
    if cdef is None:
        raise AstError(f"contract {contract_name!r} not found in AST")

    cid = cdef["id"]
    span = parse_src(cdef["src"])
    name_loc = parse_src(cdef["nameLocation"])
    base_names = []
    for b in cdef.get("baseContracts", []) or []:
        bn = b.get("baseName", {})
        if bn.get("name"):
            base_names.append(bn["name"])

    self_refs, ext_refs = [], []
    for n in _walk(ast):
        if not isinstance(n, dict):
            continue
        if n.get("referencedDeclaration") == cid and "src" in n:
            a, b = parse_src(n["src"])
            if byte_slice(source, a, b) != contract_name:
                continue
            (self_refs if span[0] <= a and b <= span[1] else ext_refs).append((a, b))

    functions: list[FuncSig] = []
    constructor = None
    internal_types: set[str] = set()
    for n in cdef.get("nodes", []):
        nt = n.get("nodeType")
        if nt in ("EnumDefinition", "StructDefinition") and n.get("name"):
            internal_types.add(n["name"])
        if nt != "FunctionDefinition":
            continue
        sig = _func_sig(source, n)
        if sig.kind == "constructor":
            constructor = sig
        else:
            functions.append(sig)

    return ContractInfo(contract_name, cid, span, name_loc, base_names,
                        self_refs, ext_refs, functions, constructor, frozenset(internal_types))
