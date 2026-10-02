#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys

_MOT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(_MOT)
sys.path.insert(0, ROOT)

from invmut.config import Config
from invmut.render.workspace import build_workspace
from invmut.render.validate import run_forge

_TESTFN = ("testFuzz_", "testRegression_", "testConcrete_", "test_")
_SOLC = "0.8.30"

_TESTS = [
    ("mot_paper", "M1_validated_foundry_test.sol", "M1_reentrancy.sol", "FAIL"),
    ("mot_paper", "M2_validated_foundry_test.sol", "M2_tod.sol", "FAIL"),
    ("mot_handwrite", "oracle_M1_reentrancy.t.sol", "M1_reentrancy.sol", "FAIL"),
    ("mot_handwrite", "oracle_M2_tod.t.sol", "M2_tod.sol", "FAIL"),
    ("mot_handwrite", "concrete_replay_M2.t.sol", "M2_tod.sol", "PASS"),
    ("mot_run", "M1_autogen_killer.t.sol", "M1_reentrancy.sol", "FAIL"),
    ("mot_run", "M2_autogen_killer.t.sol", "M2_tod.sol", "FAIL"),
]


def _verdict(cfg, scratch, src, test_src, seed):
    ws = os.path.join(scratch, "mot_ws")
    for _ in range(4):
        shutil.rmtree(ws, ignore_errors=True)
        build_workspace(ws, src, "RewardVault.sol", test_src, cfg.forge_std_path,
                        solc_version=_SOLC, fuzz_runs=cfg.verifier.forge_fuzz_runs, fuzz_seed=seed)
        out = run_forge(cfg, ws, "InvMutTest")
        if out.kind == "compile_failed" and "Stack too deep" in (out.raw or ""):
            build_workspace(ws, src, "RewardVault.sol", test_src, cfg.forge_std_path, solc_version=_SOLC,
                            fuzz_runs=cfg.verifier.forge_fuzz_runs, fuzz_seed=seed, via_ir=True)
            out = run_forge(cfg, ws, "InvMutTest")
        if out.kind not in ("parse_error", "timeout", "no_suite"):
            break
    shutil.rmtree(ws, ignore_errors=True)
    if out.kind != "ran":
        return out.kind
    return "FAIL" if out.any_failure(_TESTFN) else "PASS"


def main():
    ap = argparse.ArgumentParser(description="Reproduce the motivating-example Foundry tests: each holds on "
                                             "the fixed contract P (RewardVault) and is violated on its fault "
                                             "M1/M2 (concrete_replay_M2 is the baseline that misses M2).")
    ap.add_argument("--cfg", default=os.path.join(ROOT, "config", "config.local.json"))
    ap.add_argument("--scratch", default=os.path.join(ROOT, ".run_motivation_ws"))
    args = ap.parse_args()

    cfg = Config.load(args.cfg)
    seed = hex(cfg.verifier.forge_fuzz_seed)
    os.makedirs(args.scratch, exist_ok=True)
    print(f"seed={seed} runs={cfg.verifier.forge_fuzz_runs} solc={_SOLC}", flush=True)

    ok = 0
    for folder, test_name, mutant, expect_m in _TESTS:
        d = os.path.join(_MOT, folder)
        test_src = open(os.path.join(d, test_name)).read()
        p_src = open(os.path.join(d, "P.sol")).read()
        m_src = open(os.path.join(d, mutant)).read()
        von_p = _verdict(cfg, args.scratch, p_src, test_src, seed)
        von_m = _verdict(cfg, args.scratch, m_src, test_src, seed)
        good = von_p == "PASS" and von_m == expect_m
        ok += good
        tag = "OK " if good else "BAD"
        note = "misses M2 (baseline)" if expect_m == "PASS" else f"kills {mutant.split('_')[0]}"
        print(f"  [{tag}] {folder}/{test_name}: P={von_p} {mutant.split('_')[0]}={von_m} "
              f"(expect P=PASS {mutant.split('_')[0]}={expect_m}, {note})", flush=True)

    shutil.rmtree(args.scratch, ignore_errors=True)
    print(f"\ncorrect: {ok}/{len(_TESTS)}", flush=True)
    return 0 if ok == len(_TESTS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
