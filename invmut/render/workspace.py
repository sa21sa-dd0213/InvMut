
from __future__ import annotations

import os
import shutil

_FOUNDRY_TOML = """[profile.default]
src = "src"
test = "test"
libs = ["lib"]
solc_version = "{solc_version}"
fuzz.runs = {fuzz_runs}
fuzz.seed = "{fuzz_seed}"
optimizer = {optimizer}
via_ir = {via_ir}
"""


def build_workspace(ws_dir: str, flat_source: str, import_basename: str, rendered_test: str,
                    forge_std_path: str, solc_version: str = "0.8.35",
                    fuzz_runs: int = 10000, fuzz_seed: str = "0x1", via_ir: bool = False,
                    optimizer: bool | None = None) -> None:
    src_dir = os.path.join(ws_dir, "src")
    test_dir = os.path.join(ws_dir, "test")
    lib_dir = os.path.join(ws_dir, "lib")
    for d in (src_dir, test_dir, lib_dir):
        os.makedirs(d, exist_ok=True)
    with open(os.path.join(ws_dir, "foundry.toml"), "w") as f:
        f.write(_FOUNDRY_TOML.format(solc_version=solc_version, fuzz_runs=fuzz_runs, fuzz_seed=fuzz_seed,
                                     optimizer=str(via_ir if optimizer is None else optimizer).lower(),
                                     via_ir=str(via_ir).lower()))
    with open(os.path.join(src_dir, import_basename), "w") as f:
        f.write(flat_source)
    with open(os.path.join(test_dir, "InvMutTest.t.sol"), "w") as f:
        f.write(rendered_test)
    dst = os.path.join(lib_dir, "forge-std")
    if not os.path.exists(dst):
        try:
            os.symlink(forge_std_path, dst)
        except OSError:
            shutil.copytree(forge_std_path, dst)
