"""solc AST extraction for the R2 single-file assembly (Doc 2 §6.3).

Provides exactly what the harness assembler needs from `solc --ast-compact-json`:
- the primary contract's byte span, name location, and base names;
- every reference token whose `referencedDeclaration` resolves to the primary contract, split
  into SELF references (inside the contract's own span — renamed) and EXTERNAL references
  (a dependency refers to C — the §6.3 inheritance/usage edge, unsupported in v1);
- the contract's function/constructor signatures with parameter TYPE TEXT sliced verbatim from
  source (robust for any declared type) plus mutability/visibility/returns.

No data-flow analysis here (Doc 2 §0.1) — only syntactic facts off the AST."""

from __future__ import annotations

import json
import subprocess
import re
from dataclasses import dataclass, field
from typing import Any, Optional


class AstError(RuntimeError):
    pass


def parse_src(src: str) -> tuple[int, int]:
    """'start:len:file' -> (start, start+len) byte offsets."""
    start, length, _ = src.split(":")
    return int(start), int(start) + int(length)


def byte_slice(source: str, a: int, b: int) -> str:
    """Slice `source` by solc BYTE offsets. solc AST `src`/`nameLocation` are UTF-8 byte offsets,
    NOT Python str (code-point) indices — slicing the str directly misaligns once any non-ASCII byte
    appears upstream (real flat files carry ©/emoji/unicode in comments), corrupting an unrelated
    identifier. Slice in byte space and decode back."""
    return source.encode("utf-8")[a:b].decode("utf-8")


def _diagnostic(stderr: str | None, cap: int = 400) -> str:
    """The part of solc's stderr worth showing: its ERRORS, never its warnings.

    solc prints warnings first, so a flat `stderr[:400]` can spend the whole budget on
    "Visibility for constructor is ignored" and cut the real diagnosis off.  MEASURED across both
    result trees: of 1321 attempt rows rejected with `solc could not produce AST`, 448 (33.9%,
    102 (trial,case) cells) stored a message containing no `Error:` at all -- so the reflection
    prompt that consumes compiler_error was shown warnings only.  Verified by re-running
    `solc --ast-compact-json` on 10 such stored test_codes: all 10 exit 1 with a real `Error:` in
    stderr (e.g. `Error: Identifier not found or not unique.`), i.e. the rejection was correct and
    only the feedback was useless.

    Keeps each error line with its `-->` location, and falls back to the raw head when solc
    reported no `Error:` line (a non-zero exit with warnings only)."""
    text = (stderr or "").strip()
    if not text:
        return ""
    lines, keep = text.splitlines(), []
    for i, ln in enumerate(lines):
        if "Error:" in ln:
            keep.extend(lines[i:i + 4])          # the error, its `-->` location and the source echo
    out = "\n".join(keep) if keep else text
    return out[:cap]


def get_ast(solc_bin: str, source_path: str, timeout_s: int = 60) -> dict:
    """Run solc --ast-compact-json on a file; return the parsed AST dict (raise on failure)."""
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
    """The LLM-FACING slice of a (possibly huge, flattened multi-contract) source: ONLY the target contract
    + its linearized inheritance chain, never the hundreds of unrelated libraries/interfaces a flattened
    file carries. Compilation/verification still use the FULL source — this only shrinks what the prompt
    shows the LLM, cutting prompt tokens ~100x on real-world files (observed: a 906KB flattened file whose
    target contract is 2KB → the rest is dead weight burning millions of tokens). Falls back to the full
    source if the AST can't be produced (never worse than the prior whole-file behaviour)."""
    import os
    import tempfile

    path = None
    try:
        # MUST write UTF-8: byte_slice() decodes solc's byte offsets as UTF-8, so solc must read the SAME
        # bytes. Writing with the system default encoding (codex SHOULD) would misalign every offset under
        # a non-UTF-8 locale, silently truncating/garbling slices.
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
    # Start from C + its linearized inheritance chain, then take a TRANSITIVE REFERENCE CLOSURE over the
    # top-level contracts: any interface/library/contract that a kept contract references — by type
    # (IERC20(x)), by `using L for` , by inheritance, or by call — is itself kept (codex SHOULD). Without
    # this, a flat file's IERC20/SafeTransferLib/MathLib bodies vanish from the prompt and the LLM loses
    # the external ABI / extension-method semantics it needs to write a correct test. Unreferenced
    # contracts (the bulk of a flattened file's dead weight) are still dropped — that is the whole point.
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
    # Walk the TOP-LEVEL nodes IN SOURCE ORDER. Keep: the closure contracts above AND every file-level
    # NON-contract declaration (struct / enum / constant / error / free function / user-defined value
    # type) — C may reference these by name. DROP only the unreferenced other contracts/libraries/
    # interfaces that make a flattened file huge. Compilation still uses the FULL source, so even an
    # over-tight slice only reduces prompt context — it never breaks the mutant/test build.
    parts = []
    target_present = False
    for n in top:
        if not isinstance(n, dict) or "src" not in n:
            continue
        nt = n.get("nodeType")
        if nt in ("PragmaDirective", "ImportDirective"):
            continue                                  # we emit our own pragma; imports are dead in a flat file
        if nt == "ContractDefinition":
            if n.get("id") not in keep_contract_ids:
                continue
            if n.get("id") == target["id"]:
                target_present = True                 # exact AST-id check, not a brittle string scan
        a, b = parse_src(n["src"])
        parts.append(byte_slice(full_source, a, b))
    if not parts or not target_present:
        return full_source                            # safety: never return a slice missing the target
    return (pragma + "\n\n" + "\n\n".join(parts)).strip() + "\n"


@dataclass
class FuncSig:
    name: str
    kind: str                       # "function" | "constructor" | "fallback" | "receive"
    visibility: str
    mutability: str                 # payable | nonpayable | view | pure
    params: list[tuple[str, str]]   # (type_text, param_name)
    returns: list[str]              # return type_texts
    src: tuple[int, int]
    # qparams (2026-09-23): each param's type as the ESBMC harness must spell it (see _qualified_param_type);
    # only harness._wrapper_params reads it, prompts and test rendering keep the source text in `params`.
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
    internal_types: frozenset[str] = frozenset()   # enum/struct names declared INSIDE this contract

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
    """Declared type text + data location for a parameter. The `typeName` src slice gives the
    base type WITHOUT the `memory`/`calldata` keyword (it is a separate token), so a reference-type
    param would lose its location and the generated wrapper would not compile (codex F4). Append
    the AST `storageLocation` when it is not the implicit `default`."""
    base = _type_text(source, p.get("typeName"))
    loc = p.get("storageLocation", "default")
    if loc and loc != "default" and loc not in base:
        return f"{base} {loc}"
    return base


def _qualified_param_type(source: str, p: dict) -> str:
    """The param type with a struct/enum/UDVT declared INSIDE another contract spelled qualified
    (`IProduct.ProductInfo calldata`). Inside C the bare name resolves through inheritance; the R2 harness
    contract does not inherit C's bases, so the bare name is `Identifier not found` and the WHOLE harness
    fails to compile. MEASURED (overnight/r2_harness_census.py, P vs P, gpt-5-mini config): 85 cells of 4
    cases (PhiNFT1155, fixlink Product/Product2, VaultAdapter) failed exactly so, 0 of their cells compiled.
    Only a qualified name that the source text lacks is used; everything else keeps the source text."""
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
    """Extract the ContractInfo for `contract_name` from the AST of `source` (already written to
    `source_path` for solc). `source` is the in-memory text used for byte slicing."""
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
            # the reference token text must equal the contract name (skip member tokens)
            if byte_slice(source, a, b) != contract_name:
                continue
            (self_refs if span[0] <= a and b <= span[1] else ext_refs).append((a, b))

    functions: list[FuncSig] = []
    constructor = None
    internal_types: set[str] = set()
    for n in cdef.get("nodes", []):
        nt = n.get("nodeType")
        if nt in ("EnumDefinition", "StructDefinition") and n.get("name"):
            internal_types.add(n["name"])   # C_ref.T and C_mut.T become DISTINCT types (codex B3)
        if nt != "FunctionDefinition":
            continue
        sig = _func_sig(source, n)
        if sig.kind == "constructor":
            constructor = sig
        else:
            functions.append(sig)

    return ContractInfo(contract_name, cid, span, name_loc, base_names,
                        self_refs, ext_refs, functions, constructor, frozenset(internal_types))
