#!/usr/bin/env python3
"""
SolTG re-scoring under the CORRECT mutation-kill criterion.

The original run harness marked a case "killed" iff the SolTG test
(generated from the FIX) produces >=1 failing test when run against the BUG. It
never runs the test against the FIX, so it silently assumes the generated test
passes on the fix. That assumption is false for most cases: SolTG derives
concrete inputs from a symbolic CHC model of the fix that violate the contract's
real deploy-time preconditions (owner == deployer/0x0, value mismatch, ...), so
the call reverts on the FIX too. A test that reverts on BOTH fix and bug is not a
kill -- it has zero discriminating power.

This script applies the standard definition: a case is a TRUE KILL iff there
exists a generated test that PASSES on the fix AND FAILS on the bug. Everything
that also fails on the fix is counted as an invalid failure, not a kill.

Inputs (all committed):
  dataset/summary.csv                                   bug/fix paths per case
  Results/RQ1/SolTG/results/<case>/generated_test.t.sol the SolTG test that ran
Needs: forge (Foundry) + forge-std. Set FORGE_STD to the forge-std checkout, or
it falls back to the repo's third_party/forge-std.

Output:
  Results/RQ1/SolTG/true_kill_rescore.json   per-case verdict + corrected totals
"""
from __future__ import annotations
import csv, glob, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
SUMMARY = ROOT / "dataset" / "summary.csv"
OUT = HERE / "true_kill_rescore.json"
TOTAL_CASES = 124  # benchmark size (denominator for the headline rate)

FORGE_STD = os.environ.get("FORGE_STD") or str(
    ROOT / "third_party" / "forge-std")


def _forge(src_sol: str, gen_test: str, workdir: Path) -> dict | None:
    """Run the generated test against src_sol; return {test_name: passed?} or None."""
    for s in ("src", "test", "lib"):
        (workdir / s).mkdir(parents=True, exist_ok=True)
    shutil.copy(src_sol, workdir / "src" / "contract.sol")
    shutil.copy(gen_test, workdir / "test" / "contract.t.sol")
    link = workdir / "lib" / "forge-std"
    if not link.exists():
        link.symlink_to(FORGE_STD)
    (workdir / "foundry.toml").write_text(
        '[profile.default]\nsrc="src"\ntest="test"\nlibs=["lib"]\nauto_detect_solc=true\n')
    (workdir / "remappings.txt").write_text(f"forge-std/={FORGE_STD}/src/\n")
    try:
        r = subprocess.run(["forge", "test", "--json"], cwd=workdir,
                           capture_output=True, text=True, timeout=240)
    except subprocess.TimeoutExpired:
        return None
    out = r.stdout or ""
    i = out.find("{")
    if i < 0:
        return None
    try:
        data = json.loads(out[i:])
    except (json.JSONDecodeError, ValueError):
        return None
    return {name: (res.get("status") or "").lower() == "success"
            for _, info in data.items()
            for name, res in info.get("test_results", {}).items()}


def main() -> int:
    if not Path(FORGE_STD, "src").is_dir():
        print(f"forge-std not found at {FORGE_STD} (set FORGE_STD)"); return 1
    idx = {r["id"]: r for r in csv.DictReader(open(SUMMARY))}
    work = Path(os.environ.get("RESCORE_WORK", Path(tempfile.gettempdir()) / "soltg_rescore"))
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    cases = []
    for g in sorted(glob.glob(str(HERE / "results" / "*" / "generated_test.t.sol"))):
        cid = Path(g).parent.name
        if cid in idx:
            cases.append((cid, g))

    rows, true_kills, old_killed = [], 0, 0
    for cid, gen in cases:
        r = idx[cid]
        fs = _forge(r["fix"], gen, work / (cid + "_fix"))
        bs = _forge(r["bug"], gen, work / (cid + "_bug"))
        ran = fs is not None and bs is not None
        names = (set(fs) & set(bs)) if ran else set()
        killing = sorted(n for n in names if fs[n] and not bs[n])
        old = bool(json.load(open(HERE / "results" / cid / "result.json")).get("killed"))
        old_killed += old
        true_kills += bool(killing)
        rows.append({"case": cid, "tier": r["tier"], "old_harness_killed": old,
                     "true_kill": bool(killing), "killing_tests": killing,
                     "n_tests": len(names), "run_ok": ran})

    rows.sort(key=lambda x: (not x["true_kill"], not x["old_harness_killed"], x["case"]))
    summary = {
        "criterion": "true kill = exists test that PASSES on fix AND FAILS on bug",
        "total_cases": TOTAL_CASES,
        "cases_with_generated_test": len(cases),
        "old_harness_killed": old_killed,
        "true_kills": true_kills,
        "old_rate": round(old_killed / TOTAL_CASES, 4),
        "true_rate": round(true_kills / TOTAL_CASES, 4),
        "cases": rows,
    }
    OUT.write_text(json.dumps(summary, indent=2))
    print(f"old harness killed: {old_killed}/{TOTAL_CASES} ({old_killed/TOTAL_CASES:.1%})")
    print(f"TRUE kills:         {true_kills}/{TOTAL_CASES} ({true_kills/TOTAL_CASES:.1%})")
    print("true-kill cases:", [r["case"] for r in rows if r["true_kill"]])
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
