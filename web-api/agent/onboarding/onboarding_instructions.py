"""System instructions for the onboarding agent.

The prompt body lives in `system.md` next to this file so it can be edited
from the admin app without touching code.
"""

from pathlib import Path

from agents import Agent, RunContextWrapper

from harness.context import AppContext


SYSTEM_PROMPT_PATH = Path(__file__).parent / "system.md"


def get_instructions(
    context: RunContextWrapper[AppContext], agent: Agent[AppContext]
) -> str:
    app_context = context.context
    collected = (
        app_context.onboarding.collected
        if app_context and app_context.onboarding
        else {}
    )
    if app_context and app_context.onboarding and app_context.onboarding.completed:
        # Onboarding already finished — guard against accidental further turns.
        # Return empty messages array in the required JSON format.
        return (
            "Onboarding is complete. Do not call any tools. "
            'Respond with exactly: {"messages": []}'
        )
    template = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    return template.replace("{collected}", str(collected or "{}"))
