# fuzz-utils — RQ1 baseline, per-case verdicts

Task: the same one every RQ1 arm answers — given only the patched version of a
vulnerability-fix pair, does a generated test pass on the patched version and reject the
held-out vulnerable one? `success` is that per-case answer; there is nothing else in this
directory.

- cases: 120
- trials: 5
- detected per trial: trial1 0/120, trial2 0/120, trial3 0/120, trial4 0/120, trial5 0/120

A case with no scorable execution row did not expose its vulnerable version and is recorded
`success=False`, so every trial here has all 120 cases. Scoring only the cases a tool
managed to run would divide by a smaller, tool-dependent denominator.

## Files

- `per_case.csv` — one row per (trial, case): `trial`, `case_id`, `group`, `success`
- `summary.csv` — consolidated from `per_case.csv`; an empty
  `std_sr_pct` means the arm is deterministic and ran once.
