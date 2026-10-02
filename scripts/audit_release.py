#!/usr/bin/env python3
"""Validate the publication-facing InvMut repository."""

from __future__ import annotations

import argparse
import filecmp
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_TOP = {
    ".gitignore", "README.md", "requirements.txt", "Results", "config", "dataset",
    "invmut", "motivation_examples", "scripts", "third_party", "tool",
}
EXPECTED_ARMS = 17
EXPECTED_ACCEPTED = 24_289
EXPECTED_CASE_RESULTS = 6_820
TEXT_SUFFIXES = {".csv", ".json", ".jsonl", ".md", ".py", ".sh", ".sol", ".txt"}
HOST_PATH = re.compile(r"(?:^|[\s\"'])/(?:home|root|tmp|Users)/|[A-Za-z]:\\(?:Users|Documents)\\")
HOME_PATH = re.compile(r"~/(?!\.)")
SECRET = re.compile(r"(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}")
BANNED_KEYS = {"t", "timestamp", "t_start", "started_at", "finished_at", "created_at", "updated_at",
               "fuzz_fallback", "single_value_fallback", "render_compile_repair_attempts",
               "r2_fast_revert_fallback_when_nonconverged"}
BANNED_TEXT = (
    "deepseek-v4-flash", "FlashRerun", "flash_gf", "flash_rg", "ce_oracle_closure",
    "fuzz_fallback", "single_value_fallback", "render_compile_repair",
)


def public_files() -> list[Path]:
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if rel.parts[0] in {".git", ".agents", ".aws", ".codex"}:
            continue
        files.append(path)
    return files


def structured_values(path: Path):
    if path.suffix == ".json":
        yield json.loads(path.read_text())
        return
    for line_no, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip():
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"line {line_no}: {exc}") from exc


def walk_json(value, path: Path, failures: list[str], *, enforce_keys: bool) -> None:
    stack = [value]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            for key, child in node.items():
                if enforce_keys and str(key).lower() in BANNED_KEYS:
                    failures.append(f"banned JSON key {key!r}: {path.relative_to(ROOT)}")
                stack.append(child)
        elif isinstance(node, list):
            stack.extend(node)
        elif isinstance(node, str):
            if HOST_PATH.search(node) or HOME_PATH.search(node):
                failures.append(f"machine-local path in JSON: {path.relative_to(ROOT)}")
            if SECRET.search(node):
                failures.append(f"possible API credential in JSON: {path.relative_to(ROOT)}")
            for marker in BANNED_TEXT:
                if marker in node:
                    failures.append(f"legacy marker {marker!r}: {path.relative_to(ROOT)}")


def compare_csv(expected: Path, generated: Path, failures: list[str]) -> None:
    expected_names = sorted(p.name for p in expected.glob("*.csv"))
    generated_names = sorted(p.name for p in generated.glob("*.csv"))
    if expected_names != generated_names:
        failures.append(
            f"CSV inventory differs: released={expected_names}, generated={generated_names}"
        )
        return
    for name in expected_names:
        if not filecmp.cmp(expected / name, generated / name, shallow=False):
            failures.append(f"generated CSV differs: Results/csv/{name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    failures: list[str] = []

    top = {p.name for p in ROOT.iterdir() if not p.name.startswith(".")} | {".gitignore"}
    if top != EXPECTED_TOP:
        failures.append(f"top-level layout differs: observed={sorted(top)}")
    if (ROOT / "artifact").exists():
        failures.append("nested artifact/ wrapper is present")
    if any((ROOT / "tool").glob("**/*CC*SolBMC*")):
        failures.append("CC-SolBMC implementation is present under tool/")

    arms = list((ROOT / "Results").glob("RQ*/*/per_case.csv"))
    accepted = list((ROOT / "Results").glob("**/tests/*.accepted.json"))
    case_results = list((ROOT / "Results").glob("**/case_result.json"))
    case_logs = [p for p in ROOT.rglob("case.log") if ".git" not in p.parts]
    if len(arms) != EXPECTED_ARMS:
        failures.append(f"result arms={len(arms)}, expected {EXPECTED_ARMS}")
    if len(accepted) != EXPECTED_ACCEPTED:
        failures.append(f"accepted tests={len(accepted)}, expected {EXPECTED_ACCEPTED}")
    if len(case_results) != EXPECTED_CASE_RESULTS:
        failures.append(f"case results={len(case_results)}, expected {EXPECTED_CASE_RESULTS}")
    if case_logs:
        failures.append(f"execution-history case.log files remain: {len(case_logs)}")
    history_dirs = [p for p in (ROOT / "Results").rglob("*") if p.is_dir()
                    and re.search(r"rerun|salvage|closure|archive", p.name, re.I)]
    if history_dirs:
        failures.append(f"historical result directories remain: {len(history_dirs)}")

    for path in public_files():
        rel = path.relative_to(ROOT)
        if path.stat().st_size >= 100 * 1024 * 1024:
            failures.append(f"file exceeds GitHub's 100 MiB limit: {rel}")
        if path.suffix in {".json", ".jsonl"}:
            try:
                for value in structured_values(path):
                    walk_json(
                        value,
                        path,
                        failures,
                        enforce_keys=rel.parts[0] != "third_party",
                    )
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                failures.append(f"invalid structured data {rel}: {exc}")
            continue
        if path.suffix not in TEXT_SUFFIXES or path == Path(__file__).resolve():
            continue
        try:
            text = path.read_text(errors="replace")
        except OSError as exc:
            failures.append(f"cannot read {rel}: {exc}")
            continue
        if HOST_PATH.search(text) or HOME_PATH.search(text):
            failures.append(f"machine-local path in text: {rel}")
        if SECRET.search(text):
            failures.append(f"possible API credential in text: {rel}")
        for marker in BANNED_TEXT:
            if marker in text:
                failures.append(f"legacy marker {marker!r}: {rel}")

    with tempfile.TemporaryDirectory(prefix="invmut_release_audit_") as directory:
        generated = Path(directory)
        run = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "results_all.py"), "--export", str(generated)],
            cwd=ROOT, capture_output=True, text=True,
        )
        if run.returncode:
            failures.append(f"results_all.py failed: {(run.stdout + run.stderr).strip()}")
        else:
            compare_csv(ROOT / "Results" / "csv", generated, failures)

    if failures:
        print(f"FAIL: {len(failures)} release-audit issue(s)")
        for failure in failures[:200]:
            print(f"  - {failure}")
        if len(failures) > 200:
            print(f"  - ... and {len(failures) - 200} more")
        return 1

    print(f"PASS: {len(arms)} result arms, {len(case_results)} case results, "
          f"{len(accepted)} accepted tests")
    print("PASS: publication layout, structured data, anonymization, and CSV reproduction")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
