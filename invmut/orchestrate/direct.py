"""Direct property-based testing: run_mode `direct_pbt` (RQ1 Direct-PBT) and `no_mg` (RQ3 ablation,
"no mutation guide").

Both arms write property-based tests for the patched contract P WITHOUT mutants: no mutant, no
counterexample, no Break(M,T). One THREAD writes one test:

    propose -> compile/shape -> Hold(P,T) -> Reach(P,T) -> render Foundry -> P-pass (forge on P)
            -> accept -> V-score (the kill check against the real bug)

with up to `max_test_attempts_per_confirmed_difference` attempts (the same per-difference budget Full's
test loop has: one proposal plus reflections). A thread ends on an accepted test or when its attempts are
spent; the next thread starts, until the generation deadline (rc.fuzz_deadline, the same 0.85 T wall Full
generates under).

  direct_pbt  no focus. The model sees P, the PBT template, the rules already accepted in this cell and the
              rules already tried in the current thread.
  no_mg       the property focus of Full: the (target y, boundary x) cells, in Full's walk order (targets
              round-robin, walked again and again until the generation deadline), each phrased about P
              alone. One thread per cell.

V-score: with config.direct_score_inline (default true) each accepted test is scored against the real bug
right after acceptance, with the same _score_kills Full uses (ESBMC against the bug, then the Foundry
differential), bounded by the cell's scoring deadline; false = score everything at the end (run_case does
that for unscored tests). config.direct_stop_on_kill: once a test counts as a kill AND the official gate's
bug side reproduces it (_bug_confirms), the cell stops generating -- its outcome is decided.
no_mg walks its focus list again and again until the generation deadline (no pass cap).
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import os
import re
import shutil
import tempfile
import time
from typing import Optional

from invmut.agents import prompts
from invmut.agents import test_agent as TA
from invmut.agents.client import LLMDeadline, LLMInfraError
from invmut.agents.memory import TestMemory
from invmut.orchestrate import prep
from invmut.esbmc.runner import make_run_fn
from invmut.mutation.compile import make_solc_compile_fn
from invmut.orchestrate.run import (AcceptedTest, RunContext, UnitResult, _acc_tokens, _reach_verdict,
                                    _solc_version_for, _trim_cex)
from invmut.render import RenderInput, render_only
from invmut.render.pipeline import _BASENAME, _LADDER, _stack_too_deep
from invmut.render.validate import forge_diagnostic, run_forge
from invmut.render.workspace import build_workspace
from invmut.verify.verify import verify_test_on_p

_ORDER_FLAGS = ("mutation_state_writers_first", "mutation_external_call_units_first",
                "mutation_non_view_boundaries_first")


def _fns(rc: RunContext):
    """The ESBMC run_fn and solc compile_fn. NOT run._vctx: that also precomputes Full's R1 differential
    baseline on P (an ESBMC run these arms never use) inside the timed budget."""
    f = getattr(rc, "_direct_fns", None)
    if f is None:
        f = rc._direct_fns = (make_run_fn(rc.config), make_solc_compile_fn(rc.config))
    return f


_WS = re.compile(r"\s+")


def _norm_test(src: str) -> str:
    s = re.sub(r"/\*.*?\*/", "", src or "", flags=re.S)
    s = re.sub(r"//[^\n]*", "", s)
    return _WS.sub(" ", s).strip()


def test_hash(src: str) -> str:
    """Fingerprint of a test with comments and whitespace removed: the duplicate check of the
    accepted-test memory (the model is told not to repeat; this makes it a rule, not a request)."""
    return hashlib.sha256(_norm_test(src).encode()).hexdigest()[:16]


def assert_fingerprint(src: str) -> Optional[str]:
    """The normalized text of the test's LAST assert(...) -- recorded for analysis, never a gate."""
    t = _norm_test(src)
    ms = list(re.finditer(r"\bassert\s*\(", t))
    if not ms:
        return None
    i, d = ms[-1].end() - 1, 0
    for j in range(i, len(t)):
        d += (t[j] == "(") - (t[j] == ")")
        if d == 0:
            return hashlib.sha256(t[i:j + 1].replace(" ", "").encode()).hexdigest()[:16]
    return None


def focus_order(rc: RunContext, res: Optional[UnitResult] = None) -> list:
    """Full's focus walk for one pass: the (target, boundary) cells of _mutation_phase, targets
    round-robin in doc1 order, a cell skipped exactly when Full skips it (no qualifying boundary / the
    boundary is not an editable unit). The three optional reorderings of _mutation_phase are not
    reproduced here, so a config that turns one on is refused rather than silently diverging."""
    on = [f for f in _ORDER_FLAGS if getattr(rc.config, f, False)]
    if on:
        raise NotImplementedError(f"no_mg does not reproduce the focus reordering {on}")
    queues = []
    for tjson in rc.doc1.get("targets", []):
        cells = prep.cell_boundaries(tjson)
        if not cells:
            if res is not None:
                res.mutation_records.append({"target_id": tjson.get("id"), "outcome": "no_qualifying_boundary"})
            continue
        queues.append((tjson, list(cells)))
    order = []
    while any(c for _, c in queues):
        for t, c in queues:
            if c:
                order.append((t, c.pop(0)))
    out = []
    for tjson, x in order:
        editable = prep.render_editable_units_for_boundary(
            tjson, x, rc.p_source, include_internal=getattr(rc.config, "editable_internal_units", False),
            with_statements=bool(getattr(rc.config, "mutate_statement_coverage", False)))
        if editable is None:
            continue
        out.append((tjson, x))
    return out


def _forge_gate(rc: RunContext, source: str, rendered_test: str, test_name: str,
                until: Optional[float] = None):
    """Run the rendered test against `source` in Foundry at the OFFICIAL gate's regime when
    verifier.accept_gate_* is set (runs, seed, FOUNDRY_FUZZ_MAX_TEST_REJECTS), else the pipeline's own;
    forge timeout config.direct_p_pass_timeout_s, capped by the time left before `until`. Walks the
    stack-too-deep ladder. Returns the ForgeOutcome."""
    v = rc.config.verifier
    runs = int(getattr(v, "accept_gate_fuzz_runs", 0) or 0) or v.forge_fuzz_runs
    seed = int(getattr(v, "accept_gate_fuzz_seed", 0) or 0) or v.forge_fuzz_seed
    rej = int(getattr(v, "accept_gate_max_test_rejects", 0) or 0)
    tmo = int(getattr(rc.config, "direct_p_pass_timeout_s", 0) or 0) or v.forge_per_test_timeout_s
    if until is not None:
        tmo = max(5, min(tmo, int(until - time.time())))
    cfg = dataclasses.replace(rc.config, verifier=dataclasses.replace(v, forge_per_test_timeout_s=tmo))
    sv = _solc_version_for(rc)
    root = tempfile.mkdtemp(prefix="invmut_ppass_")
    prev = os.environ.get("FOUNDRY_FUZZ_MAX_TEST_REJECTS")
    if rej > 0:
        os.environ["FOUNDRY_FUZZ_MAX_TEST_REJECTS"] = str(rej)
    try:
        ws = os.path.join(root, "workspace_P")

        def _bf(via_ir, optimizer=None):
            build_workspace(ws, source, _BASENAME, rendered_test, cfg.forge_std_path,
                            solc_version=sv, fuzz_runs=runs, fuzz_seed=hex(seed), via_ir=via_ir,
                            optimizer=optimizer)
            return run_forge(cfg, ws, test_name)

        po = _bf(False)
        for via, opt in _LADDER:
            if not _stack_too_deep(po):
                break
            po = _bf(via, opt)
    finally:
        if rej > 0:
            if prev is None:
                os.environ.pop("FOUNDRY_FUZZ_MAX_TEST_REJECTS", None)
            else:
                os.environ["FOUNDRY_FUZZ_MAX_TEST_REJECTS"] = prev
        shutil.rmtree(root, ignore_errors=True)
    return po


_ASSUME_LIMIT = "`vm.assume` rejected too many inputs"   # scripts/run_tests.py: such a FAIL is no verdict


def _p_pass(rc: RunContext, rendered_test: str, test_name: str, until: Optional[float] = None):
    """The accepted test must pass on P at the gate's regime. Returns (ok, reason, outcome)."""
    po = _forge_gate(rc, rc.p_source, rendered_test, test_name, until)
    if po.kind == "compile_failed":
        return False, "foundry_compile_failed_P", po
    if po.kind == "setup_failed":
        return False, "foundry_setup_failed_P", po
    if po.kind != "ran":
        return False, f"foundry_{po.kind}_P", po
    if po.any_failure(("testFuzz_", "testRegression_")):
        return False, "foundry_fuzz_failed_on_P", po
    if po.status_of("testFuzz_") != "Success" and po.status_of("testRegression_") != "Success":
        return False, "foundry_test_did_not_run_P", po
    return True, None, po


def _diag_of(vr: dict) -> tuple[str, dict]:
    """(diag_kind, fields) for a rejected P-only verification."""
    r = vr.get("reason") or vr.get("outcome")
    v = vr.get("verifier") or {}
    if r in ("did_not_compile", "harness_compile_failed"):
        return "did_not_compile", {"COMPILER_ERROR": (vr.get("compiler_error") or r)[:1500]}
    if r == "malformed_test":
        return "malformed_test", {"FORM_REASON": vr.get("compiler_error") or "a call on c was not a top-level statement"}
    if r == "uses_msg_value":
        return "uses_msg_value", {}
    if r in ("construction_unknown", "construction_value_unknown"):
        return "wrong_form", {"FORM_REASON": r}
    if vr.get("outcome") == "fails_on_original":
        loc = v.get("hold_failure_location") or {}
        return "fails_on_original", {"WHERE": f" (line {loc.get('line')})" if loc.get("line") else "",
                                     "COUNTEREXAMPLE": _trim_cex(v.get("hold_counterexample"))}
    if r == "non_target_failure_on_original":
        loc = v.get("hold_failure_location") or {}
        fn = loc.get("function") or ""
        claim = (v.get("hold_violated_property") or "").replace("\n", " | ")[:300]
        where = (f"an assert inside c's function `{fn}`" if fn and fn != "run" and not fn.startswith("_ESBMC")
                 else (f"line {loc.get('line')} of your own test body" if loc.get("line") else "your test body"))
        return "non_target_failure", {"FAIL_WHERE": where + (f" (checker claim: {claim})" if claim else "")}
    if str(r).startswith("oracle_unreachable"):
        return "unreachable", {}
    return "inconclusive", {}


def _record(rc: RunContext, res: UnitResult, rec: dict) -> None:
    res.test_records.append(rec)
    if rc.attempt_sink:
        rc.attempt_sink(rec)


def _bug_confirms(rc: RunContext, rendered_test: str, test_name: str, until: Optional[float]) -> tuple:
    """Would the official gate see this test fail on the real bug? The gate's bug side at the gate's
    regime (runs, seed, reject budget), on the renamed bug source: a property FAIL that is not the
    vm.assume give-up, or a compile failure, is what scripts/run_tests._verdict counts as `correct`
    (the fix side already passed at the same regime in _p_pass). Returns (confirmed, detail)."""
    ctx = getattr(rc, "direct_score", None) or {}
    bo = _forge_gate(rc, ctx["bug_c"], rendered_test, test_name, until)
    if bo.kind == "compile_failed":
        return True, "bug_compile_failed"
    if bo.kind != "ran":
        return False, f"bug_{bo.kind}"
    for name, tr in (bo.tests or {}).items():
        if name.startswith(("testFuzz_", "testRegression_")) and tr.get("status") == "Failure":
            why = str(tr.get("reason") or "")
            return (_ASSUME_LIMIT not in why), ("assume_limit" if _ASSUME_LIMIT in why else "bug_fail")
    return False, "bug_pass"


def _score_now(rc: RunContext, res: UnitResult, acc: AcceptedTest) -> Optional[dict]:
    """V-score one accepted test right after acceptance with the harness's own scoring, bounded by the
    cell's scoring deadline (harness._score_until; lazy import: harness imports us). Read-only: nothing
    it finds is fed back to generation."""
    ctx = getattr(rc, "direct_score", None)
    if not ctx:
        return None
    from invmut.dataset.harness import _score_until
    t = time.time()
    _acc, _nv, kills, n_killing, kill_by_diff = _score_until(
        rc.config, [acc], rc.p_source, ctx["bug_c"], rc.construction, ctx["solc_version"], ctx["deadline"])
    k = kills[0] if kills else None
    res.inline_scored.append({"difference_id": acc.difference_id, "kills": kills, "n_killing": n_killing,
                              "kill_by_diff": kill_by_diff, "score_s": round(time.time() - t, 1)})
    return k


def _thread(rc: RunContext, res: UnitResult, tid: str, focus: Optional[str], boundary: Optional[str],
            target_id: Optional[str], accepted_memory: list, accepted_hashes: set, deadline: float,
            t0: float, focus_id: Optional[dict] = None) -> Optional[AcceptedTest]:
    tm = TestMemory()
    budget = rc.test_attempts or rc.config.max_test_attempts_per_confirmed_difference
    cc = rc.prompt_source or rc.p_source
    prev_test, diag_kind, diag = None, None, {}
    for i in range(budget):
        if time.time() >= deadline:
            _record(rc, res, {"difference_id": tid, "outcome": "abandoned", "reason": "generation_deadline",
                              "attempt": i, "t_rel": round(time.time() - t0, 1)})
            return None
        t_call = time.time()
        try:
          attempt = TA.propose_pbt(
            rc.client, contract_code=cc, contract_name=rc.contract, focus=focus, boundary=boundary,
            accepted_memory="\n".join(f"- {p}" for p in accepted_memory), test_memory=tm.render(),
            previous_test=prev_test, diag_kind=diag_kind,
            max_json_retries=rc.config.max_json_retries_per_call, model=rc.spec.model,
            thinking=rc.spec.thinking, **diag)
        except LLMDeadline:
            # the LLM request could not finish before the cell's scoring deadline: end this thread; the
            # cell then scores what it has and writes its result instead of being hard-killed
            _record(rc, res, {"difference_id": tid, "outcome": "abandoned", "reason": "llm_deadline",
                              "attempt": i, "t_rel": round(time.time() - t0, 1)})
            return None
        _acc_tokens(res, attempt)
        llm = {"calls": len(attempt.llm_results),
               "prompt": sum(r.prompt_tokens for r in attempt.llm_results),
               "cached": sum(getattr(r, "prompt_cache_hit_tokens", 0) for r in attempt.llm_results),
               "completion": sum(r.completion_tokens for r in attempt.llm_results),
               "llm_s": round(time.time() - t_call, 1)}
        base = {"difference_id": tid, "arm": rc.config.run_mode, "focus": focus_id, "thread_focus": focus,
                "boundary": boundary, "target_id": target_id, "attempt": i,
                "prompt_kind": attempt.prompt_label, "diag_kind": diag_kind, "llm": llm,
                "t_start_rel": round(t_call - t0, 1)}
        if not attempt.parse_ok:
            _record(rc, res, {**base, "outcome": "json_parse_error", "t_rel": round(time.time() - t0, 1)})
            prev_test, diag_kind, diag = None, None, {}
            continue
        _sdl = (getattr(rc, "direct_score", None) or {}).get("deadline")
        if _sdl is not None and time.time() >= _sdl:
            # the attempt started before the generation deadline but its LLM call ran into the scoring
            # window's end: verifying it now could only push the cell past the hard wall
            _record(rc, res, {**base, "outcome": "abandoned", "reason": "score_deadline",
                              "t_rel": round(time.time() - t0, 1)})
            return None
        tc = attempt.candidate
        th = test_hash(tc.test_code)
        base.update(test_hash=th, assert_fingerprint=assert_fingerprint(tc.test_code))
        if th in accepted_hashes:
            # the same test (comments/whitespace aside) as one already accepted in this cell
            _record(rc, res, {**base, "outcome": "duplicate_accepted", "test_code": tc.test_code,
                              "property_summary": tc.property_summary, "t_rel": round(time.time() - t0, 1)})
            rc.emit(event="test", difference_id=tid, outcome="duplicate_accepted", reason=None)
            tm.add(tc.property_summary, "duplicate_accepted")
            prev_test, diag_kind, diag = tc.test_code, "duplicate", {}
            continue
        t_v = time.time()
        run_fn = _fns(rc)[0]
        if _sdl is not None and _sdl - time.time() < rc.config.verifier.timeout_seconds_per_call:
            # near the end of the cell: one verification can run several ESBMC queries (Hold, its
            # bound bump, Reach, the narrowing rung), so cap each so the whole attempt ends before the
            # scoring deadline instead of the launcher's hard kill voiding the cell
            run_fn = make_run_fn(rc.config, timeout_s=max(3, int((_sdl - time.time()) / 5)))
            base["esbmc_timeout_capped"] = True
        vr = verify_test_on_p(rc.config, rc.p_source, tc.test_code, rc.construction,
                              run_fn=run_fn, compile_fn=_fns(rc)[1])
        v = vr.get("verifier") or {}
        rec = {**base, "outcome": vr["outcome"], "reason": vr.get("reason"), "test_code": tc.test_code,
               "property_summary": tc.property_summary, "compiler_error": vr.get("compiler_error") or None,
               "verifier": {k: v.get(k) for k in ("hold_result", "hold_failure_location",
                                                  "hold_violated_property", "hold_s", "reach_result", "reach_s")},
               "verify_s": round(time.time() - t_v, 1)}
        tm.add(tc.property_summary, vr.get("reason") or vr["outcome"])
        rc.emit(event="test", difference_id=tid, outcome=vr["outcome"], reason=vr.get("reason"))
        if vr["outcome"] != "accepted":
            rec["t_rel"] = round(time.time() - t0, 1)
            _record(rc, res, rec)
            prev_test = tc.test_code
            diag_kind, diag = _diag_of(vr)
            continue
        # render + P-pass
        t_r = time.time()
        ri = RenderInput(bundle=vr["accepted_bundle"], c_scope_source=rc.p_source, m_scope_source=rc.p_source,
                         import_path=rc.import_path, pragma=rc.pragma, contract_name=rc.contract)
        rres = render_only(rc.config, ri)
        if rres.render_status != "rendered" or not rres.rendered_test:
            rec.update(outcome="render_error", reason=rres.render_error, render_s=round(time.time() - t_r, 1),
                       t_rel=round(time.time() - t0, 1))
            _record(rc, res, rec)
            rc.emit(event="test", difference_id=tid, outcome="render_error", reason=rres.render_error)
            prev_test, diag_kind, diag = tc.test_code, "inconclusive", {}
            continue
        t_p = time.time()
        rec["render_s"] = round(t_p - t_r, 1)
        _until = (getattr(rc, "direct_score", None) or {}).get("deadline")
        ok, why, po = _p_pass(rc, rres.rendered_test, rres.test_name or "InvMutTest", until=_until)
        rec["p_pass_s"] = round(time.time() - t_p, 1)
        rec["p_diagnostic"] = forge_diagnostic(po)
        if not ok:
            rec.update(outcome="validation_error", reason=why, rendered_test=rres.rendered_test,
                       t_rel=round(time.time() - t0, 1))
            _record(rc, res, rec)
            rc.emit(event="test", difference_id=tid, outcome="validation_error", reason=why)
            prev_test, diag_kind = tc.test_code, "not_accepted_foundry"
            diag = {"FORGE_LOG": (forge_diagnostic(po) or why)[:1500]}
            continue
        acc = AcceptedTest(target_id, None, tid, tc.property_summary, rres.rendered_test, "rendered", "passed",
                           esbmc_test_source=vr["accepted_bundle"].get("esbmc_test_source"),
                           workspace_P_log=(po.raw or "")[-4000:], llm_test_source=tc.test_code,
                           oracle_reach=_reach_verdict(vr),
                           confirmed_difference={"validation_level": "reference_validated",
                                                 "arm": rc.config.run_mode, "focus": focus_id,
                                                 "thread_focus": focus, "boundary": boundary,
                                                 "target_id": target_id, "test_hash": th,
                                                 "assert_fingerprint": base["assert_fingerprint"]})
        res.accepted_tests.append(acc)
        accepted_memory.append(tc.property_summary)
        accepted_hashes.add(th)
        rc.emit(event="accepted", difference_id=tid, render_status="rendered", validation_status="passed",
                validation_error=None)
        rec["t_accept_rel"] = round(time.time() - t0, 1)
        if getattr(rc.config, "direct_score_inline", True):
            k = _score_now(rc, res, acc)
            rec["v_score"] = ({x: k.get(x) for x in ("kill", "kill_via", "counts_toward_success")}
                              if k else None)
            rec["score_s"] = res.inline_scored[-1]["score_s"] if res.inline_scored else None
            if k and k.get("counts_toward_success") and getattr(rc.config, "direct_stop_on_kill", False):
                # the cell's outcome is decided once a kill that the official gate should also see is
                # in hand: stop generating. A kill the gate regime does not reproduce keeps the cell going.
                t_c = time.time()
                ok_c, why_c = _bug_confirms(rc, rres.rendered_test, rres.test_name or "InvMutTest",
                                            (getattr(rc, "direct_score", None) or {}).get("deadline"))
                rec["gate_confirm"] = {"confirmed": ok_c, "detail": why_c, "s": round(time.time() - t_c, 1)}
                if ok_c:
                    rc.direct_stop = {"difference_id": tid, "t_rel": round(time.time() - t0, 1)}
                    rc.emit(event="stop_on_kill", difference_id=tid, detail=why_c)
        rec["t_rel"] = round(time.time() - t0, 1)
        _record(rc, res, rec)
        return acc
    return None


def _focus_id(tjson: dict, x: str, index: int) -> dict:
    """The complete identity of one focus cell, recorded on every attempt and accepted test."""
    tgt = tjson.get("target", {}) or {}
    locus = tgt.get("locus", {}) or {}
    return {"index": index, "target_id": tjson.get("id"), "boundary": x, "category": tjson.get("category"),
            "locus": locus.get("canonical_name") or locus.get("name") or locus.get("signature"),
            "state_kind": (tgt.get("state_type", {}) or {}).get("kind")}


def _dump_focus(rc: RunContext, ids: list) -> None:
    d = getattr(rc, "artifact_dir", None)
    if not d:
        return
    try:
        with open(os.path.join(d, "focus_order.json"), "w") as f:
            json.dump(ids, f, indent=1)
    except OSError:
        pass


def run_unit_direct(rc: RunContext, focus: bool) -> UnitResult:
    """direct_pbt (focus=False) / no_mg (focus=True). Same UnitResult shape as run.run_unit."""
    res = UnitResult()
    t0 = getattr(rc, "t0", None) or time.time()
    deadline = rc.fuzz_deadline or rc.mutation_deadline or (time.time() + 1e9)
    accepted_memory: list = []
    accepted_hashes: set = set()
    prefix = "N" if focus else "P"
    n = 0
    if focus:
        order = focus_order(rc, res)
        ids = [_focus_id(t, x, k) for k, (t, x) in enumerate(order)]
        rc.emit(event="focus_order", n=len(order), cells=[f"{f['target_id']}:{f['boundary']}" for f in ids])
        _dump_focus(rc, ids)
        if not order:
            return res
        # the list is walked again and again, same order, until the generation deadline (user
        # 2026-09-25: "循环用完"); Full's mutation_passes_until_deadline cap is a mutant-resampling knob
        p = -1
        while time.time() < deadline and not getattr(rc, "direct_stop", None):
            p += 1
            for tjson, x in order:
                if time.time() >= deadline or getattr(rc, "direct_stop", None):
                    return res
                n += 1
                tid = f"{prefix}{n:04d}"
                fid = dict(ids[order.index((tjson, x))], passes=p + 1)
                rc.emit(event="thread", difference_id=tid, pass_=p + 1, target_id=tjson.get("id"), boundary=x)
                try:
                    _thread(rc, res, tid, prompts.pbt_focus_text(tjson, x), x, tjson.get("id"),
                            accepted_memory, accepted_hashes, deadline, t0, focus_id=fid)
                except LLMInfraError as e:
                    res.infra_aborted, res.infra_reason = True, e.kind
                    rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
                    return res
        return res
    while time.time() < deadline and not getattr(rc, "direct_stop", None):
        n += 1
        tid = f"{prefix}{n:04d}"
        rc.emit(event="thread", difference_id=tid)
        try:
            _thread(rc, res, tid, None, None, None, accepted_memory, accepted_hashes, deadline, t0)
        except LLMInfraError as e:
            res.infra_aborted, res.infra_reason = True, e.kind
            rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
            return res
    return res
