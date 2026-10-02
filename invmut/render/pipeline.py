
from __future__ import annotations

import os
import tempfile

from invmut.config import Config
from invmut.render import gate
from invmut.render.foundry import RenderFail, render_foundry
from invmut.render.model import RenderInput, RenderResult
from invmut.render.validate import (ValidationVerdict, _testfuzz_failed, classify_validation,
                                    classify_validation_m_only, run_forge)
from invmut.render.workspace import build_workspace

_BASENAME = "C_under_test.sol"
_IMPORT_PATH = "../src/" + _BASENAME


def _solc_version(config: Config) -> str:
    v = config.solc_version_expected
    return v.split("+")[0].replace("Version: ", "").strip()


def render_only(config: Config, ri: RenderInput) -> RenderResult:
    fs_err = gate.check_forge_std(config.forge_std_path)
    if fs_err:
        return RenderResult(render_error=fs_err)
    out = render_foundry(config.solc_bin, ri.bundle, ri.c_scope_source, _IMPORT_PATH, ri.pragma,
                         ri.contract_name,
                         assume_distinct_addrs=config.assume_distinct_address_params,
                         param_only=getattr(config, "render_param_only", False))
    if isinstance(out, RenderFail):
        return RenderResult(render_error=out.code)
    src, note = out
    import re
    tn = re.search(r"contract\s+(\w+)\s+is\s+Test", src)
    return RenderResult(render_status="rendered", render_note=note, rendered_test=src,
                        test_name=tn.group(1) if tn else "InvMutTest", body_name=_body_name_of(src))


def _body_name_of(src: str) -> str | None:
    import re
    m = re.search(r"function testFuzz_(\w+)\(", src)
    return m.group(1) if m else None


_LADDER = ((False, True), (True, True), (True, False))

def _validate_rendered(config: Config, ri: RenderInput, rendered_test: str, test_name: str,
                       root: str, sv: str, force_pm: bool = False, fuzz_runs: int | None = None):
    m_only = config.verifier.kill_check_mode == "m_only" and not force_pm

    fr = config.verifier.forge_fuzz_runs if fuzz_runs is None else fuzz_runs

    def _bf(ws, scope_source, via_ir, optimizer=None):
        build_workspace(ws, scope_source, _BASENAME, rendered_test, config.forge_std_path,
                        solc_version=sv, fuzz_runs=fr,
                        fuzz_seed=hex(config.verifier.forge_fuzz_seed), via_ir=via_ir,
                        optimizer=optimizer)
        return run_forge(config, ws, test_name)


    ws_m = os.path.join(root, "workspace_M")
    mo = _bf(ws_m, ri.m_scope_source, via_ir=False)
    if m_only:
        _rung = (False, None)
        for _via, _opt in _LADDER:
            if not _stack_too_deep(mo):
                break
            mo = _bf(ws_m, ri.m_scope_source, via_ir=_via, optimizer=_opt)
            _rung = (_via, _opt)
        _v = classify_validation_m_only(mo)
        if _v.status == "passed":
            _g = _gate_recheck(config, ri, rendered_test, test_name, root, sv, fr, _rung)
            if _g is not None:
                return _g, _g.p_outcome.raw if _g.p_outcome else None, _g.m_outcome.raw
        return _v, None, mo.raw
    ws_p = os.path.join(root, "workspace_P")
    po = _bf(ws_p, ri.c_scope_source, via_ir=False)
    _rung = (False, None)
    for _via, _opt in _LADDER:
        if not (_stack_too_deep(mo) or _stack_too_deep(po)):
            break
        mo = _bf(ws_m, ri.m_scope_source, via_ir=_via, optimizer=_opt)
        po = _bf(ws_p, ri.c_scope_source, via_ir=_via, optimizer=_opt)
        _rung = (_via, _opt)
    verdict = classify_validation(po, mo)
    if verdict.status == "passed":
        _g = _gate_recheck(config, ri, rendered_test, test_name, root, sv, fr, _rung)
        if _g is not None:
            return _g, _g.p_outcome.raw if _g.p_outcome else po.raw, _g.m_outcome.raw
    return verdict, po.raw, mo.raw


def _gate_recheck(config, ri, rendered_test, test_name, root, sv, fr, rung=(False, None)):
    _gr = int(getattr(config.verifier, "accept_gate_fuzz_runs", 0) or 0)
    if _gr <= 0 or fr >= _gr:
        return None
    _seed = getattr(config.verifier, "accept_gate_fuzz_seed", 0) or config.verifier.forge_fuzz_seed
    _rej = int(getattr(config.verifier, "accept_gate_max_test_rejects", 0) or 0)
    ws_p2 = os.path.join(root, "workspace_P_gate")
    ws_m2 = os.path.join(root, "workspace_M_gate")
    _prev = os.environ.get("FOUNDRY_FUZZ_MAX_TEST_REJECTS")
    if _rej > 0:
        os.environ["FOUNDRY_FUZZ_MAX_TEST_REJECTS"] = str(_rej)
    try:
        _via, _opt = rung

        def _bg(ws, scope_source, via_ir, optimizer):
            build_workspace(ws, scope_source, _BASENAME, rendered_test, config.forge_std_path,
                            solc_version=sv, fuzz_runs=_gr, fuzz_seed=hex(_seed),
                            via_ir=via_ir, optimizer=optimizer)
            return run_forge(config, ws, test_name)

        po2 = _bg(ws_p2, ri.c_scope_source, _via, _opt)
        mo2 = _bg(ws_m2, ri.m_scope_source, _via, _opt)
        for _v2, _o2 in _LADDER:
            if not (_stack_too_deep(po2) or _stack_too_deep(mo2)):
                break
            po2 = _bg(ws_p2, ri.c_scope_source, _v2, _o2)
            mo2 = _bg(ws_m2, ri.m_scope_source, _v2, _o2)
    finally:
        if _rej > 0:
            if _prev is None:
                os.environ.pop("FOUNDRY_FUZZ_MAX_TEST_REJECTS", None)
            else:
                os.environ["FOUNDRY_FUZZ_MAX_TEST_REJECTS"] = _prev
    v2 = classify_validation(po2, mo2)
    if v2.status == "passed":
        return None
    return ValidationVerdict("validation_error", f"gatefuzz:{v2.error}", po2, mo2)


def _stack_too_deep(outcome) -> bool:
    raw = getattr(outcome, "raw", "") or ""
    return (outcome is not None and getattr(outcome, "kind", None) == "compile_failed"
            and ("Stack too deep" in raw or "too deep in the stack" in raw))


def render_and_validate(config: Config, ri: RenderInput, work_root: str | None = None,
                        client=None, model=None, thinking=None) -> RenderResult:
    res = render_only(config, ri)
    if res.render_status != "rendered":
        return res

    cleanup = work_root is None
    root = work_root or tempfile.mkdtemp(prefix="invmut_render_")
    try:
        sv = _solc_version(config)
        verdict, p_log, m_log = _validate_rendered(config, ri, res.rendered_test, res.test_name, root, sv)
        res.workspace_P_log, res.workspace_M_log = p_log, m_log

        res.validation_status = verdict.status
        res.validation_error = verdict.error
        return res
    finally:
        if cleanup:
            import shutil
            shutil.rmtree(root, ignore_errors=True)
