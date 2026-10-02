
from __future__ import annotations

import re
import tempfile
from typing import Optional

_VM_ALLOWED = {"deal", "prank", "startPrank", "stopPrank", "warp", "roll"}

_VM_SIG_CHEATS = frozenset({"sign", "addr"})


def _strip_comments(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"//[^\n]*", "", src)


def _llm_cheat_reject(test_code: str, extra_vm: frozenset = frozenset()) -> Optional[str]:
    src = _strip_comments(test_code)
    funcs = re.findall(r"function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)", src, flags=re.S)
    test_fns = [(n, p) for n, p in funcs
                if n.startswith("test") or n.startswith("invariant") or n.startswith("afterInvariant")]
    if any(n.startswith("testFuzz_") for n, _ in test_fns):
        return "testFuzz_forbidden"
    extra = [n for n, _ in test_fns if not n.startswith("testRegression_")]
    if extra:
        return "extra_test_function:" + extra[0]
    regs = [(n, p) for n, p in test_fns if n.startswith("testRegression_")]
    if len(regs) != 1:
        return "need_exactly_one_testRegression"
    if regs[0][1].strip():
        return "test_must_take_no_params"
    for m in re.finditer(r"\bvm\s*\.\s*([A-Za-z_]\w*)", src):
        if m.group(1) not in (_VM_ALLOWED | extra_vm):
            return "forbidden_cheatcode:vm." + m.group(1)
    if not (("c." in src or "address(c)" in src) and re.search(r"\bassert\w*\s*\(", src)):
        return "test_does_not_observe_c"
    return None


def _llm_strict_ok(p_outcome, m_outcome) -> bool:
    return (p_outcome is not None and m_outcome is not None
            and p_outcome.status_of("testRegression_") == "Success"
            and m_outcome.status_of("testRegression_") == "Failure")


from invmut.agents import mutate_agent as MA
from invmut.agents import test_agent as TA
from invmut.agents.client import LLMInfraError
from invmut.agents.memory import MutationMemory, TestMemory
from invmut.mutation.compile import make_solc_compile_fn
from invmut.mutation.model import Candidate, Outcome
from invmut.mutation import static_stages as st
from invmut.mutation.validate import _unit_record
from invmut.orchestrate import prep
from invmut.orchestrate.run import AcceptedTest, RunContext, UnitResult, _acc_tokens
from invmut.render.model import RenderInput
from invmut.render.pipeline import _validate_rendered
from invmut.render.validate import forge_diagnostic
from invmut.render.foundry import rewrite_struct_getter_members, bound_llm_value_params, rewrite_lowlevel_handle_calls, rename_reserved_identifiers, bound_vm_addr_keys
import re
import functools
import time

_TEST_NAME = "InvMutTest"


def _solc_version(config) -> str:
    v = config.solc_version_expected
    return v.split("+")[0].replace("Version: ", "").strip()


_REVERT_MARKERS = ("EvmError: Revert", "reverted unexpectedly", "call reverted",
                   "execution reverted", "EvmError: OutOfFunds")
_ASSERT_MARKERS = ("assertion failed", "Assertion failed", "assertTrue", "assertEq",
                   "log != expected", "!=  ")


def _p_side_reverted(p_raw: str) -> bool:
    if not p_raw:
        return False
    if any(m in p_raw for m in _ASSERT_MARKERS):
        return False
    return (any(m in p_raw for m in _REVERT_MARKERS)
            or "revert" in p_raw.lower())


def _llm_test_diag(verdict, config=None) -> Optional[dict]:
    if verdict.status == "passed":
        return None
    err = verdict.error or "inconclusive"
    p_raw = (getattr(verdict.p_outcome, "raw", "") or "")[:1500]
    m_raw = (getattr(verdict.m_outcome, "raw", "") or "")[:1500]
    if err == "foundry_compile_failed_P":
        return {"diag_kind": "did_not_compile", "COMPILER_ERROR": p_raw or err, "FORGE_LOG": p_raw}
    if err == "foundry_compile_failed_M":
        return {"diag_kind": "did_not_compile", "COMPILER_ERROR": m_raw or err, "FORGE_LOG": m_raw}
    if err in ("foundry_fuzz_failed_on_P", "foundry_regression_failed_on_P"):
        if getattr(config, "revert_aware_p_diag", False) and _p_side_reverted(p_raw):
            return {"diag_kind": "reverts_on_original", "FORGE_LOG": p_raw or err,
                    "COMPILER_ERROR": p_raw}
        return {"diag_kind": "fails_on_original", "FORGE_LOG": p_raw or err, "COMPILER_ERROR": p_raw}
    if err == "foundry_setup_failed_P":
        return {"diag_kind": "setup_failed", "FORGE_LOG": p_raw or err, "COMPILER_ERROR": p_raw}
    if err in ("foundry_regression_passed_on_M", "foundry_fuzz_passed_on_M"):
        return {"diag_kind": "holds_on_modified", "FORGE_LOG": m_raw or err, "COMPILER_ERROR": m_raw}
    return {"diag_kind": "inconclusive", "FORGE_LOG": (m_raw or p_raw or err), "COMPILER_ERROR": m_raw}


@functools.lru_cache(maxsize=8)
def _surface_cached(solc_bin: str, source: str, contract: str) -> str:
    from invmut.agents.surface import build_block
    return build_block(solc_bin, source, contract) or ""


@functools.lru_cache(maxsize=8)
def _setup_cached(solc_bin: str, source: str, contract: str) -> str:
    from invmut.agents.surface import build_setup_block
    return build_setup_block(solc_bin, source, contract) or ""


def _prune_imports(rc, tcand) -> None:
    if not getattr(getattr(rc, "config", None), "import_file_level_types", False):
        return
    code = getattr(tcand, "test_code", None)
    if not code:
        return
    from invmut.render.foundry import prune_import_symbols
    pruned = prune_import_symbols(code)
    if pruned != code:
        try:
            tcand.test_code = pruned
        except Exception:
            pass


def _file_types(rc) -> str:
    if not getattr(getattr(rc, "config", None), "import_file_level_types", False):
        return ""
    from invmut.agents.prompts import file_level_types
    return ", ".join(file_level_types(rc.p_source, rc.contract))


def _sig_cheats(rc) -> frozenset:
    return _VM_SIG_CHEATS if getattr(getattr(rc, "config", None), "signature_cheatcodes", False) else frozenset()


def _public_surface(rc) -> str:
    parts = []
    if getattr(rc.config, "public_surface_block", False):
        parts.append(_surface_cached(rc.config.solc_bin, rc.p_source, rc.contract))
    if getattr(rc.config, "required_setup_block", False):
        parts.append(_setup_cached(rc.config.solc_bin, rc.p_source, rc.contract))
    return "\n".join(x for x in parts if x)


@functools.lru_cache(maxsize=64)
def _struct_getters(solc_bin: str, source: str, contract: str) -> tuple:
    try:
        blk = _surface_cached(solc_bin, source, contract)
    except Exception:
        return ()
    out = []
    for line in (blk or "").splitlines():
        if "TUPLE" not in line:
            continue
        m = re.search(r"function\s+(\w+)\(address\)[^)]*returns\s*\(([^)]*)\)", line)
        if m:
            out.append((m.group(1), tuple(p.strip().split()[-1] for p in m.group(2).split(","))))
    return tuple(out)


def _fix_struct_getter_members(rc, test_code: str) -> str:
    if not getattr(rc.config, "struct_getter_member_rewrite", False):
        return test_code
    getters = {n: list(ms) for n, ms in _struct_getters(rc.config.solc_bin, rc.p_source, rc.contract)}
    if not getters:
        return test_code
    try:
        new, n = rewrite_struct_getter_members(test_code, getters)
    except Exception:
        return test_code
    return new if n else test_code


def _prepare_llm_test(rc, test_code: str) -> str:
    out = _fix_struct_getter_members(rc, test_code)
    if getattr(rc.config, "llm_vm_addr_key_bound", False):
        try:
            out, _n = bound_vm_addr_keys(out)
        except Exception:
            pass
    if getattr(rc.config, "rename_reserved_identifiers", False):
        try:
            out, _n = rename_reserved_identifiers(out)
        except Exception:
            pass
    if getattr(rc.config, "lowlevel_call_rewrite", False):
        try:
            out, _n = rewrite_lowlevel_handle_calls(out)
        except Exception:
            pass
    if getattr(rc.config, "llm_value_param_cap", False):
        try:
            out, _n = bound_llm_value_params(out)
        except Exception:
            pass
    if getattr(rc.config, "rename_harness_shadowing", False):
        try:
            from invmut.render.foundry import rename_harness_shadowing
            out, _n = rename_harness_shadowing(out)
        except Exception:
            pass
    if getattr(rc.config, "payable_contract_cast", False):
        try:
            from invmut.render.foundry import payable_contract_casts
            out, _n = payable_contract_casts(out, rc.p_source)
        except Exception:
            pass
    return out


def _esbmc_verify_optional(rc, test_code: str) -> None:
    try:
        t = rc.config.verifier.timeout_seconds_per_call
        wall = rc.fuzz_deadline if rc.fuzz_deadline is not None else rc.mutation_deadline
        if wall is not None:
            remaining = wall - time.time()
            if remaining < 15:
                return
            t = min(t, max(5, int(remaining / 2)))
        from invmut.verify.foundry_esbmc import verify_holds_best
        verify_holds_best(rc.config, test_code, rc.p_source, timeout_s=t)
    except Exception:
        pass


def run_unit_llm_only(rc: RunContext) -> UnitResult:
    res = UnitResult()
    compile_fn = make_solc_compile_fn(rc.config)
    mm = MutationMemory()
    seen_change_hashes: set = set()
    sv = _solc_version(rc.config)
    construction = prep.render_construction_expr(rc.construction, rc.contract)
    diff_counter = 0
    contract_code = rc.prompt_source or rc.p_source

    _targets = rc.doc1.get("targets", [])
    for _t_idx, tjson in enumerate(_targets):
        if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
            res.mutation_deadline_hit = True
            break
        target_deadline = None
        if getattr(rc.config, "fair_share_targets", False) and rc.mutation_deadline is not None:
            _now = time.time()
            target_deadline = _now + (rc.mutation_deadline - _now) / (len(_targets) - _t_idx)
        target_id = tjson.get("id")
        editable_units = prep.render_editable_units(tjson)
        goal = prep.render_goal(tjson)
        boundaries = prep.boundaries_of(tjson)
        boundary = boundaries[0]
        try:
            attempt = MA.propose_llm_mutants(
                rc.client, contract_code=contract_code, editable_units=editable_units, goal=goal,
                boundaries=", ".join(boundaries),
                max_json_retries=rc.config.max_json_retries_per_call,
                model=(rc.spec.mutant_model or rc.spec.model), thinking=rc.spec.thinking)
        except LLMInfraError as e:
            res.infra_aborted = True
            res.infra_reason = e.kind
            rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
            return res
        _acc_tokens(res, attempt)
        if not attempt.parse_ok:
            res.mutation_records.append({"target_id": target_id, "outcome": "json_parse_error"})
            rc.emit(event="mutation", target_id=target_id, outcome="json_parse_error")
            continue

        for cand_raw in attempt.candidates:
            if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
                res.mutation_deadline_hit = True
                break
            if target_deadline is not None and time.time() >= target_deadline:
                rc.emit(event="mutation", target_id=target_id,
                        outcome="fair_share_advance")
                break
            cand0 = Candidate(target_id, cand_raw.unit_id, cand_raw.operation,
                              cand_raw.change_summary, cand_raw.mutated_unit_code)
            drop = _accept_mutant(rc, res, tjson, target_id, boundary, cand0, mm,
                                  seen_change_hashes, compile_fn)
            if drop is None:
                continue
            cand, m_source = drop
            diff_counter += 1
            diff_id = f"L{diff_counter:04d}"
            try:
                _run_llm_test_loop(
                    rc, res, tjson, cand, m_source, boundary, goal, diff_id, sv, construction)
            except LLMInfraError as e:
                res.infra_aborted = True
                res.infra_reason = e.kind
                rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
                return res
    return res


def _accept_mutant(rc, res, tjson, target_id, boundary, cand, mm, seen_change_hashes, compile_fn):
    s0 = st.stage0_dedup(cand, seen_change_hashes)
    if not s0.passed:
        mm.add(cand.unit_id, None, cand.mutated_unit_code, cand.change_summary,
               Outcome.DUPLICATE_EXACT_CHANGE)
        res.mutation_records.append({"target_id": target_id, "boundary": boundary,
                                     "unit_id": cand.unit_id, "outcome": "duplicate_exact_change"})
        rc.emit(event="mutation", target_id=target_id, boundary=boundary, outcome="duplicate_exact_change")
        return None
    seen_change_hashes.add(s0.detail["change_hash"])

    unit_record = _unit_record(tjson, cand.unit_id)
    s1, m_source = st.stage1_build_compile(cand, rc.p_source, unit_record, compile_fn)
    if not s1.passed:
        reason = (s1.detail.get("reason") or "did_not_compile") if s1.detail else s1.outcome
        mm.add(cand.unit_id, None, cand.mutated_unit_code, cand.change_summary, s1.outcome)
        res.mutation_records.append({"target_id": target_id, "boundary": boundary, "unit_id": cand.unit_id,
                                     "outcome": s1.outcome, "reason": str(reason)[:200]})
        rc.emit(event="mutation", target_id=target_id, boundary=boundary, outcome=s1.outcome)
        return None

    s2 = st.stage2_format_check(cand, s1.detail["original_unit_text"], cand.mutated_unit_code,
                                unit_kind=(unit_record or {}).get("kind", "function"))
    if not s2.passed:
        mm.add(cand.unit_id, None, cand.mutated_unit_code, cand.change_summary, s2.outcome)
        res.mutation_records.append({"target_id": target_id, "boundary": boundary, "unit_id": cand.unit_id,
                                     "outcome": s2.outcome, "reason": str((s2.detail or {}).get("reason"))[:200]})
        rc.emit(event="mutation", target_id=target_id, boundary=boundary, outcome=s2.outcome)
        return None

    mm.add(cand.unit_id, None, cand.mutated_unit_code, cand.change_summary, Outcome.VISIBLE_DIFFERENCE)
    res.mutation_records.append({"target_id": target_id, "boundary": boundary, "unit_id": cand.unit_id,
                                 "outcome": "llm_only_accepted"})
    rc.emit(event="mutation", target_id=target_id, boundary=boundary, outcome="llm_only_accepted")
    return cand, m_source


def _run_llm_test_loop(rc, res, tjson, cand, m_source, boundary, goal, diff_id, sv, construction,
                       origin="llm_only", construction_body=None, construction_decls=None):
    if construction_body is None:
        construction_body = prep.render_construction_body(rc.construction, rc.contract)
    if construction_decls is None:
        construction_decls = prep.render_construction_decls(rc.construction)
    tm = TestMemory()
    ri = RenderInput(bundle={}, c_scope_source=rc.p_source, m_scope_source=m_source,
                     import_path=rc.import_path, pragma=rc.pragma, contract_name=rc.contract)
    budget = rc.test_attempts or rc.config.max_test_attempts_per_confirmed_difference
    attempt = None
    for i in range(budget):
        if attempt is None:
            attempt = TA.propose_llm_test(
                rc.client, contract_code=(rc.prompt_source or rc.p_source), contract_name=rc.contract,
                change=cand.change_summary, modified_unit_code=cand.mutated_unit_code, goal=goal,
                boundary=boundary, import_path=rc.import_path, pragma=rc.pragma, construction=construction,
                construction_body=construction_body, construction_decls=construction_decls,
                test_memory=tm.render(), public_surface=_public_surface(rc),
                observer_helper=bool(getattr(rc.config, 'external_observer_helper', False)),
                live_callback=bool(getattr(rc.config, 'reentrancy_live_callback', False)), sig_cheats=bool(getattr(rc.config, 'signature_cheatcodes', False)), file_types=_file_types(rc), max_json_retries=rc.config.max_json_retries_per_call,
                model=rc.spec.model, thinking=rc.spec.thinking)
        _acc_tokens(res, attempt)
        if not attempt.parse_ok:
            rec = {"difference_id": diff_id, "boundary": boundary, "outcome": "json_parse_error",
                   "origin": origin}
            res.test_records.append(rec)
            if rc.attempt_sink:
                rc.attempt_sink(rec)
            attempt = None
            continue
        tcand = attempt.candidate
        _prune_imports(rc, tcand)

        cheat = _llm_cheat_reject(tcand.test_code, _sig_cheats(rc))
        if cheat is not None:
            rec = {"difference_id": diff_id, "boundary": boundary, "outcome": "cheat_rejected",
                   "reason": cheat, "test_code": tcand.test_code,
                   "property_summary": tcand.property_summary, "origin": origin}
            res.test_records.append(rec)
            if rc.attempt_sink:
                rc.attempt_sink(rec)
            tm.add(tcand.property_summary, "cheat_rejected:" + cheat)
            rc.emit(event="test", difference_id=diff_id, boundary=boundary,
                    outcome="cheat_rejected", reason=cheat)
            if i == budget - 1:
                return None
            attempt = TA.reflect_llm_test(
                rc.client, contract_code=(rc.prompt_source or rc.p_source), contract_name=rc.contract,
                change=cand.change_summary, modified_unit_code=cand.mutated_unit_code, goal=goal,
                boundary=boundary, import_path=rc.import_path, pragma=rc.pragma, construction=construction,
                construction_body=construction_body, construction_decls=construction_decls,
                test_memory=tm.render(), public_surface=_public_surface(rc),
                observer_helper=bool(getattr(rc.config, 'external_observer_helper', False)),
                live_callback=bool(getattr(rc.config, 'reentrancy_live_callback', False)), sig_cheats=bool(getattr(rc.config, 'signature_cheatcodes', False)), file_types=_file_types(rc), diag_kind="cheat_rejected", FORGE_LOG=cheat, COMPILER_ERROR=cheat,
                max_json_retries=rc.config.max_json_retries_per_call,
                model=rc.spec.model, thinking=rc.spec.thinking)
            continue

        tcand.test_code = _prepare_llm_test(rc, tcand.test_code)
        root = tempfile.mkdtemp(prefix="invmut_llmonly_")
        try:
            verdict, p_log, m_log = _validate_rendered(
                rc.config, ri, tcand.test_code,
                _TEST_NAME, root, sv, force_pm=True, fuzz_runs=1)
        finally:
            import shutil
            shutil.rmtree(root, ignore_errors=True)

        accepted = verdict.status == "passed" and _llm_strict_ok(verdict.p_outcome, verdict.m_outcome)
        out = "accepted" if accepted else ("not_sound_witness" if verdict.status == "passed"
                                           else verdict.status)
        rec = {"difference_id": diff_id, "boundary": boundary, "outcome": out,
               "reason": verdict.error, "test_code": tcand.test_code,
               "property_summary": tcand.property_summary, "origin": origin,
               "p_diagnostic": forge_diagnostic(verdict.p_outcome),
               "m_diagnostic": forge_diagnostic(verdict.m_outcome)}
        res.test_records.append(rec)
        if rc.attempt_sink:
            rc.attempt_sink(rec)
        tm.add(tcand.property_summary, verdict.error or out)
        rc.emit(event="test", difference_id=diff_id, boundary=boundary, outcome=out, reason=verdict.error)

        if accepted:
            acc = AcceptedTest(
                tjson.get("id"), cand.unit_id, diff_id, tcand.property_summary,
                tcand.test_code, "rendered", "passed", esbmc_test_source=None,
                validation_error=None,
                workspace_P_log=p_log, workspace_M_log=m_log,
                mutated_unit_code=cand.mutated_unit_code, change_summary=cand.change_summary,
                origin=origin)
            res.accepted_tests.append(acc)
            _esbmc_verify_optional(rc, tcand.test_code)
            rc.emit(event="accepted", difference_id=diff_id, render_status="rendered",
                    validation_status="passed", validation_error=None)
            return acc

        diag = _llm_test_diag(verdict, rc.config)
        if diag is None:
            diag = {"diag_kind": "not_sound_witness", "FORGE_LOG": (m_log or p_log or "")[:1500],
                    "COMPILER_ERROR": ""}
        if i == budget - 1:
            return None
        dk = diag.pop("diag_kind")
        attempt = TA.reflect_llm_test(
            rc.client, contract_code=(rc.prompt_source or rc.p_source), contract_name=rc.contract,
            change=cand.change_summary, modified_unit_code=cand.mutated_unit_code, goal=goal,
            boundary=boundary, import_path=rc.import_path, pragma=rc.pragma, construction=construction,
                construction_body=construction_body, construction_decls=construction_decls,
            test_memory=tm.render(), public_surface=_public_surface(rc),
                observer_helper=bool(getattr(rc.config, 'external_observer_helper', False)),
                live_callback=bool(getattr(rc.config, 'reentrancy_live_callback', False)), sig_cheats=bool(getattr(rc.config, 'signature_cheatcodes', False)), file_types=_file_types(rc), diag_kind=dk,
            max_json_retries=rc.config.max_json_retries_per_call,
            model=rc.spec.model, thinking=rc.spec.thinking, **diag)
    return None


run_unit_concrete = run_unit_llm_only
