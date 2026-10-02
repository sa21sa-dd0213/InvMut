#!/usr/bin/env python3
"""Write <arm>/per_case.csv from the arm's per-cell case_result.json files (one config dir per cell).

The header is the one every shipped arm uses. Columns a case_result.json does not carry (mutant /
task / timing splits) are left EMPTY -- not 0 -- because the arm has no such quantity (n/a, not zero).
`group` is dataset/summary.csv `class` upper-cased (real -> REAL, bench -> BENCH).

The arm must be complete: every (trial, case) of --trials x dataset/summary.csv has exactly one
readable case_result.json under --config; otherwise nothing is written and the gaps are printed.

usage: build_per_case.py --arm Results/RQ3/no_mg [--config deepseek-v4-pro] [--trials 1,2,3,4,5] [--dry-run]
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HEADER = ["trial", "case_id", "group", "success", "wallclock_s", "reason", "n_accepted", "n_validated",
          "n_killing", "n_validated_dv", "n_killing_dv", "n_validated_fuzz", "n_killing_fuzz", "n_gen_mutants",
          "n_dv_confirmed", "n_test_tasks", "n_test_tasks_dv", "n_test_tasks_fuzz", "n_test_reflections",
          "t_mutation_s", "t_test_s", "t_total_s", "fail_class"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--arm", required=True)
    ap.add_argument("--config", default="deepseek-v4-pro")
    ap.add_argument("--trials", default="1,2,3,4,5")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    arm = a.arm if os.path.isabs(a.arm) else os.path.join(ROOT, a.arm)
    cases = list(csv.DictReader(open(os.path.join(ROOT, "dataset", "summary.csv"))))
    rows, gaps = [], []
    for t in [int(x) for x in a.trials.split(",") if x]:
        for c in cases:
            cell = os.path.join(arm, str(t), "cases", c["id"])
            dirs = sorted(d for d in os.listdir(cell)) if os.path.isdir(cell) else []
            if dirs != [a.config]:
                gaps.append(f"{t}/{c['id']}: config dirs {dirs}")
                continue
            try:
                cr = json.load(open(os.path.join(cell, a.config, "case_result.json")))
            except (OSError, ValueError) as e:
                gaps.append(f"{t}/{c['id']}: {e}")
                continue
            if cr.get("case_id") != c["id"]:
                gaps.append(f"{t}/{c['id']}: case_result says {cr.get('case_id')}")
                continue
            row = dict.fromkeys(HEADER, "")
            row.update(trial=t, case_id=c["id"], group=c["class"].upper(), success=bool(cr.get("success")),
                       wallclock_s=cr.get("wallclock_s", ""), reason=cr.get("reason") or "",
                       n_accepted=cr.get("n_accepted", ""), n_validated=cr.get("n_validated", ""),
                       n_killing=cr.get("n_killing", ""))
            rows.append(row)
    if gaps:
        print(f"INCOMPLETE: {len(gaps)} cells", *gaps[:40], sep="\n  ")
        return 1
    print(f"{len(rows)} rows; success {sum(r['success'] for r in rows)}")
    if not a.dry_run:
        with open(os.path.join(arm, "per_case.csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=HEADER)
            w.writeheader()
            w.writerows(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
