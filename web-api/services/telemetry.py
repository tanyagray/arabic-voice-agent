"""BrainTrust telemetry service for LLM request observability."""

import os
from contextlib import contextmanager
from typing import Generator

from loguru import logger

_telemetry_enabled = False


def setup_telemetry() -> None:
    """Initialize BrainTrust telemetry if BRAINTRUST_API_KEY is configured.

    Logs a warning and returns without crashing if the key is absent.
    When enabled, auto-instruments OpenAI so all LLM calls are captured.
    """
    global _telemetry_enabled

    api_key = os.getenv("BRAINTRUST_API_KEY")
    if not api_key:
        logger.warning(
            "BRAINTRUST_API_KEY not set — BrainTrust telemetry disabled. "
            "Set BRAINTRUST_API_KEY to enable LLM observability."
        )
        return

    try:
        import braintrust

        project = os.getenv("BRAINTRUST_PROJECT", "mishmish.ai")
        braintrust.init_logger(project=project, api_key=api_key, async_flush=True)
        braintrust.auto_instrument(openai=True)

        _telemetry_enabled = True
        logger.info(f"BrainTrust telemetry enabled (project={project!r})")
    except Exception as exc:
        logger.warning(f"Failed to initialize BrainTrust telemetry: {exc}")


def is_enabled() -> bool:
    """Return True if BrainTrust telemetry was successfully initialized."""
    return _telemetry_enabled


@contextmanager
def admin_span(name: str) -> Generator[None, None, None]:
    """Context manager that wraps an LLM call with an 'admin' tag in BrainTrust.

    Usage::

        with admin_span("admin_chat"):
            result = await Runner.run(agent, message)

    If telemetry is disabled this is a no-op.
    """
    if not _telemetry_enabled:
        yield
        return

    import braintrust

    with braintrust.start_span(name=name, tags=["admin"]):
        yield


@contextmanager
def user_span(name: str) -> Generator[None, None, None]:
    """Context manager that wraps an LLM call with a 'user' tag in BrainTrust.

    Usage::

        with user_span("user_chat"):
            result = await Runner.run(agent, message)

    If telemetry is disabled this is a no-op.
    """
    if not _telemetry_enabled:
        yield
        return

    import braintrust

    with braintrust.start_span(name=name, tags=["user"]):
        yield
