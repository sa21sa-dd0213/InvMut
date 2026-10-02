"""Central ESBMC/forge command builder (Doc 5 §12.4).

This is the ONLY place that constructs esbmc/forge argv. Every stage and the smoke gate
build commands here, so a stale doc command (e.g. Doc 2/Doc 5 R2 still showing --unbound)
can never reach a real run (DEVIATIONS V13).

Locked per-stage modes (notes/ESBMC_FINDINGS.md, notes/DEVIATIONS.md):
- R1 safety  : --unbound  + safety checks + --incremental-bmc  (nondet self-reentry needed)
- R2 diff    : --bound    + --no-standard-checks + --incremental-bmc   (V1: typed calls need
               --bound to dispatch real code; --unbound gives nondet-vs-nondet false diffs)
- Doc 3 test : --bound    + --k-induction   (needs a real PROVED on P)

Hard bans (ERRORS.md #24/#26; Doc 5 §3.5, §12.4): never --no-slice in normal
verification; never --unwind (and never --unwind with --k-induction).  The only
--no-slice exception is an explicit R2 local-pack CE-witness recovery mode that
is ledgered and used to make already-found multi-property counterexamples
replayable. Every esbmc command carries --memlimit and an explicit
--solidity-max-tx (DEVIATIONS V10). Input is the direct `.sol` form (README
quick start), not `--sol <file>` (DEVIATIONS V13 nit).
"""

from __future__ import annotations

from typing import Literal

from invmut.config import Config

FORBIDDEN_FLAGS = ("--no-slice",)
FORBIDDEN_ALWAYS = ("--unwind",)  # banned experiment-wide; use --max-k-step instead

BoundMode = Literal["unbound", "bound"]
Engine = Literal["incremental-bmc", "k-induction"]

# R1 = introduced bounds/panic faults, per-check differential vs P baseline (DEVIATIONS V16).
# --reentry-check DROPPED: it fires on any external call (P included) and cannot differentiate the
# mutant (F7). --narrowing-check catches sub-256-bit SILENT truncation (e.g. uint8(256)) — 0.8 does
# NOT auto-revert downcasts, so it is a real silent bug class and stays.
# --overflow-check / --unsigned-overflow-check REMOVED: post-0.8 checked arithmetic auto-reverts
# (panic 0x11), so an "introduced overflow" is not a bug (dataset arithmetic cases dropped). R1 must
# not claim a spurious cheap-win on it; such a mutant just falls through to R2 as a revert difference.
R1_CHECKS = (
    "--div-by-zero-check",
    "--bounds-check",
    "--narrowing-check",
)


def assert_argv_safe(argv: list[str], *, allow_no_slice: bool = False) -> None:
    """Reject any forbidden flag or forbidden mode mix. Raise loudly (Doc 5 §12.4)."""
    s = set(argv)
    for bad in FORBIDDEN_FLAGS:
        if bad in s and not (bad == "--no-slice" and allow_no_slice):
            raise ValueError(f"forbidden esbmc flag in argv: {bad} (ERRORS.md #24)")
    for bad in FORBIDDEN_ALWAYS:
        if bad in s:
            raise ValueError(f"forbidden esbmc flag in argv: {bad} (banned experiment-wide, ERRORS.md #26)")
    if "--unwind" in s and "--k-induction" in s:
        raise ValueError("--unwind cannot coexist with --k-induction (ERRORS.md #26)")
    if "--bound" in s and "--unbound" in s:
        raise ValueError("contradictory external-call modes: --bound and --unbound (B3)")
    if "--incremental-bmc" in s and "--k-induction" in s:
        raise ValueError("contradictory engines: --incremental-bmc and --k-induction (B3)")
    if "--focus-function" in s and "--function" in s:
        # --focus-function narrows nondet dispatch to one entry; --function picks a single entry
        # function. Both select an entry set and would contradict; never combine (focus-fn guard).
        raise ValueError("contradictory entry selectors: --focus-function and --function")
    if "--memlimit" not in s:
        raise ValueError("every esbmc command must carry --memlimit (DEVIATIONS V10)")
    if "--solidity-max-tx" not in s:
        raise ValueError("every esbmc command must carry an explicit --solidity-max-tx (DEVIATIONS V10)")


def build_esbmc(
    config: Config,
    *,
    sol_path: str,
    contract: str,
    bound_mode: BoundMode,
    engine: Engine,
    max_k_step: int,
    solidity_max_tx: int,
    checks: tuple[str, ...] = (),
    show_trace: bool = True,
    focus_function: str | None = None,
    extra: tuple[str, ...] = (),
    allow_no_slice: bool = False,
) -> list[str]:
    """Build one esbmc argv. All stage builders funnel through this (so the gate runs once).

    `focus_function` (FOCUS_FUNCTION_PLAN): when set, restrict ESBMC's nondet dispatch to that one
    entry. The constructor + state setup are unchanged; this REDEFINES the checked property to the
    narrower-but-sound 'same init state, dispatch ONLY this fn → difference' (used to converge R1/R2
    on huge contracts that otherwise spin inconclusive). NEVER on the Doc-3 proof stage (under-
    approximating reachable state would yield a false SUCCESS)."""
    argv = [
        config.esbmc_bin,
        sol_path,
        "--solc-bin",
        config.solc_bin,  # pin solc explicitly; never let esbmc resolve solc from $PATH
        "--contract",
        contract,
        f"--{bound_mode}",
        *checks,
        f"--{engine}",
        "--max-k-step",
        str(max_k_step),
        "--solidity-max-tx",
        str(solidity_max_tx),
        "--memlimit",
        str(config.verifier.esbmc_memlimit_mb),
    ]
    if focus_function:
        argv += ["--focus-function", focus_function]
    if show_trace:
        argv.append("--show-funccall-trace")
    argv.extend(extra)
    assert_argv_safe(argv, allow_no_slice=allow_no_slice)
    return argv


# --- Stage builders (Doc 5 §12.4) ------------------------------------------------------

def build_r1_command(config: Config, sol_path: str, contract_name: str,
                     focus_function: str | None = None) -> list[str]:
    """R1 safety check (Doc 2 §5; DEVIATIONS V16). Run on BOTH P (baseline) and M; the
    introduced-fault set is M's violations minus P's. --multi-property reports ALL violations
    in one run so the full set is available even if the verifier does not converge on every
    property (V16 timeout handling). `focus_function` (the mutated function's bare name) is the
    adaptive in-run escalation for a non-converging unbound R1 (FOCUS_FUNCTION_PLAN B4)."""
    return build_esbmc(
        config,
        sol_path=sol_path,
        contract=contract_name,
        bound_mode="unbound",
        engine="incremental-bmc",
        max_k_step=config.verifier.r1_max_k_step,
        solidity_max_tx=config.verifier.r1_solidity_max_tx,
        checks=R1_CHECKS,
        focus_function=focus_function,
        extra=("--multi-property",),
    )


def build_r2_command(config: Config, harness_path: str, harness_contract: str = "Harness",
                     focus_function: str | None = None) -> list[str]:
    """R2 observational differential harness (Doc 2 §6.5). LOCKED --bound (DEVIATIONS V1).
    `focus_function` (an asserting `s{idx}_<fn>` Harness wrapper name) is the adaptive in-run
    escalation for a non-converging R2 (FOCUS_FUNCTION_PLAN): narrows dispatch to that wrapper."""
    return build_esbmc(
        config,
        sol_path=harness_path,
        contract=harness_contract,
        bound_mode="bound",
        engine="incremental-bmc",
        max_k_step=config.verifier.r2_max_k_step,
        solidity_max_tx=config.verifier.r2_solidity_max_tx,
        checks=("--no-standard-checks",),
        focus_function=focus_function,
    )


def build_r2_multi_property_command(
    config: Config,
    harness_path: str,
    harness_contract: str = "Harness",
    focus_function: str | None = None,
    preserve_ce_witness: bool = False,
    solidity_max_tx: int | None = None,
    max_k_step: int | None = None,
) -> list[str]:
    """R2 local packed-observation harness.

    This is not the default R2 command.  It is only for local packs whose
    assertions carry stable IDs and whose parser path can attach the CE witness
    to the violated assertion.
    """
    extra = ("--multi-property",)
    if preserve_ce_witness:
        extra = (*extra, "--no-slice")
    return build_esbmc(
        config,
        sol_path=harness_path,
        contract=harness_contract,
        bound_mode="bound",
        engine="incremental-bmc",
        max_k_step=max_k_step or config.verifier.r2_max_k_step,
        solidity_max_tx=solidity_max_tx or config.verifier.r2_solidity_max_tx,
        checks=("--no-standard-checks",),
        focus_function=focus_function,
        extra=extra,
        allow_no_slice=preserve_ce_witness,
    )


def build_doc3_hold_command(
    config: Config, program_p_path: str, test_name: str, max_k_step: int | None = None
) -> list[str]:
    """Doc 3 Direction 1: prove the property holds on P (Doc 3 §5). --bound --k-induction."""
    return build_esbmc(
        config,
        sol_path=program_p_path,
        contract=test_name,
        bound_mode="bound",
        engine="k-induction",
        max_k_step=max_k_step or config.verifier.doc3_max_k_step,
        solidity_max_tx=config.verifier.doc3_solidity_max_tx,
    )


def build_doc3_break_command(
    config: Config, program_m_path: str, test_name: str, max_k_step: int | None = None
) -> list[str]:
    """Doc 3 Direction 2: refute the property on M (find a counterexample at the target assert).
    USER 2026-06-30: refutation wants a BUG FINDER, not a prover — k-induction is poor at reaching a
    deep counterexample, so use --incremental-bmc with a deeper bound (max-k-step) and more transactions
    (solidity-max-tx). This is what lets the kill-check actually FIND the fix->bug divergence (the prior
    k-induction often returned no-cex -> bug_no_kill). Direction 1 (prove on P) stays --k-induction (a
    proof method) with a shallow tx. Configurable via verifier.doc3_break_* (defaults 12 / 3)."""
    return build_esbmc(
        config,
        sol_path=program_m_path,
        contract=test_name,
        bound_mode="bound",
        engine="incremental-bmc",
        max_k_step=max_k_step or getattr(config.verifier, "doc3_break_max_k_step", 12),
        solidity_max_tx=getattr(config.verifier, "doc3_break_solidity_max_tx", 3),
    )


def build_forge_command(config: Config, workspace_dir: str,
                        match_contract: str = "^InvMutTest$", match_test: str | None = None,
                        json: bool = True) -> list[str]:
    """forge test in a rendered workspace (Doc 4 §5, Doc 5 §12.5).

    `--match-contract '^InvMutTest$'` is MANDATORY (codex F1): a dataset flat source can itself contain
    DSTest/`vm.*` test-like contracts that `forge test` would otherwise discover and run, whose unrelated
    failures could be mis-counted as a kill. `--json` (codex F2/F6) gives per-test structured results so a
    compile/setUp failure is never confused with a property failure."""
    argv = [
        config.forge_bin,
        "test",
        "--root",
        workspace_dir,
        "--match-contract",
        match_contract,
        "--fuzz-seed",
        str(config.verifier.forge_fuzz_seed),
    ]
    if match_test:
        argv += ["--match-test", match_test]
    if json:
        argv.append("--json")
    return argv


def with_cvc5(argv: list[str]) -> list[str]:
    """Append the one --cvc5 solver retry (Doc 3 §5). Re-checked by the gate."""
    out = [*argv, "--cvc5"]
    assert_argv_safe(out)
    return out
