from __future__ import annotations

import argparse
import csv
import glob
import json
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def reverse_rename(rt, name):
    out = []
    i = 0
    n = len(rt)
    state = "code"
    while i < n:
        ch = rt[i]
        two = rt[i:i + 2]
        if state == "code":
            if two == "//":
                state = "line"; out.append(two); i += 2; continue
            if two == "/*":
                state = "block"; out.append(two); i += 2; continue
            if ch == '"':
                state = "dq"; out.append(ch); i += 1; continue
            if ch == "'":
                state = "sq"; out.append(ch); i += 1; continue
            prevw = i > 0 and (rt[i - 1].isalnum() or rt[i - 1] == "_")
            nextw = i + 1 < n and (rt[i + 1].isalnum() or rt[i + 1] == "_")
            if ch == "C" and not prevw and not nextw:
                out.append(name); i += 1; continue
            out.append(ch); i += 1; continue
        if state == "line":
            out.append(ch); i += 1
            if ch == "\n":
                state = "code"
            continue
        if state == "block":
            if two == "*/":
                state = "code"; out.append(two); i += 2; continue
            out.append(ch); i += 1; continue
        if state == "dq":
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(rt[i + 1]); i += 2; continue
            if ch == '"':
                state = "code"
            i += 1; continue
        if state == "sq":
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(rt[i + 1]); i += 2; continue
            if ch == "'":
                state = "code"
            i += 1; continue
    res = "".join(out)
    return res.replace("C_under_test.sol", f"{name}.sol")


def _names(root):
    path = os.path.join(root, "dataset", "summary.csv")
    return {r["id"]: r["target_contract"] for r in csv.DictReader(open(path))}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=_ROOT)
    ap.add_argument("--dry-run", action="store_true")
    # Scope the rewrite. Without it every shipped test is rewritten, and a tree where some cases were
    # never aliased back would have 155 published sources silently edited by a run meant for one new
    # case -- so a fresh run's tests are renamed with --case, not by sweeping the whole tree.
    ap.add_argument("--case", action="append", default=None,
                    help="restrict to this case id (repeatable); default: every case")
    # --under (2026-09-23): --case alone still sweeps EVERY arm's copy of that case. Booking an RQ4 cell of
    # rc_access_control__phishable__SmartFix rewrote 19 published RQ1 tests of the same case (`as C` ->
    # `as Phishable`), which the reachability ledger had probed in their shipped form (C14).
    ap.add_argument("--under", action="append", default=None,
                    help="restrict to accepted tests under this directory (repeatable)")
    args = ap.parse_args()
    only = set(args.case) if args.case else None
    unders = [os.path.join(os.path.abspath(u), "") for u in (args.under or [])]
    names = _names(args.root)
    changed = 0
    skipped = 0
    for f in glob.glob(os.path.join(args.root, "Results", "**", "tests", "*.accepted.json"),
                       recursive=True):
        cid = f.split("/cases/")[1].split("/")[0]
        if only is not None and cid not in only:
            continue
        if unders and not any(os.path.abspath(f).startswith(u) for u in unders):
            continue
        name = names.get(cid)
        if not name:
            skipped += 1
            continue
        try:
            d = json.load(open(f))
        except Exception:
            skipped += 1
            continue
        rt = d.get("rendered_test")
        if not rt:
            continue
        nrt = reverse_rename(rt, name)
        if nrt != rt:
            if not args.dry_run:
                d["rendered_test"] = nrt
                with open(f, "w") as fh:
                    json.dump(d, fh, indent=1)
            changed += 1
    print(f"renamed={changed} skipped={skipped} dry_run={args.dry_run}")


if __name__ == "__main__":
    main()
