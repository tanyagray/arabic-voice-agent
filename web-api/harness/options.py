"""Per-agent loop configuration.

Each agent module exports a `harness_options` describing how its turns
should be driven: scaffolding, message kinds, idle followups, opener,
etc. Routes read this and pass it to the session loop — they don't
need to know anything agent-specific.

Channel-level concerns (TTS, transport, payload format) live on the
channel route, not here.
"""

from dataclasses import dataclass
from typing import Optional

from harness.turn import TurnConfig


@dataclass(frozen=True)
class HarnessOptions:
    # Run the canonical Arabic response through the Arabizi scaffolder before
    # persisting/sending. Tutor only.
    scaffold: bool = False

    # `flow` field stamped onto every persisted message (user + tutor).
    flow_tag: Optional[str] = None

    # `message_kind` used when persisting incoming user messages.
    user_message_kind: str = "text"

    # Enable the exponential-backoff idle-followup loop (5s base, ×2, max 3).
    idle_followups: bool = False

    # Injected as a system message when no user message is present (opener
    # turns and idle followups).
    user_none_system_prompt: Optional[str] = None

    # If True, the route fires one turn with `user_message=None` after the
    # WebSocket is registered, before entering the receive loop.
    fire_opener: bool = False

    def turn_config(self) -> TurnConfig:
        """Project the per-turn fields out for `harness.turn.run_turn`."""
        return TurnConfig(
            scaffold=self.scaffold,
            flow_tag=self.flow_tag,
            user_none_system_prompt=self.user_none_system_prompt,
        )
