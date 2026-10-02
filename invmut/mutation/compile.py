"""Real solc compile function for Stage 1 (Doc 2 §2.3).

Writes the candidate mutant source to a temp file in the configured (writable) TMPDIR and runs
the pinned project solc with `--ast-compact-json`; a non-zero exit or any `Error:` diagnostic is
a compile failure whose verbatim output becomes {{COMPILER_ERROR}} for Prompt B. The solc binary
is the explicit configured path (never $PATH; DEVIATIONS V19 requires a writable temp dir)."""

from __future__ import annotations

import os
import subprocess
import tempfile

from invmut.config import Config
from invmut.mutation.static_stages import CompileFn, CompileResult


def make_solc_compile_fn(config: Config, timeout_s: int = 60) -> CompileFn:
    """Build a CompileFn bound to the configured solc. Compiles a single flattened source string."""
    solc = config.solc_bin

    def _compile(m_source: str) -> CompileResult:
        # NamedTemporaryFile in the default (writable) temp dir; suffix .sol so solc detects lang.
        fd, path = tempfile.mkstemp(suffix=".sol", prefix="invmut_mut_")
        try:
            with os.fdopen(fd, "w") as fh:
                fh.write(m_source)
            try:
                proc = subprocess.run(
                    [solc, "--ast-compact-json", path],
                    capture_output=True, text=True, timeout=timeout_s,
                )
            except subprocess.TimeoutExpired as e:
                return CompileResult(False, f"solc timed out after {timeout_s}s: {e}")
            except OSError as e:
                return CompileResult(False, f"failed to invoke solc {solc!r}: {e}")
            diag = (proc.stderr or "") + (proc.stdout or "")
            # solc prints "Error:" to stderr on failure; warnings ("Warning:") are not failures.
            ok = proc.returncode == 0 and "Error:" not in (proc.stderr or "")
            return CompileResult(ok, _sanitize(diag, path) if not ok else "")
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    return _compile


def _sanitize(diag: str, path: str) -> str:
    """Replace the throwaway temp path with a stable name so diagnostics are deterministic in
    logs/memory (the temp filename changes every run)."""
    return diag.replace(path, "<mutant>.sol")
