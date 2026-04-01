"""PostHog analytics service."""

import os

import posthog


# Initialize PostHog — disabled gracefully if no API key is set
_api_key = os.getenv("POSTHOG_API_KEY")
_host = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")

if _api_key:
    posthog.api_key = _api_key
    posthog.host = _host
else:
    posthog.disabled = True


def capture(distinct_id: str, event: str, properties: dict | None = None) -> None:
    """Capture an analytics event."""
    if not _api_key:
        return
    posthog.capture(distinct_id=distinct_id, event=event, properties=properties or {})


def shutdown() -> None:
    """Flush pending events. Call on app shutdown."""
    if not posthog.disabled:
        posthog.shutdown()
