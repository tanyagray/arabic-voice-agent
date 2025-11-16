"""Arabic agent definition and configuration."""

from agents import Agent

from agent.parrot.parrot_agent import agent as parrot_agent
from .arabic_agent_hooks import ArabicAgentHooks
from .arabic_instructions import get_instructions

agent = Agent(
    name="Assistant",
    instructions=get_instructions,
    tools=[
        parrot_agent.as_tool(
            tool_name="play_parrot_game",
            tool_description="Play the Parrot translation game - translate the user's word or phrase to the opposite language (English to Arabic or Arabic to English)",
        )
    ],
    hooks=ArabicAgentHooks(),
)
