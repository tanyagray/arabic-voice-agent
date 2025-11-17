"""Tool for changing the tutoring language."""

from pathlib import Path
from agents import RunContextWrapper, function_tool
from services.context_service import AppContext


# Available languages based on files in the languages directory
AVAILABLE_LANGUAGES = {
    "ar-AR": "Arabic",
    "es-MX": "Mexican Spanish",
    "ru-RU": "Russian",
    "mi-NZ": "Te Reo Māori (New Zealand Māori)"
}


@function_tool
def change_language(
    context: RunContextWrapper[AppContext],
    language_code: str
) -> str:
    """
    Change the tutoring language for the conversation.

    Use this tool when the user wants to switch to learning a different language.

    Available languages:
    - ar-AR: Arabic
    - es-MX: Mexican Spanish
    - ru-RU: Russian
    - mi-NZ: Te Reo Māori (New Zealand Māori)

    Args:
        language_code: The language code to switch to (e.g., 'ar-AR', 'es-MX', 'ru-RU', 'mi-NZ')

    Returns:
        str: Confirmation message about the language change
    """
    app_context = context.context

    # Validate language code
    if language_code not in AVAILABLE_LANGUAGES:
        available = ", ".join([f"{code} ({name})" for code, name in AVAILABLE_LANGUAGES.items()])
        return f"Language code '{language_code}' is not available. Available languages: {available}"

    # Verify the language file exists
    current_dir = Path(__file__).parent.parent
    language_file = current_dir / "languages" / f"{language_code}.md"

    if not language_file.exists():
        return f"Language file not found for '{language_code}'. Please contact support."

    # Update the language in context
    previous_language = app_context.agent.language
    app_context.set_language(language_code)

    language_name = AVAILABLE_LANGUAGES[language_code]
    previous_name = AVAILABLE_LANGUAGES.get(previous_language, previous_language)

    return f"Language changed from {previous_name} to {language_name}. I'll now tutor you in {language_name}!"
