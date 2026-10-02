"""Doc 3 §4 — assemble the P-program and M-program from P, M, and the canonical test.

P and M both name their primary contract `C`, so they go in two separate files (no rename of C,
unlike Doc 2's R2). The canonical test (§2) is appended to each. The test contract is renamed only
if `InvMutTest` collides with a top-level name in P/M (§4.2). `target_assert_line` — the line of the
test's single assert in each assembled program — is the oracle key for §6.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from invmut.verify import canonical as cn
from invmut.verify.canonical import ShapeError, TestShape

_TOPLEVEL_DECL = re.compile(r"^\s*(?:abstract\s+)?(?:contract|library|interface)\s+(\w+)", re.M)
# matches both `// SPDX-License-Identifier: ...` (with/without space) and `/* SPDX-License-Identifier: */`
# (codex: the bare startswith("// SPDX-") variant missed block-comment and no-space forms)
_SPDX_LINE = re.compile(r"^\s*(?://\s*SPDX-License-Identifier:|/\*\s*SPDX-License-Identifier:)", re.I)


@dataclass
class Assembly:
    p_program: str
    m_program: str
    test_name: str               # verification_test_name (possibly suffixed)
    body_name: str
    p_assert_line: int
    m_assert_line: int
    p_body_range: tuple[int, int]
    m_body_range: tuple[int, int]
    canonical_test: str          # the ESBMC verification form (in the programs)
    foundry_test: str            # the Foundry render form (for the §11 bundle)
    construction: dict           # {kind, args_text, value, source}
    payable: bool = False        # §9: the body makes value-bearing calls
    value_amounts: list = None   # §9: the amount expressions, for the bundle's value_calls
    params: list = None          # body params [(type, name)] for §8 narrowing
    narrowing_requires: list = None   # §8 requires applied to this assembly
    has_callback: bool = False   # §10: a reentrancy test (receive/fallback present)
    has_balance_require: bool = False  # §9: body reads address(this).balance → ESBMC funds c (RQ3 #10)


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
    """True if the primary contract C has a PAYABLE constructor (codex F3). Reads the already-built
    probe AST; defaults to False on any analysis hiccup (the value guard then just won't fire)."""
    try:
        from invmut.mutation.solast import analyze_contract
        from invmut.esbmc.runner import temp_sol as _ts
        with _ts(probe, prefix="invmut_cpay_") as p:
            info = analyze_contract(solc_bin, probe, p, "C")
        return info.constructor is not None and info.constructor.payable
    except Exception:  # noqa: BLE001
        return False


def assemble(solc_bin: str, p_source: str, m_source: str, t_source: str,
             construction: dict, witness: Optional[dict],
             extra_requires=(), include_decls: bool = False) -> Assembly | ShapeError:
    """Build both programs + the canonical test. Returns ShapeError on a shape/construction defect.
    A solc/AST failure of the assembled program is the orchestrator's `harness_compile_failed`.

    include_decls (config.esbmc_harness_construction_decls, 2026-09-22): append the construction
    recipe's own declarations to BOTH sides. config.construction_fixtures can put
    `address(new __InvMutHandleStub())` into the constructor arguments, and prep.render_construction_decls
    hands the stub's SOURCE to the Foundry prompt -- but the ESBMC harness assembled here is just
    `p_source + test`, so the stub type is never declared and solc rejects the whole program with
    "Identifier not found or not unique". MEASURED (acfix_3_5_101_ANCHToken trial 1, DeepSeek Pro arm):
    23 of the case's 36 attempts died as harness_compile_failed, every one of them on
    `constructor() { c = new C(address(new __InvMutHandleStub()), address(this)); }`; corpus-wide the
    reason appears 304 times. The decls are identical on P and M, so they cannot manufacture a
    difference. False = published behaviour (the published arms keep the failure)."""
    # name collision (§4.2): rename ONLY the test contract, BEFORE assembling (else P+T would have
    # two contracts named InvMutTest and fail to compile). c/body/P/M are untouched.
    test_name = _free_test_name(p_source, m_source)
    t_renamed = t_source
    if test_name != cn.TEST_NAME:
        t_renamed = re.sub(rf"\bcontract {cn.TEST_NAME}\b", f"contract {test_name}", t_source)

    # Strip SPDX-License-Identifier from the test before combining with p_source: both the real
    # contract and the LLM test may carry SPDX headers, and solc rejects multiple SPDX identifiers
    # in one file with a hard error ("Multiple SPDX license identifiers found"). Keep only p_source's
    # SPDX (the authoritative one); the test's is redundant.
    t_no_spdx = "\n".join(
        ln for ln in t_renamed.splitlines() if not _SPDX_LINE.match(ln)
    )
    if include_decls:
        _decls = "\n".join((construction or {}).get("decls") or []) if isinstance(construction, dict) else ""
        if _decls:
            # appended to BOTH sides so t_start (= len(p_source) + 1) still slices the canonical test
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
    # the Foundry-renderable form for the bundle (intrinsic-free, real-EVM-correct, V24). Spans are
    # into `probe`, so build over probe and slice out the test portion.
    foundry_test = cn.build_foundry_test(probe, shape, args_text, value_text, extra_requires)[t_start:]

    # assert line in each program
    assert_off_in_test = new_assert_start - t_start
    p_assert_line = _line_of(p_program, t_start + assert_off_in_test)
    m_assert_line = _line_of(m_program, len(m_source) + 1 + assert_off_in_test)

    # body line range (fallback matcher §6.2): the canonical test occupies these lines in each
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
