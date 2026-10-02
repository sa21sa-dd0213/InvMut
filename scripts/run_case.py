#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

# Label -> model. The label is also the per-case output directory name.
CONFIGS = {
    "deepseek-v4-pro": "deepseek-v4-pro",
    "gpt-5-mini": "gpt-5-mini",
    "glm-5.2": "glm-5.2",
    "glm-5.3-flash": "glm-5.3-flash",
    "glm-5.3-flashx": "glm-5.3-flashx",
}


def _atomic_write(path: str, text: str) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--case", required=True)
    ap.add_argument("--config", required=True, choices=list(CONFIGS))
    ap.add_argument("--mutant-config", default=None, choices=list(CONFIGS),
                    help="role split: use THIS config's model for MUTANT generation while "
                         "--config drives TEST generation. Default: mutants use the same model.")
    ap.add_argument("--out", required=True, help="case-config output dir")
    ap.add_argument("--cfg", default="config/config.local.json")
    ap.add_argument("--timeout", type=int, default=None,
                    help="this case's hard wall (s, from run.py); run_case reserves ~25%% for kill_check")
    ap.add_argument("--run-mode", default=None,
                    help="full | no_pf | no_dv | no_pa | no_tr (paper RQ3 arms; the flag arms compose "
                         "with '+', e.g. no_pf+no_tr). Overrides cfg.run_mode.")
    ap.add_argument("--replay-mutants", default=None,
                    help="path to a prior trial's mutants.jsonl; replays that EXACT mutant "
                         "set instead of calling the LLM.")
    ap.add_argument("--allow-skipped", action="store_true",
                    help="override the cost-policy skip hard-guard (debug only; default refuses skipped cases)")
    args = ap.parse_args()

    from invmut.config import Config
    from invmut.agents.client import LLMClient
    from invmut.orchestrate.run import ModelSpec
    from invmut.dataset.harness import run_case

    from invmut.dataset.skip import load_skip_ids, SKIP_REASON
    if args.case in load_skip_ids() and not args.allow_skipped:
        os.makedirs(args.out, exist_ok=True)
        marker = {"case_id": args.case, "config_label": args.config, "feasible": False,
                  "reason": SKIP_REASON, "success": False, "skipped": True}
        _atomic_write(os.path.join(args.out, "case_result.json"), json.dumps(marker, indent=1))
        print(f"skip {args.case}: cost-policy (>150 mutants); no LLM tests generated", file=sys.stderr)
        return 0

    cfg = Config.load(args.cfg)
    import dataclasses
    _over = {}
    if args.run_mode:
        _valid = {"full", "no_pf", "no_dv", "no_pa", "no_tr", "direct_pbt", "no_mg"}
        _arms = set(args.run_mode.split("+"))
        if not _arms <= _valid or any(o in _arms and len(_arms) > 1 for o in ("no_pa", "direct_pbt", "no_mg")):
            print(f"unknown --run-mode {args.run_mode!r}: use full|no_pf|no_dv|no_pa|no_tr "
                  "('+'-combos of the flag arms only; no_pa does not compose)", file=sys.stderr)
            return 2
        _over["run_mode"] = args.run_mode
    if _over:
        cfg = dataclasses.replace(cfg, **_over)
    from invmut.dataset.cases import cases_by_id
    cases = cases_by_id()
    if args.case not in cases:
        print(f"unknown case {args.case}", file=sys.stderr)
        return 2
    case = cases[args.case]
    model = CONFIGS[args.config]
    mutant_model = CONFIGS[args.mutant_config] if args.mutant_config else None
    solc_version = cfg.solc_version_expected.split("+")[0].replace("Version: ", "").strip()

    os.makedirs(args.out, exist_ok=True)
    log_path = os.path.join(args.out, "case.log")
    log = open(log_path, "w")

    def emit(line):
        log.write(line + "\n")
        log.flush()

    emit(f"start case={args.case} config={args.config} "
         f"model={model} mutant_model={mutant_model or model} "
         f"target={case['target_contract']}")
    def ev(e):
        emit(f"{e.get('event')}: "
             + ", ".join(f"{k}={v}" for k, v in e.items() if k != "event"))

    cli = LLMClient(cfg)
    cli.call_log = os.path.join(args.out, "llm_calls.jsonl")
    try:
        cr = run_case(cfg, case, cli, ModelSpec(model=model, mutant_model=mutant_model),
                      args.config,
                      solc_version=solc_version, on_event=ev, artifact_dir=args.out,
                      case_timeout_s=args.timeout, replay_mutants_path=args.replay_mutants)
    except Exception as e:
        import traceback
        emit("EXCEPTION:\n" + traceback.format_exc())
        cr_dict = {"case_id": args.case, "config_label": args.config, "feasible": False,
                   "reason": "crash", "success": False, "crashed": True}
        _atomic_write(os.path.join(args.out, "case_result.json"), json.dumps(cr_dict, indent=1))
        return 1

    emit(f"done feasible={cr.feasible} accepted={cr.n_accepted} "
         f"validated={cr.n_validated} killing={cr.n_killing} success={cr.success} "
         f"reason={cr.reason} {cr.wallclock_s:.0f}s tokens={cr.tokens}")
    _atomic_write(os.path.join(args.out, "case_result.json"), json.dumps(cr.as_dict(), indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
