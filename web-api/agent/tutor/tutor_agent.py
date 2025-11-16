"""Tutor agent definition and configuration."""

from agents import Agent

from agent.parrot.parrot_agent import agent as parrot_agent
from .tutor_agent_hooks import TutorAgentHooks
from .tutor_instructions import get_instructions

agent = Agent(
    name="Assistant",
    instructions=get_instructions,
    tools=[
        parrot_agent.as_tool(
            tool_name="parrot_game",
            tool_description="Use this tool when the user wants to play the parrot game or practice translations. The parrot game translates words/phrases between English and Arabic (whichever direction is opposite to the input language).",
        )
    ],
    hooks=TutorAgentHooks(),
)
