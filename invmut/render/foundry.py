
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from invmut.esbmc.runner import temp_sol
from invmut.mutation.solast import AstError, byte_slice, get_ast, parse_src
from invmut.verify.canonical import _walk

VALUE_CAP = "1000000000000000000000000000000"
_VALUE_CAP_NAME = "VALUE_CAP"

_ELEMENTARY = re.compile(r"^(bool|address|uint(\d+)?|int(\d+)?|bytes([1-9]|[12][0-9]|3[0-2]))$")
_DYNAMIC_REF = {"string", "bytes"}
_LOWLEVEL = {"call", "delegatecall", "staticcall", "send", "transfer"}


@dataclass
class RenderFail:
    code: str


def _contract_node(ast: dict, name: str) -> Optional[dict]:
    for n in _walk(ast):
        if n.get("nodeType") == "ContractDefinition" and n.get("name") == name:
            return n
    return None


def _txt(src: str, node: dict) -> str:
    a, b = parse_src(node["src"])
    return byte_slice(src, a, b)


def _stmt_text_with_semicolon(src: str, node: dict) -> str:
    a, b = parse_src(node["src"])
    bs = src.encode("utf-8")
    end = b
    while end < len(bs) and bs[end:end + 1] != b";":
        end += 1
    if end < len(bs):
        end += 1
    return bs[a:end].decode("utf-8")


def _stmt_text(src: str, node: dict) -> str:
    if node.get("nodeType") in ("TryStatement", "Block", "IfStatement", "ForStatement", "WhileStatement"):
        a, b = parse_src(node["src"])
        return byte_slice(src, a, b)
    return _stmt_text_with_semicolon(src, node)


def _is_elementary_type(ts: str) -> bool:
    return bool(_ELEMENTARY.match(ts.strip()))


def _bound_range(cond: dict, params: dict[str, str]) -> Optional[tuple[str, int, int]]:

    def _ident(n):
        n = n or {}
        if n.get("nodeType") == "Identifier" and n.get("name") in params:
            t = params[n["name"]]
            if t.startswith("uint"):
                return n["name"]
        return None

    def _lit(n):
        n = n or {}
        if n.get("nodeType") == "Literal" and n.get("kind") == "number":
            try:
                return int(n.get("value"))
            except (TypeError, ValueError):
                return None
        return None

    def _one_sided(n):
        if (n or {}).get("nodeType") != "BinaryOperation":
            return None
        op = n.get("operator")
        L, R = n.get("leftExpression"), n.get("rightExpression")
        p, k = _ident(L), _lit(R)
        if p is not None and k is not None:
            if op == "<":
                return (p, 0, k - 1)
            if op == "<=":
                return (p, 0, k)
            if op == ">":
                return (p, k + 1, None)
            if op == ">=":
                return (p, k, None)
        k, p = _lit(L), _ident(R)
        if p is not None and k is not None:
            if op == ">":
                return (p, 0, k - 1)
            if op == ">=":
                return (p, 0, k)
            if op == "<":
                return (p, k + 1, None)
            if op == "<=":
                return (p, k, None)
        return None

    if cond.get("nodeType") == "BinaryOperation" and cond.get("operator") == "&&":
        a = _one_sided(cond.get("leftExpression"))
        b = _one_sided(cond.get("rightExpression"))
        if a and b and a[0] == b[0]:
            lo = max(v for v in (a[1], b[1]) if v is not None)
            his = [v for v in (a[2], b[2]) if v is not None]
            if his:
                hi = min(his)
                if 0 <= lo <= hi:
                    return (a[0], lo, hi)
        return None
    one = _one_sided(cond)
    if one and one[2] is not None and one[1] <= one[2]:
        return one
    return None


def _bound_stmt(param: str, ts: str, lo: int, hi: int) -> str:
    if ts == "uint256":
        return f"{param} = bound({param}, {lo}, {hi});"
    return f"{param} = {ts}(bound(uint256({param}), {lo}, {hi}));"


_RESERVED_ADDR_TOP = "0xffff"

_SPECIAL_ADDRS = (
    "0x7109709ECfa91a80626fF3989D68f67F5b1DD12D",
    "0x000000000000000000636F6e736F6c652e6c6f67",
    "0x4e59b44847b379578588920cA78FbF26c0B4956C",
    "0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38",
)


def _conjuncts(cond: dict) -> list[dict]:
    if cond.get("nodeType") == "BinaryOperation" and cond.get("operator") == "&&":
        return _conjuncts(cond["leftExpression"]) + _conjuncts(cond["rightExpression"])
    return [cond]


def _ident_names(node) -> set[str]:
    out = set()
    for n in _walk(node):
        if isinstance(n, dict) and n.get("nodeType") == "Identifier" and n.get("name"):
            out.add(n["name"])
    return out


def _int_literal(node) -> Optional[int]:
    if (node or {}).get("nodeType") == "Literal" and node.get("kind") == "number":
        try:
            return int(str(node.get("value")), 0)
        except (TypeError, ValueError):
            return None
    return None


def _assignable(ts: str, rhs: dict) -> bool:
    ts = ts.strip()
    lit = _int_literal(rhs)
    if lit is not None and (ts.startswith("uint") or ts.startswith("int")):
        bits = int(ts[4:] or 256) if ts.startswith("uint") else int(ts[3:] or 256)
        if ts.startswith("uint"):
            return 0 <= lit < (1 << bits)
        return -(1 << (bits - 1)) <= lit < (1 << (bits - 1))
    return ts in ("address", "bool", "uint256", "int256", "bytes32")


def _eq_pin(conj: dict, pmap: dict[str, str], probe: str) -> Optional[tuple[str, str]]:
    if conj.get("nodeType") != "BinaryOperation" or conj.get("operator") != "==":
        return None
    L, R = conj.get("leftExpression"), conj.get("rightExpression")
    for a, b in ((L, R), (R, L)):
        if (a or {}).get("nodeType") == "Identifier" and a.get("name") in pmap:
            p = a["name"]
            if p not in _ident_names(b) and _assignable(pmap[p], b):
                return p, _txt(probe, b)
    return None


def _pinned_params(stmts: list, pmap: dict[str, str], probe: str) -> set[str]:
    pinned: set[str] = set()
    for st in stmts:
        if st.get("nodeType") != "ExpressionStatement":
            continue
        e = st.get("expression", {}) or {}
        if e.get("nodeType") != "FunctionCall":
            continue
        callee = e.get("expression", {}) or {}
        if callee.get("nodeType") != "Identifier" or callee.get("name") != "require":
            continue
        args = e.get("arguments", [])
        if not args:
            continue
        if _bound_range(args[0], pmap):
            continue
        for cj in _conjuncts(args[0]):
            pin = _eq_pin(cj, pmap, probe)
            if pin:
                pinned.add(pin[0])
    return pinned


def _addr_domain_terms(param: str, handle: str | None = None) -> list[str]:
    terms = [f"{param}.code.length == 0", f"uint160({param}) > {_RESERVED_ADDR_TOP}",
             f"{param} != address(this)"]
    if handle:
        terms.append(f"{param} != address({handle})")
    terms += [f"{param} != {a}" for a in _SPECIAL_ADDRS]
    return terms


def _addr_domain_stmt(param: str, handle: str) -> str:
    return f"vm.assume({' && '.join(_addr_domain_terms(param, handle))});"


def _addr_domain_stmts(param: str, handle: str | None = None) -> str:
    lines = [f"{param} = address(uint160(bound(uint256(uint160({param})), "
             f"{_RESERVED_ADDR_TOP} + 1, type(uint160).max)));"]
    terms = [f"{param}.code.length == 0", f"{param} != address(this)"]
    if handle:
        terms.append(f"{param} != address({handle})")
    terms += [f"{param} != {a}" for a in _SPECIAL_ADDRS]
    lines.append(f"vm.assume({' && '.join(terms)});")
    return "".join(f"\n        {ln}" for ln in lines)


_TEST_FN_RE = re.compile(
    r"function\s+(test\w*)\s*\(([^)]*)\)\s*(?:public|external)[^{]*\{")


_ARRLEN_RE = re.compile(
    r"^([ \t]*)vm\.assume\(\s*(\w+)\.length\s*(==|<=|>=|<|>)\s*(\d+)\s*\);[ \t]*$",
    re.M)


def _array_elem_type(src: str, name: str) -> str | None:
    m = re.search(r"function\s+test\w*\s*\(([^)]*)\)", src)
    if not m:
        return None
    for prm in (p.strip() for p in m.group(1).split(",")):
        parts = prm.split()
        if not parts or parts[-1] != name or "[]" not in prm:
            continue
        tail = prm[prm.index("[]") + 2:]
        if "calldata" in tail:
            return None
        return prm[:prm.index("[]")].strip()
    return None


def harden_array_length_assumes(src: str) -> str:
    def repl(m):
        indent, name, op, k = m.group(1), m.group(2), m.group(3), int(m.group(4))
        et = _array_elem_type(src, name)
        if et is None:
            return m.group(0)
        if op == "==":
            target = str(k)
        elif op == ">":
            target = f"{name}.length > {k} ? {name}.length : {k + 1}"
        elif op == ">=":
            target = f"{name}.length >= {k} ? {name}.length : {k}"
        elif op == "<=":
            target = f"{name}.length <= {k} ? {name}.length : {k}"
        else:
            if k == 0:
                return m.group(0)
            target = f"{name}.length < {k} ? {name}.length : {k - 1}"
        return (f"{indent}{{ uint256 __n = {target};\n"
                f"{indent}  {et}[] memory __a = new {et}[](__n);\n"
                f"{indent}  for (uint256 __i; __i < __n && __i < {name}.length; ++__i)"
                f" __a[__i] = {name}[__i];\n"
                f"{indent}  {name} = __a; }}")
    return _ARRLEN_RE.sub(repl, src)


_ARRLEN_PAIR_RE = re.compile(
    r"^([ \t]*)vm\.assume\(\s*(\w+)\.length\s*==\s*(\w+)\.length\s*\);[ \t]*$",
    re.M)


def harden_paired_array_lengths(src: str) -> str:
    def repl(m):
        indent, a, b = m.group(1), m.group(2), m.group(3)
        for target, source in ((b, a), (a, b)):
            et = _array_elem_type(src, target)
            if et is None:
                continue
            return (f"{indent}{{ uint256 __n = {source}.length;\n"
                    f"{indent}  {et}[] memory __p = new {et}[](__n);\n"
                    f"{indent}  for (uint256 __i; __i < __n && __i < {target}.length; ++__i)"
                    f" __p[__i] = {target}[__i];\n"
                    f"{indent}  {target} = __p; }}")
        return m.group(0)
    return _ARRLEN_PAIR_RE.sub(repl, src)


def harden_address_domain(src: str) -> str:
    src = harden_array_length_assumes(src)
    src = harden_paired_array_lengths(src)
    out, pos = [], 0
    for m in _TEST_FN_RE.finditer(src):
        params = [p.strip() for p in m.group(2).split(",") if p.strip()]
        names = [p.split()[-1] for p in params
                 if len(p.split()) >= 2 and p.split()[0] == "address"]
        names = [n for n in names if f"{n}.code.length" not in src]
        if not names:
            continue
        guards = "".join(_addr_domain_stmts(n) for n in names)
        out.append(src[pos:m.end()])
        out.append(guards)
        pos = m.end()
    out.append(src[pos:])
    return "".join(out)


def render_foundry(solc_bin: str, bundle: dict, c_scope_source: str, import_path: str,
                   pragma: str, contract_name: str = "C",
                   assume_distinct_addrs: bool = False,
                   param_only: bool = False) -> tuple[str, Optional[str]] | RenderFail:
    vts = bundle["verified_test_source"]
    m = re.search(r"\bcontract\s+(\w+)", vts)
    if not m:
        return RenderFail("malformed_bundle")
    test_name = m.group(1)
    probe = c_scope_source + "\n" + vts
    try:
        with temp_sol(probe, prefix="invmut_render_") as path:
            ast = get_ast(solc_bin, path)
    except AstError:
        return RenderFail("malformed_bundle")
    tc = _contract_node(ast, test_name)
    if tc is None:
        return RenderFail("malformed_bundle")

    handle = None
    state_decls: list[str] = []
    for n in tc.get("nodes", []):
        if n.get("nodeType") != "VariableDeclaration" or not n.get("stateVariable"):
            continue
        tn = n.get("typeName", {})
        ts = n.get("typeDescriptions", {}).get("typeString", "")
        if tn.get("nodeType") == "UserDefinedTypeName" and ts.startswith("contract "):
            handle = n.get("name")
            continue
        if not _is_elementary_type(ts):
            return RenderFail("unsupported_guard_state")
        state_decls.append(_stmt_text_with_semicolon(probe, n).strip())
    if handle is None:
        return RenderFail("malformed_bundle")

    body = None
    callbacks: list[str] = []
    for n in tc.get("nodes", []):
        if n.get("nodeType") != "FunctionDefinition":
            continue
        kind = n.get("kind")
        if kind == "constructor":
            continue
        if kind in ("receive", "fallback"):
            callbacks.append(_txt(probe, n))
            continue
        if n.get("visibility") in ("public", "external"):
            body = n
    if body is None:
        return RenderFail("malformed_bundle")
    body_name = body["name"]

    for n in _walk(body):
        if (n.get("nodeType") == "MemberAccess" and n.get("memberName") == "value"
                and (n.get("expression", {}) or {}).get("name") == "msg"):
            return RenderFail("unsupported_msg_value")

    params: list[tuple[str, str]] = []
    for p in (body.get("parameters", {}) or {}).get("parameters", []):
        ts = p.get("typeDescriptions", {}).get("typeString", "")
        base = ts.strip().split()[0] if ts.strip() else ""
        if base in _DYNAMIC_REF:
            ts = base + " memory"
        elif not _is_elementary_type(ts):
            return RenderFail("unsupported_param_type")
        params.append((ts, p.get("name")))
    pmap = {n: t for t, n in params}
    if param_only and not params:
        return RenderFail("unparameterised_put")

    for cb in callbacks:
        if re.search(rf"\b{re.escape(body_name)}\b", cb):
            return RenderFail("unsupported_callback_body_reference")

    value_params: list[str] = []
    for vc in bundle.get("value_calls", []):
        amt = (vc.get("amount_expr") or "").strip()
        if re.fullmatch(r"\d+", amt):
            continue
        if amt in pmap:
            if not pmap[amt].startswith("uint"):
                return RenderFail("unsupported_value_amount_type")
            value_params.append(amt)
        else:
            return RenderFail("unsupported_value_expression")

    block = body.get("body", {}) or {}
    stmts = block.get("statements", [])
    note: Optional[str] = None
    out_lines: list[str] = []
    pinned = _pinned_params(stmts, pmap, probe)

    fund_this = bool(value_params or bundle.get("payable"))
    fund_c = bool(value_params or bundle.get("payable") or bundle.get("fund_c"))
    _synth_terms = [f"({(vc.get('amount_expr') or '').strip()})" for vc in bundle.get("value_calls", [])]
    _synth_cond = (re.sub(r"\s+", "", "address(this).balance>=" + "+".join(_synth_terms))
                   if _synth_terms else None)
    for vp in value_params:
        out_lines.append(_bound_stmt(vp, pmap[vp], 0, int(VALUE_CAP)))
    if fund_this:
        terms: list[str] = []
        for vc in bundle.get("value_calls", []):
            amt = (vc.get("amount_expr") or "").strip()
            if re.fullmatch(r"\d+", amt) and int(amt) > int(VALUE_CAP):
                terms.append(amt)
            else:
                terms.append(_VALUE_CAP_NAME)
        if not terms:
            terms = [_VALUE_CAP_NAME]
        out_lines.append(f"vm.deal(address(this), {' + '.join(terms)});")
    if fund_c:
        out_lines.append(f"vm.deal(address({handle}), {_VALUE_CAP_NAME});")
    fuzz_guards = [_addr_domain_stmt(n, handle) for ts, n in params
                   if ts.strip() == "address" and n not in pinned]

    assert_count = 0
    for st in stmts:
        nt = st.get("nodeType")
        if nt == "ExpressionStatement":
            e = st.get("expression", {}) or {}
            if e.get("nodeType") == "FunctionCall":
                callee = e.get("expression", {}) or {}
                fname = callee.get("name") if callee.get("nodeType") == "Identifier" else None
                args = e.get("arguments", [])
                if fname == "require" and args:
                    cond = args[0]
                    cond_txt = _txt(probe, cond)
                    if fund_this and _synth_cond and re.sub(r"\s+", "", cond_txt) == _synth_cond:
                        continue
                    br = _bound_range(cond, pmap)
                    if br:
                        p, lo, hi = br
                        out_lines.append(_bound_stmt(p, pmap[p], lo, hi))
                        continue
                    rest: list[str] = []
                    for cj in _conjuncts(cond):
                        pin = _eq_pin(cj, pmap, probe)
                        if pin:
                            out_lines.append(f"{pin[0]} = {pin[1]};")
                            continue
                        cbr = _bound_range(cj, pmap)
                        if cbr:
                            p, lo, hi = cbr
                            out_lines.append(_bound_stmt(p, pmap[p], lo, hi))
                        else:
                            rest.append(_txt(probe, cj))
                    if rest:
                        out_lines.append(f"vm.assume({' && '.join(rest)});")
                    continue
                if fname == "assert" and args:
                    assert_count += 1
                    out_lines.append(f"assertTrue({_txt(probe, args[0])});")
                    continue
        out_lines.append(_stmt_text(probe, st).strip())

    if assert_count != 1:
        return RenderFail("malformed_bundle")

    construction = bundle.get("construction", {}) or {}
    args_text = construction.get("args_text", "")
    value = str(construction.get("value", "0"))
    payable_ctor = value and value != "0"
    new_expr = (f"new {contract_name}{{value: {value}}}({args_text})" if payable_ctor
                else f"new {contract_name}({args_text})")
    setup_lines = []
    if payable_ctor:
        setup_lines.append(f"vm.deal(address(this), {value});")
    setup_lines.append(f"{handle} = {new_expr};")

    witness = bundle.get("witness") or {}
    wparams = witness.get("params") or {}
    regression = None
    if param_only:
        pass
    elif wparams and all(n in wparams for _, n in params):
        lits = []
        for ts, n in params:
            lit = _witness_literal(ts, wparams[n])
            if isinstance(lit, RenderFail):
                return lit
            lits.append(lit)
        regression = ", ".join(lits)
    elif not wparams:
        note = "no_witness_regression"

    return _emit(pragma, import_path, contract_name, test_name, handle, state_decls, callbacks,
                 setup_lines, body_name, params, out_lines, regression, fuzz_guards), note


def _witness_literal(ts: str, value) -> str | RenderFail:
    ts = ts.strip()
    s = str(value)
    if ts == "bool":
        return "true" if s in ("true", "True", "1") else "false"
    if ts == "address":
        if not re.fullmatch(r"0x[0-9a-fA-F]{40}", s):
            return RenderFail("m_witness_bad_address")
        return f"address({s})"
    if ts.startswith("uint") or ts.startswith("int"):
        try:
            iv = int(s)
        except ValueError:
            return RenderFail("m_witness_out_of_range")
        bits = int(ts[4:] or 256) if ts.startswith("uint") else int(ts[3:] or 256)
        if ts.startswith("uint"):
            if not (0 <= iv < (1 << bits)):
                return RenderFail("m_witness_out_of_range")
            return f"{ts}({iv})" if ts != "uint256" else str(iv)
        lo, hi = -(1 << (bits - 1)), (1 << (bits - 1)) - 1
        if not (lo <= iv <= hi):
            return RenderFail("m_witness_out_of_range")
        return f"{ts}({iv})"
    if ts.startswith("bytes"):
        return f"{ts}({s})"
    return RenderFail("m_witness_out_of_range")


def _emit(pragma, import_path, c, test_name, handle, state_decls, callbacks,
          setup_lines, body_name, params, body_lines, regression, fuzz_guards=()) -> str:
    params_sig = ", ".join(f"{t} {n}" for t, n in params)
    params_call = ", ".join(n for _, n in params)
    ind = "        "
    L = []
    L.append("// SPDX-License-Identifier: UNLICENSED")
    L.append(pragma.strip())
    L.append("")
    L.append('import {Test} from "forge-std/Test.sol";')
    L.append(f'import {{{c}}} from "{import_path}";')
    L.append("")
    L.append(f"contract {test_name} is Test {{")
    L.append(f"    uint256 internal constant {_VALUE_CAP_NAME} = {VALUE_CAP};")
    L.append(f"    {c} {handle};")
    for sd in state_decls:
        L.append(f"    {sd}")
    L.append("")
    L.append("    function setUp() public {")
    for s in setup_lines:
        L.append(ind + s)
    L.append("    }")
    L.append("")
    L.append(f"    function _{body_name}({params_sig}) internal {{")
    for s in body_lines:
        L.append(ind + s)
    L.append("    }")
    L.append("")
    L.append(f"    function testFuzz_{body_name}({params_sig}) public {{")
    for g in fuzz_guards:
        L.append(ind + g)
    L.append(f"        _{body_name}({params_call});")
    L.append("    }")
    if regression is not None:
        L.append("")
        L.append(f"    function testRegression_{body_name}_mWitness() public {{")
        L.append(f"        _{body_name}({regression});")
        L.append("    }")
    for cb in callbacks:
        L.append("")
        L.append("    " + cb)
    L.append("}")
    L.append("")
    return "\n".join(L)


_IMPORT_C_UNDER_TEST = re.compile(r'import\s*\{([^}]*)\}\s*from\s*"\.\./src/C_under_test\.sol"')


def prune_import_symbols(src: str) -> str:
    m = _IMPORT_C_UNDER_TEST.search(src)
    if not m:
        return src
    syms = [t.strip() for t in m.group(1).split(",") if t.strip()]
    if syms == ["C"]:
        return src
    body = src[:m.start()] + src[m.end():]
    own = {n for n, _, _ in _top_level_decls(body)}
    keep = [t for t in syms
            if t == "C" or (t.split(" as ")[-1].strip() not in own
                            and re.search(r"\b" + re.escape(t.split(" as ")[0]) + r"\b", body))]
    return src[:m.start()] + 'import {' + ", ".join(keep) + '} from "../src/C_under_test.sol"' + src[m.end():]


def adapt_imports(src: str, target: str) -> str:
    src = src.replace('from "../src/flat.sol"', f'from "../src/{target}.sol"')

    def _imp(m):
        syms = [t.strip() for t in m.group(1).split(",") if t.strip()]
        out = [f"{target} as C" if t == "C" else t for t in syms]
        return 'import {' + ", ".join(out) + '} from "../src/' + target + '.sol"'

    src = _IMPORT_C_UNDER_TEST.sub(_imp, src)
    return src


_GETTER_MEMBER = re.compile(
    r"\b([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\.\s*([A-Za-z_]\w*)\b")


def rewrite_struct_getter_members(src: str, getters: dict[str, list[str]]) -> tuple[str, int]:
    helpers: dict[tuple[str, str, str], str] = {}

    def sub(m: re.Match) -> str:
        recv, getter, args, member = m.group(1), m.group(2), m.group(3), m.group(4)
        members = getters.get(getter)
        if not members or member not in members:
            return m.group(0)
        key = (recv, getter, member)
        name = helpers.setdefault(key, f"__invmut_{recv}_{getter}_{member}")
        return f"{name}({args})"

    out = _GETTER_MEMBER.sub(sub, src)
    if not helpers:
        return src, 0
    decls = []
    for (recv, getter, member), name in sorted(helpers.items()):
        members = getters[getter]
        idx = members.index(member)
        slots = ", ".join(f"uint256 _v{i}" if i == idx else "" for i in range(len(members)))
        decls.append(f"    function {name}(address __k) internal view returns (uint256) {{\n"
                     f"        ({slots}) = {recv}.{getter}(__k);\n"
                     f"        return _v{idx};\n"
                     f"    }}")
    by_name = dict(zip((n for _, n in sorted(helpers.items())), decls))
    blocks = _top_level_decls(out)
    if not blocks:
        close = out.rfind("}")
        if close < 0:
            return src, 0
        return out[:close] + "\n" + "\n".join(decls) + "\n" + out[close:], len(helpers)
    for _name, s0, e0 in reversed(blocks):
        body = out[s0:e0]
        want = [d for n, d in by_name.items() if re.search(r"\b" + re.escape(n) + r"\s*\(", body)]
        if want:
            close = e0 - 1
            out = out[:close] + "\n" + "\n".join(want) + "\n" + out[close:]
    return out, len(helpers)


_FN_SIG = re.compile(r"function\s+(test\w*)\s*\(([^)]*)\)\s*(?:public|external)[^{]*\{")
_VALUE_IDENT = re.compile(r"\{\s*value\s*:\s*([A-Za-z_]\w*)\s*\}")


def bound_llm_value_params(src: str, cap: str = VALUE_CAP) -> tuple[str, int]:
    added = 0
    out = src
    for m in list(_FN_SIG.finditer(src)):
        params = {}
        for p in m.group(2).split(","):
            parts = p.split()
            if len(parts) >= 2 and parts[0].startswith("uint"):
                params[parts[-1]] = parts[0]
        if not params:
            continue
        depth, i = 1, m.end()
        while i < len(src) and depth:
            depth += (src[i] == "{") - (src[i] == "}")
            i += 1
        body = src[m.end():i - 1]
        want = [v for v in dict.fromkeys(_VALUE_IDENT.findall(body)) if v in params]
        want = [v for v in want if f"vm.assume({v} <= {_VALUE_CAP_NAME})" not in body]
        if not want:
            continue
        inject = "".join(f"\n        vm.assume({v} <= {_VALUE_CAP_NAME});" for v in want)
        out = out.replace(src[m.end():i - 1], inject + body, 1)
        added += len(want)
    if not added:
        return src, 0
    if not re.search(r"\bconstant\s+" + _VALUE_CAP_NAME + r"\b", out):
        heads = list(re.finditer(r"(?m)^\s*(?:pragma|import)\b[^;]*;[ \t]*$", out))
        pos = heads[-1].end() if heads else 0
        out = out[:pos] + f"\n\nuint256 constant {_VALUE_CAP_NAME} = {cap};" + out[pos:]
    return out, added


_LL_HEAD = re.compile(
    r"(?P<lhs>\(\s*bool\s+(?P<ok>[A-Za-z_]\w*)\s*,\s*(?:bytes\s+memory\s+(?P<data>[A-Za-z_]\w*))?\s*\)\s*=\s*)?"
    r"address\s*\(\s*(?P<h>[A-Za-z_]\w*)\s*\)\s*\.\s*call\s*(?:\{\s*value\s*:\s*(?P<v>[^{}]+?)\s*\})?\s*\(")


def _balanced(src: str, i: int) -> int:
    depth, j, q = 1, i, None
    while j < len(src):
        ch = src[j]
        if q:
            if ch == "\\":
                j += 2
                continue
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return -1


def _split_top(s: str) -> list[str]:
    out, depth, cur, q = [], 0, "", None
    for ch in s:
        if q:
            cur += ch
            if ch == q:
                q = None
            continue
        if ch in "\"'":
            q = ch
        elif ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def _decode_call(enc: str, handle: str) -> tuple[str, list[str]] | None:
    enc = enc.strip()
    m = re.fullmatch(r"abi\s*\.\s*encodeWithSignature\s*\((.*)\)", enc, re.S)
    if m:
        parts = _split_top(m.group(1))
        sm = re.fullmatch(r"\"\s*([A-Za-z_]\w*)\s*\(.*\)\s*\"", parts[0] if parts else "", re.S)
        return (sm.group(1), parts[1:]) if sm else None
    m = re.fullmatch(r"abi\s*\.\s*encodeWithSelector\s*\((.*)\)", enc, re.S)
    if m:
        parts = _split_top(m.group(1))
        sm = re.fullmatch(r"[A-Za-z_]\w*\s*\.\s*([A-Za-z_]\w*)\s*\.\s*selector", parts[0] if parts else "")
        return (sm.group(1), parts[1:]) if sm else None
    m = re.fullmatch(r"abi\s*\.\s*encodeCall\s*\((.*)\)", enc, re.S)
    if m:
        parts = _split_top(m.group(1))
        if len(parts) != 2:
            return None
        fm = re.fullmatch(r"[A-Za-z_]\w*\s*\.\s*([A-Za-z_]\w*)", parts[0])
        tup = parts[1].strip()
        if not fm or not (tup.startswith("(") and tup.endswith(")")):
            return None
        return fm.group(1), _split_top(tup[1:-1])
    return None


def rewrite_lowlevel_handle_calls(src: str, handle: str = "c") -> tuple[str, int]:
    out, pos, n = [], 0, 0
    for m in _LL_HEAD.finditer(src):
        if m.start() < pos or m.group("h") != handle:
            continue
        end = _balanced(src, m.end())
        if end < 0:
            continue
        semi = re.match(r"\s*;", src[end:])
        if not semi:
            continue
        dec = _decode_call(src[m.end():end - 1], handle)
        if dec is None:
            continue
        data = m.group("data")
        stmt_end = end + semi.end()
        if data and re.search(rf"\b{re.escape(data)}\b", src[stmt_end:]):
            continue
        fn, args = dec
        val = m.group("v")
        call = f"{handle}.{fn}" + (f"{{value: {val}}}" if val else "") + f"({', '.join(args)})"
        ok = m.group("ok")
        if ok:
            rep = f"bool {ok}; try {call} {{ {ok} = true; }} catch {{ {ok} = false; }}"
        else:
            rep = f"try {call} {{}} catch {{}}"
        out.append(src[pos:m.start()])
        out.append(rep)
        pos = stmt_end
        n += 1
    out.append(src[pos:])
    return "".join(out), n


_RESERVED_IDENTS = ("after", "alias", "apply", "auto", "byte", "copyof", "define", "final", "implements",
                    "inline", "macro", "match", "mutable", "null", "of", "partial", "promise", "reference",
                    "relocatable", "sealed", "sizeof", "static", "supports", "typedef", "typeof", "var")
_RESERVED_RE = re.compile(r"\b(" + "|".join(_RESERVED_IDENTS) + r")\b")
_STR_OR_COMMENT = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*.*?\*/', re.S)


def rename_reserved_identifiers(src: str) -> tuple[str, int]:
    out, pos, n = [], 0, 0
    for m in _STR_OR_COMMENT.finditer(src):
        seg = src[pos:m.start()]
        seg, k = _RESERVED_RE.subn(lambda mm: _free_name(src, mm.group(1)), seg)
        out.append(seg); out.append(m.group(0)); n += k; pos = m.end()
    seg, k = _RESERVED_RE.subn(lambda mm: _free_name(src, mm.group(1)), src[pos:])
    out.append(seg); n += k
    return "".join(out), n


def _free_name(src: str, word: str) -> str:
    cand = word + "_"
    while re.search(rf"\b{re.escape(cand)}\b", src):
        cand += "_"
    return cand


_SECP256K1_N_MINUS_1 = "115792089237316195423570985008687907852837564279074904382605163141518161494336"


def bound_vm_addr_keys(src: str) -> tuple[str, int]:
    n = 0
    out = src
    for fm in re.finditer(r"function\s+(test\w*)\s*\(([^)]*)\)[^{]*\{", src):
        params = {}
        for p in fm.group(2).split(","):
            toks = p.split()
            if len(toks) >= 2 and toks[0] in ("uint256", "uint"):
                params[toks[-1]] = toks[0]
        if not params:
            continue
        body_start = fm.end()
        depth, j = 1, body_start
        while j < len(src) and depth:
            depth += {"{": 1, "}": -1}.get(src[j], 0)
            j += 1
        body = src[body_start:j]
        keys = [k for k in params
                if re.search(r"vm\s*\.\s*addr\s*\(\s*(?:uint256\s*\(\s*)?" + re.escape(k) + r"\s*\)", body)]
        if not keys:
            continue
        inj = "".join(f"\n        {k} = bound({k}, 1, {_SECP256K1_N_MINUS_1});" for k in keys)
        out = out.replace(src[fm.start():body_start], src[fm.start():body_start] + inj, 1)
        n += len(keys)
    return out, n


_TOPDECL_RE = re.compile(r"(?m)^[ \t]*(?:abstract[ \t]+)?(?:contract|interface|library)[ \t]+(\w+)\b")


def _mask_str_comments(src: str) -> str:
    return _STR_OR_COMMENT.sub(lambda m: " " * len(m.group(0)), src)


def _top_level_decls(src: str) -> list[tuple[str, int, int]]:
    masked = _mask_str_comments(src)
    out, depth, i = [], 0, 0
    marks = {m.start(): m for m in _TOPDECL_RE.finditer(masked)}
    while i < len(masked):
        if depth == 0 and i in marks:
            m = marks[i]
            k = masked.find("{", m.end())
            if k < 0:
                break
            d, j = 1, k + 1
            while j < len(masked) and d:
                d += {"{": 1, "}": -1}.get(masked[j], 0)
                j += 1
            out.append((m.group(1), m.start(), j))
            i = j
            continue
        depth += {"{": 1, "}": -1}.get(masked[i], 0)
        i += 1
    return out


_PAYABLE_FB_RE = re.compile(r"\b(?:receive\s*\(\s*\)|fallback\s*\([^)]*\)|function\s*\(\s*\))[^{;]*\bpayable\b")


def _payable_fallback_contracts(p_source: str) -> set:
    masked = _mask_str_comments(p_source)
    return {n for n, s, e in _top_level_decls(p_source) if _PAYABLE_FB_RE.search(masked[s:e])}


def _is_plain_address_expr(arg: str, src: str) -> bool:
    a = arg.strip()
    if a.startswith("payable("):
        return False
    if a in ("msg.sender", "tx.origin"):
        return True
    if re.fullmatch(r"(?:address|vm\s*\.\s*addr|makeAddr)\s*\(.*\)", a, re.S):
        return True
    if re.fullmatch(r"\w+", a):
        return bool(re.search(r"\baddress\s+(?:(?:public|private|internal|immutable|constant|memory)\s+)*"
                              + re.escape(a) + r"\b", src))
    return False


def payable_contract_casts(src: str, p_source: str) -> tuple[str, int]:
    targets = _payable_fallback_contracts(p_source) | _payable_fallback_contracts(src)
    if not targets:
        return src, 0
    masked = _mask_str_comments(src)
    edits = []
    for m in re.finditer(r"(?<![\w.])(" + "|".join(map(re.escape, sorted(targets))) + r")\s*\(", masked):
        pre = masked[max(0, m.start() - 12):m.start()]
        if re.search(r"\b(?:new|contract|is|interface)\s*$", pre):
            continue
        j = _balanced(masked, m.end())
        if j < 0:
            continue
        arg = src[m.end():j - 1]
        if "," in arg or not _is_plain_address_expr(arg, src):
            continue
        edits.append((m.end(), j - 1, "payable(" + arg.strip() + ")"))
    out = src
    for s, e, r in reversed(edits):
        out = out[:s] + r + out[e:]
    return out, len(edits)


_HARNESS_NAMES = ("log",)


def rename_harness_shadowing(src: str) -> tuple[str, int]:
    n = 0
    for name in _HARNESS_NAMES:
        masked = _mask_str_comments(src)
        decl = re.search(r"(?<![\w.])[A-Za-z_]\w*(?:\[\])?(?:\s+(?:public|private|internal|immutable|memory|storage|calldata))*\s+"
                         + re.escape(name) + r"\s*[;=,)]", masked)
        if not decl or re.match(r"\s*(?:event|emit|return|function)\b", masked[decl.start():]):
            continue
        depth = masked[:decl.start()].count("{") - masked[:decl.start()].count("}")
        if depth != 1:
            continue
        new = _free_name(src, name)
        pat = re.compile(r"(?<![\w.])(?<!emit )" + re.escape(name) + r"\b(?!\s*\()")
        out, pos = [], 0
        for m in _STR_OR_COMMENT.finditer(src):
            seg, k = pat.subn(new, src[pos:m.start()])
            out.append(seg); out.append(m.group(0)); n += k; pos = m.end()
        seg, k = pat.subn(new, src[pos:])
        out.append(seg); n += k
        src = "".join(out)
    return src, n
