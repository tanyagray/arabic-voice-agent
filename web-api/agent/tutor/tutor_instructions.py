import os
from pathlib import Path
from agents import RunContextWrapper, Agent
from services.context_service import AppContext


def _load_instructions(language: str) -> str:
    """
    Load instruction content from the language-specific markdown file.

    Args:
        language: Language code (e.g., 'ar-AR')

    Returns:
        str: The instruction content

    Raises:
        FileNotFoundError: If the language file doesn't exist
    """
    current_dir = Path(__file__).parent
    instructions_path = current_dir / "languages" / f"{language}.md"

    if not instructions_path.exists():
        raise FileNotFoundError(
            f"Instructions file not found for language '{language}' at {instructions_path}"
        )

    return instructions_path.read_text(encoding="utf-8")


def get_instructions(
    context: RunContextWrapper[AppContext], agent: Agent[AppContext]
) -> str:
    app_context = context.context

    # Get language from agent state, defaulting to 'ar-AR'
    language = app_context.agent.language if app_context and app_context.agent else "ar-AR"

    # Load instructions for the specified language
    instructions = _load_instructions(language)

    # Generate user info bullet list dynamically based on AppContext fields
    user_info_lines = []
    if app_context and app_context.user:
        if app_context.user.user_id:
            user_info_lines.append(f"- id: {app_context.user.user_id}")
        if app_context.user.user_name:
            user_info_lines.append(f"- name: {app_context.user.user_name}")

    user_context = "\n".join(user_info_lines) if user_info_lines else "- No user information available"

    return f"""{instructions}

USER INFO:
{user_context}
"""