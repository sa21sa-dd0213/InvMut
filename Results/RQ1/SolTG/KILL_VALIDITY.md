# SolTG kill validity — the reported kill rate is inflated ~10x

The headline "20/134 (14.9%) killed" from the run harness is **not** the real
kill rate. Under the standard mutation-kill definition it is **2/134 (1.5%)**.

## The flawed criterion

the run harness decides:

```python
"killed": forge_result.get("n_failed", 0) > 0   # any test failing on the BUG
"kill_rate": n_failed / n_tests                  # all counted on the BUG only
```

It generates the test from the **fix**, then runs it **only against the bug** and
counts failures. It **never runs the test against the fix**, so it silently
assumes the generated test passes on the fix. The correct definition of "a test
kills a mutant" is: the test **passes on the original (fix) AND fails on the
mutant (bug)**. The harness only checks the second half.

## Why it matters: most "kills" revert on BOTH fix and bug

SolTG derives concrete inputs from a symbolic CHC model of the fix. Those inputs
routinely violate the contract's real deploy-time preconditions (e.g. `owner`
is the deployer or `0x0`, but the test `vm.prank`s a different sender; or
`msg.value != TICKET_AMOUNT`). When executed in Foundry the guarded call reverts
**on the fix too**. Such a test fails on both sides → zero discriminating power,
yet the harness counts the bug-side revert as a kill.

Re-running every generated test on **both** fix and bug (`score_true_kills.py`,
data in `true_kill_rescore.json`):

| criterion | SolTG kills |
|---|---:|
| old harness (`n_failed_on_bug > 0`) | **20 / 134 (14.9%)** |
| correct (`∃ test: pass-on-fix ∧ fail-on-bug`) | **2 / 134 (1.5%)** |

The only two genuine kills are `rc_time_manipulation__ether_lotto__SolGPT__
ether_lotto_{1,3}round`. The other 18 are invalid: the failing test reverts on
the fix as well (or is noise).

## Worked example: `acfix_021_CVE_2018_19832` (real bug: `NETM()` missing `onlyOwner`)

SolTG emits one test per target function (11 here, one fresh deploy + one call
each). Per-test status on fix vs bug:

| test | function | fix | bug | |
|---|---|---|---|---|
| test_fix_0 | burn | FAIL | FAIL | reverts on both |
| test_fix_1 | withdraw | FAIL | FAIL | reverts on both |
| test_fix_2–6 | allowance/approve/transferFrom/transfer/balanceOf | PASS | PASS | |
| test_fix_7 | finishDistribution | FAIL | FAIL | reverts on both |
| test_fix_8,9 | transferOwnership | FAIL | FAIL | reverts on both |
| **test_fix_10** | **NETM (the vulnerable function)** | **FAIL** | **PASS** | **backwards** |

`kill_rate = 5/11 = 0.45` comes entirely from burn/withdraw/finishDistribution/
transferOwnership reverting on **both** sides — functions unrelated to the bug.
The one test that actually targets the vulnerable `NETM()` **passes on the buggy
contract and fails on the fixed one** — the opposite of detecting the bug. Net
true kills for this case: **0**.

## Test-generation granularity (context)

- 1 case (1 input `.sol`) → 1 generated test **file**.
- N test **functions** `test_fix_0..N-1`, N = number of (contract×function)
  targets SolTG enumerated (1–14 across our 37 files). Each deploys a fresh
  instance and calls one function with model inputs (`deploys == tests`).
- ~5% of test functions are empty stubs (target enumerated, no satisfying call
  found) → trivially pass and dilute `kill_rate` (e.g. `phishable`: 1 real call
  + 1 empty → reported kr 0.5).

## Reproduce

```
python3 Results/RQ3/SolTG/score_true_kills.py      # writes true_kill_rescore.json
```
Needs Foundry + forge-std (`FORGE_STD=...`, defaults to the repo's npm shim).
Reads only committed artifacts: `dataset/.../{bug,fix}.flat.sol` and
`Results/RQ3/SolTG/results/<case>/generated_test.t.sol`.
