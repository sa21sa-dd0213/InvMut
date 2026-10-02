"""RQ1 LLM-only baseline (USER 2026-06-26) — the verifier-free arm of the pipeline.

Mirrors orchestrate/run.py's `run_unit` (same RunContext in, same UnitResult out, so dataset/rq3.run_case
is unchanged downstream) but removes EVERY ESBMC participation:

  * static analysis (Slither doc1: observational targets y + boundary entries x) — KEPT, unchanged.
  * mutation: `for y:` ONE LLM call per target y that emits ALL first-order mutants (FOMs) of y's behavior
    as a list (ERRORS #145); each FOM passes only the static filters dedup(stage0) + compile(stage1) +
    single-edit form check(stage2). NO R1/R2 differential verification, NO mutant reflection/regeneration (a
    failed/duplicate/non-compiling/ill-formed mutant is dropped, recorded with a reason), NO per-boundary
    fan-out — boundary decomposition only ever served to bound the (here-absent) ESBMC verifier cost.
  * test gen: the LLM emits a COMPLETE standalone Foundry *.t.sol directly (no intermediate ESBMC-verifiable
    InvMutTest contract, no counterexample). Up to `max_test_attempts_per_confirmed_difference` (=5)
    reflections, driven by CONCRETE Foundry execution on P and M — NOT ESBMC.

The P/M Foundry gate (`_validate_rendered(force_pm=True)`) is the test runner/oracle (forge), the same tool
kill_check uses; it is NOT the formal verifier. It yields `validation_status` so the downstream
`_kill_decision` (gates on `validation_status=="passed"`) is reused verbatim. force_pm is REQUIRED: with no
ESBMC proof that the property holds on P, M-only validation would be unsound (codex OF-4).

Critically (codex OF-1/2/3): this module never calls render_and_validate/render_only (bundle→render_foundry),
validate_candidate (always runs R1/R2), or _vctx/verify_test (ESBMC). It uses only the static stages and a
solc compile_fn — there is no ESBMC run_fn anywhere on this path.
"""

from __future__ import annotations

import re
import tempfile
from typing import Optional

# Anti-cheat (USER 2026-06-28): llm_only is a SINGLE-VALUE arm — the LLM must emit ONE no-parameter concrete
# testRegression_ test (no fuzzing). These gates make that a HARD constraint instead of a prompt request, so
# the model can't slip back to the unsound fuzz oracle (fuzz can't prove holds-on-P) or a degenerate test.
_VM_ALLOWED = {"deal", "prank", "startPrank", "stopPrank", "warp", "roll"}

# config.signature_cheatcodes (2026-09-22): `vm.sign` / `vm.addr` are PURE cryptographic helpers --
# vm.addr(pk) derives an address from a private key and vm.sign(pk, digest) computes an ECDSA signature.
# Neither writes storage, replaces code, nor mocks a callee, so unlike vm.store/vm.etch/vm.mockCall they
# cannot manufacture a difference: they are applied identically when the SAME test runs on P, on M and on
# the real bug. (They are strictly weaker than the already-allowed vm.deal, which forges an ether balance.)
# Without them a function gated by signature verification -- PuttyV2.fillOrder is EIP-712 gated -- has NO
# writable call at all: MEASURED on pop_032_PuttyV2 trial 1 under the DeepSeek Pro arm, 13 of the 18 attempts on
# the patched boundary `fillOrder` were rejected as forbidden_cheatcode:vm.addr / vm.sign and the case
# produced 0 accepted tests. 17 corpus cases verify a signature (85 failing cells). False = published.
_VM_SIG_CHEATS = frozenset({"sign", "addr"})


def _strip_comments(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"//[^\n]*", "", src)


def _llm_cheat_reject(test_code: str, extra_vm: frozenset = frozenset()) -> Optional[str]:
    """Return a short reason to REJECT the test, or None to allow. Forces ONE no-param concrete
    testRegression_ that observes c — forbids fuzz/parameterized tests, ANY other forge test entry,
    non-whitelisted cheatcodes, and a body that never reads c (degenerate)."""
    src = _strip_comments(test_code)
    funcs = re.findall(r"function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)", src, flags=re.S)
    # forge runs ANY function whose name starts test/invariant/afterInvariant as a test — only ONE
    # no-param testRegression_ is allowed; any other test entry is a cheat surface (codex BLOCKER 1).
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
    # vm.* whitelist — `\s*\.\s*` so `vm . store` can't slip past (codex BLOCKER 2).
    for m in re.finditer(r"\bvm\s*\.\s*([A-Za-z_]\w*)", src):
        if m.group(1) not in (_VM_ALLOWED | extra_vm):
            return "forbidden_cheatcode:vm." + m.group(1)
    # the body must OBSERVE c somewhere (reading c into a local then asserting on it is fine, codex
    # SHOULD-FIX 3) and contain an assertion; the strict verdict then enforces P-pass / M-fail.
    if not (("c." in src or "address(c)" in src) and re.search(r"\bassert\w*\s*\(", src)):
        return "test_does_not_observe_c"
    return None


def _llm_strict_ok(p_outcome, m_outcome) -> bool:
    """Sound single-value witness (codex A2-6): the concrete testRegression_ must ACTUALLY RUN and PASS on P
    AND RUN and FAIL on M. 'No failure on P' is NOT enough — an unrun test also shows no failure."""
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
    """True when P's failure is the test REVERTING rather than its assertion being violated.

    A revert string the contract itself defines (`Ownable: caller is not the owner`,
    `AccessControl: account .. is missing role ..`, `Not owner`) also reaches forge as a failure
    reason with no assertion marker in it, so "no assertion marker" is the discriminator, not a
    fixed list of revert texts.
    """
    if not p_raw:
        return False
    if any(m in p_raw for m in _ASSERT_MARKERS):
        return False
    return (any(m in p_raw for m in _REVERT_MARKERS)
            or "revert" in p_raw.lower())


def _llm_test_diag(verdict, config=None) -> Optional[dict]:
    """Map a Foundry P/M ValidationVerdict to a reflection diagnosis (codex OF-7). None ⇒ accepted.
    Both COMPILER_ERROR and FORGE_LOG are always supplied (str.format ignores the unused one) so no
    template branch can KeyError."""
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
        # config.revert_aware_p_diag: "failed on P" covers two different faults and the published
        # `fails_on_original` text prescribes the remedy for only one of them ("TIGHTEN the admissible
        # domain with vm.assume/bound, or weaken the rule"). MEASURED by replaying 25 stored
        # foundry_fuzz_failed_on_P attempts against their own P with the official build_workspace +
        # run_forge: 21 of 25 are the test body REVERTING (18 bare EvmError: Revert, 3 with an
        # access-control reason), only 2 are the asserted rule actually being violated, and 1 is
        # forge giving up with "vm.assume rejected too many inputs". Telling the model to narrow the
        # domain in response to a revert is the wrong repair AND it assumes away the inputs the rule
        # must cover. Route a revert to its own diagnosis. False = published behaviour.
        if getattr(config, "revert_aware_p_diag", False) and _p_side_reverted(p_raw):
            return {"diag_kind": "reverts_on_original", "FORGE_LOG": p_raw or err,
                    "COMPILER_ERROR": p_raw}
        return {"diag_kind": "fails_on_original", "FORGE_LOG": p_raw or err, "COMPILER_ERROR": p_raw}
    if err == "foundry_setup_failed_P":
        return {"diag_kind": "setup_failed", "FORGE_LOG": p_raw or err, "COMPILER_ERROR": p_raw}
    if err in ("foundry_regression_passed_on_M", "foundry_fuzz_passed_on_M"):
        return {"diag_kind": "holds_on_modified", "FORGE_LOG": m_raw or err, "COMPILER_ERROR": m_raw}
    # foundry_timeout / anything else
    return {"diag_kind": "inconclusive", "FORGE_LOG": (m_raw or p_raw or err), "COMPILER_ERROR": m_raw}


@functools.lru_cache(maxsize=8)
def _surface_cached(solc_bin: str, source: str, contract: str) -> str:
    from invmut.agents.surface import build_block      # lazy: solc AST only when enabled
    return build_block(solc_bin, source, contract) or ""


@functools.lru_cache(maxsize=8)
def _setup_cached(solc_bin: str, source: str, contract: str) -> str:
    from invmut.agents.surface import build_setup_block   # lazy: solc AST only when enabled
    return build_setup_block(solc_bin, source, contract) or ""


def _prune_imports(rc, tcand) -> None:
    """config.import_file_level_types: strip the widened import list down to what the test actually
    uses, IN PLACE, before the test is gated, validated or stored. Importing an unused top-level name
    makes the BUG side fail to compile whenever the patch ADDED that declaration, which the official
    gate scores as a kill -- see render/foundry.prune_import_symbols. No-op when the flag is off
    (the list is then exactly `{C}`)."""
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
        except Exception:      # noqa: BLE001 — a frozen candidate type must not break the loop
            pass


def _file_types(rc) -> str:
    """config.import_file_level_types: the flat source's top-level type names for the test's import
    list. Empty (= published behaviour) unless the flag is on."""
    if not getattr(getattr(rc, "config", None), "import_file_level_types", False):
        return ""
    from invmut.agents.prompts import file_level_types
    return ", ".join(file_level_types(rc.p_source, rc.contract))


def _sig_cheats(rc) -> frozenset:
    """The extra vm.* names the anti-cheat gates admit under config.signature_cheatcodes."""
    return _VM_SIG_CHEATS if getattr(getattr(rc, "config", None), "signature_cheatcodes", False) else frozenset()


def _public_surface(rc) -> str:
    """The PUBLIC SURFACE block for the prompts, or "" when config.public_surface_block is off.

    prompts.TEST_NOTES rules 3 and 8 both reference this block; nothing ever built it, so the
    model had to guess C's interface (config.py:444 -- 22 of 25 P-side compile failures are
    exactly that). Derived from the REFERENCE source only, so it carries no bug location.
    """
    parts = []
    if getattr(rc.config, "public_surface_block", False):
        parts.append(_surface_cached(rc.config.solc_bin, rc.p_source, rc.contract))
    if getattr(rc.config, "required_setup_block", False):
        parts.append(_setup_cached(rc.config.solc_bin, rc.p_source, rc.contract))
    return "\n".join(x for x in parts if x)


@functools.lru_cache(maxsize=64)
def _struct_getters(solc_bin: str, source: str, contract: str) -> tuple:
    """(getter name, ordered member names) for every mapping-to-struct public getter of `contract`.

    Read off the PUBLIC SURFACE block, which is where surface.py already applies solc's getter rule
    (value-typed members only, mapping/array members omitted) -- rather than re-deriving it here and
    risking a second, divergent notion of the tuple's arity.
    """
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
    """config.struct_getter_member_rewrite: make `c.Acc(k).balance` compile, or return it unchanged."""
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
    """Every deterministic repair applied to an LLM-authored test before the P/M gate sees it.

    Each step is config-gated and each leaves the source byte-identical when its flag is off, so
    the official behaviour is exactly the unrepaired test.
    """
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
    """Published-artifact step: after a concrete test is accepted by Foundry, try to also show with ESBMC
    that it holds on the reference. Best-effort and never gating: any failure or a short wall is ignored."""
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
    """LLM-only counterpart of run.run_unit. Returns the same UnitResult shape."""
    res = UnitResult()
    compile_fn = make_solc_compile_fn(rc.config)
    mm = MutationMemory()                  # case-level "do not repeat" prompt memory
    seen_change_hashes: set = set()        # case-level stage0 dedup (the SAME filter as full-mode A-4)
    sv = _solc_version(rc.config)
    construction = prep.render_construction_expr(rc.construction, rc.contract)
    diff_counter = 0
    contract_code = rc.prompt_source or rc.p_source

    _targets = rc.doc1.get("targets", [])
    for _t_idx, tjson in enumerate(_targets):
        if rc.mutation_deadline is not None and time.time() >= rc.mutation_deadline:
            res.mutation_deadline_hit = True
            break
        # fair_share_targets: pro-rata soft deadline for THIS target; lapsing it advances
        # to the next target (the faulty unit's target is often last) instead of letting
        # target 1 starve the rest.  Case-level mutation_deadline still aborts as before.
        target_deadline = None
        if getattr(rc.config, "fair_share_targets", False) and rc.mutation_deadline is not None:
            _now = time.time()
            target_deadline = _now + (rc.mutation_deadline - _now) / (len(_targets) - _t_idx)
        target_id = tjson.get("id")
        editable_units = prep.render_editable_units(tjson)
        goal = prep.render_goal(tjson)                       # per-target (no per-boundary goal)
        boundaries = prep.boundaries_of(tjson)
        boundary = boundaries[0]                             # representative entry for records + test prompt
        # ONE call per target → ALL FOMs (ERRORS #145); no per-boundary fan-out, no reflection.
        try:
            attempt = MA.propose_llm_mutants(
                rc.client, contract_code=contract_code, editable_units=editable_units, goal=goal,
                boundaries=", ".join(boundaries),
                max_json_retries=rc.config.max_json_retries_per_call,
                model=(rc.spec.mutant_model or rc.spec.model), thinking=rc.spec.thinking)  # role split: mutant model
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
                # the accepted test (if any) is appended to res inside the loop; return value unused here
                _run_llm_test_loop(
                    rc, res, tjson, cand, m_source, boundary, goal, diff_id, sv, construction)
            except LLMInfraError as e:
                res.infra_aborted = True
                res.infra_reason = e.kind
                rc.emit(event="infra_error", kind=e.kind, detail=e.detail)
                return res
    return res


def _accept_mutant(rc, res, tjson, target_id, boundary, cand, mm, seen_change_hashes, compile_fn):
    """Run dedup(stage0) + compile(stage1) + form(stage2) — the SAME static gate as full-mode (codex A-4),
    just without R1/R2 and without any reflection/regeneration. `cand` is one already-parsed FOM from the
    per-target batch. Accept ⇒ return (Candidate, m_source); else record the drop reason and return None
    (USER spec: a failed mutant is dropped, not retried)."""
    # Stage 0 — exact-change dedup (Candidate.change_hash, same normalization as full-mode validate).
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

    # accepted (no R1/R2): a compiling, well-formed, non-duplicate single-edit mutant.
    mm.add(cand.unit_id, None, cand.mutated_unit_code, cand.change_summary, Outcome.VISIBLE_DIFFERENCE)
    res.mutation_records.append({"target_id": target_id, "boundary": boundary, "unit_id": cand.unit_id,
                                 "outcome": "llm_only_accepted"})
    rc.emit(event="mutation", target_id=target_id, boundary=boundary, outcome="llm_only_accepted")
    return cand, m_source


def _run_llm_test_loop(rc, res, tjson, cand, m_source, boundary, goal, diff_id, sv, construction,
                       origin="llm_only", construction_body=None, construction_decls=None):
    """Up to 5 attempts: LLM emits a standalone Foundry test; we run it on P and M (force_pm) and reflect
    on the concrete forge verdict. On the first `passed` verdict, append an AcceptedTest and stop. No
    ESBMC anywhere. `origin` stamps each record + the AcceptedTest so a kill is attributable to the path
    that produced it (the no_pa arm uses "llm_only")."""
    # construction fixtures (config.construction_fixtures): with the flag off these are
    # exactly `c = {construction};` and "", i.e. the pre-lever prompt byte for byte.
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

        # H1 anti-cheat gate: reject anything that isn't ONE no-param concrete testRegression_ that reads c
        # (BEFORE running forge — a fuzz/parameterized/cheatcode test must never reach the oracle).
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
                return None   # last iteration: a reflection would be discarded (codex 5)
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

        # The deterministic repairs must be applied to the test that is STORED, not only to the one
        # validated: scripts/run_tests.py gates `rendered_test`, so validating a repaired test and
        # storing the raw one made the official gate judge different code (a repaired `after` local
        # compiles in the pipeline and fails to compile at the gate). Identity when every flag is off.
        tcand.test_code = _prepare_llm_test(rc, tcand.test_code)
        root = tempfile.mkdtemp(prefix="invmut_llmonly_")
        try:
            # fuzz_runs=1 (H2): single-value tests are concrete; this is a hard backstop against fuzzing.
            verdict, p_log, m_log = _validate_rendered(
                rc.config, ri, tcand.test_code,
                _TEST_NAME, root, sv, force_pm=True, fuzz_runs=1)
        finally:
            import shutil
            shutil.rmtree(root, ignore_errors=True)

        # accept ONLY a sound witness: forge says passed AND the concrete test actually ran+passed on P and
        # ran+failed on M (closes the "no failure == didn't run" hole, codex A2-6).
        accepted = verdict.status == "passed" and _llm_strict_ok(verdict.p_outcome, verdict.m_outcome)
        out = "accepted" if accepted else ("not_sound_witness" if verdict.status == "passed"
                                           else verdict.status)
        rec = {"difference_id": diff_id, "boundary": boundary, "outcome": out,
               "reason": verdict.error, "test_code": tcand.test_code,
               "property_summary": tcand.property_summary, "origin": origin,
               # the deciding forge lines; without them a rejection is only a code (see
               # invmut.render.validate.forge_diagnostic)
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
            # status=="passed" but NOT a sound witness (testRegression_ didn't run+pass on P / run+fail on
            # M): give explicit feedback instead of a silent guidance-free re-propose (codex 4).
            diag = {"diag_kind": "not_sound_witness", "FORGE_LOG": (m_log or p_log or "")[:1500],
                    "COMPILER_ERROR": ""}
        if i == budget - 1:
            return None   # last iteration: a reflection would be discarded (codex 5)
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


# Published-artifact name for this arm's entry point (the arm is called `no_pa` there, `llm_only` here).
run_unit_concrete = run_unit_llm_only
