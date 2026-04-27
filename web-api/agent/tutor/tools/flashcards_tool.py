"""Tool for generating flashcard sets for vocabulary collections.

Direct/bypass path: the tutor can drop a flashcard deck mid-conversation
without going through the propose -> pick -> generate cycle. Each call still
creates a `lessons` row (in `status='ready'`) alongside the flashcard set so
the `lessons` table remains the single source of truth for "what content
does this user have".

For the deliberate two-step flow (propose then generate after the user picks),
see `propose_lessons_tool.py` and `generate_lesson_content_tool.py`.
"""

import json

from pydantic import BaseModel
from agents import RunContextWrapper, function_tool
from harness.context import AppContext
from services.flashcard_service import create_flashcard_set
from services.lesson_service import insert_ready_lesson
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
    Generate a set of flashcards for a vocabulary collection, bypassing the
    proposal flow. Use this when the conversation makes it obvious the user
    wants this exact deck right now (e.g. they explicitly ask for "days of
    the week flashcards"). For browsing-style requests where the user might
    want to choose between options, use `propose_lessons` instead.

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

    # Get user_id from the session (context.user.user_id may be None)
    user_id = app_context.user.user_id
    if not user_id:
        supabase = get_supabase_admin_client()
        session_response = supabase.table("agent_sessions").select("user_id").eq("session_id", session_id).execute()
        if session_response.data:
            user_id = session_response.data[0]["user_id"]
    if not user_id:
        return "Sorry, I couldn't create flashcards — unable to identify the user."

    # Convert Pydantic models to dicts for the service
    card_dicts = [card.model_dump() for card in cards]

    # Create the flashcard set (kicks off async image/audio generation)
    set_id = await create_flashcard_set(
        title=topic,
        language=language,
        cards=card_dicts,
        user_id=user_id,
    )

    # Record a `lessons` row so this deck shows up in the user's lessons history.
    insert_ready_lesson(
        user_id=user_id,
        session_id=session_id,
        title=topic,
        blurb=f"{len(cards)}-card flashcard set on {topic}.",
        fmt="flashcards",
        content_table="flashcard_sets",
        content_id=set_id,
        generation_hints={"cards": card_dicts},
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
