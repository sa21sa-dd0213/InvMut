from __future__ import annotations

import re

_HEADER = (
    "// SPDX-License-Identifier: UNLICENSED\n"
    "pragma solidity ^0.8.0;\n\n"
    'import {Test} from "forge-std/Test.sol";\n'
    'import {C} from "../src/C_under_test.sol";\n'
)


def _scope(src: str, target: str) -> str:
    i = src.find(f"contract {target}")
    return src[i:] if i >= 0 else src


def _ctor_arity(src: str, target: str) -> int:
    m = re.search(r"constructor\s*\(([^)]*)\)", src)
    if not m:
        m = re.search(rf"function\s+{target}\s*\(([^)]*)\)", src)
    if not m:
        return 0
    return len([p for p in m.group(1).split(",") if p.strip()])


def _ctor_args(src: str, target: str) -> str:
    return ", ".join(["address(this)"] * _ctor_arity(src, target))


def _funcs(src: str):
    out = []
    for m in re.finditer(r"function\s+(\w+)\s*\(([^)]*)\)([^{]*)\{", src):
        start = m.end()
        depth, i = 1, m.end()
        while i < len(src) and depth:
            if src[i] == "{":
                depth += 1
            elif src[i] == "}":
                depth -= 1
            i += 1
        out.append((m.group(1), m.group(2), m.group(3), src[start:i - 1]))
    return out


def _func_with(src: str, needle: str):
    for name, params, mods, body in _funcs(src):
        if needle in body:
            return name, params, mods, body
    return None


def _call_args(params: str, addr_name: str = "receiver") -> str:
    out = []
    for p in [x.strip() for x in params.split(",") if x.strip()]:
        ts = p.split()[0]
        if ts.startswith("address"):
            out.append(addr_name)
        elif ts.startswith(("uint", "int")):
            out.append("1")
        elif ts == "bool":
            out.append("true")
        else:
            out.append(f"{ts}(0)")
    return ", ".join(out)


def _zero_args(params: str) -> str:
    out = []
    for p in [x.strip() for x in params.split(",") if x.strip()]:
        ts = p.split()[0]
        if ts.startswith("address"):
            out.append("address(0xBEEF)")
        elif ts.startswith(("uint", "int")):
            out.append("1")
        elif ts == "bool":
            out.append("true")
        else:
            out.append(f"{ts}(0)")
    return ", ".join(out)


def gen_txorigin(fix_src: str, bug_src: str, target: str):
    bug = _scope(bug_src, target)
    fx = _scope(fix_src, target)
    hit = _func_with(bug, "tx.origin")
    if not hit:
        return None
    fname, params, _mods, _body = hit
    plist = [p.strip() for p in params.split(",") if p.strip()]
    has_addr = any(p.startswith("address") for p in plist)
    args = _call_args(params, "receiver")
    ctor = _ctor_args(fx, target)
    sig = "address receiver" if has_addr else ""
    guard = ("        vm.assume(uint160(receiver) > 255 && receiver != address(this) && receiver != address(c));\n"
             if has_addr else "")
    passarg = "receiver" if has_addr else ""
    return _HEADER + f"""
contract InvMutTest is Test {{
    C c;

    function setUp() public {{
        c = new C({ctor});
    }}

    function _run({sig}) internal {{
{guard}        vm.deal(address(c), 1 ether);
        address attacker = address(0xBEEF);
        bool reverted;
        vm.prank(attacker, address(this));
        try c.{fname}({args}) {{ reverted = false; }} catch {{ reverted = true; }}
        assertTrue(reverted);
    }}

    function testFuzz_run({sig}) public {{
        _run({passarg});
    }}

    receive() external payable {{}}
}}
"""


def gen_reentrancy(fix_src: str, bug_src: str, target: str):
    bug = _scope(bug_src, target)
    fx = _scope(fix_src, target)
    withdraw = None
    for name, params, mods, body in _funcs(bug):
        if (".call{value:" in body or ".call.value" in body) and re.search(r"\[\s*msg\.sender\s*\]", body):
            withdraw = (name, params, body)
            break
    if withdraw is None:
        return None
    fb = {f[0]: f for f in _funcs(fx)}.get(withdraw[0])
    if fb is None:
        return None
    reordered = ".call" in fb[3] and "= 0" in fb[3].split(".call")[0]
    guarded = bool(re.search(r"nonReentrant|noReentran|mutex|locked", fb[2] + fb[3]))
    if not (reordered or guarded):
        return None
    deposit = None
    for name, params, mods, body in _funcs(bug):
        if "payable" in mods and re.search(r"\[\s*msg\.sender\s*\]\s*(\+=|=)", body):
            deposit = (name, params)
            break
    if deposit is None:
        return None
    wname, wparams, _ = withdraw
    wargs = _zero_args(wparams)
    dname, dparams = deposit
    dargs = _zero_args(dparams)
    ctor = _ctor_args(fx, target)
    return _HEADER + f"""
contract InvMutTest is Test {{
    C c;
    bool attacking;
    uint256 got;

    function setUp() public {{
        c = new C({ctor});
    }}

    receive() external payable {{
        got += msg.value;
        if (attacking && address(c).balance >= 1) {{
            attacking = false;
            try c.{wname}({wargs}) {{}} catch {{}}
        }}
    }}

    function _run() internal {{
        vm.deal(address(c), 10);
        vm.deal(address(this), 10);
        c.{dname}{{value: 1}}({dargs});
        attacking = true;
        c.{wname}({wargs});
        assertTrue(got <= 1);
    }}

    function testFuzz_run() public {{
        _run();
    }}
}}
"""


def gen_unchecked(fix_src: str, bug_src: str, target: str):
    bug = _scope(bug_src, target)
    fx = _scope(fix_src, target)
    hit = _func_with(bug, ".call{value:") or _func_with(bug, ".call.value")
    if not hit:
        return None
    fname, params, _mods, _body = hit
    if params.strip():
        return None
    addr = re.search(r"(0x[0-9a-fA-F]{40})", bug)
    if not addr:
        return None
    fb = None
    for n, p, mods, b in _funcs(fx):
        if n == fname:
            fb = b
            break
    if fb is None or not re.search(r"require\(|if\s*\(\s*!\s*_?s|revert\(", fb):
        return None
    ctor = _ctor_args(fx, target)
    return _HEADER + f"""
contract __Reverter {{
    fallback() external payable {{ revert(); }}
    receive() external payable {{ revert(); }}
}}

contract InvMutTest is Test {{
    C c;
    address constant __t = {addr.group(1)};

    function setUp() public {{
        c = new C({ctor});
    }}

    function _run() internal {{
        vm.etch(__t, type(__Reverter).runtimeCode);
        vm.deal(address(this), 1 ether);
        bool reverted;
        try c.{fname}{{value: 1}}() {{ reverted = false; }} catch {{ reverted = true; }}
        assertTrue(reverted);
    }}

    function testFuzz_run() public {{
        _run();
    }}

    receive() external payable {{}}
}}
"""


DETECTORS = (
    ("txorigin", gen_txorigin),
    ("reentrancy", gen_reentrancy),
    ("unchecked", gen_unchecked),
)


def realize(fix_src: str, bug_src: str, target: str):
    for name, fn in DETECTORS:
        try:
            out = fn(fix_src, bug_src, target)
        except Exception:
            out = None
        if out:
            return name, out
    return None, None
