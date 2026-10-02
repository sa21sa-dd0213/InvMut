
from __future__ import annotations

import hashlib
import json
import os
import tempfile
from dataclasses import replace
from typing import Callable, Optional

from invmut.config import Config
from invmut.esbmc.runner import EsbmcRun, RunFn


def _sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _normalized_tokens(argv: list[str]) -> list[str]:
    out: list[str] = []
    for idx, t in enumerate(argv):
        if idx == 0:
            out.append("ESBMC")
        elif idx > 0 and argv[idx - 1] == "--solc-bin":
            out.append("SOLC")
        elif idx == 1 and t.endswith(".sol") and os.path.isfile(t):
            try:
                with open(t, "rb") as f:
                    out.append("SOL:" + _sha256(f.read()))
            except OSError:
                out.append("SOL:UNREADABLE:" + t)
        else:
            out.append(t)
    return out


def cache_key(config: Config, argv: list[str], timeout_s: Optional[int]) -> str:
    eff_timeout = timeout_s if timeout_s is not None else config.verifier.timeout_seconds_per_call
    profile = config.esbmc_profile_id or ("esbmcver:" + (config.esbmc_version_expected or ""))
    ns = "\0".join([
        "invmut-esbmc-cache/v1",
        config.esbmc_version_expected or "",
        config.solc_version_expected or "",
        profile,
        str(eff_timeout),
    ])
    body = ns + "\0" + "\0".join(_normalized_tokens(argv))
    return _sha256(body.encode("utf-8"))


def _to_dict(run: EsbmcRun) -> dict:
    return {"stdout": run.stdout, "stderr": run.stderr, "returncode": run.returncode,
            "timed_out": run.timed_out, "elapsed_s": run.elapsed_s}


def _from_dict(d: dict) -> EsbmcRun:
    return EsbmcRun(d["stdout"], d["stderr"], int(d["returncode"]), bool(d["timed_out"]),
                    float(d.get("elapsed_s", 0.0)))


class EsbmcCache:

    def __init__(self, cache_dir: str, cache_timeouts: bool = True):
        self.dir = cache_dir
        self.cache_timeouts = cache_timeouts

    def _path(self, key: str) -> str:
        return os.path.join(self.dir, key[:2], key + ".json")

    def get(self, key: str) -> Optional[EsbmcRun]:
        try:
            with open(self._path(key)) as f:
                return _from_dict(json.load(f))
        except (OSError, ValueError, KeyError):
            return None

    def put(self, key: str, run: EsbmcRun) -> None:
        if run.timed_out:
            if not self.cache_timeouts:
                return
            self._write(key, run, create_only=True)
        else:
            self._write(key, run, create_only=False)

    def _atomic_write(self, key: str, run: EsbmcRun) -> None:
        self._write(key, run, create_only=False)

    def _write(self, key: str, run: EsbmcRun, create_only: bool) -> None:
        p = self._path(key)
        tmp = None
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            fd, tmp = tempfile.mkstemp(dir=os.path.dirname(p), suffix=".tmp")
            with os.fdopen(fd, "w") as f:
                json.dump(_to_dict(run), f)
            if create_only:
                try:
                    os.link(tmp, p)
                except FileExistsError:
                    pass
            else:
                os.replace(tmp, p)
        except OSError:
            pass
        finally:
            if tmp is not None:
                try:
                    os.unlink(tmp)
                except OSError:
                    pass


def make_cached_run_fn(config: Config, base_run_fn: RunFn, timeout_s: Optional[int] = None) -> RunFn:
    cache = EsbmcCache(config.verifier.esbmc_cache_dir, config.verifier.cache_esbmc_timeouts)

    def run(argv: list[str]) -> EsbmcRun:
        key = cache_key(config, argv, timeout_s)
        hit = cache.get(key)
        if hit is not None and not (hit.timed_out and not config.verifier.cache_esbmc_timeouts):
            return replace(hit, cache_hit=True, cache_key=key)
        result = base_run_fn(argv)
        cache.put(key, result)
        return replace(result, cache_hit=False, cache_key=key)

    return run



def _iter_entries(d: str):
    for root, _dirs, files in os.walk(d):
        for fn in files:
            if fn.endswith(".json") and len(fn) == 69:
                key = fn[:-5]
                try:
                    with open(os.path.join(root, fn)) as f:
                        yield key, _from_dict(json.load(f))
                except (OSError, ValueError, KeyError):
                    continue


def merge_caches(srcs: list[str], dst: str, cache_timeouts: bool = True) -> dict:
    from invmut.esbmc import parse

    best: dict[str, EsbmcRun] = {}
    conflicts: list[dict] = []

    def verdict_of(run: EsbmcRun) -> str:
        return parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out).verdict

    for src in srcs:
        for key, run in _iter_entries(src):
            cur = best.get(key)
            if cur is None:
                best[key] = run
                continue
            if cur.timed_out and not run.timed_out:
                best[key] = run
            elif run.timed_out and not cur.timed_out:
                continue
            elif (not cur.timed_out) and (not run.timed_out):
                if verdict_of(cur) != verdict_of(run):
                    conflicts.append({"key": key, "a": verdict_of(cur), "b": verdict_of(run)})

    written = 0
    quarantined = {c["key"] for c in conflicts}
    out = EsbmcCache(dst, cache_timeouts=cache_timeouts)
    for key, run in best.items():
        if key in quarantined:
            continue
        if run.timed_out and not cache_timeouts:
            continue
        out._atomic_write(key, run)
        written += 1
    return {"keys": len(best), "written": written, "conflicts": conflicts}
