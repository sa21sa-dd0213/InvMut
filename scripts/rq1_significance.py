#!/usr/bin/env python3
"""RQ1 significance: InvMut against every baseline, by a paired bootstrap over the 124 cases.

The pairing unit is the benchmark case, because that is the unit the experiment is designed
on: every arm answers the same question about the same 124 vulnerability-fix pairs. A case's
per-arm value is its detection RATE -- the mean of the per-trial `success` flag, which is
0/1 for a deterministic arm that ran once and a fraction in {0, .2, .4, .6, .8, 1} for a
five-trial arm. The reported statistic is the mean over cases of (InvMut - baseline), in
percentage points, with a 10 000-resample percentile CI resampling CASES.

Deterministic: standard library only, seeded `random` (seed=12345), so two runs of this
script on the same `per_case.csv` files print identical numbers.

Every arm is read from its own `Results/RQ1/<arm>/per_case.csv`; nothing is recomputed from
raw logs here, so this report cannot disagree with `report_summary.py` about who succeeded.

⛔ THE FUZZ GATE IS PART OF THE NUMBER.  `report_summary.py` is two-stage: without `--log`
it reproduces the shipped `summary.csv` from `per_case.csv`; with `--log fuzz10000.log` it
additionally demotes any success whose case has no test still correct under 10 000 fuzz
runs.  The reported success rate is the GATED one (InvMut 45.2, not the ungated 49.5), so
this script takes `--log` too and applies the identical rule, arm by arm.  An arm that ships
no such log -- every baseline here -- is scored as-is, because its verdicts already come
from runs pinned to 10 000 fuzz runs and already required a failing test that passes on the
patched contract; there is no second screen left to apply. The header line says, per arm,
whether a gate was found, so the two sides are never silently on different footings.

usage: rq1_significance.py [--log fuzz10000.log] [--results-root Results/RQ1]
                           [--baseline NAME ...] [--json OUT]
"""
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
from run_tests import _cells_from_disk  # noqa: E402
RESAMPLES = 10000
SEED = 12345
SUBJECT = "InvMut"
BASELINES = ["Alchemist", "SolTG", "CC-SolBMC", "SolAR", "SynTest", "fuzz-utils"]
# USER RULING 2026-09-25 (option B): Direct-PBT is compared with InvMut in this paired table and
# listed in results_all [1]/[2], but is not a baseline -- no other RQ1 section reads it.
EXTRA = ["Direct-PBT"]


def paired_bootstrap(diff, resamples=RESAMPLES, seed=SEED):
    """Percentile 95% CI + achieved significance for a paired difference vector.

    `diff` is one value per case (InvMut minus baseline). Resampling cases with
    replacement is what makes the interval a statement about the benchmark rather than
    about these 124 contracts in this order. `p_perm` is a paired sign-flip permutation
    level, floored at 1/resamples because no permutation test can report a level below
    the resolution of the number of permutations it drew.

    `sd_boot` is the spread of the bootstrap distribution itself -- the standard error
    of this mean paired difference.  It is NOT the +/- printed beside a success rate,
    which is a sample SD over that arm's trials: one says how far the difference would
    move on another draw of benchmark cases, the other how far a rate moved across
    re-runs.  Reading it off `boot` draws no extra random number, so every interval and
    p-value above is bit-identical with or without it.
    """
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
    """{(trial, case): kept} from that arm's fuzz logs, or None when it ships none.

    Same rollup as report_summary.py: a cell may carry logs under more than one config
    directory, and it is held if ANY config still has a correct test.
    """
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
    """case_id -> (detection rate over that arm's trials, group).

    With a gate, a success whose (trial, case) has no surviving correct test counts as
    a failure -- exactly report_summary.py's `is_success`.  A (trial, case) absent from
    the gate is left as recorded, matching that script's `unscreened` branch.
    """
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
        # ⛔ A paired test is meaningless if the two arms are not on the same cases.
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
