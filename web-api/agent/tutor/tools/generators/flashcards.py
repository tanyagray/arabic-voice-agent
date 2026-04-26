"""Generator handler for the 'flashcards' lesson format.

Dispatched by `generate_lesson_content` after a user picks a flashcard-format
proposal. Reads the cards out of the lesson's `generation_hints` JSONB and
delegates to the existing `create_flashcard_set` service.

The hints payload is expected to look like:
    {
        "cards": [
            {"arabic_text": "...", "transliteration": "...", "english": "..."},
            ...
        ]
    }
"""

from typing import Any

from harness.context import AppContext
from services.flashcard_service import create_flashcard_set


CONTENT_TABLE = "flashcard_sets"


async def generate(app_context: AppContext, lesson: dict[str, Any]) -> tuple[str, str]:
    """Generate a flashcard set for the given lesson row.

    Returns (content_table, content_id) so the caller can populate the lesson's
    polymorphic content link.
    """
    hints = lesson.get("generation_hints") or {}
    cards = hints.get("cards") or []
    if not cards:
        raise ValueError(
            "flashcards generator requires generation_hints.cards to be a non-empty list"
        )

    set_id = await create_flashcard_set(
        title=lesson["title"],
        language=app_context.agent.language,
        cards=cards,
        user_id=lesson["created_by"],
    )

    return (CONTENT_TABLE, set_id)
