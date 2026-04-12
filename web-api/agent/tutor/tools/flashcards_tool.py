"""Tool for generating flashcard sets for vocabulary collections."""

import json

from pydantic import BaseModel
from agents import RunContextWrapper, function_tool
from harness.context import AppContext
from services.flashcard_service import create_flashcard_set
from services.transcript_service import create_transcript_message
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
    Generate a set of flashcards for a vocabulary collection.

    Use this tool when the user wants to learn a collection of vocabulary words,
    such as days of the week, colours, months, common foods, clothing, animals,
    body parts, numbers, or any other thematic group of words.

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

    # Create a transcript message so the frontend can render the flashcard deck
    await create_transcript_message(
        session_id=session_id,
        message_source="tutor",
        message_kind="flash_cards",
        message_text=json.dumps({"set_id": set_id, "title": topic}),
    )

    return f"I've created a flashcard set for '{topic}' with {len(cards)} cards. The images and audio are being generated now."
