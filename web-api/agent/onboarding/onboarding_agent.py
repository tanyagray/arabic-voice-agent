"""Onboarding agent — single goal-driven agent.

The agent decides cadence: it greets the learner, gathers what it needs
(name, motivation), respects refusals, and once it has enough calls
`generate_lessons` to finish onboarding and queue the lesson tiles.

Visible chat bubbles are the agent's plain assistant text. The harness
walks `result.new_items` after each turn and persists every
`MessageOutputItem` to `transcript_messages`; the UI splits sentence
boundaries client-side so a multi-sentence reply still renders as
multiple bubbles. The `generate_lessons` tool queues a `LessonTiles`
ComponentMessage on the context outbox and the harness persists that
as a `message_kind='component'` row in the same turn.

The loop is left alone (no `StopAtTools`): when the agent calls
`generate_lessons`, the tool's "ok" return goes back to the model and
the model produces the handoff sentence as its post-tool reply. The
prompt nails that to the duroos line so we don't get trailing chatter.
"""

from agents import Agent

from harness.options import HarnessOptions

from .onboarding_instructions import get_instructions
from .tools.generate_lessons_tool import generate_lessons


agent = Agent(
    name="Onboarding",
    instructions=get_instructions,
    tools=[generate_lessons],
)


harness_options = HarnessOptions(
    scaffold=False,
    flow_tag="onboarding",
    user_message_kind="text",
    idle_followups=False,
    fire_opener=False,
)
