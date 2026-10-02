"""PUBLIC SURFACE block (config.public_surface_block).

invmut/agents/prompts.py TEST_NOTES rules 3 and 8 both tell the model to use "the
EXACT signatures listed in the PUBLIC SURFACE block" and that "c has ONLY the members
listed in the PUBLIC SURFACE block" -- but nothing in the tree ever built that block, so
the model had to infer C's interface from the source body and guessed. MEASURED
(config.py:444, scripts/compile_failed_p_attribution.py): 22 of 25 P-side compile
failures are exactly that -- 15x a member that is not on C, 3x wrong tuple arity, 1x a
wrong returns-clause, 1x a non-payable C(address) cast.

The block is derived ONLY from the REFERENCE source's declarations (the same source
already pasted into the prompt in full). It restates the contract's public ABI, which
solc would give any caller; it says nothing about where the bug is, so it cannot steer
the model toward a known patch.
"""
from __future__ import annotations

from typing import Any, Optional

from invmut.mutation.solast import AstError, get_ast
from invmut.esbmc.runner import temp_sol

_PUBLIC = ("public", "external")


def _type_of(node: Optional[dict]) -> str:
    """The declared Solidity type string of a VariableDeclaration / TypeName node."""
    if not node:
        return ""
    td = node.get("typeDescriptions") or {}
    t = td.get("typeString") or ""
    # contract/struct/enum type strings carry a kind prefix solc does not accept back
    for pref in ("contract ", "struct ", "enum "):
        if t.startswith(pref):
            t = t[len(pref):]
    # storage-pointer annotations are not part of an external signature
    for suf in (" storage ref", " storage pointer", " memory", " calldata"):
        if t.endswith(suf):
            t = t[: -len(suf)]
    return t.strip()


def _params(node: dict, key: str) -> list[str]:
    out = []
    for p in (node.get(key) or {}).get("parameters", []) or []:
        t = _type_of(p)
        if not t:
            continue
        nm = p.get("name") or ""
        # reference types need an explicit data location in an external signature
        if t.endswith("[]") or t in ("string", "bytes") or t.startswith("struct"):
            t += " memory"
        out.append(f"{t} {nm}".strip())
    return out


def _mutability(fn: dict) -> str:
    m = fn.get("stateMutability") or ""
    return "" if m in ("", "nonpayable") else f" {m}"


def _fn_line(fn: dict) -> Optional[tuple[str, str]]:
    if fn.get("kind") not in (None, "function"):
        return None            # constructor / fallback / receive are not callable members
    if fn.get("visibility") not in _PUBLIC:
        return None
    name = fn.get("name") or ""
    if not name:
        return None
    args = ", ".join(_params(fn, "parameters"))
    rets = ", ".join(_params(fn, "returnParameters"))
    tail = f" returns ({rets})" if rets else ""
    # Key on name + PARAMETER TYPES, never on the bare name: Solidity allows
    # overloads (`latestVersion()` and `latestVersion(address)` both exist in the
    # corpus) and keying by name silently drops one of them from the surface, while
    # an override -- which by definition has the same parameter types -- still
    # replaces the base declaration it shadows.
    key = f"{name}({','.join(_type_of(q) for q in (fn.get('parameters') or {}).get('parameters', []) or [])})"
    return key, f"function {name}({args}) external{_mutability(fn)}{tail};"


def _struct_members(struct_def: dict) -> Optional[list[str]]:
    """solc's getter rule for a struct value: return its members as a tuple, OMITTING
    mapping- and array-typed members. Returns None when nothing is left."""
    out = []
    for m in (struct_def.get("members") or []):
        tn = m.get("typeName") or {}
        if tn.get("nodeType") in ("Mapping", "ArrayTypeName"):
            continue
        t = _type_of(m)
        if not t:
            continue
        nm = m.get("name") or ""
        out.append(f"{t} {nm}".strip())
    return out or None


def _getter_line(var: dict, structs: dict) -> Optional[tuple[str, str]]:
    """Synthesize the auto-getter solc generates for a `public` state variable.

    Mapping keys and array indices become parameters; a struct value is returned as a
    TUPLE of its value-typed members (mapping/array members are omitted by solc), which
    is the tuple-arity the model kept getting wrong.
    """
    if not var.get("stateVariable") or var.get("visibility") != "public":
        return None
    name = var.get("name") or ""
    if not name:
        return None
    tn = var.get("typeName") or {}
    keys: list[str] = []
    while True:
        nt = tn.get("nodeType")
        if nt == "Mapping":
            keys.append(_type_of(tn.get("keyType")))
            tn = tn.get("valueType") or {}
        elif nt == "ArrayTypeName":
            keys.append("uint256")
            tn = tn.get("baseType") or {}
        else:
            break
    ret = _type_of(tn)
    note = ""
    if tn.get("nodeType") == "UserDefinedTypeName":
        sd = structs.get(tn.get("referencedDeclaration"))
        if sd is not None:
            members = _struct_members(sd)
            if members is None:
                return None     # a struct with only mapping/array members has NO getter
            ret = ", ".join(members)
            note = "   // struct value -> TUPLE; destructure it, never assign to one variable"
    args = ", ".join(keys)
    return (f"{name}({','.join(keys)})",
            f"function {name}({args}) external view returns ({ret});{note}")


def _contract_nodes(ast: dict) -> dict[int, dict]:
    out = {}
    for src in (ast.get("nodes") or []):
        if src.get("nodeType") == "ContractDefinition":
            out[src.get("id")] = src
    return out


def _struct_defs(ast: dict) -> dict[int, dict]:
    """Every StructDefinition by id, file-level and contract-level alike."""
    out: dict[int, dict] = {}

    def walk(n: Any) -> None:
        if isinstance(n, dict):
            if n.get("nodeType") == "StructDefinition" and n.get("id") is not None:
                out[n["id"]] = n
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(ast.get("nodes") or [])
    return out


def build_block(solc_bin: str, source: str, contract_name: str) -> str:
    """The PUBLIC SURFACE block for `contract_name`, or "" when it cannot be derived.

    Never raises: a surface we cannot build must leave the prompt byte-identical to the
    official one rather than fail the case.
    """
    try:
        with temp_sol(source, prefix="invmut_surface_") as path:
            ast = get_ast(solc_bin, path)
    except (AstError, OSError, ValueError):
        return ""
    by_id = _contract_nodes(ast)
    structs = _struct_defs(ast)
    target = next((c for c in by_id.values() if c.get("name") == contract_name), None)
    if target is None:
        return ""

    # linearizedBaseContracts is most-derived first; walk it reversed so a derived
    # override replaces the base declaration it shadows.
    lin = list(target.get("linearizedBaseContracts") or [target.get("id")])
    lines: dict[str, str] = {}
    for cid in reversed(lin):
        c = by_id.get(cid)
        if not c:
            continue
        for n in (c.get("nodes") or []):
            nt = n.get("nodeType")
            if nt == "FunctionDefinition":
                got = _fn_line(n)
                if got:
                    lines[got[0]] = got[1]
            elif nt == "VariableDeclaration":
                got = _getter_line(n, structs)
                if got:
                    lines[got[0]] = got[1]
    if not lines:
        return ""
    body = "\n".join(f"//   {lines[k]}" for k in sorted(lines))
    return (f"// PUBLIC SURFACE of {contract_name} -- these are the ONLY members `c` has.\n"
            f"// Use these EXACT signatures (argument count, order, types, payability,\n"
            f"// and return arity). Any other member does NOT exist on c.\n"
            f"{body}\n"
            f"// End of PUBLIC SURFACE.")


# --- REQUIRED SETUP block (config.required_setup_block, default OFF) -----------------------------
# A state variable whose type is another CONTRACT and whose initial value is an address literal (or
# nothing, i.e. address(0)) points at an address that has NO CODE in a fresh Foundry EVM, so every
# call made through that handle reverts.  In the ACCURAL_DEPOSIT / MONEY_BOX family
# (`LogFile Log = LogFile(0x0486cF65...)`, `Log LogFile;`) that makes Deposit/Put and Collect revert
# on the REFERENCE contract until the test deploys that contract and registers it through its public
# setter -- and the setter is itself guarded (`if(intitalized)revert();`), so the call ORDER matters.
# Everything here is read off the REFERENCE source the prompt already carries; the bug/fix diff is
# never consulted.

def _is_addr_literal_init(value: Optional[dict]) -> bool:
    """True when a state var's initial value is `T(0x...)` / `0x...` / absent (⇒ address(0))."""
    if value is None:
        return True
    nt = value.get("nodeType")
    if nt == "Literal":
        return True
    if nt == "FunctionCall":                       # T(0x...) — an explicit contract-type cast
        args = value.get("arguments") or []
        return len(args) == 1 and (args[0] or {}).get("nodeType") == "Literal"
    return False


def _walk_nodes(n: Any):
    if isinstance(n, dict):
        yield n
        for v in n.values():
            yield from _walk_nodes(v)
    elif isinstance(n, list):
        for v in n:
            yield from _walk_nodes(v)


def _src_text(source: str, node: dict) -> str:
    try:
        a, ln, _f = (node.get("src") or "").split(":")
        return source[int(a):int(a) + int(ln)]
    except Exception:                               # noqa: BLE001
        return ""


def _guards_of(source: str, fn: dict) -> list[str]:
    """The LEADING guard statements of a function body, verbatim: `if (...) revert();` / `require(...)`."""
    out = []
    for st in ((fn.get("body") or {}).get("statements") or []):
        nt = st.get("nodeType")
        if nt == "IfStatement":
            txt = " ".join(_src_text(source, st).split())
            if "revert" in txt:
                out.append(txt)
                continue
            break
        if nt == "ExpressionStatement":
            e = st.get("expression") or {}
            callee = (e.get("expression") or {})
            if e.get("nodeType") == "FunctionCall" and callee.get("name") == "require":
                out.append(" ".join(_src_text(source, st).split()))
                continue
        break
    return out


def build_setup_block(solc_bin: str, source: str, contract_name: str) -> str:
    """The REQUIRED SETUP block for `contract_name`, or "" when there is nothing to say.

    Never raises: a block we cannot build must leave the prompt byte-identical to the official one.
    """
    try:
        with temp_sol(source, prefix="invmut_setup_") as path:
            ast = get_ast(solc_bin, path)
    except (AstError, OSError, ValueError):
        return ""
    by_id = _contract_nodes(ast)
    target = next((c for c in by_id.values() if c.get("name") == contract_name), None)
    if target is None:
        return ""
    ctr_names = {c.get("name") for c in by_id.values()}

    lin = list(target.get("linearizedBaseContracts") or [target.get("id")])
    # 1. contract-typed state vars left pointing at a codeless address
    handles: dict[int, tuple[str, str]] = {}        # decl id -> (var name, contract type)
    for cid in reversed(lin):
        c = by_id.get(cid)
        for n in ((c or {}).get("nodes") or []):
            if n.get("nodeType") != "VariableDeclaration" or not n.get("stateVariable"):
                continue
            tname = ((n.get("typeName") or {}).get("pathNode") or {}).get("name") \
                or (n.get("typeName") or {}).get("name") or ""
            if tname in ctr_names and _is_addr_literal_init(n.get("value")):
                handles[n.get("id")] = (n.get("name") or "", tname)
    if not handles:
        return ""

    # 2. public/external functions that CALL through a handle, and those that ASSIGN one
    readers: dict[int, set[str]] = {i: set() for i in handles}
    writers: dict[int, dict[str, list[str]]] = {i: {} for i in handles}
    for cid in reversed(lin):
        c = by_id.get(cid)
        for fn in ((c or {}).get("nodes") or []):
            if fn.get("nodeType") != "FunctionDefinition" or fn.get("visibility") not in _PUBLIC:
                continue
            nm = fn.get("name") or ("receive" if fn.get("kind") == "receive" else "fallback")
            for node in _walk_nodes(fn.get("body")):
                if not isinstance(node, dict):
                    continue
                if node.get("nodeType") == "MemberAccess":
                    base = node.get("expression") or {}
                    rid = base.get("referencedDeclaration")
                    if rid in handles:
                        readers[rid].add(nm)
                elif node.get("nodeType") == "Assignment":
                    lhs = node.get("leftHandSide") or {}
                    rid = lhs.get("referencedDeclaration")
                    if rid in handles:
                        writers[rid][nm] = _guards_of(source, fn)
    lines = []
    for hid, (vname, tname) in handles.items():
        if not readers[hid]:
            continue                                 # nothing calls through it: no setup needed
        lines.append(f"//   `{vname}` (type {tname}) is called through by: "
                     f"{', '.join(sorted(readers[hid]))}.")
        lines.append(f"//     Its initial value is a PLAIN ADDRESS with NO CODE in a fresh test EVM, "
                     f"so those calls REVERT until it is set.")
        if writers[hid]:
            for wnm, guards in sorted(writers[hid].items()):
                g = (" Guarded by: " + " ".join(guards)) if guards else ""
                lines.append(f"//     Set it with `{wnm}(...)` FIRST, passing a {tname} you deployed "
                             f"in the test.{g}")
        else:
            lines.append(f"//     No public setter exists, so those functions cannot succeed at all; "
                         f"build the property out of the REVERT instead.")
    if not lines:
        return ""
    body = "\n".join(lines)
    return ("// REQUIRED SETUP of " + contract_name + " -- facts read off the reference source.\n"
            "// Calls made through a contract-typed handle that was never assigned a DEPLOYED address\n"
            "// revert, so the reference itself cannot reach its own happy path without this setup.\n"
            f"{body}\n"
            "// Respect the guards above when ordering the setup calls.\n"
            "// End of REQUIRED SETUP.")
