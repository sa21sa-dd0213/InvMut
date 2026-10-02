"""Doc 4 — Foundry rendering.

Consumes the Doc 3 `accepted_bundle` (`verified_test_source` + construction/payable/value_calls/witness)
and renders a real Foundry test file (`InvMutTest is Test`) into dual workspaces, then validates it with
`forge test` (must PASS on P, FAIL on M). The renderer is AST-driven (re-parses `verified_test_source`
with C in scope) — see notes/PLAN_PHASE45_RQ3.md REVISION 3 (I1–I4, I2b) for the measured interface facts.
"""

from invmut.render.model import RenderInput, RenderResult
from invmut.render.pipeline import render_and_validate, render_only

__all__ = ["RenderInput", "RenderResult", "render_and_validate", "render_only"]
