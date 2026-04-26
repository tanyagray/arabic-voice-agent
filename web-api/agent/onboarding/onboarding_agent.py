"""Onboarding agent — single goal-driven agent.

Replaces the earlier per-step state machine. The agent decides cadence: it
greets the learner, gathers what it needs (name, motivation), respects
refusals, and once it has enough calls `generate_lessons` to render the
starter tiles and mark onboarding complete.

Visible chat bubbles come from the agent's `final_output`. The harness
persists each turn to `transcript_messages` (one row per turn); the UI
splits sentence boundaries client-side so a multi-sentence reply still
renders as multiple bubbles. The `generate_lessons` tool emits its own
`message_kind="component"` row for the lesson tiles.
"""

from agents import Agent, StopAtTools

from harness.options import HarnessOptions

from .onboarding_instructions import get_instructions
from .tools.generate_lessons_tool import generate_lessons


agent = Agent(
    name="Onboarding",
    instructions=get_instructions,
    tools=[generate_lessons],
    # generate_lessons is the closing moment — its component message carries
    # the picker UI, so any agent text after it is just noise that would be
    # persisted now that persist_final_output is on. Stop the agent loop
    # there.
    tool_use_behavior=StopAtTools(stop_at_tool_names=["generate_lessons"]),
)


harness_options = HarnessOptions(
    scaffold=False,
    persist_final_output=True,
    flow_tag="onboarding",
    user_message_kind="text",
    idle_followups=False,
    fire_opener=False,
)
