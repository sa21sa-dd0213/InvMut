
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ForgeOutcome:
    kind: str
    tests: dict = field(default_factory=dict)
    setup_reason: Optional[str] = None
    raw: str = ""

    def status_of(self, prefix: str) -> Optional[str]:
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

    suite = None
    for key, info in data.items():
        if key.rsplit(":", 1)[-1] == suite_contract:
            suite = info
            break
    if suite is None:
        return ForgeOutcome("no_suite", raw=raw)

    results = suite.get("test_results", {}) or {}
    setup = results.get("setUp()")
    if setup is not None and setup.get("status") == "Failure":
        return ForgeOutcome("setup_failed", setup_reason=setup.get("reason"), raw=raw)

    tests = {name: {"status": tr.get("status"), "reason": tr.get("reason")}
             for name, tr in results.items() if name != "setUp()"}
    return ForgeOutcome("ran", tests=tests, raw=raw)
