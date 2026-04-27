"""Onboarding agent — single goal-driven agent.

The agent decides cadence: it greets the learner, gathers what it needs
(name, motivation), respects refusals, and once it has enough calls
`generate_lessons` to finish onboarding.

The agent responds via `AgentResponse` (structured JSON). Visible chat
bubbles are `text` messages; the lesson tile picker is a `lesson-suggestions`
message. When the agent calls `generate_lessons`, the tool returns the tile
data as JSON and the agent includes both a `text` handoff bubble and a
`lesson-suggestions` message in the same response.
"""

from agents import Agent

from harness.options import HarnessOptions
from harness.response import AgentResponse

from .onboarding_instructions import get_instructions
from .tools.generate_lessons_tool import generate_lessons
from .tools.record_profile_tool import record_profile


agent = Agent(
    name="Onboarding",
    instructions=get_instructions,
    tools=[record_profile, generate_lessons],
    output_type=AgentResponse,
)


harness_options = HarnessOptions(
    scaffold=False,
    flow_tag="onboarding",
    user_message_kind="text",
    idle_followups=False,
    fire_opener=False,
)
