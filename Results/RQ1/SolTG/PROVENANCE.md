# SolTG — RQ1 baseline, per-case verdicts

Task: the same one every RQ1 arm answers — given only the patched version of a
vulnerability-fix pair, does a generated test pass on the patched version and reject the
held-out vulnerable one? `success` is that per-case answer; there is nothing else in this
directory.

- cases: 124 (the 124 shared with the VeriPUT evaluation; the id sets are identical)
- trials: 1
- detected per trial: trial1 2/124

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

- `soltg` — `scripts/Results/workdirs/BugFix124/logs/kill_soltg.jsonl`  
  sha256 `4b25bb4d6a013c76b30dd574a71ae6996d5596bad82050936d04b7ab3e88b2f7`

## Files

- `per_case.csv` — one row per (trial, case): `trial`, `case_id`, `group`, `success`, `journal_tag`
- `summary.csv` — produced by the artifact's own `scripts/report_summary.py`; an empty
  `std_sr_pct` means the arm is deterministic and ran once.
