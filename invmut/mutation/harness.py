"""Doc 2 §6.4-6.6 — R2 differential harness generation.

Builds the single-file `Harness` that `new`s both renamed contract copies, drives every
public/external entry through an (assertion-free) sync wrapper, and places the differential
assertion in the boundary wrapper(s). The assertion is guarded by `__ESBMC_reverted()` on BOTH
sides (DEVIATIONS V18 — applies to the `state` and `return` kinds; F9: a reverted new-built
sub-instance leaks state under --bound, so we compare only when both sides complete). The R2 run
mode is --bound (DEVIATIONS V1), set by `commands.build_r2_command`, NOT Doc 2 §6.1's --unbound.

v1 projection support (Doc 2 §6.6): scalar + mapping (incl. nested) state, value-type single
returns, revert. Array/struct/dynamic projections and multi-return tuples report back as unsupported."""

from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from typing import Optional

from invmut.mutation.assemble import AssemblyError, AssemblyParts
from invmut.mutation.solast import FuncSig

# value types whose `==` is well-defined in an assertion (Doc 2 §6.6 leaf-projectability).
_VALUE_PREFIXES = ("uint", "int", "bool", "address", "bytes1", "bytes2", "bytes3", "bytes4",
                   "bytes5", "bytes6", "bytes7", "bytes8", "bytes9", "bytes10", "bytes11",
                   "bytes12", "bytes13", "bytes14", "bytes15", "bytes16", "bytes17", "bytes18",
                   "bytes19", "bytes20", "bytes21", "bytes22", "bytes23", "bytes24", "bytes25",
                   "bytes26", "bytes27", "bytes28", "bytes29", "bytes30", "bytes31", "bytes32")


_ELEMENTARY = ("uint", "int", "bool", "address") + tuple(f"bytes{n}" for n in range(1, 33))


def _is_value_type(t: str) -> bool:
    t = t.strip()
    # enum leaves arrive as the enum's qualified name; treat any non-reference, non-dynamic type
    # named without a location/array/mapping marker as a value type at the leaf.
    if any(m in t for m in ("[]", "mapping(", "memory", "calldata", "storage")):
        return False
    if t in ("string", "bytes"):
        return False
    return True  # uintN/intN/bool/address/bytesN/enum/contract-handle (compared by ==)


def _is_elementary(t: str) -> bool:
    """An ABI elementary value type whose `==` works directly across the C_ref/C_mut copies.
    Enum leaves are value-typed but their type is contract-internal (C_ref.State != C_mut.State),
    so they need a `uint256(...)` cast — handled separately in the state path (codex B3)."""
    base = t.strip().split()[0] if t.strip() else ""
    if "[" in base or "]" in base:
        return False
    if base in {"bool", "address"}:
        return True
    if base.startswith("uint"):
        return not base[4:] or base[4:].isdigit()
    if base.startswith("int"):
        return not base[3:] or base[3:].isdigit()
    if base.startswith("bytes") and base[5:].isdigit():
        width = int(base[5:])
        return 1 <= width <= 32
    return False


def _cast_getter(side: str, t: "HarnessTarget") -> str:
    """Getter call, cast to uint256 when the leaf is a (contract-internal) enum so the comparison
    and the named local are well-typed across both renamed copies."""
    call = _getter_call(side, t)
    return call if _is_elementary(t.leaf_type or "uint256") else f"uint256({call})"


def _snap_equality(t: "HarnessTarget") -> str:
    """Equality of the during-call observer snapshots, component-wise for a struct leaf."""
    comps = list(t.state_components or [])
    if not comps:
        return "__invmut_snapP == __invmut_snapM"
    return " && ".join(f"__invmut_snapP{c['index']} == __invmut_snapM{c['index']}" for c in comps)


def _state_observation(t: "HarnessTarget", indent: str) -> tuple[str, str]:
    """Lines binding P's and M's observation of the state target to NAMED locals, plus the equality
    term over them. A struct leaf is destructured from solc's synthesized getter tuple, one local per
    component, and compared component-wise (same shape as the `struct_fields` return projection)."""
    comps = list(t.state_components or [])
    if not comps:
        leaf = t.leaf_type or "uint256"
        decl_type = leaf if _is_elementary(leaf) else "uint256"
        lines = (f"{indent}{decl_type} __invmut_vP = {_cast_getter('p', t)};\n"
                 f"{indent}{decl_type} __invmut_vM = {_cast_getter('m', t)};\n")
        return lines, "__invmut_vP == __invmut_vM"
    lines = ""
    terms: list[str] = []
    for side in ("p", "m"):
        decls = ", ".join(f"{c['projection_type']} __invmut_v{side.upper()}{c['index']}" for c in comps)
        lines += f"{indent}({decls}) = {_getter_call(side, t)};\n"
    for c in comps:
        terms.append(f"__invmut_vP{c['index']} == __invmut_vM{c['index']}")
    return lines, " && ".join(terms)


@dataclass
class HarnessTarget:
    """Everything the harness needs about the selected difference target (from Doc 1's JSON)."""
    category: str                       # "state" | "return" | "revert"
    var_name: Optional[str] = None      # state: the VAR identifier
    getter_name: Optional[str] = None   # state: synthesized public name or "__invmut_get"
    getter_params: list[dict] = field(default_factory=list)   # [{type,name,role}]
    needs_getter_injection: bool = False
    getter_inject_sig: Optional[str] = None    # Doc1 injected-getter signature (no `function`)
    leaf_type: Optional[str] = None
    state_kind: Optional[str] = None
    state_components: list[dict] = field(default_factory=list)  # struct-leaf scalar projections (Doc1)
    writer_names: list[str] = field(default_factory=list)     # state: public writer entry names
    tb_writer: Optional[str] = None     # state: the ONE selected boundary writer (tb) that carries the
                                        # differential assert (icse.tex:556 — one assert per harness). When
                                        # set, only this writer's wrapper asserts; the rest are plain
                                        # dispatch wrappers. stage5_r2 iterates writers, one harness each.
    fn_name: Optional[str] = None       # return/revert: boundary FN name
    return_types: list[str] = field(default_factory=list)
    return_projection: str = "direct"  # local pack: direct equality or shared contract handle -> address
    return_components: list[dict] = field(default_factory=list)  # struct_fields scalar projections


@dataclass(frozen=True)
class PackedObservation:
    """One observation inside a local R2 multi-property pack.

    `assertion_id` must be stable and source-safe because it is embedded in the
    assertion boolean name (`__invmut_assert_<id>`), then parsed from the ESBMC
    violated-property claim to attach the CE witness to exactly this observation.
    """
    assertion_id: str
    target: HarnessTarget


@dataclass(frozen=True)
class CoveragePrefixStep:
    """One frozen P-side coverage witness call to replay before the packed boundary.

    `args` are the numeric/scalar witness values used by the downstream replay
    renderer: elementary ABI values are re-typed here for the Solidity call, and
    stored back into the bounded trace as uint256 projections.
    """
    function_name: str
    args: tuple[str, ...] = ()
    value: str = "0"
    expected_reverted: bool = False
    caller: str | None = None


# --- small emit helpers -------------------------------------------------------------------

def _dyn_array_elem(ptype: str) -> Optional[str]:
    """V46: the element type of a 1-D dynamic VALUE-typed array param (`address[] memory` → `address`),
    else None (nested/fixed arrays, array-of-reference fall back to a nondet param). A bare nondet
    `T[] memory` param is driven badly by ESBMC (defaults empty/unconstrained), so a function whose
    per-element body holds the real behaviour (e.g. `for(..){ caddress.call(..) }` — the unchecked-call
    class) never executes and its revert/state difference stays hidden."""
    t = ptype.strip()
    for loc in (" memory", " calldata", " storage"):
        if t.endswith(loc):
            t = t[: -len(loc)].strip()
    if not t.endswith("[]"):
        return None
    elem = t[:-2].strip()
    if "[" in elem or "]" in elem or not _is_value_type(elem):   # nested / array-of-reference → fallback
        return None
    return elem


def _dyn_bytes_elem(ptype: str) -> Optional[str]:
    """Scalarize a dynamic ``bytes`` parameter as one byte.

    This mirrors the existing length-1 dynamic-array treatment: the R2 wrapper
    exposes a single symbolic byte, rebuilds ``bytes memory`` of length one, and
    records that byte in the replay trace.  ``string`` is intentionally left
    unsupported because reconstructing UTF-8/text semantics is not needed for
    the current callback surface.
    """
    t = ptype.strip()
    for loc in (" memory", " calldata", " storage"):
        if t.endswith(loc):
            t = t[: -len(loc)].strip()
    return "uint8" if t == "bytes" else None


def _scalarized_param_value(ptype: str, arg_index: int) -> tuple[str, str]:
    elem = _dyn_array_elem(ptype)
    if elem is not None:
        return elem, f"a{arg_index}_e"
    byte_elem = _dyn_bytes_elem(ptype)
    if byte_elem is not None:
        return byte_elem, f"a{arg_index}_e"
    return ptype, f"a{arg_index}"


def _wrapper_params(fn: FuncSig) -> tuple[list[str], list[str], list[str]]:
    """(declared param decls, call-arg names, PRELUDE lines constructing bounded args). V46: a 1-D
    dynamic value-array param is taken as a single scalar ELEMENT and rebuilt as a length-1 array in the
    body, so the callee's per-element logic actually runs (a length-1 array exposes a per-element revert/
    state difference; the bound is intentional, like the rest of the harness)."""
    decls, args, prelude = [], [], []
    for i, (ptype, _name) in enumerate(fn.params):
        if i < len(getattr(fn, "qparams", None) or []):
            ptype = fn.qparams[i]   # dependency-nested struct/enum spelled qualified (solast._qualified_param_type)
        elem = _dyn_array_elem(ptype)
        if elem is not None:
            decls.append(f"{elem} a{i}_e")
            prelude.append(f"        {elem}[] memory a{i} = new {elem}[](1); a{i}[0] = a{i}_e;")
            args.append(f"a{i}")
        elif _dyn_bytes_elem(ptype) is not None:
            decls.append(f"uint8 a{i}_e")
            prelude.append(f"        bytes memory a{i} = new bytes(1); a{i}[0] = bytes1(a{i}_e);")
            args.append(f"a{i}")
        else:
            decls.append(f"{ptype} a{i}")
            args.append(f"a{i}")
    return decls, args, prelude


def _witness_numeric_projection(ptype: str, value_expr: str) -> tuple[str, str] | None:
    """Return (`field_type`, `assignment_expr`) for a CE-replay witness field.

    The witness is stored as a numeric scalar even for address/bool/bytesN.  ESBMC reliably prints
    Harness storage scalar fields in the counterexample, while fixed bytes storage is dumped as an
    internal byte-array object.  The synthesis side re-types these numeric strings using the ABI type
    of the original boundary/getter parameter.
    """
    t = ptype.strip().split()[0]
    if "[" in t:   # an array (e.g. `uint256[2][]`) is not a scalar: `uint256(a2)` does not compile
        return None
    if t.startswith("uint"):
        return "uint256", f"uint256({value_expr})"
    if t.startswith("int"):
        return "int256", f"int256({value_expr})"
    if t == "bool":
        return "uint256", f"({value_expr} ? 1 : 0)"
    if t == "address":
        return "uint256", f"uint256(uint160(address({value_expr})))"
    if t.startswith("bytes") and t[5:].isdigit():
        n = int(t[5:])
        if 1 <= n <= 32:
            if n == 32:
                return "uint256", f"uint256({value_expr})"
            return "uint256", f"uint256(uint{n * 8}({value_expr}))"
    return None


def _witness_uint_projection(ptype: str, value_expr: str) -> str | None:
    """Project one replay-controlled ABI value into a uniform uint256 trace slot."""
    t = ptype.strip().split()[0]
    if "[" in t:   # an array (e.g. `uint256[2][]`) is not a scalar: `uint256(a2)` does not compile
        return None
    if t.startswith("uint"):
        return f"uint256({value_expr})"
    if t.startswith("int"):
        return f"uint256(int256({value_expr}))"
    if t == "bool":
        return f"({value_expr} ? 1 : 0)"
    if t == "address":
        return f"uint256(uint160(address({value_expr})))"
    if t.startswith("bytes") and t[5:].isdigit():
        n = int(t[5:])
        if 1 <= n <= 32:
            if n == 32:
                return f"uint256({value_expr})"
            return f"uint256(uint{n * 8}({value_expr}))"
    return None


# R2 runs at --solidity-max-tx 2, so two slots hold every call the query can witness.
_R2_TRACE_SLOTS = 2

# How many extra scalar observables one widened predicate may carry. Each one adds two external
# calls and a conjunct to every boundary query, so the cap is what keeps the widening affordable.
_WIDE_OBSERVATION_CAP = 8


def _bounded_trace_schema(entries: list[FuncSig], slots: int) -> tuple[list[str], list[str]]:
    """Storage declarations and liveness terms for a bounded synchronized call trace."""
    max_args = max((len(fn.params) for fn in entries), default=0)
    fields = ["    uint256 __invmut_trace_len;", "    uint256 __invmut_trace_overflow;"]
    terms = [
        "__invmut_trace_len == __invmut_trace_len",
        "__invmut_trace_overflow == __invmut_trace_overflow",
    ]
    for slot in range(slots):
        for suffix in ("fn", "argc", "value", "supported"):
            name = f"__invmut_step{slot}_{suffix}"
            fields.append(f"    uint256 {name};")
            terms.append(f"{name} == {name}")
        for arg_index in range(max_args):
            name = f"__invmut_step{slot}_arg{arg_index}"
            fields.append(f"    uint256 {name};")
            terms.append(f"{name} == {name}")
    return fields, terms


def _bounded_trace_capture_lines(idx: int, fn: FuncSig, slots: int) -> list[str]:
    """Record this wrapper invocation before it drives the synchronized P/M call."""
    if slots <= 0:
        return []
    projections: list[str | None] = []
    for arg_index, (ptype, _name) in enumerate(fn.params):
        value_type, value_name = _scalarized_param_value(ptype, arg_index)
        projections.append(_witness_uint_projection(value_type, value_name))
    supported = all(value is not None for value in projections)
    call_value = "__v" if fn.payable else "0"
    lines: list[str] = []
    for slot in range(slots):
        lines.append(f"        if (__invmut_trace_len == {slot}) {{")
        lines.append(f"            __invmut_step{slot}_fn = {idx + 1};")
        lines.append(f"            __invmut_step{slot}_argc = {len(fn.params)};")
        lines.append(f"            __invmut_step{slot}_value = {call_value};")
        lines.append(f"            __invmut_step{slot}_supported = {1 if supported else 0};")
        for arg_index, projection in enumerate(projections):
            if projection is not None:
                lines.append(f"            __invmut_step{slot}_arg{arg_index} = {projection};")
        lines.append("        }")
    lines.append(f"        if (__invmut_trace_len >= {slots}) __invmut_trace_overflow = 1;")
    lines.append("        __invmut_trace_len += 1;")
    return lines


_NUMERIC_LITERAL = re.compile(r"-?(?:0x[0-9a-fA-F]+|\d+)")


def _is_zero_numeric_literal(raw: str) -> bool:
    text = str(raw).strip()
    if not _NUMERIC_LITERAL.fullmatch(text):
        return False
    return (int(text, 16) if text.lower().startswith("0x") else int(text, 10)) == 0


def _require_uint_literal(raw: str, what: str) -> str | AssemblyError:
    text = str(raw).strip()
    if not re.fullmatch(r"(?:0x[0-9a-fA-F]+|\d+)", text):
        return AssemblyError(f"coverage prefix {what} is not a uint literal: {raw!r}")
    return text


def _fixed_literal_for_type(ptype: str, raw: str) -> str | AssemblyError:
    typ = (ptype or "").strip()
    for loc in (" memory", " calldata", " storage"):
        if typ.endswith(loc):
            typ = typ[: -len(loc)].strip()
    text = str(raw).strip()
    low = text.lower()
    if typ == "bool":
        if low in {"1", "true"}:
            return "true"
        if low in {"0", "false"}:
            return "false"
        return AssemblyError(f"coverage prefix bad bool literal: {raw!r}")
    if typ.startswith("uint"):
        if re.fullmatch(r"(?:0x[0-9a-fA-F]+|\d+)", text):
            return text
        return AssemblyError(f"coverage prefix bad uint literal: {raw!r}")
    if typ.startswith("int"):
        if _NUMERIC_LITERAL.fullmatch(text):
            return text
        return AssemblyError(f"coverage prefix bad int literal: {raw!r}")
    if typ == "address":
        # markers from the forge prefix searcher: the harness itself carries a
        # universal fallback, so "__self" is the address that accepts any call
        if low == "__self":
            return "address(this)"
        literal = _require_uint_literal(text, "address")
        if isinstance(literal, AssemblyError):
            return literal
        return f"address(uint160({literal}))"
    if re.fullmatch(r"bytes(?:[1-9]|[12][0-9]|3[0-2])", typ):
        width = int(typ[5:])
        try:
            value = int(text, 16) if low.startswith("0x") else int(text, 10)
        except ValueError:
            return AssemblyError(f"coverage prefix bad fixed-bytes literal: {raw!r}")
        if value < 0 or value >= (1 << (8 * width)):
            return AssemblyError(f"coverage prefix fixed-bytes literal out of range: {raw!r}")
        return f'hex"{value:0{2 * width}x}"'
    return AssemblyError(f"coverage prefix unsupported argument type: {ptype}")


def _fixed_uint_projection_for_type(ptype: str, raw: str) -> str | AssemblyError:
    typ = (ptype or "").strip()
    for loc in (" memory", " calldata", " storage"):
        if typ.endswith(loc):
            typ = typ[: -len(loc)].strip()
    text = str(raw).strip()
    low = text.lower()
    if typ == "bool":
        if low in {"1", "true"}:
            return "1"
        if low in {"0", "false"}:
            return "0"
        return AssemblyError(f"coverage prefix bad bool trace literal: {raw!r}")
    if typ.startswith("uint"):
        literal = _require_uint_literal(text, "uint trace")
        if isinstance(literal, AssemblyError):
            return literal
        return f"uint256({literal})"
    if typ.startswith("int"):
        if not _NUMERIC_LITERAL.fullmatch(text):
            return AssemblyError(f"coverage prefix bad int trace literal: {raw!r}")
        return f"uint256(int256({text}))"
    if typ == "address":
        if low == "__self":
            return "uint256(uint160(address(this)))"
        literal = _require_uint_literal(text, "address trace")
        if isinstance(literal, AssemblyError):
            return literal
        return f"uint256({literal})"
    if re.fullmatch(r"bytes(?:[1-9]|[12][0-9]|3[0-2])", typ):
        literal = _require_uint_literal(text, "fixed-bytes trace")
        if isinstance(literal, AssemblyError):
            return literal
        return f"uint256({literal})"
    return AssemblyError(f"coverage prefix unsupported trace argument type: {ptype}")


def _trace_replay_projectable(fn: FuncSig) -> bool:
    for arg_index, (ptype, _name) in enumerate(fn.params):
        value_type, value_name = _scalarized_param_value(ptype, arg_index)
        if _witness_uint_projection(value_type, value_name) is None:
            return False
    return True


def _is_address_like(ptype: str) -> bool:
    return (ptype or "").strip().split()[0:1] == ["address"]


def _rejecting_callee_expr(ptype: str) -> str:
    if "payable" in (ptype or "").split():
        return "payable(address(__invmut_reject))"
    return "address(__invmut_reject)"


def _witness_capture(fn: FuncSig, *, include_value: bool = False,
                     getter_params: list[dict] | None = None) -> tuple[list[str], str, list[str]]:
    """Storage witness fields + assignments for CE-oracle recovery.

    When R2 harvesting enables this instrumentation, bind elementary boundary parameters, payable
    `__v`, and state getter keys into Harness storage fields named `__invmut_arg*`,
    `__invmut_value`, and `__invmut_key*`.  They are also referenced in self-equality conjuncts of
    the differential assert.  The conjuncts do not change the P/M property, but keep the fields live
    in ESBMC's failing trace.
    """
    fields: list[str] = []
    lines: list[str] = []
    terms: list[str] = []
    if include_value:
        fields.append("    uint256 __invmut_value;")
        lines.append("        __invmut_value = __v;")
        terms.append("__invmut_value == __invmut_value")
    for i, (ptype, _name) in enumerate(fn.params):
        vtype, vname = _scalarized_param_value(ptype, i)
        proj = _witness_numeric_projection(vtype, vname)
        if proj is not None:
            field_type, expr = proj
            fields.append(f"    {field_type} __invmut_arg{i};")
            lines.append(f"        __invmut_arg{i} = {expr};")
            terms.append(f"__invmut_arg{i} == __invmut_arg{i}")
    for i, p in enumerate(getter_params or []):
        ptype = str(p.get("type") or "").strip()
        pname = str(p.get("name") or "")
        proj = _witness_numeric_projection(ptype, pname) if ptype and pname else None
        if proj is not None:
            field_type, expr = proj
            fields.append(f"    {field_type} __invmut_key{i};")
            lines.append(f"        __invmut_key{i} = {expr};")
            terms.append(f"__invmut_key{i} == __invmut_key{i}")
    text = "".join(ln + "\n" for ln in lines)
    return fields, text, terms


def _constructor_witness_capture(ctor: FuncSig | None) -> tuple[list[str], list[str], list[str]]:
    """Storage witness fields + assignments for constructor parameters.

    Constructor parameters define the initial state that the R2 CE used for both
    P and M.  Recording their numeric projection lets CE-oracle synthesis rebuild
    a CE-specific single instance instead of relying on an unrelated Foundry
    `setUp()` state.  As with boundary witnesses, the self-equality terms keep
    the fields live without changing the differential property.
    """
    fields: list[str] = []
    lines: list[str] = []
    terms: list[str] = []
    if ctor is None:
        return fields, lines, terms
    projected: list[tuple[int, str, str]] = []
    for i, (ptype, _name) in enumerate(ctor.params):
        proj = _witness_numeric_projection(ptype, f"c{i}")
        if proj is None:
            return [], [], []
        field_type, expr = proj
        projected.append((i, field_type, expr))
    for i, field_type, expr in projected:
        fields.append(f"    {field_type} __invmut_ctor_arg{i};")
        lines.append(f"        __invmut_ctor_arg{i} = {expr};")
        terms.append(f"__invmut_ctor_arg{i} == __invmut_ctor_arg{i}")
    return fields, lines, terms


def _with_witness_terms(base: str, terms: list[str]) -> str:
    # Solidity's `&&` short-circuits left-to-right.  Put witness liveness terms
    # before the differential predicate so a failing base predicate cannot slice
    # away the already-captured CE fields from ESBMC's counterexample.
    return base if not terms else " && ".join([*terms, base])


def _witness_live_copies(
    terms: list[str],
    *,
    assertion_id: str,
    indent: str,
    field_types: dict[str, str] | None = None,
) -> tuple[list[str], list[str]]:
    """Copy storage witness fields into assertion-local variables.

    ESBMC reports local variables in counterexamples more reliably than Harness
    storage fields.  Keep the logical witness term as a self-equality, but make
    the asserted term reference a local copy with a suffix that the parser can
    normalize back to the canonical witness name.
    """
    lines: list[str] = []
    live_terms: list[str] = []
    suffix = f"__live_{assertion_id}"
    field_types = field_types or {}
    for term in terms:
        lhs, sep, rhs = term.partition(" == ")
        if sep and lhs == rhs and lhs.startswith("__invmut_"):
            field_type = field_types.get(lhs)
            if not field_type:
                live_terms.append(term)
                continue
            live = f"{lhs}{suffix}"
            lines.append(f"{indent}{field_type} {live} = {lhs};")
            live_terms.append(f"{live} == {live}")
        else:
            live_terms.append(term)
    return lines, live_terms


def _witness_field_types(fields: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for field in fields:
        parts = field.strip().removesuffix(";").split()
        if len(parts) == 2 and parts[1].startswith("__invmut_"):
            out[parts[1]] = parts[0]
    return out


def _valid_assertion_id(assertion_id: str) -> bool:
    if not assertion_id:
        return False
    if not (assertion_id[0].isalpha() or assertion_id[0] == "_"):
        return False
    return all(ch.isalnum() or ch == "_" for ch in assertion_id)


def _pack_state_key_witness_capture(
    state_targets: list[tuple[PackedObservation, "HarnessTarget"]],
) -> tuple[list[str], list[str], list[str]] | AssemblyError:
    """Namespaced storage witnesses for local-pack state getter keys.

    A packed boundary can compare several state getters with different key
    vectors.  Canonical `__invmut_key0` would be ambiguous, so each key witness
    is namespaced by the assertion id and later attached only to that assertion.
    """
    fields: list[str] = []
    lines: list[str] = []
    terms: list[str] = []
    for obs, st in state_targets:
        for i, p in enumerate(st.getter_params):
            ptype = str(p.get("type") or "").strip()
            pname = str(p.get("name") or "")
            proj = _witness_numeric_projection(ptype, pname) if ptype and pname else None
            if proj is None:
                return AssemblyError(
                    f"local pack state getter key not witness-projectable: {ptype or '<missing>'}"
                )
            field_type, expr = proj
            field_name = f"__invmut_{obs.assertion_id}_key{i}_w"
            fields.append(f"    {field_type} {field_name};")
            lines.append(f"        {field_name} = {expr};")
            terms.append(f"{field_name} == {field_name}")
    return fields, lines, terms


def _getter_call(side: str, t: HarnessTarget) -> str:
    keys = ", ".join(p["name"] for p in t.getter_params)
    return f"{side}.{t.getter_name}({keys})"


def _key_param_decls(t: HarnessTarget) -> list[str]:
    return [f"{p['type']} {p['name']}" for p in t.getter_params]


def _observer_reader(side: str, t: HarnessTarget) -> Optional[str]:
    """V41 — the during-call reader rd_o(side) for the harness receive() observer
    (diff_harness_algo.tex). Reads the target state FROM `side` keyed on the harness itself
    (`address(this)` — the synchronized single actor that deposits), so a value that exists only
    DURING an external call (reentrancy/CEI) is captured at the re-entrant callback. Returns None when
    the target is not caller-keyed-observable (non-address mapping key / multi-key); then NO observer
    is emitted and R2 keeps the settlement-only comparison (a recall-only scope limit, never a false
    kill)."""
    params = t.getter_params
    if not params:                                              # scalar state var: side.<getter>()
        call = f"{side}.{t.getter_name}()"
    elif len(params) == 1 and params[0].get("type", "").strip().startswith("address"):
        call = f"{side}.{t.getter_name}(address(this))"         # mapping(address=>…) keyed on the actor
    else:
        return None                                             # non-address / multi-key: not v1-observable
    if t.state_components:
        return call                      # tuple read; the caller destructures it per component
    leaf = t.leaf_type or "uint256"
    return call if _is_elementary(leaf) else f"uint256({call})"


def _inject_getter(contract_text: str, t: HarnessTarget) -> str:
    """Insert the symmetric view getter just before the contract's closing brace (Doc 2 §6.6).
    Keys CHAIN as `VAR[k1][k2]` (nested mapping), never comma-joined (codex F3)."""
    idx = "".join(f"[{p['name']}]" for p in t.getter_params)
    body = f"return {t.var_name}{idx};"
    getter = f"    function {t.getter_inject_sig} {{ {body} }}\n"
    cut = contract_text.rfind("}")
    return contract_text[:cut] + getter + contract_text[cut:]


# --- wrapper emit -------------------------------------------------------------------------

def _sync_call_lines(fn: FuncSig, side: str, args: list[str]) -> str:
    if fn.payable:
        return f"{side}.{fn.name}{{value: __v}}({', '.join(args)});"
    return f"{side}.{fn.name}({', '.join(args)});"


def _fixed_sync_call_lines(fn: FuncSig, side: str, args: list[str], value: str) -> str:
    value = str(value).strip()
    if fn.payable and not _is_zero_numeric_literal(value):
        return f"{side}.{fn.name}{{value: {value}}}({', '.join(args)});"
    return f"{side}.{fn.name}({', '.join(args)});"


def _coverage_prefix_entry_map(
    entries: list[FuncSig],
    coverage_prefix: list[CoveragePrefixStep],
) -> list[tuple[int, FuncSig, CoveragePrefixStep]] | AssemblyError:
    out: list[tuple[int, FuncSig, CoveragePrefixStep]] = []
    by_name: dict[str, list[tuple[int, FuncSig]]] = {}
    for idx, fn in enumerate(entries):
        by_name.setdefault(fn.name, []).append((idx, fn))
    for step_index, step in enumerate(coverage_prefix):
        matches = by_name.get(step.function_name) or []
        if not matches:
            return AssemblyError(f"coverage prefix function not found: {step.function_name}")
        if len(matches) > 1:
            return AssemblyError(f"coverage prefix overloaded function unsupported: {step.function_name}")
        idx, fn = matches[0]
        if step.caller is not None:
            return AssemblyError(f"coverage prefix caller context unsupported: {step.function_name}")
        if step.expected_reverted:
            return AssemblyError(f"coverage prefix reverted setup unsupported: {step.function_name}")
        if len(step.args) != len(fn.params):
            return AssemblyError(f"coverage prefix arity mismatch at step {step_index}: {step.function_name}")
        value = _require_uint_literal(step.value, "call value")
        if isinstance(value, AssemblyError):
            return value
        if not fn.payable and not _is_zero_numeric_literal(value):
            return AssemblyError(f"coverage prefix nonpayable call has value: {step.function_name}")
        if not _trace_replay_projectable(fn):
            return AssemblyError(f"coverage prefix trace not replay-projectable: {step.function_name}")
        out.append((idx, fn, step))
    return out


def _coverage_prefix_total_value(coverage_prefix: list[CoveragePrefixStep]) -> int:
    total = 0
    for step in coverage_prefix:
        raw = str(step.value).strip()
        total += int(raw, 16) if raw.lower().startswith("0x") else int(raw or "0", 10)
    return total


def _coverage_prefix_lines(
    prefix_entries: list[tuple[int, FuncSig, CoveragePrefixStep]],
) -> str | AssemblyError:
    lines: list[str] = []
    for step_index, (entry_index, fn, step) in enumerate(prefix_entries):
        call_args: list[str] = []
        for arg_index, ((ptype, _name), raw) in enumerate(zip(fn.params, step.args)):
            scalar_name = f"__invmut_prefix{step_index}_arg{arg_index}"
            elem = _dyn_array_elem(ptype)
            if elem is not None:
                lit = _fixed_literal_for_type(elem, raw)
                if isinstance(lit, AssemblyError):
                    return lit
                lines.append(f"        {elem} {scalar_name}_e = {lit};")
                lines.append(f"        {elem}[] memory {scalar_name} = new {elem}[](1);")
                lines.append(f"        {scalar_name}[0] = {scalar_name}_e;")
                call_args.append(scalar_name)
            elif _dyn_bytes_elem(ptype) is not None:
                lit = _fixed_literal_for_type("uint8", raw)
                if isinstance(lit, AssemblyError):
                    return lit
                lines.append(f"        uint8 {scalar_name}_e = uint8({lit});")
                lines.append(f"        bytes memory {scalar_name} = new bytes(1);")
                lines.append(f"        {scalar_name}[0] = bytes1({scalar_name}_e);")
                call_args.append(scalar_name)
            else:
                lit = _fixed_literal_for_type(ptype, raw)
                if isinstance(lit, AssemblyError):
                    return lit
                call_args.append(lit)
        trace_value = _require_uint_literal(step.value, "trace value")
        if isinstance(trace_value, AssemblyError):
            return trace_value
        lines.append(f"        if (__invmut_trace_len == {step_index}) {{")
        lines.append(f"            __invmut_step{step_index}_fn = {entry_index + 1};")
        lines.append(f"            __invmut_step{step_index}_argc = {len(fn.params)};")
        lines.append(f"            __invmut_step{step_index}_value = {trace_value};")
        lines.append("            __invmut_step{0}_supported = 1;".format(step_index))
        for arg_index, ((ptype, _name), raw) in enumerate(zip(fn.params, step.args)):
            elem = _dyn_array_elem(ptype)
            value_type = elem if elem is not None else ("uint8" if _dyn_bytes_elem(ptype) is not None else ptype)
            projection = _fixed_uint_projection_for_type(value_type, raw)
            if isinstance(projection, AssemblyError):
                return projection
            lines.append(f"            __invmut_step{step_index}_arg{arg_index} = {projection};")
        lines.append("        }")
        lines.append(f"        if (__invmut_trace_len >= {step_index + 1}) __invmut_trace_overflow = 1;")
        lines.append("        __invmut_trace_len += 1;")
        lines.append(f"        {_fixed_sync_call_lines(fn, 'p', call_args, step.value)} bool __invmut_prefix{step_index}_revP = __ESBMC_reverted();")
        lines.append(f"        __ESBMC_assume(!__invmut_prefix{step_index}_revP);")
        lines.append(f"        {_fixed_sync_call_lines(fn, 'm', call_args, step.value)} bool __invmut_prefix{step_index}_revM = __ESBMC_reverted();")
        lines.append(f"        __ESBMC_assume(!__invmut_prefix{step_index}_revM);")
    return "".join(line + "\n" for line in lines)


def _failing_callee_override_lines(fn: FuncSig, arg_indices: list[int] | None) -> list[str] | AssemblyError:
    """Force selected address/address[] boundary args to a deterministic rejecting callee.

    This is opt-in for unchecked-low-level rescue.  The static caller must prove
    the selected argument is the low-level call target; this helper only checks
    that the wrapper can safely override that ABI position.
    """
    if not arg_indices:
        return []
    lines: list[str] = []
    seen: set[int] = set()
    for idx in arg_indices:
        if idx in seen:
            continue
        seen.add(idx)
        if idx < 0 or idx >= len(fn.params):
            return AssemblyError(f"failing-callee argument index out of range: {idx}")
        ptype = fn.params[idx][0]
        elem = _dyn_array_elem(ptype)
        arg_name = f"a{idx}"
        if elem is not None:
            if not _is_address_like(elem):
                return AssemblyError(f"failing-callee array argument is not address-typed: {ptype}")
            lines.append(f"        {arg_name}[0] = {_rejecting_callee_expr(elem)};")
            continue
        if not _is_address_like(ptype):
            return AssemblyError(f"failing-callee argument is not address-typed: {ptype}")
        lines.append(f"        {arg_name} = {_rejecting_callee_expr(ptype)};")
    return lines


def _balance_pre_line(record: bool, side: str) -> str:
    """This side's ether position BEFORE its call."""
    if not record:
        return ""
    return f"        uint256 __invmut_bal0{side.upper()} = address({side}).balance;\n"


def _balance_post_line(record: bool, side: str) -> str:
    """This side's ether DELTA across its call, as a named local.

    A delta, not the absolute balance: MEASURED (2026-09-20, esbmc 8.2.0, probe `balprobe/bal3.sol`)
    that ESBMC gives `p` and `m` independent unconstrained balances, so comparing the absolute values
    reports a difference for two IDENTICAL contracts. The delta cancels the two independent starting
    points. `unchecked` because a side that pays out more than it takes in wraps, and two equal true
    deltas wrap to the same value.

    Named local, not a storage witness field: a field kept alive only by a self-equality term is
    removed by the slicer ("removed 246 assignments") and never reaches the counterexample, so
    recording a balance that way records nothing. The value has to enter the verification condition.
    """
    if not record:
        return ""
    s = side.upper()
    return (f"        uint256 __invmut_bal{s}; "
            f"unchecked {{ __invmut_bal{s} = address({side}).balance - __invmut_bal0{s}; }}\n")


def _balance_diff_term(record: bool) -> list[str]:
    """`balP == balM` as part of the differential predicate.

    OFF, and it should stay off. The intent was to see a mutant whose only effect is where the ether
    ends up -- a dropped `require(success)`, a CEI reorder, a changed refund -- which leaves the target
    state variable equal on both sides and is invisible to `vP == vM` alone. MEASURED (2026-09-20,
    esbmc 8.2.0, probes `balprobe/bal.sol`..`bal7.sol`) that ESBMC's solidity frontend leaves
    `address(x).balance` an unconstrained constant and does not update it on a `{value: v}` call:
    comparing the absolute values reports a difference between two IDENTICAL contracts, and comparing
    the deltas reports none between two contracts that DO move different amounts. There is no ether
    information in an R2 counterexample to state, so this cannot be the widened oracle.
    """
    return ["__invmut_balP == __invmut_balM"] if record else []


def _wide_observation_parts(
    extra: list[HarnessTarget] | None,
    current: HarnessTarget,
) -> tuple[str, list[str]]:
    """Read the contract's OTHER public scalar state on both sides and compare them too.

    The R2 predicate binds one scalar (or one revert bit). A replay built from it therefore states one
    scalar, and a defect whose effect lands in a different variable of the same contract passes it.
    Widening the predicate is the only way to widen the replay: MEASURED that a value which does not
    enter the verification condition is removed by the slicer and never reaches the counterexample, so
    recording without comparing buys nothing.

    Scalars only (no mapping keys): a key would have to be witnessed too, and the point here is cheap
    extra observables. The variable NAME travels in the local's name (`__invmut_x<getter>_vP`), so the
    replay can state each one without any extra plumbing.
    """
    if not extra:
        return "", []
    lines: list[str] = []
    terms: list[str] = []
    seen: set[str] = set()
    for t in extra:
        name = t.getter_name or ""
        if (t.category != "state" or t.getter_params or not name or name in seen
                or name == current.getter_name or t.needs_getter_injection
                or not re.fullmatch(r"[A-Za-z_]\w*", name)):
            continue
        leaf = t.leaf_type or ""
        # uint only: the replay states these with a `uint256(...)` cast, which Solidity 0.8 allows for
        # any uint width and for nothing else. A wider alphabet would need a per-type projection and
        # buys little -- the scalars that carry a defect's effect are counters and balances.
        if not re.fullmatch(r"uint\d*", leaf):
            continue
        seen.add(name)
        lines.append(f"        {leaf} __invmut_x{name}_vP = p.{name}();")
        lines.append(f"        {leaf} __invmut_x{name}_vM = m.{name}();")
        terms.append(f"__invmut_x{name}_vP == __invmut_x{name}_vM")
        if len(seen) >= _WIDE_OBSERVATION_CAP:
            break
    return "".join(ln + "\n" for ln in lines), terms


def _plain_wrapper(idx: int, fn: FuncSig, trace_slots: int = 0) -> str:
    decls, args, prelude = _wrapper_params(fn)
    pay = ""
    if fn.payable:
        decls = ["uint256 __v", *decls]
        pay = " payable"
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    lines = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        lines += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    lines += "".join(line + "\n" for line in _bounded_trace_capture_lines(idx, fn, trace_slots))
    lines += f"        {_sync_call_lines(fn, 'p', args)}\n"
    lines += f"        {_sync_call_lines(fn, 'm', args)}\n"
    return head + lines + "    }\n"


def _state_boundary_wrapper(idx: int, fn: FuncSig, t: HarnessTarget, emit_observer: bool,
                            record_witness_values: bool = False,
                            extra_witness_terms: list[str] | None = None,
                            trace_slots: int = 0,
                            record_post_balance: bool = False,
                            wide: tuple[str, list[str]] = ("", []),
                             witness_field_types: dict[str, str] | None = None) -> str:
    decls, args, prelude = _wrapper_params(fn)
    if fn.payable:
        decls = ["uint256 __v", *decls]
    decls = [*decls, *_key_param_decls(t)]   # extra nondet key/index params for the getter
    pay = " payable" if fn.payable else ""
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    body += "".join(line + "\n" for line in _bounded_trace_capture_lines(idx, fn, trace_slots))
    witness_terms: list[str] = list(extra_witness_terms or [])
    if record_witness_values:
        _fields, cap, boundary_terms = _witness_capture(fn, include_value=fn.payable,
                                                        getter_params=t.getter_params)
        body += cap
        witness_terms.extend(boundary_terms)
    # V18: drive each side, require it completed, only then compare state. The observed values
    # are bound to NAMED locals so the ESBMC counterexample prints them with clean source names
    # (DEVIATIONS V21 — the dispatcher does not surface raw params, but named locals it does).
    leaf = t.leaf_type or "uint256"
    # enum leaves are cast to uint256 (their named type differs between C_ref and C_mut).
    decl_type = leaf if _is_elementary(leaf) else "uint256"
    if emit_observer:
        # V41: tag which copy is being driven right before each hand-off, so the receive() observer can
        # route the during-call snapshot — under ESBMC the re-entrant msg.sender is the dispatch
        # singleton (unnameable), NOT address(p)/address(m), so sender-routing (tex (S2)) is replaced by
        # this driver-set flag (validated by regression diff_reentrancy_M1_cei_observer_fail). The single
        # assert compares the during-call snapshot AND the settlement value: snap stays at its zero-init
        # sentinel when no copy re-enters, so non-reentrant state diffs are caught exactly as before.
        body += _balance_pre_line(record_post_balance, "p")
        body += f"        __invmut_which = 1; {_sync_call_lines(fn, 'p', args)} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "p")
        body += _balance_pre_line(record_post_balance, "m")
        body += f"        __invmut_which = 2; {_sync_call_lines(fn, 'm', args)} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "m")
        body += "        __invmut_which = 0;\n"
        obs_lines, obs_term = _state_observation(t, "        ")
        body += obs_lines
        body += wide[0]
        expr = _with_witness_terms(
            " && ".join([_snap_equality(t), obs_term,
                         *_balance_diff_term(record_post_balance), *wide[1]]),
            witness_terms)
        body += f"        assert({expr});\n"
    else:
        body += _balance_pre_line(record_post_balance, "p")
        body += f"        {_sync_call_lines(fn, 'p', args)} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "p")
        body += _balance_pre_line(record_post_balance, "m")
        body += f"        {_sync_call_lines(fn, 'm', args)} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "m")
        obs_lines, obs_term = _state_observation(t, "        ")
        body += obs_lines
        body += wide[0]
        live_lines, live_terms = _witness_live_copies(
            witness_terms, assertion_id=f"w{idx}", indent="        ", field_types=witness_field_types)
        body += "".join(line + "\n" for line in live_lines)
        expr = _with_witness_terms(
            " && ".join([obs_term, *_balance_diff_term(record_post_balance),
                         *wide[1]]),
            live_terms)
        body += f"        assert({expr});\n"
    return head + body + "    }\n"


def _return_boundary_wrapper(idx: int, fn: FuncSig, t: HarnessTarget,
                             record_witness_values: bool = False,
                             extra_witness_terms: list[str] | None = None,
                             trace_slots: int = 0,
                             record_post_balance: bool = False,
                             wide: tuple[str, list[str]] = ("", []),
                             witness_field_types: dict[str, str] | None = None) -> str:
    decls, args, prelude = _wrapper_params(fn)
    pay = ""
    if fn.payable:
        decls = ["uint256 __v", *decls]
        pay = " payable"
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    body += "".join(line + "\n" for line in _bounded_trace_capture_lines(idx, fn, trace_slots))
    witness_terms: list[str] = list(extra_witness_terms or [])
    if record_witness_values:
        _fields, cap, boundary_terms = _witness_capture(fn, include_value=fn.payable)
        body += cap
        witness_terms.extend(boundary_terms)
    # named locals __invmut_vP/__invmut_vM so the counterexample prints the returned values (V21).
    rts = t.return_types
    if len(rts) == 1:
        cp = f"{rts[0]} __invmut_vP = {_sync_ret('p', fn, args)}"
        cm = f"{rts[0]} __invmut_vM = {_sync_ret('m', fn, args)}"
        body += _balance_pre_line(record_post_balance, "p")
        body += f"        {cp} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "p")
        body += _balance_pre_line(record_post_balance, "m")
        body += f"        {cm} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "m")
        body += wide[0]
        live_lines, live_terms = _witness_live_copies(
            witness_terms, assertion_id=f"w{idx}", indent="        ", field_types=witness_field_types)
        body += "".join(line + "\n" for line in live_lines)
        expr = _with_witness_terms(
            " && ".join(["__invmut_vP == __invmut_vM", *_balance_diff_term(record_post_balance),
                         *wide[1]]),
            live_terms)
        body += f"        assert({expr});\n"
    else:
        pvars = ", ".join(f"{rt} __invmut_vP{i}" for i, rt in enumerate(rts))
        mvars = ", ".join(f"{rt} __invmut_vM{i}" for i, rt in enumerate(rts))
        body += _balance_pre_line(record_post_balance, "p")
        body += f"        ({pvars}) = {_sync_ret('p', fn, args)} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "p")
        body += _balance_pre_line(record_post_balance, "m")
        body += f"        ({mvars}) = {_sync_ret('m', fn, args)} __ESBMC_assume(!__ESBMC_reverted());\n"
        body += _balance_post_line(record_post_balance, "m")
        body += wide[0]
        live_lines, live_terms = _witness_live_copies(
            witness_terms, assertion_id=f"w{idx}", indent="        ", field_types=witness_field_types)
        body += "".join(line + "\n" for line in live_lines)
        for i in range(len(rts)):
            expr = _with_witness_terms(
                " && ".join([f"__invmut_vP{i} == __invmut_vM{i}",
                             *_balance_diff_term(record_post_balance), *wide[1]]),
                live_terms)
            body += f"        assert({expr});\n"
    return head + body + "    }\n"


def _sync_ret(side: str, fn: FuncSig, args: list[str]) -> str:
    if fn.payable:
        return f"{side}.{fn.name}{{value: __v}}({', '.join(args)});"
    return f"{side}.{fn.name}({', '.join(args)});"


def _revert_boundary_wrapper(idx: int, fn: FuncSig, t: HarnessTarget,
                             record_witness_values: bool = False,
                             extra_witness_terms: list[str] | None = None,
                             trace_slots: int = 0,
                             record_post_balance: bool = False,
                             wide: tuple[str, list[str]] = ("", []),
                             witness_field_types: dict[str, str] | None = None) -> str:
    decls, args, prelude = _wrapper_params(fn)
    pay = ""
    if fn.payable:
        decls = ["uint256 __v", *decls]
        pay = " payable"
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    body += "".join(line + "\n" for line in _bounded_trace_capture_lines(idx, fn, trace_slots))
    witness_terms: list[str] = list(extra_witness_terms or [])
    if record_witness_values:
        _fields, cap, boundary_terms = _witness_capture(fn, include_value=fn.payable)
        body += cap
        witness_terms.extend(boundary_terms)
    body += _balance_pre_line(record_post_balance, "p")
    body += f"        {_sync_call_lines(fn, 'p', args)} bool __invmut_revP = __ESBMC_reverted();\n"
    body += _balance_post_line(record_post_balance, "p")
    body += _balance_pre_line(record_post_balance, "m")
    body += f"        {_sync_call_lines(fn, 'm', args)} bool __invmut_revM = __ESBMC_reverted();\n"
    body += _balance_post_line(record_post_balance, "m")
    body += wide[0]
    # A raw `x == x` on a HARNESS STORAGE field does not keep that field in the counterexample: it is
    # trivially true and the slicer drops it, so the CE prints an unconstrained value (measured: a CE
    # claiming `b <= a` failed while printing the same call's `__invmut_arg0 = 0`). The local pack
    # already copies each witness field into an assertion-local variable for exactly this reason
    # (`_witness_live_copies`); the plain R2 harness never got that fix. Same treatment here.
    live_lines, live_terms = _witness_live_copies(
        witness_terms, assertion_id=f"w{idx}", indent="        ", field_types=witness_field_types)
    body += "".join(line + "\n" for line in live_lines)
    expr = _with_witness_terms(
        " && ".join(["__invmut_revP == __invmut_revM", *_balance_diff_term(record_post_balance),
                     *wide[1]]),
        live_terms)
    body += f"        assert({expr});\n"
    return head + body + "    }\n"


def _pack_state_target(obs: PackedObservation) -> HarnessTarget | AssemblyError:
    t = obs.target
    if t.category != "state":
        return AssemblyError(f"local pack v1 supports only state observations here: {t.category}")
    if t.needs_getter_injection:
        return AssemblyError("local pack v1 requires an existing public getter")
    if t.state_components:
        return AssemblyError("local pack v1 cannot project a struct-leaf state getter")
    if t.state_kind not in ("scalar", "mapping", "enum"):
        return AssemblyError(f"state projection unsupported in local pack v1: {t.state_kind}")
    if t.leaf_type and not _is_value_type(t.leaf_type):
        return AssemblyError(f"state leaf type not value-typed in local pack v1: {t.leaf_type}")
    params = []
    for i, p in enumerate(t.getter_params):
        params.append({**p, "name": f"__invmut_{obs.assertion_id}_key{i}"})
    return replace(t, getter_params=params)


def _pack_return_target(obs: PackedObservation) -> HarnessTarget | AssemblyError:
    t = obs.target
    if t.category != "return":
        return AssemblyError(f"local pack v1 supports only return observations here: {t.category}")
    if len(t.return_types) != 1:
        return AssemblyError(f"local pack multi-return unsupported in v1: {t.return_types}")
    if t.return_projection == "address":
        return t
    if t.return_projection == "struct_fields":
        if not t.return_components:
            return AssemblyError("local pack struct return projection has no components")
        return t
    if t.return_projection == "array_len_first":
        if len(t.return_components) < 2:
            return AssemblyError("local pack array return projection has no length/first components")
        return t
    if t.return_projection != "direct":
        return AssemblyError(f"local pack unknown return projection: {t.return_projection}")
    if not _is_elementary(t.return_types[0]):
        return AssemblyError(f"local pack return type not elementary-value-typed in v1: {t.return_types}")
    return t


def _pack_return_equality(left: str, right: str, target: HarnessTarget) -> str:
    if target.return_projection == "address":
        return f"address({left}) == address({right})"
    return f"{left} == {right}"


def _return_local_type(target: HarnessTarget) -> str:
    typ = target.return_types[0]
    if target.return_projection in {"struct_fields", "array_len_first"} and not any(
        token in typ.split() for token in ("memory", "calldata", "storage")
    ):
        return f"{typ} memory"
    return typ


def _return_component_access(base: str, component: dict) -> str:
    path = component.get("path")
    if not isinstance(path, list) or not path:
        path = [component.get("name")]
    expr = base
    for field in path:
        expr += f".{field}"
    return expr


def _project_value_expr(expr: str, component: dict) -> str | AssemblyError:
    projection = str(component.get("projection") or "identity")
    if projection == "uint":
        return f"uint256({expr})"
    if projection == "int":
        return f"int256({expr})"
    if projection == "bool":
        return f"({expr} ? 1 : 0)"
    if projection == "address":
        return f"uint256(uint160(address({expr})))"
    if projection == "enum":
        return f"uint256({expr})"
    if projection == "bytes":
        width = int(component.get("bytes_width") or 0)
        if width == 32:
            return f"uint256({expr})"
        if 1 <= width < 32:
            return f"uint256(uint{width * 8}({expr}))"
        return AssemblyError("bad fixed-bytes return component width")
    if projection.startswith("udt_"):
        unwrap_type = str(component.get("unwrap_type") or "")
        if not unwrap_type:
            return AssemblyError("missing return component unwrap type")
        unwrapped = f"{unwrap_type}.unwrap({expr})"
        if projection == "udt_uint":
            return f"uint256({unwrapped})"
        if projection == "udt_int":
            return f"int256({unwrapped})"
        if projection == "udt_address":
            return f"uint256(uint160(address({unwrapped})))"
        if projection == "udt_bytes":
            width = int(component.get("bytes_width") or 0)
            if width == 32:
                return f"uint256({unwrapped})"
            if 1 <= width < 32:
                return f"uint256(uint{width * 8}({unwrapped}))"
            return AssemblyError("bad fixed-bytes UDT return component width")
    if projection == "identity":
        return expr
    return AssemblyError(f"unsupported return component projection: {projection}")


def _project_return_component(base: str, component: dict) -> str | AssemblyError:
    return _project_value_expr(_return_component_access(base, component), component)


def _local_pack_boundary_wrapper(
    idx: int,
    fn: FuncSig,
    observations: list[PackedObservation],
    *,
    record_witness_values: bool = False,
    extra_witness_terms: list[str] | None = None,
    witness_field_types: dict[str, str] | None = None,
    failing_callee_arg_indices: list[int] | None = None,
    trace_slots: int = 0,
    coverage_prefix_entries: list[tuple[int, FuncSig, CoveragePrefixStep]] | None = None,
    coverage_prefix_total_value: int = 0,
    reachability_probe: bool = False,
    probe_struct_getters: list[dict] | None = None,
    region_check: dict | None = None,
    observer_state: HarnessTarget | None = None,
) -> str | AssemblyError:
    if not observations:
        return AssemblyError("local pack requires at least one observation")
    seen: set[str] = set()
    for obs in observations:
        if not _valid_assertion_id(obs.assertion_id):
            return AssemblyError(f"invalid local-pack assertion id: {obs.assertion_id!r}")
        if obs.assertion_id in seen:
            return AssemblyError(f"duplicate local-pack assertion id: {obs.assertion_id}")
        seen.add(obs.assertion_id)

    state_targets: list[tuple[PackedObservation, HarnessTarget]] = []
    return_targets: list[tuple[PackedObservation, HarnessTarget]] = []
    include_revert = False
    for obs in observations:
        t = obs.target
        if t.category == "revert":
            if t.fn_name != fn.name:
                return AssemblyError("local pack revert observation must match the packed boundary")
            include_revert = True
        elif t.category == "return":
            if t.fn_name != fn.name:
                return AssemblyError("local pack return observation must match the packed boundary")
            rt = _pack_return_target(obs)
            if isinstance(rt, AssemblyError):
                if reachability_probe:
                    continue  # probe: an unsupported return channel is dropped, not fatal
                return rt
            return_targets.append((obs, rt))
        elif t.category == "state":
            st = _pack_state_target(obs)
            if isinstance(st, AssemblyError):
                if reachability_probe:
                    continue
                return st
            state_targets.append((obs, st))
        else:
            return AssemblyError(f"local pack v1 does not mix {t.category} observations")
    if len(return_targets) > 1:
        return AssemblyError("local pack v1 supports at most one return observation per boundary")

    decls, args, prelude = _wrapper_params(fn)
    if fn.payable:
        decls = ["uint256 __v", *decls]
    for _obs, st in state_targets:
        decls.extend(_key_param_decls(st))
    has_coverage_prefix = bool(coverage_prefix_entries)
    pay = " payable" if fn.payable or coverage_prefix_total_value > 0 else ""
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable and coverage_prefix_total_value > 0:
        body += f"        __ESBMC_assume(msg.value >= 2 * (__v + {coverage_prefix_total_value}));\n"
    elif fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    elif coverage_prefix_total_value > 0:
        body += f"        __ESBMC_assume(msg.value >= {2 * coverage_prefix_total_value});\n"
    if has_coverage_prefix:
        body += "        __invmut_trace_len = 0;\n"
        body += "        __invmut_trace_overflow = 0;\n"
        prefix_body = _coverage_prefix_lines(coverage_prefix_entries or [])
        if isinstance(prefix_body, AssemblyError):
            return prefix_body
        body += prefix_body
    failing_callee_lines = _failing_callee_override_lines(fn, failing_callee_arg_indices)
    if isinstance(failing_callee_lines, AssemblyError):
        return failing_callee_lines
    body += "".join(ln + "\n" for ln in failing_callee_lines)
    body += "".join(line + "\n" for line in _bounded_trace_capture_lines(idx, fn, trace_slots))
    witness_terms: list[str] = list(extra_witness_terms or [])
    if record_witness_values:
        _fields, cap, boundary_terms = _witness_capture(fn, include_value=fn.payable)
        body += cap
        witness_terms.extend(boundary_terms)
        key_witness = _pack_state_key_witness_capture(state_targets)
        if isinstance(key_witness, AssemblyError):
            return key_witness
        _key_fields, key_lines, key_terms = key_witness
        body += "".join(ln + "\n" for ln in key_lines)
        witness_terms.extend(key_terms)

    if region_check is not None:
        # P-only CERTIFIED-REGION query (VeriPUT-style input generalization).
        # Boundary args are nondet, constrained to the candidate box; fixed
        # (non-widened) dimensions are pinned to the witness value.  The wrapper
        # asserts the expected boundary outcome over the whole box, so
        # VERIFICATION SUCCESSFUL certifies: every admitted input produces the
        # same observable outcome on P.  The mutant instance is never driven.
        expected_revert = bool(region_check.get("expected_revert"))
        for bound in region_check.get("arg_bounds") or []:
            arg_index = int(bound["index"])
            if arg_index < 0 or arg_index >= len(args):
                return AssemblyError(f"region_check arg index out of range: {arg_index}")
            name = str(bound.get("param") or f"a{arg_index}")
            if "fixed" in bound:
                body += f"        __ESBMC_assume({name} == {bound['fixed']});\n"
            else:
                body += f"        __ESBMC_assume({name} >= {bound['lo']} && {name} <= {bound['hi']});\n"
        vb = region_check.get("value_bounds")
        if vb is not None:
            if not fn.payable:
                return AssemblyError("region_check value bounds on nonpayable boundary")
            if "fixed" in vb:
                body += f"        __ESBMC_assume(__v == {vb['fixed']});\n"
            else:
                body += f"        __ESBMC_assume(__v >= {vb['lo']} && __v <= {vb['hi']});\n"
        body += f"        {_sync_call_lines(fn, 'p', args)} bool __invmut_revP = __ESBMC_reverted();\n"
        body += f"        assert({'__invmut_revP' if expected_revert else '!__invmut_revP'});\n"
        return head + body + "    }\n"

    if reachability_probe:
        # P-only EFFECTFUL-reachability query (coverage-prefix generation).  A plain
        # success CE is usually the zero-effect shortest run, which adds no coverage.
        # Instead the probe asserts that no run exists in which the boundary call
        # COMPLETES on P *and* produces an observable effect: a watched state target
        # changes across the call, or a watched return value is nonzero.  The CE of
        # that assertion is a synchronized, state-establishing call sequence in exact
        # harness caller semantics; the bounded trace capture above records it.
        # The mutant instance stays deployed but the boundary drives P only.
        # The boundary's own msg.value is deliberately left free: watched effects
        # are getter-based (state/struct-member/return), so a bare value receipt
        # cannot fire them, while deposit-style boundaries legitimately need value
        # to produce their state effect.
        effect_terms: list[str] = []
        pre_lines = ""
        probe_post_lines = ""
        # NOTE: no Ether-balance effect channel here — under V15 `address(x).balance`
        # reads are havoc'd, so a pre/post balance comparison fires spuriously.
        # Public struct-mapping auto-getters (probe-only effect channel): read the
        # harness-keyed entry's elementary members before/after the boundary call.
        for sm_index, getter in enumerate(probe_struct_getters or []):
            name = str(getter.get("getter_name") or "")
            member_types = [str(t) for t in getter.get("member_types") or []]
            if not name or not member_types:
                continue
            pre_names = [f"__invmut_probe_sm{sm_index}_pre{j}" for j in range(len(member_types))]
            post_names = [f"__invmut_probe_sm{sm_index}_post{j}" for j in range(len(member_types))]
            def _destructure(var_names: list[str]) -> str:
                if len(var_names) == 1:
                    return f"        {member_types[0]} {var_names[0]} = p.{name}(address(this));\n"
                decls_txt = ", ".join(f"{t} {v}" for t, v in zip(member_types, var_names))
                return f"        ({decls_txt}) = p.{name}(address(this));\n"
            pre_lines += _destructure(pre_names)
            probe_post_lines += _destructure(post_names)
            for j in range(len(member_types)):
                effect_terms.append(f"{pre_names[j]} == {post_names[j]}")
        for probe_index, (_obs, st) in enumerate(state_targets):
            leaf = st.leaf_type or "uint256"
            decl_type = leaf if _is_elementary(leaf) else "uint256"
            pre_lines += f"        {decl_type} __invmut_probe_pre{probe_index} = {_cast_getter('p', st)};\n"
            effect_terms.append(f"__invmut_probe_pre{probe_index} == {_cast_getter('p', st)}")
        body += pre_lines
        if return_targets and return_targets[0][1].return_projection == "direct":
            rt = return_targets[0][1]
            return_type = _return_local_type(rt)
            body += f"        {return_type} __invmut_probe_ret = {_sync_ret('p', fn, args)} bool __invmut_revP = __ESBMC_reverted();\n"
            zero = "address(0)" if rt.return_projection == "address" or return_type == "address" else (
                "false" if return_type == "bool" else f"{return_type}(0)"
            )
            effect_terms.append(f"__invmut_probe_ret == {zero}")
        else:
            body += f"        {_sync_call_lines(fn, 'p', args)} bool __invmut_revP = __ESBMC_reverted();\n"
        body += probe_post_lines
        if effect_terms:
            no_effect = " && ".join(effect_terms)
            body += f"        assert(__invmut_revP || ({no_effect}));\n"
        else:
            body += "        assert(__invmut_revP);\n"
        return head + body + "    }\n"

    observer_on = observer_state is not None
    if return_targets:
        return_type = _return_local_type(return_targets[0][1])
        if observer_on:
            body += "        __invmut_which = 1;\n"
        body += f"        {return_type} __invmut_return_vP = {_sync_ret('p', fn, args)} bool __invmut_revP = __ESBMC_reverted();\n"
        if observer_on:
            body += "        __invmut_which = 2;\n"
        body += f"        {return_type} __invmut_return_vM = {_sync_ret('m', fn, args)} bool __invmut_revM = __ESBMC_reverted();\n"
    else:
        if observer_on:
            body += "        __invmut_which = 1;\n"
        body += f"        {_sync_call_lines(fn, 'p', args)} bool __invmut_revP = __ESBMC_reverted();\n"
        if observer_on:
            body += "        __invmut_which = 2;\n"
        body += f"        {_sync_call_lines(fn, 'm', args)} bool __invmut_revM = __ESBMC_reverted();\n"
    if observer_on:
        body += "        __invmut_which = 0;\n"
    if include_revert:
        rev_obs = next(obs for obs in observations if obs.target.category == "revert")
        rev_base = "(__invmut_revP == __invmut_revM)"
        if observer_on:
            # V41 during-call observer: snap fields keep their zero-init
            # sentinel unless a copy re-enters the harness, so this term is
            # inert for non-reentrant runs and catches CEI/mutex divergence.
            rev_base += " && __invmut_snapP == __invmut_snapM"
        body += (
            f"        bool __invmut_assert_{rev_obs.assertion_id} = "
            f"{rev_base};\n"
        )
        live_lines, live_terms = _witness_live_copies(
            witness_terms,
            assertion_id=rev_obs.assertion_id,
            indent="        ",
            field_types=witness_field_types,
        )
        body += "".join(line + "\n" for line in live_lines)
        body += (
            f"        assert({_with_witness_terms(f'__invmut_assert_{rev_obs.assertion_id}', live_terms)});\n"
        )

    if return_targets:
        body += "        if (!__invmut_revP && !__invmut_revM) {\n"
        for obs, rt in return_targets:
            if rt.return_projection == "struct_fields":
                comparisons: list[str] = []
                for component_index, component in enumerate(rt.return_components):
                    projection_type = str(component.get("projection_type") or "uint256")
                    p_expr = _project_return_component("__invmut_return_vP", component)
                    m_expr = _project_return_component("__invmut_return_vM", component)
                    if isinstance(p_expr, AssemblyError):
                        return p_expr
                    if isinstance(m_expr, AssemblyError):
                        return m_expr
                    p_name = f"__invmut_{obs.assertion_id}_vP{component_index}"
                    m_name = f"__invmut_{obs.assertion_id}_vM{component_index}"
                    body += f"            {projection_type} {p_name} = {p_expr};\n"
                    body += f"            {projection_type} {m_name} = {m_expr};\n"
                    comparisons.append(f"{p_name} == {m_name}")
                base = " && ".join(comparisons)
            elif rt.return_projection == "array_len_first":
                elem_component = rt.return_components[1]
                p_first_expr = _project_value_expr("__invmut_return_vP[0]", elem_component)
                m_first_expr = _project_value_expr("__invmut_return_vM[0]", elem_component)
                if isinstance(p_first_expr, AssemblyError):
                    return p_first_expr
                if isinstance(m_first_expr, AssemblyError):
                    return m_first_expr
                p_len = f"__invmut_{obs.assertion_id}_vP0"
                m_len = f"__invmut_{obs.assertion_id}_vM0"
                p_first = f"__invmut_{obs.assertion_id}_vP1"
                m_first = f"__invmut_{obs.assertion_id}_vM1"
                projection_type = str(elem_component.get("projection_type") or "uint256")
                body += f"            uint256 {p_len} = __invmut_return_vP.length;\n"
                body += f"            uint256 {m_len} = __invmut_return_vM.length;\n"
                body += f"            {projection_type} {p_first} = 0;\n"
                body += f"            {projection_type} {m_first} = 0;\n"
                body += f"            if ({p_len} > 0) {p_first} = {p_first_expr};\n"
                body += f"            if ({m_len} > 0) {m_first} = {m_first_expr};\n"
                base = f"{p_len} == {m_len} && ({p_len} == 0 || {p_first} == {m_first})"
            else:
                return_type = rt.return_types[0]
                body += f"            {return_type} __invmut_{obs.assertion_id}_vP = __invmut_return_vP;\n"
                body += f"            {return_type} __invmut_{obs.assertion_id}_vM = __invmut_return_vM;\n"
                base = _pack_return_equality(
                    f"__invmut_{obs.assertion_id}_vP",
                    f"__invmut_{obs.assertion_id}_vM",
                    rt,
                )
            body += f"            bool __invmut_assert_{obs.assertion_id} = ({base});\n"
            live_lines, live_terms = _witness_live_copies(
                witness_terms,
                assertion_id=obs.assertion_id,
                indent="            ",
                field_types=witness_field_types,
            )
            body += "".join(line + "\n" for line in live_lines)
            body += (
                f"            assert({_with_witness_terms(f'__invmut_assert_{obs.assertion_id}', live_terms)});\n"
            )
        body += "        }\n"

    if state_targets:
        body += "        if (!__invmut_revP && !__invmut_revM) {\n"
        for obs, st in state_targets:
            leaf = st.leaf_type or "uint256"
            decl_type = leaf if _is_elementary(leaf) else "uint256"
            body += f"            {decl_type} __invmut_{obs.assertion_id}_vP = {_cast_getter('p', st)};\n"
            body += f"            {decl_type} __invmut_{obs.assertion_id}_vM = {_cast_getter('m', st)};\n"
            base = f"__invmut_{obs.assertion_id}_vP == __invmut_{obs.assertion_id}_vM"
            if observer_on:
                base += " && __invmut_snapP == __invmut_snapM"
            body += f"            bool __invmut_assert_{obs.assertion_id} = ({base});\n"
            live_lines, live_terms = _witness_live_copies(
                witness_terms,
                assertion_id=obs.assertion_id,
                indent="            ",
                field_types=witness_field_types,
            )
            body += "".join(line + "\n" for line in live_lines)
            body += (
                f"            assert({_with_witness_terms(f'__invmut_assert_{obs.assertion_id}', live_terms)});\n"
            )
        body += "        }\n"
    return head + body + "    }\n"


# --- top-level assembly -------------------------------------------------------------------

def _boundary_names(t: HarnessTarget) -> set[str]:
    """Entry names whose wrapper carries the differential assert. icse.tex:556 — a harness has exactly
    ONE differential assertion, at the selected boundary tb. For a state target that is the single
    selected writer `tb_writer` (stage5_r2 iterates the var's writers, one single-assert harness each);
    for return/revert it is the boundary fn. The `tb_writer`-unset fallback (every writer asserts) is
    kept only for direct/legacy callers — the live pipeline always sets tb_writer."""
    if t.category != "state":
        return {t.fn_name}
    return {t.tb_writer} if t.tb_writer else set(t.writer_names)


def boundary_wrapper_names(parts: AssemblyParts, t: HarnessTarget) -> list[str]:
    """The `s{idx}_<fn>` Harness wrapper names that carry the differential assert — the valid
    `--focus-function` targets for the R2 escalation (FOCUS_FUNCTION_PLAN). Index order matches
    `build_r2_file`'s enumerate over `parts.p_info.entries`, so a name returned here is exactly the
    wrapper emitted in the assembled harness. One per state writer; one for return/revert."""
    bn = _boundary_names(t)
    return [f"s{i}_{fn.name}" for i, fn in enumerate(parts.p_info.entries) if fn.name in bn]


def build_r2_file(parts: AssemblyParts, t: HarnessTarget, *,
                  record_witness_values: bool = False,
                  trace_slot_count: int = _R2_TRACE_SLOTS,
                  record_post_balance: bool = False,
                  extra_observation_targets: list[HarnessTarget] | None = None,
                  witness_live_copies: bool = False) -> str | AssemblyError:
    """Assemble the full x.sol (deps + C_ref + C_mut + Harness). Returns AssemblyError for a
    v1-unsupported projection (array/struct/dynamic leaf or non-value return type)."""
    c_ref, c_mut = parts.c_ref, parts.c_mut

    # validate projectability + inject getter if needed
    if t.category == "state":
        if t.state_kind not in ("scalar", "mapping", "enum"):
            return AssemblyError(f"state projection unsupported in v1: {t.state_kind}")
        # a struct leaf is not itself value-typed; its projectability lives in state_components
        # (every component elementary), checked by Doc 1 before the target is selected.
        if not t.state_components and t.leaf_type and not _is_value_type(t.leaf_type):
            return AssemblyError(f"state leaf type not value-typed: {t.leaf_type}")
        # NOTE (direction-B): select.state_targets() now DROPS private/internal state vars
        # (private_state_not_externally_observable) — observation is public/external only — so the
        # live pipeline no longer emits a `needs_getter_injection` state target. This branch is
        # retained because HarnessTarget can still be constructed directly (tests, external doc1),
        # but it is not reached from a Doc-1 produced by the current selection.
        if t.needs_getter_injection:
            c_ref = _inject_getter(c_ref, t)
            c_mut = _inject_getter(c_mut, t)
    elif t.category == "return":
        # MULTI-RETURN is unsound on this build: ESBMC --bound returns NONDET tuple components for
        # an external call into the two distinct C_ref/C_mut instances, so even IDENTICAL contracts
        # spuriously fail a component-equality assert (ESBMC_FINDINGS F12 / codex). v1 = single
        # return only. Single component must be ELEMENTARY (enum/contract returns need a cast).
        if len(t.return_types) != 1:
            return AssemblyError(f"multi-return tuple unsupported in v1 (ESBMC F12): {t.return_types}")
        if not _is_elementary(t.return_types[0]):
            return AssemblyError(f"return type not elementary-value-typed in v1: {t.return_types}")

    # determine boundary entries
    entries = parts.p_info.entries
    boundary_names = _boundary_names(t)
    boundary_entries = [fn for fn in entries if fn.name in boundary_names]
    # Witness field names are intentionally canonical (`__invmut_arg0`, not wrapper-indexed) so the
    # downstream CE-to-test code can map them back to ABI parameter positions.  Therefore only enable
    # recording in the normal single-boundary harness shape.  Legacy multi-boundary direct callers keep
    # the old semantics and simply omit args/value from the asset.
    record_boundary_witness = record_witness_values and len(boundary_entries) == 1
    witness_fields: list[str] = []
    ctor_witness_fields: list[str] = []
    ctor_witness_lines: list[str] = []
    ctor_witness_terms: list[str] = []
    trace_fields: list[str] = []
    trace_terms: list[str] = []
    trace_slots = 0
    if record_boundary_witness:
        ctor_witness_fields, ctor_witness_lines, ctor_witness_terms = _constructor_witness_capture(
            parts.p_info.constructor
        )
        getter_params = t.getter_params if t.category == "state" else None
        witness_fields, _cap, _terms = _witness_capture(
            boundary_entries[0],
            include_value=boundary_entries[0].payable,
            getter_params=getter_params,
        )
        # Arguments alone do not say WHICH calls, in which order, produced the failing state. Without
        # that sequence a replay has no prefix, and an explicit-revert witness cannot be translated at
        # all -- `witness_trace_from_values` returns complete=False and every renderer refuses. The
        # bounded trace `build_r2_local_pack_file` already records is therefore recorded here too.
        #
        # EVERY dispatch wrapper records its step, including the ones whose parameters do not project
        # to uint256: those write supported=0, so an untranslatable step is VISIBLE in the asset
        # instead of silently vanishing from the sequence. The alphabet is deliberately NOT narrowed
        # (the local pack drops such entries); narrowing it would change the differential question the
        # query asks, and the witness has to come from the same query whose verdict we report.
        trace_slots = max(1, int(trace_slot_count or _R2_TRACE_SLOTS))
        trace_fields, trace_terms = _bounded_trace_schema(entries, trace_slots)

    # V41: the observer receive() is ALWAYS emitted — it is the Ether sink for value the copies send
    # back to H (without it a `withdraw`-style call back to H reverts on BOTH sides and the V18 guard
    # prunes the path, hiding the whole CEI/reentrancy class). For a state focus whose target is
    # caller-keyed-observable it ALSO records the during-call snapshot (routed by __invmut_which);
    # otherwise the body is an inert sink and R2 keeps the settlement-only comparison.
    obs_p = _observer_reader("p", t) if t.category == "state" else None
    obs_m = _observer_reader("m", t) if t.category == "state" else None
    emit_observer = obs_p is not None and obs_m is not None

    wrappers = []  # build_r2_file
    post_balance = bool(record_post_balance)
    bal_fields: list[str] = []
    wide = _wide_observation_parts(extra_observation_targets, t)
    boundary_extra_terms = [*ctor_witness_terms, *trace_terms]
    # Types for the assertion-local witness copies (see _witness_live_copies). Without them the terms
    # stay raw storage self-equalities, which the slicer drops, and the counterexample prints
    # unconstrained witness values. The local pack has always built this map; build_r2_file did not.
    boundary_witness_field_types = _witness_field_types([
        *ctor_witness_fields, *witness_fields, *trace_fields,
    ]) if witness_live_copies else None
    for i, fn in enumerate(entries):
        if fn.name in boundary_names:
            if t.category == "state":
                wrappers.append(_state_boundary_wrapper(i, fn, t, emit_observer,
                                                        record_boundary_witness,
                                                        boundary_extra_terms,
                                                        trace_slots=trace_slots,
                                                        record_post_balance=post_balance,
                                                        wide=wide,
                                                        witness_field_types=boundary_witness_field_types))
            elif t.category == "return":
                wrappers.append(_return_boundary_wrapper(i, fn, t, record_boundary_witness,
                                                        boundary_extra_terms,
                                                        trace_slots=trace_slots,
                                                        record_post_balance=post_balance,
                                                        wide=wide,
                                                        witness_field_types=boundary_witness_field_types))
            else:
                wrappers.append(_revert_boundary_wrapper(i, fn, t, record_boundary_witness,
                                                        boundary_extra_terms,
                                                        trace_slots=trace_slots,
                                                        record_post_balance=post_balance,
                                                        wide=wide,
                                                        witness_field_types=boundary_witness_field_types))
        else:
            wrappers.append(_plain_wrapper(i, fn, trace_slots))

    ctor = _constructor(parts, ctor_witness_lines)
    obs_fields = ""
    obs_body = ""
    if emit_observer:
        comps = list(t.state_components or [])
        if comps:
            # struct leaf: the getter returns a tuple, so snapshot each component into its own
            # field. Destructuring into pre-declared storage fields is done with a parenthesised
            # assignment (no type keywords), which is valid for an lvalue tuple.
            decls = " ".join(f"uint256 __invmut_snapP{c['index']}; uint256 __invmut_snapM{c['index']};"
                             for c in comps)
            obs_fields = f"    uint8 __invmut_which; {decls}\n"
            lhs_p = ", ".join(f"__invmut_snapP{c['index']}" for c in comps)
            lhs_m = ", ".join(f"__invmut_snapM{c['index']}" for c in comps)
            obs_body = (f"        if (__invmut_which == 1) ({lhs_p}) = {obs_p};\n"
                        f"        else if (__invmut_which == 2) ({lhs_m}) = {obs_m};\n")
        else:
            leaf = t.leaf_type or "uint256"
            decl_type = leaf if _is_elementary(leaf) else "uint256"
            obs_fields = (f"    uint8 __invmut_which; "
                          f"{decl_type} __invmut_snapP; {decl_type} __invmut_snapM;\n")
            obs_body = (f"        if (__invmut_which == 1) __invmut_snapP = {obs_p};\n"
                        f"        else if (__invmut_which == 2) __invmut_snapM = {obs_m};\n")
    receive_fn = f"    receive() external payable {{\n{obs_body}    }}\n"
    witness_field_text = "".join(
        field + "\n" for field in [*ctor_witness_fields, *witness_fields, *trace_fields, *bal_fields])
    harness = (
        "contract Harness {\n"
        f"    {parts.ref_name} p; {parts.mut_name} m;\n"
        f"{obs_fields}"
        f"{witness_field_text}"
        "    function __ESBMC_reverted() internal returns (bool) {}\n"
        "    function __ESBMC_assume(bool) internal pure {}\n"
        f"{receive_fn}\n"
        f"{ctor}\n"
        + "\n".join(wrappers)
        + "}\n"
    )
    return f"{parts.deps}\n{c_ref}\n\n{c_mut}\n\n{harness}"


def build_r2_local_pack_file(
    parts: AssemblyParts,
    *,
    boundary_name: str,
    observations: list[PackedObservation],
    boundary_signature: FuncSig | None = None,
    constructor_args: list[str] | None = None,
    record_witness_values: bool = False,
    failing_callee_arg_indices: list[int] | None = None,
    trace_slots: int = 2,
    coverage_prefix: list[CoveragePrefixStep] | None = None,
    reachability_probe: bool = False,
    probe_struct_getters: list[dict] | None = None,
    dependency_fixtures: list[str] | None = None,
    probe_wrapper_allowlist: set[str] | None = None,
    region_check: dict | None = None,
    during_call_observer: bool = False,
) -> str | AssemblyError:
    """Assemble a local R2 multi-property pack for one boundary.

    This is intentionally not wired into `stage5_r2`.  It is the safe building
    block for R2 rescue: one boundary wrapper drives P and M once, then emits
    several named assertions whose IDs can be recovered from a counterexample.
    v1 supports boundary revert equality plus post-call public state getters.
    Return-value and during-call observer packs are left out until their witness
    projection is separately specified.
    """
    entries = list(parts.p_info.entries)
    matches = [(i, fn) for i, fn in enumerate(entries) if fn.name == boundary_name]
    if not matches and boundary_signature is not None:
        if boundary_signature.name != boundary_name or not boundary_signature.is_entry:
            return AssemblyError("local pack inherited boundary signature mismatch")
        entries.append(boundary_signature)
        matches = [(len(entries) - 1, boundary_signature)]
    if trace_slots <= 0:
        return AssemblyError("local pack trace_slots must be positive")
    if not matches:
        return AssemblyError(f"local pack boundary not found: {boundary_name}")
    if len(matches) > 1:
        return AssemblyError(f"local pack overloaded boundary unsupported: {boundary_name}")
    boundary_idx, boundary_fn = matches[0]
    coverage_prefix = list(coverage_prefix or [])
    if reachability_probe and coverage_prefix:
        return AssemblyError("reachability probe cannot take a coverage prefix")
    prefix_entries: list[tuple[int, FuncSig, CoveragePrefixStep]] = []
    prefix_total_value = 0
    if coverage_prefix:
        if not record_witness_values:
            return AssemblyError("coverage prefix requires record_witness_values")
        if trace_slots < len(coverage_prefix) + 1:
            return AssemblyError("coverage prefix does not fit in local pack trace_slots")
        mapped_prefix = _coverage_prefix_entry_map(entries, coverage_prefix)
        if isinstance(mapped_prefix, AssemblyError):
            return mapped_prefix
        prefix_entries = mapped_prefix
        prefix_total_value = _coverage_prefix_total_value(coverage_prefix)
    constructor_params = list(getattr(parts.p_info.constructor, "params", []) or [])
    if constructor_args is not None and len(constructor_args) != len(constructor_params):
        return AssemblyError("local pack fixed constructor fixture arity mismatch")
    if record_witness_values and not _trace_replay_projectable(boundary_fn):
        return AssemblyError(f"local pack boundary trace not replay-projectable: {boundary_name}")

    ctor_witness_fields: list[str] = []
    ctor_witness_lines: list[str] = []
    ctor_witness_terms: list[str] = []
    witness_fields: list[str] = []
    state_key_witness_fields: list[str] = []
    trace_fields: list[str] = []
    trace_terms: list[str] = []
    if record_witness_values and constructor_args is None:
        ctor_witness_fields, ctor_witness_lines, ctor_witness_terms = _constructor_witness_capture(
            parts.p_info.constructor
        )
    if record_witness_values:
        witness_fields, _cap, _terms = _witness_capture(
            boundary_fn,
            include_value=boundary_fn.payable,
        )
        prepared_state_targets: list[tuple[PackedObservation, HarnessTarget]] = []
        for obs in observations:
            if obs.target.category != "state":
                continue
            st = _pack_state_target(obs)
            if isinstance(st, AssemblyError):
                return st
            prepared_state_targets.append((obs, st))
        key_witness = _pack_state_key_witness_capture(prepared_state_targets)
        if isinstance(key_witness, AssemblyError):
            return key_witness
        state_key_witness_fields, _key_lines, _key_terms = key_witness
        trace_entries = [fn for fn in entries if _trace_replay_projectable(fn)]
        trace_fields, trace_terms = _bounded_trace_schema(trace_entries, trace_slots)

    observer_state: HarnessTarget | None = None
    if during_call_observer:
        # V41 in the local pack: the first caller-keyed-observable state
        # observation feeds the during-call snapshot routed by receive().
        for obs in observations:
            if obs.target.category != "state":
                continue
            st_cand = _pack_state_target(obs)
            if isinstance(st_cand, AssemblyError):
                continue
            if _observer_reader("p", st_cand) is not None:
                observer_state = st_cand
                break

    wrappers = []
    for i, fn in enumerate(entries):
        if i == boundary_idx:
            witness_field_type_map = _witness_field_types([
                *ctor_witness_fields,
                *witness_fields,
                *state_key_witness_fields,
                *trace_fields,
            ])
            wrapped = _local_pack_boundary_wrapper(
                i,
                fn,
                observations,
                record_witness_values=record_witness_values,
                extra_witness_terms=[*ctor_witness_terms, *trace_terms],
                witness_field_types=witness_field_type_map,
                failing_callee_arg_indices=failing_callee_arg_indices,
                trace_slots=trace_slots if record_witness_values else 0,
                coverage_prefix_entries=prefix_entries,
                coverage_prefix_total_value=prefix_total_value,
                reachability_probe=reachability_probe,
                probe_struct_getters=probe_struct_getters,
                region_check=region_check,
                observer_state=observer_state,
            )
            if isinstance(wrapped, AssemblyError):
                return wrapped
            wrappers.append(wrapped)
        else:
            if coverage_prefix:
                continue
            if reachability_probe and probe_wrapper_allowlist is not None \
                    and fn.name not in probe_wrapper_allowlist:
                # Probe search-space restriction: only setup functions that can
                # plausibly establish the boundary's guard state get a wrapper.
                continue
            if record_witness_values and not _trace_replay_projectable(fn):
                continue
            wrappers.append(_plain_wrapper(i, fn, trace_slots if record_witness_values else 0))

    witness_field_text = "".join(
        field + "\n" for field in [
            *ctor_witness_fields,
            *witness_fields,
            *state_key_witness_fields,
            *trace_fields,
        ]
    )
    reject_field = "    __InvMutRejectingCallee __invmut_reject;\n" if failing_callee_arg_indices else ""
    reject_init = ["__invmut_reject = new __InvMutRejectingCallee();"] if failing_callee_arg_indices else None
    for dep_index, dep_name in enumerate(dependency_fixtures or []):
        reject_field += f"    {dep_name} __invmut_dep{dep_index};\n"
        reject_init = list(reject_init or [])
        reject_init.append(f"__invmut_dep{dep_index} = new {dep_name}();")
    pack_obs_fields = ""
    pack_obs_body = ""
    if observer_state is not None:
        leaf = observer_state.leaf_type or "uint256"
        decl_type = leaf if _is_elementary(leaf) else "uint256"
        obs_p = _observer_reader("p", observer_state)
        obs_m = _observer_reader("m", observer_state)
        pack_obs_fields = (f"    uint8 __invmut_which; "
                           f"{decl_type} __invmut_snapP; {decl_type} __invmut_snapM;\n")
        pack_obs_body = (f"        if (__invmut_which == 1) __invmut_snapP = {obs_p};\n"
                         f"        else if (__invmut_which == 2) __invmut_snapM = {obs_m};\n")
    harness = (
        "contract Harness {\n"
        f"    {parts.ref_name} p; {parts.mut_name} m;\n"
        f"{pack_obs_fields}"
        f"{reject_field}"
        f"{witness_field_text}"
        "    function __ESBMC_reverted() internal returns (bool) {}\n"
        "    function __ESBMC_assume(bool) internal pure {}\n"
        f"    receive() external payable {{\n{pack_obs_body}    }}\n\n"
        f"{_constructor(parts, ctor_witness_lines, extra_init_lines=reject_init, fixed_args=constructor_args)}\n"
        + "\n".join(wrappers)
        + "}\n"
    )
    rejecting = (
        "\ncontract __InvMutRejectingCallee {\n"
        "    receive() external payable { revert(\"invmut rejecting callee\"); }\n"
        "    fallback() external payable { revert(\"invmut rejecting callee\"); }\n"
        "}\n"
        if failing_callee_arg_indices else ""
    )
    return f"{parts.deps}\n{parts.c_ref}\n\n{parts.c_mut}\n{rejecting}\n{harness}"


def _constructor(
    parts: AssemblyParts,
    witness_lines: list[str] | None = None,
    extra_init_lines: list[str] | None = None,
    fixed_args: list[str] | None = None,
) -> str:
    # V15-sound (DEVIATIONS): the ONLY independent per-side nondet after construction is each
    # instance's initial `$balance` — owner/scalars/mappings are constructor-deterministic and thus
    # equal across the two copies. `new C_ref()` / `new C_mut()` sample each handle's nondet initial
    # `$balance` INDEPENDENTLY (approximation-ledger #24), so a differential assert can be falsified by
    # `p.$balance != m.$balance` BEFORE any call runs — a spurious kill unrelated to the mutation
    # (measured: two BYTE-IDENTICAL contracts FAIL an `address(p).balance == address(m).balance`
    # assert; coupling the two balances here makes that pass). Couple the two initial balances ONCE,
    # at construction, so both sides share the same initial state (the differential precondition).
    # assume-only ⇒ cannot ADD a false kill and cannot HIDE a same-initial-state difference (a diff
    # that needs UNEQUAL starting ETH is an artifact of the harness, not a P-vs-M behavior).
    couple = "__ESBMC_assume(address(p).balance == address(m).balance);"
    ctor = parts.p_info.constructor
    witness_text = " ".join(ln.strip() for ln in (witness_lines or []))
    witness_prefix = (witness_text + " ") if witness_text else ""
    extra_init = " ".join(ln.strip() for ln in (extra_init_lines or []))
    extra_prefix = (extra_init + " ") if extra_init else ""
    if fixed_args is not None:
        args = ", ".join(fixed_args)
        return (
            f"    constructor() {{ p = new {parts.ref_name}({args}); "
            f"m = new {parts.mut_name}({args}); {extra_prefix}{couple} }}"
        )
    if ctor is None or not ctor.params:
        return (f"    constructor() {{ p = new {parts.ref_name}(); "
                f"m = new {parts.mut_name}(); {extra_prefix}{couple} }}")
    decls = ", ".join(f"{pt} c{i}" for i, (pt, _n) in enumerate(ctor.params))
    args = ", ".join(f"c{i}" for i in range(len(ctor.params)))
    return (f"    constructor({decls}) {{ {witness_prefix}p = new {parts.ref_name}({args}); "
            f"m = new {parts.mut_name}({args}); {extra_prefix}{couple} }}")
