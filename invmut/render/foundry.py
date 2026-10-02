
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


# The reserved/precompile/predeploy band a fuzzed address must stay above.  See
# _addr_domain_terms: 0x100 is P256VERIFY, and forge-std's assumeNotPrecompile
# stops at 0xff, so neither the classic 0x0a limit nor that helper is enough.
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
    """The domain a fuzzed `address` parameter must stay in for the test BODY to
    be reachable at all.

    TWO terms were wrong, and BOTH are needed -- MEASURED separately on
    rc_access_control__phishable (L0003), seed ascii("InvMut"), 10,000 runs:
    with `code.length == 0` alone the run still fails on
    `(amount=255, recipient=0x100)`, and with the floor alone it fails on a
    contract address.  With both: fix=PASS, bug=FAIL, the kill is restored.

    (1) `uint160(p) > 255` was the reserved-address floor, and 255 is too low.
    The classic precompiles stop at 0x0a, but 0x100 is P256VERIFY (RIP-7212) on
    the EVM version forge runs by default, and a precompile has NO CODE -- so it
    survives the code test -- while costing more than the 2300-gas stipend a
    `.transfer` forwards, which reverts.  forge-std's own `assumeNotPrecompile`
    does not help here either: it excludes `[0x1, 0xff]` and admits 0x100.  The
    floor is therefore 0xffff, which clears the whole reserved/predeploy band
    with margin and costs an utterly negligible slice of a 2^160 domain.

    (2) `code.length == 0` is the term this originally lacked, and it is the one the
    10,000-run sweep needed.  The other terms name individual addresses; they do
    not exclude the ~2^160-sized set of addresses that hold CODE, and an address
    with code is the case the body cannot survive: a value transfer to a contract
    without a payable receive/fallback reverts, the revert propagates out of the
    call under test, and the assertion is never reached.  Forge's fuzzer draws
    from a dictionary seeded with the addresses in scope, so a contract address
    can be missed at lower run budgets but is exercised by the 10,000-run sweep.
    MEASURED on rc_access_control__phishable (L0003), seed
    ascii("InvMut"), 10,000 runs: without this term fix=FAIL(EvmError: Revert)
    and the cell is not a kill; with it fix=PASS, bug=FAIL, kill restored.

    The narrowing is honest and it is what the property already meant: the
    remaining domain is every EOA, and an EOA is what "an arbitrary recipient"
    denotes when the body sends value.  `address(this)` and the handle carry code
    and are therefore already excluded; both terms are kept so the statement
    still reads as the full intent when the code term is inspected in isolation.
    """
    terms = [f"{param}.code.length == 0", f"uint160({param}) > {_RESERVED_ADDR_TOP}",
             f"{param} != address(this)"]
    if handle:
        terms.append(f"{param} != address({handle})")
    terms += [f"{param} != {a}" for a in _SPECIAL_ADDRS]
    return terms


def _addr_domain_stmt(param: str, handle: str) -> str:
    return f"vm.assume({' && '.join(_addr_domain_terms(param, handle))});"


def _addr_domain_stmts(param: str, handle: str | None = None) -> str:
    """The same domain as `_addr_domain_terms`, but the INTERVAL is a total map.

    ⛔ WHY NOT ONE vm.assume.  Forge does not draw addresses uniformly: its
    fuzz dictionary is seeded with the addresses in scope (the test contract,
    the deployed contract, address(0), small constants, values seen in state),
    so a filter that rejects exactly those rejects a LARGE share of actual
    draws -- nothing like the 65536/2^160 a uniform reading suggests.  MEASURED
    on the 10,000-run sweep: the all-assume form pushed 7 cells that had held
    into `assume_budget` (Foundry gave up after max_test_rejects), and raising
    that budget did not fix them -- it made forge grind through tens of
    millions of rejected draws instead, which is why this is a construction
    change and not a budget change.

    So the reserved-address floor is applied as `bound()` -- a TOTAL map, zero
    rejections, the same primitive VeriPUT's own emitter uses for an interval
    coordinate -- and only the terms that cannot be an interval stay as
    `vm.assume`: `code.length == 0` and the handful of named addresses.  Those
    remove a vanishing slice of the mapped range, so the draw is accepted
    almost always.

    The DOMAIN is unchanged: bound maps into [0x10000, 2^160-1], which is
    exactly what `uint160(p) > 0xffff` admitted.
    """
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
    """The element type of fuzz parameter `name`, from the test's signature."""
    m = re.search(r"function\s+test\w*\s*\(([^)]*)\)", src)
    if not m:
        return None
    for prm in (p.strip() for p in m.group(1).split(",")):
        parts = prm.split()
        if not parts or parts[-1] != name or "[]" not in prm:
            continue
        # ⛔ CALLDATA IS NOT ASSIGNABLE.  `arr = <memory array>` on a calldata
        # parameter is Error 7407 ("Type T[] memory is not implicitly
        # convertible to expected type T[] calldata"), MEASURED on 2 of a
        # 15-test compile sample before this guard existed.  Rewriting the
        # parameter would mean renaming every downstream use, which is a much
        # larger edit than this pass is entitled to make, so a calldata
        # parameter keeps its original vm.assume and its rejection cost.
        tail = prm[prm.index("[]") + 2:]
        if "calldata" in tail:
            return None
        return prm[:prm.index("[]")].strip()
    return None


def harden_array_length_assumes(src: str) -> str:
    """Turn `vm.assume(arr.length <op> K)` into a TOTAL construction.

    Same defect as the address interval, same fix, different shape.  Forge draws
    a dynamic array's LENGTH at random, so a filter pinning that length rejects
    almost every draw -- `vm.assume(tos.length == 1)` accepts roughly one draw in
    the length distribution's support, and `length > 0` throws away every empty
    draw, which forge produces often.  MEASURED over every accepted test's
    rendered_test: 317 tests across 197 cells carry such an assume, 350
    occurrences in all (`>` 310, `<=` 24, `==` 12, `>=` 2, `<` 2), and it is
    what still exhausts max_test_rejects on the cells the address fix alone does
    not recover.

    The rewrite builds an array of an admissible length and copies across what
    the fuzzer drew, so EVERY draw is accepted and the values the fuzzer chose
    are kept:

        vm.assume(tos.length == 1);
     -> { address[] memory t = new address[](1);
          for (uint i; i < 1 && i < tos.length; ++i) t[i] = tos[i];
          tos = t; }

    The admitted set is unchanged for `==`; for an inequality the target length
    is the nearest admissible one to what was drawn, so a draw already satisfying
    the assume is copied through untouched and only a violating draw moves --
    which is exactly what the assume would otherwise have rejected.

    Only parameters whose element type is recoverable from the test signature are
    rewritten; anything else is left as the original assume rather than guessed.
    """
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
        else:  # "<"
            if k == 0:
                return m.group(0)      # unsatisfiable; leave it to fail loudly
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
    """Turn `vm.assume(a.length == b.length)` into a TOTAL construction.

    The third and last shape of the same defect.  Two array parameters are drawn
    with INDEPENDENT random lengths, so requiring them equal rejects all but the
    coincidences -- and unlike a literal bound this one cannot be widened by
    raising max_test_rejects, because the acceptance rate does not depend on the
    budget.  MEASURED over every accepted test: 75 tests in 57 cells carry it,
    always with `==`, and 6 of those cells are LOST under the current log for
    exactly this reason (they survive the address and literal-length passes and
    still report assume_budget).

    One side is rebuilt to the other's length, keeping the values the fuzzer drew:

        vm.assume(tos.length == vs.length);
     -> { uint256 __n = tos.length;
          uint[] memory __p = new uint[](__n);
          for (uint256 __i; __i < __n && __i < vs.length; ++__i) __p[__i] = vs[__i];
          vs = __p; }

    The admitted set is unchanged: every pair the assume would have accepted is
    copied through untouched, and a pair it would have rejected is projected onto
    the nearest accepted one instead of being thrown away.  The SECOND operand is
    rebuilt where possible so the first keeps the length any earlier literal pass
    already pinned; if only the first is assignable it is rebuilt instead, and if
    neither is (both calldata) the original assume is left alone.
    """
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
    """Apply `_addr_domain_terms` to a rendered test this renderer did not emit.

    `render_foundry` guards its own fuzz parameters at emission time, but it
    produces a MINORITY of the corpus (MEASURED: 1,007 of 10,276 accepted tests
    carry its fingerprint; 5,090 of the other 9,269 fuzz an `address` with no
    domain guard at all).  Those tests reach forge through the concrete-replay
    and realize paths, so the guard has to be expressible as a source-to-source
    pass over a finished test as well as a clause in the emitter.

    Deterministic and idempotent: a parameter already carrying `<p>.code.length`
    is left alone, so re-running the pass -- or running it over a test
    `render_foundry` already guarded -- changes nothing.  Nothing but
    `vm.assume` lines are added, so a test's assertions, its call sequence and
    its parameter list are untouched.
    """
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
    """`assume_distinct_addrs` is accepted for call compatibility and has no separate effect here: the
    address-domain guard this renderer always emits (`_addr_domain_terms`) already excludes
    `address(this)` and the handle, which is exactly what that switch used to add."""
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
        # the AST spells a reference type with its location ("string calldata" / "bytes memory"); the
        # rendered test always declares `memory`, which is valid for both the public testFuzz_ wrapper
        # and the internal body it forwards to.
        base = ts.strip().split()[0] if ts.strip() else ""
        if base in _DYNAMIC_REF:
            ts = base + " memory"
        elif not _is_elementary_type(ts):
            return RenderFail("unsupported_param_type")
        params.append((ts, p.get("name")))
    pmap = {n: t for t, n in params}
    if param_only and not params:
        # config.render_param_only: a testFuzz_ with no parameters runs once on one input
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
        # config.render_param_only: the witness-regression companion is a fixed-value test
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
    """Drop from the `src/C_under_test.sol` import list every symbol the test body never mentions.

    config.import_file_level_types widens that list to the flat source's top-level type names so a
    signature-level type like `IStolenNftOracle.Message` can be named at all. But a name the test does
    NOT use still creates a dependency on the REFERENCE source's declarations -- and the bug source is a
    DIFFERENT file. When the patch ADDS a top-level declaration, importing it makes the bug side fail to
    compile for a reason that has nothing to do with the test's property, and scripts/run_tests.py:_verdict
    scores fix-PASS/bug-compile_failed as `correct`: a manufactured kill.
      MEASURED (pop_077_MergingPool, 2026-09-22): the patch adds `abstract contract ReentrancyGuard` and
    makes MergingPool inherit it; all 5 of the run's killing tests imported `ReentrancyGuard` without
    using it, and every one came back fix=Success / bug=compile_failed.
      `C` is always kept. A test whose list is exactly `{C}` -- every published test -- is returned
    unchanged.
    """
    m = _IMPORT_C_UNDER_TEST.search(src)
    if not m:
        return src
    syms = [t.strip() for t in m.group(1).split(",") if t.strip()]
    if syms == ["C"]:
        return src
    body = src[:m.start()] + src[m.end():]
    # A name the test DECLARES itself is not a use of the import: models paste a dependency
    # (`contract LogFile {...}`) and also list it in the widened import -> solc Error 2333 "Identifier
    # already declared" on P. MEASURED 2026-09-23 overnight: 59 of 262 RQ4 foundry_compile_failed_P
    # (18 runs), 37 in RQ1 (23 runs). Keeping the test's own declaration keeps what the model wrote.
    own = {n for n, _, _ in _top_level_decls(body)}
    keep = [t for t in syms
            if t == "C" or (t.split(" as ")[-1].strip() not in own
                            and re.search(r"\b" + re.escape(t.split(" as ")[0]) + r"\b", body))]
    return src[:m.start()] + 'import {' + ", ".join(keep) + '} from "../src/C_under_test.sol"' + src[m.end():]


def adapt_imports(src: str, target: str) -> str:
    """Rewrite campaign-workspace import paths to the artifact scaffold.

    The witness-replay branch and the closure pipeline both compile against `src/flat.sol` or a
    renamed-to-C `src/C_under_test.sol`, while `build_workspace` writes the contract at
    `src/<Target>.sol` under its ORIGINAL name. Without this rewrite every such test fails to
    compile on BOTH sides, which the gate records as `nondistinguishing` -- no evidence either way
    (measured 2026-09-21: 758/758 replay tests came back compile_failed/compile_failed).

    Pure path/alias rewrite, no semantic change (the C binding is kept via an import alias), and a
    no-op for a test that already targets the artifact scaffold.
    """
    src = src.replace('from "../src/flat.sol"', f'from "../src/{target}.sol"')

    # The symbol list is not always just `{C}`: config.import_file_level_types adds the flat source's
    # top-level type names, so a test can carry `import {C, Address, Context, Fighter, ...}`. The old
    # exact-literal replace silently did not match those, leaving the path at src/C_under_test.sol --
    # which this scaffold does not write -- so BOTH sides failed to compile and the gate recorded
    # `nondistinguishing`, i.e. the kills were thrown away (measured 2026-09-22 on pop_077_MergingPool:
    # 5 killing tests, all `compile_failed / compile_failed`). Rewrite any symbol list: only `C` is
    # aliased, every other symbol is kept as written. For a plain `{C}` the output is byte-identical to
    # the previous replace.
    def _imp(m):
        syms = [t.strip() for t in m.group(1).split(",") if t.strip()]
        out = [f"{target} as C" if t == "C" else t for t in syms]
        return 'import {' + ", ".join(out) + '} from "../src/' + target + '.sol"'

    src = _IMPORT_C_UNDER_TEST.sub(_imp, src)
    return src


# --- mapping(K => Struct) getter member access -------------------------------------------------
# Solidity's auto-generated getter for `mapping(K => S) public m` returns S's value-typed members
# as a TUPLE, so `c.m(k).balance` does not compile: solc reports
#   Error (9582): Member "balance" not found or not visible after argument-dependent lookup.
# MEASURED 2026-09-23 on rcx_reentrancy__0xf015c3..__SmartFix (MY_BANK, `mapping(address => Holder)
# public Acc`): telling the model the real signature in the PUBLIC SURFACE block raised correct
# destructuring from 4/35 to 14/35 attempts, but 11/35 still wrote `.balance` and that single error
# was still 11 of the cell's 22 foundry_compile_failed_P rejections.  A prompt hint cannot close it;
# this rewrite can, because the fix is mechanical: replace the member access with a call to a
# generated helper that destructures the tuple and returns the wanted component.
_GETTER_MEMBER = re.compile(
    r"\b([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\.\s*([A-Za-z_]\w*)\b")


def rewrite_struct_getter_members(src: str, getters: dict[str, list[str]]) -> tuple[str, int]:
    """Rewrite `recv.getter(args).member` for every mapping-to-struct getter in `getters`.

    `getters` maps getter name -> the member names solc returns, IN ORDER (what
    invmut.agents.surface derives from the AST).  Returns (source, rewrites).  Untouched when the
    member is not one of that getter's components, so an unrelated `.length`/`.balance` on some
    other expression is never rewritten.
    """
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
    # Emit one helper per (receiver, getter, member) just before the contract's closing brace.
    decls = []
    for (recv, getter, member), name in sorted(helpers.items()):
        members = getters[getter]
        idx = members.index(member)
        slots = ", ".join(f"uint256 _v{i}" if i == idx else "" for i in range(len(members)))
        decls.append(f"    function {name}(address __k) internal view returns (uint256) {{\n"
                     f"        ({slots}) = {recv}.{getter}(__k);\n"
                     f"        return _v{idx};\n"
                     f"    }}")
    # Each helper goes into every top-level contract that CALLS it. Anchoring on the file's last '}'
    # put them into whatever helper contract the model wrote after InvMutTest, leaving the calls in
    # the test undeclared -> solc Error 7576. MEASURED 2026-09-23 overnight: 51 foundry_compile_failed_P
    # in 14 RQ1 runs (`__invmut_c_Acc_balance`).
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


# --- {value:} fuzz parameters in an LLM-authored test ------------------------------------------
# The deterministic renderer bounds every parameter that reaches a `{value: X}` position to
# VALUE_CAP and funds the harness (see _bound_stmt / vm.deal above).  An LLM-authored test never
# goes through that path, so a free `uint256` used as call value is drawn across the whole word:
# MEASURED 2026-09-23 on rcx_reentrancy__0x4e73b32e.. (PRIVATE_ETH_CELL) D0002, the fuzzer picked
# depositAmount = 2**256-4 and the second `Deposit{value: depositAmount}()` ran out of funds, so
# the test was rejected foundry_fuzz_failed_on_P even after its other two blockers were fixed.
# Adding the same bound the renderer already applies made it PASS on P at the official 10000 runs.
_FN_SIG = re.compile(r"function\s+(test\w*)\s*\(([^)]*)\)\s*(?:public|external)[^{]*\{")
_VALUE_IDENT = re.compile(r"\{\s*value\s*:\s*([A-Za-z_]\w*)\s*\}")


def bound_llm_value_params(src: str, cap: str = VALUE_CAP) -> tuple[str, int]:
    """Bound every test parameter used bare as a call value.  Returns (source, params bounded).

    Only a parameter of the SAME function is bounded, and only where it appears as the whole
    `{value: X}` expression -- a computed amount is left alone rather than guessed at.
    """
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
    # Declared at FILE level: anchoring on the first `contract ... {` put it inside whatever helper
    # contract the model wrote above InvMutTest (`contract Reverter {`), leaving VALUE_CAP undeclared
    # in the test -> solc Error 7576. MEASURED 2026-09-23 overnight: 110 foundry_compile_failed_P in
    # 32 RQ1 runs. A file-level constant is visible to every contract of the file (solc >= 0.7.4).
    if not re.search(r"\bconstant\s+" + _VALUE_CAP_NAME + r"\b", out):
        heads = list(re.finditer(r"(?m)^\s*(?:pragma|import)\b[^;]*;[ \t]*$", out))
        pos = heads[-1].end() if heads else 0
        out = out[:pos] + f"\n\nuint256 constant {_VALUE_CAP_NAME} = {cap};" + out[pos:]
    return out, added


# --- low-level call on the handle -> try/catch ---------------------------------------------------
# The canonical shape (verify/canonical.py) admits a state-changing call on c only as `c.f(args);`,
# `x = c.f(args);` or `try c.f(args) {..} catch {..}`.  Models very often probe a revert the
# Solidity-idiomatic way instead:
#     (bool ok, ) = address(c).call(abi.encodeWithSignature("f(address)", a));
# MEASURED 2026-09-23 over the shipped rejected_attempts: 193 of RQ1's 484 malformed_test rejections
# (49 cells), 188 of RQ4's 477 (42 cells) are exactly this idiom.  When f exists on C the two forms
# are the same call (same calldata, same success bit), so the rewrite is mechanical:
#     bool ok; try c.f(a) { ok = true; } catch { ok = false; }
# Returned bytes that are used later, or a selector we cannot name, leave the statement untouched
# (the shape checker still rejects it exactly as before).
_LL_HEAD = re.compile(
    r"(?P<lhs>\(\s*bool\s+(?P<ok>[A-Za-z_]\w*)\s*,\s*(?:bytes\s+memory\s+(?P<data>[A-Za-z_]\w*))?\s*\)\s*=\s*)?"
    r"address\s*\(\s*(?P<h>[A-Za-z_]\w*)\s*\)\s*\.\s*call\s*(?:\{\s*value\s*:\s*(?P<v>[^{}]+?)\s*\})?\s*\(")


def _balanced(src: str, i: int) -> int:
    """index just past the ')' matching the '(' at src[i-1]; -1 if unbalanced."""
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


# --- reserved keywords used as identifiers --------------------------------------------------------
# solc reserves words it never parses as keywords (docs: "Reserved Keywords"). Models name locals
# `after` (snapshot before/after) constantly: MEASURED 2026-09-23 over shipped rejected_attempts,
# RQ4 gpt-5-mini has 470 compile failures `Expected ';' but got reserved keyword 'after'` across 176
# lane dirs (RQ1: 14). Renaming the identifier is mechanical and cannot change behaviour.
# `let`/`switch`/`case`/`default` are live Yul keywords inside `assembly {}` -- never touched.
_RESERVED_IDENTS = ("after", "alias", "apply", "auto", "byte", "copyof", "define", "final", "implements",
                    "inline", "macro", "match", "mutable", "null", "of", "partial", "promise", "reference",
                    "relocatable", "sealed", "sizeof", "static", "supports", "typedef", "typeof", "var")
_RESERVED_RE = re.compile(r"\b(" + "|".join(_RESERVED_IDENTS) + r")\b")
_STR_OR_COMMENT = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*.*?\*/', re.S)


def rename_reserved_identifiers(src: str) -> tuple[str, int]:
    """`uint256 after = ...; ... after - before` -> `after_`. String literals and comments untouched."""
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


# --- vm.addr(fuzzParam) private-key domain --------------------------------------------------------
# `vm.addr(k)` aborts the whole fuzz run ("private key must be less than the Secp256k1 curve order" /
# "cannot be 0") for any k outside [1, n-1]; models routinely fuzz k as a raw uint256. MEASURED
# 2026-09-23, rc_reentrancy__reentrancy_simple SmartFix t2 (gpt-5-mini): 12 of 17 foundry_fuzz_failed_on_P
# on the patched boundary were this abort, i.e. the property was never evaluated. Every key vm.addr
# accepts is kept, so bounding the parameter removes no valid input.
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
    """(name, start, end) of each top-level contract/interface/library block; end is past its '}'."""
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


# --- address -> contract with a payable fallback/receive -----------------------------------------------
# `C(addr)` with `addr` of type `address` is a compile error when C has a payable fallback or receive
# (solc Error 7398: needs `C(payable(addr))`). MEASURED 2026-09-23: 45 of 262 RQ4 and 92 of 1640 RQ1
# foundry_compile_failed_P. Only arguments that are syntactically of type `address` are wrapped, so an
# argument that already compiles is never touched.
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
    # the test's own helper contracts too (a `ReentrantAttacker` with a payable fallback is the usual one)
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


# --- test variable shadows a forge-std Test member ---------------------------------------------------
# `LogFile log;` (the honeypot contracts' logger) collides with forge-std's inherited `event log(string)`
# -> solc Error 9097 "Identifier already declared" and the P gate rejects the test. MEASURED 2026-09-23
# overnight: 107 of the 132 RQ1 Error-9097 rejections (25 runs) are exactly `log`. The variable and its
# uses are renamed; `emit log(...)` (the event) and member accesses `x.log` are left alone.
_HARNESS_NAMES = ("log",)


def rename_harness_shadowing(src: str) -> tuple[str, int]:
    n = 0
    for name in _HARNESS_NAMES:
        masked = _mask_str_comments(src)
        decl = re.search(r"(?<![\w.])[A-Za-z_]\w*(?:\[\])?(?:\s+(?:public|private|internal|immutable|memory|storage|calldata))*\s+"
                         + re.escape(name) + r"\s*[;=,)]", masked)
        if not decl or re.match(r"\s*(?:event|emit|return|function)\b", masked[decl.start():]):
            continue
        # only a STATE variable collides (Error 9097); a local `LogFile log` inside a function body
        # compiles (shadowing warning) and is left byte-identical
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
