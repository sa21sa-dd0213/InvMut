"""Doc 3 §1 shape guard + §2 canonical transform of the candidate test `InvMutTest`.

Transforms (in order, §2): (2.1) constructor → self-deploy `new C(<construction>)`; (2.2) wrap every
BARE typed call on `c` so a callee revert ends the run before the assert (`try ... catch { return; }`)
— existing try/catch (e.g. a revert-goal that records a bool) is kept verbatim; (2.3) preconditions
stay `require` (no `__ESBMC_assume`). The result is the CANONICAL test that both ESBMC and Doc 4 use,
so what is proved is exactly what runs. AST-driven (solc `--ast-compact-json`) so call sites and the
single assert are located structurally, not by regex."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from invmut.esbmc.runner import temp_sol
from invmut.mutation.solast import AstError, get_ast, parse_src

TEST_NAME = "InvMutTest"


@dataclass
class ShapeError:
    reason: str   # Doc 3 §11 reason string (malformed_test / did_not_compile / uses_msg_value / ...)
    detail: str = ""   # for did_not_compile: the real solc diagnostic, forwarded to the reflection


@dataclass
class TestShape:
    contract_name: str          # the test contract name (InvMutTest, before collision suffix)
    handle: str                 # the C-typed field name (`c`)
    c_type: str                 # the type of the handle (C)
    body_name: str              # the single public function name
    body_span: tuple[int, int]  # byte span of the body function
    ctor_span: Optional[tuple[int, int]]  # byte span of the constructor (to rewrite), or None
    assert_span: tuple[int, int]          # byte span of the single assert ExpressionStatement
    bare_calls: list = field(default_factory=list)   # [BareCall] to wrap (§2.2)
    revert_tries: list = field(default_factory=list)  # [RevertTry] revert-goal try/catch
    value_amounts: list = field(default_factory=list)  # §9: amount exprs of value-bearing calls
    has_balance_require: bool = False     # §9: an address(this).balance require already present
    body_open_offset: int = 0             # byte offset just after the body function's opening `{`
    params: list = field(default_factory=list)   # body params [(type, name)] for §8 narrowing
    has_callback: bool = False            # §10: test declares receive/fallback (a reentrancy test)
    callback_bare_calls: list = field(default_factory=list)  # [BareCall] captured INSIDE receive/fallback


@dataclass
class BareCall:
    stmt_span: tuple[int, int]   # the full statement (the `;` is appended by the rewriter)
    call_span: tuple[int, int]   # the `c.f(args)` call sub-expression
    kind: str                    # "expr" | "assign" | "decl" | "tuple_decl"
    lhs: Optional[str] = None    # target var name for assign/decl
    rtype: str = ""              # return/declared type for assign/decl
    decls: list = None           # [(type, name)] for tuple_decl (codex F1)


@dataclass
class RevertTry:
    """A revert-goal `try c.f(args) [returns(...)] { ok } catch { err }` kept verbatim for Foundry
    but translated to a `__ESBMC_reverted()` branch for ESBMC (F13)."""
    stmt_span: tuple[int, int]
    call_text: str
    ret_decl: str                # 'TYPE name' for the returns binding, or '' if none
    ok_block: str                # the success clause block text (with braces)
    catch_block: str             # the (generic) catch clause block text (with braces)


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
    """True if `expr` is a FunctionCall whose callee is `<handle>.member(...)` — also through a
    `{value: ...}` FunctionCallOptions wrapper (a value-bearing call)."""
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
    """The `value:` amount expression text of a value-bearing call `c.f{value: amt}(...)`, or None."""
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
        return None   # a revert-goal needs a success + a catch clause
    success, catch = clauses[0], clauses[-1]
    params = (success.get("parameters") or {}).get("parameters", []) if success.get("parameters") else []
    decls = ", ".join(f"{p.get('typeDescriptions', {}).get('typeString', '')} {p.get('name')}"
                      for p in params)
    # multiple returns need tuple destructuring syntax `(T x, T y) = call` (codex F6)
    ret_decl = f"({decls})" if len(params) > 1 else decls
    return RevertTry(
        parse_src(try_node["src"]),
        src[parse_src(ec["src"])[0]:parse_src(ec["src"])[1]],
        ret_decl,
        _block_text(src, success["block"]),
        _block_text(src, catch["block"]),
    )


def _func_mutability(ast: dict) -> dict[int, str]:
    """Map every FunctionDefinition id → stateMutability (view/pure/nonpayable/payable), so the
    completeness guard can tell a read-only getter from a state-changing call (codex B2/B3)."""
    out = {}
    for n in _walk(ast):
        if isinstance(n, dict) and n.get("nodeType") == "FunctionDefinition" and "id" in n:
            out[n["id"]] = n.get("stateMutability", "nonpayable")
    return out


def _contract_own_func_ids(ast: dict, c_type: str) -> set[int]:
    """FunctionDefinition ids reachable as METHODS of contract `c_type` — its own functions PLUS
    those of its linearized base contracts (so a legitimate INHERITED getter is accepted, not
    over-rejected). A `c.method()` whose callee resolves OUTSIDE this set is a `using-for` library
    extension (codex W1) whose unguarded library body would reach ESBMC — rejected as malformed."""
    contracts = {}        # id -> ContractDefinition node
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
    """Ids of `c_type`'s PUBLIC state variables (own + linearized bases). A `c.var()` read references the
    state-variable declaration (solc's implicit getter), NOT a FunctionDefinition — so without this the
    completeness guard would mis-reject the single most common test operation (reading public state) as a
    library-extension call. Public-variable getters are read-only, so they are always allowed."""
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
    """Capture the ONE state-changing `c` call a reentrancy callback is allowed to make.

    A reentrancy PUT cannot be written without re-entering `c` from receive()/fallback(), and it
    cannot re-enter unconditionally either -- the callback needs a recursion guard, so the natural
    (and only safe) shape is

        receive() external payable { if (<cond>) { <plain assignments>; c.f(args); } }

    with <cond> a predicate over the TEST contract's own state/locals.  The ESBMC soundness reason
    for the old blanket refusal (F13: an unguarded c-call continues past its revert with a nondet
    result) is answered the same way the body is: CAPTURE the call so `build_esbmc_test` appends
    `if (__ESBMC_reverted()) return;` after it.  Nothing is exempted from `_body_violation`; this
    only adds spans to its captured set, exactly as the top-level body scan does.

    The invariant that keeps this sound is NOT structural: it is that every state-changing c-call
    is captured and guarded.  Capture only recognises a plain `c.f(args);` expression statement at
    callback top level or inside `if` branches, and only ONE of them; a second one, or a call
    reached any other way (loop body, try, assignment, alias, low-level call), is simply never
    captured -- and `_body_violation` then rejects the callback exactly as before.  So the guard
    cannot be bypassed by nesting.  Returns (captured_spans, bare_calls)."""
    spans, calls = set(), []

    def _take(st: dict) -> bool:
        if st.get("nodeType") != "ExpressionStatement":
            return True                       # not a capture site; the whitelist judges it
        e = st.get("expression", {}) or {}
        if e.get("nodeType") != "FunctionCall" or not _is_call_on(e, handle):
            return True
        callee = e.get("expression", {}) or {}
        if callee.get("nodeType") == "FunctionCallOptions":
            callee = callee.get("expression", {}) or {}
        ref = callee.get("referencedDeclaration")
        if ref not in c_func_ids or func_mut.get(ref) in ("view", "pure"):
            return True                       # a view read needs no guard
        if calls:                             # only one re-entrant call per callback
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
    """WHITELIST completeness guard (canonical flat shape, §1: `c` is the ONLY contract interacted
    with; no low-level calls, assembly, or new). Returns True (→ malformed_test) if the body does
    ANYTHING other than: a captured top-level guarded `c` call, a read-only view/pure `c` call,
    `require`/`assert`/builtins, or a type conversion. This rejects EVERY way a state-changing
    external call could reach ESBMC unguarded — calls on aliases/casts/interfaces/derived receivers
    (codex N1/N2), free-function/helper forwarders (N4), low-level calls, and inline assembly (N6)
    — without enumerating them (a blacklist is whack-a-mole; the whitelist is sound)."""
    for n in _walk(body):
        if not isinstance(n, dict):
            continue
        nt = n.get("nodeType")
        if nt == "InlineAssembly":
            return True   # N6
        if nt == "VariableDeclaration":
            # an external function-typed local (`function() external ... fp = c.f; fp();`) lets a
            # c-call escape the call collector and be invoked via an identifier (codex W7).
            if n.get("typeDescriptions", {}).get("typeString", "").startswith("function "):
                return True
            # a param/local SHADOWING the handle name (`function run(C c)`) would make `c.f()`
            # dispatch to a caller-provided nondet instance, not the deployed one (codex F4).
            if n.get("name") == handle:
                return True
            continue
        if nt != "FunctionCall":
            continue
        if n.get("kind") == "typeConversion":
            continue      # a cast like address(c)/uint256(x)/C(addr) — the CALL on it is checked separately
        callee = n.get("expression", {})
        if callee.get("nodeType") == "FunctionCallOptions":
            callee = callee.get("expression", {})
        ctype = callee.get("nodeType")
        if ctype == "Identifier":
            # a user-defined free/helper function (resolvable to a FunctionDefinition) could forward
            # to c → reject (N4); require/assert/keccak/etc. have no FunctionDefinition ref.
            if callee.get("referencedDeclaration") in func_mut:
                return True
            continue
        if ctype == "MemberAccess":
            ref = callee.get("referencedDeclaration")
            recv = callee.get("expression", {})
            recv_is_c = recv.get("nodeType") == "Identifier" and recv.get("name") == handle
            recv_type = recv.get("typeDescriptions", {}).get("typeString", "")
            # A TRUE low-level call (address.call/delegatecall/staticcall/send/transfer) resolves to NO
            # FunctionDefinition (ref is None). A contract METHOD that merely SHARES a name with one of
            # these (e.g. an ERC20 transfer(address,uint256)) resolves to a real function and is a
            # legitimate typed call — do NOT reject it. (The old name-only check rejected essentially
            # every token-contract test, since transfer is the central ERC20 method — codex/measured.)
            if callee.get("memberName") in _LOWLEVEL_MEMBERS and ref is None:
                return True
            if recv_is_c:
                if ref in c_getter_ids:
                    continue   # a public state-variable getter read on c — always read-only
                if ref not in c_func_ids:
                    return True   # a `using-for` library extension call on c (W1), not a C method
                span = parse_src(n["src"])
                if span in handled_call_spans:
                    continue   # captured + guarded
                if func_mut.get(ref) in ("view", "pure"):
                    continue   # read-only getter (assert/require shape)
                return True     # an uncaptured non-view c-call (nested / in assert/require)
            if recv_type.startswith("contract "):
                return True     # a call on a non-`c` contract receiver (alias/cast/interface/chained)
            # else: a builtin member call (abi.encode, etc.) — allowed
    return False


def _reads_msg_value(node: dict) -> bool:
    for n in _walk(node):
        if (n.get("nodeType") == "MemberAccess" and n.get("memberName") == "value"
                and n.get("expression", {}).get("name") == "msg"):
            return True
    return False


def _byteview(s: str) -> str:
    """A latin-1 byte-transparent view of `s`: each char maps to exactly one UTF-8 byte, so solc AST
    `src` BYTE offsets index it as plain str positions and ASCII string ops still behave. Without this,
    any non-ASCII upstream (BTNFT metadata/comments) shifts every byte offset past its char index and
    `t_source.index("{", body_span[0])` overshoots → `ValueError: substring not found`. Round-trips via
    `_unbyteview`. solc offsets always fall on char boundaries, so slices stay valid UTF-8."""
    return s.encode("utf-8").decode("latin-1")


def _unbyteview(s: str) -> str:
    return s.encode("latin-1").decode("utf-8")


def analyze_test(solc_bin: str, t_source: str, test_name: str = TEST_NAME) -> TestShape | ShapeError:
    """§1 shape guard + structural extraction. Returns ShapeError(reason) on any guard violation.
    `test_name` is the test contract name in `t_source` (already collision-renamed by §4.2)."""
    try:
        with temp_sol(t_source, prefix="invmut_t_") as path:
            ast = get_ast(solc_bin, path)
    except AstError as e:
        # a solc/AST failure means the test DID NOT COMPILE (syntax/type error, e.g. the reserved-word
        # `after` local, or a missing memory data-location) — NOT a shape violation. Report it as
        # did_not_compile WITH the real solc diagnostic so the reflection shows the LLM its actual error
        # instead of useless flat-shape guidance (codex root-cause #1).
        return ShapeError("did_not_compile", detail=str(e)[:1500])

    # AST is built from the REAL source above (correct byte offsets); all source slicing below uses the
    # byte-transparent view so those byte offsets index as str positions even with non-ASCII upstream.
    tv = _byteview(t_source)

    cdef = _find_contract(ast, test_name)
    if cdef is None:
        return ShapeError("malformed_test", detail="no contract named InvMutTest in your output")

    # the C-typed handle field — the state var whose type is a CONTRACT (UserDefinedTypeName
    # resolving to a contract). Auxiliary state vars (bool entered, etc., §1) are NOT the handle.
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

    # functions: exactly one public body; at most constructor/receive/fallback
    body = None
    ctor_span = None
    publics = []
    has_callback = False
    callbacks = []   # V43: receive/fallback bodies — allowed (the CEI observer), but completeness-guarded
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

    # the body must carry NO modifiers — a modifier's body is outside the canonical flat shape and
    # its calls on `c` would escape the completeness guard (codex B8).
    if body.get("modifiers"):
        return ShapeError("malformed_test", detail="the public function must carry no modifiers")

    # §9: the body must not read msg.value anywhere
    if _reads_msg_value(body):
        return ShapeError("uses_msg_value")

    # statements: classify; collect the single assert + bare calls to wrap
    stmts = (body.get("body", {}) or {}).get("statements", [])
    asserts = []
    bare_calls = []
    revert_tries = []
    value_amounts = []
    handled_call_spans = set()   # spans of c-calls captured at top level (bare / revert-goal)
    safe_regions = []            # assert / require statement spans (c-calls here are read-only)

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
                elif len(decls) > 1:   # tuple destructuring decl (codex F1) — must be guarded
                    dl = [(d.get("typeDescriptions", {}).get("typeString", ""), d.get("name"))
                          for d in decls if d]
                    bare_calls.append(BareCall(
                        parse_src(st["src"]), parse_src(iv["src"]), "tuple_decl", decls=dl))
        # other statements kept verbatim

    if len(asserts) != 1:
        return ShapeError("malformed_test", detail=f"exactly ONE assert(...) statement is required (found {len(asserts)})")

    # COMPLETENESS GUARD (canonical flat shape, §1): every external call on a C-typed receiver must
    # be either a captured TOP-LEVEL bare call / revert-goal try (which receives the __ESBMC_reverted
    # guard) OR a read-only view/pure call. A state-changing (or unknown-mutability) call that is NOT
    # captured — nested in control flow, inside a require/assert, through an alias/cast, etc. — would
    # escape the guard → ESBMC continues past its revert with a nondet result (F13) → SILENT
    # mis-verification. Reject such tests as malformed so the loop revises, never mis-verify
    # (codex B2/B3/B5/B6). A reverting view getter inside assert/require is the spec's allowed shape.
    func_mut = _func_mutability(ast)
    c_func_ids = _contract_own_func_ids(ast, c_type)
    c_getter_ids = _contract_own_getter_ids(ast, c_type)
    if _body_violation(body, handle, func_mut, handled_call_spans, c_func_ids, c_getter_ids):
        return ShapeError("malformed_test", detail="a state-changing call on c is not a plain top-level statement, or c is reached through a low-level call / abi.encodeWithSignature / address cast / interface / helper. Every call must be `c.f(args);`, `x = c.f(args);`, or `try c.f(args) { ... } catch { ... }` at top level of the single public function; only view calls may sit inside require/assert")

    # V43 (codex Q1): a receive()/fallback() observer is allowed to READ c (a view getter snapshot
    # during a callback — the CEI observer shape), but a STATE-CHANGING / unknown-mutability c-call in
    # the callback escapes the body completeness guard above → F13 nondet-past-revert → silent
    # mis-verification. Re-run the SAME whitelist guard on each callback with NO captured calls (so any
    # non-view c-call is rejected). Closes a pre-existing hole AND keeps the read-only observer sound.
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


# --- §12 construction resolution ----------------------------------------------------------

def resolve_construction(construction: dict, witness: Optional[dict],
                         c_ctor_payable: bool = False) -> tuple[str, str] | ShapeError:
    """Return (args_text, value_text) for `new C{value: value}(args)` (Doc 3 §12). args_text is the
    comma-joined ctor args ('' for none); value_text is '0' or a wei amount. ShapeError on unknown.
    A PAYABLE constructor with no explicit value (and no witness value) → construction_value_unknown
    (codex F3: defaulting to 0 would make `new C(args)` revert on the real EVM → false accepted)."""
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


# --- §2 transform -------------------------------------------------------------------------

def _stmt_with_semicolon(src: str, span: tuple[int, int]) -> tuple[int, int]:
    """Extend a statement span to include its trailing ';' (the AST src excludes it)."""
    end = span[1]
    while end < len(src) and src[end] != ";":
        end += 1
    return (span[0], min(end + 1, len(src)))


REVERTED_STUB = "function __ESBMC_reverted() internal returns (bool) {}"
ASSUME_STUB = "function __ESBMC_assume(bool) internal pure {}"
# the test contract is funded to this balance (ETH it can send); c is funded to the same (victim funds a
# value-out path can pay), so value-flow properties (deposit/withdraw/refund) are not spuriously falsified
# by a zero balance. Large but far from overflow.
FUND_WEI = "1000000000000000000000000"   # 1e24 wei


def _self_deploy_ctor(shape: TestShape, args_text: str, value_text: str, with_stub: bool) -> str:
    payable_ctor = value_text and value_text != "0"
    new_expr = (f"new {shape.c_type}{{value: {value_text}}}({args_text})" if payable_ctor
                else f"new {shape.c_type}({args_text})")
    pay = " payable" if payable_ctor else ""
    ctor = f"constructor(){pay} {{ {shape.handle} = {new_expr}; }}"
    extras = []
    if with_stub:
        extras += [REVERTED_STUB, ASSUME_STUB]
    # DEFAULT receive() so a value-returning call to the test (withdraw/refund/transfer to msg.sender)
    # does not revert for lack of a payable fallback — the LLM no longer has to remember to write one
    # (user). A dormant receive() is not a reentrancy callback (codex C2), so it does not change the proof.
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
    """§9: for value-bearing calls, insert `require(address(this).balance >= <sum of amounts>);` at
    the body start. ALWAYS inserted when there are value calls — an existing balance require may be
    weaker than the actual sum (codex F2: a trivial `>= 0` would not cover it); a redundant stronger
    require is a harmless conjunction, and it guarantees the funding precondition covers the total."""
    if not shape.value_amounts:
        return None
    total = " + ".join(f"({a})" for a in shape.value_amounts)
    req = f" require(address(this).balance >= {total});"
    return (shape.body_open_offset, shape.body_open_offset, req)


# The SAME cap the Doc-4 renderer bounds value-typed fuzz parameters with
# (invmut/render/foundry.py: VALUE_CAP). The two forms are documented as path-equivalent, but only
# the RENDER form carried the bound: ESBMC therefore verified the test over an input domain that the
# emitted, validated and published test can never reach. On a contract with SafeMath-style internal
# asserts (sGuard's `add_uint256`/`sub_uint256`) an unbounded deposit overflows the CONTRACT's own
# assert before the test's property is ever evaluated, and the kill is classified
# FAILED_OFF_TARGET -> `non_target_failure_on_modified`. Bounding here restores the equivalence; it
# is the renderer's own rule, not a per-case precondition.
_VERIFY_VALUE_CAP = "1000000000000000000000000000000"


def _value_cap_edit(shape: TestShape) -> Optional[tuple[int, int, str]]:
    """`require(<amt> <= VALUE_CAP);` for every value amount that is a bare parameter name."""
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
    """ESBMC-only: assume the contract under test starts with a balance, so a value-OUT path
    (withdraw/refund/transfer-from-c) it pays out is not spuriously unprovable for lack of funds
    (represents other users' deposits the exploit drains). Sound: funds c equally for P and M, so it
    creates no P-vs-M difference. Foundry mirrors this with vm.deal(c) in Document 4's setUp."""
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
    """§8: inject narrowing `require(...)` at the body start (after funding so they read first)."""
    if not extra_requires:
        return None
    text = "".join(f" require({r});" for r in extra_requires)
    return (shape.body_open_offset, shape.body_open_offset, text)


def build_esbmc_test(t_source: str, shape: TestShape, args_text: str, value_text: str,
                     extra_requires=()) -> tuple[str, int]:
    """The VERIFICATION form (DEVIATIONS V24 / F13): self-deploy ctor + `__ESBMC_reverted()` stub,
    bare calls guarded by `if (__ESBMC_reverted()) return;`, revert-goal try/catch translated to a
    `__ESBMC_reverted()` branch. `extra_requires` are §8 narrowing preconditions. Returns
    (source, new_assert_offset)."""
    tv = _byteview(t_source)   # solc byte offsets index this view as str positions (non-ASCII safe)
    edits: list[tuple[int, int, str]] = []
    er = _extra_requires_edit(shape, extra_requires)
    if er is not None:
        edits.append(er)
    if shape.ctor_span is not None:
        edits.append((*shape.ctor_span, _self_deploy_ctor(shape, args_text, value_text, with_stub=True)))
    for i, bc in enumerate([*shape.bare_calls, *shape.callback_bare_calls]):
        # the callback's captured re-entrant call gets the SAME F13 guard; `return;` is valid inside
        # receive()/fallback() (both return void), so the shape is identical to the body's.
        s0, s1 = _stmt_with_semicolon(tv, bc.stmt_span)
        stmt = tv[s0:s1]
        edits.append((s0, s1, f"{stmt} if (__ESBMC_reverted()) return;"))
    for i, rt in enumerate(shape.revert_tries):
        s0, s1 = rt.stmt_span   # a try statement has NO trailing ';' — do not extend past it
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
    out, off = _apply(tv, shape, edits)   # out/off are in byte-view space
    return _unbyteview(out), len(_unbyteview(out[:off]))   # real UTF-8 source + char offset


def build_foundry_test(t_source: str, shape: TestShape, args_text: str, value_text: str,
                       extra_requires=()) -> str:
    """The RENDER form for Doc 4 (intrinsic-free, real-EVM-correct): self-deploy ctor + try/catch
    wraps for bare calls; revert-goal try/catch kept verbatim. Path-equivalent to the ESBMC form."""
    tv = _byteview(t_source)   # solc byte offsets index this view as str positions (non-ASCII safe)
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

