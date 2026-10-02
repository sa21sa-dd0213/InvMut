
from __future__ import annotations

from typing import Literal

from invmut.config import Config

FORBIDDEN_FLAGS = ("--no-slice",)
FORBIDDEN_ALWAYS = ("--unwind",)

BoundMode = Literal["unbound", "bound"]
Engine = Literal["incremental-bmc", "k-induction"]

R1_CHECKS = (
    "--div-by-zero-check",
    "--bounds-check",
    "--narrowing-check",
)


def assert_argv_safe(argv: list[str], *, allow_no_slice: bool = False) -> None:
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
    argv = [
        config.esbmc_bin,
        sol_path,
        "--solc-bin",
        config.solc_bin,
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



def build_r1_command(config: Config, sol_path: str, contract_name: str,
                     focus_function: str | None = None) -> list[str]:
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
    out = [*argv, "--cvc5"]
    assert_argv_safe(out)
    return out
