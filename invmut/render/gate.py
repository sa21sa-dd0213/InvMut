"""Doc 4 §0.4 pre-render safety gate: import-path safety + forge-std presence."""

from __future__ import annotations

import os
from typing import Optional


def check_import_path(import_path: str) -> Optional[str]:
    if os.path.isabs(import_path):
        return "unsafe_import_path"
    if ".." in import_path.split("/"):
        return "unsafe_import_path"
    return None


def check_forge_std(forge_std_path: str) -> Optional[str]:
    if not forge_std_path or not os.path.exists(os.path.join(forge_std_path, "src", "Test.sol")):
        return "forge_std_missing"
    return None
