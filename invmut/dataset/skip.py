"""Cost-control skip list for the RQ3 sweep.

The cases in `rq3_skip.txt` have >150 SuMo target mutants (Alchemist cost policy C); we do NOT generate
LLM tests for them. The list lives UNDER invmut/ (not Results/, which provision.sh does not rsync) so
every worker gets it. Enforced at three points — rq3_run / run_distributed drop them from the case list
(so the denominator is the real run set), and rq3_case hard-guards (so even an explicit `--cases <skipped>`
can never burn LLM money). A hard-guarded case is written with reason==SKIP_REASON and MUST be excluded
from feasible/denominator counts wherever results are aggregated."""

from __future__ import annotations

import os

_DEFAULT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "skip_list.txt")
SKIP_REASON = "skipped_cost_policy"


def load_skip_ids(path: str | None = None) -> set[str]:
    """Read the skip file → set of case ids. Missing file ⇒ empty set (skip is opt-in by file presence)."""
    ids: set[str] = set()
    try:
        with open(path or _DEFAULT, encoding="utf-8") as f:
            for line in f:
                line = line.split("#", 1)[0].strip()
                if line:
                    ids.add(line)
    except OSError:
        pass
    return ids
