
from __future__ import annotations

import os
import subprocess
import tempfile

from invmut.config import Config
from invmut.mutation.static_stages import CompileFn, CompileResult


def make_solc_compile_fn(config: Config, timeout_s: int = 60) -> CompileFn:
    solc = config.solc_bin

    def _compile(m_source: str) -> CompileResult:
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
            ok = proc.returncode == 0 and "Error:" not in (proc.stderr or "")
            return CompileResult(ok, _sanitize(diag, path) if not ok else "")
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    return _compile


def _sanitize(diag: str, path: str) -> str:
    return diag.replace(path, "<mutant>.sol")
