from pathlib import Path

from agents import Agent, RunContextWrapper

from harness.context import AppContext


SYSTEM_PROMPT_PATH = Path(__file__).parent / "system.md"


def get_instructions(
    context: RunContextWrapper[AppContext], agent: Agent[AppContext]
) -> str:
    app_context = context.context
    if app_context and app_context.welcome_back and app_context.welcome_back.completed:
        return 'Welcome-back flow is complete. Respond with exactly: {"messages": []}'

    user_name = (app_context.user.user_name or "there") if app_context else "there"
    motivation = (app_context.user.user_motivation or "not specified") if app_context else "not specified"

    template = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    return template.replace("{user_name}", user_name).replace("{motivation}", motivation)
