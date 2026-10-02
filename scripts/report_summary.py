#!/usr/bin/env python3
"""Official per-arm summary: mean +/- sample SD of the per-trial kill rate.

The script reports the same per-trial accounting used by the released CSVs.
Two modes are available:

  no --log       reproduce the ungated accounting from per_case.csv alone.
  --log NAME     apply the fuzz-10000 validity gate: a success row whose
                 (trial, case) cell exists in the per-case logs but is NOT
                 held (no test verdicts `correct`) is demoted to failure.
                 Success rows with no log at all are counted separately
                 (`unscreened`) and kept -- absence of evidence is reported,
                 never silently resolved either way.

The gate readers are run_tests.py's own (_cells_from_disk), so this script
cannot disagree with `run_tests.py --report` about which cells are held.

Usage:
  python3 scripts/report_summary.py --results Results/RQ1/InvMut [--log fuzz10000.log]
"""

from __future__ import annotations

import argparse
import collections
import csv
import os
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from run_tests import _cells_from_disk  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", default=os.path.join(ROOT, "Results", "RQ1", "InvMut"))
    ap.add_argument("--log", default=None,
                    help="fuzz log name (e.g. fuzz10000.log) to gate successes on")
    ap.add_argument("--check", action="store_true",
                    help="acceptance: compare the ungated numbers against the "
                         "shipped summary.csv and exit 1 on any mismatch")
    args = ap.parse_args()

    per_case = os.path.join(args.results, "per_case.csv")
    rows = list(csv.DictReader(open(per_case)))
    trials = sorted({int(r["trial"]) for r in rows})

    held = {}
    if args.log:
        # held keys: (rq, arm, trial, case, model) relative to Results/
        h, _ = _cells_from_disk(os.path.dirname(os.path.dirname(args.results)), args.log)
        arm = os.path.basename(args.results)
        # A (trial, case) cell may contain more than one configuration directory.
        # The cell is held if any directory still has a correct test.
        for (rq, a, tr, case, _model), ok in h.items():
            if a == arm:
                key = (int(tr), case)
                held[key] = held.get(key, False) or ok

    # sets: is_success is evaluated once per (group pass, Total pass), so a
    # list would double-count every demotion
    demoted, unscreened = set(), set()

    def is_success(r):
        if r["success"] != "True":
            return False
        if not args.log:
            return True
        key = (int(r["trial"]), r["case_id"])
        if key not in held:
            unscreened.add(key)
            return True
        if not held[key]:
            demoted.add(key)
            return False
        return True

    # per-trial rate per group, then mean +/- sample SD over trials --
    # the released summary.csv convention.
    groups = sorted({r["group"] for r in rows})
    out = []
    for grp in groups + ["Total"]:
        rates = []
        for tr in trials:
            sel = [r for r in rows
                   if int(r["trial"]) == tr and (grp == "Total" or r["group"] == grp)]
            rates.append(100.0 * sum(1 for r in sel if is_success(r)) / len(sel))
        # ⛔ A single-trial arm has no sample SD.  statistics.stdev raises on one
        # data point. Emit an EMPTY std for deterministic one-trial baselines,
        # matching the released CSV schema. Arms
        # with >= 2 trials are unaffected, to the digit.
        std = round(statistics.stdev(rates), 1) if len(rates) > 1 else None
        out.append((grp, round(statistics.fmean(rates), 1), std))

    print(f"results={args.results} log={args.log or '(none)'} "
          f"rows={len(rows)} trials={len(trials)}")
    print(f"{'group':8s}{'mean_sr_pct':>12s}{'std_sr_pct':>12s}")
    for grp, m, sd in out:
        print(f"{grp:8s}{m:12.1f}{'' if sd is None else format(sd, '12.1f')}")
    if args.log:
        n_s = sum(1 for r in rows if r["success"] == "True")
        print(f"successes: raw={n_s} demoted_by_gate={len(demoted)} "
              f"kept={n_s - len(demoted)} unscreened={len(unscreened)}")
        by = collections.Counter(k[1] for k in demoted)
        for c, n in by.most_common(10):
            print(f"   demoted {n}x {c}")

    if args.check:
        # an empty std_sr_pct in the released file means "single trial, no SD",
        # which must compare equal to the None this run produces -- not crash in float()
        def _std(text):
            text = (text or "").strip()
            return float(text) if text else None
        ship = {r["group"]: (float(r["mean_sr_pct"]), _std(r["std_sr_pct"]))
                for r in csv.DictReader(open(os.path.join(args.results, "summary.csv")))}
        bad = [g for g, m, s in out if g in ship and (m, s) != ship[g]]
        missing = [g for g in ship if g not in {g for g, _, _ in out}]
        if bad or missing:
            print(f"⛔ ACCEPTANCE FAILED: mismatch={bad} missing={missing} "
                  f"shipped={ship}")
            return 1
        print(f"acceptance vs summary.csv: {len(ship)} rows reproduced to the digit")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
