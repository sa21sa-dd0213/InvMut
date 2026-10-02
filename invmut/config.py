
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
    pass


_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PATH_FIELDS = ("esbmc_bin", "solc_bin", "slither_bin", "forge_bin", "forge_std_path")


def _resolve_path(p: str) -> str:
    if not isinstance(p, str) or not p:
        return p
    p = os.path.expanduser(p)
    if not os.path.isabs(p):
        p = os.path.join(_REPO_ROOT, p)
    return os.path.abspath(p)


@dataclass(frozen=True)
class VerifierParams:

    r1_max_k_step: int = 7
    r2_max_k_step: int = 10
    r2_pack_max_k_step: int = 3
    doc3_max_k_step: int = 10
    doc3_max_k_step_retry: int = 20
    doc3_break_max_k_step: int = 12
    doc3_break_solidity_max_tx: int = 3
    r1_solidity_max_tx: int = 2
    r2_solidity_max_tx: int = 2
    focused_vacuity_probe: bool = False
    doc3_solidity_max_tx: int = 1
    timeout_seconds_per_call: int = 60
    r2_unfocused_timeout_s: int = 15
    esbmc_memlimit_mb: int = 8192
    solver_retry_with_cvc5: bool = True
    forge_per_test_timeout_s: int = 30
    forge_fuzz_runs: int = 10000
    forge_fuzz_seed: int = 1
    accept_gate_fuzz_runs: int = 0
    accept_gate_fuzz_seed: int = 0
    accept_gate_max_test_rejects: int = 0
    kill_check_mode: str = "m_only"
    count_bug_compile_fail_as_kill: bool = True
    esbmc_cache_dir: str | None = None
    cache_esbmc_timeouts: bool = True
    proactive_focus: bool = True
    focus_skip_multitx: bool = True
    kill_esbmc_or_foundry: bool = True
    esbmc_kill_forge_audit: bool = False
    r2_record_witness_values: bool = False
    r2_witness_live_copies: bool = False
    r2_record_post_balance: bool = False
    r2_wide_observation: bool = False


@dataclass(frozen=True)
class LLMConfig:

    model: str = "deepseek-v4-pro"
    reasoning_effort: str = "none"
    base_url: str | None = None
    extra_body: dict[str, Any] | None = None
    api_key_env: str = "DEEPSEEK_API_KEY"
    service_tier: str = "flex"
    temperature: float = 1.0
    role_model_overrides: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class AblationFlags:

    disable_verifier_feedback: bool = False
    disable_r1: bool = False
    disable_duplicates_filter: bool = False
    disable_fallback_narrowing: bool = False
    single_mutation_attempt: bool = False


@dataclass(frozen=True)
class Config:
    esbmc_bin: str
    esbmc_version_expected: str
    solc_bin: str
    solc_version_expected: str
    slither_bin: str
    slither_version_expected: str
    forge_bin: str
    forge_version_expected: str
    forge_std_path: str
    version_match_mode: str = "exact"

    verifier: VerifierParams = field(default_factory=VerifierParams)
    llm: LLMConfig = field(default_factory=LLMConfig)
    ablation: AblationFlags = field(default_factory=AblationFlags)

    max_reflections: int = 5
    max_json_retries_per_call: int = 2
    max_mutation_attempts_per_statement: int = 3
    max_mutation_attempts_per_goal: int = 20
    max_reflection_repairs_per_mutation: int = 1
    max_test_attempts_per_confirmed_difference: int = 5
    render_param_only: bool = False
    realize_rendered_tests: bool = False

    r2_pack_screen: bool = False
    editable_internal_units: bool = False

    diff_anchored_mutation: bool = False

    minimal_test_prompt: bool = True
    abi_block_in_test_prompt: bool = False
    dead_difference_unknown_limit: int = 0
    r2_cell_wall_s: int = 0
    r2_cell_wall_hard: bool = False
    precise_test_diags: bool = False
    test_prompt_notes: bool = False
    deferred_test_phase: bool = False
    fair_share_targets: bool = False
    select_inherited_state: bool = False
    ctor_value_from_require: bool = False
    ctor_nonzero_scalar_args: bool = False
    p_deploy_canary: bool = False
    stage3_framework_abort_k: int = 0
    select_value_transfer_targets: bool = False
    construction_fixtures: bool = False
    mutation_fewshot: bool = False
    resume_dropped_candidates: bool = False
    deploy_real_dependency_fixtures: bool = False
    boundary_guard_trap_stop: bool = False
    r2_fast_revert_retry_when_nonconverged: bool = False
    r2_parallel_workers: int = 0
    deferred_test_round_robin: bool = False
    deferred_test_boundary_interleave: bool = False
    test_break_timeout_s: int = 0
    kill_check_hard_deadline: bool = False
    mutation_passes_until_deadline: int = 1
    mutation_state_writers_first: bool = False
    mutate_preconditions: bool = False
    revert_aware_p_diag: bool = False
    external_observer_helper: bool = False
    mutate_statement_coverage: bool = False
    llm_request_timeout_s: int = 0
    revert_goal_for_explicit_revert: bool = False

    witness_replay: bool = False
    witness_replay_constructor_fixture: bool = False
    witness_replay_actor_from_address_key: bool = False
    witness_replay_fabricated_entry_state: bool = False
    witness_replay_eoa_actor: bool = False
    witness_replay_default_unbound_args: bool = False
    witness_replay_during_call_observer: bool = False
    witness_replay_separate_deployer: bool = False
    witness_replay_adaptive_rendering: bool = False
    witness_replay_emit_all_variants: bool = False
    witness_replay_deploy_declared_dependencies: bool = False
    witness_replay_safety_check_oracle: bool = False
    select_struct_leaf_projection: bool = False
    replay_only: bool = False

    require_reachable_oracle: bool = False
    reject_undecided_reach: bool = False

    assume_distinct_address_params: bool = False

    public_surface_block: bool = False

    struct_getter_member_rewrite: bool = False

    llm_value_param_cap: bool = False
    lowlevel_call_rewrite: bool = False
    rename_reserved_identifiers: bool = False
    llm_vm_addr_key_bound: bool = False
    payable_contract_cast: bool = False
    rename_harness_shadowing: bool = False

    reentrancy_live_callback: bool = False

    signature_cheatcodes: bool = False

    import_file_level_types: bool = False

    mutation_non_view_boundaries_first: bool = False

    mutation_prefetch_workers: int = 0

    esbmc_harness_construction_decls: bool = False

    mutation_external_call_units_first: bool = False

    required_setup_block: bool = False

    mutate_call_order: bool = False

    no_mutation_deadline: bool = False

    mutation_deadline_fraction: float = 0.7
    fuzz_deadline_fraction: float = 0.9

    run_mode: str = "full"
    direct_score_inline: bool = True
    direct_p_pass_timeout_s: int = 0
    direct_generation_s: int = 600
    direct_score_until_s: int = 650
    direct_stop_on_kill: bool = False
    forge_isolate_failure_cache: bool = False
    low_value_gate_enabled: bool = False
    replay_mutants_root: str | None = None

    forge_std_version: str | None = None
    project_git_commit: str | None = None
    container_image: str | None = None
    docs_version_hash: dict[str, str] = field(default_factory=dict)
    esbmc_profile_id: str | None = None


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
        for _f in _PATH_FIELDS:
            if _f in kwargs:
                kwargs[_f] = _resolve_path(kwargs[_f])
        return Config(**kwargs)

    def to_dict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)


    def verify_tools(self) -> None:
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
            except Exception as e:
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
        if self.version_match_mode != "exact":
            raise ConfigError(
                "experiment runs require version_match_mode='exact'; "
                "loose is allowed only for local smoke debugging."
            )
