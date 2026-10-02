# Motivating Example: RewardVault

A single fixed contract `P` (`P.sol`, contract `RewardVault`) and two faulty
variants of it:

- `M1_reentrancy.sol` — a reentrancy fault: `withdraw` zeroes the caller's
  balance **after** the external call (CEI violated).
- `M2_tod.sol` — a transaction-order / snapshot fault: `claim` reads the **live**
  `rewardRate` instead of the rate snapshotted at deposit time.

The three folders illustrate three ways of obtaining a test that holds on the
fixed `P` and is violated on the faulty `M1`/`M2`.

```
motivation_examples/
├── mot_paper/       Scenario A — the mutant IS M1/M2 (pinned): differential
│   │                verification + the test InvMut generates for it.
│   ├── P.sol, M1_reentrancy.sol, M2_tod.sol          fixed + faulty contracts
│   ├── mutants_M1.jsonl, mutants_M2.jsonl            M1/M2 pinned as the mutant
│   ├── M1_diff_verification.sol, M2_diff_verification.sol   R2 diff harness
│   ├── M1_validated_foundry_test.sol, M2_validated_foundry_test.sol
│   ├── esbmc_programs/                               P-HOLD / M-BREAK programs
│   └── gen/                                          pinned-mutant run record
│
├── mot_handwrite/   Scenario B — hand-written property tests that hold on P
│   │                and are violated on M1/M2.
│   ├── P.sol, M1_reentrancy.sol, M2_tod.sol
│   ├── oracle_M1_reentrancy.t.sol, oracle_M2_tod.t.sol      (Foundry)
│   ├── M1_property_test.sol, M2_property_test.sol           (non-Foundry)
│   └── concrete_replay_M2.t.sol                             (baseline: misses the bug)
│
└── mot_run/         Scenario C — blind generation: given only P, InvMut
    │                synthesizes tests that kill M1/M2.
    ├── P.sol, M1_reentrancy.sol, M2_tod.sol
    ├── M1_autogen_killer.sol, M2_autogen_killer.sol         (non-Foundry)
    ├── M1_autogen_killer.t.sol, M2_autogen_killer.t.sol     (Foundry)
    └── run/                                                 full generation record
        ├── case_result.json, mutants.jsonl
        └── tests/                                           accepted tests + attempts
```

## Notes

- **Scenario A (`mot_paper`)** assumes the mutant is exactly M1/M2 and shows the
  differential-verification harness plus the ESBMC P-HOLD / M-BREAK programs.
- **Scenario B (`mot_handwrite`)** are tests we wrote by hand. Each `oracle_*`
  (Foundry) and `*_property_test` (plain Solidity) holds on `P` and is violated
  on the corresponding fault. `concrete_replay_M2.t.sol` is a baseline that
  never exercises a rate change and therefore *misses* M2.
- **Scenario C (`mot_run`)** is the key result: InvMut is given only `P`,
  generates its own mutants, and synthesizes property tests. A single run's test
  suite kills **both** faults — `M2_autogen_killer` (from `run/tests/D0024`) kills
  M2, and `M1_autogen_killer` (from `run/tests/D0027`) kills M1 — confirming that
  generation is fault-agnostic. Each killer is provided in both non-Foundry and
  Foundry form; both hold on `P` and are violated on the respective fault under
  ESBMC and concrete `forge` execution.

## Validating these tests

`run_motivation.py` builds every Foundry test in the three scenarios against the fixed contract
`P` and its faults `M1`/`M2`, under a fixed fuzz seed: each killer test holds on `P` and fails on
its fault, and the concrete-replay baseline holds on `P` and misses `M2`.

```bash
python3 motivation_examples/run_motivation.py
```
