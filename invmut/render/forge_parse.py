"""Parse `forge test --json` output into a structured, SOUND outcome.

Two measured pitfalls (codex F2) that make exit-code-based kill-checks WRONG:
  - a compile failure prints `Compiler run failed: …` as NON-JSON text and STILL EXITS 0.
  - a setUp revert appears as a `"setUp()"` entry in `test_results` with status Failure (the actual
    test functions then do not run) — NOT a property failure.

So we classify by parsing the JSON, never by the process exit code."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ForgeOutcome:
    kind: str                     # ran | compile_failed | setup_failed | no_suite | parse_error | timeout
    tests: dict = field(default_factory=dict)   # test_fn -> {"status": Success|Failure, "reason": str|None}
    setup_reason: Optional[str] = None
    raw: str = ""

    def status_of(self, prefix: str) -> Optional[str]:
        """Status of the first test whose name starts with `prefix` (e.g. 'testFuzz_'), or None."""
        for name, tr in self.tests.items():
            if name.startswith(prefix):
                return tr.get("status")
        return None

    def any_failure(self, prefixes: tuple[str, ...]) -> bool:
        return any(tr.get("status") == "Failure"
                   for name, tr in self.tests.items() if name.startswith(prefixes))


def parse_forge_json(stdout: str, stderr: str, suite_contract: str = "InvMutTest",
                     timed_out: bool = False) -> ForgeOutcome:
    raw = (stdout or "") + ("\n" + stderr if stderr else "")
    if timed_out:
        return ForgeOutcome("timeout", raw=raw)
    blob = (stdout or "").strip()
    try:
        data = json.loads(blob)
    except (json.JSONDecodeError, ValueError):
        if "Compiler run failed" in raw or "Error (" in raw:
            return ForgeOutcome("compile_failed", raw=raw)
        return ForgeOutcome("parse_error", raw=raw)

    # find the suite whose contract name matches (path is "<file>:<Contract>")
    suite = None
    for key, info in data.items():
        if key.rsplit(":", 1)[-1] == suite_contract:
            suite = info
            break
    if suite is None:
        # no matching suite ran — could be filtered out or never compiled
        return ForgeOutcome("no_suite", raw=raw)

    results = suite.get("test_results", {}) or {}
    setup = results.get("setUp()")
    if setup is not None and setup.get("status") == "Failure":
        return ForgeOutcome("setup_failed", setup_reason=setup.get("reason"), raw=raw)

    tests = {name: {"status": tr.get("status"), "reason": tr.get("reason")}
             for name, tr in results.items() if name != "setUp()"}
    return ForgeOutcome("ran", tests=tests, raw=raw)
