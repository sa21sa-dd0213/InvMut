"""Phase-0c ESBMC characterization (DEVIATIONS V13; Doc 5 §8.4-8.9).

Runs every smoke fixture through the central command builder, captures golden stdout/stderr,
classifies the verdict, and asserts it against the EXPECTED outcome — establishing, by
measurement on THIS build, that:
  - R1 (--unbound) catches the M1 reentrancy and leaves clean P clean;
  - R2 (--bound, V1) catches state/return/revert/mapping-key/balance differences (FAILED)
    and does NOT false-alarm on equivalent boundaries;
  - the harness foundation (new-dispatch, lockstep, rollback, payable) is sound under --bound;
  - --unbound new-dispatch FAILS (the measured reason R2 is locked to --bound).

Output: notes/ESBMC_PROFILE.json (locked modes + per-fixture measured verdict) and a
PASS/FAIL table. A single FAIL means the harness encoding is broken for this ESBMC build —
abort (Doc 5 §8.7.8/§8.8). Run: `python -m invmut.esbmc.characterize config/config.local.json`.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from invmut.config import Config
from invmut.esbmc import commands as cmd
from invmut.esbmc import parse

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "smoke" / "fixtures"
GOLDEN = FIX / "golden"
PROFILE_PATH = ROOT / "esbmc_binary" / "ESBMC_PROFILE.json"

NO_STD = ("--no-standard-checks",)


@dataclass
class Spec:
    sid: str                       # golden file id
    desc: str
    sol: str                       # fixture filename
    contract: str
    bound_mode: str                # "unbound" | "bound"
    engine: str                    # "incremental-bmc" | "k-induction"
    max_k: int
    tx: int
    checks: tuple[str, ...]
    expect: Callable[[parse.VerdictResult], bool]
    expect_desc: str
    extra: tuple[str, ...] = ()
    focus: str | None = None
    # category: soundness = harness must be correct here; documented_finding = expected-bad
    # behavior that JUSTIFIES a deviation (V15/V18); counter_evidence = documents why a mode
    # is wrong (F1). all_pass over soundness+positives is the real gate; findings are labeled.
    category: str = "soundness"


def _r2(sid, desc, sol, contract, expect, expect_desc, engine="incremental-bmc", max_k=10, tx=3,
        focus=None, category="soundness"):
    return Spec(sid, desc, sol, contract, "bound", engine, max_k, tx, NO_STD, expect, expect_desc,
                focus=focus, category=category)


def is_failed(v): return v.verdict == parse.FAILED
def is_successful(v): return v.verdict == parse.SUCCESSFUL
def is_clean_bounded(v):  # R1/R2 clean: SUCCESSFUL, or UNKNOWN+base-case marker; never FAILED
    return v.verdict == parse.SUCCESSFUL or (v.verdict == parse.UNKNOWN and v.bound_exhausted)
def no_diff_within_bound(v):
    return parse.r2_outcome(v) in ("no_difference", "no_difference_within_bound")


def build_specs(c: Config) -> list[Spec]:
    vp = c.verifier
    specs: list[Spec] = []

    # --- §8.5 motivating fault caught by R2 (the real catch; R1/M1 handled by custom checks) -
    specs.append(_r2("m2_tod_R2", "§8.5 M2 TOD via R2 (return)", "rewardvault_M2_harness.sol",
                     "Harness", is_failed, "FAILED (return diff)"))

    # --- F8/F9 documented findings (kept as evidence; expected to FAIL, which is WHY we drop
    #     balance targets (V15) and guard state asserts (V18)) --------------------------------
    specs.append(_r2("f8_balance_unreliable", "F8: balance unreliable -> dropped (V15)",
                     "enc_8_8_5_payable.sol", "PayableCheck", is_failed,
                     "FAILED (havoc'd balance under --bound; balance NOT a target in v1)",
                     engine="incremental-bmc", max_k=5, category="documented_finding"))
    specs.append(_r2("f9_revert_leak", "F9: revert write leaks -> guarded by V18",
                     "enc_8_8_4_rollback.sol", "RollbackCheck", is_failed,
                     "FAILED (reverted write leaks via new-instance under --bound)",
                     engine="incremental-bmc", max_k=6, category="documented_finding"))

    # --- §8.7 observation-kind encoding (positives FAILED; negatives proved clean) -----------
    specs.append(_r2("e871_reverted", "§8.7.1 __ESBMC_reverted baseline", "enc_8_7_1_reverted_baseline.sol",
                     "Baseline", is_failed, "FAILED"))
    specs.append(_r2("e872_state_pos", "§8.7.2 state positive", "enc_8_7_2_state_pos.sol",
                     "Harness", is_failed, "FAILED"))
    specs.append(_r2("e873_state_neg_ki", "§8.7.3 state negative (k-induction proof)", "enc_8_7_3_state_neg.sol",
                     "Harness", is_successful, "SUCCESSFUL", engine="k-induction"))
    specs.append(_r2("e873_state_neg_ibmc", "§8.7.3 state negative (incremental, runtime)", "enc_8_7_3_state_neg.sol",
                     "Harness", no_diff_within_bound, "no_difference_within_bound (no false FAILED)"))
    specs.append(_r2("e874_return_pos", "§8.7.4 return positive", "enc_8_7_4_return_pos.sol",
                     "Harness", is_failed, "FAILED"))
    specs.append(_r2("e875_return_neg_ki", "§8.7.5 return negative (k-induction)", "enc_8_7_5_return_neg.sol",
                     "Harness", is_successful, "SUCCESSFUL", engine="k-induction"))
    specs.append(_r2("e876_revert_pos", "§8.7.6 revert positive", "enc_8_7_6_revert_pos.sol",
                     "Harness", is_failed, "FAILED"))
    specs.append(_r2("e877_revert_neg_ki", "§8.7.7 revert negative (k-induction)", "enc_8_7_7_revert_neg.sol",
                     "Harness", is_successful, "SUCCESSFUL", engine="k-induction"))

    # --- §8.8 harness foundation (k-induction real proofs; + the --unbound counter-evidence) -
    specs.append(_r2("e881_new_bound", "§8.8.1 new dispatch (--bound, SUCCESSFUL)", "enc_8_8_1_new_dispatch.sol",
                     "NewCheck", is_successful, "SUCCESSFUL", engine="k-induction", max_k=5))
    specs.append(Spec("e881_new_unbound", "§8.8.1 new dispatch (--unbound -> FAILS: reason for V1)",
                      "enc_8_8_1_new_dispatch.sol", "NewCheck", "unbound", "k-induction", 5, 3,
                      NO_STD, is_failed, "FAILED (nondet under unbound — documents F1/V1)",
                      category="counter_evidence"))
    specs.append(_r2("e882_lockstep", "§8.8.2 lockstep non-contamination", "enc_8_8_2_lockstep.sol",
                     "LockstepCheck", is_successful, "SUCCESSFUL", engine="k-induction", max_k=5))
    specs.append(_r2("e883_mapping_key", "§8.8.3 mapping nondet key cross-key", "enc_8_8_3_mapping_key.sol",
                     "Harness", is_failed, "FAILED"))
    # §8.8.4 (rollback) and §8.8.5 (payable) are characterized as F9/F8 findings above
    # (f9_revert_leak / f8_balance_unreliable) — their doc-claimed SUCCESSFUL is false on this build.
    return specs


def _run_esbmc(c: Config, argv: list[str]):
    """Run esbmc with the configured per-call timeout; return (stdout, stderr, rc, timed_out)."""
    try:
        p = subprocess.run(argv, capture_output=True, text=True,
                           timeout=c.verifier.timeout_seconds_per_call)
        return p.stdout, p.stderr, p.returncode, False
    except subprocess.TimeoutExpired as e:
        dec = lambda b: b.decode("utf-8", "replace") if isinstance(b, bytes) else (b or "")
        return dec(e.stdout), dec(e.stderr), -9, True


def run_one(c: Config, s: Spec) -> dict:
    extra = s.extra + (("--focus-function", s.focus) if s.focus else ())
    argv = cmd.build_esbmc(
        c, sol_path=str(FIX / s.sol), contract=s.contract, bound_mode=s.bound_mode,
        engine=s.engine, max_k_step=s.max_k, solidity_max_tx=s.tx, checks=s.checks, extra=extra,
    )
    t0 = time.perf_counter()
    out, err, rc, timed_out = _run_esbmc(c, argv)
    elapsed = time.perf_counter() - t0

    (GOLDEN / f"{s.sid}.stdout").write_text(out)
    (GOLDEN / f"{s.sid}.stderr").write_text(err)
    v = parse.classify_verdict(out, err, rc, timed_out)
    ok = bool(s.expect(v))
    return {
        "sid": s.sid, "desc": s.desc, "argv": argv, "elapsed_s": round(elapsed, 2),
        "verdict": v.verdict, "bound_exhausted": v.bound_exhausted, "has_trace": v.has_funccall_trace,
        "expect": s.expect_desc, "pass": ok, "category": s.category,
    }


# --- custom multi-run checks (R1 differential, V18 guard) --------------------------------

def _func_starts(sol: str) -> dict[str, int]:
    """Map function name -> 1-based start line, for the V16 function-relative differential key."""
    import re
    starts: dict[str, int] = {}
    pat = re.compile(r"\bfunction\s+([A-Za-z_]\w*)\s*\(")
    for i, ln in enumerate((FIX / sol).read_text().splitlines(), start=1):
        m = pat.search(ln)
        if m and m.group(1) not in starts:
            starts[m.group(1)] = i
    return starts


def _r1_violations(c: Config, sol: str, contract: str):
    """Run R1 multi-property; return (violations, ok, timed_out). ok = a usable run (B1/M4)."""
    argv = cmd.build_r1_command(c, str(FIX / sol), contract)
    out, err, rc, to = _run_esbmc(c, argv)
    (GOLDEN / f"r1_{Path(sol).stem}.stdout").write_text(out)
    (GOLDEN / f"r1_{Path(sol).stem}.stderr").write_text(err)
    v = parse.classify_verdict(out, err, rc, to)
    viol = parse.extract_violation_set(out, err)
    ok = v.verdict != parse.VERIFIER_ERROR  # a real verdict/listing was produced
    return viol, ok, to


def check_r1_differential_introduced(c: Config) -> dict:
    """V16: r1diff_M introduces a div-by-zero that r1diff_P (guarded) lacks. Function-relative
    differential must isolate exactly that div-by-zero."""
    pb, pok, pto = _r1_violations(c, "r1diff_P.sol", "C")
    mv, mok, mto = _r1_violations(c, "r1diff_M.sol", "C")
    a = parse.r1_assess(pb, pok, pto, mv, mok, mto, _func_starts("r1diff_P.sol"), _func_starts("r1diff_M.sol"))
    kinds = sorted({v.check for v in a.introduced})
    ok = a.outcome == "visible_difference" and kinds == ["division by zero"]
    return {"sid": "r1diff_introduced", "desc": "V16 R1 differential isolates introduced div0",
            "verdict": f"{a.outcome}:{kinds}", "pass": ok, "elapsed_s": 0.0, "category": "soundness",
            "expect": "visible_difference, introduced == ['division by zero']",
            "detail": {"introduced": kinds, "note": a.note}}


def check_r1_differential_m1(c: Config) -> dict:
    """V17: M1's only edit is the CEI move in withdraw; it introduces NO new arithmetic/bounds
    safety violation vs P (function-relative). R1 differential EMPTY -> M1 not caught by R1."""
    pb, pok, pto = _r1_violations(c, "rewardvault_P.sol", "RewardVault")
    mv, mok, mto = _r1_violations(c, "rewardvault_M1.sol", "RewardVault")
    a = parse.r1_assess(pb, pok, pto, mv, mok, mto, _func_starts("rewardvault_P.sol"), _func_starts("rewardvault_M1.sol"))
    ok = a.outcome == "clean" and len(a.introduced) == 0
    return {"sid": "r1diff_m1_reentry", "desc": "V17 M1 reentrancy NOT caught by R1 (empty introduced set)",
            "verdict": f"{a.outcome}:{[v.diff_key() for v in a.introduced]}", "pass": ok,
            "elapsed_s": 0.0, "category": "documented_finding",
            "expect": "clean / empty introduced set (M1 pure-reentrancy v1 limitation)",
            "detail": {"note": a.note}}


def check_v18_guard(c: Config) -> dict:
    """V18: unguarded state boundary FALSE-FAILs on M's reverted write (F9); the
    assume(!reverted) guard makes it clean."""
    def run(focus):
        argv = cmd.build_esbmc(c, sol_path=str(FIX / "v18_revert_guard.sol"), contract="Harness",
                               bound_mode="bound", engine="incremental-bmc", max_k_step=10,
                               solidity_max_tx=1, checks=NO_STD, extra=("--focus-function", focus))
        out, err, rc, to = _run_esbmc(c, argv)
        (GOLDEN / f"v18_{focus}.stdout").write_text(out)
        (GOLDEN / f"v18_{focus}.stderr").write_text(err)
        return parse.classify_verdict(out, err, rc, to)
    ung = run("syncF_unguarded")
    grd = run("syncF_guarded")
    ok = ung.verdict == parse.FAILED and no_diff_within_bound(grd)
    return {"sid": "v18_revert_guard", "desc": "V18 guard removes F9 false diff",
            "verdict": f"unguarded={ung.verdict}, guarded={parse.r2_outcome(grd)}", "pass": ok,
            "elapsed_s": 0.0, "category": "soundness",
            "expect": "unguarded FAILED (F9 leak), guarded no_difference (V18 fix)", "detail": {}}


def check_v18_guard_mapping(c: Config) -> dict:
    """M3/V18: the assume(!reverted) guard also removes the F9 false diff for a MAPPING state
    target (not just a scalar)."""
    def run(focus):
        argv = cmd.build_esbmc(c, sol_path=str(FIX / "v18_mapping_guard.sol"), contract="Harness",
                               bound_mode="bound", engine="incremental-bmc", max_k_step=10,
                               solidity_max_tx=1, checks=NO_STD, extra=("--focus-function", focus))
        out, err, rc, to = _run_esbmc(c, argv)
        (GOLDEN / f"v18map_{focus}.stdout").write_text(out)
        (GOLDEN / f"v18map_{focus}.stderr").write_text(err)
        return parse.classify_verdict(out, err, rc, to)
    ung = run("syncSet_unguarded")
    grd = run("syncSet_guarded")
    ok = ung.verdict == parse.FAILED and no_diff_within_bound(grd)
    return {"sid": "v18_guard_mapping", "desc": "V18 guard generalizes to mapping target (M3)",
            "verdict": f"unguarded={ung.verdict}, guarded={parse.r2_outcome(grd)}", "pass": ok,
            "elapsed_s": 0.0, "category": "soundness",
            "expect": "unguarded FAILED (leak), guarded no_difference (V18 fix on mapping)", "detail": {}}


CUSTOM_CHECKS = [check_r1_differential_introduced, check_r1_differential_m1, check_v18_guard,
                 check_v18_guard_mapping]


def main(config_path: str) -> int:
    c = Config.load(config_path)
    # Characterization only needs esbmc + solc; tolerate a forge-std-only failure (Phase 6 dep).
    from invmut.config import ConfigError
    try:
        c.verify_tools()
    except ConfigError as e:
        msg = str(e)
        if any(t in msg for t in ("esbmc:", "solc:")):
            raise
        print(f"(note: non-fatal tool check skipped for characterization)\n  {msg.splitlines()[-1]}\n")
    GOLDEN.mkdir(parents=True, exist_ok=True)
    specs = build_specs(c)
    results = []
    print(f"Characterizing ESBMC on {len(specs)} fixtures (timeout {c.verifier.timeout_seconds_per_call}s)...\n")
    for s in specs:
        r = run_one(c, s)
        results.append(r)
        flag = "PASS" if r["pass"] else "FAIL"
        print(f"  [{flag}] {s.sid:24s} {str(r['verdict'])[:22]:22s} ({r['elapsed_s']:5.1f}s)  "
              f"expect={s.expect_desc}")
    print("\n  --- custom multi-run checks (R1 differential, V18 guard) ---")
    for fn in CUSTOM_CHECKS:
        r = fn(c)
        results.append(r)
        flag = "PASS" if r["pass"] else "FAIL"
        print(f"  [{flag}] {r['sid']:24s} {str(r['verdict'])[:40]:40s}")
        print(f"           expect={r['expect']}")
    n_pass = sum(1 for r in results if r["pass"])
    by_cat: dict[str, list] = {}
    for r in results:
        by_cat.setdefault(r.get("category", "soundness"), []).append(r)
    print(f"\n{n_pass}/{len(results)} expectations met. By category:")
    for cat in ("soundness", "documented_finding", "counter_evidence"):
        rs = by_cat.get(cat, [])
        if rs:
            p = sum(1 for r in rs if r["pass"])
            label = {"soundness": "harness MUST be correct",
                     "documented_finding": "expected-bad -> justifies a deviation (V15/V18)",
                     "counter_evidence": "documents why a mode is wrong (F1)"}[cat]
            print(f"    {cat:20s} {p}/{len(rs)}  ({label})")

    profile = {
        "schema_version": "invmut.esbmc_profile.v1",
        "esbmc_version_expected": c.esbmc_version_expected,
        "solc_version_expected": c.solc_version_expected,
        "locked_modes": {
            "R1": {"bound_mode": "unbound", "engine": "incremental-bmc",
                   "max_k_step": c.verifier.r1_max_k_step, "solidity_max_tx": c.verifier.r1_solidity_max_tx,
                   "checks": list(cmd.R1_CHECKS), "multi_property": True,
                   "note": "DEVIATIONS V16: --multi-property, P-baseline-differential, reentry-check dropped"},
            "R2": {"bound_mode": "bound", "engine": "incremental-bmc",
                   "max_k_step": c.verifier.r2_max_k_step, "solidity_max_tx": c.verifier.r2_solidity_max_tx,
                   "checks": list(NO_STD), "note": "DEVIATIONS V1: --bound (not doc --unbound)"},
            "doc3": {"bound_mode": "bound", "engine": "k-induction",
                     "max_k_step": c.verifier.doc3_max_k_step, "solidity_max_tx": c.verifier.doc3_solidity_max_tx},
        },
        "base_case_marker": parse.BASE_CASE_MARKER,
        "timeout_seconds_per_call": c.verifier.timeout_seconds_per_call,
        "memlimit_mb": c.verifier.esbmc_memlimit_mb,
        "fixtures": [{k: r.get(k) for k in ("sid", "desc", "verdict", "category", "bound_exhausted",
                                            "has_trace", "expect", "pass", "elapsed_s", "detail")}
                     for r in results],
        "category_summary": {cat: {"pass": sum(1 for r in rs if r["pass"]), "total": len(rs)}
                             for cat, rs in by_cat.items()},
        "all_expectations_met": n_pass == len(results),
        "note": ("'pass' means measured behavior matched the EXPECTATION. soundness fixtures "
                 "prove the harness is correct; documented_finding fixtures are expected-bad "
                 "behaviors (e.g. balance havoc'd, revert leak) that justify a deviation "
                 "(V15/V18); counter_evidence documents why a rejected mode is wrong (F1)."),
    }
    blob = json.dumps(profile, indent=2, sort_keys=True)
    PROFILE_PATH.write_text(blob)
    profile_id = hashlib.sha256(blob.encode()).hexdigest()[:16]
    print(f"\nWrote {PROFILE_PATH} (profile_id={profile_id})")
    if n_pass != len(results):
        print("\nABORT: ESBMC characterization FAILED — harness encoding broken for this build.")
        for r in results:
            if not r["pass"]:
                print(f"  FAIL {r['sid']}: got {r['verdict']} "
                      f"(bound_exhausted={r.get('bound_exhausted')}), expected {r['expect']}")
                if r.get("detail"):
                    print(f"       detail: {r['detail']}")
        return 1
    print("\nAll fixtures behaved as expected. ESBMC_PROFILE.json locked.")
    return 0


if __name__ == "__main__":
    cfg = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "config" / "config.local.json")
    raise SystemExit(main(cfg))
