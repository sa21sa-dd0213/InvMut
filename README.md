# InvMut

**InvMut** is a verifier-grounded generator of **property-based tests** for Solidity smart contracts. It
pairs a large language model (LLM) with the bounded model checker **ESBMC**: the LLM proposes a mutant as a
behavioral probe, ESBMC certifies via **differential verification** that the mutant changes observable
behavior and returns a counterexample, a second LLM synthesizes a **property** from that difference, and
ESBMC accepts the test only when the property is *proved* on the original contract and *refuted* on the
mutant. Accepted properties are rendered as runnable **Foundry** tests.

This repository is the publication-facing artifact. It contains the consolidated experiment arms and
omits machine-local workspaces, execution timestamps, campaign histories, and intermediate repair data.

## Background

The strongest smart-contract tests are *property-based*: their oracle is a property checked over a range of
inputs and interactions, not a single recorded value. A valid one is hard to obtain — it needs both a
*meaningful* property to assert and a *guarantee* that the property holds on the correct contract.
Prompting an LLM for such a test directly gives neither: the property may be vacuous, wrong, or untethered
to any real fault.

## What InvMut Does

InvMut takes a Solidity contract `P` and returns property-based Foundry tests. Instead of asking the LLM
for a full test in one shot, it decomposes the task around verifier-checked **mutants**:

1. **Target selection.** Static analysis picks the contract's observable behaviors — state-changing
   public functions and the transaction boundaries around them.
2. **Mutant generation.** For each selected behavior, an LLM injects small single-statement faults into
   `P`, yielding a batch of candidate mutants.
3. **Differential verification.** ESBMC (R1/R2) searches for a transaction sequence on which `P` and a
   mutant `M` diverge; each confirmed difference carries a concrete **counterexample** — initial state,
   call sequence, and the diverging behavior.
4. **Property synthesis.** The witnessed difference goes to a second LLM, which synthesizes a symbolic
   **property**. ESBMC accepts it only when the property is **proved on `P`** and **refuted on `M`**; on
   a failed or inconclusive check the agent **reflects**, revising the candidate under the verifier's
   feedback (up to 5 rounds).
5. **Rendering.** Each accepted property is rendered as a runnable, self-contained Foundry test.

## Contributions

- **Mutant-driven test synthesis.** The first framework to use LLM-generated mutants as behavioral probes
  that *drive* property-based test generation, rather than as targets to be scored.
- **Verifier-grounded acceptance.** Every accepted test carries a property that ESBMC proves on the
  reference contract and refutes on the mutant, filtering out vacuous, concrete-replay, and
  non-discriminating assertions.
- **No specifications, no seed tests.** InvMut needs only the contract source; it synthesizes both the
  property and the distinguishing execution.
- **Implementation and evaluation.** Implemented for Solidity with ESBMC and Foundry, evaluated on 124
  real-world and benchmark vulnerability-fix pairs against two state-of-the-art baselines.

## Organization

```
InvMut/
├── invmut/                 # tool implementation (Python)
│   ├── agents/             # LLM access + mutate/test agents (prompts, JSON parse, retry)
│   ├── mutation/           # mutant generation + static staging
│   ├── esbmc/              # ESBMC command construction + differential-verify (R1/R2)
│   ├── render/             # render accepted properties into runnable Foundry tests
│   ├── verify/             # Foundry kill-check against the real bug
│   ├── orchestrate/        # end-to-end pipeline (stages 1–5 above)
│   ├── dataset/            # case loading + benchmark harness (run one case, score kills)
│   ├── select.py           # target / boundary selection
│   └── config.py           # configuration + pinned-version checks
├── scripts/                # runners + validation tools (see scripts/README.md)
│   ├── run.py              # batch runner over many cases (timeout, resume)
│   ├── run_case.py         # single-case runner → one case_result.json
│   ├── run_tests.py        # validate the shipped Foundry tests against the real contracts
│   ├── results_all.py      # reproduce and export every public result table
│   ├── audit_release.py    # check the publication package
│   └── rename_tests_to_original.py  # rename tests from the alias C back to the real contract name
├── dataset/                # 124 (bug, fix) Solidity pairs + index (real/ 95, bench/ 29)
├── config/                 # pinned tool versions + LLM blocks (*.json)
├── third_party/forge-std/  # vendored Foundry test library
├── tool/                   # baseline sources (Alchemist, SolTG)
├── motivation_examples/    # the paper's RewardVault example, 3 scenarios + run_motivation.py — see its README
└── Results/
    ├── RQ1/                # tool comparison: InvMut + baselines (Alchemist, SolTG)
    ├── RQ3/                # ablations: no_pf, no_dv, no_pa, no_tr
    ├── RQ4/                # backend robustness: GPT-5-mini and GLM-5.3-FlashX
    └── csv/                # tables regenerated by scripts/results_all.py
```

All experimental outcomes are consolidated as CSV in `Results/`: every configuration ships a
`per_case.csv` with the per-case statistics behind every number in the paper, and a `summary.csv` with
the aggregated success rates. Run `python3 scripts/results_all.py` to validate those inputs and regenerate
the publication tables in `Results/csv/`.

The final 10,000-run gate yields 278/620 detections (44.8%) for the DeepSeek-v4-Pro InvMut arm,
245/620 (39.5%) for GPT-5-mini, and 228/620 (36.8%) for GLM-5.3-FlashX.

## Dataset

`dataset/` holds **124 flattened, self-contained `(bug, fix)` Solidity pairs**, split by the origin of the
vulnerable version:

| Category | Cases | Description |
|---|---|---|
| **real**  | 95 | on-chain or project-maintained vulnerabilities (`dataset/real/`) |
| **bench** | 29 | benchmark-derived bugs (`dataset/bench/`) |

Each case directory holds `bug.flat.sol`, `fix.flat.sol`, and `diff.patch`.

## Reproducing Experiments

Every experiment poses the same task: given only the **patched** version of a historical
vulnerability-fix pair, generate a test that passes on the patched version and fails on the held-out
vulnerable version. A test that does both **kills** the bug; a case is **solved** when at least one
accepted test kills its bug (`success = n_killing > 0`). Each research question runs the pipeline into
`Results/<RQ>/...`.

### RQ1 — Tool comparison

InvMut and Direct-PBT against the released RQ1 baselines, five trials over the 124 cases:

```bash
for n in 1 2 3 4 5; do
  python3 scripts/run.py --batch 0 --size 200 --configs deepseek-v4-pro \
      --cfg config/config.local.json --out-root Results/RQ1/InvMut/$n --timeout 600
done
```

### RQ2 — Failure study

A taxonomy of RQ1's non-detecting rows, derived from the failure classifications in `per_case.csv` — no
separate run.

### RQ3 — Ablation study

Each arm disables one component via `--run-mode` (`+`-composable):

| `--run-mode` | ablated component |
|---|---|
| `no_pf` | property focus (one broad mutation batch per target) |
| `no_dv` | differential verification (mutants reach synthesis unverified) |
| `no_pa` | property assertion (concrete replay tests) |
| `no_tr` | test reflection (one attempt per difference) |
| `no_mg` | mutant-guided generation |

```bash
for arm in no_pf no_dv no_pa no_tr no_mg; do
  python3 scripts/run.py --batch 0 --size 200 --configs deepseek-v4-pro --run-mode $arm \
      --cfg config/config.local.json --out-root Results/RQ3/$arm/1 --timeout 600
done
```

### RQ4 — Robustness

The same pipeline on GPT-5-mini and GLM-5.3-FlashX, with a Direct-PBT control for each backend, five
trials per arm:

```bash
for n in 1 2 3 4 5; do
  python3 scripts/run.py --batch 0 --size 200 --configs gpt-5-mini \
      --cfg config/config.openai.json --out-root Results/RQ4/gpt-5-mini/$n --timeout 600
  python3 scripts/run.py --batch 0 --size 200 --configs glm-5.3-flashx \
      --cfg config/config.glm53flashx.json --out-root Results/RQ4/glm-5.3-flashx/$n --timeout 600
done
```

### Validating the accepted tests

Every accepted test ships ready to run against the real contracts. `scripts/run_tests.py` rebuilds each
shipped Foundry test into a workspace and checks the property directly, under a **fixed fuzz seed** so every
run is deterministic and reproducible: the test must pass on the fixed contract and fail on the vulnerable
contract.

```bash
python3 scripts/run_tests.py --results-dir Results                              # all shipped tests
python3 scripts/run_tests.py --results-dir Results/RQ1/InvMut --list-incorrect  # one tree, list any failures
python3 scripts/run_tests.py --case <case_id>                                   # one case
```

The tests refer to each contract by its real name (`import {<Contract>} from "../src/<Contract>.sol"`), so
they run directly with no renaming step. During generation the pipeline aliases the target contract to
`C`; `scripts/rename_tests_to_original.py` is the one-shot tool that reverses that alias back to the real
contract name across all shipped tests (already applied to this artifact).

## Usage Example

A single-case walkthrough on `rc_access_control__mycontract__SolGPT__mycontract_2round`, whose contract
exposes a `sendTo(receiver, amount)` transfer.

### 1. Run

```bash
python3 scripts/run_case.py \
    --case rc_access_control__mycontract__SolGPT__mycontract_2round \
    --config deepseek-v4-pro --cfg config/config.local.json \
    --out run-output/demo --timeout 600
```

### 2. Mutant

The LLM injects a single-statement fault — deleting the positivity guard:

```diff
- require(amount > 0);
```

### 3. Differential verification

ESBMC confirms `P` and the mutant `M` diverge and returns a counterexample: an `amount == 0` transfer that
the two treat differently.

### 4. Property and test

From that difference the second LLM synthesizes the property *"a successful `sendTo` must transfer a
strictly positive amount"*, which ESBMC proves on `P` and refutes on `M`, then renders as a Foundry test:

```solidity
contract InvMutTest is Test {
    function _run(uint256 amount) internal {
        bool reverted;
        try c.sendTo(address(0x123), amount) { reverted = false; } catch { reverted = true; }
        assertTrue(!reverted ? amount > 0 : true);
    }
    function testFuzz_run(uint256 amount) public { _run(amount); }
}
```

### 5. Output

Written under `--out`:

```
run-output/demo/
├── case_result.json    # feasible, n_accepted, n_validated, n_killing, success, kills[], tokens ...
├── mutants.jsonl       # generated mutant candidates per target/boundary
├── case.log            # mutation / test / accepted events
└── tests/
    ├── D0003.accepted.json    # property_summary, change_summary, rendered_test, kill, origin
    ├── attempts.jsonl
    └── rejected_attempts.jsonl
```

`D0003` is accepted and kills the real bug (`kill = bug_property_failed`, `origin = primary`). This exact
test is shipped under `Results/RQ1/InvMut/1/cases/<case>/deepseek-v4-pro/tests/D0003.accepted.json`.

## Motivating example

`motivation_examples/` carries the paper's `RewardVault` example: the fixed contract `P` and two
one-statement faults — **M1** (reentrancy) and **M2** (a transaction-order *snapshot* bug: `claim` reads
the live `rewardRate` instead of the per-user `rateSnapshot`). It makes the core problem concrete: a
*concrete-replay* test passes on **both** `P` and the buggy `M2`, so it misses the fault, whereas a
*property* test holds on `P` and fails on `M2` — and that distinguishing test is what InvMut generates.
Three folders show three ways to reach such a test: the mutant pinned to the fault (`mot_paper/`),
hand-written oracles (`mot_handwrite/`), and blind generation from `P` alone (`mot_run/`, the key result:
InvMut invents its own mutants and synthesizes tests that kill both faults).

See **`motivation_examples/README.md`** for the per-scenario walkthrough and every file. To validate the
example's Foundry tests — each holds on the fixed `P` and fails on its fault `M1`/`M2` (the concrete-replay
baseline holds on `P` and misses `M2`):

```bash
python3 motivation_examples/run_motivation.py
```

## Baselines

The `tool/` directory contains the Alchemist and SolTG source packages. Their per-case scoring
(pass-on-fix / fail-on-bug) lives in `Results/RQ1/Alchemist/` and `Results/RQ1/SolTG/`.

- **`tool/Alchemist/`** — LLM-guided, mutation-killing test generator over SuMo
  ([upstream](https://github.com/MorenaBarboni/Alchemist)). `Alchemist-main.zip` is the pristine upstream
  package; `src/` is that upstream with minimal runnability fixes for the public SuMo release — the
  algorithm is unchanged.
- **`tool/SolTG/`** — verifier-driven (SMTChecker) test generator
  ([upstream](https://github.com/usi-verification-and-security/SolTG)). Normally run inside its Docker
  image; build it from `tool/SolTG/` per that project's README. `Results/RQ1/SolTG/` also carries the fair
  kill rescore (`score_true_kills.py`, `KILL_VALIDITY.md`): SolTG's own harness never checks pass-on-fix,
  inflating its reported kill rate.

The released RQ1 tables also retain the CC-SolBMC, SolAR, SynTest, and fuzz-utils measurements. Their
result CSVs are included for comparison, but the CC-SolBMC implementation is not redistributed here.

## Reproducing the released tables

```bash
python3 scripts/results_all.py
python3 scripts/audit_release.py
```

The first command reconstructs `Results/csv/{case_trials,summary,rq1_summary,rq3_summary,rq4_summary}.csv`
from the arm-level records and checks every arm's stored `summary.csv`. The second command validates the
package layout, JSON/JSONL syntax, anonymization rules, canonical backend labels, result inventories, and
byte-for-byte reproducibility of the exported CSVs.

## Dependencies

**Python packages:**

```bash
pip install openai==1.109.1 slither-analyzer==0.11.3
```

**External binaries** are *not* pip dependencies — they are pinned to paths in `config/*.json` and
version-checked at startup (a run aborts on any mismatch):

| Tool | Version | Notes |
|---|---|---|
| ESBMC   | 8.2.0  | install separately and set its path in the config |
| solc    | 0.8.29 | install via [solc-select](https://github.com/crytic/solc-select) |
| forge (Foundry) | 1.7.1 | compiles and runs the generated Foundry tests (kill-check) |
| slither | 0.11.3 | static analysis / target-boundary selection |
| Python  | 3.10+  | |

**LLM API key.** Set the environment variable named in the config's `llm.api_key_env`.

## Configuration

`config/*.json` is the unified configuration: pinned tool paths and expected versions, plus an `llm` block
(`model`, `base_url`, `api_key_env`, `temperature`, `service_tier`/`reasoning_effort`). Copy
`config.example.json` and set the tool paths for your machine.

| Config | LLM | Notes |
|---|---|---|
| `config.local.json`  | deepseek-v4-pro | main full-pipeline runs (RQ1/RQ3) |
| `config.openai.json` | gpt-5-mini | OpenAI provider (RQ4 robustness backend) |
| `config.glm53flashx.json` | glm-5.3-flashx | GLM provider (RQ4 robustness backend) |
| `config.example.json` | deepseek-v4-pro | portable configuration template |

## Command-Line Options

`scripts/run.py` (a trial over many cases):

| Option | Description |
|---|---|
| `--batch N --size K` / `--cases id1,id2` | the N-th batch of K cases, or an explicit subset |
| `--configs LABEL` | LLM for test generation (`deepseek-v4-pro`, `gpt-5-mini`) |
| `--mutant-config LABEL` | cheaper model for mutant generation (role split) |
| `--cfg PATH` | config JSON (default `config/config.local.json`) |
| `--run-mode MODE` | `full` \| `no_pf` \| `no_dv` \| `no_pa` \| `no_tr` (flag arms `+`-compose) |
| `--timeout S` | per-case wall cap; kills the whole process tree on expiry |
| `--out-root DIR` | result root for this trial |
| `--force` | re-run even if a result exists |

`scripts/run_case.py` runs a single `(case, config)` and writes one `case_result.json`; it takes `--case`,
`--config`, `--out`, `--cfg`, `--timeout`, `--mutant-config`, `--run-mode`.

## Troubleshooting

- **Tool version mismatch.** A run may abort if `solc`/`ESBMC`/`forge`/`slither` do not match the pinned
  versions. Fix the paths in `config/*.json`; use `solc-select` for `solc 0.8.29`.
- **API key.** On an auth error, confirm the variable named in `llm.api_key_env` is exported.
- **Out of memory.** ESBMC is memory-heavy (~8 GB per call); cases run one at a time, so keep at least
  8 GB of RAM free.
