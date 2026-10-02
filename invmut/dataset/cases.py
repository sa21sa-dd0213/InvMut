"""Case loader for the class-based dataset (post origin/dataset reorg, 2026-06).

The dataset no longer carries a `{real:[], toolfixed:[]}` manifest. The authoritative case index
is `dataset/summary.csv` (one row per case, with the bug/fix flat-source paths and metadata); cases
live under `dataset/class{1,2,3}_*/<id>/`. This module turns that CSV into the case dicts the RQ3
pipeline (`invmut.dataset.harness.run_case`) consumes: it needs `id`, `target_contract`,
`modification_kind`, and openable `bug`/`fix` paths."""

from __future__ import annotations

import csv
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_SUMMARY = os.path.join(_ROOT, "dataset", "summary.csv")


def _summary_root(summary_csv: str | None) -> str:
    if not summary_csv:
        return _ROOT
    path = os.path.abspath(summary_csv)
    parent = os.path.dirname(path)
    if os.path.basename(parent) == "dataset":
        return os.path.dirname(parent)
    return parent


def _abs(p: str | None, root: str = _ROOT) -> str | None:
    if not p:
        return None
    return p if os.path.isabs(p) else os.path.join(root, p)


def load_cases(summary_csv: str | None = None) -> list[dict]:
    """Read `dataset/summary.csv` → list of case dicts (bug/fix resolved to absolute paths)."""
    path = summary_csv or _DEFAULT_SUMMARY
    root = _summary_root(summary_csv)
    out: list[dict] = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            out.append({
                "id": r["id"],
                "tier": r.get("tier"),
                "class": r.get("class"),
                "source_dataset": r.get("source_dataset"),
                "target_contract": r["target_contract"],
                "modification_kind": r.get("modification_kind", ""),
                # dataset/summary.csv's curated list of the functions the patch SEMANTICALLY
                # changes, ';'-separated.  Parsing diff.patch instead names every function in a
                # reformatting patch, which makes "is this boundary on the patch?" useless as a
                # signal.  Carried here so readers do not have to re-parse the diff.
                "changed_functions": r.get("changed_functions", ""),
                "bug_solc": r.get("bug_solc"),
                "fix_solc": r.get("fix_solc"),
                "bug": _abs(r["bug"], root),
                "fix": _abs(r["fix"], root),
                "diff": _abs(r.get("diff"), root),
            })
    return out


def cases_by_id(summary_csv: str | None = None) -> dict[str, dict]:
    return {c["id"]: c for c in load_cases(summary_csv)}
