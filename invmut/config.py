"""Frozen run configuration + tool version pinning (Doc 5 §3).

Hard rules enforced here (ERRORS.md #140, Doc 5 §0.1, §3):
- external binaries are explicit absolute paths, NEVER resolved from $PATH / command -v;
- versions are verified with exact-match mode at startup; mismatch aborts loudly;
- secrets (API keys) are NEVER stored in config or any run artefact — only the env-var NAME.

The config is loaded once, frozen, and written verbatim into the run dir. No stage
re-resolves a path or version. See notes/DEVIATIONS.md V8 (timeout=60s), V9 (reflections=5),
V10 (memlimit + solidity-max-tx), V11 (experiment fields).
"""

from __future__ import annotations

import dataclasses
import json
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


class ConfigError(RuntimeError):
    """Fatal configuration / version-pinning error. Always abort loudly."""


# Repo root (the parent of the invmut/ package). Used to resolve repo-relative config paths so the
# The committed configuration remains portable across machines; see _resolve_path.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PATH_FIELDS = ("esbmc_bin", "solc_bin", "slither_bin", "forge_bin", "forge_std_path")


def _resolve_path(p: str) -> str:
    """Make a config path portable across machines, then return an ABSOLUTE path so the §0.1
    'explicit absolute path, never $PATH' invariant (verify_tools) still holds.

    Accepts three portable forms so config.local.json need not be edited on every handoff:
      - `~/...`            home-relative tool paths (solc-select/.local/.foundry) → expanduser
      - `esbmc_binary/...` repo-relative artifacts (the built ESBMC, `.forge-std`) → join repo root
      - `/abs/...`         already absolute → returned unchanged (idempotent)
    """
    if not isinstance(p, str) or not p:
        return p
    p = os.path.expanduser(p)               # ~ -> current user's home (machine-agnostic)
    if not os.path.isabs(p):
        p = os.path.join(_REPO_ROOT, p)     # repo-relative -> absolute against the repo root
    return os.path.abspath(p)


@dataclass(frozen=True)
class VerifierParams:
    """ESBMC / forge knobs. Defaults follow the locked profile (DEVIATIONS V1/V8/V10)."""

    # k-step bounds per stage (Doc 5 §3.4)
    r1_max_k_step: int = 7
    r2_max_k_step: int = 10
    r2_pack_max_k_step: int = 3      # packed R2 screen bound (mutation/r2pack.py); multi-property never stops early
    doc3_max_k_step: int = 10
    doc3_max_k_step_retry: int = 20  # raised once on non-convergence (Doc 3 §5)
    # Doc 3 Direction 2 (refute on M / find counterexample) USER 2026-06-30: incremental-bmc bug-finder with
    # a deeper bound + more transactions than Direction-1's prover, so the kill-check actually FINDS the
    # fix->bug divergence (k-induction often returned no-cex -> bug_no_kill).
    doc3_break_max_k_step: int = 12
    doc3_break_solidity_max_tx: int = 3
    # transaction-sequence bound per stage (USER 2026-06-28): differential validation (R1/R2) reasons over
    # 2 tx; verify_test (doc3) stays at 1 tx. (Earlier R1/R2 were 3 — a 3-vs-1 depth gap let multi-tx-only
    # differences pass R2 yet leave the 1-tx test inconclusive; 2-vs-1 narrows that gap while still letting
    # R1/R2 see a short call sequence.)
    r1_solidity_max_tx: int = 2
    r2_solidity_max_tx: int = 2
    # 2026-09-12: the UNFOCUSED R2 path proves a `no_difference` is not vacuous with the liveness
    # probe at mutation/r2.py:195-203; the FOCUSED escalation has no such check, so
    # `focused_no_difference` conflates 'saw no difference' with 'saw nothing'.  True = probe each
    # focused wrapper and report focused_boundary_unreachable instead.  False = official behaviour.
    focused_vacuity_probe: bool = False
    doc3_solidity_max_tx: int = 1
    # per-verifier-call wall budget — USER OVERRIDE 60s (DEVIATIONS V8; doc default was 300)
    timeout_seconds_per_call: int = 60
    # V44: fail-fast budget for the UNFOCUSED-first R2 attempt (V42 unfocus for state/return). A real
    # difference surfaces in a few seconds unfocused; proving NO difference spins to the full 60s, and
    # under V42 that 60s (+ a 60s focused escalation) per no-diff FOM starved later targets (M1 withdraw
    # / M2 claim never reached). Cap the unfocused probe short: a fast difference is still caught; a
    # no-diff/slow probe gives up quickly and the focused escalation (full timeout) concludes it.
    r2_unfocused_timeout_s: int = 15
    esbmc_memlimit_mb: int = 8192  # mandatory --memlimit (DEVIATIONS V10; ERRORS #54/#57)
    solver_retry_with_cvc5: bool = True  # one retry only (Doc 3 §5)
    forge_per_test_timeout_s: int = 30
    forge_fuzz_runs: int = 10000
    forge_fuzz_seed: int = 1
    # Optionally re-run the P side at a separately configured gate budget before a test is accepted.
    # Generation-time validation uses forge_fuzz_runs/forge_fuzz_seed above (10,000 @ 0x1 by default),
    # while scripts/run_tests.py may use a different seed. Measured disagreement on
    # ALREADY-ACCEPTED tests (scripts/validation_vs_gate_audit.py): deepseek 16/420 = 3.8%,
    # gpt-5-mini 46/378 = 12.2%, dominated by cause=property_false.  That is the mechanism behind the
    # 21 and 20 post-hoc cell demotions, against gaps of 12 and 13 cells.  >0 turns those into ordinary
    # P-side validation errors the reflection loop can repair in-loop.  0 = official behaviour.
    accept_gate_fuzz_runs: int = 0
    accept_gate_fuzz_seed: int = 0    # 0 = reuse forge_fuzz_seed
    # the gate sets its reject budget through FOUNDRY_FUZZ_MAX_TEST_REJECTS
    # (artifact/scripts/run_tests.py:182/553), which is why an over-constrained vm.assume
    # only shows up there: 4 of the 6 rows of the first gate-hardened run failed with
    # `vm.assume rejected too many inputs (2560000 allowed)` on BOTH sides.  0 = leave the
    # environment alone (official behaviour).
    accept_gate_max_test_rejects: int = 0
    # kill-check mode (USER decision). "m_only": run Foundry ONLY on the mutant M — soundness comes from
    # ESBMC having PROVED the property holds on the fix P, so re-running P in Foundry is redundant for the
    # experiment's success/fail verdict. "p_and_m": also run P (debug: surfaces translation-layer bugs as
    # foundry_*_on_P, e.g. how root causes #10 / Defect A / Defect B were found). Soundness on the M side
    # (compile + setUp pass + property failure required) is identical in both modes (codex F2).
    kill_check_mode: str = "m_only"
    # kill semantics (USER 2026-06-25, decision B approved): a P-validated test that won't COMPILE against
    # the real BUG contract is a CORRECT kill — in reality you never hold patch+bug at once, so a fix->bug
    # divergence (signature change OR fix-only state/base the bug lacks, e.g. simple_suicide's smartfix_owner)
    # that breaks the test's build IS the kill. VERIFIED legit on simple_suicide; codex confirmed m_only mode
    # has no false-positive rendering path. Now True (production counting). Soundness still gated by
    # validation_status=="passed" (test must hold on P first) in _kill_decision.
    count_bug_compile_fail_as_kill: bool = True
    # ESBMC result cache (USER 2026-06-28; notes/MUTANT_REUSE_CACHE_PLAN.md). When set, EVERY ESBMC call
    # (R1/R2/verify_test) is keyed by (sol content, normalized argv, esbmc+solc version, profile, timeout)
    # and looked up before running — shared across trials/arms/cases/machines to cut the paid experiment's
    # ESBMC cost. None ⇒ no caching (current behavior). Content-addressed dir, mergeable across machines.
    # (Supersedes the inline V38 cache from the V40 line — same memoization, abstracted into esbmc/cache.py.)
    esbmc_cache_dir: str | None = None
    # cache ESBMC timeouts too (USER D1: max savings). A definitive verdict always OVERRIDES a cached
    # timeout for the same key (a faster machine upgrades a slower one); merge prefers definitive. Set
    # False to never cache timeouts (fully sound on heterogeneous HW; re-runs the timeout minority).
    cache_esbmc_timeouts: bool = True
    # proactive per-cell --focus-function (DEVIATIONS V36): the new full pipeline focuses
    # ESBMC on each cell's boundary x from the start. Set False for the unfocused ablation (more recall,
    # more spin) — the orchestrator still iterates cells, but validate_candidate runs R1/R2 unfocused.
    proactive_focus: bool = True
    # V42: skip PROACTIVE --focus-function for state/return targets. Focus prunes the multi-transaction
    # state-establishing prefix through OTHER entries (V36 negative-incomplete), which suppresses
    # sequence-dependent differences (e.g. TOD deposit→setRewardRate→claim). With this on (default), the
    # per-cell writer PIN is kept but those categories run R2 UNFOCUSED so the prefix is explored; the
    # reactive focus_latched canary + _stage5_state's per-writer escalation still converge a spinning run.
    # Set False to restore uniform V36 proactive focus (ablation). Distinct from `proactive_focus` so the
    # two axes stay separable. NO effect on llm_only/RQ1 (no R2).
    focus_skip_multitx: bool = True
    # V47 (USER 2026-06-28): a test counts as a kill if EITHER ESBMC OR Foundry kills the real bug.
    # ESBMC's bounded model is sometimes too coarse (e.g. it models a low-level `.call` as always
    # succeeding when `__ESBMC_*` intrinsics are present, hiding an unchecked-call revert difference);
    # Foundry executes concretely and catches those. SOUND: a Foundry kill requires the rendered test to
    # PASS on the fix AND fail (property violation) on the bug — a genuine differential, so a test that
    # fails identically on both (the V40 vm.assume-rejected spurious case) is NOT counted. full pipeline
    # only — NO effect on llm_only/RQ1. Set False to restore ESBMC-sole (V40) kill judgment (ablation).
    kill_esbmc_or_foundry: bool = True
    # V40 forge audit (default OFF): with ESBMC as the sole RQ3 oracle, optionally re-run forge on each
    # ESBMC-accepted test as a NON-GATING soundness audit (records `forge_audit` per kill; never changes
    # counts_toward_success). Lets a false-positive (ESBMC accepts but real EVM doesn't distinguish P/M) be
    # spotted without restoring forge as a gate. FULL pipeline only — has NO effect on the llm_only arm.
    esbmc_kill_forge_audit: bool = False
    # CE-oracle recovery instrumentation (default OFF): when enabled, R2 harnesses bind boundary args,
    # payable value, and state getter keys to named locals (`__invmut_arg*`, `__invmut_value`,
    # `__invmut_key*`) and reference them in tautological assert conjuncts so ESBMC's counterexample
    # prints concrete witness values. This is for same-trial CE harvesting/replay; default false preserves
    # the original R2 artifact semantics.
    r2_record_witness_values: bool = False
    # Copy each witness storage field into an assertion-local variable before the differential assert
    # (harness._witness_live_copies), so ESBMC's slicer cannot drop the raw `x == x` liveness term and
    # leave the counterexample printing an UNCONSTRAINED witness value. The local pack has always done
    # this; build_r2_file did not, which is why plain-R2 counterexamples came back with a trace naming
    # the wrong function, no trace_len at all, or a boundary argument contradicting the failing claim.
    r2_witness_live_copies: bool = False
    # Put the two sides' ether delta into the differential predicate. Measured dead: ESBMC does not
    # model balances (see _balance_diff_term). Kept only so the negative result stays reproducible.
    r2_record_post_balance: bool = False
    # Compare the contract's OTHER public scalars in the same differential assert, so the
    # counterexample binds them and the replay can state more than one value. Widens what counts
    # as a difference, so it is off by default.
    r2_wide_observation: bool = False


@dataclass(frozen=True)
class LLMConfig:
    """Mirrors scripts/LLM.py arg surface (Doc 5 §3.3). Key value never stored here."""

    model: str = "deepseek-v4-pro"
    reasoning_effort: str = "none"
    base_url: str | None = None
    extra_body: dict[str, Any] | None = None
    api_key_env: str = "DEEPSEEK_API_KEY"
    service_tier: str = "flex"
    temperature: float = 1.0
    # role -> model override (experiment LLM-swap seam, DEVIATIONS V11 / PLAN §4)
    role_model_overrides: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class AblationFlags:
    """Experiment seams (PLAN §4). All default OFF => full system behavior unchanged."""

    disable_verifier_feedback: bool = False  # reflection sees only mechanical errors
    disable_r1: bool = False
    disable_duplicates_filter: bool = False
    disable_fallback_narrowing: bool = False
    single_mutation_attempt: bool = False


@dataclass(frozen=True)
class Config:
    # --- pinned tool paths + expected versions (Doc 5 §3.1) ---
    esbmc_bin: str
    esbmc_version_expected: str
    solc_bin: str
    solc_version_expected: str
    slither_bin: str
    slither_version_expected: str
    forge_bin: str
    forge_version_expected: str
    forge_std_path: str
    version_match_mode: str = "exact"  # "exact" for experiments; "loose" only local smoke

    verifier: VerifierParams = field(default_factory=VerifierParams)
    llm: LLMConfig = field(default_factory=LLMConfig)
    ablation: AblationFlags = field(default_factory=AblationFlags)

    # --- loop budgets (DEVIATIONS V9; prompts §14) ---
    max_reflections: int = 5  # per loop, reset to 0 on success
    max_json_retries_per_call: int = 2
    max_mutation_attempts_per_statement: int = 3
    max_mutation_attempts_per_goal: int = 20
    max_reflection_repairs_per_mutation: int = 1
    max_test_attempts_per_confirmed_difference: int = 5
    # render_param_only (USER RULING 2026-09-23): a test function without parameters runs once on one
    # input -- a fixed-value test -- so none may ship.  True: the renderer emits no
    # testRegression_*_mWitness companion, and a verified property with no free input fails to render
    # (unparameterised_put) instead of becoming a parameterless testFuzz_.  False = published behaviour.
    render_param_only: bool = False
    # Published-artifact switch: replace a primary rendered test with the hand-realized
    # motivation test when the realized one kills the bug and the generated one does not.
    realize_rendered_tests: bool = False

    # packed R2 screen (2026-09-06, DeepSeek Pro arm): ONE multi-property ESBMC run per (target, boundary) cell
    # over all its compiled mutants (mutation/r2pack.py) decides which mutants show a P/M difference; only
    # those run the ordinary single-mutant R2 (confirm + counterexample). Mutants the screen cannot
    # separate are recorded inconclusive:pack_screen_* without a per-mutant timeout. Pure filter, so a
    # screen miss costs recall only. Default False (Full campaign unchanged).
    r2_pack_screen: bool = False
    # widen a cell's editable units with the target's own private/internal function units (see
    # orchestrate/prep.render_editable_units_for_boundary). Default False (Full campaign unchanged).
    editable_internal_units: bool = False

    # diff-anchored mutation (USER 2026-06-30): full pipeline only. When True, the patch diff (vulnerable->fixed)
    # is fed to the mutate agent so it ALSO proposes a mutant that REVERTS the patch (M ~= the real bug). This
    # makes the mutant a faithful proxy for the vulnerability: a test separating P from M then ALSO separates fix
    # from bug (a real kill), judged on the ESBMC primary diff-verify path.
    # Default False (A/B-able); no effect on the llm_only arm.
    diff_anchored_mutation: bool = False

    # minimal test prompt (USER 2026-06-30): full pipeline only. When True, the PRIMARY test generator uses the
    # no-scaffold minimal template (no CE/`{DIFFERENCE}` fill-in) instead of _PROMPT_C. Under no-think the heavy
    # CE scaffold mechanically steers the model into wrong tests (fails_on_original), so R2-confirmed mutants
    # never get a killing primary test. Minimal lets the model write a correct, ESBMC-verified rule from P+mutant.
    # Default True (USER 2026-06-30): applied per the no-think principle (llm_only's no-CE tests beat the heavy
    # CE scaffold); the only counter-evidence (a bad_randomness "regression") was a flaky randomness case.
    minimal_test_prompt: bool = True
    # Pro-arm levers (2026-09-07), both OFF by default so official arms are unchanged:
    #  abi_block_in_test_prompt: prepend a compact list of C's public/external signatures (derived from
    #    the same source the model already sees) to the test/mutation prompt source.
    #  dead_difference_unknown_limit: abandon a confirmed difference after this many CONSECUTIVE
    #    m_no_cex_within_bound outcomes whose break run exhausted the base case (state unreachable
    #    from deployment); 0 = never (spec behaviour: all max_test_attempts_per_confirmed_difference).
    abi_block_in_test_prompt: bool = False
    dead_difference_unknown_limit: int = 0
    #  r2_cell_wall_s: per-cell budget of ACCUMULATED candidate-validation (R1/R2) seconds; once spent, the
    #    cell's remaining candidates are closed as inconclusive:cell_r2_wall_exhausted so the round-robin
    #    reaches later cells (L1 lever: 55 REAL rows never reached their fault cell). 0 = unlimited (spec).
    r2_cell_wall_s: int = 0
    #  r2_cell_wall_hard: in the parallel pool, ESBMC calls that would START after the cell wall return an
    #    immediate timeout (running calls keep their own caps). Off = published behaviour.
    r2_cell_wall_hard: bool = False
    #  precise_test_diags: Prompt-D uses the mechanical diagnoses m_no_cex_dead_path / non_target_failure
    #    (with the failing location) instead of the generic inconclusive / m_no_cex blocks. 0-cost, off by default.
    precise_test_diags: bool = False
    #  test_prompt_notes: prepend prompts.TEST_NOTES (verifier-model facts: sender identity, reserved words,
    #    statement order, role hand-off) to the prompt source. Off by default.
    test_prompt_notes: bool = False
    #  deferred_test_phase: R2 sweep over all cells first, test loops afterwards until fuzz_deadline.
    deferred_test_phase: bool = False
    #  fair_share_targets (2026-09-10, D2 smoke GT finding): llm_only's target loop spends the whole
    #    mutation budget on the first doc1 target -- 4/5 smoke fails never attempted the faulty unit's
    #    target at all.  With this on, each target gets a pro-rata soft deadline (remaining budget /
    #    remaining targets); when it lapses the CANDIDATE loop advances to the next target instead of
    #    the case dying inside target 1.  The case-level mutation_deadline is unchanged.  Off by
    #    default: official arms keep spec scheduling.
    fair_share_targets: bool = False
    # V46: include INHERITED state declarations in state-target selection (this
    # Slither build's c.state_variables omits them). Official arms OFF.
    select_inherited_state: bool = False
    # C1: read a payable constructor's own `require(msg.value == X)` gate and deploy with X.
    # Without it such a case can never deploy, so no test can exist. Official arms OFF.
    ctor_value_from_require: bool = False
    # Integer constructor parameters default to 0, which degenerates the contract under test:
    # measured on rc_unchecked_low_level_calls__0x07f7ecb6… (`PoCGame`), `new C(address(this), 0)`
    # sets betLimit = 0, so every `whale.call{value: betLimit/2}` carries 0 wei and ALWAYS
    # succeeds -- the `require(success)` the patch adds can never fire, and the case ships 39
    # accepted PUTs with 0 kills over 5 trials.  With this on, prep._nonzero_scalar derives a
    # non-zero literal FROM THE TYPE WIDTH (10 ** min(18, bits // 4)); default off keeps every
    # published arm's harness byte-identical.
    ctor_nonzero_scalar_args: bool = False
    # Deploy P once with the construction recipe before any LLM call.
    # If the recipe reverts and ctor_nonzero_scalar_args produced it, use the published all-zero recipe;
    # if P still cannot
    # be deployed, end the case as `p_deploy_reverts` with 0 tokens. Official arms OFF.
    p_deploy_canary: bool = False
    # Stop a case after repeated identical framework failures.
    # After this many consecutive test attempts failing on P with one compiler/forge error signature over
    # >= 2 differences, the case closes every phase (dataset/harness._stage3_gate). 0 = off (published).
    stage3_framework_abort_k: int = 0
    # Add one value-transfer state target whose scope covers ether-sending entries and callees.
    # R2 still cannot observe balance (INCONCLUSIVE before ESBMC).
    # MEASURED need: 7 cases / 35 cells per arm had the patched function in NO target's locus or mutable
    # unit (wallet_02 refund, 0x7d09edb donateToWhale/loseWager ...). Official arms OFF.
    select_value_transfer_targets: bool = False
    # C2+C4: let the construction recipe carry a setUp prelude (EOA deployer) and helper
    # contract declarations (dependency-handle stub). Official arms OFF.
    construction_fixtures: bool = False
    # DeepSeek Pro arm 2026-09-10: worked (goal -> edit) exemplars appended to the batch mutate prompt,
    # selected by the focus's goal shape (prompts.fewshot_block). Targets the 2,282
    # focused_no_difference events of notes/UPLIFT_EVIDENCE_20260910.md §13. Off = official prompt.
    mutation_fewshot: bool = False
    resume_dropped_candidates: bool = False   # DeepSeek Pro arm 2026-09-07: after the test queue, R2+test the cell-wall-dropped candidates until fuzz_deadline
    # 2026-09-07 ground-truth census: a constructor param that C stores into a CONTRACT-TYPED state
    # variable is a dependency handle, and rendering address(this) for it makes every write path of C
    # end in a call to a non-existent function on the test contract -> the path reverts on the real EVM
    # while ESBMC's abstracted external call does not. 71% of the rejections on never-killed REAL cases
    # are this P-side family (foundry_fuzz_failed_on_P / foundry_compile_failed_P). ON: deploy a real
    # instance of the declared type instead (`new C(address(new Log()))`). Default OFF: official arms
    # are frozen.
    deploy_real_dependency_fixtures: bool = False
    boundary_guard_trap_stop: bool = False    # DeepSeek Pro arm 2026-09-07: abandon a difference whose boundary traps the checker inside c
    r2_fast_revert_retry_when_nonconverged: bool = False   # DeepSeek Pro arm: retry with an unfocused revert query when the state run does not converge
    r2_parallel_workers: int = 0   # DeepSeek Pro arm 2026-09-07: >1 = validate a cell's candidates in an N-thread pool (ESBMC is a single-core subprocess; serial R2 left 11 cores idle and 64 official REAL rows never reached their GT cell). 0/1 = serial (official arms).
    deferred_test_round_robin: bool = False   # DeepSeek Pro arm 2026-09-07: deferred test phase interleaves differences one attempt per round
    deferred_test_boundary_interleave: bool = False   # 2026-09-23: round-robin order interleaves BOUNDARIES first (see run.py:_deferred_round_robin)
    test_break_timeout_s: int = 0   # DeepSeek Pro arm 2026-09-07: ESBMC cap for the break-on-M run of verify_test (0 = timeout_seconds_per_call)
    kill_check_hard_deadline: bool = False   # DeepSeek Pro arm 2026-09-07: stop scoring accepted tests at t0+case_timeout (unscored = no kill, conservative); off = official unbounded behavior
    mutation_passes_until_deadline: int = 1  # Refill target/cell queues with fresh samples until mutation_deadline; 1 = single-pass behavior
    # S-ORD, DeepSeek Pro arm 2026-09-11: order _mutation_phase's target queues so a target whose ONLY
    # editable statement is a bare RETURN (a trivial getter) goes last. The signal comes from doc1
    # built on the REFERENCE source -- the bug/fix diff is never read, so it is bug-agnostic.
    # MEASURED fault-cell index, doc1 order -> S-ORD (scratchpad/sord_dryrun.out, zero LLM):
    # pop_049_Cooler 9->2, pop_020_GSPFunding 27->2, pop_051_LiquidityPool 26->15,
    # pop_058_PuttyV2 19->0, pop_077_MergingPool 3->1, pop_018_PrivatePool 14->15.
    # False = official doc1 order.
    mutation_state_writers_first: bool = False
    # See invmut/agents/prompts.py:_PRECONDITION_NOTE for the full rationale and the corpus
    # measurement (85/124 cases guard-class; 52 of 73 D1_validated_no_kill cases guard-class).
    # False = published prompt.
    mutate_preconditions: bool = False
    # See invmut/orchestrate/concrete.py:_llm_test_diag for the rationale and the replay measurement
    # (21 of 25 foundry_fuzz_failed_on_P attempts REVERT on P; only 2 violate their assertion).
    # False = published behaviour.
    revert_aware_p_diag: bool = False
    # OBSERVING COUNTERPARTY (2026-09-22).  Both test prompts forbid the only oracle a bug whose
    # whole effect leaves c through an external call can have: the FUZZ prompt allows a helper but
    # only an ADVERSARIAL one and then says "do not assert on the helper itself"; the REGRESSION
    # prompt says "define no other contract/interface/library" so it cannot deploy one at all.
    # MEASURED on rcx_unchecked_low_level_calls__0xd5967fed...__sGuard (stateless `demo.transfer`,
    # bug = abi.encodePacked vs fix = abi.encodeWithSelector into `caddress.call`): all 5 published
    # cells accept a PUT asserting only `assertTrue(ret)`, which the real bug satisfies ->
    # D1_validated_no_kill 5/5.  ON: both prompts also describe a RECORDING counterparty and allow
    # the assertion to read what it stored.  A helper that only STORES what c sent it is not a
    # second subject -- its record IS c's externally observable behaviour -- and the existing
    # P-pass/M-fail gate already discards a helper-only assertion that ignores c.
    # False = published behaviour (prompt byte-identical).
    external_observer_helper: bool = False
    # 2026-09-22: the batch mutate prompt lists a unit as `unit_id: signature (lines a-b)` only -- Doc-1's
    # per-unit statement table (select.py:_unit_body_statements) is never shown, and nothing asks the model
    # to spread its mutants over distinct statements.  MEASURED on
    # rc_unchecked_low_level_calls__0xe894d54...__TIPS (fix = add `if (!_s) { revert(); }` around an
    # unchecked low-level call): 0 of one run's 5 candidates and 1 of the 44 published ones edit that
    # statement, so the behaviour a killing test must pin down never gets a mutant -- a class-(a) miss.
    # ON: the unit listing carries the statement table and the batch is told to cover distinct statements
    # before repeating one.  It names no statement as interesting.  False = published behaviour.
    mutate_statement_coverage: bool = False
    # DeepSeek Pro arm 2026-09-11: per-REQUEST wall for one LLM call, in seconds. The OpenAI client is
    # built with no `timeout=` (invmut/agents/client.py:_client), so it inherits the SDK default
    # of 600 s -- and with llm.service_tier = "flex" a queued request can sit there for all of
    # it, i.e. ONE stalled call can eat an entire 600 s case wall. MEASURED on
    # pop_051_LiquidityPool: three separate runs each logged `fewshot: target_id=T0000,
    # boundary=rely` and then produced no `mutation:` line at all for 280+ s, dying with 1 of 44
    # cells walked. APITimeoutError is already handled as transient at client.py:236, so a real
    # timeout turns a dead run into a retry. 0 = keep the SDK default (official behaviour).
    llm_request_timeout_s: int = 0
    # DeepSeek Pro arm 2026-09-11: invmut/select.py:564 labels a revert target `explicit_revert`, but
    # prep.render_goal:434 and prompts.fewshot_block both test for the string "revert".  So every
    # such target is handed the STATE goal sentence ("make the final state of v differ") while its
    # boundary is call_revert, and config.mutation_fewshot can never attach an exemplar to it.
    # MEASURED (scripts/target_category_census.py, 40 cases / 728 targets, Slither only):
    # explicit_revert = 262 = 36.0% of all targets, 262/262 rendered a state goal, 0/262 attached
    # a fewshot block; a live Pro run with mutation_fewshot=true logged attached=False on 24/24
    # cells.  ON: treat explicit_revert as revert in both places.  False = official behaviour.
    revert_goal_for_explicit_revert: bool = False

    # --- witness replay (the non-LLM branch of test synthesis) -------------------------------
    # ON: every confirmed difference is ALSO translated, mechanically and without the LLM, into a
    # standalone `testReplay_` whose inputs are fixed to the counterexample and whose assertion states
    # the reference-side observation.  It is kept only when its assertions execute and pass on P and one
    # fails on M, judged by the same classify_validation the property branch uses.  It runs regardless of
    # what the property branch does and spends none of its attempt budget, so the two branches stay
    # independent and can be reported separately.  Needs verifier.r2_record_witness_values (the
    # counterexample must carry concrete values).  False = published behaviour: no replay branch.
    witness_replay: bool = False
    # Fill ONLY the constructor arguments the witness leaves unbound from the pipeline's own deployment
    # recipe (prep.resolve_construction); witness-bound arguments always win.  Off = a witness that does
    # not bind every constructor argument yields no replay.
    witness_replay_constructor_fixture: bool = False
    # A state witness reads v at one address key.  In the R2 harness that key IS the caller, so replaying
    # the call as that address is a faithful reading of the witness.  Off = replay as the test contract.
    witness_replay_actor_from_address_key: bool = False
    # Entry state the witness does NOT bind: pranking an invented EOA (0xCE) around the replayed call and
    # funding the fresh instance from the call's first positive uint argument.  Neither is read off the
    # counterexample -- the R2 harness has ONE caller and says nothing about the instance's balance -- so
    # a replay that needs them is not a faithful translation of its witness.  Default OFF; the flag exists
    # so the arm can be MEASURED rather than argued about.
    witness_replay_fabricated_entry_state: bool = False
    # Replay every witness as ONE externally-owned account with tx.origin set to it, matching the
    # single-account deploy-and-call shape of the R2 harness. Off = forge's default test contract.
    witness_replay_eoa_actor: bool = False
    # Concretize a step argument the counterexample left unbound to 0 instead of refusing the witness.
    witness_replay_default_unbound_args: bool = False
    # V43 during-call (CEI/reentrancy) differences: replay them with the harness's receive() observer.
    witness_replay_during_call_observer: bool = False
    # Deploy from a separate account when the witness says the fix REVERTS: in the model the
    # constructor's msg.sender differs from the caller, so an owner guard fails there and passes here.
    witness_replay_separate_deployer: bool = False
    # Try the free rendering choices (separate deployer, rejecting receiver) when the default one
    # fails to reproduce the witness on P.  Acceptance is unchanged: forge still has to say
    # Pass(P) and Break(M).
    witness_replay_adaptive_rendering: bool = False
    # Keep every rendering variant that satisfies Pass(P)/Break(M), not only the first.
    witness_replay_emit_all_variants: bool = False
    # Install the code of the dependency contracts the subject itself declares, at the addresses it
    # itself names. ESBMC does not model extcodesize, so a witness path can go through a call the real
    # EVM reverts on; without this the replay dies before its assertion.
    witness_replay_deploy_declared_dependencies: bool = False
    # Translate an R2 counterexample whose failing property is a safety check inside the MUTANT copy
    # (solc 0.8 arithmetic/bounds). Such a run stops before the wrapper binds the second half of the
    # observed pair, so every observation renderer refuses although the witness is complete.
    witness_replay_safety_check_oracle: bool = False
    # Doc-1 selection: admit mapping(K...)->struct state whose fields are all elementary, projected
    # through solc's synthesized public getter (select.py:_struct_components_of). OFF by default so
    # every published result stays bit-identical.
    select_struct_leaf_projection: bool = False
    # Harvest switch, NOT an ablation arm.  The two branches of test synthesis are independent by
    # construction (the replay runs before the first LLM call and spends none of the property budget),
    # so running the replay branch alone produces exactly the replays a full run would produce, at the
    # cost of the mutation stage only and with no LLM call at all.  Its purpose is re-deriving the
    # replay branch over an ALREADY PUBLISHED mutant set (`--replay-mutants`) without disturbing that
    # run's property tests.  Default OFF = published behaviour.
    replay_only: bool = False

    # --- Reach(P,T): the oracle must actually execute on the reference ------------------------
    # "Passes on P" is satisfied vacuously by a test whose assertion never runs, so acceptance
    # without this premise is missing a condition.  ON: every test the verifier would ACCEPT gets one
    # more query -- the same assembled P program with assert(false) at the oracle site -- and is
    # accepted only if that query returns a counterexample (an execution that reaches the oracle).
    # Costs one query per accepted test, not per attempt.  False = published behaviour.
    require_reachable_oracle: bool = False
    # An UNDECIDED reach query (timeout / non-convergence) is not a proof of unreachability. Default
    # keeps such a test; ON rejects it too (strict reading).
    reject_undecided_reach: bool = False

    # assume distinct address params (balance-aliasing soundness).  MEASURED
    # (scripts/balance_alias_census.py, both result trees): ESBMC models
    # `payable(x).transfer(v)` as an unconditional `x.balance += v` and never models x aliasing
    # the sender, so on `require(recipient == address(c))` the shipped Doc-3 hold command proves
    # `recipient.balance == before + cbal` SUCCESSFUL while refuting the EVM truth
    # `recipient.balance == before` -- with assert(false) FAILED on the same query, so the path is
    # reachable and the proof is not vacuous.  Foundry's fuzz dictionary contains deployed-contract
    # addresses, so the 10000-run gate hits that alias and reports foundry_fuzz_failed_on_P:
    # 9 of the 12 gatefuzz P-side rejections, and 902 rows / 207 (trial,case) cells of the ordinary
    # foundry_fuzz_failed_on_P, carry exactly this shape (balance property + free address param,
    # no `!= address(c)` guard).  ON: the rendered testFuzz_ wrapper vm.assume()s every address
    # parameter away from the handle and the test contract, which is the non-aliasing precondition
    # ESBMC silently assumed anyway.  False = official behaviour.
    assume_distinct_address_params: bool = False

    # PUBLIC SURFACE block in the test prompts.  MEASURED (scripts/compile_failed_p_attribution.py,
    # 25 zero-accepted (trial,case) cells replayed verbatim): 22 of 25 P-side compile failures are
    # the model getting C's INTERFACE wrong -- 15x member-not-on-C (9582/7576/7920), 3x tuple-arity
    # (7364), 1x returns-clause (2800), 1x non-payable C(address) cast (7398) -- vs 3 malformed and
    # 1 stack-too-deep.  scripts/attempt_family_funnel.py puts 4733 rows / 417 cells on
    # foundry_compile_failed_P, and it is the dominant reason in 39 of the 71 cells that never
    # produced a single accepted attempt.  invmut/agents/prompts.py:79,:91 already instruct the model
    # to obey a "PUBLIC SURFACE block" that NOTHING in the tree ever built.  ON: build it from solc's
    # AST (invmut/agents/surface.py) and attach it.  False = official behaviour.
    public_surface_block: bool = False

    # DETERMINISTIC rewrite of `recv.getter(k).member` for a mapping(K => Struct) public getter,
    # whose auto-generated getter returns a TUPLE (invmut/render/foundry.py).  The PUBLIC SURFACE
    # block states the real signature, and MEASURED on rcx_reentrancy__0xf015c3..__SmartFix that
    # moved correct destructuring from 4/35 attempts to 14/35 -- but 11/35 still wrote `.balance`,
    # and Error(9582) stayed 11 of that cell's 22 foundry_compile_failed_P rejections.  Replaying
    # the 19 stored attempts that failed that way: with the rewrite 10 of 19 compile (3 of them
    # then PASS on P) where before all 19 did not.  A prompt hint cannot close it; this can.
    # False = official behaviour.
    struct_getter_member_rewrite: bool = False

    # Bound an LLM-authored test's fuzz parameter where it is used bare as a call value, the way
    # the deterministic renderer already bounds its own (invmut/render/foundry.py VALUE_CAP).
    # MEASURED on rcx_reentrancy__0x4e73b32e.. D0002: with its other two blockers fixed the test
    # still failed on P because the fuzzer drew depositAmount = 2**256-4 and the second
    # `Deposit{value: depositAmount}()` ran out of funds; with the bound it PASSES on P at the
    # official 10000 runs.  False = official behaviour.
    llm_value_param_cap: bool = False
    # `(bool ok,) = address(c).call(abi.encodeWithSignature/Selector/Call(...))` -> `try c.f(args)`.
    # MEASURED 2026-09-23 offline on shipped rejected_attempts (scratchpad ll_offline.py): of the
    # low-level-call malformed_test rejections, RQ1 103/193 and RQ4 88/188 pass the shape checker
    # after the rewrite. False = published behaviour.
    lowlevel_call_rewrite: bool = False
    # `uint256 after = ...` -> `after_` (solc reserved keyword). MEASURED 2026-09-23: RQ4 gpt-5-mini
    # 470 compile failures on `reserved keyword 'after'` in shipped rejected_attempts. False = published.
    rename_reserved_identifiers: bool = False
    # `vm.addr(k)` with a fuzzed uint256 k -> `k = bound(k, 1, n-1)` (secp256k1). MEASURED 2026-09-23:
    # reentrancy_simple t2 (gpt-5-mini) 12/17 P-side fuzz failures were vm.addr aborts. False = published.
    llm_vm_addr_key_bound: bool = False
    # `C(addr)` with `addr` of type address does not compile when C has a payable fallback/receive
    # (solc Error 7398, needs `C(payable(addr))`). MEASURED 2026-09-23 overnight: 45 of 262 RQ4 and 92 of
    # 1640 RQ1 foundry_compile_failed_P. ON: wrap only arguments that are syntactically `address`
    # (render/foundry.payable_contract_casts). Off = published behaviour.
    payable_contract_cast: bool = False
    # `LogFile log;` shadows forge-std's inherited `event log` (solc Error 9097). MEASURED 2026-09-23:
    # 107 of 132 RQ1 Error-9097 rejections (25 runs). ON: render/foundry.rename_harness_shadowing.
    rename_harness_shadowing: bool = False

    # LIVE CALLBACK in the test prompts (invmut/agents/prompts.py:_live_callback).  MEASURED
    # (Results/RQ1/InvMut, the 390 accepted tests of the 23 reentrancy cases, grouped by the shape of the
    # test's own receive()/fallback() and cross-tabbed against the real-bug verdict): no callback at all
    # 351 accepted -> 6 bug_fail (1.7 pct); a live callback that does not call c 15 -> 10 (66.7 pct); a
    # live callback that re-enters c 24 -> 6 (25.0 pct).  90 pct of accepted reentrancy tests carry no
    # callback, and the family's accepted->kill rate is 7.2 pct against 24.9 pct for the rest of the
    # corpus (26 kills from 359 accepted over 118 cells).  _PROMPT_LLM_TEST never mentions a callback (no
    # receive() in its skeleton, and it forbids other contracts). verify/canonical.py:_callback_captures
    # (V43) already permits exactly one guarded re-entrant `c.f(args);`, so the prompts are behind the
    # validator.  The trigger is read off the REFERENCE unit already shown in the prompt, never off the
    # bug or the patch.  False = official behaviour.
    reentrancy_live_callback: bool = False

    # signature_cheatcodes (2026-09-22): admit `vm.sign` / `vm.addr` in the anti-cheat gate
    # (orchestrate/concrete.py) and say so in the test prompt. Both are PURE cryptographic helpers --
    # vm.addr(pk) derives an address, vm.sign(pk, digest) computes an ECDSA signature. Neither writes
    # storage, replaces code, nor mocks a callee, so unlike vm.store / vm.etch / vm.mockCall they cannot
    # manufacture a difference: the SAME test runs on P, on M and on the real bug and the helper behaves
    # identically in all three. They are strictly weaker than the already-allowed vm.deal, which forges an
    # ether balance. Without them a signature-gated entry point has no reachable call at all.
    #   MEASURED (pop_032_PuttyV2 trial 1, DeepSeek Pro arm, after the selection ladder unblocked the case):
    # the patched boundary `fillOrder` IS reached -- 18 of the case's 42 test attempts land on it -- but 13
    # of those 18 are rejected as forbidden_cheatcode:vm.addr / vm.sign because fillOrder is EIP-712 gated,
    # and the case ends with 0 accepted tests (reason=no_test_generated, 465 s).
    #   REACH: 17 corpus cases verify a signature (ecrecover / EIP712 / ECDSA.recover / permit), holding
    # 85 failing cells. False = published behaviour.
    signature_cheatcodes: bool = False

    # import_file_level_types (2026-09-22): put the flat source's TOP-LEVEL type names (interface /
    # library / struct / enum / type / contract declared at column 0, minus C and minus forge-std's own
    # exports) into the rendered test's `import {...}` list. The published skeleton imports ONLY `{C}`
    # and both test prompts forbid adding imports, so an entry point whose SIGNATURE names a file-level
    # type has NO legal call: PrivatePool.sell takes `IStolenNftOracle.Message[] calldata`, and
    # `IStolenNftOracle` is a top-level interface, not a member of C.
    #   MEASURED (pop_018_PrivatePool trial 1, DeepSeek Pro arm): 73 of the case's 80 test attempts were
    # foundry_compile_failed_P, ALL on the patched boundary `sell`, and every sampled one failed with
    # `Error (7920): Identifier not found or not unique.` at the `IStolenNftOracle.Message` use. Taking
    # one of those stored attempts and only widening the import makes it compile.
    # False = published behaviour (the symbol list is then byte-identical).
    import_file_level_types: bool = False

    # mutation_non_view_boundaries_first (2026-09-22): inside the mutation round-robin, serve a target's
    # NON-view boundaries before its view/pure ones, and visit targets whose first boundary is non-view
    # first. A view/pure entry cannot exhibit a state-mutation fault yet costs a full cell; doc1's source
    # order puts the inherited OpenZeppelin getters (paused / supportsInterface / getRoleAdmin / hasRole)
    # at the front. Read off the REFERENCE source only -- the bug/fix diff is never consulted.
    #   MEASURED (scratchpad/order2.py, zero LLM) over the 25 cases whose patched function IS selectable
    # but was never scheduled, against each cell's real popped-cell depth: 4 cases / 18 cells cross from
    # beyond the depth to inside it (pop_001_Multicall 28->2, acfix_fixlink_Product 28->11,
    # acfix_002_Templedao and acfix_llama3_002_Templedao 13->7) and ZERO move the other way.
    # False = published behaviour.
    mutation_non_view_boundaries_first: bool = False

    # mutation_prefetch_workers (2026-09-22): how many of the NEXT cells' batch mutation LLM calls to
    # issue concurrently while the current cell is being validated. The calls are independent (one batch
    # per (target, boundary), built from the REFERENCE source alone) and every order-dependent step --
    # the seen_change_hashes dedup, the mutation records, the emits -- still runs serially in _run_cell
    # in the unchanged walk order.
    #   MEASURED (acfix_002_Templedao trial 1, DeepSeek Pro arm on the deepseek flex tier): a cell costs
    # 52-180 s wall and the batch mutation call is the bulk of it, so the 462 s mutation budget bought
    # 3 of 19 planned cells and the patched boundary `migrateStake` (index 8 after non-view-first
    # ordering) was never popped. 0 = no prefetch = published behaviour.
    mutation_prefetch_workers: int = 0

    # esbmc_harness_construction_decls (2026-09-22): append the construction recipe's own declarations
    # (prep.HANDLE_STUB_SRC, emitted when config.construction_fixtures substitutes
    # `address(new __InvMutHandleStub())` for a constructor handle) to the ESBMC harness. verify/assemble
    # builds that harness as `p_source + test`, so the stub type is undeclared and solc rejects the whole
    # program -- the Foundry side gets the declaration via prep.render_construction_decls, the ESBMC side
    # never did. MEASURED (acfix_3_5_101_ANCHToken t1, DeepSeek Pro arm): 23 of 36 attempts died
    # harness_compile_failed on exactly that constructor; the reason appears 304 times corpus-wide.
    # Identical on P and M, so it cannot manufacture a difference. False = published behaviour.
    esbmc_harness_construction_decls: bool = False

    # X-CALL cell ordering (invmut/orchestrate/run.py:_apply_xcall).  doc1 lists state targets first and
    # then explicit_revert targets in SOURCE order; source order carries no methodological meaning.
    # MEASURED (scripts/focus_census.py --results Results/RQ1/InvMut --config deepseek-v4-pro --trials 1):
    # REAL focus utilization is 22.7 pct -- 262 of 1155 planned cells attempted -- and 52 of the 58
    # starved REAL rows failed, so WHICH cells survive the mutation deadline decides the cell.  In
    # rcx_reentrancy__0xbe4041..__sGuard the only unit that makes an external call (Collect) is LAST in
    # doc1 order; two measured 660 s runs reached T0000..T0005 and the deadline fired 2 s before T0006,
    # so the one cell that can expose the real bug was never attempted.  ON: a target whose editable
    # units send value or make a low-level/contract call is ordered first, and inside a target the
    # boundary whose own function makes such a call is ordered first.  The signal is read from the
    # REFERENCE source in rc.p_source -- the bug/fix diff is never consulted -- so it is bug-agnostic in
    # the same sense as mutation_state_writers_first.  False = official behaviour.
    mutation_external_call_units_first: bool = False

    # REQUIRED SETUP block in the test prompts (invmut/agents/surface.py:build_setup_block), appended to
    # the same {PUBLIC_SURFACE} slot.  A state variable whose type is another CONTRACT and whose initial
    # value is an address literal or nothing points at an address with NO CODE in a fresh Foundry EVM, so
    # every call through that handle reverts -- the REFERENCE contract cannot reach its own happy path
    # until the test deploys that contract and registers it through a public setter, and the setter is
    # itself guarded so the call ORDER matters.  MEASURED: 11 of the 23 reentrancy cases (55 cells) are
    # the ACCURAL_DEPOSIT / MONEY_BOX shape (`LogFile Log = LogFile(0x0486cF65...)`, `Log LogFile;`), and
    # in three 660 s runs of rcx_reentrancy__0xbe4041..__sGuard every generated test on the Collect
    # boundary died foundry_fuzz_failed_on_P because it called Put/Collect before SetLogFile, or called
    # SetLogFile after Initialized().  `LogFile` is internal with no getter, so the prerequisite is
    # invisible on the public surface.  Derived from the REFERENCE source only.  False = official.
    required_setup_block: bool = False

    # CALL-ORDER move operator in the batch mutation prompt (prompts.py:_mutate_callorder).  The prompt
    # already allows `move` and the JSON schema already has "move", but the operation is never associated
    # with the state updates around an external call.  MEASURED (rcx_reentrancy__0x4320e6..__SmartFix,
    # whose real fix MOVES `balances[msg.sender] -= _am` from after `msg.sender.call{value:_am}("")` to
    # before it): a 660 s run reached the Collect boundary and proposed 11 mutants there -- guard flips,
    # subtraction->addition, zero transfer amount, drop the success check -- and none moves the state
    # update across the call, so the mutant that mirrors the real defect never exists (class-(a) miss).
    # The trigger is the presence of an external call in the REFERENCE unit, not the bug.  False = official.
    mutate_call_order: bool = False

    # no mutation deadline (USER 2026-06-30): when True, run_case does NOT set the internal 0.75 case-wall
    # split (mutation_deadline). That split reserved 25% for kill_check but, when ESBMC R2 ran slow, it
    # could consume the time reserved for later phases. For a BATCH campaign with an outer SIGKILL, keep
    # False (or raise --timeout) so kill_check is not cut.
    no_mutation_deadline: bool = False

    # TWO-DEADLINE budget: cap R2/mutation at mutation_deadline_fraction*T, run deferred tests until the
    # later fuzz_deadline_fraction*T, and reserve the remainder for kill_check. Active when
    # no_mutation_deadline=False. The field name is retained for artifact compatibility.
    mutation_deadline_fraction: float = 0.7
    fuzz_deadline_fraction: float = 0.9

    # --- experiment knobs (DEVIATIONS V11) ---
    # full | llm_only | ablation arms no_df / no_tt / no_re (or '+'-joined combos, e.g. "no_df+no_re").
    # full/no_* all run orchestrate.run.run_unit with RunContext ablation flags; llm_only is its own arm.
    run_mode: str = "full"
    # run_mode direct_pbt / no_mg (invmut/orchestrate/direct.py): score each accepted test against the real
    # bug right after acceptance (True) or, like Full, only after generation ends (False).
    direct_score_inline: bool = True
    # forge timeout of the P-pass of an accepted direct_pbt / no_mg test (0 = verifier.forge_per_test_timeout_s)
    direct_p_pass_timeout_s: int = 0
    # direct_pbt / no_mg budget (user 2026-09-25, "600+60"): no new attempt starts after
    # direct_generation_s; accepted tests are scored until direct_score_until_s (an unscored test is no
    # kill); the launcher SIGKILLs at 660 s. Both measured from run_case's t0.
    direct_generation_s: int = 600
    direct_score_until_s: int = 650
    # direct_pbt / no_mg: stop the cell once a test counts as a kill and the gate regime reproduces it
    direct_stop_on_kill: bool = False
    # Foundry persists fuzz counterexamples under <cwd>/cache/fuzz and REPLAYS them into any later test with
    # the same contract + function name -- every rendered test is InvMutTest.testFuzz_run, and every case
    # process shares the artifact root as cwd. True points each forge run at its own workspace's cache
    # (FOUNDRY_FUZZ_FAILURE_PERSIST_DIR), so no verdict depends on which test ran before. False = published.
    forge_isolate_failure_cache: bool = False
    low_value_gate_enabled: bool = False
    # mutant REPLAY (USER 2026-06-28): reuse a prior run's generated mutant CANDIDATES instead of calling
    # the LLM mutate agent — e.g. run no_tt, then no_df with replay_mutants_root=<no_tt out>. Points at a
    # run's output root; run_case loads <root>/<case_id>/.../mutants.jsonl per case. None ⇒ generate via LLM
    # (current behavior). Guaranteed path: no_df replays no_tt. See notes/MUTANT_REUSE_CACHE_PLAN.md.
    replay_mutants_root: str | None = None

    # --- reproducibility provenance (Doc 5 §3.2) ---
    forge_std_version: str | None = None
    project_git_commit: str | None = None
    container_image: str | None = None
    docs_version_hash: dict[str, str] = field(default_factory=dict)
    esbmc_profile_id: str | None = None  # hash of ESBMC_PROFILE.json (DEVIATIONS V11)

    # -------------------------------------------------------------------------

    @staticmethod
    def load(path: str | Path) -> "Config":
        raw = json.loads(Path(path).read_text())
        return Config.from_dict(raw)

    @staticmethod
    def from_dict(raw: dict[str, Any]) -> "Config":
        raw = dict(raw)
        sub = {
            "verifier": (VerifierParams, raw.pop("verifier", {})),
            "llm": (LLMConfig, raw.pop("llm", {})),
            "ablation": (AblationFlags, raw.pop("ablation", {})),
        }
        kwargs: dict[str, Any] = {}
        for name, (cls, val) in sub.items():
            kwargs[name] = cls(**val) if isinstance(val, dict) else val
        known = {f.name for f in dataclasses.fields(Config)}
        unknown = set(raw) - known
        if unknown:
            raise ConfigError(f"unknown config keys: {sorted(unknown)}")
        kwargs.update(raw)
        # Resolve portable (~ / repo-relative) tool+artifact paths to absolute (machine-agnostic config).
        for _f in _PATH_FIELDS:
            if _f in kwargs:
                kwargs[_f] = _resolve_path(kwargs[_f])
        return Config(**kwargs)

    def to_dict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)

    # --- version pinning -----------------------------------------------------

    def verify_tools(self) -> None:
        """Run each tool's --version and assert exact match. Abort loudly otherwise.

        NEVER falls back to $PATH. The configured path must be the exact binary.
        """
        checks = [
            ("esbmc", self.esbmc_bin, ["--version"], self.esbmc_version_expected),
            ("solc", self.solc_bin, ["--version"], self.solc_version_expected),
            ("slither", self.slither_bin, ["--version"], self.slither_version_expected),
            ("forge", self.forge_bin, ["--version"], self.forge_version_expected),
        ]
        problems: list[str] = []
        for name, binpath, args, expected in checks:
            p = Path(binpath)
            if not p.is_absolute():
                problems.append(f"{name}: path is not absolute: {binpath!r} (PATH fallback forbidden)")
                continue
            if not p.exists():
                problems.append(f"{name}: binary not found at {binpath!r}")
                continue
            try:
                out = subprocess.run(
                    [binpath, *args], capture_output=True, text=True, timeout=30
                )
            except Exception as e:  # noqa: BLE001
                problems.append(f"{name}: failed to run --version: {e}")
                continue
            blob = (out.stdout + "\n" + out.stderr)
            if not self._version_ok(blob, expected):
                problems.append(
                    f"{name}: version mismatch (mode={self.version_match_mode}); "
                    f"expected {expected!r}; got: {blob.strip().splitlines()[:2]}"
                )
        if self.forge_std_path and not Path(self.forge_std_path, "src", "Test.sol").exists():
            problems.append(f"forge-std: {self.forge_std_path}/src/Test.sol missing")
        if problems:
            raise ConfigError("tool version verification failed:\n  - " + "\n  - ".join(problems))

    def _version_ok(self, blob: str, expected: str) -> bool:
        if self.version_match_mode == "exact":
            return expected in blob
        # "loose": allow a prefix match (local smoke debugging only; refused by experiment entry)
        token = expected.split("+")[0].rstrip("x.")
        return token in blob

    def resolve_api_key(self) -> str:
        key = os.environ.get(self.llm.api_key_env)
        if not key:
            raise ConfigError(
                f"{self.llm.api_key_env} not set in environment; "
                "export the LLM API key (never stored in config / run tree)."
            )
        return key

    def require_experiment_safe(self) -> None:
        """Refuse loose version matching for a real experiment run (Doc 5 §3.1)."""
        if self.version_match_mode != "exact":
            raise ConfigError(
                "experiment runs require version_match_mode='exact'; "
                "loose is allowed only for local smoke debugging."
            )
