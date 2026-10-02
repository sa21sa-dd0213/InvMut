#!/usr/bin/env python3
"""Launcher for the Direct-PBT (RQ1) / no_mg (RQ3) campaign on ONE machine.

Work = the cells (arm, trial, case) of the cases listed in --queue (one case id per line; the file is
re-read every loop, so a case that has not started yet can be moved to the other machine by editing
both queue files). Case-major order: all cells of a case are launched together so they share the
provider's prefix cache; the first cell of a case starts alone and the rest follow --stagger-s later.

Gates, checked before every launch:
  * a free slot (--concurrency);
  * MemAvailable >= --min-mem-gb;
  * no <out-root>/STOP file;
  * the DeepSeek balance (polled every --balance-every-s) >= --balance-floor.
A cell runs `scripts/run_case.py --timeout 600` and is SIGKILLed (whole process group) at --hard-wall
(660 s); a killed cell gets a case_result.json with reason case_timeout, like scripts/run.py writes.
A cell with a readable case_result.json is never launched again.

Records (all under --out-root):
  ledger.jsonl      one line per finished cell: arm, trial, case, wall, exit code,
                    killed, concurrency and MemAvailable at launch
  resources.jsonl   every --resources-every-s: MemAvailable, load, running cells, esbmc/forge process
                    counts and the largest RSS among them
  balance.jsonl     every balance poll
Cell output: <out-root>/<RQ>/<arm dir>/<trial>/cases/<case>/deepseek-v4-pro/

usage: direct_campaign.py --machine local --queue q.txt --out-root <dir> [--concurrency 12] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

# arm -> (RQ, arm dir, run_case --run-mode, run_case --config label = the cell's config dir name)
ARMS = {"direct_pbt": ("RQ1", "Direct-PBT", "direct_pbt", "deepseek-v4-pro"),
        "no_mg": ("RQ3", "no_mg", "no_mg", "deepseek-v4-pro"),
        "glm53flashx": ("RQ4", "glm-5.3-flashx", "full", "glm-5.3-flashx"),
        "direct_pbt_gpt5mini": ("RQ4", "Direct-PBT-gpt-5-mini", "direct_pbt", "gpt-5-mini"),
        "direct_pbt_glm53flashx": ("RQ4", "Direct-PBT-glm-5.3-flashx", "direct_pbt", "glm-5.3-flashx")}
# Arms whose backend differs from --cfg's keep their own Direct-PBT configuration,
# applied to that backend's Full config), so one launcher can run both backends side by side
ARM_CFG = {"direct_pbt_gpt5mini": "config.gpt5mini.direct.json",
           "direct_pbt_glm53flashx": "config.glm53flashx.direct.json"}
ARM_DIRS = {a: v[:2] for a, v in ARMS.items()}


def cell_dir(out_root, arm, trial, case):
    rq, d, _mode, label = ARMS[arm]
    return os.path.join(out_root, rq, d, str(trial), "cases", case, label)


def is_done(path):
    p = os.path.join(path, "case_result.json")
    try:
        json.load(open(p))
        return True
    except (OSError, ValueError):
        return False


def mem_available_gb():
    for line in open("/proc/meminfo"):
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) / 1048576
    return 0.0


def proc_census():
    """(n_esbmc, n_forge, max_rss_gb, max_rss_cmd) over the machine's processes."""
    out = subprocess.run(["ps", "-eo", "rss=,comm="], capture_output=True, text=True).stdout
    n_e = n_f = 0
    best = (0, "")
    for line in out.splitlines():
        parts = line.split(None, 1)
        if len(parts) != 2:
            continue
        rss, comm = int(parts[0]), parts[1].strip()
        n_e += comm.startswith("esbmc")
        n_f += comm.startswith("forge")
        if comm.startswith(("esbmc", "forge", "solc", "python")) and rss > best[0]:
            best = (rss, comm)
    return n_e, n_f, round(best[0] / 1048576, 2), best[1]


def balance_cny():
    from invmut.agents.client import resolve_api_key
    key = resolve_api_key("DEEPSEEK_API_KEY")
    req = urllib.request.Request("https://api.deepseek.com/user/balance",
                                 headers={"Authorization": f"Bearer {key}", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.load(r)
    for b in d.get("balance_infos") or []:
        if b.get("currency") == "CNY":
            return float(b.get("total_balance"))
    return None


def append(path, rec):
    with open(path, "a") as f:
        f.write(json.dumps(rec) + "\n")


def read_queue(path):
    try:
        return [l.strip() for l in open(path) if l.strip() and not l.startswith("#")]
    except OSError:
        return []


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--machine", default=socket.gethostname())
    ap.add_argument("--queue", required=True)
    ap.add_argument("--out-root", required=True)
    ap.add_argument("--arms", default="direct_pbt,no_mg")
    ap.add_argument("--trials", default="1,2,3,4,5")
    ap.add_argument("--cfg", default=os.path.join(ROOT, "config", "config.pro.direct.json"))
    ap.add_argument("--concurrency", type=int, default=12)
    ap.add_argument("--min-mem-gb", type=float, default=8.0)
    ap.add_argument("--timeout", type=int, default=600)
    ap.add_argument("--hard-wall", type=int, default=660)
    ap.add_argument("--stagger-s", type=int, default=40)
    ap.add_argument("--balance-floor", type=float, default=40.0)
    ap.add_argument("--balance-every-s", type=int, default=600)
    ap.add_argument("--resources-every-s", type=int, default=300)
    ap.add_argument("--max-cells", type=int, default=0, help="stop launching after this many (0 = no cap)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    out_root = os.path.abspath(args.out_root)
    os.makedirs(out_root, exist_ok=True)
    arms = [a for a in args.arms.split(",") if a]
    trials = [int(t) for t in args.trials.split(",") if t]
    ledger = os.path.join(out_root, "ledger.jsonl")
    lock = threading.Lock()
    running = {}          # key -> (proc, start, meta)
    case_first = {}       # case -> monotonic time of its first launch in this process
    state = {"balance": None, "stop_reason": None, "launched": 0}

    def cells_of(case):
        return [(a, t, case) for a in arms for t in trials]

    def todo():
        out = []
        for case in read_queue(args.queue):
            for a, t, c in cells_of(case):
                k = (a, t, c)
                if k in running or is_done(cell_dir(out_root, a, t, c)):
                    continue
                out.append(k)
        return out

    if args.dry_run:
        w = todo()
        print(f"{len(w)} cells to run over {len({c for _, _, c in w})} cases; first: {w[:3]}")
        return 0

    def monitor():
        last_b = last_r = 0.0
        monitor_start = time.monotonic()
        while True:
            now = time.monotonic()
            elapsed = round(now - monitor_start, 1)
            if now - last_b >= args.balance_every_s:
                last_b = now
                try:
                    b = balance_cny()
                    state["balance"] = b
                    append(os.path.join(out_root, "balance.jsonl"), {"elapsed_s": elapsed, "cny": b})
                    if b is not None and b < args.balance_floor:
                        state["stop_reason"] = f"balance {b} < {args.balance_floor}"
                except Exception as e:  # noqa: BLE001
                    append(os.path.join(out_root, "balance.jsonl"),
                           {"elapsed_s": elapsed, "error": str(e)[:200]})
            if now - last_r >= args.resources_every_s:
                last_r = now
                n_e, n_f, rss, cmd = proc_census()
                with lock:
                    n_run = len(running)
                append(os.path.join(out_root, "resources.jsonl"),
                       {"elapsed_s": elapsed, "mem_avail_gb": round(mem_available_gb(), 1),
                        "load1": os.getloadavg()[0], "running": n_run, "esbmc": n_e, "forge": n_f,
                        "max_rss_gb": rss, "max_rss_cmd": cmd})
            time.sleep(15)

    threading.Thread(target=monitor, daemon=True).start()

    def launch(a, t, c):
        d = cell_dir(out_root, a, t, c)
        os.makedirs(d, exist_ok=True)
        _rq, _dir, mode, label = ARMS[a]
        argv = [sys.executable, os.path.join(ROOT, "scripts", "run_case.py"), "--case", c, "--config", label,
                "--out", d, "--cfg", os.path.join(ROOT, "config", ARM_CFG[a]) if a in ARM_CFG else args.cfg,
                "--timeout", str(args.timeout), "--run-mode", mode]
        err = open(os.path.join(d, "stderr.log"), "w")
        p = subprocess.Popen(argv, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=err, start_new_session=True)
        launched = time.monotonic()
        meta = {"arm": a, "trial": t, "case": c,
                "concurrency_at_start": len(running) + 1, "mem_avail_gb_at_start": round(mem_available_gb(), 1)}
        running[(a, t, c)] = (p, launched, meta, err)
        case_first.setdefault(c, launched)
        state["launched"] += 1

    def reap():
        for k, (p, st, meta, err) in list(running.items()):
            rc = p.poll()
            killed = False
            if rc is None and time.monotonic() - st >= args.hard_wall:
                try:
                    os.killpg(os.getpgid(p.pid), signal.SIGKILL)
                except ProcessLookupError:
                    pass
                rc = p.wait()
                killed = True
            if rc is None:
                continue
            if not killed:
                # a scoring thread abandoned at the deadline leaves its ESBMC/forge children running
                try:
                    os.killpg(p.pid, signal.SIGKILL)
                except (ProcessLookupError, PermissionError):
                    pass
            err.close()
            end = time.monotonic()
            d = cell_dir(out_root, *k)
            if killed or not is_done(d):
                rec = {"case_id": k[2], "config_label": ARMS[k[0]][3], "feasible": False,
                       "reason": "case_timeout" if killed else "no_result_written", "success": False,
                       "wallclock_s": end - st}
                with open(os.path.join(d, "case_result.json"), "w") as f:
                    json.dump(rec, f, indent=1)
            append(ledger, {**meta, "wall_s": round(end - st, 1), "exit": rc, "killed": killed})
            del running[k]

    print(f"[{args.machine}] start: queue={args.queue} out={out_root} concurrency={args.concurrency}", flush=True)
    while True:
        with lock:
            reap()
        stop = state["stop_reason"] or (os.path.exists(os.path.join(out_root, "STOP")) and "STOP file")
        if args.max_cells and state["launched"] >= args.max_cells:
            stop = stop or "max_cells"
        work = todo()
        if not work and not running:
            break
        if stop and not running:
            print(f"[{args.machine}] stopped: {stop}", flush=True)
            break
        if not stop:
            pending = {c for _, _, c in work}
            for a, t, c in work:
                if len(running) >= args.concurrency or mem_available_gb() < args.min_mem_gb:
                    break
                if args.max_cells and state["launched"] >= args.max_cells:
                    break
                first = case_first.get(c)
                if first is not None and time.monotonic() - first < args.stagger_s:
                    continue          # the case's first cell is warming the prefix cache
                if first is None and any(time.monotonic() - case_first[o] < args.stagger_s
                                         for o in pending if o in case_first):
                    break             # one case warms at a time: open no new case meanwhile
                with lock:
                    launch(a, t, c)
                time.sleep(1)
        time.sleep(5)
    print(f"[{args.machine}] done: launched {state['launched']}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
