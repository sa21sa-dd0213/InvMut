
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
    cache_hit: bool = False
    cache_key: str | None = None


RunFn = Callable[[list[str]], EsbmcRun]


def run_esbmc(config: Config, argv: list[str], timeout_s: Optional[int] = None) -> EsbmcRun:
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
    if getattr(config.verifier, "esbmc_cache_dir", None):
        from invmut.esbmc.cache import make_cached_run_fn
        return make_cached_run_fn(config, base, timeout_s)
    return base


@contextmanager
def temp_sol(source: str, prefix: str = "invmut_") -> Iterator[str]:
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
