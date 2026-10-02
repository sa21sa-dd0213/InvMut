"""Persistent ESBMC result cache (USER 2026-06-28; notes/MUTANT_REUSE_CACHE_PLAN.md).

Every ESBMC call in the experiment funnels through `runner.run_esbmc`; `runner.make_run_fn` wraps that
with `make_cached_run_fn` when `config.verifier.esbmc_cache_dir` is set, so R1/R2/verify_test all share a
content-addressed cache across trials/arms/cases/machines — cutting the paid ablation's ESBMC cost.

SOUNDNESS: ESBMC's verdict is a deterministic function of (sol content, argv flags, esbmc+solc version,
profile, per-call timeout). The key (below) captures exactly those; a cached verdict equals what a fresh
run would produce, so caching changes COST not RESULTS. The sole nondeterminism is a TIMEOUT (machine
speed) — handled by `cache_esbmc_timeouts` + "definitive overrides timeout" on write and merge.
"""

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
    """Position/suffix-aware normalization (codex Risk 1/7): the ONLY machine-variant tokens are the esbmc
    binary (argv[0]), the `--solc-bin` value, and the `.sol` PROGRAM file (temp path differs, content
    matters). Everything else (`--contract C`, `--focus-function <name>`, depth/engine/memlimit flags) is a
    stable literal kept VERBATIM. We do NOT os.path.isfile-probe arbitrary tokens — a contract/focus name
    that happens to exist on disk would be wrongly content-hashed."""
    out: list[str] = []
    for idx, t in enumerate(argv):
        if idx == 0:
            out.append("ESBMC")                                  # bin path; version pinned in namespace
        elif idx > 0 and argv[idx - 1] == "--solc-bin":
            out.append("SOLC")                                   # solc path; solc version in namespace
        elif idx == 1 and t.endswith(".sol") and os.path.isfile(t):
            # POSITION-based: build_esbmc (the sole argv constructor) always puts the program .sol at
            # index 1. Hash its CONTENT (the temp path differs per call/machine). A name-like flag VALUE
            # elsewhere is never content-hashed, so a focus/contract name can't be mistaken for a file.
            try:
                with open(t, "rb") as f:
                    out.append("SOL:" + _sha256(f.read()))
            except OSError:
                out.append("SOL:UNREADABLE:" + t)
        else:
            out.append(t)
    return out


def cache_key(config: Config, argv: list[str], timeout_s: Optional[int]) -> str:
    """Deterministic key over (sol content, normalized argv, esbmc+solc version, profile, effective
    timeout). The timeout is a subprocess kwarg — NOT in argv — so it MUST be folded in explicitly."""
    eff_timeout = timeout_s if timeout_s is not None else config.verifier.timeout_seconds_per_call
    # esbmc_profile_id pins the flag profile; fall back to the expected version string when it is unset so
    # the toolchain is still namespaced (a profile/version change invalidates the whole cache).
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
    """Content-addressed sharded store: <dir>/<key[:2]>/<key>.json. Atomic writes (tmp + os.replace) make
    concurrent writers within a machine safe; readers never see a partial file. Cross-machine reuse = point
    every machine at one dir (shared FS) OR merge per-machine dirs offline (scripts/merge_esbmc_cache.py)."""

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
        """A DEFINITIVE result is authoritative — always written (idempotent; overwrites a stale timeout).
        A TIMEOUT is written ATOMICALLY create-only — it must NEVER clobber a definitive verdict (a faster
        machine's real answer wins). create-only (os.link, fails if present) instead of get-then-write
        closes the concurrency TOCTOU where a definitive lands between the get and the write (codex BUG-1)."""
        if run.timed_out:
            if not self.cache_timeouts:
                return
            self._write(key, run, create_only=True)
        else:
            self._write(key, run, create_only=False)

    # back-compat alias: definitive (overwriting) write, used by merge + tests for direct seeding.
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
                    os.link(tmp, p)        # atomic create-only; FileExistsError ⇒ keep what's there
                except FileExistsError:
                    pass                   # an existing (possibly definitive) entry must not be clobbered
            else:
                os.replace(tmp, p)         # atomic overwrite (definitive is authoritative)
        except OSError:
            pass                           # cache write must never crash a run
        finally:
            if tmp is not None:
                try:
                    os.unlink(tmp)         # remove the tmp (always, incl. after a successful os.link)
                except OSError:
                    pass


def make_cached_run_fn(config: Config, base_run_fn: RunFn, timeout_s: Optional[int] = None) -> RunFn:
    """Wrap a base run_fn with the cache. On a hit return the stored EsbmcRun; on a miss run ESBMC and
    store. A cached TIMEOUT is ignored on READ when caching of timeouts is disabled (recompute, giving a
    faster machine a chance at a definitive verdict)."""
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


# --- offline merge (scripts/merge_esbmc_cache.py) -------------------------------------------------

def _iter_entries(d: str):
    for root, _dirs, files in os.walk(d):
        for fn in files:
            if fn.endswith(".json") and len(fn) == 69:   # <64-hex>.json
                key = fn[:-5]
                try:
                    with open(os.path.join(root, fn)) as f:
                        yield key, _from_dict(json.load(f))
                except (OSError, ValueError, KeyError):
                    continue


def merge_caches(srcs: list[str], dst: str, cache_timeouts: bool = True) -> dict:
    """Conflict-AWARE union (codex Risk 4/10): "same key ⇒ same bytes" is FALSE — stdout embeds the temp
    path, and timeout-vs-definitive differ. Per key: definitive beats timeout; two definitives that
    classify to the SAME verdict ⇒ keep either; two definitives that DISAGREE ⇒ quarantine + report (never
    silently pick one in a paid run). Returns a report; caller should fail loudly on `conflicts`."""
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
                best[key] = run                       # definitive upgrades a timeout
            elif run.timed_out and not cur.timed_out:
                continue                              # keep the definitive
            elif (not cur.timed_out) and (not run.timed_out):
                if verdict_of(cur) != verdict_of(run):
                    conflicts.append({"key": key, "a": verdict_of(cur), "b": verdict_of(run)})
            # both timeout → keep either

    written = 0
    quarantined = {c["key"] for c in conflicts}    # disagreeing definitives are NOT merged (codex BUG-2)
    out = EsbmcCache(dst, cache_timeouts=cache_timeouts)
    for key, run in best.items():
        if key in quarantined:
            continue
        if run.timed_out and not cache_timeouts:
            continue
        out._atomic_write(key, run)
        written += 1
    return {"keys": len(best), "written": written, "conflicts": conflicts}
