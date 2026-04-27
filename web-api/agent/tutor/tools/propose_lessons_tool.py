"""Tool: propose_lessons — offer the user a few lesson ideas to pick from.

Inserts one `lessons` row per proposal in `status='proposed'`, all sharing a
`proposal_group_id`. Then emits a `message_kind='component'` transcript message
pointing at that group; the frontend's LessonProposalTiles component subscribes
to the group via realtime and renders the tiles.

The user picks a tile by clicking it, which navigates them to the lesson page
(/lesson/{id}) where a dedicated tutor session begins. This tool does no content
generation — lessons are objective definitions, not content bundles.
"""

import json
import uuid
from typing import Optional

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel, Field

from harness.context import AppContext
from services.lesson_service import insert_lesson_proposals
from services.supabase_client import get_supabase_admin_client


class LessonProposal(BaseModel):
    """One proposed lesson the user could pick."""
    title: str = Field(..., description="Short, evocative title shown on the tile (e.g. 'Days of the Week').")
    objective: str = Field(..., description="One sentence stating what the learner will be able to do after this lesson.")


@function_tool
async def propose_lessons(
    context: RunContextWrapper[AppContext],
    intro: str,
    proposals: list[LessonProposal],
) -> str:
    """
    Offer the user 2-4 lesson ideas to pick from. Use this when the user asks
    for a lesson, expresses an interest you can build a lesson around, or you
    want to suggest practice options.

    Each proposal is a learning objective — title, objective, and optional level.
    The user picks a tile by clicking it, which takes them to a dedicated lesson
    page. You do not need to call any follow-up tool after proposing.

    Args:
        intro: One short conversational line introducing the picker.
        proposals: 2 to 4 lesson proposals, each with a title and objective.

    Returns:
        Confirmation string with the proposal_group_id and lesson list.
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

    rows_to_insert = [
        {"title": p.title, "objective": p.objective}
        for p in proposals
    ]

    proposal_group_id = str(uuid.uuid4())
    inserted = insert_lesson_proposals(
        proposal_group_id=proposal_group_id,
        user_id=user_id,
        session_id=session_id,
        proposals=rows_to_insert,
    )

    return json.dumps({
        "status": "ok",
        "proposal_group_id": proposal_group_id,
        "lessons": [
            {
                "id": row["id"],
                "title": row["title"],
                "objective": row["objective"],
            }
            for row in inserted
        ],
        "instruction": (
            f"Proposed {len(inserted)} lessons. "
            "Include a 'lesson-suggestions' message in your response using this "
            "proposal_group_id and the lesson list above. "
            "The user picks a tile by clicking it — no further tool call is needed from you."
        ),
    })
