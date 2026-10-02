# scripts/

Entry points for running InvMut and for validating the shipped results. Every script is invoked from the
repository root with `python3 scripts/<name>.py` and reads tool versions / LLM settings from a config file
under `config/` (default `config/config.local.json`).

There are two groups: **generation** (run the pipeline to produce tests) and **validation** (re-check the
tests that ship with the artifact).

## Generation

### `run.py` — batch runner (a trial)

Runs the full InvMut pipeline over many dataset cases in one trial and writes one `case_result.json` per
case under an output root. Handles per-case timeouts and can resume an interrupted trial. Selects the
model backend with `--configs`, the ablation with `--run-mode`, and the output location with `--out-root`.

```bash
python3 scripts/run.py --batch 0 --size 200 --configs deepseek-v4-pro \
    --out-root Results/RQ1/InvMut/1 --timeout 600
```

### `run_case.py` — single-case runner

Runs the pipeline on one `(case, config)` pair and writes its `case_result.json`, `case.log`, and accepted
tests. Useful for inspecting or repeating a single case end to end.

```bash
python3 scripts/run_case.py --case <case_id> --config deepseek-v4-pro --out <dir>
```

## Validation

### `results_all.py` — reproduce the released CSV tables

Checks every arm's `summary.csv`, applies the released 10,000-run gates, verifies the frozen headline
counts, and writes deterministic tables to `Results/csv/`.

```bash
python3 scripts/results_all.py
```

### `audit_release.py` — validate the publication package

Checks the public layout, structured-data syntax, anonymization rules, result inventory, backend labels,
and byte-for-byte reproducibility of the exported CSV tables.

```bash
python3 scripts/audit_release.py
```

### `run_tests.py` — validate the shipped Foundry tests

Rebuilds each shipped Foundry test into a Foundry workspace and checks the property directly against the
real contracts under a **fixed fuzz seed** (so every run is deterministic): a test is correct when it
**passes on the fixed contract** and **fails on the vulnerable contract**. Reports how many tests are correct and, with
`--list-incorrect`, which are not. By default it checks the kill-counting tests; `--all` checks every
rendered test.

```bash
python3 scripts/run_tests.py --results-dir Results                              # all shipped tests
python3 scripts/run_tests.py --results-dir Results/RQ1/InvMut --list-incorrect  # one tree
python3 scripts/run_tests.py --case <case_id>                                   # one case
```

Options: `--results-dir` (tree to check), `--case` (one case), `--all`, `--list-incorrect`, `--workers`,
`--cfg`.

The motivating example has its own runner next to its files, `motivation_examples/run_motivation.py`
(`python3 motivation_examples/run_motivation.py`); it builds each of that example's Foundry tests against
the fixed contract `P` and its faults `M1`/`M2`.

### `rename_tests_to_original.py` — restore real contract names

During generation the pipeline aliases the contract under test to `C`. This one-shot tool reverses that
alias back to the real contract name (from `dataset/summary.csv`) across every shipped test, so the tests
reference each contract by its true name and run directly. It edits only the test source, skipping names
inside comments and strings, and supports `--dry-run` to preview.

```bash
python3 scripts/rename_tests_to_original.py --dry-run   # preview
python3 scripts/rename_tests_to_original.py             # apply
```
