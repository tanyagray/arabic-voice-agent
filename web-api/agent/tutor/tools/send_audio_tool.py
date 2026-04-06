"""Tool for sending audio pronunciation to the user."""

from agents import RunContextWrapper, function_tool
from services.context_service import AppContext


@function_tool
def send_audio(
    context: RunContextWrapper[AppContext],
    text: str
) -> str:
    """
    Send an audio pronunciation of the given text to the user.

    Use this tool when the user asks how to pronounce a word or phrase,
    or asks to hear something spoken aloud. Pass the exact text
    (in the target language with full diacritics/harakaat) that should be pronounced.

    Args:
        text: The text to pronounce (in the target language with diacritics/harakaat)
    """
    app_context = context.context
    app_context.set_audio_text(text)
    return f"Audio message will be sent with pronunciation of: {text}"
