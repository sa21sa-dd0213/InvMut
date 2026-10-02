
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

RENDER_ERRORS = {
    "unsupported_msg_value",
    "unsupported_param_type",
    "unsupported_value_expression",
    "unsupported_value_amount_type",
    "unsupported_guard_state",
    "unsupported_callback_body_reference",
    "construction_value_unknown",
    "construction_unknown",
    "m_witness_out_of_range",
    "m_witness_bad_address",
    "unsafe_import_path",
    "forge_std_missing",
    "parser_error",
    "malformed_bundle",
}

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
    "assert_true_fallback",
    "no_witness_regression",
}


@dataclass
class RenderInput:
    bundle: dict
    c_scope_source: str
    m_scope_source: str
    import_path: str
    pragma: str
    contract_name: str = "C"


@dataclass
class RenderResult:
    schema_version: str = "invmut.render.v1"
    render_status: str = "render_error"
    render_error: Optional[str] = None
    render_note: Optional[str] = None
    validation_status: str = "skipped"
    validation_error: Optional[str] = None
    rendered_test: Optional[str] = None
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
