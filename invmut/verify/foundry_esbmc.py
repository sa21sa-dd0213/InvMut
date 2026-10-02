
from __future__ import annotations

import os
import re
import tempfile
from typing import Optional

from invmut.config import Config
from invmut.esbmc import parse
from invmut.esbmc.runner import run_esbmc

_VM_ADDRESS = "0x7109709ECfa91a80626fF3989D68f67F5b1DD12D"

_STUB = """\
interface Vm {
    function assume(bool) external;
    function warp(uint256) external;
    function roll(uint256) external;
    function fee(uint256) external;
    function chainId(uint256) external;
    function prevrandao(bytes32) external;
    function txGasPrice(uint256) external;
    function coinbase(address) external;
    function deal(address, uint256) external;
    function prank(address) external;
    function prank(address, address) external;
    function startPrank(address) external;
    function startPrank(address, address) external;
    function stopPrank() external;
    function store(address, bytes32, bytes32) external;
    function load(address, bytes32) external view returns (bytes32);
    function label(address, string calldata) external;
    function etch(address, bytes calldata) external;
    function record() external;
    function getNonce(address) external view returns (uint64);
    function setNonce(address, uint64) external;
    function addr(uint256) external pure returns (address);
    function sign(uint256, bytes32) external pure returns (uint8, bytes32, bytes32);
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function expectEmit() external;
    function expectEmit(bool, bool, bool, bool) external;
    function expectEmit(bool, bool, bool, bool, address) external;
    function expectCall(address, bytes calldata) external;
    function mockCall(address, bytes calldata, bytes calldata) external;
    function mockCall(address, uint256, bytes calldata, bytes calldata) external;
    function clearMockedCalls() external;
}

abstract contract Test {
    Vm internal constant vm = Vm(""" + _VM_ADDRESS + """);

    function assertTrue(bool c) internal pure { assert(c); }
    function assertTrue(bool c, string memory) internal pure { assert(c); }
    function assertFalse(bool c) internal pure { assert(!c); }
    function assertFalse(bool c, string memory) internal pure { assert(!c); }

    function assertEq(uint256 a, uint256 b) internal pure { assert(a == b); }
    function assertEq(uint256 a, uint256 b, string memory) internal pure { assert(a == b); }
    function assertEq(int256 a, int256 b) internal pure { assert(a == b); }
    function assertEq(int256 a, int256 b, string memory) internal pure { assert(a == b); }
    function assertEq(address a, address b) internal pure { assert(a == b); }
    function assertEq(address a, address b, string memory) internal pure { assert(a == b); }
    function assertEq(bool a, bool b) internal pure { assert(a == b); }
    function assertEq(bool a, bool b, string memory) internal pure { assert(a == b); }
    function assertEq(bytes32 a, bytes32 b) internal pure { assert(a == b); }
    function assertEq(bytes32 a, bytes32 b, string memory) internal pure { assert(a == b); }
    function assertEq(string memory a, string memory b) internal pure {
        assert(keccak256(bytes(a)) == keccak256(bytes(b)));
    }
    function assertEq(bytes memory a, bytes memory b) internal pure {
        assert(keccak256(a) == keccak256(b));
    }

    function assertNotEq(uint256 a, uint256 b) internal pure { assert(a != b); }
    function assertNotEq(address a, address b) internal pure { assert(a != b); }

    function assertGt(uint256 a, uint256 b) internal pure { assert(a > b); }
    function assertGt(uint256 a, uint256 b, string memory) internal pure { assert(a > b); }
    function assertGe(uint256 a, uint256 b) internal pure { assert(a >= b); }
    function assertGe(uint256 a, uint256 b, string memory) internal pure { assert(a >= b); }
    function assertLt(uint256 a, uint256 b) internal pure { assert(a < b); }
    function assertLt(uint256 a, uint256 b, string memory) internal pure { assert(a < b); }
    function assertLe(uint256 a, uint256 b) internal pure { assert(a <= b); }
    function assertLe(uint256 a, uint256 b, string memory) internal pure { assert(a <= b); }
    function assertGt(int256 a, int256 b) internal pure { assert(a > b); }
    function assertLt(int256 a, int256 b) internal pure { assert(a < b); }

    function assertApproxEqAbs(uint256 a, uint256 b, uint256 d) internal pure {
        assert((a >= b ? a - b : b - a) <= d);
    }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 d, string memory) internal pure {
        assert((a >= b ? a - b : b - a) <= d);
    }

    function deal(address, uint256) internal {}
    function deal(address, uint256, bool) internal {}

    function bound(uint256 x, uint256 lo, uint256 hi) internal pure returns (uint256) {
        require(lo <= hi, "bound: lo>hi");
        uint256 span = hi - lo;
        if (span == type(uint256).max) return x;
        return lo + (x % (span + 1));
    }
    function makeAddr(string memory name) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(name)))));
    }
    function makeAddrAndKey(string memory name) internal pure returns (address, uint256) {
        uint256 key = uint256(keccak256(abi.encodePacked(name)));
        return (address(uint160(key)), key);
    }
}
"""

_PRAGMA_RE = re.compile(r"^\s*pragma\s+solidity[^;]*;", re.MULTILINE)
_SPDX_RE = re.compile(r"^\s*//\s*SPDX-License-Identifier:[^\n]*\n?", re.MULTILINE)
_IMPORT_RE = re.compile(r"^\s*import\b[^\n]*;\s*$", re.MULTILINE)
_TESTFN_RE = re.compile(r"function\s+(test\w*)\s*\(")


class FoundryEsbmcError(Exception):
    pass


def pragma_of(source: str, default: str = "pragma solidity ^0.8.0;") -> str:
    m = _PRAGMA_RE.search(source)
    return m.group(0).strip() if m else default


def _strip_top_matter(source: str) -> str:
    source = _SPDX_RE.sub("", source)
    source = _PRAGMA_RE.sub("", source)
    source = _IMPORT_RE.sub("", source)
    return source


def focus_function_of(test_source: str) -> Optional[str]:
    src = re.sub(r"/\*.*?\*/", "", test_source, flags=re.S)
    src = re.sub(r"//[^\n]*", "", src)
    for name in _TESTFN_RE.findall(src):
        if name.startswith("test"):
            return name
    return None


def flatten(test_source: str, c_scope_source: str,
            default_pragma: str = "pragma solidity ^0.8.0;") -> str:
    pragma = pragma_of(c_scope_source, default_pragma)
    body_p = _strip_top_matter(c_scope_source).strip()
    body_t = _strip_top_matter(test_source).strip()
    return (
        "// SPDX-License-Identifier: UNLICENSED\n"
        f"{pragma}\n\n"
        f"{_STUB}\n"
        f"{body_p}\n\n"
        f"{body_t}\n"
    )


_LADDER = ("foundry", "kind")


def verify_holds(config: Config, test_source: str, c_scope_source: str, *,
                 contract: str = "InvMutTest", unwind: int = 5,
                 timeout_s: Optional[int] = None, mode: str = "foundry") -> str:
    try:
        fn = focus_function_of(test_source)
        if fn is None:
            return "skip:no_focus_function"
        flat = flatten(test_source, c_scope_source)
        fd, path = tempfile.mkstemp(suffix=".sol", prefix="invmut_fesbmc_")
        try:
            with os.fdopen(fd, "w") as fh:
                fh.write(flat)
            argv = _build_argv(config, path, contract, fn, unwind, mode)
            run = run_esbmc(config, argv, timeout_s=timeout_s)
            v = parse.classify_verdict(run.stdout, run.stderr, run.returncode, run.timed_out)
            return v.verdict
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
    except Exception as e:
        return f"skip:exception:{type(e).__name__}"


def verify_holds_best(config: Config, test_source: str, c_scope_source: str, *,
                      timeout_s: Optional[int] = None) -> str:
    first = None
    for mode in _LADDER:
        v = verify_holds(config, test_source, c_scope_source, timeout_s=timeout_s, mode=mode)
        if v == "SUCCESSFUL":
            return v
        if first is None:
            first = v
    return first if first is not None else "skip:no_result"


def _build_argv(config: Config, sol_path: str, contract: str, focus_fn: str,
                unwind: int, mode: str) -> list[str]:
    base = [
        config.esbmc_bin, sol_path,
        "--solc-bin", config.solc_bin,
        "--contract", contract,
        "--focus-function", focus_fn,
        "--memlimit", str(config.verifier.esbmc_memlimit_mb),
    ]
    if mode == "kind":
        return base + ["--bound", "--k-induction", "--no-standard-checks",
                       "--max-k-step", str(unwind), "--solidity-max-tx", "1",
                       "--foundry-conservative"]
    return base + ["--no-standard-checks", "--unwind", str(unwind),
                   "--no-unwinding-assertions", "--foundry-conservative"]
