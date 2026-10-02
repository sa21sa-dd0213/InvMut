# SolAR — RQ1 baseline, per-case verdicts

Task: the same one every RQ1 arm answers — given only the patched version of a
vulnerability-fix pair, does a generated test pass on the patched version and reject the
held-out vulnerable one? `success` is that per-case answer; there is nothing else in this
directory.

- cases: 124 (the 124 shared with the VeriPUT evaluation; the id sets are identical)
- trials: 5
- detected per trial: trial1 0/124, trial2 0/124, trial3 0/124, trial4 0/124, trial5 0/124

## Where these verdicts come from

They are not recomputed here. They are read from the VeriPUT evaluation's own judgment
function (`Results/results_all.py:_rq2_verdicts`, together with the `_budget_excluded`,
`_kill_is_witnessed` and `_apply_strict_policy` layers it applies), exported by
`scripts/Results/export_bugfix124_verdicts.py` and reshaped by
`InvMut/scripts/migrate_baseline_arms_to_zenodo.py`.

A case with no scorable execution row did not expose its vulnerable version and is recorded
`success=False`, so every trial here has all 124 cases. Scoring only the cases a tool
managed to run would divide by a smaller, tool-dependent denominator.

Source journals (sha256 as read):

- `solar` — `scripts/Results/workdirs/BugFix124/logs/kill_solar.jsonl`  
  sha256 `e120282c8bd2ba461024330acfabae907b79154a4d4c3e1ee615099ef5723fd6`
- `solar_r2` — `scripts/Results/workdirs/BugFix124/logs/kill_solar_r2.jsonl`  
  sha256 `305fca6e7a581b025af6572f97588ef914da1755a9337fea276bd25d69d39038`
- `solar_r3` — `scripts/Results/workdirs/BugFix124/logs/kill_solar_r3.jsonl`  
  sha256 `eee266c4c8339d2e300f7e6037a4efb928fe023e084aea3db50d71d3f6622eff`
- `solar_r4` — `scripts/Results/workdirs/BugFix124/logs/kill_solar_r4.jsonl`  
  sha256 `67c8c3edbf50943f1d0c53d817f2dd3d7c532a230b47aad2a15639778d4851da`
- `solar_r5` — `scripts/Results/workdirs/BugFix124/logs/kill_solar_r5.jsonl`  
  sha256 `dcfe9567761d8a67b78802d116f63685985cadf777f272dfa4693be90b2496de`

## Files

- `per_case.csv` — one row per (trial, case): `trial`, `case_id`, `group`, `success`, `journal_tag`
- `summary.csv` — produced by the artifact's own `scripts/report_summary.py`; an empty
  `std_sr_pct` means the arm is deterministic and ran once.
