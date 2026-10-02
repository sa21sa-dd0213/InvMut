"""Build a deterministic Foundry workspace for one rendered test against one flat source.

    <ws>/foundry.toml
    <ws>/src/<import_basename>      # the flat source defining contract C (P, M, or bug)
    <ws>/test/InvMutTest.t.sol      # the rendered test
    <ws>/lib/forge-std -> <forge_std_path>   (symlink; copy fallback)

The rendered test's `import {C} from "<import_path>"` must resolve to src/<import_basename>; the caller
chooses `import_path` accordingly (e.g. "../src/C.flat.sol")."""

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
                    forge_std_path: str, solc_version: str = "0.8.30",
                    fuzz_runs: int = 10000, fuzz_seed: str = "0x1", via_ir: bool = False,
                    optimizer: bool | None = None) -> None:
    # via_ir compiles complex contracts that overflow the legacy codegen stack ("Stack too deep").
    # optimizer defaults to via_ir, so omitting it reproduces the previous coupling byte for byte, but
    # the two are now separable: measured with solc 0.8.29, pop_077_MergingPool compiles under EITHER
    # flag alone and FAILS with both together, while pop_018_PrivatePool needs via_ir and pop_058_PuttyV2
    # needs the plain optimizer. A single coupled setting cannot satisfy all three.
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
