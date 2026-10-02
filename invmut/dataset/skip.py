
from __future__ import annotations

import os

_DEFAULT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "skip_list.txt")
SKIP_REASON = "skipped_cost_policy"


def load_skip_ids(path: str | None = None) -> set[str]:
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
