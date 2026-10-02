# SynTest — RQ1 baseline, per-case verdicts

Task: the same one every RQ1 arm answers — given only the patched version of a
vulnerability-fix pair, does a generated test pass on the patched version and reject the
held-out vulnerable one? `success` is that per-case answer; there is nothing else in this
directory.

- cases: 124 (the 124 shared with the VeriPUT evaluation; the id sets are identical)
- trials: 5
- detected per trial: trial1 0/124, trial2 1/124, trial3 1/124, trial4 1/124, trial5 0/124

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

- `syntest` — `scripts/Results/workdirs/BugFix124/logs/kill_syntest.jsonl`  
  sha256 `22d69206c9cc1d7675969fffbe49904c5e113f91f0b56056e72e8b559df578ef`
- `syntest_r2` — `scripts/Results/workdirs/BugFix124/logs/kill_syntest_r2.jsonl`  
  sha256 `e286dfcd77d6127ffaa4f51cd37dbf881553b1e06faad707d337a6550e972689`
- `syntest_r3` — `scripts/Results/workdirs/BugFix124/logs/kill_syntest_r3.jsonl`  
  sha256 `e04f2b28866fbac4f0f08e074391865e9d9df489d250f6854291d67475be3fc0`
- `syntest_r4` — `scripts/Results/workdirs/BugFix124/logs/kill_syntest_r4.jsonl`  
  sha256 `e4c13277dba600dfbbdca46cd6d3de8fcd7b111ee473b01850907f817ec259a0`
- `syntest_r5` — `scripts/Results/workdirs/BugFix124/logs/kill_syntest_r5.jsonl`  
  sha256 `7cb52af8645bc8384cb011f4318c02c7dbd335b8a632810626a399dbc842a488`

## Files

- `per_case.csv` — one row per (trial, case): `trial`, `case_id`, `group`, `success`, `journal_tag`
- `summary.csv` — produced by the artifact's own `scripts/report_summary.py`; an empty
  `std_sr_pct` means the arm is deterministic and ran once.
