"""Append-only provenance and time ledger for ESBMC calls.

The runner's ``elapsed_s`` is engine time, but a cached result carries historical
engine time.  This wrapper records both the observed wall time and a separately
charged verification time (zero for a cache hit).  It does not select work or
alter a verdict and can therefore wrap baseline and recovery profiles alike.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from invmut.esbmc import parse
from invmut.esbmc.cache import _normalized_tokens
from invmut.esbmc.runner import EsbmcRun, RunFn


LEDGER_SCHEMA = "invmut-esbmc-call-ledger/v1"


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_text(value: str) -> str:
    return _sha256_bytes(value.encode("utf-8", "replace"))


def _source_sha256(argv: list[str]) -> str | None:
    if len(argv) < 2:
        return None
    try:
        return _sha256_bytes(Path(argv[1]).read_bytes())
    except OSError:
        return None


def classify_call(argv: list[str]) -> str:
    name = Path(argv[1]).name if len(argv) > 1 else ""
    prefixes = (
        ("invmut_r1_", "R1"),
        ("invmut_r2pack_", "R2_LOCAL_PACK"),
        ("invmut_r2focus_", "R2_FOCUSED"),
        ("invmut_r2_", "R2"),
        ("invmut_rdiff_", "R2_REVERT_PROBE"),
        ("invmut_live_", "R2_LIVENESS"),
        ("invmut_d3p_", "TEST_VERIFICATION"),
    )
    for prefix, stage in prefixes:
        if name.startswith(prefix):
            return stage
    return "OTHER"


@dataclass
class EsbmcCallLedger:
    path: Path
    context: dict[str, Any]
    profile: str
    _call_index: int = field(default=0, init=False)

    def __post_init__(self) -> None:
        required = {"trial", "case_id"}
        missing = sorted(required - set(self.context))
        if missing:
            raise ValueError(f"ledger context missing required fields: {missing}")

    def wrap(self, run_fn: RunFn) -> RunFn:
        def run(argv: list[str]) -> EsbmcRun:
            self._call_index += 1
            source_sha = _source_sha256(argv)
            normalized = _normalized_tokens(argv)
            started_ns = time.time_ns()
            wall_start = time.perf_counter()
            result = run_fn(argv)
            wall_elapsed = time.perf_counter() - wall_start
            verdict = parse.classify_verdict(
                result.stdout,
                result.stderr,
                result.returncode,
                result.timed_out,
            )
            record = {
                "schema": LEDGER_SCHEMA,
                "call_index": self._call_index,
                "started_unix_ns": started_ns,
                "profile": self.profile,
                **self.context,
                "stage": classify_call(argv),
                "source_sha256": source_sha,
                "normalized_argv": normalized,
                "normalized_argv_sha256": _sha256_text(
                    json.dumps(normalized, ensure_ascii=False, separators=(",", ":"))
                ),
                "cache_hit": bool(result.cache_hit),
                "cache_key": result.cache_key,
                "engine_elapsed_s": float(result.elapsed_s),
                "observed_wall_s": wall_elapsed,
                "charged_verification_s": (
                    0.0 if result.cache_hit else float(result.elapsed_s)
                ),
                "timed_out": bool(result.timed_out),
                "returncode": int(result.returncode),
                "verdict": verdict.verdict,
                "stdout_sha256": _sha256_text(result.stdout),
                "stderr_sha256": _sha256_text(result.stderr),
            }
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
            return result

        return run


def read_ledger(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return rows
    for line in lines:
        if not line.strip():
            continue
        value = json.loads(line)
        if not isinstance(value, dict) or value.get("schema") != LEDGER_SCHEMA:
            raise ValueError("invalid ESBMC ledger row")
        rows.append(value)
    return rows
