"""Tutor agent definition and configuration."""

from agents import Agent

from harness.options import HarnessOptions

from .tools.change_language_tool import change_language
from .tools.flashcards_tool import generate_flashcards
from .tools.generate_lesson_content_tool import generate_lesson_content
from .tools.propose_lessons_tool import propose_lessons
from .tools.send_audio_tool import send_audio
from .tutor_agent_hooks import TutorAgentHooks
from .tutor_instructions import get_instructions

agent = Agent(
    name="Tutor",
    instructions=get_instructions,
    tools=[
        change_language,
        generate_flashcards,
        propose_lessons,
        generate_lesson_content,
        send_audio,
    ],
    hooks=TutorAgentHooks(),
)


harness_options = HarnessOptions(
    scaffold=True,
    flow_tag="tutor",
    idle_followups=True,
    user_none_system_prompt=(
        "making the user feel comfortable by continuing the conversation"
    ),
    fire_opener=True,
)
