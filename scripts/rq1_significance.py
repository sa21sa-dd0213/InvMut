#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import sys

import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from run_tests import _cells_from_disk
RESAMPLES = 10000
SEED = 12345
SUBJECT = "InvMut"
BASELINES = ["Alchemist", "SolTG", "CC-SolBMC", "SolAR", "SynTest", "fuzz-utils"]
EXTRA = ["Direct-PBT"]


def paired_bootstrap(diff, resamples=RESAMPLES, seed=SEED):
    rnd = random.Random(seed)
    n = len(diff)
    obs = sum(diff) / n
    boot = sorted(sum(rnd.choices(diff, k=n)) / n for _ in range(resamples))
    lo = boot[int(0.025 * resamples)]
    hi = boot[int(0.975 * resamples) - 1]
    p_boot = min(1.0, 2.0 * min(sum(x <= 0 for x in boot),
                                sum(x >= 0 for x in boot)) / resamples)
    at_least = 0
    for _ in range(resamples):
        flipped = sum(d if rnd.random() < 0.5 else -d for d in diff) / n
        at_least += (abs(flipped) >= abs(obs) - 1e-12)
    return {"obs": obs, "ci_lo": lo, "ci_hi": hi, "p_boot": p_boot,
            "p_perm": max(at_least / resamples, 1.0 / resamples),
            "sd_boot": statistics.stdev(boot)}


def arm_gate(results_root, arm, log_name):
    if not log_name:
        return None
    cells, _rows = _cells_from_disk(os.path.dirname(results_root), log_name)
    gate = {}
    for (_rq, a, trial, case, _model), ok in cells.items():
        if a == arm:
            key = (int(trial), case)
            gate[key] = gate.get(key, False) or ok
    return gate or None


def arm_rates(path, gate=None):
    per_trial = {}
    group = {}
    with open(path, newline="") as handle:
        for row in csv.DictReader(handle):
            case = row["case_id"]
            ok = row["success"] == "True"
            if ok and gate is not None:
                key = (int(row["trial"]), case)
                if key in gate and not gate[key]:
                    ok = False
            per_trial.setdefault(case, []).append(1.0 if ok else 0.0)
            group[case] = row["group"]
    return {c: sum(v) / len(v) for c, v in per_trial.items()}, group


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-root", default=os.path.join(ROOT, "Results", "RQ1"))
    parser.add_argument("--baseline", action="append", default=None)
    parser.add_argument("--log", default=None,
                        help="fuzz log name (e.g. fuzz10000.log) to gate successes on, "
                             "for every arm that ships one")
    parser.add_argument("--json", help="also write the table as JSON")
    args = parser.parse_args()
    baselines = args.baseline or BASELINES + EXTRA

    subject_path = os.path.join(args.results_root, SUBJECT, "per_case.csv")
    gates = {SUBJECT: arm_gate(args.results_root, SUBJECT, args.log)}
    subject, groups = arm_rates(subject_path, gates[SUBJECT])
    order = sorted(subject)

    arms = {}
    for name in baselines:
        path = os.path.join(args.results_root, name, "per_case.csv")
        if not os.path.isfile(path):
            print(f"⛔ no per_case.csv for baseline {name} ({path})")
            return 2
        gates[name] = arm_gate(args.results_root, name, args.log)
        rates, their_groups = arm_rates(path, gates[name])
        if set(rates) != set(subject):
            only_here = sorted(set(subject) - set(rates))[:3]
            only_there = sorted(set(rates) - set(subject))[:3]
            print(f"⛔ {name} is not paired with {SUBJECT}: "
                  f"missing {only_here}, extra {only_there}")
            return 2
        clash = [c for c in order if their_groups[c] != groups[c]]
        if clash:
            print(f"⛔ {name} disagrees on the group of {len(clash)} cases, e.g. {clash[:3]}")
            return 2
        arms[name] = rates

    strata = {
        "ALL": order,
        "REAL": [c for c in order if groups[c] == "REAL"],
        "BENCH": [c for c in order if groups[c] == "BENCH"],
    }
    rate = lambda values, cases: 100.0 * sum(values[c] for c in cases) / len(cases)

    gated = [n for n in [SUBJECT] + baselines if gates.get(n)]
    plain = [n for n in [SUBJECT] + baselines if not gates.get(n)]
    print(f"RQ1 significance — paired bootstrap ({RESAMPLES} resamples, seed={SEED})")
    print(f"  fuzz gate ({args.log or 'none requested'}): applied to {gated or 'nothing'}; "
          f"no log shipped for {plain or 'nothing'}")
    print(f"  pairing unit = benchmark case (N={len(order)}); per-case value = detection")
    print(f"  rate over that arm's trials; delta = {SUBJECT} - baseline, percentage points.")
    print()
    print(f"  point success rate:  {SUBJECT} {rate(subject, order):.2f}%   " +
          "   ".join(f"{n} {rate(arms[n], order):.2f}%" for n in baselines))
    print()
    head = (f"  {'comparison':<28} {'group':<6} {'n':>4} {'delta(pp)':>10} "
            f"{'95% CI (pp)':>22} {'p_boot':>8} {'p_perm':>8}")
    print(head)
    print("  " + "-" * (len(head) - 2))
    out = []
    for name in baselines:
        for stratum, cases in strata.items():
            result = paired_bootstrap([subject[c] - arms[name][c] for c in cases])
            span = f"[{100 * result['ci_lo']:+.2f}, {100 * result['ci_hi']:+.2f}]"
            shown = "<1e-4" if result["p_boot"] == 0 else f"{result['p_boot']:.2g}"
            print(f"  {SUBJECT + ' vs ' + name:<28} {stratum:<6} {len(cases):>4} "
                  f"{100 * result['obs']:>+10.2f} {span:>22} {shown:>8} "
                  f"{result['p_perm']:>8.2g}")
            out.append({"subject": SUBJECT, "baseline": name, "group": stratum,
                        "n": len(cases), "delta_pp": 100 * result["obs"],
                        "ci95_pp": [100 * result["ci_lo"], 100 * result["ci_hi"]],
                        "p_boot": result["p_boot"], "p_perm": result["p_perm"]})
    print("  " + "-" * (len(head) - 2))
    weakest = min(out, key=lambda r: r["ci95_pp"][0])
    verdict = ("every CI excludes 0" if weakest["ci95_pp"][0] > 0
               else "⛔ at least one CI touches 0")
    print(f"  {verdict}; weakest lower bound {weakest['ci95_pp'][0]:+.2f} pp "
          f"({weakest['baseline']}/{weakest['group']})")

    if args.json:
        with open(args.json, "w") as handle:
            json.dump({"schema": "invmut/rq1-significance/v1", "resamples": RESAMPLES,
                       "seed": SEED, "subject": SUBJECT, "fuzz_log": args.log,
                       "gated_arms": gated, "ungated_arms": plain,
                       "rows": out}, handle, indent=1)
        print(f"  written: {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
