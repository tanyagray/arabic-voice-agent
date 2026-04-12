"""Tutor agent definition and configuration."""

from agents import Agent

from .tools.change_language_tool import change_language
from .tools.flashcards_tool import generate_flashcards
from .tools.send_audio_tool import send_audio
from .tutor_agent_hooks import TutorAgentHooks
from .tutor_instructions import get_instructions

agent = Agent(
    name="Tutor",
    instructions=get_instructions,
    tools=[
        change_language,
        generate_flashcards,
        send_audio,
    ],
    hooks=TutorAgentHooks(),
)
