
from __future__ import annotations

import re
import os
import subprocess
from dataclasses import dataclass

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.render.forge_parse import ForgeOutcome, parse_forge_json


def run_forge(config: Config, workspace_dir: str, test_name: str = "InvMutTest",
              match_test: str | None = None) -> ForgeOutcome:
    argv = cmd.build_forge_command(config, workspace_dir, match_contract=f"^{test_name}$",
                                   match_test=match_test)
    timed_out = False
    env = None
    if getattr(config, "forge_isolate_failure_cache", False):
        env = dict(os.environ, FOUNDRY_FUZZ_FAILURE_PERSIST_DIR=os.path.join(
            os.path.abspath(workspace_dir), "cache", "fuzz"))
    try:
        proc = subprocess.run(
            argv, capture_output=True, text=True,
            timeout=config.verifier.forge_per_test_timeout_s, env=env,
        )
        stdout, stderr = proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as e:
        stdout = (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or "")
        stderr = (e.stderr or b"").decode() if isinstance(e.stderr, bytes) else (e.stderr or "")
        timed_out = True
    return parse_forge_json(stdout, stderr, suite_contract=test_name, timed_out=timed_out)



@dataclass
class ValidationVerdict:
    status: str
    error: str | None = None
    p_outcome: ForgeOutcome | None = None
    m_outcome: ForgeOutcome | None = None


def _testfuzz_failed(o: ForgeOutcome) -> bool:
    return o.any_failure(("testFuzz_", "testRegression_", "testReplay_"))


_ERR_RE = re.compile(r"(?:Error \(\d+\)|ParserError|TypeError|DeclarationError|Compiler run failed)"
                     r"[^\n]*(?:\n[^\n]*){0,3}")


def forge_diagnostic(o: ForgeOutcome | None, limit: int = 1200) -> str | None:
    if o is None:
        return None
    if o.kind == "compile_failed":
        hits = _ERR_RE.findall(o.raw or "")
        return ("\n".join(hits)[:limit] or (o.raw or "")[:limit]) or None
    if o.kind == "setup_failed":
        return (f"setUp: {o.setup_reason}" if o.setup_reason else "setUp failed")[:limit]
    if o.kind in ("no_suite", "parse_error", "timeout"):
        return f"{o.kind}: {(o.raw or '')[:limit]}" or None
    failed = [f"{n}: {tr.get('reason') or 'Failure'}"
              for n, tr in (o.tests or {}).items() if tr.get("status") == "Failure"]
    return "\n".join(failed)[:limit] or None


def classify_validation(p: ForgeOutcome, m: ForgeOutcome) -> ValidationVerdict:
    if p.kind == "compile_failed":
        return ValidationVerdict("validation_error", "foundry_compile_failed_P", p, m)
    if p.kind == "setup_failed":
        return ValidationVerdict("validation_error", "foundry_setup_failed_P", p, m)
    if p.kind in ("no_suite", "parse_error", "timeout"):
        return ValidationVerdict("validation_error", "foundry_timeout" if p.kind == "timeout"
                                 else "foundry_compile_failed_P", p, m)
    if _testfuzz_failed(p):
        if p.status_of("testRegression_") == "Failure":
            return ValidationVerdict("validation_error", "foundry_regression_failed_on_P", p, m)
        return ValidationVerdict("validation_error", "foundry_fuzz_failed_on_P", p, m)

    if m.kind == "compile_failed":
        return ValidationVerdict("validation_error", "foundry_compile_failed_M", p, m)
    if m.kind == "setup_failed":
        return ValidationVerdict("validation_error", "foundry_compile_failed_M", p, m)
    if m.kind in ("no_suite", "parse_error", "timeout"):
        return ValidationVerdict("validation_error", "foundry_timeout" if m.kind == "timeout"
                                 else "foundry_compile_failed_M", p, m)
    if not _testfuzz_failed(m):
        return ValidationVerdict("validation_error", "foundry_regression_passed_on_M", p, m)
    return ValidationVerdict("passed", None, p, m)


def classify_validation_m_only(m: ForgeOutcome) -> ValidationVerdict:
    if m.kind == "compile_failed":
        return ValidationVerdict("validation_error", "foundry_compile_failed_M", None, m)
    if m.kind == "setup_failed":
        return ValidationVerdict("validation_error", "foundry_compile_failed_M", None, m)
    if m.kind in ("no_suite", "parse_error", "timeout"):
        return ValidationVerdict("validation_error", "foundry_timeout" if m.kind == "timeout"
                                 else "foundry_compile_failed_M", None, m)
    if not _testfuzz_failed(m):
        return ValidationVerdict("validation_error", "foundry_regression_passed_on_M", None, m)
    return ValidationVerdict("passed", None, None, m)
