"""Welcome-back agent — greets a returning learner by name, then completes.

After the user responds to the greeting, the agent calls `complete_welcome_back`
which sets the context flag; `broadcast_context` then signals the frontend to
navigate to the main app.
"""

from agents import Agent

from harness.options import HarnessOptions
from harness.response import AgentResponse

from .welcome_back_instructions import get_instructions
from .tools.complete_welcome_back_tool import complete_welcome_back


agent = Agent(
    name="WelcomeBack",
    instructions=get_instructions,
    tools=[complete_welcome_back],
    output_type=AgentResponse,
)

harness_options = HarnessOptions(
    scaffold=False,
    flow_tag="welcome-back",
    user_message_kind="text",
    idle_followups=False,
    fire_opener=True,
)
