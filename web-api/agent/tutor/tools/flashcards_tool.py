"""Tool for generating flashcard sets as a learning activity.

Flashcards are an activity the tutor can deploy mid-conversation — independent
of any lesson objective. Use this for explicit flashcard requests ("teach me
days of the week"). For browsing-style requests where the user might want to
choose between options, use `propose_lessons` instead.
"""

import json

from pydantic import BaseModel
from agents import RunContextWrapper, function_tool
from harness.context import AppContext
from services.flashcard_service import create_flashcard_set
from services.supabase_client import get_supabase_admin_client


class FlashcardInput(BaseModel):
    """A single flashcard with the target language text, transliteration, and English translation."""
    arabic_text: str
    transliteration: str
    english: str


@function_tool
async def generate_flashcards(
    context: RunContextWrapper[AppContext],
    topic: str,
    cards: list[FlashcardInput],
) -> str:
    """
    Generate a set of flashcards for a vocabulary collection. Use this when
    the user explicitly asks for a specific deck right now (e.g. "teach me the
    days of the week", "give me flashcards for colours"). For browsing-style
    requests where the user might want to choose between options, use
    `propose_lessons` instead.

    Each card must include:
    - arabic_text: The word in Arabic with FULL harakaat (diacritical marks)
    - transliteration: Latin-script transliteration (e.g. "al-ithnayn")
    - english: English translation (e.g. "Monday")

    Generate accurate, complete cards for the entire collection. Ensure all
    Arabic text includes proper harakaat for correct pronunciation.

    Args:
        topic: The name of the collection (e.g. "Days of the Week", "Colours")
        cards: List of flashcard objects

    Returns:
        str: Confirmation message
    """
    app_context = context.context
    language = app_context.agent.language
    session_id = app_context.session_id

    user_id = app_context.user.user_id
    if not user_id:
        supabase = get_supabase_admin_client()
        session_response = supabase.table("agent_sessions").select("user_id").eq("session_id", session_id).execute()
        if session_response.data:
            user_id = session_response.data[0]["user_id"]
    if not user_id:
        return "Sorry, I couldn't create flashcards — unable to identify the user."

    card_dicts = [card.model_dump() for card in cards]

    set_id = await create_flashcard_set(
        title=topic,
        language=language,
        cards=card_dicts,
        user_id=user_id,
    )

    return json.dumps({
        "status": "ok",
        "set_id": set_id,
        "title": topic,
        "card_count": len(cards),
        "instruction": (
            f"Include a 'flashcard-set' message in your response with set_id='{set_id}', "
            f"title='{topic}', language='{language}'. "
            "Also include a brief text acknowledgement in Arabic."
        ),
    })
