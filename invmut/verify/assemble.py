
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from invmut.verify import canonical as cn
from invmut.verify.canonical import ShapeError, TestShape

_TOPLEVEL_DECL = re.compile(r"^\s*(?:abstract\s+)?(?:contract|library|interface)\s+(\w+)", re.M)
_SPDX_LINE = re.compile(r"^\s*(?://\s*SPDX-License-Identifier:|/\*\s*SPDX-License-Identifier:)", re.I)


@dataclass
class Assembly:
    p_program: str
    m_program: str
    test_name: str
    body_name: str
    p_assert_line: int
    m_assert_line: int
    p_body_range: tuple[int, int]
    m_body_range: tuple[int, int]
    canonical_test: str
    foundry_test: str
    construction: dict
    payable: bool = False
    value_amounts: list = None
    params: list = None
    narrowing_requires: list = None
    has_callback: bool = False
    has_balance_require: bool = False


def _toplevel_names(src: str) -> set[str]:
    return set(_TOPLEVEL_DECL.findall(src))


def _free_test_name(p: str, m: str) -> str:
    taken = _toplevel_names(p) | _toplevel_names(m)
    if cn.TEST_NAME not in taken:
        return cn.TEST_NAME
    i = 1
    while f"{cn.TEST_NAME}_{i}" in taken:
        i += 1
    return f"{cn.TEST_NAME}_{i}"


def _line_of(program: str, offset: int) -> int:
    return program[:offset].count("\n") + 1


def _c_ctor_payable(solc_bin: str, probe: str) -> bool:
    try:
        from invmut.mutation.solast import analyze_contract
        from invmut.esbmc.runner import temp_sol as _ts
        with _ts(probe, prefix="invmut_cpay_") as p:
            info = analyze_contract(solc_bin, probe, p, "C")
        return info.constructor is not None and info.constructor.payable
    except Exception:
        return False


def assemble(solc_bin: str, p_source: str, m_source: str, t_source: str,
             construction: dict, witness: Optional[dict],
             extra_requires=(), include_decls: bool = False) -> Assembly | ShapeError:
    test_name = _free_test_name(p_source, m_source)
    t_renamed = t_source
    if test_name != cn.TEST_NAME:
        t_renamed = re.sub(rf"\bcontract {cn.TEST_NAME}\b", f"contract {test_name}", t_source)

    t_no_spdx = "\n".join(
        ln for ln in t_renamed.splitlines() if not _SPDX_LINE.match(ln)
    )
    if include_decls:
        _decls = "\n".join((construction or {}).get("decls") or []) if isinstance(construction, dict) else ""
        if _decls:
            p_source = p_source + "\n" + _decls
            m_source = m_source + "\n" + _decls
    probe = p_source + "\n" + t_no_spdx
    shape = cn.analyze_test(solc_bin, probe, test_name)
    if isinstance(shape, ShapeError):
        return shape

    rc = cn.resolve_construction(construction, witness, _c_ctor_payable(solc_bin, probe))
    if isinstance(rc, ShapeError):
        return rc
    args_text, value_text = rc
    source = "witness" if (construction or {}).get("kind") == "unknown" else "input"

    p_program, new_assert_start = cn.build_esbmc_test(probe, shape, args_text, value_text, extra_requires)
    t_start = len(p_source) + 1
    canonical_test = p_program[t_start:]
    m_program = m_source + "\n" + canonical_test
    foundry_test = cn.build_foundry_test(probe, shape, args_text, value_text, extra_requires)[t_start:]

    assert_off_in_test = new_assert_start - t_start
    p_assert_line = _line_of(p_program, t_start + assert_off_in_test)
    m_assert_line = _line_of(m_program, len(m_source) + 1 + assert_off_in_test)

    p_body = (_line_of(p_program, t_start), p_program.count("\n") + 1)
    m_body = (_line_of(m_program, len(m_source) + 1), m_program.count("\n") + 1)

    return Assembly(
        p_program, m_program, test_name, shape.body_name,
        p_assert_line, m_assert_line, p_body, m_body, canonical_test, foundry_test,
        {"kind": (construction or {}).get("kind", "no_arg"), "args_text": args_text,
         "value": value_text, "source": source},
        payable=bool(shape.value_amounts), value_amounts=list(shape.value_amounts),
        params=list(shape.params), narrowing_requires=list(extra_requires),
        has_callback=shape.has_callback,
        has_balance_require=shape.has_balance_require,
    )
