"""Onboarding agent — single goal-driven agent.

Replaces the earlier per-step state machine. The agent decides cadence: it
greets the learner, gathers what it needs (name, motivation), respects
refusals, and once it has enough calls `generate_lessons` to render the
starter tiles and mark onboarding complete.

All visible chat bubbles are emitted via the `say` tool (one call per
bubble). The agent's `final_output` is ignored — text-as-output would skip
structured highlights and the per-bubble cadence we want.
"""

from agents import Agent

from harness.options import HarnessOptions

from .onboarding_instructions import get_instructions
from .tools.say_tool import say
from .tools.generate_lessons_tool import generate_lessons


agent = Agent(
    name="Onboarding",
    instructions=get_instructions,
    tools=[say, generate_lessons],
)


harness_options = HarnessOptions(
    scaffold=False,
    tts=False,
    persist_final_output=False,
    flow_tag="onboarding",
    user_message_kind="transcript",
    idle_followups=False,
    user_none_system_prompt=(
        "Begin onboarding now. Greet the learner warmly and ask their name. "
        "Use the `say` tool to produce each chat bubble."
    ),
    fire_opener=True,
)
