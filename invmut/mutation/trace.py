
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

_STATE_HDR = re.compile(r"^State \d+(?: file (?P<file>\S+))?(?: line (?P<line>\d+))?"
                        r"(?: column \d+)?(?: function (?P<fn>\S+))?")
_SYNC_WRAPPER = re.compile(r"^s\d+_(?P<entry>\w+)$")
_FUNCCALL_WRAPPER = re.compile(r"@C@Harness@F@(?P<wrap>s\d+_\w+)#\d+")
_COUNTEREXAMPLE = "[Counterexample]"
_OBSERVED = re.compile(
    r"\b(?P<name>__invmut_(?:(?:vP\d*|vM\d*|revP|revM)|"
    r"(?:[A-Za-z_][A-Za-z0-9_]*_(?:vP|vM)\d*)))\s*=\s*"
    r"(?P<val>-?0x[0-9A-Fa-f]+|-?\d+|TRUE|FALSE|true|false)\b"
)
_WITNESS_NAME = (
    r"__invmut_(?:(?:ctor_arg\d+|arg\d+|key\d+|value|balP|balM)|"
    r"(?:trace_len|trace_overflow|step\d+_(?:fn|argc|value|supported|arg\d+))|"
    r"(?:[A-Za-z_][A-Za-z0-9_]*_key\d+_w))"
    r"(?:__live_[A-Za-z0-9_]+)?"
)
_WITNESS_VALUE = re.compile(rf"\b(?P<name>{_WITNESS_NAME})\s*=\s*"
                            r"(?P<val>-?0x[0-9A-Fa-f]+|-?\d+|TRUE|FALSE|true|false)\b")
_WITNESS_FIELD = re.compile(rf"\.(?P<name>{_WITNESS_NAME})\s*=\s*"
                            r"(?P<val>-?0x[0-9A-Fa-f]+|-?\d+|TRUE|FALSE|true|false)\b")
_SNAP = re.compile(r"\.__invmut_snapP=(?P<p>-?0x[0-9A-Fa-f]+|-?\d+),\s*"
                   r"\.__invmut_snapM=(?P<m>-?0x[0-9A-Fa-f]+|-?\d+)")
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
    v = raw.strip()
    cut = v.find(" (")
    if cut > 0:
        v = v[:cut].strip()
    if v.upper() == _ALL_F_256:
        return "type(uint256).max"
    return v


def _canonical_witness_name(raw: str) -> str:
    return raw.split("__live_", 1)[0]


@dataclass
class Counterexample:
    present: bool
    frames: list[Frame] = field(default_factory=list)
    violated_function: Optional[str] = None
    claim: Optional[str] = None
    observed_values: dict[str, str] = field(default_factory=dict)
    witness_values: dict[str, str] = field(default_factory=dict)
    funccall_wrappers: list[str] = field(default_factory=list)
    snap_p: Optional[str] = None
    snap_m: Optional[str] = None
    violated_line: Optional[int] = None
    assertion_id: Optional[str] = None
    observed_scan: list[str] = field(default_factory=list)
    safety_violation_side: Optional[str] = None
    reason: str = ""

    @property
    def during_call(self) -> bool:
        return (self.snap_p is not None and self.snap_m is not None
                and self.snap_p != self.snap_m)

    @property
    def observed_pair(self) -> tuple[Optional[object], Optional[object]]:
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
        ps = [ov[k] for k in sorted(ov) if k.startswith("__invmut_vP")]
        ms = [ov[k] for k in sorted(ov) if k.startswith("__invmut_vM")]
        return (", ".join(ps) or None, ", ".join(ms) or None)

    @property
    def call_sequence(self) -> list[str]:
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
    vp_idx = next((i for i, l in enumerate(lines) if l.strip() == "Violated property:"), len(lines))
    observed: dict[str, str] = {}
    witness_values: dict[str, str] = {}
    for ln in lines[:vp_idx]:
        for m in _OBSERVED.finditer(ln):
            observed[m.group("name")] = _fmt_value(m.group("val"))
        wm = _WITNESS_VALUE.search(ln)
        if wm:
            witness_values[_canonical_witness_name(wm.group("name"))] = _fmt_value(wm.group("val"))
        for fm in _WITNESS_FIELD.finditer(ln):
            witness_values[_canonical_witness_name(fm.group("name"))] = _fmt_value(fm.group("val"))
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
    m = _ASSERTION_ID.search(claim or "")
    return m.group("id") if m else None


def _assertion_id_from_lines(lines: list[str]) -> Optional[str]:
    for line in lines:
        found = assertion_id_from_claim(line)
        if found:
            return found
    return None


def _parse_violated(lines: list[str]) -> tuple[Optional[str], Optional[int], Optional[str]]:
    vf, vline, claim = None, None, None
    for idx, ln in enumerate(lines):
        if ln.strip() == "Violated property:":
            if idx + 1 < len(lines):
                mm = re.search(r"function (\S+)", lines[idx + 1])
                if mm:
                    vf = mm.group(1)
                lm = re.search(r"line (\d+)", lines[idx + 1])
                if lm:
                    vline = int(lm.group(1))
            for k in range(idx + 1, min(idx + 40, len(lines))):
                s = lines[k].strip()
                if s.startswith("assertion "):
                    claim = s[len("assertion "):].strip()
                    break
            break
    return vf, vline, claim



def render_difference(ce: Counterexample, category: str, *, var_name: Optional[str] = None,
                      fn_name: Optional[str] = None, getter_keys: Optional[list[str]] = None,
                      ref_name: str = "C_ref", mut_name: str = "C_mut") -> str:
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
    else:
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
