"""Doc 2 §9 — clean trace extraction from the ESBMC counterexample.

NEVER hand the raw counterexample to the test agent. We parse the structured `[Counterexample]`
output (verified against the real 8.2.0 binary, NOT the idealized §9.1 layout — under
`--show-funccall-trace` a `Function call trace:` block is interleaved before the claim) and emit a
clean call sequence plus a per-kind observed-difference description.

Default R2 traces expose only observed P/M values.  The CE-oracle recovery mode additionally emits
Harness storage fields named `__invmut_ctor_arg*`, `__invmut_arg*`, `__invmut_value`, and
`__invmut_key*`; when present, we parse them as concrete constructor/boundary
calldata/value/getter-key witnesses."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

_STATE_HDR = re.compile(r"^State \d+(?: file (?P<file>\S+))?(?: line (?P<line>\d+))?"
                        r"(?: column \d+)?(?: function (?P<fn>\S+))?")
_SYNC_WRAPPER = re.compile(r"^s\d+_(?P<entry>\w+)$")
# A `Function call trace:` frame for a Harness sync wrapper: `sol:@C@Harness@F@s2_claim#353 at ...`.
# The State blocks only surface the boundary wrapper that asserts (the state-establishing prefix
# wrappers — deposit, setRewardRate — appear there under their INNER contract-fn name, which does
# NOT match _SYNC_WRAPPER), so call_sequence built from State frames alone truncates to the boundary
# call. The funccall trace is the ONLY place that carries the full ordered wrapper sequence (codex /
# TOD diagnosis: the verifier's distinguishing path deposit->setRewardRate->claim was being dropped).
# Anchor to the `@C@Harness@F@` prefix (codex #6): the sync wrappers live in `contract Harness`
# (constant name). Matching a bare `@F@s\d+_\w+` would also catch a USER function literally named
# `s0_foo` (called inside the boundary), polluting the sequence and mis-picking `seq[-1]` as the
# boundary. The harness contract is always `Harness` (build_r2_command default), so this is exact.
_FUNCCALL_WRAPPER = re.compile(r"@C@Harness@F@(?P<wrap>s\d+_\w+)#\d+")
_COUNTEREXAMPLE = "[Counterexample]"
# the harness binds observed values to these named locals so the counterexample prints them with
# clean source names (DEVIATIONS V21); we read them back here. The RHS must be a LITERAL so the
# `__invmut_vP == __invmut_vM` claim line is never mistaken for an assignment (codex B9).
_OBSERVED = re.compile(
    r"\b(?P<name>__invmut_(?:(?:vP\d*|vM\d*|revP|revM)|"
    r"(?:[A-Za-z_][A-Za-z0-9_]*_(?:vP|vM)\d*)))\s*=\s*"
    r"(?P<val>-?0x[0-9A-Fa-f]+|-?\d+|TRUE|FALSE|true|false)\b"
)
_WITNESS_NAME = (
    # balP/balM: the two sides' ether position, bound by the widened differential predicate
    # (`__invmut_balP == __invmut_balM`). They are named locals like vP/vM, but they belong with the
    # witness rather than the observation -- the replay states them alongside whatever it observes.
    r"__invmut_(?:(?:ctor_arg\d+|arg\d+|key\d+|value|balP|balM)|"
    r"(?:trace_len|trace_overflow|step\d+_(?:fn|argc|value|supported|arg\d+))|"
    r"(?:[A-Za-z_][A-Za-z0-9_]*_key\d+_w))"
    r"(?:__live_[A-Za-z0-9_]+)?"
)
_WITNESS_VALUE = re.compile(rf"\b(?P<name>{_WITNESS_NAME})\s*=\s*"
                            r"(?P<val>-?0x[0-9A-Fa-f]+|-?\d+|TRUE|FALSE|true|false)\b")
_WITNESS_FIELD = re.compile(rf"\.(?P<name>{_WITNESS_NAME})\s*=\s*"
                            r"(?P<val>-?0x[0-9A-Fa-f]+|-?\d+|TRUE|FALSE|true|false)\b")
# V43: the V41 during-call observer fields surface as STRUCT MEMBERS in the ESBMC state dump
# (`.__invmut_snapP=0, .__invmut_snapM=1,`), NOT as the clean named-local `__invmut_vP = 0` form.
# A `snapP != snapM` in the failing state means the difference is observed DURING the boundary's
# external call (CEI/reentrancy), not at settlement (where vP==vM). The test then needs the receive()
# observer shape, not a post-settlement assert.
_SNAP = re.compile(r"\.__invmut_snapP=(?P<p>-?0x[0-9A-Fa-f]+|-?\d+),\s*"
                   r"\.__invmut_snapM=(?P<m>-?0x[0-9A-Fa-f]+|-?\d+)")
# A `--multi-property` run reports whichever property failed FIRST, and that is not always the
# harness's differential assert: an arithmetic/bounds check that solc 0.8 compiles into the copies
# themselves can fire first. Such a counterexample carries no `__invmut_vP/vM` pair, so every
# observation renderer refuses it -- yet it IS a difference when the check fires in ONE copy only
# (the mutant panics where the reference completes). The innermost `@C@C_mut|C_ref@F@` frame of the
# failing call trace says which copy, so the refusal can be told apart from a real absence of data.
_COPY_FRAME = re.compile(r"@C@(?P<copy>C_mut|C_ref)@F@(?P<fn>[A-Za-z_][A-Za-z0-9_]*)")
_ASSERTION_ID = re.compile(r"\b__invmut_assert_(?P<id>[A-Za-z0-9_]+)\b")
_ALL_F_256 = "0x" + "F" * 64


@dataclass
class Frame:
    function: str
    line: Optional[int]
    expr: str
    is_sync_wrapper: bool


@dataclass(frozen=True)
class WitnessTraceStep:
    slot: int
    function_index: int
    argc: int
    args: tuple[str, ...]
    value: str
    supported: bool


def _fmt_value(raw: str) -> str:
    """Clean an ESBMC value token: drop the binary expansion in parens, normalize sentinels."""
    v = raw.strip()
    cut = v.find(" (")
    if cut > 0:
        v = v[:cut].strip()
    if v.upper() == _ALL_F_256:
        return "type(uint256).max"
    return v


def _canonical_witness_name(raw: str) -> str:
    """Map assertion-local live copies back to canonical CE witness names."""
    return raw.split("__live_", 1)[0]


@dataclass
class Counterexample:
    present: bool
    frames: list[Frame] = field(default_factory=list)
    violated_function: Optional[str] = None
    claim: Optional[str] = None
    observed_values: dict[str, str] = field(default_factory=dict)  # __invmut_vP/vM/revP/revM → value
    witness_values: dict[str, str] = field(default_factory=dict)   # __invmut_ctor_arg*/arg*/key*/value → value
    funccall_wrappers: list[str] = field(default_factory=list)  # ordered s{idx}_<entry> from funccall trace
    snap_p: Optional[str] = None   # V43: P's during-call observer reading (last failing-state binding)
    snap_m: Optional[str] = None   # V43: M's during-call observer reading
    violated_line: Optional[int] = None
    assertion_id: Optional[str] = None
    # DIAGNOSTIC ONLY (never consulted by any decision): the pre-violation lines that mention an
    # observed-value name. When observed_values comes back short we cannot otherwise tell whether the
    # harness never bound the fields or `_OBSERVED` missed the form ESBMC printed them in.
    observed_scan: list[str] = field(default_factory=list)
    # "mut" / "ref" / None -- see _safety_violation_side. Only meaningful when the violated property
    # is NOT the harness's differential assert.
    safety_violation_side: Optional[str] = None
    reason: str = ""

    @property
    def during_call(self) -> bool:
        """The difference is observed DURING the boundary's external call (CEI/reentrancy): the V41
        receive() observer snapshots differ between P and M. The test must use the receive() observer
        shape (snapshot a VIEW getter in receive into a state var; the single assert in run())."""
        return (self.snap_p is not None and self.snap_m is not None
                and self.snap_p != self.snap_m)

    @property
    def observed_pair(self) -> tuple[Optional[object], Optional[object]]:
        """(original, modified) observed scalar values, if the harness surfaced them (V21)."""
        ov = self.observed_values
        if self.assertion_id:
            p_key = f"__invmut_{self.assertion_id}_vP"
            m_key = f"__invmut_{self.assertion_id}_vM"
            if p_key in ov or m_key in ov:
                return ov.get(p_key), ov.get(m_key)
            p_components = _ordered_component_values(ov, f"__invmut_{self.assertion_id}_vP")
            m_components = _ordered_component_values(ov, f"__invmut_{self.assertion_id}_vM")
            if p_components or m_components:
                return p_components or None, m_components or None
        if "__invmut_vP" in ov or "__invmut_vM" in ov:
            return ov.get("__invmut_vP"), ov.get("__invmut_vM")
        if "__invmut_revP" in ov or "__invmut_revM" in ov:
            return ov.get("__invmut_revP"), ov.get("__invmut_revM")
        # multi-return: join components
        ps = [ov[k] for k in sorted(ov) if k.startswith("__invmut_vP")]
        ms = [ov[k] for k in sorted(ov) if k.startswith("__invmut_vM")]
        return (", ".join(ps) or None, ", ".join(ms) or None)

    @property
    def call_sequence(self) -> list[str]:
        """Ordered, de-duplicated entry names of the witnessing transaction sequence (Doc 2 §9.1
        step 3-4). PREFER the `Function call trace` wrappers, which carry the FULL ordered sequence
        including the state-establishing prefix (e.g. deposit, setRewardRate before the boundary
        claim); the State-block frames only surface the boundary wrapper, so using them alone
        truncates the sequence to the final call and hides the path the test must reproduce."""
        seq: list[str] = []
        src = self.funccall_wrappers if self.funccall_wrappers else [
            f.function for f in self.frames if _SYNC_WRAPPER.match(f.function)]
        for raw in src:
            m = _SYNC_WRAPPER.match(raw)
            if not m:
                continue
            name = m.group("entry")
            if not seq or seq[-1] != name:
                seq.append(name)
        return seq

    @property
    def witness_trace(self) -> list[WitnessTraceStep]:
        """Structured bounded wrapper trace recovered from Harness storage fields."""
        values = self.witness_values
        trace_len = _literal_int(values.get("__invmut_trace_len"))
        if trace_len is None or trace_len < 0:
            return []
        steps: list[WitnessTraceStep] = []
        for slot in range(trace_len):
            prefix = f"__invmut_step{slot}_"
            fn_index = _literal_int(values.get(prefix + "fn"))
            argc = _literal_int(values.get(prefix + "argc"))
            supported = _literal_int(values.get(prefix + "supported"))
            value = values.get(prefix + "value")
            if fn_index is None or argc is None or supported is None or value is None or argc < 0:
                return []
            args: list[str] = []
            for arg_index in range(argc):
                arg = values.get(prefix + f"arg{arg_index}")
                if arg is None:
                    return []
                args.append(arg)
            steps.append(WitnessTraceStep(
                slot=slot,
                function_index=fn_index,
                argc=argc,
                args=tuple(args),
                value=value,
                supported=supported == 1,
            ))
        return steps

    @property
    def witness_trace_complete(self) -> bool:
        trace_len = _literal_int(self.witness_values.get("__invmut_trace_len"))
        overflow = _literal_int(self.witness_values.get("__invmut_trace_overflow"))
        steps = self.witness_trace
        return (
            trace_len is not None
            and overflow == 0
            and len(steps) == trace_len
            and all(step.supported and len(step.args) == step.argc for step in steps)
        )


def _literal_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value, 0)
    except ValueError:
        return None


def _ordered_component_values(values: dict[str, str], prefix: str) -> list[str]:
    out: list[str] = []
    idx = 0
    while f"{prefix}{idx}" in values:
        out.append(values[f"{prefix}{idx}"])
        idx += 1
    return out


def parse_counterexample(stdout: str, stderr: str) -> Counterexample:
    combined = stdout + "\n" + stderr
    if _COUNTEREXAMPLE not in combined:
        return Counterexample(False, reason="no_counterexample_output")

    body = combined[combined.index(_COUNTEREXAMPLE):]
    lines = body.splitlines()

    frames: list[Frame] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = _STATE_HDR.match(ln)
        if m and ln.startswith("State ") and m.group("fn"):
            # the assignment expression is the first non-separator, non-empty following line
            expr = ""
            j = i + 1
            while j < len(lines):
                s = lines[j].strip()
                if s and not s.startswith("---"):
                    expr = s
                    break
                if s.startswith("State ") or s.startswith("Violated property:"):
                    break
                j += 1
            fn = m.group("fn")
            frames.append(Frame(fn, int(m.group("line")) if m.group("line") else None,
                                expr, bool(_SYNC_WRAPPER.match(fn))))
        i += 1

    violated_fn, violated_line, claim = _parse_violated(lines)
    # Observed-value assignments occur in `State` blocks BEFORE the `Violated property:` block. In
    # a multi-tx harness the boundary wrapper runs more than once, binding __invmut_vP/vM each time;
    # the FAILING transaction is the LAST binding before the violation, so last-wins (codex B9) —
    # taking the first would render a stale intermediate value (e.g. equal) and corrupt {{DIFFERENCE}}.
    vp_idx = next((i for i, l in enumerate(lines) if l.strip() == "Violated property:"), len(lines))
    observed: dict[str, str] = {}
    witness_values: dict[str, str] = {}
    for ln in lines[:vp_idx]:
        # finditer, NOT search: P's and M's observations are printed as members of the SAME state
        # dump line (`{ .__invmut_revP=1, .__invmut_revM=0 }`), so a per-line `search` bound only the
        # first of the pair and `observed_pair` came back half-empty -> observed_pair_missing_or_non_bool.
        # `_WITNESS_FIELD` already scanned with finditer for exactly this reason.
        for m in _OBSERVED.finditer(ln):
            observed[m.group("name")] = _fmt_value(m.group("val"))   # last binding wins
        wm = _WITNESS_VALUE.search(ln)
        if wm:
            witness_values[_canonical_witness_name(wm.group("name"))] = _fmt_value(wm.group("val"))
        for fm in _WITNESS_FIELD.finditer(ln):
            witness_values[_canonical_witness_name(fm.group("name"))] = _fmt_value(fm.group("val"))
    # V43: the during-call observer struct fields surface in the State dump; the LAST pair BEFORE the
    # violation is the failing state (e.g. `.__invmut_snapP=0, .__invmut_snapM=1`). Restrict to lines
    # before `Violated property:` (codex: an unanchored full-body scan could pick a non-failing frame
    # and mis-flag during_call) — same window + last-wins rationale as the observed vP/vM values.
    snap_p = snap_m = None
    for ln in lines[:vp_idx]:
        ms = _SNAP.search(ln)
        if ms:
            snap_p, snap_m = _fmt_value(ms.group("p")), _fmt_value(ms.group("m"))
    observed_scan = [ln.strip()[:200] for ln in lines[:vp_idx]
                     if "__invmut_v" in ln or "__invmut_rev" in ln][-4:]
    assertion_id = assertion_id_from_claim(claim) or _assertion_id_from_lines(lines)
    return Counterexample(
        True,
        frames,
        violated_fn,
        claim,
        observed,
        witness_values,
        funccall_wrappers=_funccall_wrappers(lines),
        snap_p=snap_p,
        snap_m=snap_m,
        violated_line=violated_line,
        assertion_id=assertion_id,
        observed_scan=observed_scan,
        safety_violation_side=_safety_violation_side(lines),
    )


def parse_counterexamples(stdout: str, stderr: str) -> list[Counterexample]:
    """Parse every counterexample block emitted by a multi-property run.

    ESBMC can continue after one failed claim and print another
    ``[Counterexample]`` block for a later claim.  Feeding the complete output to
    :func:`parse_counterexample` associates the first violated-property block with
    the last function-call trace, because the legacy parser intentionally selects
    the last trace for incremental single-property runs.  Split first so each
    assertion ID, witness, and call sequence remain claim-local.

    Duplicate blocks are retained here.  The consumer decides whether two claims
    or two unwindings describe the same replay trace.
    """
    combined = stdout + "\n" + stderr
    starts = [match.start() for match in re.finditer(re.escape(_COUNTEREXAMPLE), combined)]
    if not starts:
        return []
    out: list[Counterexample] = []
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else len(combined)
        block = combined[start:end]
        parsed = parse_counterexample("", block)
        if parsed.present:
            out.append(parsed)
    return out


def _safety_violation_side(lines: list[str]) -> Optional[str]:
    """Which copy the LAST `Function call trace:` block ends inside: "mut", "ref", or None.

    The innermost frame is the last one printed before the `assertion` claim, so a trace that ends in
    `@C@C_mut@F@sub_uint256` is the mutant violating a check the reference did not reach.
    """
    starts = [i for i, l in enumerate(lines) if l.strip() == "Function call trace:"]
    if not starts:
        return None
    side = None
    for ln in lines[starts[-1] + 1:]:
        st = ln.strip()
        if st.startswith("assertion ") or st.startswith("Violated property:") or st.startswith("State "):
            break
        m = _COPY_FRAME.search(ln)
        if m:
            side = "mut" if m.group("copy") == "C_mut" else "ref"
    return side


def _funccall_wrappers(lines: list[str]) -> list[str]:
    """Ordered s{idx}_<entry> sync wrappers from the LAST `Function call trace:` block (the failing
    unwinding under --incremental-bmc). This block is the only one carrying the FULL transaction
    sequence; the State frames only surface the asserting boundary wrapper (TOD diagnosis)."""
    starts = [i for i, l in enumerate(lines) if l.strip() == "Function call trace:"]
    if not starts:
        return []
    out: list[str] = []
    for ln in lines[starts[-1] + 1:]:
        s = ln.strip()
        if s.startswith("assertion ") or s.startswith("Violated property:") or s.startswith("State "):
            break
        m = _FUNCCALL_WRAPPER.search(ln)
        if m:
            out.append(m.group("wrap"))
    return out


def assertion_id_from_claim(claim: str | None) -> Optional[str]:
    """Return the local-pack assertion id embedded in a claim, if present.

    R2 local multi-property packs must make assertion provenance survive ESBMC's
    output.  The planned pack builder will assert named booleans such as
    `__invmut_assert_A003`; extracting the suffix lets the CE asset attach the
    witness to exactly one packed observation.
    """
    m = _ASSERTION_ID.search(claim or "")
    return m.group("id") if m else None


def _assertion_id_from_lines(lines: list[str]) -> Optional[str]:
    for line in lines:
        found = assertion_id_from_claim(line)
        if found:
            return found
    return None


def _parse_violated(lines: list[str]) -> tuple[Optional[str], Optional[int], Optional[str]]:
    """Parse the `Violated property:` block: function, source line, and assertion claim.

    The claim is the line starting with `assertion `; under `--show-funccall-trace`
    the function-call trace can be interleaved before it.
    """
    vf, vline, claim = None, None, None
    for idx, ln in enumerate(lines):
        if ln.strip() == "Violated property:":
            # next line: 'file <f> line <N> function <fn>'
            if idx + 1 < len(lines):
                mm = re.search(r"function (\S+)", lines[idx + 1])
                if mm:
                    vf = mm.group(1)
                lm = re.search(r"line (\d+)", lines[idx + 1])
                if lm:
                    vline = int(lm.group(1))
            # claim: first 'assertion ...' after this block
            for k in range(idx + 1, min(idx + 40, len(lines))):
                s = lines[k].strip()
                if s.startswith("assertion "):
                    claim = s[len("assertion "):].strip()
                    break
            break
    return vf, vline, claim


# --- rendering (Doc 2 §9.2) ---------------------------------------------------------------

def render_difference(ce: Counterexample, category: str, *, var_name: Optional[str] = None,
                      fn_name: Optional[str] = None, getter_keys: Optional[list[str]] = None,
                      ref_name: str = "C_ref", mut_name: str = "C_mut") -> str:
    """Render the fixed {{DIFFERENCE}} block (prompts §7). Maps C_ref/C_mut → Original/Modified;
    emits the executed call sequence and a per-kind observed-difference description."""
    seq = ce.call_sequence
    if not seq and ce.violated_function:
        m = _SYNC_WRAPPER.match(ce.violated_function)
        if m:
            seq = [m.group("entry")]

    lines = ["Call sequence:"]
    if seq:
        for n, name in enumerate(seq, 1):
            lines.append(f"{n}. {name}(...)")
    else:
        lines.append("1. (boundary call)")

    vP, vM = ce.observed_pair
    if category == "state":
        keysig = f"[{', '.join(getter_keys)}]" if getter_keys else ""
        cell = f"{var_name}{keysig}" if var_name else "the observed state"
        orig = f"{cell} = {vP}" if vP is not None else f"{cell} (in Original)"
        mod = f"{cell} = {vM}" if vM is not None else f"{cell} differs in Modified"
        lines += [f"Observed difference (state: {cell}):",
                  f"- Original: {orig}", f"- Modified: {mod}"]
    elif category == "return":
        orig = f"returns {vP}" if vP is not None else "returns one value"
        mod = f"returns {vM}" if vM is not None else "returns a different value"
        lines += [f"Observed difference (return: {fn_name}):",
                  f"- Original: {fn_name}(...) {orig}",
                  f"- Modified: {fn_name}(...) {mod}"]
    else:  # revert
        orig, mod = _revert_words(vP, vM)
        lines += [f"Observed difference (revert: {fn_name}):",
                  f"- Original: call to {fn_name}(...) {orig}",
                  f"- Modified: call to {fn_name}(...) {mod}"]
    return "\n".join(lines)


def _revert_words(vP: Optional[str], vM: Optional[str]) -> tuple[str, str]:
    def w(v):
        if v is None:
            return "completed | reverted"
        return "reverted" if v.strip().upper() in ("TRUE", "1") else "completed"
    return w(vP), w(vM)
