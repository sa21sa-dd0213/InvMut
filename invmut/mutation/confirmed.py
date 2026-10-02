"""Doc 2 §8 — the confirmed-difference JSON handed to the loop and the test agent.

Assembled from the candidate, the Doc 1 target, and the visible-difference StageResult (R1 or
R2). Witness-dependent fields (`observed_key`, constructor args, exact `call_sequence`
args/value/keys, `k`) are best-effort: populated when the R2 CE-harvest instrumentation is
enabled and cleanly extractable, otherwise null (DEVIATIONS V21)."""

from __future__ import annotations

import os
import re
from typing import Optional

from invmut.mutation.model import Candidate, StageResult
from invmut.mutation.trace import Counterexample


def _ordered_values(prefix: str, values: dict[str, str]) -> list[str]:
    out: list[tuple[int, str]] = []
    for key, value in values.items():
        if not key.startswith(prefix):
            continue
        tail = key[len(prefix):]
        if tail.isdigit():
            out.append((int(tail), value))
    return [v for _, v in sorted(out)]


def _entry_from_sync_wrapper(name: str | None) -> str | None:
    m = re.fullmatch(r"s\d+_(\w+)", name or "")
    return m.group(1) if m else None


def _scrub_command(argv: list[str] | None) -> str:
    """Render a verifier command without host-local temp/source paths."""
    out = []
    for token in argv or []:
        text = str(token)
        if os.path.isabs(text):
            if text.endswith(".sol"):
                out.append("<verifier-input.sol>")
            else:
                out.append(os.path.basename(text) or "<local-path>")
        else:
            out.append(text)
    return " ".join(out)


def build_confirmed_difference(
    *,
    confirmed_difference_id: str,
    candidate: Candidate,
    target_json: dict,
    stage_result: StageResult,
    rendered_difference: str,
    counterexample: Optional[Counterexample] = None,
    edited_statement_id: Optional[str] = None,
    observed_key: Optional[str] = None,
    k: Optional[int] = None,
    during_call: bool = False,
    observer_getter: Optional[str] = None,
    observer_value_p: Optional[str] = None,
) -> dict:
    d = stage_result.detail
    source_stage = d.get("source_stage", "R2")
    call_sequence = []
    constructor_args = []
    observed_pair = {"original": None, "modified": None}
    observed_values = {}
    witness_detail = {
        "present": False,
        "reason": None,
        "violated_function": None,
        "violated_line": None,
        "assertion_id": None,
        "claim": None,
        "funccall_wrappers": [],
        "during_call": bool(during_call),
        "during_call_observation": {
            "original": observer_value_p,
            "modified": None,
            "getter": observer_getter,
        },
    }
    if counterexample is not None:
        constructor_args = _ordered_values("__invmut_ctor_arg", counterexample.witness_values)
        args = _ordered_values("__invmut_arg", counterexample.witness_values)
        keys = _ordered_values("__invmut_key", counterexample.witness_values)
        value = counterexample.witness_values.get("__invmut_value")
        boundary_name = _entry_from_sync_wrapper(counterexample.violated_function)
        seq = counterexample.call_sequence
        for i, name in enumerate(seq):
            # The witness locals are emitted only in the wrapper whose assertion failed.  Prefix
            # calls in the funccall trace are real path context, but their calldata is not recorded
            # by this instrumentation and must not inherit the boundary witness by accident.
            has_boundary_witness = bool(args or keys or value is not None) and (
                name == boundary_name or (boundary_name is None and i == len(seq) - 1)
            )
            call_sequence.append({
                "function": name,
                "args": args if has_boundary_witness and args else None,
                "value": value if has_boundary_witness else None,
                "caller": "Harness",
                "getter_keys": keys if has_boundary_witness and keys else None,
            })
        v_p, v_m = counterexample.observed_pair
        observed_pair = {"original": v_p, "modified": v_m}
        # DIAGNOSTIC ONLY, off unless INVMUT_CE_DUMP names a directory: when the pair comes back
        # incomplete the refusal alone cannot say whether the harness bound the fields at all, so
        # keep the verifier's own output for that difference. Decides nothing.
        _dump = os.environ.get("INVMUT_CE_DUMP")
        if _dump and (v_p is None or v_m is None):
            try:
                os.makedirs(_dump, exist_ok=True)
                _name = f"{source_stage}_{abs(hash(str(d.get('stdout'))[:4000])):x}.txt"
                with open(os.path.join(_dump, _name), "w") as _fh:
                    _fh.write(str(d.get("stdout") or "") + "\n===STDERR===\n" + str(d.get("stderr") or ""))
            except Exception:  # noqa: BLE001 -- a diagnostic must never abort a run
                pass
        observed_values = dict(counterexample.observed_values)
        witness_detail = {
            "present": bool(counterexample.present),
            "reason": counterexample.reason or None,
            "violated_function": counterexample.violated_function,
            "violated_line": counterexample.violated_line,
            "assertion_id": counterexample.assertion_id,
            "claim": counterexample.claim,
            "funccall_wrappers": list(counterexample.funccall_wrappers),
            # DIAGNOSTIC ONLY (decides nothing): the counterexample's own lines that mention an
            # observed-value name. Without them an empty observed_pair cannot be told apart from a
            # harness that never bound the fields.
            "observed_scan": list(getattr(counterexample, "observed_scan", None) or []),
            # The failing property is a safety check compiled into one COPY (solc 0.8 arithmetic,
            # bounds, ...), not the harness's differential assert. `side` says which copy reached it.
            "safety_violation": ({
                "function": counterexample.violated_function,
                "line": counterexample.violated_line,
                "claim": counterexample.claim,
                "side": counterexample.safety_violation_side,
            } if counterexample.safety_violation_side else None),
            "witness_values": dict(counterexample.witness_values),
            "constructor_args": constructor_args,
            "during_call": bool(during_call or counterexample.during_call),
            "during_call_observation": {
                "original": counterexample.snap_p if counterexample.snap_p is not None else observer_value_p,
                "modified": counterexample.snap_m,
                "getter": observer_getter,
            },
        }

    return {
        "confirmed_difference_id": confirmed_difference_id,
        "target_id": candidate.target_id or target_json.get("id"),
        "source_stage": source_stage,
        "difference_kind": d.get("difference_kind"),
        "safety_check": d.get("safety_check"),  # R1 only; null for R2
        # R1 only: which check the mutant introduced and WHERE. Without this the function name lives
        # only inside the prose `rendered_difference`, and the replay branch has nothing to call.
        "primary_violation": d.get("primary_violation"),
        "edited_unit_id": candidate.unit_id,
        "edited_statement_id": edited_statement_id,
        "operation": candidate.operation,
        "change_summary": candidate.change_summary,
        "observed_key": observed_key,
        # V43: the difference is observable only DURING the boundary's external call (CEI/reentrancy);
        # the test needs the receive() observer shape. observer_getter is the VIEW getter to snapshot in
        # receive; observer_value_p is P's during-call reading as a HINT (NOT pinned — witness-specific).
        "during_call": during_call,
        "observer_getter": observer_getter,
        "observer_value_p": observer_value_p,
        "constructor_args": constructor_args,
        "call_sequence": call_sequence,
        "observed": {
            "original": observed_pair["original"] or "see rendered_difference",
            "modified": observed_pair["modified"] or "see rendered_difference",
        },
        "observed_pair": observed_pair,
        "observed_values": observed_values,
        "safety_violation": witness_detail.get("safety_violation"),
        "witness_detail": witness_detail,
        "oracle_asset": {
            "schema": "invmut-ce-oracle-asset/v1",
            "ce_id": confirmed_difference_id,
            "source_stage": source_stage,
            "difference_kind": d.get("difference_kind"),
            "target_id": candidate.target_id or target_json.get("id"),
            "edited_unit_id": candidate.unit_id,
            "edited_statement_id": edited_statement_id,
            "boundary_writer": d.get("boundary_writer"),
            "focus_function": d.get("focus_function"),
            "revert_writer": d.get("revert_writer"),
            "during_call": bool(during_call or (counterexample.during_call if counterexample else False)),
            "observer_getter": observer_getter,
            "constructor_args": constructor_args,
            "call_sequence": call_sequence,
            "observed_pair": observed_pair,
            "observed_values": observed_values,
            "assertion_id": counterexample.assertion_id if counterexample is not None else None,
            "violated_line": counterexample.violated_line if counterexample is not None else None,
            "witness_values": dict(counterexample.witness_values) if counterexample is not None else {},
            "witness_present": bool(counterexample.present) if counterexample is not None else False,
        },
        "rendered_difference": rendered_difference,
        "verifier": {
            "command": _scrub_command(d.get("r2_command") or d.get("r1_command")),
            "k": k,
            "result": "VERIFICATION FAILED" if d.get("verdict") == "FAILED" else d.get("verdict"),
        },
    }
