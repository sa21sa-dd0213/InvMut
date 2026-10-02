
from __future__ import annotations

import re
from typing import Optional

from invmut.agents import prompts
from invmut.config import Config
from invmut.esbmc.runner import temp_sol
from invmut.mutation.solast import analyze_contract, get_ast, _walk


_INT_W = re.compile(r"^u?int(\d*)$")


def _nonzero_scalar(t: str) -> str:
    m = _INT_W.match(t)
    bits = int(m.group(1)) if (m and m.group(1)) else 256
    return str(10 ** min(18, max(1, bits // 4)))


def _default_arg(t: str, nonzero_scalars: bool = False) -> str:
    t = t.strip()
    t = re.sub(r"\b(memory|calldata|storage|payable)\b", "", t).strip()
    m = re.fullmatch(r"(.+?)\[\]", t)
    if m:
        return f"new {m.group(1).strip()}[](0)"
    if t in ("string", "bytes"):
        return '""'
    m = re.fullmatch(r"(?:contract\s+)?([A-Z]\w*)", t)
    if m and t not in ("bool",):
        return f"{m.group(1)}(address(this))"
    if t.startswith("address"):
        return "address(this)"
    if t.startswith(("uint", "int")):
        return _nonzero_scalar(t) if nonzero_scalars else "0"
    if t == "bool":
        return "false"
    if re.fullmatch(r"bytes([0-9]|[12][0-9]|3[0-2])", t):
        return f"{t}(0)"
    return "0"


def _deployable_contracts(ast: dict) -> dict[str, int]:
    out: dict[str, int] = {}
    for n in _walk(ast):
        if not isinstance(n, dict) or n.get("nodeType") != "ContractDefinition":
            continue
        if n.get("contractKind") != "contract" or n.get("abstract"):
            continue
        arity = 0
        for m in n.get("nodes", []) or []:
            if m.get("nodeType") == "FunctionDefinition" and m.get("kind") == "constructor":
                arity = len((m.get("parameters", {}) or {}).get("parameters", []) or [])
                break
        out[n.get("name") or ""] = arity
    out.pop("", None)
    return out


def _ctor_handle_params(ast: dict, contract_name: str) -> dict[str, str]:
    cdef = None
    for n in _walk(ast):
        if isinstance(n, dict) and n.get("nodeType") == "ContractDefinition" and n.get("name") == contract_name:
            cdef = n
            break
    if cdef is None:
        return {}
    ctor = next((m for m in (cdef.get("nodes") or [])
                 if m.get("nodeType") == "FunctionDefinition" and m.get("kind") == "constructor"), None)
    if ctor is None:
        return {}
    names = {p.get("name") for p in (ctor.get("parameters", {}) or {}).get("parameters", []) or [] if p.get("name")}
    if not names:
        return {}
    out: dict[str, str] = {}
    for n in _walk(ctor.get("body") or {}):
        if not isinstance(n, dict) or n.get("nodeType") != "Assignment":
            continue
        lhs_t = ((n.get("leftHandSide") or {}).get("typeDescriptions") or {}).get("typeString") or ""
        m = re.fullmatch(r"contract\s+(\w+)", lhs_t.strip())
        if not m:
            continue
        used = {q.get("name") for q in _walk(n.get("rightHandSide") or {})
                if isinstance(q, dict) and q.get("nodeType") == "Identifier"}
        for pname in names & used:
            out.setdefault(pname, m.group(1))
    return out


def _dependency_args(config: Config, p_source: str, source_path: str, contract_name: str,
                     ctor_params: list[tuple[str, str]], args: list[str],
                     needed: set | None = None, ctor_text: str = "") -> list[str]:
    needed = needed if needed is not None else set()
    ctor_text = ctor_text or ""
    try:
        ast = get_ast(config.solc_bin, source_path)
    except Exception:
        return args
    deployable = _deployable_contracts(ast)
    handles = _ctor_handle_params(ast, contract_name)
    out = list(args)
    for i, (ptype, pname) in enumerate(ctor_params):
        if i >= len(out):
            break
        t = re.sub(r"\b(memory|calldata|storage|payable)\b", "", (ptype or "")).strip()
        is_addr = re.fullmatch(r"address", t) is not None
        m = re.fullmatch(r"(?:contract\s+)?([A-Z]\w*)", t)
        if m and t != "bool":
            dep = m.group(1)
            cast = False
        elif is_addr and pname in handles:
            dep = handles[pname]
            cast = True
        elif (is_addr and getattr(config, "construction_fixtures", False)
              and _ctor_uses_param_as_contract(ctor_text, pname)):
            needed.add(HANDLE_STUB_NAME)
            out[i] = f"address(new {HANDLE_STUB_NAME}())"
            continue
        else:
            continue
        if dep == contract_name or deployable.get(dep, -1) != 0:
            if (getattr(config, "construction_fixtures", False)
                    and _ctor_uses_param_as_contract(ctor_text, pname)):
                needed.add(HANDLE_STUB_NAME)
                out[i] = (f"address(new {HANDLE_STUB_NAME}())" if cast
                          else f"{dep}(address(new {HANDLE_STUB_NAME}()))")
            continue
        out[i] = f"address(new {dep}())" if cast else f"new {dep}()"
    return out


HANDLE_STUB_NAME = "__InvMutHandleStub"
HANDLE_STUB_SRC = """
contract __InvMutHandleStub {
    function factory() external view returns (address) { return address(this); }
    function createPair(address, address) external view returns (address) { return address(this); }
    function underlying() external view returns (address) { return address(this); }
    function WETH() external view returns (address) { return address(this); }
    function name() external pure returns (string memory) { return "S"; }
    function symbol() external pure returns (string memory) { return "S"; }
    function decimals() external pure returns (uint8) { return 18; }
    function totalSupply() external pure returns (uint256) { return 0; }
    function balanceOf(address) external pure returns (uint256) { return 0; }
    function allowance(address, address) external pure returns (uint256) { return 0; }
    function approve(address, uint256) external pure returns (bool) { return true; }
    function transfer(address, uint256) external pure returns (bool) { return true; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return true; }
    receive() external payable {}
    fallback() external payable {}
}
"""

_BUILTIN_CASTS = {"payable", "address", "bool", "string", "bytes"}


def _ctor_uses_param_as_contract(ctor_text: str, pname: str) -> bool:
    if not ctor_text or not pname:
        return False
    if re.search(r"\b" + re.escape(pname) + r"\s*\.", ctor_text):
        return True
    for m in re.finditer(r"(\w+)\s*\(\s*" + re.escape(pname) + r"\s*\)", ctor_text):
        t = m.group(1)
        if t in _BUILTIN_CASTS or re.fullmatch(r"u?int\d*|bytes\d+", t):
            continue
        return True
    return False


_EOA_GUARD = re.compile(r"msg\.sender\s*==\s*tx\.origin|tx\.origin\s*==\s*msg\.sender")
_MOD_KEYWORDS = {"public", "external", "internal", "private", "payable", "nonpayable",
                 "view", "pure", "virtual", "override", "returns"}


def _ctor_slice(source: str, ctor) -> str:
    try:
        a, b = ctor.src
        return source[a:a + b] if b < len(source) else source[a:]
    except Exception:
        return ""


def _ctor_modifier_names(ctor_text: str) -> list[str]:
    header = ctor_text.split("{", 1)[0]
    tail = header.split(")", 1)[1] if ")" in header else ""
    return [t for t in re.findall(r"[A-Za-z_]\w*", tail) if t not in _MOD_KEYWORDS]


def _requires_eoa_deployer(source: str, ctor) -> bool:
    if ctor is None:
        return False
    text = _ctor_slice(source, ctor)
    if _EOA_GUARD.search(text):
        return True
    for name in _ctor_modifier_names(text):
        m = re.search(r"modifier\s+" + re.escape(name) + r"\s*\([^)]*\)\s*\{"
                      r"((?:[^{}]|\{[^{}]*\})*)\}", source)
        if m and _EOA_GUARD.search(m.group(1)):
            return True
    return False


_CTOR_VALUE_GATE = re.compile(
    r"msg\.value\s*(?:==|>=)\s*("
    r"\d[\d_]*\s*(?:ether|gwei|wei|finney|szabo)?|0x[0-9a-fA-F]+)"
    r"|("
    r"\d[\d_]*\s*(?:ether|gwei|wei|finney|szabo)?|0x[0-9a-fA-F]+)"
    r"\s*(?:==|<=)\s*msg\.value")


def _ctor_value_gate(source: str, ctor) -> Optional[str]:
    if ctor is None or not getattr(ctor, "payable", False):
        return None
    try:
        a, b = ctor.src
        body = source[a:a + b] if b < len(source) else source[a:]
    except Exception:
        return None
    m = _CTOR_VALUE_GATE.search(body or "")
    if m is None:
        return None
    return (m.group(1) or m.group(2) or "").strip() or None


def resolve_construction(config: Config, p_source: str, contract_name: str = "C",
                         nonzero_scalars: Optional[bool] = None) -> Optional[dict]:
    try:
        with temp_sol(p_source, prefix="invmut_ctor_") as path:
            info = analyze_contract(config.solc_bin, p_source, path, contract_name)
            ctor = info.constructor
            value = "0"
            if getattr(config, "ctor_value_from_require", False):
                value = _ctor_value_gate(p_source, ctor) or "0"
            fixtures = getattr(config, "construction_fixtures", False)
            eoa = bool(fixtures) and _requires_eoa_deployer(p_source, ctor)
            needed: set = set()
            if ctor is None or not ctor.params:
                return _with_fixtures({"kind": "no_arg", "value": value}, needed, eoa)
            _nz = (bool(getattr(config, "ctor_nonzero_scalar_args", False)) if nonzero_scalars is None
                   else bool(nonzero_scalars))
            args = [_default_arg(t, _nz) for t, _ in ctor.params]
            if getattr(config, "deploy_real_dependency_fixtures", False):
                args = _dependency_args(config, p_source, path, contract_name, list(ctor.params), args,
                                        needed, _ctor_slice(p_source, ctor))
    except Exception:
        return None
    return _with_fixtures({"kind": "args", "args": args, "value": value}, needed, eoa)


def p_deploy_canary(config: Config, p_source: str, construction: Optional[dict], pragma: str,
                    solc_version: str, contract_name: str = "C") -> tuple:
    import tempfile
    from invmut.render.pipeline import _BASENAME, _IMPORT_PATH, _LADDER, _stack_too_deep
    from invmut.render.validate import forge_diagnostic, run_forge
    from invmut.render.workspace import build_workspace
    from invmut.agents.prompts import file_level_types, import_symbols
    syms = import_symbols(contract_name, render_construction_expr(construction, contract_name),
                          ", ".join(file_level_types(p_source, contract_name)))
    test = ("// SPDX-License-Identifier: UNLICENSED\n" + pragma.strip() + "\n"
            'import {Test} from "forge-std/Test.sol";\n'
            f'import {{{syms}}} from "{_IMPORT_PATH}";\n\n'
            "contract InvMutTest is Test {\n"
            f"    {contract_name} c;\n"
            f"    function setUp() public {{ {render_construction_body(construction, contract_name)} }}\n"
            "    function test_invmut_deploy_canary() public { assertTrue(address(c) != address(0)); }\n"
            "}" + render_construction_decls(construction) + "\n")
    ws = tempfile.mkdtemp(prefix="invmut_canary_")
    try:
        o = None
        for via, opt in ((False, None),) + tuple(_LADDER):
            build_workspace(ws, p_source, _BASENAME, test, config.forge_std_path, solc_version=solc_version,
                            fuzz_runs=1, fuzz_seed=hex(config.verifier.forge_fuzz_seed), via_ir=via,
                            optimizer=opt)
            o = run_forge(config, ws, "InvMutTest")
            if not _stack_too_deep(o):
                break
    except Exception as e:
        return "unknown", f"canary_error: {str(e)[:200]}"
    finally:
        import shutil
        shutil.rmtree(ws, ignore_errors=True)
    if o is not None and o.kind == "setup_failed":
        return "setup_reverts", forge_diagnostic(o)
    if o is not None and o.kind == "ran" and o.tests and all(t.get("status") == "Success" for t in o.tests.values()):
        return "ok", None
    return "unknown", forge_diagnostic(o) if o is not None else None


def _with_fixtures(recipe: dict, needed: set, eoa: bool) -> dict:
    if needed:
        recipe["decls"] = [HANDLE_STUB_SRC] if HANDLE_STUB_NAME in needed else []
    if eoa:
        recipe["prelude"] = ["address __invmut_eoa = address(uint160(0xE0A));",
                             "vm.deal(__invmut_eoa, 100 ether);",
                             "vm.startPrank(__invmut_eoa, __invmut_eoa);"]
        recipe["epilogue"] = ["vm.stopPrank();"]
    return recipe


def render_construction_body(construction: Optional[dict], contract_name: str = "C") -> str:
    expr = render_construction_expr(construction, contract_name)
    parts = list((construction or {}).get("prelude") or [])
    parts.append(f"c = {expr};")
    parts += list((construction or {}).get("epilogue") or [])
    return " ".join(parts)


def render_construction_decls(construction: Optional[dict]) -> str:
    decls = list((construction or {}).get("decls") or [])
    return "".join(decls)


def _render_units(units: list, with_statements: bool = False) -> str:
    lines = []
    for u in units:
        name = u.get("canonical_name") or u.get("signature") or u.get("unit_id")
        span = f" (lines {u.get('start_line')}-{u.get('end_line')})" if u.get("start_line") else ""
        lines.append(f"- {u.get('unit_id')}: {name}{span}")
        if with_statements:
            for st in (u.get("statements") or []):
                a, b = st.get("line_start"), st.get("line_end")
                where = f"line {a}" if (a and (b is None or b == a)) else f"lines {a}-{b}"
                lines.append(f"    {st.get('statement_id')}  {st.get('node_type')}  {where}")
    return "\n".join(lines) if lines else "(none)"


def render_editable_units(target_json: dict) -> str:
    units = (target_json.get("scope", {}) or {}).get("mutable_units", [])
    return _render_units([u for u in units if u.get("mutable", True)])


def cell_boundaries(target_json: dict) -> list[str]:
    cat = target_json.get("category")
    if cat == "state":
        from invmut.mutation import r2 as r2mod
        drive = (target_json.get("entries", {}) or {}).get("drive_entries", []) or []
        bare_entries = {d.split("(")[0] for d in drive if isinstance(d, str) and d}
        return r2mod.public_writer_names(target_json, bare_entries)
    locus = (target_json.get("target", {}) or {}).get("locus", {}) or {}
    nm = locus.get("name") or (locus.get("signature") or "").split("(")[0]
    return [nm] if nm else []


def _modifier_invocations_of(source: str, unit_record: dict) -> set[str]:
    from invmut.mutation.static_stages import _split_signature_body, _split_header_clauses
    start, end = unit_record.get("start_line"), unit_record.get("end_line")
    if not isinstance(start, int) or not isinstance(end, int) or start < 1:
        return set()
    lines = source.splitlines()
    if end > len(lines):
        return set()
    text = "\n".join(lines[start - 1:end])
    split = _split_signature_body(text)
    header = split[0] if split else text
    _pref, _kept, mods = _split_header_clauses(header)
    return {m.split("(")[0] for m in mods}


def render_editable_units_for_boundary(target_json: dict, boundary: str,
                                       source: str, include_internal: bool = False,
                                       with_statements: bool = False) -> Optional[str]:
    units = (target_json.get("scope", {}) or {}).get("mutable_units", [])
    xu = next((u for u in units if u.get("mutable", True) and u.get("kind") == "function"
               and (u.get("signature") or "").split("(")[0] == boundary), None)
    if xu is None:
        return None
    keep = [xu]
    if include_internal:
        for u in units:
            if (u is not xu and u.get("mutable", True) and u.get("kind") == "function"
                    and str(u.get("visibility") or "") in ("private", "internal")):
                keep.append(u)
    mod_names = _modifier_invocations_of(source, xu)
    if mod_names:
        for u in units:
            if not u.get("mutable", True) or u.get("kind") != "modifier":
                continue
            tail = (u.get("canonical_name") or u.get("signature") or "").split(".")[-1].split("(")[0]
            if tail in mod_names:
                keep.append(u)
    return _render_units(keep, with_statements=with_statements)


def _fn_name(locus: dict) -> str:
    sig = locus.get("signature") or ""
    if sig:
        return sig.split("(")[0]
    cn = locus.get("canonical_name") or ""
    return cn.split(".")[-1].split("(")[0] if cn else "the boundary function"


def render_goal(target_json: dict, boundary: Optional[str] = None,
                alias_explicit_revert: bool = False) -> str:
    cat = target_json.get("category")
    tgt = target_json.get("target", {}) or {}
    locus = tgt.get("locus", {}) or {}
    if cat == "return":
        return prompts.goal_return(_fn_name(locus))
    if cat == "revert" or (alias_explicit_revert and cat == "explicit_revert"):
        return prompts.goal_revert(_fn_name(locus))
    var = locus.get("name") or (locus.get("canonical_name") or "v").split(".")[-1]
    stype = tgt.get("state_type", {}) or {}
    kind = stype.get("kind", "scalar")
    gkind = "mapping" if kind == "mapping" else ("balance" if kind == "balance" else "scalar")
    if boundary:
        fn = boundary.split("(")[0]
    else:
        entries = (target_json.get("entries", {}) or {}).get("drive_entries", [])
        fn = entries[0] if entries else "a state-changing function"
        fn = fn.split("(")[0] if isinstance(fn, str) else "a state-changing function"
    return prompts.goal_state(fn, var, gkind)


def boundaries_of(target_json: dict) -> list[str]:
    entries = (target_json.get("entries", {}) or {}).get("drive_entries", []) or []
    out = [e for e in entries if isinstance(e, str) and e.strip()]
    return out or ["(any public/external function)"]


def render_construction_expr(construction: Optional[dict], contract_name: str = "C") -> str:
    construction = construction or {"kind": "no_arg", "value": "0"}
    args = construction.get("args", []) if construction.get("kind") == "args" else []
    val = str(construction.get("value", "0") or "0")
    value_pfx = f"{{value: {val}}}" if val not in ("0", "", "0x0") else ""
    return f"new {contract_name}{value_pfx}(" + ", ".join(args) + ")"


def render_public_abi(solc_bin: str, p_source: str, c_type: str = "C", max_lines: int = 80) -> str:
    from invmut.esbmc.runner import temp_sol
    from invmut.mutation.solast import get_ast
    try:
        with temp_sol(p_source, prefix="invmut_abi_") as path:
            ast = get_ast(solc_bin, path)
    except Exception:
        return ""
    contracts = {}
    for n in _walk_nodes(ast):
        if n.get("nodeType") == "ContractDefinition":
            contracts[n["id"]] = n
    target = next((c for c in contracts.values() if c.get("name") == c_type), None)
    if target is None:
        return ""
    seen, lines = set(), []
    for cid in target.get("linearizedBaseContracts") or [target["id"]]:
        cdef = contracts.get(cid)
        if not cdef:
            continue
        for m in cdef.get("nodes", []):
            nt = m.get("nodeType")
            if nt == "FunctionDefinition" and m.get("visibility") in ("public", "external") \
                    and m.get("kind") == "function":
                params = ", ".join(_ptype(v) for v in m["parameters"]["parameters"])
                sig = f"{m['name']}({params})"
                if sig in seen:
                    continue
                seen.add(sig)
                rets = ", ".join(_ptype(v) for v in m["returnParameters"]["parameters"])
                mut = m.get("stateMutability", "nonpayable")
                lines.append(f"//   function {sig} {mut}" + (f" returns ({rets})" if rets else ""))
            elif nt == "VariableDeclaration" and m.get("visibility") == "public":
                ts = (m.get("typeDescriptions") or {}).get("typeString", "?")
                if m["name"] in seen:
                    continue
                seen.add(m["name"])
                lines.append(f"//   getter {m['name']}: {ts}")
    if not lines:
        return ""
    if len(lines) > max_lines:
        lines = lines[:max_lines] + [f"//   ... ({len(lines) - max_lines} more)"]
    return ("// PUBLIC SURFACE of " + c_type + " (exact signatures; a test may only call these on c):\n"
            + "\n".join(lines))


def _walk_nodes(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk_nodes(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk_nodes(v)


def _ptype(v: dict) -> str:
    ts = (v.get("typeDescriptions") or {}).get("typeString") or "?"
    ts = ts.replace("contract ", "").replace("struct ", "").replace("enum ", "")
    n = v.get("name")
    return f"{ts} {n}" if n else ts
