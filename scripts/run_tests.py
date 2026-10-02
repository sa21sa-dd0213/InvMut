#!/usr/bin/env python3

from __future__ import annotations

import argparse
import collections
import csv
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from itertools import count

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from invmut.config import Config
from invmut.render.foundry import adapt_imports
from invmut.render.workspace import build_workspace
from invmut.render.foundry import harden_address_domain
from invmut.render.validate import run_forge

_TESTFN = ("testFuzz_", "testRegression_", "testConcrete_", "testReplay_", "test_")

_tls = threading.local()
_slots = count()


def _slot():
    if not hasattr(_tls, "s"):
        _tls.s = next(_slots)
    return _tls.s


def _load_cases(root):
    path = os.path.join(root, "dataset", "summary.csv")
    return {r["id"]: r for r in csv.DictReader(open(path))}


def _stack_too_deep(raw) -> bool:
    """solc reports the legacy-codegen stack overflow in TWO wordings: the banner
    "Stack too deep" and the per-variable "Variable <x> is N too deep in the stack".
    The literal-only check missed the second one (MEASURED on pop_077_MergingPool),
    so the viaIR retry never fired and the row stayed compile_failed -- no evidence
    either way. Widening can only turn a compile failure into a real verdict.
    """
    t = raw or ""
    return "Stack too deep" in t or "too deep in the stack" in t


def _side(cfg, scratch, row, rendered_test, which):
    src = open(os.path.join(row["_root"], row[which])).read() if not os.path.isabs(row[which]) \
        else open(row[which]).read()
    solc = row["fix_solc"] if which == "fix" else row["bug_solc"]
    name = row["target_contract"]
    # A test written against the campaign workspace (src/C_under_test.sol, contract C) does not
    # compile here, where build_workspace writes src/<target_contract>.sol under its original name.
    # Pure path/alias rewrite, no-op for a test already written against this scaffold.
    rendered_test = adapt_imports(rendered_test, name)
    ws = os.path.join(scratch, f"rt_{_slot()}")
    out = None
    for _ in range(4):
        shutil.rmtree(ws, ignore_errors=True)
        build_workspace(ws, src, f"{name}.sol", rendered_test, cfg.forge_std_path, solc_version=solc,
                        fuzz_runs=cfg.verifier.forge_fuzz_runs, fuzz_seed=hex(cfg.verifier.forge_fuzz_seed))
        out = run_forge(cfg, ws, "InvMutTest")
        # Stack-too-deep LADDER, not one retry. The single retry turned the optimizer and via_ir on
        # together, which is the one combination pop_077_MergingPool cannot compile, so its rows stayed
        # compile_failed on BOTH sides -- recorded as "nondistinguishing", i.e. no evidence either way.
        # A compile failure is never a verdict, so adding rungs can only turn a non-verdict into a real
        # PASS/FAIL; no row that already compiled is touched.
        for _via, _opt in ((False, True), (True, True)):
            if not (out.kind == "compile_failed" and _stack_too_deep(out.raw)):
                break
            build_workspace(ws, src, f"{name}.sol", rendered_test, cfg.forge_std_path, solc_version=solc,
                            fuzz_runs=cfg.verifier.forge_fuzz_runs, fuzz_seed=hex(cfg.verifier.forge_fuzz_seed),
                            via_ir=_via, optimizer=_opt)
            out = run_forge(cfg, ws, "InvMutTest")
        if out.kind not in ("parse_error", "timeout", "no_suite"):
            break
    shutil.rmtree(ws, ignore_errors=True)
    if out.kind != "ran":
        return out.kind, out.setup_reason or ""
    if not out.any_failure(_TESTFN):
        return "PASS", ""
    why = ""
    for n, t in (out.tests or {}).items():
        if n.startswith(_TESTFN) and t.get("status") == "Failure":
            why = str(t.get("reason") or "")
            break
    return "FAIL", why


_ASSUME_LIMIT = "`vm.assume` rejected too many inputs"


def _verdict(fx, bg, bg_reason="", fx_reason=""):
    """The gate's one verdict rule; the log readers re-derive it from the recorded fields.

    A bug-side FAIL whose reason is the `vm.assume` rejection limit is not a kill: Foundry
    gave up drawing inputs, so no assertion and no call of the test decided anything
    (user ruling 2026-09-17).  Such a row is non-distinguishing, like compile_failed on
    both sides.

    The same event on the FIX side is not a violation either: no drawn input falsified
    the property, so the fixed contract holds it (user ruling 2026-09-28).  The fix
    side is then read as PASS and the bug side decides as usual.
    """
    if fx == "FAIL" and _ASSUME_LIMIT in (fx_reason or ""):
        fx = "PASS"
    if fx == bg:
        return "nondistinguishing"
    if fx == "PASS" and bg == "FAIL" and _ASSUME_LIMIT in (bg_reason or ""):
        return "nondistinguishing"
    if fx == "PASS" and bg in ("FAIL", "compile_failed"):
        return "correct"
    return "incorrect"


def _cause(reason, rendered_test):
    """Why a test that must hold on the fixed contract did not.

    assume_budget   Foundry gave up after the configured number of rejected draws.
                    A domain that only had to yield `runs` accepted inputs at the
                    default budget has to yield more at a higher `--fuzz-runs`, so
                    this is a budget outcome, not a property outcome.
    body_reverted   the call under test reverted on an input the smaller sample
                    never produced and the test does not catch it, so the
                    assertion was never reached.
    property_false  an assertion of the test failed on the fixed contract.
    """
    r = str(reason or "")
    if _ASSUME_LIMIT in r:
        return "assume_budget"
    if r.startswith("assertion failed"):
        return "property_false"
    if r.startswith("EvmError") or r.startswith("panic:"):
        return "body_reverted"
    if r and r in (rendered_test or ""):
        return "property_false"          # custom assertion message
    if r:
        return "body_reverted"           # contract require/revert string
    return "unknown"


def _kill_counting(case_dir, difference_id):
    cr_path = os.path.join(case_dir, "case_result.json")
    try:
        cr = json.load(open(cr_path))
    except OSError:
        return None
    for k in cr.get("kills", []):
        if k.get("difference_id") == difference_id and k.get("counts_toward_success"):
            return True
    return False


def _targets(results_dir, cases, only_case, kill_only, harden=False, only_cause=None):
    out = []
    for f in glob.glob(os.path.join(results_dir, "**", "tests", "*.accepted.json"), recursive=True):
        try:
            d = json.load(open(f))
        except (OSError, json.JSONDecodeError):
            continue
        if not d.get("rendered_test"):
            continue
        cid = f.split("/cases/")[1].split("/")[0]
        if cid not in cases or (only_case and cid != only_case):
            continue
        if kill_only:
            case_dir = os.path.dirname(os.path.dirname(f))
            if not _kill_counting(case_dir, d.get("difference_id")):
                continue
        did = d.get("difference_id") or os.path.basename(f)
        if only_cause and _logged_cause(os.path.dirname(os.path.dirname(f)),
                                        only_cause[0], did) != only_cause[1]:
            continue
        src = d["rendered_test"]
        if harden:
            src = harden_address_domain(src)
        out.append((f, cid, src, did))
    return out


def _logged_cause(case_dir, log_name, did):
    """The cause a previous --log run recorded for this test, or None."""
    path = os.path.join(case_dir, log_name)
    try:
        h = open(path)
    except OSError:
        return None
    with h:
        for line in h:
            if line.startswith("#"):
                continue
            f = line.rstrip("\n").split("\t")
            if len(f) >= 5 and f[0] == did:
                return f[4]
    return None


def _log_header(cfg):
    return (f"# fuzz.runs={cfg.verifier.forge_fuzz_runs} "
            f"fuzz.seed={hex(cfg.verifier.forge_fuzz_seed)} "
            f"max_test_rejects={os.environ.get('FOUNDRY_FUZZ_MAX_TEST_REJECTS', '65536')} "
            f"forge_timeout_s={cfg.verifier.forge_per_test_timeout_s}\n"
            f"# test\tverdict\tfix\tbug\tcause\tfix_reason\tbug_reason\n")


def _write_log_row(case_dir, name, cfg, did, status, fx, bg, cause, fxwhy, bgwhy):
    """Write the latest verdict for a test without retaining superseded rows."""
    path = os.path.join(case_dir, name)
    row = (f"{did}\t{status}\t{fx}\t{bg}\t{cause}\t"
           f"{(fxwhy or '').replace(chr(9), ' ')[:200]}\t"
           f"{(bgwhy or '').replace(chr(9), ' ')[:200]}\n")
    rows, order = {}, []
    if os.path.exists(path):
        for line in open(path):
            if line.startswith("#") or not line.strip():
                continue
            key = line.split("\t", 1)[0]
            if key not in rows:
                order.append(key)
            rows[key] = line if line.endswith("\n") else line + "\n"
    if did not in rows:
        order.append(did)
    rows[did] = row
    with open(path, "w") as h:
        h.write(_log_header(cfg))
        for key in order:
            h.write(rows[key])


def _already_logged(targets, name):
    seen = set()
    for d in {os.path.dirname(os.path.dirname(t[0])) for t in targets}:
        path = os.path.join(d, name)
        if not os.path.exists(path):
            continue
        for line in open(path):
            if line.startswith("#") or not line.strip():
                continue
            seen.add((d, line.split("\t")[0]))
    return seen


# --census: git refs to compare the current log against, set from the CLI.
_CENSUS_REFS = []


def _cell_of(path):
    """(rq, arm, trial, case, model) -- the unit the paper's table counts.

    Derived by locating the "Results" segment rather than by a fixed negative
    index: the same helper has to read a worktree path, a path relative to the
    results dir, and a repo-root-relative path out of `git ls-tree`, which sit
    at three different depths.
    """
    q = os.path.normpath(path).split(os.sep)
    i = len(q) - 1 - q[::-1].index("Results")
    return (q[i + 1], q[i + 2], q[i + 3], q[i + 5], q[i + 6])


def _parse_log(lines):
    """Return did -> (verdict, fix, bug, cause).

    The verdict is re-derived by _verdict from the recorded fix/bug outcome and bug
    reason, so a row written before a rule change is read under the current rule.
    """
    out = {}
    for line in lines:
        if line.startswith("#") or not line.strip():
            continue
        f = line.rstrip("\n").split("\t")
        if len(f) >= 5:
            out[f[0]] = (_verdict(f[2], f[3], f[6] if len(f) > 6 else "", f[5] if len(f) > 5 else ""), f[2], f[3], f[4])
    return out


def _cells_from_disk(results_dir, log_name):
    held, rows = {}, {}
    for lg in glob.glob(os.path.join(results_dir, "*", "*", "*", "cases", "*", "*",
                                     log_name)):
        cell = _cell_of(lg)
        t = _parse_log(open(lg).read().splitlines())
        held[cell] = any(v[0] == "correct" for v in t.values())
        for did, v in t.items():
            rows[(cell, did)] = v
    return held, rows


def _cells_from_git(ref, log_name):
    """The same rollup, read out of a committed tree.

    The log is the ledger, so a before/after comparison must read the ledger at
    the earlier commit -- not a saved copy of a report's stdout, which does not
    carry the per-cell detail.  Paths from `git ls-tree` are repo-root relative,
    so git is invoked with -C at the root; running it from a subdirectory
    resolves `ref:path` against that prefix and silently returns empty blobs.
    """
    try:
        root = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=ROOT,
                              capture_output=True, text=True,
                              check=True).stdout.strip()
        paths = [l for l in subprocess.run(
            ["git", "-C", root, "ls-tree", "-r", "--name-only", ref],
            capture_output=True, text=True, check=True).stdout.splitlines()
            if l.endswith(log_name)]
    except (OSError, subprocess.CalledProcessError):
        return {}, {}
    if not paths:
        return {}, {}
    blob = subprocess.run(["git", "-C", root, "cat-file", "--batch"],
                          input="".join(f"{ref}:{r}\n" for r in paths),
                          capture_output=True, text=True).stdout
    held, rows, pos = {}, {}, 0
    for rel in paths:
        nl = blob.index("\n", pos)
        size = int(blob[pos:nl].split()[2])
        body = blob[nl + 1:nl + 1 + size]
        pos = nl + 1 + size + 1
        cell = _cell_of(rel)
        t = _parse_log(body.splitlines())
        held[cell] = any(v[0] == "correct" for v in t.values())
        for did, v in t.items():
            rows[(cell, did)] = v
    return held, rows


def _census(results_dir, log_name, hardened_name):
    """Every quantitative claim about the address-domain defect, from the logs.

    One command so the numbers in a report have a producer: it re-derives them
    from the per-case --log files and the accepted-test JSON on disk, and does
    not run forge.
    """
    import re
    rows, cells = {}, set()
    for lg in glob.glob(os.path.join(results_dir, "*", "*", "*", "cases", "*", "*", log_name)):
        d = os.path.dirname(lg)
        for line in open(lg):
            if line.startswith("#"):
                continue
            f = line.rstrip("\n").split("\t")
            if len(f) >= 5:
                rows[(d, f[0])] = (f[1], f[4])
                if f[4] == "body_reverted":
                    cells.add(d)
    br = {k: v for k, v in rows.items() if v[1] == "body_reverted"}
    print(f"[1] {log_name}: rows={len(rows)}  body_reverted rows={len(br)} in {len(cells)} cells")

    _SIG = re.compile(r"function\s+test\w*\s*\(([^)]*)\)")
    n_addr = 0
    for (d, did) in br:
        try:
            src = json.load(open(os.path.join(d, "tests", did + ".accepted.json")))["rendered_test"]
        except (OSError, KeyError, json.JSONDecodeError):
            continue
        m = _SIG.search(src or "")
        if m and any(p.strip().split()[0] == "address"
                     for p in m.group(1).split(",") if p.strip()):
            n_addr += 1
    print(f"[2] of those, tests fuzzing an `address` parameter: {n_addr}/{len(br)}")

    tot = fp_addr = fp = other_addr = 0
    for p2 in glob.glob(os.path.join(results_dir, "*", "*", "*", "cases", "*", "*",
                                     "tests", "*.accepted.json")):
        try:
            src = json.load(open(p2))["rendered_test"] or ""
        except (OSError, KeyError, json.JSONDecodeError):
            continue
        tot += 1
        is_fp = "internal constant" in src and re.search(r"function _\w+\(", src)
        m = _SIG.search(src)
        has_addr = bool(m) and any(q.strip().split()[0] == "address"
                                   for q in m.group(1).split(",") if q.strip())
        fp += bool(is_fp)
        fp_addr += bool(is_fp and has_addr)
        other_addr += bool(not is_fp and has_addr)
    print(f"[3] render_foundry fingerprint: {fp}/{tot} accepted tests; the other "
          f"{tot - fp} include {other_addr} that fuzz an address with no domain guard")

    hard = {}
    for lg in glob.glob(os.path.join(results_dir, "*", "*", "*", "cases", "*", "*", hardened_name)):
        d = os.path.dirname(lg)
        for line in open(lg):
            if line.startswith("#"):
                continue
            f = line.rstrip("\n").split("\t")
            if len(f) >= 5:
                hard[(d, f[0])] = (f[1], f[4])
    if hard:
        t = collections.Counter(
            (rows.get(k, ("?", "?"))[1], v[1] or v[0]) for k, v in hard.items())
        fixed = {k[0] for k, v in hard.items() if v[0] == "correct"}
        print(f"[4] {hardened_name}: {len(hard)} rows re-run; cells with a restored kill: "
              f"{len(fixed)}/{len(cells)}")
        for (a, b), c in sorted(t.items(), key=lambda z: -z[1]):
            print(f"      {a:14s} -> {b:20s} {c}")

    def _idx(arm):
        out = {}
        for p2 in glob.glob(os.path.join(results_dir, arm, "*", "cases", "*", "*",
                                         "tests", "*.accepted.json")):
            parts = p2.split(os.sep)
            # <arm>/<trial>/cases/<case>/<model>/tests/<did>.accepted.json
            key = (parts[-6], parts[-4], parts[-3], os.path.basename(p2).split(".")[0])
            try:
                out[key] = (json.load(open(p2))["rendered_test"],
                            os.path.dirname(os.path.dirname(p2)))
            except (OSError, KeyError, json.JSONDecodeError):
                pass
        return out
    a, b = _idx("RQ3/no_tr"), _idx("RQ1/InvMut")
    ident = [(k, a[k][1], b[k][1]) for k in a if k in b and a[k][0] == b[k][0]]
    pairs = [(rows.get((da, k[3])), rows.get((db, k[3]))) for k, da, db in ident]
    both = [(x, y) for x, y in pairs if x and y]
    print(f"[5] reproducibility: rendered tests byte-identical between RQ3/no_tr and "
          f"RQ1/InvMut = {len(ident)}; both carry a {log_name} row = {len(both)}; "
          f"verdict+cause agree = {sum(1 for x, y in both if x == y)}")

    # ---- [6] the third rejection shape -------------------------------------
    pair_rx = re.compile(r"vm\.assume\(\s*([A-Za-z_]\w*)\s*\.length\s*==\s*"
                         r"([A-Za-z_]\w*)\s*\.length\s*\)")
    lit_rx = re.compile(r"vm\.assume\(\s*([A-Za-z_]\w*)\s*\.length\s*"
                        r"(==|>=|<=|>|<)\s*(\d+)\s*\)")
    from invmut.render.foundry import (harden_paired_array_lengths,
                                       harden_array_length_assumes)
    lit_t = lit_c = lit_o = 0
    lit_ops = collections.Counter()
    pair_t = pair_o = pair_rw = 0
    lit_cells, pair_cells = set(), set()
    for p2 in glob.glob(os.path.join(results_dir, "*", "*", "*", "cases", "*", "*",
                                     "tests", "*.accepted.json")):
        try:
            src = json.load(open(p2))["rendered_test"] or ""
        except (OSError, KeyError, json.JSONDecodeError):
            continue
        cell = _cell_of(p2)
        m = lit_rx.findall(src)
        if m:
            lit_t += 1
            lit_o += len(m)
            lit_cells.add(cell)
            for _n, op, _k in m:
                lit_ops[op] += 1
        m = pair_rx.findall(src)
        if m:
            pair_t += 1
            pair_o += len(m)
            pair_cells.add(cell)
            pair_rw += harden_paired_array_lengths(src) != src
    print(f"[6] fuzz-domain rejection shapes in the accepted tests")
    print(f"      literal   vm.assume(a.length <op> K):        {lit_t} tests, "
          f"{lit_o} occurrences, {len(lit_cells)} cells, ops={dict(lit_ops.most_common())}")
    print(f"      paired    vm.assume(a.length == b.length):   {pair_t} tests, "
          f"{pair_o} occurrences, {len(pair_cells)} cells, "
          f"{pair_rw} rewritable (rest: both operands calldata)")

    # ---- [7] cause distribution + [8] transition against a git ref ---------
    cur_held, cur_rows = _cells_from_disk(results_dir, log_name)
    print(f"[7] {log_name}: cells={len(cur_held)} rows={len(cur_rows)} "
          f"held={sum(cur_held.values())}")
    print("      causes on non-correct rows: "
          + str(dict(collections.Counter(v[3] or "(none)" for v in cur_rows.values()
                                         if v[0] != "correct").most_common())))
    lost_by = collections.Counter()
    for cell, ok in cur_held.items():
        if ok:
            continue
        for (c, _did), v in cur_rows.items():
            if c == cell and v[0] != "correct":
                lost_by[v[3] or "(none)"] += 1
    print("      causes on rows inside LOST cells: "
          + str(dict(lost_by.most_common())))
    if _CENSUS_REFS:
        for ref in _CENSUS_REFS:
            ref_held, _ = _cells_from_git(ref, log_name)
            if not ref_held:
                print(f"[8] {ref}: no {log_name} in that tree -- skipped")
                continue
            m = collections.Counter()
            lost = []
            for cell in set(ref_held) | set(cur_held):
                a2, b2 = ref_held.get(cell, False), cur_held.get(cell, False)
                m[(a2, b2)] += 1
                if a2 and not b2:
                    lost.append(cell)
            print(f"[8] vs {ref}: held {sum(ref_held.values())} -> "
                  f"{sum(cur_held.values())} ({sum(cur_held.values()) - sum(ref_held.values()):+d}); "
                  f"T->T {m[(True, True)]}  RECOVERED {m[(False, True)]}  "
                  f"LOST {m[(True, False)]}  F->F {m[(False, False)]}")
            for cell in sorted(lost):
                print("      LOST " + "/".join(cell))


def _report(results_dir, name):
    """Roll the per-case logs up to the paper's unit without re-running forge.

    A (trial, case) cell counts when at least one of its counted tests still holds
    on the fixed contract and fails on the vulnerable one.  Cells that no longer
    count are broken down by the reason their tests failed on the FIXED contract.
    """
    # Index by test id so older externally produced logs with duplicate rows are
    # read deterministically. Newly written logs contain one row per test.
    arms = collections.defaultdict(lambda: collections.defaultdict(dict))
    for path in glob.glob(os.path.join(results_dir, "**", name), recursive=True):
        rel = os.path.relpath(path, results_dir)
        arm = os.sep.join(rel.split(os.sep)[:2])
        for line in open(path):
            if line.startswith("#") or not line.strip():
                continue
            f = line.rstrip("\n").split("\t")
            if len(f) < 5:
                continue
            arms[arm][os.path.dirname(path)][f[0]] = (
                _verdict(f[2], f[3], f[6] if len(f) > 6 else "", f[5] if len(f) > 5 else ""), f[4])
    print(f"log={name}  results-dir={results_dir}")
    print(f"{'arm':24s} {'cells':>6s} {'held':>6s} {'lost':>6s}   causes on the lost cells")
    tot = collections.Counter()
    for arm in sorted(arms):
        cells = arms[arm]
        held = lost = 0
        c = collections.Counter()
        for _cell, by_test in cells.items():
            rows = list(by_test.values())
            if any(v == "correct" for v, _ in rows):
                held += 1
            else:
                lost += 1
                for v, cause in rows:
                    c[cause or v] += 1
        tot["cells"] += len(cells); tot["held"] += held; tot["lost"] += lost
        print(f"{arm:24s} {len(cells):6d} {held:6d} {lost:6d}   "
              + "  ".join(f"{k}={v}" for k, v in c.most_common()))
    print(f"{'TOTAL':24s} {tot['cells']:6d} {tot['held']:6d} {tot['lost']:6d}")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Validate shipped Foundry tests against the real "
                                             "contracts under a fixed fuzz seed: each must hold on "
                                             "the fixed contract and fail on the vulnerable contract.")
    ap.add_argument("--results-dir", default=os.path.join(ROOT, "Results"))
    ap.add_argument("--case", default=None, help="restrict to one case id")
    ap.add_argument("--all", action="store_true", help="check every rendered test, not just kill-counting ones")
    ap.add_argument("--cfg", default=os.path.join(ROOT, "config", "config.local.json"))
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--scratch", default=os.path.join(ROOT, ".run_tests_ws"))
    ap.add_argument("--list-incorrect", action="store_true")
    ap.add_argument("--fuzz-runs", type=int, default=0,
                    help="override fuzz.runs for this validation (0 = the pinned value)")
    ap.add_argument("--fuzz-seed", default=None,
                    help="override fuzz.seed: a number, or a word taken as its ASCII bytes")
    ap.add_argument("--max-test-rejects", type=int, default=0,
                    help="FOUNDRY_FUZZ_MAX_TEST_REJECTS. Foundry's default of 65536 is about 6.5 "
                         "rejected draws per accepted input at fuzz.runs=10000; keep that ratio when raising "
                         "--fuzz-runs, or the assume filter decides the verdict instead of the property")
    ap.add_argument("--forge-timeout", type=int, default=0,
                    help="override the per-test forge timeout in seconds (0 = the pinned value)")
    ap.add_argument("--log", default=None,
                    help="write one log per case directory with this name, e.g. fuzz10000.log")
    ap.add_argument("--census-vs", nargs="*", metavar="REF", default=None,
                    help="--census: git ref(s) whose committed --log is the before-state "
                         "of the cell transition, e.g. --census-vs 203adfce8 33c1b4c1b")
    ap.add_argument("--census", action="store_true",
                    help="do not run forge: re-derive the address-domain census from the --log "
                         "files and the accepted-test JSON (the producer for every number a "
                         "report quotes about this defect)")
    ap.add_argument("--hardened-log", default="fuzz10000_hardened.log",
                    help="--census: the log written by the --harden-address-domain re-run")
    ap.add_argument("--report", action="store_true",
                    help="do not run forge: roll the existing --log files up per arm and exit")
    ap.add_argument("--harden-address-domain", action="store_true",
                    help="apply invmut.render.foundry.harden_address_domain to every rendered test "
                         "before running it. render_foundry guards its own fuzz parameters, but it "
                         "emits a minority of the corpus; this puts the same domain on the tests the "
                         "other render paths produced. Deterministic and idempotent -- it only adds "
                         "vm.assume lines")
    ap.add_argument("--only-cause", nargs=2, metavar=("LOG", "CAUSE"), default=None,
                    help="restrict to the tests a previous run recorded with this cause in this log, "
                         "e.g. --only-cause fuzz10000.log body_reverted")
    ap.add_argument("--resume", action="store_true",
                    help="skip tests already recorded in the --log files")
    ap.add_argument("--only-paths", default=None,
                    help="file listing accepted.json paths (one per line, relative to the "
                         "artifact root or absolute): run only those tests, even if already "
                         "logged; the existing row is replaced")
    ap.add_argument("--isolate-fuzz-cache", action="store_true",
                    help="give every workspace its own fuzz failure-persistence dir.  Without it "
                         "forge persists counterexamples under <cwd>/cache/fuzz and replays them "
                         "into any test with the same contract and function name, and every "
                         "InvMut test is InvMutTest with repeating function names")
    args = ap.parse_args()

    if args.census:
        _CENSUS_REFS[:] = args.census_vs or []
        return _census(args.results_dir, args.log or "fuzz10000.log", args.hardened_log)
    if args.report:
        return _report(args.results_dir, args.log or "fuzz10000.log")
    import dataclasses
    if args.max_test_rejects:
        os.environ["FOUNDRY_FUZZ_MAX_TEST_REJECTS"] = str(args.max_test_rejects)
    cfg = Config.load(args.cfg)
    vkw = {}
    if args.fuzz_runs:
        vkw["forge_fuzz_runs"] = args.fuzz_runs
    if args.fuzz_seed is not None:
        vkw["forge_fuzz_seed"] = (int(args.fuzz_seed, 0) if args.fuzz_seed.lstrip("-").isdigit()
                                  or args.fuzz_seed.startswith(("0x", "0X"))
                                  else int.from_bytes(args.fuzz_seed.encode(), "big"))
    if args.forge_timeout:
        vkw["forge_per_test_timeout_s"] = args.forge_timeout
    if vkw:
        cfg = dataclasses.replace(cfg, verifier=dataclasses.replace(cfg.verifier, **vkw))
    cases = _load_cases(ROOT)
    for r in cases.values():
        r["_root"] = ROOT
    os.makedirs(args.scratch, exist_ok=True)
    if args.isolate_fuzz_cache:
        global build_workspace
        _plain_build = build_workspace

        def build_workspace(ws_dir, *a, **k):
            _plain_build(ws_dir, *a, **k)
            with open(os.path.join(ws_dir, "foundry.toml"), "a") as h:
                h.write(f'fuzz.failure_persist_dir = "{os.path.join(ws_dir, "cache", "fuzz")}"\n')
    targets = _targets(args.results_dir, cases, args.case, not args.all,
                       harden=args.harden_address_domain, only_cause=args.only_cause)
    if args.only_paths:
        wanted = {os.path.normpath(os.path.join(ROOT, line.strip()))
                  for line in open(args.only_paths) if line.strip()}
        targets = [t for t in targets if os.path.normpath(t[0]) in wanted]
        missing = len(wanted) - len(targets)
        if missing:
            print(f"--only-paths: {missing} listed paths are not gate targets "
                  f"(no source, unknown case, or not kill-counting without --all)", flush=True)
    done_ids = _already_logged(targets, args.log) if (args.log and args.resume) else set()
    if done_ids:
        targets = [t for t in targets if (os.path.dirname(os.path.dirname(t[0])), t[3]) not in done_ids]
    print(f"seed={hex(cfg.verifier.forge_fuzz_seed)} runs={cfg.verifier.forge_fuzz_runs} "
          f"max_test_rejects={os.environ.get('FOUNDRY_FUZZ_MAX_TEST_REJECTS', 'forge default')} "
          f"forge_timeout={cfg.verifier.forge_per_test_timeout_s}s tests={len(targets)}"
          + (f" (resumed, {len(done_ids)} already logged)" if done_ids else ""), flush=True)

    lock = threading.Lock()
    done = [0]
    incorrect = []
    causes = collections.Counter()

    def check(t):
        f, cid, rt, did = t
        fx, fxwhy = _side(cfg, args.scratch, cases[cid], rt, "fix")
        bg, bgwhy = _side(cfg, args.scratch, cases[cid], rt, "bug")
        status = _verdict(fx, bg, bgwhy, fxwhy)
        cause = _cause(fxwhy, rt) if fx != "PASS" else ""
        with lock:
            done[0] += 1
            if done[0] % 100 == 0:
                print(f"{done[0]}/{len(targets)}", flush=True)
            if status == "incorrect":
                incorrect.append((f, f"fix={fx} bug={bg}"))
                causes[cause] += 1
            if args.log:
                _write_log_row(os.path.dirname(os.path.dirname(f)), args.log, cfg, did, status,
                               fx, bg, cause, fxwhy, bgwhy)
        return status

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(check, targets))
    shutil.rmtree(args.scratch, ignore_errors=True)

    # cell roll-up: the paper's unit is the (trial, case) cell, which is solved when
    # AT LEAST ONE of its counted tests still holds on the fix and fails on the bug.
    cells = {}
    for (f, cid, _rt, _did), st in zip(targets, results):
        key = os.path.dirname(os.path.dirname(f))
        cells[key] = cells.get(key, "") or ""
        if st == "correct":
            cells[key] = "correct"
        elif not cells[key]:
            cells[key] = st
    by_tree = collections.defaultdict(collections.Counter)
    for key, st in cells.items():
        rel = os.path.relpath(key, args.results_dir)
        tree = os.sep.join(rel.split(os.sep)[:1]) if args.results_dir.endswith(("RQ1", "RQ3", "RQ4")) \
            else os.sep.join(rel.split(os.sep)[:-3]) or "."
        by_tree[tree][st] += 1

    good = results.count("correct")
    scored = good + results.count("incorrect")
    nond = results.count("nondistinguishing")
    print(f"\ncorrect: {good}/{scored}" + (f"   non-distinguishing: {nond}" if nond else ""), flush=True)
    print(f"cells with >=1 still-correct test: "
          f"{sum(1 for v in cells.values() if v == 'correct')}/{len(cells)}", flush=True)
    for tree in sorted(by_tree):
        c = by_tree[tree]
        print(f"  {tree or '.':28s} correct {c['correct']:4d}  incorrect {c['incorrect']:4d}  "
              f"non-distinguishing {c['nondistinguishing']:4d}", flush=True)
    if causes:
        print("fixed-side failure causes: "
              + "  ".join(f"{k}={v}" for k, v in sorted(causes.items())), flush=True)
    if incorrect and args.list_incorrect:
        print("incorrect:")
        for f, why in incorrect:
            print(f"  {why:24s} {f}")
    return 0 if good == scored else 1


if __name__ == "__main__":
    raise SystemExit(main())
