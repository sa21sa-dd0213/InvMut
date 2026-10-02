#!/usr/bin/env python3
"""Merge the per-machine Direct-PBT / no_mg campaign roots into Results/, after a per-cell self-check.

Each --root is MACHINE=DIR=QUEUE: a campaign out-root written by scripts/direct_campaign.py and the queue
file that machine ran. --ledger adds launcher ledgers of cells adopted from elsewhere (the pilot).

Checks, for every (arm, trial, case) of arms x trials x dataset/summary.csv:
  * exactly one root holds a readable case_result.json for the cell (none missing, no duplicate);
  * that root is the machine whose queue lists the case;
  * the case_result names the same case;
  * exactly one ledger line exists for the cell (launched once, never relaunched);
  * the cell's case_result wallclock_s is <= --hard-wall unless the launcher killed the cell, and a
    killed cell's case_result says case_timeout.
Prints the failures and the per-machine / per-arm counts; exit 1 on any failure.

--apply (only when every check passes) copies each cell dir to Results/<RQ>/<arm>/<trial>/cases/<case>/
and writes <arm>/campaign_ledger.jsonl (that arm's ledger lines). An existing destination cell aborts.

usage: merge_direct_campaign.py --root local=<dir>=<queue> --root laptop=<dir>=<queue>
                                [--ledger <pilot ledger.jsonl> ...] [--apply]
"""
from __future__ import annotations

import argparse
import collections
import csv
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARMS = {"direct_pbt": ("RQ1", "Direct-PBT", "deepseek-v4-pro"),
        "no_mg": ("RQ3", "no_mg", "deepseek-v4-pro"),
        "glm53flashx": ("RQ4", "glm-5.3-flashx", "glm-5.3-flashx"),
        "direct_pbt_gpt5mini": ("RQ4", "Direct-PBT-gpt-5-mini", "gpt-5-mini"),
        "direct_pbt_glm53flashx": ("RQ4", "Direct-PBT-glm-5.3-flashx", "glm-5.3-flashx")}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", action="append", required=True, help="MACHINE=DIR=QUEUE")
    ap.add_argument("--ledger", action="append", default=[])
    ap.add_argument("--trials", default="1,2,3,4,5")
    ap.add_argument("--hard-wall", type=float, default=660.0)
    ap.add_argument("--dest", default=os.path.join(ROOT, "Results"))
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--arms", default="direct_pbt,no_mg")
    a = ap.parse_args()
    arms = {k: ARMS[k] for k in a.arms.split(",") if k}

    roots = {}
    owner = {}
    for spec in a.root:
        m, d, q = spec.split("=", 2)
        roots[m] = os.path.abspath(d)
        for c in (l.strip() for l in open(q)):
            if c and not c.startswith("#"):
                if c in owner:
                    print(f"queue overlap: {c} in {owner[c]} and {m}")
                    return 1
                owner[c] = m
    cases = [r["id"] for r in csv.DictReader(open(os.path.join(ROOT, "dataset", "summary.csv")))]
    trials = [int(t) for t in a.trials.split(",") if t]
    missing_owner = [c for c in cases if c not in owner]

    led = collections.defaultdict(list)
    for p in [os.path.join(d, "ledger.jsonl") for d in roots.values()] + a.ledger:
        for line in open(p):
            if line.strip():
                r = json.loads(line)
                led[(r["arm"], int(r["trial"]), r["case"])].append(r)

    fails, found = [], {}
    tally = collections.Counter()
    for arm, (rq, dname, lane) in arms.items():
        for t in trials:
            for c in cases:
                k = (arm, t, c)
                have = []
                for m, d in roots.items():
                    p = os.path.join(d, rq, dname, str(t), "cases", c, lane, "case_result.json")
                    try:
                        cr = json.load(open(p))
                        have.append((m, os.path.dirname(p), cr))
                    except (OSError, ValueError):
                        pass
                if len(have) != 1:
                    fails.append(f"{k}: {len(have)} results ({[h[0] for h in have]})")
                    continue
                m, d, cr = have[0]
                if owner.get(c) != m:
                    fails.append(f"{k}: result on {m}, queue owner {owner.get(c)}")
                if cr.get("case_id") != c:
                    fails.append(f"{k}: case_result case_id {cr.get('case_id')}")
                ls = led.get(k, [])
                if len(ls) != 1:
                    fails.append(f"{k}: {len(ls)} ledger lines")
                else:
                    r = ls[0]
                    if r["killed"]:
                        tally[(m, arm, "killed")] += 1
                        if cr.get("reason") != "case_timeout":
                            fails.append(f"{k}: killed but reason {cr.get('reason')}")
                    elif (cr.get("wallclock_s") or 0) > a.hard_wall:
                        # the cell's own wall (the field per_case.csv ships); the ledger wall adds the
                        # interpreter start and the launcher's reap latency (<= ~5 s), not cell time
                        fails.append(f"{k}: wallclock_s {cr.get('wallclock_s')} > {a.hard_wall} without kill")
                tally[(m, arm, "cells")] += 1
                tally[(m, arm, "success")] += bool(cr.get("success"))
                found[k] = (d, ls)
    for m in roots:
        for arm in arms:
            print(f"{m:7s} {arm:10s} cells {tally[(m, arm, 'cells')]:4d}  success {tally[(m, arm, 'success')]:4d}  "
                  f"killed {tally[(m, arm, 'killed')]:3d}")
    print(f"cells found {len(found)} / {len(arms) * len(trials) * len(cases)};  cases without queue owner "
          f"{len(missing_owner)};  failures {len(fails)}")
    for f in fails[:60]:
        print("  FAIL", f)
    if fails or missing_owner:
        return 1
    if not a.apply:
        print("dry run: nothing copied (pass --apply)")
        return 0
    for (arm, t, c), (d, _ls) in found.items():
        rq, dname, lane = arms[arm]
        dst = os.path.join(a.dest, rq, dname, str(t), "cases", c, lane)
        if os.path.exists(dst):
            print(f"destination exists, aborting: {dst}")
            return 1
    for (arm, t, c), (d, _ls) in sorted(found.items()):
        rq, dname, lane = arms[arm]
        shutil.copytree(d, os.path.join(a.dest, rq, dname, str(t), "cases", c, lane))
    for arm, (rq, dname, _lane) in arms.items():
        with open(os.path.join(a.dest, rq, dname, "campaign_ledger.jsonl"), "w") as f:
            for k in sorted(k for k in found if k[0] == arm):
                for r in found[k][1]:
                    f.write(json.dumps(r) + "\n")
    print(f"copied {len(found)} cells into {a.dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
