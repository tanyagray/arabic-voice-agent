"""Per-agent loop configuration.

Each agent module exports a `harness_config` describing how its turns should
be driven: scaffolding, TTS, message kinds, idle followups, opener, etc.
Routes read this config and pass it to the session loop — they don't need to
know anything agent-specific.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class HarnessOptions:
    # Run the canonical Arabic response through the Arabizi scaffolder before
    # persisting/sending. Tutor only.
    scaffold: bool = False

    # Generate TTS audio when `context.agent.audio_enabled`. Tutor only.
    tts: bool = False

    # Persist the agent's `final_output` as a tutor message. Onboarding sets
    # this to False — its visible output goes through the `say` tool.
    persist_final_output: bool = True

    # `flow` field stamped onto every persisted message (user + tutor).
    flow_tag: Optional[str] = None

    # `message_kind` used when persisting incoming user messages.
    user_message_kind: str = "text"

    # Enable the exponential-backoff idle-followup loop (5s base, ×2, max 3).
    idle_followups: bool = False

    # Injected as a system message when no user message is present (opener
    # turns and idle followups).
    user_none_system_prompt: Optional[str] = None

    # If True, the route fires `trigger_turn(user_message=None)` once after
    # the WebSocket is registered, before entering the receive loop.
    fire_opener: bool = False
