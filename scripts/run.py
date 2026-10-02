#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _atomic_write_json(path: str, rec: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(rec, f, indent=1)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT_ROOT = os.path.join(ROOT, "Results", "runs")
OUT_ROOT = DEFAULT_OUT_ROOT
CASE_SCRIPT = os.path.join(ROOT, "scripts", "run_case.py")
DEFAULT_CONFIGS = ["deepseek-v4-pro"]
RUN_MODE: str | None = None
REPLAY_MUTANTS_ROOT: str | None = None
CFG_PATH = os.path.join(ROOT, "config", "config.local.json")
MUTANT_CONFIG: str | None = None


def _log(msg: str) -> None:
    print(msg, flush=True)
    with open(os.path.join(OUT_ROOT, "run.log"), "a") as f:
        f.write(msg + "\n")


def _result_path(case_id: str, config: str) -> str:
    return os.path.join(OUT_ROOT, "cases", case_id, config, "case_result.json")


def _is_done(case_id: str, config: str) -> bool:
    p = _result_path(case_id, config)
    if not os.path.exists(p):
        return False
    try:
        json.load(open(p))
        return True
    except (json.JSONDecodeError, ValueError):
        return False


def _run_one(case_id: str, config: str, timeout: int) -> dict:
    out_dir = os.path.join(OUT_ROOT, "cases", case_id, config)
    os.makedirs(out_dir, exist_ok=True)
    argv = [sys.executable, CASE_SCRIPT, "--case", case_id, "--config", config,
            "--out", out_dir,
            "--cfg", CFG_PATH,
            "--timeout", str(timeout)]
    if RUN_MODE:
        argv += ["--run-mode", RUN_MODE]
    if MUTANT_CONFIG:
        argv += ["--mutant-config", MUTANT_CONFIG]
    if REPLAY_MUTANTS_ROOT:
        _mj = os.path.join(REPLAY_MUTANTS_ROOT, "cases", case_id, config, "mutants.jsonl")
        if not os.path.isfile(_mj):
            rec = {"case_id": case_id, "config_label": config, "feasible": False,
                   "reason": "replay_manifest_missing", "success": False, "skipped": True}
            _atomic_write_json(os.path.join(out_dir, "case_result.json"), rec)
            return rec
        argv += ["--replay-mutants", _mj]
    t0 = time.time()
    proc = subprocess.Popen(argv, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            start_new_session=True)
    try:
        proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()
        rec = {"case_id": case_id, "config_label": config, "feasible": False,
               "reason": "case_timeout", "success": False, "wallclock_s": time.time() - t0}
        _atomic_write_json(os.path.join(out_dir, "case_result.json"), rec)
        return rec
    p = _result_path(case_id, config)
    if os.path.exists(p):
        return json.load(open(p))
    return {"case_id": case_id, "config_label": config, "feasible": False,
            "reason": "no_result_written", "success": False}


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--batch", type=int, help="0-indexed batch of --size cases (in --case-order order, "
                   "else dataset/summary.csv order)")
    g.add_argument("--cases", help="comma-separated case ids")
    ap.add_argument("--size", type=int, default=10)
    ap.add_argument("--configs", default=",".join(DEFAULT_CONFIGS))
    ap.add_argument("--concurrency", type=int, default=1, help="max concurrent cases (OOM: 8GB/esbmc)")
    ap.add_argument("--timeout", type=int, default=600, help="per case-config wall HARD cap (s); "
                    "kills the whole process tree (esbmc/solc) on expiry")
    ap.add_argument("--force", action="store_true", help="re-run even if a result exists")
    ap.add_argument("--out-root", help="override result root (distributed: per-batch isolation dir)")
    ap.add_argument("--run-mode", default=None,
                    help="full | no_pf | no_dv | no_pa | no_tr (paper RQ3 arms; '+'-combos of the flag arms); "
                         "the arm for this sweep")
    ap.add_argument("--replay-mutants-root", default=None,
                    help="reuse a prior run's mutants: path to an output root whose cases/<id>/<cfg>/mutants.jsonl is replayed")
    ap.add_argument("--case-order", default=None,
                    help="optional JSON list fixing the batch order (case ids, or {'id': ...} records); "
                         "default: <out-root>/case_order.json if present, else dataset/summary.csv order")
    ap.add_argument("--cfg", default=None,
                    help="config json forwarded to run_case (default config.local.json; "
                         "lower llm/verifier memlimit knobs there for low-RAM boxes)")
    ap.add_argument("--mutant-config", default=None,
                    help="role split: config label whose model generates MUTANTS while "
                         "--configs drives TEST generation")
    args = ap.parse_args()

    global OUT_ROOT, RUN_MODE, REPLAY_MUTANTS_ROOT, CFG_PATH, MUTANT_CONFIG
    if args.out_root:
        OUT_ROOT = os.path.abspath(args.out_root)
    elif args.run_mode and args.run_mode != "full":
        OUT_ROOT = os.path.join(DEFAULT_OUT_ROOT, args.run_mode)
    if args.run_mode:
        _valid = {"full", "no_pf", "no_dv", "no_pa", "no_tr", "direct_pbt", "no_mg"}
        _arms = set(args.run_mode.split("+"))
        if not _arms <= _valid or any(o in _arms and len(_arms) > 1 for o in ("no_pa", "direct_pbt", "no_mg")):
            print(f"unknown --run-mode {args.run_mode!r}: use full|no_pf|no_dv|no_pa|no_tr "
                  "('+'-combos of the flag arms only; no_pa does not compose)", file=sys.stderr)
            return 2
    RUN_MODE = args.run_mode
    MUTANT_CONFIG = args.mutant_config
    if args.cfg:
        CFG_PATH = os.path.abspath(args.cfg)
    REPLAY_MUTANTS_ROOT = os.path.abspath(args.replay_mutants_root) if args.replay_mutants_root else None
    os.makedirs(os.path.join(OUT_ROOT, "rounds"), exist_ok=True)
    configs = args.configs.split(",")
    if args.cases:
        ids = args.cases.split(",")
        round_label = "adhoc"
    else:
        case_order = args.case_order or os.path.join(OUT_ROOT, "case_order.json")
        if os.path.exists(case_order):
            raw = json.load(open(case_order))
            order = [r["id"] if isinstance(r, dict) else r for r in raw]
        else:
            from invmut.dataset.cases import load_cases
            order = [c["id"] for c in load_cases()]
        ids = order[args.batch * args.size:(args.batch + 1) * args.size]
        round_label = str(args.batch)

    from invmut.dataset.skip import load_skip_ids
    skip = load_skip_ids()
    n_before = len(ids)
    ids = [c for c in ids if c not in skip]
    if n_before != len(ids):
        _log(f"skip: dropped {n_before - len(ids)} cost-policy-skipped case(s); {len(ids)} remain")

    tasks = [(cid, cfg) for cid in ids for cfg in configs
             if args.force or not _is_done(cid, cfg)]
    skipped = len(ids) * len(configs) - len(tasks)
    _log(f"ROUND {round_label}: {len(ids)} cases x {configs} = {len(ids)*len(configs)} runs "
         f"({len(tasks)} to run, {skipped} already done), concurrency={args.concurrency}, "
         f"timeout={args.timeout}s")
    for cid in ids:
        _log(f"  case: {cid}")

    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        futs = {ex.submit(_run_one, cid, cfg, args.timeout): (cid, cfg) for cid, cfg in tasks}
        for fut in as_completed(futs):
            cid, cfg = futs[fut]
            rec = fut.result()
            results.append(rec)
            _log(f"  [{cfg}] {cid}: feasible={rec.get('feasible')} success={rec.get('success')} "
                 f"killing={rec.get('n_killing')} reason={rec.get('reason')} "
                 f"{rec.get('wallclock_s', 0):.0f}s")

    for cid in ids:
        for cfg in configs:
            if not any(r.get("case_id") == cid and r.get("config_label") == cfg for r in results):
                p = _result_path(cid, cfg)
                if os.path.exists(p):
                    try:
                        results.append(json.load(open(p)))
                    except (json.JSONDecodeError, ValueError):
                        pass

    summary = _summarize(round_label, ids, configs, results)
    with open(os.path.join(OUT_ROOT, "rounds", f"round_{round_label}.json"), "w") as f:
        json.dump(summary, f, indent=1)
    _log(f"ROUND {round_label} summary: " + json.dumps(summary["by_config"]))
    return 0


def _summarize(round_label, ids, configs, results) -> dict:
    from invmut.dataset.skip import SKIP_REASON
    by_config = {}
    for cfg in configs:
        rs = [r for r in results if r.get("config_label") == cfg and r.get("reason") != SKIP_REASON]
        feasible = [r for r in rs if r.get("feasible")]
        by_config[cfg] = {
            "n": len(rs),
            "feasible": len(feasible),
            "success": sum(1 for r in rs if r.get("success")),
            "success_rate_all": round(sum(1 for r in rs if r.get("success")) / max(1, len(ids)), 3),
            "success_rate_feasible": round(sum(1 for r in rs if r.get("success")) / max(1, len(feasible)), 3),
            "reasons": _count([r.get("reason") for r in rs if not r.get("success")]),
            "total_tokens": sum((r.get("tokens") or {}).get("completion", 0) for r in rs),
        }
    return {"round": round_label, "cases": ids, "configs": configs, "by_config": by_config,
            "results": results}


def _count(xs) -> dict:
    out: dict = {}
    for x in xs:
        out[x] = out.get(x, 0) + 1
    return out


if __name__ == "__main__":
    raise SystemExit(main())
