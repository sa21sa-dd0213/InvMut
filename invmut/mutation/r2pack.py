"""Packed R2 screen: ONE ESBMC run per focus cell over ALL its compiled mutants (VeriPUT-style
multi-property differential), used as a pre-filter in front of the unchanged single-mutant R2.

Why: in the batch pipeline every mutant of a (target, boundary) cell pays its own focused R2 run
(60 s timeout) plus probes; a cell with k~4 mutants costs 8-15 ESBMC calls, and a unit ESBMC cannot
converge on burns k x 60 s. Here the k mutants share one harness: contracts C_ref, C_mut1..C_mutk,
a Harness holding p and m1..mk, a selector `__invmut_sel` fixed ONCE in the constructor (nondet,
range-assumed) so that every transaction of a path drives the SAME mutant (p's state stays in
lockstep with exactly one m_i), and the boundary wrapper asserts the differential of the selected
mutant on a line that is unique per mutant. `--multi-property` reports every violated claim in one
run; the violated lines identify the mutants that differ. Those (and only those) then go through
the ordinary `validate_candidate` R2 to obtain the confirmed difference + counterexample trace (a
real difference surfaces fast there), while mutants the screen could not separate are recorded as
`inconclusive:pack_screen_<verdict>` without spending a per-mutant timeout.

Soundness of the screen as a FILTER: a violated claim for mutant i is a genuine P-vs-M_i
differential path (same construction args, same tx sequence, same inputs, i fixed per path), i.e.
exactly what the single-mutant harness checks; the confirm step re-establishes it independently.
A mutant the screen misses only costs recall (never a false kill) -- the same contract the
existing focused R2 already makes.

Harness shape is derived from build_r2_file: the per-side helpers (`_sync_call_lines`,
`_sync_ret`, `_cast_getter`, `_wrapper_params`, `_key_param_decls`) take the instance name as the
`side` string, so `m3` is a valid side. The state-target during-call observer (V41) is NOT packed
(observer routing is per single m); state targets whose observer would be emitted are screened
settlement-only, which is again recall-only for the screen.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Optional

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.esbmc import parse
from invmut.esbmc.runner import temp_sol
from invmut.mutation.assemble import (
    AssemblyError, AssemblyParts, _analyze, _rename_within, _toplevel_names,
)
from invmut.mutation.solast import byte_slice
from invmut.mutation.harness import (
    HarnessTarget, _boundary_names, _cast_getter, _is_elementary, _key_param_decls,
    _sync_call_lines, _sync_ret, _wrapper_params,
)
from invmut.mutation.r2 import doc1_target_to_harness_target
from invmut.mutation.solast import AstError, get_ast

SEL = "__invmut_sel"


@dataclass
class PackParts:
    deps: str
    c_ref: str
    c_muts: list[str]
    ref_name: str
    mut_names: list[str]
    p_info: object
    parts0: AssemblyParts   # single-pair parts for mutant 0 (entries/constructor come from P anyway)


@dataclass
class PackScreen:
    """Per-mutant screen outcome. `differs` = the packed run violated this mutant's claim."""
    outcomes: list[str]            # per mutant: "visible_difference" | "no_difference" | "inconclusive"
    reason: str                    # aggregate verdict / reason for the run
    harness_source: str
    argv: list[str]
    stdout: str
    stderr: str
    elapsed_s: float


def assemble_pack(solc_bin: str, p_source: str, m_sources: list[str], contract: str,
                  ) -> PackParts | AssemblyError:
    """assemble_pair generalised to k mutants: (deps, C_ref, [C_mut1..k]) with collision-free names."""
    try:
        p_info = _analyze(solc_bin, p_source, contract)
        m_infos = [_analyze(solc_bin, m, contract) for m in m_sources]
    except AstError as e:
        return AssemblyError(f"ast_analysis_failed: {e}")
    if p_info.external_ref_spans or any(mi.external_ref_spans for mi in m_infos):
        return AssemblyError("dependency references the primary contract "
                             "(inheritance/usage edge, Doc 2 §6.3 v1 limitation)")
    blocked = {contract} | set(p_info.internal_types)
    for f in p_info.entries:
        for ty in [t for t, _ in f.params] + list(f.returns):
            base = ty.split()[0].split(".")[-1] if ty else ""
            if base in blocked:
                return AssemblyError(f"entry {f.name!r} uses a contract-internal type {base!r} "
                                     "(Doc 2 §6.3 v1 limitation)")
    try:
        with temp_sol(p_source, prefix="invmut_names_") as path:
            existing = _toplevel_names(get_ast(solc_bin, path))
    except AstError as e:
        return AssemblyError(f"ast_analysis_failed: {e}")
    ref_name = None
    for cand in (f"{contract}_ref", f"__invmut_ref_{contract}", *[f"{contract}_ref{i}" for i in range(2, 50)]):
        if cand not in existing:
            ref_name = cand
            break
    mut_names = []
    for i in range(len(m_sources)):
        for cand in (f"{contract}_mut{i + 1}", f"__invmut_mut{i + 1}_{contract}",
                     *[f"{contract}_mut{i + 1}_{j}" for j in range(2, 50)]):
            if cand not in existing and cand != ref_name and cand not in mut_names:
                mut_names.append(cand)
                break
    if ref_name is None or len(mut_names) != len(m_sources):
        return AssemblyError("could not find collision-free rename suffixes for the pack")
    pcs, pce = p_info.span
    c_ref = _rename_within(byte_slice(p_source, pcs, pce), pcs,
                           [p_info.name_loc, *p_info.self_ref_spans], ref_name)
    c_muts = []
    for m, mi, nm in zip(m_sources, m_infos, mut_names):
        mcs, mce = mi.span
        c_muts.append(_rename_within(byte_slice(m, mcs, mce), mcs,
                                     [mi.name_loc, *mi.self_ref_spans], nm))
    pb = p_source.encode("utf-8")
    deps = (pb[:pcs] + pb[pce:]).decode("utf-8").rstrip() + "\n"
    parts0 = AssemblyParts(deps, c_ref, c_muts[0], ref_name, mut_names[0], p_info, m_infos[0])
    return PackParts(deps, c_ref, c_muts, ref_name, mut_names, p_info, parts0)


# --- emitters -----------------------------------------------------------------------------

def _m_dispatch(k: int, line_for: callable, indent: str = "        ") -> str:
    """if/else chain over the constructor-fixed selector; `line_for(i)` gives mutant i's statement."""
    out = []
    for i in range(k):
        kw = "if" if i == 0 else "else if"
        out.append(f"{indent}{kw} ({SEL} == {i}) {{ {line_for(i)} }}")
    return "\n".join(out) + "\n"


def _plain_wrapper_pack(idx: int, fn, k: int) -> str:
    decls, args, prelude = _wrapper_params(fn)
    pay = ""
    if fn.payable:
        decls = ["uint256 __v", *decls]
        pay = " payable"
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    body += f"        {_sync_call_lines(fn, 'p', args)}\n"
    body += _m_dispatch(k, lambda i: _sync_call_lines(fn, f"m{i}", args))
    return head + body + "    }\n"


def _assert_line(i: int, expr: str) -> str:
    # one line per mutant: `assert(...)` on its own line is what the multi-property claim reports
    return f"        if ({SEL} == {i}) assert({expr});   // __invmut_pack_m{i}\n"


def _state_wrapper_pack(idx: int, fn, t: HarnessTarget, k: int) -> str:
    decls, args, prelude = _wrapper_params(fn)
    if fn.payable:
        decls = ["uint256 __v", *decls]
    decls = [*decls, *_key_param_decls(t)]
    pay = " payable" if fn.payable else ""
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    leaf = t.leaf_type or "uint256"
    decl_type = leaf if _is_elementary(leaf) else "uint256"
    body += f"        {_sync_call_lines(fn, 'p', args)} __ESBMC_assume(!__ESBMC_reverted());\n"
    body += _m_dispatch(k, lambda i: f"{_sync_call_lines(fn, f'm{i}', args)} __ESBMC_assume(!__ESBMC_reverted());")
    body += f"        {decl_type} __invmut_vP = {_cast_getter('p', t)};\n"
    body += f"        {decl_type} __invmut_vM = __invmut_vP;\n"
    body += _m_dispatch(k, lambda i: f"__invmut_vM = {_cast_getter(f'm{i}', t)};")
    for i in range(k):
        body += _assert_line(i, "__invmut_vP == __invmut_vM")
    return head + body + "    }\n"


def _return_wrapper_pack(idx: int, fn, t: HarnessTarget, k: int) -> str | AssemblyError:
    decls, args, prelude = _wrapper_params(fn)
    pay = ""
    if fn.payable:
        decls = ["uint256 __v", *decls]
        pay = " payable"
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    rts = t.return_types
    if len(rts) != 1:
        return AssemblyError(f"multi-return tuple unsupported in v1 (ESBMC F12): {rts}")
    body += f"        {rts[0]} __invmut_vP = {_sync_ret('p', fn, args)} __ESBMC_assume(!__ESBMC_reverted());\n"
    body += f"        {rts[0]} __invmut_vM = __invmut_vP;\n"
    body += _m_dispatch(k, lambda i: f"__invmut_vM = {_sync_ret(f'm{i}', fn, args)} __ESBMC_assume(!__ESBMC_reverted());")
    for i in range(k):
        body += _assert_line(i, "__invmut_vP == __invmut_vM")
    return head + body + "    }\n"


def _revert_wrapper_pack(idx: int, fn, k: int) -> str:
    decls, args, prelude = _wrapper_params(fn)
    pay = ""
    if fn.payable:
        decls = ["uint256 __v", *decls]
        pay = " payable"
    head = f"    function s{idx}_{fn.name}({', '.join(decls)}) public{pay} {{\n"
    body = "".join(ln + "\n" for ln in prelude)
    if fn.payable:
        body += "        __ESBMC_assume(msg.value >= 2 * __v);\n"
    body += f"        {_sync_call_lines(fn, 'p', args)} bool __invmut_revP = __ESBMC_reverted();\n"
    body += "        bool __invmut_revM = __invmut_revP;\n"
    body += _m_dispatch(k, lambda i: f"{_sync_call_lines(fn, f'm{i}', args)} __invmut_revM = __ESBMC_reverted();")
    for i in range(k):
        body += _assert_line(i, "__invmut_revP == __invmut_revM")
    return head + body + "    }\n"


def _constructor_pack(pp: PackParts) -> str:
    """Deploy p and ONLY the selected mutant copy (the selector is fixed first): deploying all k
    copies would run k constructors symbolically on every path and make the pack k-times more
    expensive than a single-mutant harness (measured on GSPFunding: 8 copies -> timeout)."""
    k = len(pp.mut_names)
    ctor = pp.p_info.constructor
    sel = f"__ESBMC_assume({SEL} < {k});"

    def body(args: str) -> str:
        deploy = " ".join(
            f"{'if' if i == 0 else 'else if'} ({SEL} == {i}) {{ m{i} = new {nm}({args}); "
            f"__ESBMC_assume(address(p).balance == address(m{i}).balance); }}"
            for i, nm in enumerate(pp.mut_names))
        return f"{sel} p = new {pp.ref_name}({args}); {deploy}"

    if ctor is None or not ctor.params:
        return f"    constructor() {{ {body('')} }}"
    decls = ", ".join(f"{pt} c{i}" for i, (pt, _n) in enumerate(ctor.params))
    args = ", ".join(f"c{i}" for i in range(len(ctor.params)))
    return f"    constructor({decls}) {{ {body(args)} }}"


def build_r2_pack_file(pp: PackParts, t: HarnessTarget) -> str | AssemblyError:
    """Assemble deps + C_ref + C_mut1..k + Harness(selector) for target t (tb pinned by the caller)."""
    k = len(pp.mut_names)
    if t.category == "state":
        if t.state_kind not in ("scalar", "mapping", "enum"):
            return AssemblyError(f"state projection unsupported in v1: {t.state_kind}")
        if t.leaf_type and not _is_elementary(t.leaf_type) and t.state_kind != "enum":
            return AssemblyError(f"state leaf type not value-typed: {t.leaf_type}")
        if t.needs_getter_injection:
            return AssemblyError("pack screen does not inject getters (private state)")
    elif t.category == "return":
        if len(t.return_types) != 1 or not _is_elementary(t.return_types[0]):
            return AssemblyError(f"return type unsupported in v1: {t.return_types}")
    entries = pp.p_info.entries
    bnames = _boundary_names(t)
    wrappers = []
    for i, fn in enumerate(entries):
        if fn.name in bnames:
            if t.category == "state":
                wrappers.append(_state_wrapper_pack(i, fn, t, k))
            elif t.category == "return":
                w = _return_wrapper_pack(i, fn, t, k)
                if isinstance(w, AssemblyError):
                    return w
                wrappers.append(w)
            else:
                wrappers.append(_revert_wrapper_pack(i, fn, k))
        else:
            wrappers.append(_plain_wrapper_pack(i, fn, k))
    if not any(f"__invmut_pack_m0" in w for w in wrappers):
        return AssemblyError(f"pack boundary not found among entries: {sorted(bnames)}")
    fields = f"    {pp.ref_name} p; " + " ".join(f"{nm} m{i};" for i, nm in enumerate(pp.mut_names))
    harness = (
        "contract Harness {\n"
        f"{fields}\n"
        f"    uint8 {SEL};\n"
        "    function __ESBMC_reverted() internal returns (bool) {}\n"
        "    function __ESBMC_assume(bool) internal pure {}\n"
        "    receive() external payable {\n    }\n\n"
        f"{_constructor_pack(pp)}\n"
        + "\n".join(wrappers)
        + "}\n"
    )
    return f"{pp.deps}\n{pp.c_ref}\n\n" + "\n\n".join(pp.c_muts) + f"\n\n{harness}"


# --- driver -------------------------------------------------------------------------------

_CLAIM_LINE = re.compile(r"FAILED:\s*'.*? at file \S+ line (?P<line>\d+)")


def violated_mutants(harness_source: str, stdout: str, stderr: str) -> set[int]:
    """Map the multi-property `FAILED: '... line N ...'` claims back to mutant indices via the
    `// __invmut_pack_m<i>` markers on the assert lines."""
    marker = {}
    for ln_no, text in enumerate(harness_source.splitlines(), start=1):
        m = re.search(r"// __invmut_pack_m(\d+)", text)
        if m:
            marker[ln_no] = int(m[1])
    out = set()
    for ln in (stdout + "\n" + stderr).splitlines():
        m = _CLAIM_LINE.search(ln)
        if m and int(m["line"]) in marker:
            out.add(marker[int(m["line"])])
    # fallback: a `Violated property:` block quoting the assert line text with the marker
    for m in re.finditer(r"__invmut_pack_m(\d+)", stdout + "\n" + stderr):
        out.add(int(m[1]))
    return out


def screen_cell(config: Config, p_source: str, m_sources: list[str], contract: str,
                target_json: dict, pinned_boundary: Optional[str], run_fn, compile_fn,
                ) -> PackScreen | AssemblyError:
    """One packed ESBMC run for the cell. Returns per-mutant screen outcomes."""
    import time
    pp = assemble_pack(config.solc_bin, p_source, m_sources, contract)
    if isinstance(pp, AssemblyError):
        return pp
    t = doc1_target_to_harness_target(target_json, pp.p_info.entries, pinned_boundary)
    if isinstance(t, AssemblyError):
        return t
    if t.category == "state":
        writers = list(t.writer_names)
        if not writers:
            return AssemblyError("no_state_writer")
        t = replace(t, tb_writer=writers[0])
    x = build_r2_pack_file(pp, t)
    if isinstance(x, AssemblyError):
        return x
    comp = compile_fn(x)
    if not comp.ok:
        return AssemblyError("harness_compile_failed:" + (comp.diagnostics or "")[:300], unsupported=False)
    focus = None
    for i, fn in enumerate(pp.p_info.entries):
        if fn.name in _boundary_names(t):
            focus = f"s{i}_{fn.name}"
            break
    t0 = time.time()
    with temp_sol(x, prefix="invmut_r2pack_") as path:
        # --multi-property does NOT stop at the first violated claim: incremental-bmc keeps unrolling
        # to max-k-step with every claim live, so the pack's bound is a separate (small) config knob;
        # a difference deeper than that is a screen miss (recall only), exactly like the single R2's
        # own bound.
        argv = cmd.build_r2_multi_property_command(
            config, path, focus_function=focus,
            max_k_step=getattr(config.verifier, "r2_pack_max_k_step", 3))
        run = run_fn(argv)
    v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
    hit = violated_mutants(x, run.stdout, run.stderr) if (v.verdict == parse.FAILED or v.claim_violations_present) else set()
    k = len(m_sources)
    if hit:
        outcomes = ["visible_difference" if i in hit else "inconclusive" for i in range(k)]
        reason = "pack_screen_partial" if len(hit) < k else "pack_screen_all"
    elif v.verdict == parse.SUCCESSFUL or (v.verdict == parse.UNKNOWN and v.bound_exhausted):
        outcomes = ["no_difference"] * k
        reason = "pack_screen_no_difference"
    else:
        outcomes = ["inconclusive"] * k
        reason = f"pack_screen_{v.verdict.lower()}"
    return PackScreen(outcomes, reason, x, argv, run.stdout, run.stderr, time.time() - t0)
