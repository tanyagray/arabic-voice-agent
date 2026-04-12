"""Backward-compat shim — canonical location is harness.scaffolding."""

from harness.scaffolding import (  # noqa: F401
    ScaffoldedResult,
    PhaseResult,
    generate_scaffolded_text,
    generate_transliterated_text,
    generate_scaffolded_text_with_metadata,
    generate_transliterated_text_with_metadata,
)
