"""Backward-compat shim — split into harness.runner, harness.agent_loop, and channels.rest.websocket.session_loop."""

from harness.runner import (  # noqa: F401
    generate_agent_response,
    generate_greeting,
    generate_agent_followup,
)
from harness.agent_loop import trigger_turn  # noqa: F401
from channels.rest.websocket.session_loop import start_session_loop  # noqa: F401
