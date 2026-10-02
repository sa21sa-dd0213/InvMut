"""Shared ESBMC subprocess runner (one place; Doc 5 §3.5 / §12.4).

Every stage that executes ESBMC goes through `run_esbmc` so the per-call timeout (60s, DEVIATIONS
V8), the writable-TMPDIR requirement (V19), and argv safety (`assert_argv_safe`, already enforced
by the command builder) are applied uniformly. Returns the raw streams; classification is the
caller's job via `invmut.esbmc.parse`."""

from __future__ import annotations

import os
import subprocess
import tempfile
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Callable, Iterator, Optional

from invmut.config import Config


@dataclass(frozen=True)
class EsbmcRun:
    stdout: str
    stderr: str
    returncode: int
    timed_out: bool
    elapsed_s: float
    # Populated only by the optional content-addressed cache wrapper.  A cached
    # result retains the engine time from the original execution, so callers
    # must use ``cache_hit`` to avoid charging that historical time again.
    cache_hit: bool = False
    cache_key: str | None = None


# A run function takes an argv and returns an EsbmcRun. The default is `run_esbmc(config, ...)`;
# tests inject a fake to exercise pipeline logic without the binary.
RunFn = Callable[[list[str]], EsbmcRun]


def run_esbmc(config: Config, argv: list[str], timeout_s: Optional[int] = None) -> EsbmcRun:
    """Run one esbmc argv with the configured per-call timeout; never raises on timeout."""
    timeout = timeout_s if timeout_s is not None else config.verifier.timeout_seconds_per_call
    t0 = time.perf_counter()
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=timeout)
        return EsbmcRun(p.stdout, p.stderr, p.returncode, False, time.perf_counter() - t0)
    except subprocess.TimeoutExpired as e:
        dec = lambda b: b.decode("utf-8", "replace") if isinstance(b, bytes) else (b or "")
        return EsbmcRun(dec(e.stdout), dec(e.stderr), -9, True, time.perf_counter() - t0)


def make_run_fn(config: Config, timeout_s: Optional[int] = None) -> RunFn:
    base = lambda argv: run_esbmc(config, argv, timeout_s)
    # USER 2026-06-28: when a cache dir is configured, wrap so every ESBMC call (R1/R2/verify_test) is
    # looked up before running and shared across trials/arms/cases/machines. None ⇒ no caching (default).
    if getattr(config.verifier, "esbmc_cache_dir", None):
        from invmut.esbmc.cache import make_cached_run_fn   # lazy: avoids a runner<->cache import cycle
        return make_cached_run_fn(config, base, timeout_s)
    return base


@contextmanager
def temp_sol(source: str, prefix: str = "invmut_") -> Iterator[str]:
    """Write a Solidity source to a temp .sol file in the (writable) TMPDIR and yield its path;
    delete on exit. ESBMC needs a real file path and a writable temp dir (DEVIATIONS V19)."""
    fd, path = tempfile.mkstemp(suffix=".sol", prefix=prefix)
    try:
        with os.fdopen(fd, "w") as fh:
            fh.write(source)
        yield path
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
