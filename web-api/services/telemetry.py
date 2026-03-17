"""BrainTrust telemetry configuration for LLM request logging."""

import os
from contextlib import contextmanager
from typing import Generator

from loguru import logger

_telemetry_configured = False


def configure_telemetry() -> None:
    """Configure BrainTrust telemetry if BRAINTRUST_API_KEY is present.

    Logs a warning if the key is not set but does not raise an exception.
    When configured, wraps the default OpenAI client so all LLM calls made
    through the agents SDK are automatically logged to BrainTrust.
    """
    global _telemetry_configured

    api_key = os.getenv("BRAINTRUST_API_KEY")
    if not api_key:
        logger.warning(
            "BRAINTRUST_API_KEY is not set — BrainTrust telemetry is disabled. "
            "Set BRAINTRUST_API_KEY (and optionally BRAINTRUST_PROJECT) to enable LLM request logging."
        )
        return

    try:
        import braintrust
        from openai import AsyncOpenAI
        from agents import set_default_openai_client

        project = os.getenv("BRAINTRUST_PROJECT", "mishmish")

        braintrust.configure(api_key=api_key, project=project)

        # Wrap the default OpenAI client so agents SDK LLM calls are logged
        wrapped_client = braintrust.wrap_openai(AsyncOpenAI())
        set_default_openai_client(wrapped_client)

        _telemetry_configured = True
        logger.info(f"BrainTrust telemetry enabled (project: {project!r})")

    except ImportError:
        logger.warning(
            "braintrust package is not installed — telemetry disabled. "
            "Add 'braintrust' to your dependencies to enable it."
        )
    except Exception as e:
        logger.warning(f"Failed to configure BrainTrust telemetry: {e}")


def is_telemetry_configured() -> bool:
    """Return True if BrainTrust telemetry was successfully configured."""
    return _telemetry_configured


def get_wrapped_openai_client():
    """Return a BrainTrust-wrapped AsyncOpenAI client.

    Falls back to a plain AsyncOpenAI client if telemetry is not configured.
    Use this for OpenAI clients that are created outside the agents SDK
    (e.g. direct completions calls).
    """
    from openai import AsyncOpenAI

    client = AsyncOpenAI()
    if not _telemetry_configured:
        return client

    try:
        import braintrust
        return braintrust.wrap_openai(client)
    except Exception as e:
        logger.warning(f"Failed to wrap OpenAI client for BrainTrust: {e}")
        return client


@contextmanager
def make_span(name: str, request_type: str) -> Generator:
    """Context manager that creates a BrainTrust span tagged with the request type.

    When telemetry is disabled this is a no-op. LLM calls made via a
    BrainTrust-wrapped OpenAI client inside this context will be automatically
    nested under the span and inherit its metadata/tags.

    Args:
        name: Human-readable name for the span (e.g. "user-chat").
        request_type: Either "user" or "admin" — used as a BrainTrust tag so
                      requests can be filtered in the BrainTrust UI.
    """
    if not _telemetry_configured:
        yield None
        return

    try:
        import braintrust
        with braintrust.start_span(name=name) as span:
            span.log(metadata={"request_type": request_type}, tags=[request_type])
            yield span
    except Exception as e:
        logger.warning(f"BrainTrust span error for {name!r}: {e}")
        yield None
