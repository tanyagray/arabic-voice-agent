"""Backward-compat shim — split into harness.runner and channels.rest.websocket.agent_loop."""

from harness.runner import (  # noqa: F401
    generate_agent_response,
    generate_greeting,
    generate_agent_followup,
)
from channels.rest.websocket.agent_loop import (  # noqa: F401
    trigger_agent_turn,
    start_realtime_agent,
)
