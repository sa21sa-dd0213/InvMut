#!/usr/bin/env python3
"""Reproduce and export the publication-facing InvMut result tables.

The released unit is one (research question, arm, trial, case) row from an
arm's ``per_case.csv``. ``summary.csv`` stores the original per-trial rates.
For InvMut arms that ship a ``fuzz10000.log``, a positive row is retained only
when at least one accepted test in the cell still passes the fixed contract and
fails the vulnerable contract. A positive row without a gate record remains
explicitly ``unscreened`` rather than being silently discarded.

This script intentionally reads only the consolidated result tree. It does not
consume campaign ledgers, intermediate workspaces, or execution history.
Running it checks every shipped ``summary.csv`` and writes deterministic CSVs
that can be compared byte-for-byte with ``Results/csv``.
"""

from __future__ import annotations

import argparse
import csv
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
RESULTS = ROOT / "Results"
sys.path.insert(0, str(HERE))

from run_tests import _cells_from_disk  # noqa: E402


HEADLINES = {
    ("RQ1", "InvMut"): (620, 278, 44.8),
    ("RQ4", "gpt-5-mini"): (620, 245, 39.5),
    ("RQ4", "glm-5.3-flashx"): (620, 228, 36.8),
}

BACKENDS = {
    ("RQ1", "InvMut"): "deepseek-v4-pro",
    ("RQ1", "Direct-PBT"): "deepseek-v4-pro",
    ("RQ3", "no_dv"): "deepseek-v4-pro",
    ("RQ3", "no_mg"): "deepseek-v4-pro",
    ("RQ3", "no_pa"): "deepseek-v4-pro",
    ("RQ3", "no_pf"): "deepseek-v4-pro",
    ("RQ3", "no_tr"): "deepseek-v4-pro",
    ("RQ4", "gpt-5-mini"): "gpt-5-mini",
    ("RQ4", "Direct-PBT-gpt-5-mini"): "gpt-5-mini",
    ("RQ4", "glm-5.3-flashx"): "glm-5.3-flashx",
    ("RQ4", "Direct-PBT-glm-5.3-flashx"): "glm-5.3-flashx",
}


def arms_under(results: Path) -> list[tuple[str, str, Path]]:
    arms = []
    for per_case in results.glob("RQ*/*/per_case.csv"):
        arm_dir = per_case.parent
        arms.append((arm_dir.parent.name, arm_dir.name, arm_dir))
    return sorted(arms)


def truth(value: str) -> bool:
    return value.strip().lower() == "true"


def sample_sd(values: list[float]) -> float | None:
    return statistics.stdev(values) if len(values) > 1 else None


def rounded(value: float | None, digits: int = 1) -> str:
    return "" if value is None else f"{value:.{digits}f}"


def read_gate(results: Path, log_name: str) -> dict[tuple[str, str, int, str], bool]:
    held, _rows = _cells_from_disk(str(results), log_name)
    cells: dict[tuple[str, str, int, str], bool] = {}
    for (rq, arm, trial, case, _model), verdict in held.items():
        key = (rq, arm, int(trial), case)
        cells[key] = cells.get(key, False) or verdict
    return cells


def group_order(groups: set[str]) -> list[str]:
    preferred = [g for g in ("REAL", "BENCH") if g in groups]
    return preferred + sorted(groups - set(preferred)) + ["Total"]


def summarize(rows: list[dict[str, object]], success_key: str) -> list[dict[str, object]]:
    trials = sorted({int(r["trial"]) for r in rows})
    groups = {str(r["group"]) for r in rows}
    output = []
    for group in group_order(groups):
        rates = []
        scheduled = detected = 0
        for trial in trials:
            selected = [r for r in rows if int(r["trial"]) == trial
                        and (group == "Total" or r["group"] == group)]
            if not selected:
                continue
            hits = sum(int(r[success_key]) for r in selected)
            rates.append(100.0 * hits / len(selected))
            scheduled += len(selected)
            detected += hits
        output.append({
            "group": group,
            "trials": len(rates),
            "scheduled": scheduled,
            "detected": detected,
            "mean": statistics.fmean(rates),
            "sd": sample_sd(rates),
            "per_trial": rates,
        })
    return output


def shipped_summary(path: Path) -> dict[str, tuple[str, str]]:
    with path.open(newline="") as stream:
        return {
            row["group"]: (row["mean_sr_pct"].strip(), row["std_sr_pct"].strip())
            for row in csv.DictReader(stream)
        }


def write_csv(path: Path, fields: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore",
                                lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def build(results: Path, log_name: str) -> tuple[list[dict[str, object]],
                                                  list[dict[str, object]], list[str]]:
    gate = read_gate(results, log_name)
    case_trials: list[dict[str, object]] = []
    summaries: list[dict[str, object]] = []
    failures: list[str] = []

    for rq, arm, arm_dir in arms_under(results):
        with (arm_dir / "per_case.csv").open(newline="") as stream:
            source_rows = list(csv.DictReader(stream))
            source_fields = list(source_rows[0]) if source_rows else []
        seen: set[tuple[int, str]] = set()
        rows: list[dict[str, object]] = []
        for source in source_rows:
            trial = int(source["trial"])
            case = source["case_id"]
            identity = (trial, case)
            if identity in seen:
                failures.append(f"duplicate cell: {rq}/{arm}/{trial}/{case}")
            seen.add(identity)
            raw = truth(source["success"])
            gate_key = (rq, arm, trial, case)
            if gate_key in gate:
                gate_status = "held" if gate[gate_key] else "demoted"
                final = raw and gate[gate_key]
            else:
                gate_status = "unscreened" if raw else "not_applicable"
                final = raw
            row: dict[str, object] = {
                "rq": rq,
                "arm": arm,
                "llm_backend": BACKENDS.get((rq, arm), ""),
                "trial": trial,
                "case_id": case,
                "group": source["group"],
                "raw_success": int(raw),
                "gate_status": gate_status,
                "final_success": int(final),
            }
            for field in source_fields:
                if field not in {"trial", "case_id", "group", "success"}:
                    row[field] = source[field]
            rows.append(row)
            case_trials.append(row)

        raw_summary = summarize(rows, "raw_success")
        final_summary = summarize(rows, "final_success")
        shipped = shipped_summary(arm_dir / "summary.csv")
        for raw_row in raw_summary:
            group = str(raw_row["group"])
            actual = (rounded(raw_row["mean"]), rounded(raw_row["sd"]))
            expected = shipped.get(group)
            if actual != expected:
                failures.append(
                    f"summary mismatch {rq}/{arm}/{group}: computed={actual}, shipped={expected}"
                )
        if set(shipped) != {str(r["group"]) for r in raw_summary}:
            failures.append(f"summary group mismatch: {rq}/{arm}")

        final_by_group = {str(r["group"]): r for r in final_summary}
        for raw_row in raw_summary:
            group = str(raw_row["group"])
            final_row = final_by_group[group]
            summaries.append({
                "rq": rq,
                "arm": arm,
                "llm_backend": BACKENDS.get((rq, arm), ""),
                "group": group,
                "trials": raw_row["trials"],
                "scheduled": raw_row["scheduled"],
                "raw_detected": raw_row["detected"],
                "final_detected": final_row["detected"],
                "raw_mean_sr_pct": rounded(raw_row["mean"], 2),
                "raw_sample_sd_pp": rounded(raw_row["sd"], 2),
                "final_mean_sr_pct": rounded(final_row["mean"], 2),
                "final_sample_sd_pp": rounded(final_row["sd"], 2),
                "final_per_trial_rates_pct": "|".join(
                    rounded(float(rate), 2) for rate in final_row["per_trial"]
                ),
            })

        total = final_by_group["Total"]
        expected_headline = HEADLINES.get((rq, arm))
        if expected_headline:
            observed = (int(total["scheduled"]), int(total["detected"]),
                        round(float(total["mean"]), 1))
            if observed != expected_headline:
                failures.append(
                    f"headline mismatch {rq}/{arm}: computed={observed}, "
                    f"expected={expected_headline}"
                )

    return case_trials, summaries, failures


def export(out: Path, case_trials: list[dict[str, object]],
           summaries: list[dict[str, object]]) -> None:
    fixed = ["rq", "arm", "llm_backend", "trial", "case_id", "group",
             "raw_success", "gate_status", "final_success"]
    extra = []
    for row in case_trials:
        for field in row:
            if field not in fixed and field not in extra:
                extra.append(field)
    write_csv(out / "case_trials.csv", fixed + extra, case_trials)

    summary_fields = [
        "rq", "arm", "llm_backend", "group", "trials", "scheduled",
        "raw_detected", "final_detected", "raw_mean_sr_pct", "raw_sample_sd_pp",
        "final_mean_sr_pct", "final_sample_sd_pp", "final_per_trial_rates_pct",
    ]
    write_csv(out / "summary.csv", summary_fields, summaries)
    for rq in ("RQ1", "RQ3", "RQ4"):
        write_csv(out / f"{rq.lower()}_summary.csv", summary_fields,
                  [row for row in summaries if row["rq"] == rq])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=RESULTS)
    parser.add_argument("--log", default="fuzz10000.log")
    parser.add_argument("--export", type=Path, default=RESULTS / "csv")
    args = parser.parse_args()

    case_trials, summaries, failures = build(args.results, args.log)
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        return 1

    export(args.export, case_trials, summaries)
    print(f"PASS: reproduced {len(summaries)} summary rows across "
          f"{len(arms_under(args.results))} arms")
    print(f"PASS: exported {len(case_trials)} case-trial rows to {args.export}")
    print()
    print(f"{'arm':<34} {'backend':<20} {'detected':>10} {'scheduled':>10} {'rate':>8}")
    for row in summaries:
        if row["group"] != "Total":
            continue
        print(f"{row['rq'] + '/' + row['arm']:<34} {row['llm_backend']:<20} "
              f"{row['final_detected']:>10} {row['scheduled']:>10} "
              f"{float(row['final_mean_sr_pct']):>7.1f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
