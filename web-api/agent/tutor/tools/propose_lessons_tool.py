"""Tool: propose_lessons — offer the user a few lesson ideas to pick from.

Inserts one `lessons` row per proposal in `status='proposed'`, all sharing a
`proposal_group_id`. Then emits a `message_kind='component'` transcript message
pointing at that group; the frontend's LessonProposalTiles component subscribes
to the group via realtime and renders the tiles.

Crucially, this tool does NOT generate any lesson content — content is only
generated when the user picks a tile and the tutor follows up with
`generate_lesson_content(lesson_id)`. That keeps generation cost proportional
to lessons actually used.
"""

import json
import uuid
from typing import Literal, Optional

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel, Field

from harness.context import AppContext
from services.lesson_service import insert_lesson_proposals
from services.supabase_client import get_supabase_admin_client


class FlashcardCardHint(BaseModel):
    """A single flashcard the agent has decided to include if this proposal is picked."""
    arabic_text: str
    transliteration: str
    english: str


class LessonProposal(BaseModel):
    """One proposed lesson the user could pick."""
    title: str = Field(..., description="Short, evocative title shown on the tile (e.g. 'Days of the Week').")
    blurb: str = Field(..., description="One-sentence description of what the lesson covers and why it's a good fit.")
    arabic_preview: Optional[str] = Field(
        None,
        description="Optional short Arabic word/phrase shown on the tile (with harakaat).",
    )
    format: Literal["flashcards"] = Field(
        ...,
        description="Lesson format. Only 'flashcards' is supported in v1.",
    )
    cards: Optional[list[FlashcardCardHint]] = Field(
        None,
        description=(
            "For format='flashcards', the list of cards to generate IF the user picks "
            "this tile. Required for flashcards. Each card must have arabic_text "
            "with full harakaat, a Latin transliteration, and an English translation."
        ),
    )


@function_tool
async def propose_lessons(
    context: RunContextWrapper[AppContext],
    intro: str,
    proposals: list[LessonProposal],
) -> str:
    """
    Offer the user 2-4 lesson ideas to pick from. Use this when the user asks
    for a lesson, expresses an interest you can build a lesson around, or you
    want to suggest practice options. The user picks one tile and the tutor
    follows up with `generate_lesson_content` for the chosen lesson.

    Do NOT call this and `generate_lesson_content` in the same turn. Wait for
    the user to pick. Do NOT propose lessons whose content you cannot fully
    specify upfront in the per-format hint fields (e.g. for flashcards, the
    full card list must be provided here).

    Args:
        intro: One short conversational line introducing the picker (currently
            persisted but not displayed; useful for analytics).
        proposals: 2 to 4 lesson proposals. Each must include a title, blurb,
            and the per-format generation hints needed to actually generate
            the content if picked (e.g. `cards` for flashcards).

    Returns:
        A confirmation string listing the proposed lessons and their IDs. Keep
        these IDs in mind — when the user picks one, you'll pass the matching
        ID to `generate_lesson_content`.
    """
    app_context = context.context
    session_id = app_context.session_id

    if not (2 <= len(proposals) <= 4):
        return f"Expected 2-4 proposals; got {len(proposals)}."

    user_id = app_context.user.user_id
    if not user_id:
        supabase = get_supabase_admin_client()
        session_response = (
            supabase.table("agent_sessions")
            .select("user_id")
            .eq("session_id", session_id)
            .execute()
        )
        if session_response.data:
            user_id = session_response.data[0]["user_id"]
    if not user_id:
        return "Could not propose lessons — unable to identify the user."

    # Pack format-specific fields into generation_hints so the generator can
    # read them later without us having to extend the lessons schema.
    rows_to_insert = []
    for p in proposals:
        hints: dict = {}
        if p.format == "flashcards":
            if not p.cards:
                return (
                    f"Proposal '{p.title}' is format='flashcards' but has no cards. "
                    "Provide the full card list when proposing a flashcard lesson."
                )
            hints["cards"] = [c.model_dump() for c in p.cards]

        rows_to_insert.append(
            {
                "title": p.title,
                "blurb": p.blurb,
                "arabic_preview": p.arabic_preview,
                "format": p.format,
                "generation_hints": hints,
            }
        )

    proposal_group_id = str(uuid.uuid4())
    inserted = insert_lesson_proposals(
        proposal_group_id=proposal_group_id,
        user_id=user_id,
        session_id=session_id,
        proposals=rows_to_insert,
    )

    summary = ", ".join(f"'{row['title']}' (id: {row['id']})" for row in inserted)
    return json.dumps({
        "status": "ok",
        "proposal_group_id": proposal_group_id,
        "lessons": [
            {
                "id": row["id"],
                "title": row["title"],
                "description": row["blurb"],
                "arabic_preview": row.get("arabic_preview"),
            }
            for row in inserted
        ],
        "instruction": (
            f"Proposed {len(inserted)} lessons: {summary}. "
            "Include a 'lesson-suggestions' message in your response using this "
            "proposal_group_id and the lesson list above. "
            "Wait for the user to pick a tile. When they do, call "
            "`generate_lesson_content` with the matching lesson id."
        ),
    })
