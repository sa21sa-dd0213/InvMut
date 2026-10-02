"""Doc 4 data model — render input/result + the error/note/validation enums (schema invmut.render.v1)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

# §0.4 compatibility-gate / render error codes (reject before or during render)
RENDER_ERRORS = {
    "unsupported_msg_value",          # body reads msg.value anywhere
    "unsupported_param_type",         # a fuzz param not in {bool,address,uintN,intN,bytesN}
    "unsupported_value_expression",   # a {value: E} where E is not a direct uint param / literal
    "unsupported_value_amount_type",  # a value amount param is not uintN
    "unsupported_guard_state",        # receive/fallback guard state not a simple value type
    "unsupported_callback_body_reference",  # receive/fallback references the body function name
    "construction_value_unknown",     # payable ctor but no value resolved
    "construction_unknown",           # ctor args unresolved
    "m_witness_out_of_range",         # a witness literal does not fit its param type
    "m_witness_bad_address",          # a witness address is not 20 bytes
    "unsafe_import_path",             # import path is absolute or escapes the workspace
    "forge_std_missing",              # forge-std path missing src/Test.sol
    "parser_error",                   # AST node / span could not be located
    "malformed_bundle",               # verified_test_source failed to parse / shape-extract
}

# post-render validation error codes (forge test failures)
VALIDATION_ERRORS = {
    "foundry_compile_failed_P",
    "foundry_compile_failed_M",
    "foundry_regression_failed_on_P",
    "foundry_fuzz_failed_on_P",
    "foundry_regression_passed_on_M",
    "foundry_fuzz_passed_on_M",
    "foundry_setup_failed_P",
    "foundry_timeout",
}

RENDER_NOTES = {
    "assert_true_fallback",       # assertTrue overload-resolution forced a fallback to assert()
    "no_witness_regression",      # witness absent → regression test omitted (only testFuzz emitted)
}


@dataclass
class RenderInput:
    """Everything Doc 4 needs. `c_scope_source` is the renamed flat source defining contract C — used
    both as the `import {C}` target AND (concatenated) to give `verified_test_source` a parseable C."""
    bundle: dict                     # Doc 3 accepted_bundle
    c_scope_source: str              # P source (renamed so the contract under test is `C`)
    m_scope_source: str              # M (mutant) source, for validation workspace_M
    import_path: str                 # relative import path emitted in `import {C} from "..."`
    pragma: str                      # the pragma line emitted verbatim (e.g. 'pragma solidity >=0.8.0;')
    contract_name: str = "C"


@dataclass
class RenderResult:
    schema_version: str = "invmut.render.v1"
    render_status: str = "render_error"          # rendered | render_error
    render_error: Optional[str] = None
    render_note: Optional[str] = None
    validation_status: str = "skipped"           # passed | validation_error | skipped
    validation_error: Optional[str] = None
    rendered_test: Optional[str] = None          # the *.t.sol source
    test_name: str = "InvMutTest"
    body_name: Optional[str] = None
    workspace_P_log: Optional[str] = None
    workspace_M_log: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "render_status": self.render_status,
            "render_error": self.render_error,
            "render_note": self.render_note,
            "validation_status": self.validation_status,
            "validation_error": self.validation_error,
            "rendered_test": self.rendered_test,
            "test_name": self.test_name,
            "body_name": self.body_name,
            "workspace_P_log": self.workspace_P_log,
            "workspace_M_log": self.workspace_M_log,
        }
