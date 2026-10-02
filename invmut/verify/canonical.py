
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from invmut.esbmc.runner import temp_sol
from invmut.mutation.solast import AstError, get_ast, parse_src

TEST_NAME = "InvMutTest"


@dataclass
class ShapeError:
    reason: str
    detail: str = ""


@dataclass
class TestShape:
    contract_name: str
    handle: str
    c_type: str
    body_name: str
    body_span: tuple[int, int]
    ctor_span: Optional[tuple[int, int]]
    assert_span: tuple[int, int]
    bare_calls: list = field(default_factory=list)
    revert_tries: list = field(default_factory=list)
    value_amounts: list = field(default_factory=list)
    has_balance_require: bool = False
    body_open_offset: int = 0
    params: list = field(default_factory=list)
    has_callback: bool = False
    callback_bare_calls: list = field(default_factory=list)


@dataclass
class BareCall:
    stmt_span: tuple[int, int]
    call_span: tuple[int, int]
    kind: str
    lhs: Optional[str] = None
    rtype: str = ""
    decls: list = None


@dataclass
class RevertTry:
    stmt_span: tuple[int, int]
    call_text: str
    ret_decl: str
    ok_block: str
    catch_block: str


def _walk(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def _find_contract(ast: dict, name: str) -> Optional[dict]:
    for n in _walk(ast):
        if n.get("nodeType") == "ContractDefinition" and n.get("name") == name:
            return n
    return None


def _is_call_on(expr: dict, handle: str) -> bool:
    if expr.get("nodeType") != "FunctionCall":
        return False
    callee = expr.get("expression", {})
    if callee.get("nodeType") == "FunctionCallOptions":
        callee = callee.get("expression", {})
    if callee.get("nodeType") != "MemberAccess":
        return False
    base = callee.get("expression", {})
    return base.get("nodeType") == "Identifier" and base.get("name") == handle


def _value_amount(src: str, expr: dict) -> Optional[str]:
    callee = expr.get("expression", {})
    if callee.get("nodeType") != "FunctionCallOptions":
        return None
    names = callee.get("names", [])
    if "value" not in names:
        return None
    opt = callee.get("options", [])[names.index("value")]
    a, b = parse_src(opt["src"])
    return src[a:b]


def _block_text(src: str, block: dict) -> str:
    a, b = parse_src(block["src"])
    return src[a:b]


def _extract_revert_try(src: str, try_node: dict, ec: dict) -> Optional[RevertTry]:
    clauses = try_node.get("clauses", [])
    if len(clauses) < 2:
        return None
    success, catch = clauses[0], clauses[-1]
    params = (success.get("parameters") or {}).get("parameters", []) if success.get("parameters") else []
    decls = ", ".join(f"{p.get('typeDescriptions', {}).get('typeString', '')} {p.get('name')}"
                      for p in params)
    ret_decl = f"({decls})" if len(params) > 1 else decls
    return RevertTry(
        parse_src(try_node["src"]),
        src[parse_src(ec["src"])[0]:parse_src(ec["src"])[1]],
        ret_decl,
        _block_text(src, success["block"]),
        _block_text(src, catch["block"]),
    )


def _func_mutability(ast: dict) -> dict[int, str]:
    out = {}
    for n in _walk(ast):
        if isinstance(n, dict) and n.get("nodeType") == "FunctionDefinition" and "id" in n:
            out[n["id"]] = n.get("stateMutability", "nonpayable")
    return out


def _contract_own_func_ids(ast: dict, c_type: str) -> set[int]:
    contracts = {}
    target = None
    for n in _walk(ast):
        if isinstance(n, dict) and n.get("nodeType") == "ContractDefinition":
            contracts[n.get("id")] = n
            if n.get("name") == c_type:
                target = n
    if target is None:
        return set()
    chain = target.get("linearizedBaseContracts") or [target.get("id")]
    ids = set()
    for cid in chain:
        cdef = contracts.get(cid)
        if cdef:
            ids |= {m["id"] for m in cdef.get("nodes", [])
                    if m.get("nodeType") == "FunctionDefinition" and "id" in m}
    return ids


def _contract_own_getter_ids(ast: dict, c_type: str) -> set[int]:
    contracts = {}
    target = None
    for n in _walk(ast):
        if isinstance(n, dict) and n.get("nodeType") == "ContractDefinition":
            contracts[n.get("id")] = n
            if n.get("name") == c_type:
                target = n
    if target is None:
        return set()
    chain = target.get("linearizedBaseContracts") or [target.get("id")]
    ids = set()
    for cid in chain:
        cdef = contracts.get(cid)
        if cdef:
            ids |= {m["id"] for m in cdef.get("nodes", [])
                    if m.get("nodeType") == "VariableDeclaration" and m.get("stateVariable")
                    and m.get("visibility") == "public" and "id" in m}
    return ids


_LOWLEVEL_MEMBERS = {"call", "delegatecall", "staticcall", "send", "transfer"}


def _callback_captures(cb: dict, handle: str, func_mut: dict[int, str],
                       c_func_ids: set[int]) -> tuple[set, list]:
    spans, calls = set(), []

    def _take(st: dict) -> bool:
        if st.get("nodeType") != "ExpressionStatement":
            return True
        e = st.get("expression", {}) or {}
        if e.get("nodeType") != "FunctionCall" or not _is_call_on(e, handle):
            return True
        callee = e.get("expression", {}) or {}
        if callee.get("nodeType") == "FunctionCallOptions":
            callee = callee.get("expression", {}) or {}
        ref = callee.get("referencedDeclaration")
        if ref not in c_func_ids or func_mut.get(ref) in ("view", "pure"):
            return True
        if calls:
            return False
        spans.add(parse_src(e["src"]))
        calls.append(BareCall(parse_src(st["src"]), parse_src(e["src"]), "expr"))
        return True

    def _scan(stmts) -> bool:
        for st in stmts or []:
            if not isinstance(st, dict):
                continue
            nt = st.get("nodeType")
            if nt in ("IfStatement", "Block"):
                branches = ([st] if nt == "Block"
                            else [st.get("trueBody") or {}, st.get("falseBody") or {}])
                for br in branches:
                    if not br:
                        continue
                    inner = br.get("statements", []) if br.get("nodeType") == "Block" else [br]
                    if not _scan(inner):
                        return False
                continue
            if not _take(st):
                return False
        return True

    if not _scan(((cb.get("body") or {}) or {}).get("statements", [])):
        return set(), []
    return spans, calls


def _body_violation(body: dict, handle: str, func_mut: dict[int, str],
                    handled_call_spans: set, c_func_ids: set[int],
                    c_getter_ids: set[int] = frozenset()) -> bool:
    for n in _walk(body):
        if not isinstance(n, dict):
            continue
        nt = n.get("nodeType")
        if nt == "InlineAssembly":
            return True
        if nt == "VariableDeclaration":
            if n.get("typeDescriptions", {}).get("typeString", "").startswith("function "):
                return True
            if n.get("name") == handle:
                return True
            continue
        if nt != "FunctionCall":
            continue
        if n.get("kind") == "typeConversion":
            continue
        callee = n.get("expression", {})
        if callee.get("nodeType") == "FunctionCallOptions":
            callee = callee.get("expression", {})
        ctype = callee.get("nodeType")
        if ctype == "Identifier":
            if callee.get("referencedDeclaration") in func_mut:
                return True
            continue
        if ctype == "MemberAccess":
            ref = callee.get("referencedDeclaration")
            recv = callee.get("expression", {})
            recv_is_c = recv.get("nodeType") == "Identifier" and recv.get("name") == handle
            recv_type = recv.get("typeDescriptions", {}).get("typeString", "")
            if callee.get("memberName") in _LOWLEVEL_MEMBERS and ref is None:
                return True
            if recv_is_c:
                if ref in c_getter_ids:
                    continue
                if ref not in c_func_ids:
                    return True
                span = parse_src(n["src"])
                if span in handled_call_spans:
                    continue
                if func_mut.get(ref) in ("view", "pure"):
                    continue
                return True
            if recv_type.startswith("contract "):
                return True
    return False


def _reads_msg_value(node: dict) -> bool:
    for n in _walk(node):
        if (n.get("nodeType") == "MemberAccess" and n.get("memberName") == "value"
                and n.get("expression", {}).get("name") == "msg"):
            return True
    return False


def _byteview(s: str) -> str:
    return s.encode("utf-8").decode("latin-1")


def _unbyteview(s: str) -> str:
    return s.encode("latin-1").decode("utf-8")


def analyze_test(solc_bin: str, t_source: str, test_name: str = TEST_NAME) -> TestShape | ShapeError:
    try:
        with temp_sol(t_source, prefix="invmut_t_") as path:
            ast = get_ast(solc_bin, path)
    except AstError as e:
        return ShapeError("did_not_compile", detail=str(e)[:1500])

    tv = _byteview(t_source)

    cdef = _find_contract(ast, test_name)
    if cdef is None:
        return ShapeError("malformed_test", detail="no contract named InvMutTest in your output")

    handle = None
    c_type = None
    for n in cdef.get("nodes", []):
        if n.get("nodeType") != "VariableDeclaration" or not n.get("stateVariable"):
            continue
        tn = n.get("typeName", {})
        if tn.get("nodeType") != "UserDefinedTypeName":
            continue
        ts = n.get("typeDescriptions", {}).get("typeString", "")
        if not ts.startswith("contract "):
            continue
        handle = n.get("name")
        c_type = (tn.get("pathNode", {}) or {}).get("name") or tn.get("name") \
            or ts.replace("contract ", "")
    if handle is None:
        return ShapeError("malformed_test", detail="InvMutTest has no state variable of contract type (the handle `C c;`)")

    body = None
    ctor_span = None
    publics = []
    has_callback = False
    callbacks = []
    for n in cdef.get("nodes", []):
        if n.get("nodeType") != "FunctionDefinition":
            continue
        kind = n.get("kind")
        if kind == "constructor":
            ctor_span = parse_src(n["src"])
            continue
        if kind in ("receive", "fallback"):
            has_callback = True
            callbacks.append(n)
            continue
        if n.get("visibility") in ("public", "external"):
            publics.append(n)
    if len(publics) != 1:
        return ShapeError("malformed_test", detail=f"InvMutTest must have exactly ONE public function (found {len(publics)}); no helper functions")
    body = publics[0]
    body_span = parse_src(body["src"])
    body_name = body["name"]

    if body.get("modifiers"):
        return ShapeError("malformed_test", detail="the public function must carry no modifiers")

    if _reads_msg_value(body):
        return ShapeError("uses_msg_value")

    stmts = (body.get("body", {}) or {}).get("statements", [])
    asserts = []
    bare_calls = []
    revert_tries = []
    value_amounts = []
    handled_call_spans = set()
    safe_regions = []

    def _maybe_value(call_expr):
        amt = _value_amount(tv, call_expr)
        if amt:
            value_amounts.append(amt)

    for st in stmts:
        nt = st.get("nodeType")
        if nt == "TryStatement":
            ec = st.get("externalCall", {})
            if _is_call_on(ec, handle):
                _maybe_value(ec)
                handled_call_spans.add(parse_src(ec["src"]))
                rt = _extract_revert_try(tv, st, ec)
                if rt is not None:
                    revert_tries.append(rt)
            continue
        if nt == "ExpressionStatement":
            e = st.get("expression", {})
            if e.get("nodeType") == "FunctionCall":
                callee = e.get("expression", {})
                fname = callee.get("name") if callee.get("nodeType") == "Identifier" else None
                if fname == "assert":
                    asserts.append(parse_src(st["src"]))
                    safe_regions.append(parse_src(st["src"]))
                    continue
                if fname == "require":
                    safe_regions.append(parse_src(st["src"]))
                    continue
                if _is_call_on(e, handle):
                    _maybe_value(e)
                    handled_call_spans.add(parse_src(e["src"]))
                    bare_calls.append(BareCall(parse_src(st["src"]), parse_src(e["src"]), "expr"))
            elif e.get("nodeType") == "Assignment":
                rhs = e.get("rightHandSide", {})
                if _is_call_on(rhs, handle):
                    _maybe_value(rhs)
                    handled_call_spans.add(parse_src(rhs["src"]))
                    bare_calls.append(BareCall(
                        parse_src(st["src"]), parse_src(rhs["src"]), "assign",
                        e.get("leftHandSide", {}).get("name"),
                        rhs.get("typeDescriptions", {}).get("typeString", "")))
        elif nt == "VariableDeclarationStatement":
            iv = st.get("initialValue", {}) or {}
            if _is_call_on(iv, handle):
                _maybe_value(iv)
                handled_call_spans.add(parse_src(iv["src"]))
                decls = st.get("declarations", [])
                if len(decls) == 1 and decls[0]:
                    bare_calls.append(BareCall(
                        parse_src(st["src"]), parse_src(iv["src"]), "decl",
                        decls[0].get("name"),
                        decls[0].get("typeDescriptions", {}).get("typeString", "")))
                elif len(decls) > 1:
                    dl = [(d.get("typeDescriptions", {}).get("typeString", ""), d.get("name"))
                          for d in decls if d]
                    bare_calls.append(BareCall(
                        parse_src(st["src"]), parse_src(iv["src"]), "tuple_decl", decls=dl))

    if len(asserts) != 1:
        return ShapeError("malformed_test", detail=f"exactly ONE assert(...) statement is required (found {len(asserts)})")

    func_mut = _func_mutability(ast)
    c_func_ids = _contract_own_func_ids(ast, c_type)
    c_getter_ids = _contract_own_getter_ids(ast, c_type)
    if _body_violation(body, handle, func_mut, handled_call_spans, c_func_ids, c_getter_ids):
        return ShapeError("malformed_test", detail="a state-changing call on c is not a plain top-level statement, or c is reached through a low-level call / abi.encodeWithSignature / address cast / interface / helper. Every call must be `c.f(args);`, `x = c.f(args);`, or `try c.f(args) { ... } catch { ... }` at top level of the single public function; only view calls may sit inside require/assert")

    callback_bare_calls = []
    for cb in callbacks:
        cb_spans, cb_calls = _callback_captures(cb, handle, func_mut, c_func_ids)
        if _body_violation(cb, handle, func_mut, cb_spans, c_func_ids, c_getter_ids):
            return ShapeError("malformed_test", detail="a state-changing call on c inside receive()/fallback() that could not be captured; a callback may READ c freely, and may re-enter c with at most ONE plain `c.f(args);` statement, at callback top level or inside recursion-guard `if`/block branches")
        callback_bare_calls.extend(cb_calls)

    body_open = tv.index("{", body_span[0]) + 1
    body_text = tv[body_open:body_span[1]]
    has_balance_require = "address(this).balance" in body_text

    params = [(p.get("typeDescriptions", {}).get("typeString", ""), p.get("name"))
              for p in (body.get("parameters", {}) or {}).get("parameters", [])]

    return TestShape(test_name, handle, c_type, body_name, body_span, ctor_span,
                     asserts[0], bare_calls, revert_tries, value_amounts,
                     has_balance_require, body_open, params, has_callback, callback_bare_calls)



def resolve_construction(construction: dict, witness: Optional[dict],
                         c_ctor_payable: bool = False) -> tuple[str, str] | ShapeError:
    kind = (construction or {}).get("kind", "no_arg")
    if kind == "no_arg":
        args = []
    elif kind == "args":
        args = list(construction.get("args", []))
    elif kind == "unknown":
        if witness and witness.get("ctor_args"):
            args = list(witness["ctor_args"])
        else:
            return ShapeError("construction_unknown")
    else:
        return ShapeError("construction_unknown")

    value = (construction or {}).get("value")
    if value is None and witness:
        value = witness.get("value")
    if value is None:
        if c_ctor_payable:
            return ShapeError("construction_value_unknown")
        value = "0"
    return ", ".join(str(a) for a in args), str(value)



def _stmt_with_semicolon(src: str, span: tuple[int, int]) -> tuple[int, int]:
    end = span[1]
    while end < len(src) and src[end] != ";":
        end += 1
    return (span[0], min(end + 1, len(src)))


REVERTED_STUB = "function __ESBMC_reverted() internal returns (bool) {}"
ASSUME_STUB = "function __ESBMC_assume(bool) internal pure {}"
FUND_WEI = "1000000000000000000000000"


def _self_deploy_ctor(shape: TestShape, args_text: str, value_text: str, with_stub: bool) -> str:
    payable_ctor = value_text and value_text != "0"
    new_expr = (f"new {shape.c_type}{{value: {value_text}}}({args_text})" if payable_ctor
                else f"new {shape.c_type}({args_text})")
    pay = " payable" if payable_ctor else ""
    ctor = f"constructor(){pay} {{ {shape.handle} = {new_expr}; }}"
    extras = []
    if with_stub:
        extras += [REVERTED_STUB, ASSUME_STUB]
    if not shape.has_callback:
        extras.append("receive() external payable {}")
    return f"{ctor}\n    " + "\n    ".join(extras) if extras else ctor


def _foundry_wrap(call_text: str, bc: BareCall) -> str:
    if bc.kind == "expr":
        return f"try {call_text} {{}} catch {{ return; }}"
    if bc.kind == "assign":
        return f"try {call_text} returns ({bc.rtype} __r) {{ {bc.lhs} = __r; }} catch {{ return; }}"
    if bc.kind == "tuple_decl":
        pre = " ".join(f"{t} {n};" for t, n in bc.decls)
        rets = ", ".join(f"{t} __r{i}" for i, (t, _) in enumerate(bc.decls))
        body = " ".join(f"{n} = __r{i};" for i, (_, n) in enumerate(bc.decls))
        return f"{pre} try {call_text} returns ({rets}) {{ {body} }} catch {{ return; }}"
    return (f"{bc.rtype} {bc.lhs}; try {call_text} returns ({bc.rtype} __r) "
            f"{{ {bc.lhs} = __r; }} catch {{ return; }}")


def _funding_edit(shape: TestShape) -> Optional[tuple[int, int, str]]:
    if not shape.value_amounts:
        return None
    total = " + ".join(f"({a})" for a in shape.value_amounts)
    req = f" require(address(this).balance >= {total});"
    return (shape.body_open_offset, shape.body_open_offset, req)


_VERIFY_VALUE_CAP = "1000000000000000000000000000000"


def _value_cap_edit(shape: TestShape) -> Optional[tuple[int, int, str]]:
    caps = []
    names = {n for _, n in shape.params}
    for a in shape.value_amounts:
        a = a.strip()
        if a in names and a not in caps:
            caps.append(a)
    if not caps:
        return None
    req = "".join(f" require({a} <= {_VERIFY_VALUE_CAP});" for a in caps)
    return (shape.body_open_offset, shape.body_open_offset, req)


def _is_value_test(shape: TestShape) -> bool:
    return bool(shape.value_amounts) or shape.has_balance_require


def _c_funding_assume(shape: TestShape) -> Optional[tuple[int, int, str]]:
    if not _is_value_test(shape):
        return None
    a = f" __ESBMC_assume(address({shape.handle}).balance >= {FUND_WEI});"
    return (shape.body_open_offset, shape.body_open_offset, a)


def _apply(t_source: str, shape: TestShape, edits: list[tuple[int, int, str]]) -> tuple[str, int]:
    assert_start = shape.assert_span[0]
    shift = sum(len(text) - (b - a) for a, b, text in edits if a < assert_start)
    out = t_source
    for a, b, text in sorted(edits, key=lambda e: e[0], reverse=True):
        out = out[:a] + text + out[b:]
    return out, assert_start + shift


def _extra_requires_edit(shape: TestShape, extra_requires) -> Optional[tuple[int, int, str]]:
    if not extra_requires:
        return None
    text = "".join(f" require({r});" for r in extra_requires)
    return (shape.body_open_offset, shape.body_open_offset, text)


def build_esbmc_test(t_source: str, shape: TestShape, args_text: str, value_text: str,
                     extra_requires=()) -> tuple[str, int]:
    tv = _byteview(t_source)
    edits: list[tuple[int, int, str]] = []
    er = _extra_requires_edit(shape, extra_requires)
    if er is not None:
        edits.append(er)
    if shape.ctor_span is not None:
        edits.append((*shape.ctor_span, _self_deploy_ctor(shape, args_text, value_text, with_stub=True)))
    for i, bc in enumerate([*shape.bare_calls, *shape.callback_bare_calls]):
        s0, s1 = _stmt_with_semicolon(tv, bc.stmt_span)
        stmt = tv[s0:s1]
        edits.append((s0, s1, f"{stmt} if (__ESBMC_reverted()) return;"))
    for i, rt in enumerate(shape.revert_tries):
        s0, s1 = rt.stmt_span
        decl = f"{rt.ret_decl} = {rt.call_text};" if rt.ret_decl else f"{rt.call_text};"
        repl = (f"{decl} bool __rev{i} = __ESBMC_reverted(); "
                f"if (__rev{i}) {rt.catch_block} else {rt.ok_block}")
        edits.append((s0, s1, repl))
    vc = _value_cap_edit(shape)
    if vc is not None:
        edits.append(vc)
    fe = _funding_edit(shape)
    if fe is not None:
        edits.append(fe)
    cf = _c_funding_assume(shape)
    if cf is not None:
        edits.append(cf)
    out, off = _apply(tv, shape, edits)
    return _unbyteview(out), len(_unbyteview(out[:off]))


def build_foundry_test(t_source: str, shape: TestShape, args_text: str, value_text: str,
                       extra_requires=()) -> str:
    tv = _byteview(t_source)
    edits: list[tuple[int, int, str]] = []
    er = _extra_requires_edit(shape, extra_requires)
    if er is not None:
        edits.append(er)
    if shape.ctor_span is not None:
        edits.append((*shape.ctor_span, _self_deploy_ctor(shape, args_text, value_text, with_stub=False)))
    for bc in [*shape.bare_calls, *shape.callback_bare_calls]:
        s0, s1 = _stmt_with_semicolon(tv, bc.stmt_span)
        edits.append((s0, s1, _foundry_wrap(tv[bc.call_span[0]:bc.call_span[1]], bc)))
    fe = _funding_edit(shape)
    if fe is not None:
        edits.append(fe)
    out, _ = _apply(tv, shape, edits)
    return _unbyteview(out)

