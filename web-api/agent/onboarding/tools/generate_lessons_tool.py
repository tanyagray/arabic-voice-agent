"""Tool: generate_lessons — emit the lesson-tile UI and finish onboarding.

Persists a `message_kind='component'` transcript message whose `message_text`
is the JSON payload `{"component_name": "LessonTiles", "props": {intro, tiles}}`.
The frontend's TranscriptComponents registry renders this into the three-tile
picker. Calling this tool also marks onboarding as `completed` and upserts
the profile row from `app_context.onboarding.collected`.
"""

import json
import sys
from typing import List, Literal, Optional

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel

from harness.context import AppContext
from harness.session_manager import get_session
from services.supabase_client import get_supabase_admin_client
from services.transcript_service import create_transcript_message


def _log(msg: str) -> None:
    print(f"[generate_lessons] {msg}", flush=True, file=sys.stderr)


def _write_profile(app_context: AppContext, props: dict) -> None:
    session = get_session(app_context.session_id)
    user_id = getattr(getattr(session, "user", None), "id", None)
    if not user_id:
        _log(f"No user_id on session {app_context.session_id}; skipping profile write")
        return

    collected = app_context.onboarding.collected
    name_data = collected.get("name") or {}
    motivation_data = collected.get("motivation") or {}

    row: dict[str, Optional[str]] = {
        "id": user_id,
        "name": name_data.get("name") if isinstance(name_data, dict) else None,
        "motivation": motivation_data.get("acknowledgement")
        if isinstance(motivation_data, dict)
        else None,
        "motivation_tag": motivation_data.get("motivation_tag")
        if isinstance(motivation_data, dict)
        else None,
        "interests": json.dumps(props),
        "onboarding_completed_at": app_context.updated_at.isoformat(),
    }

    try:
        get_supabase_admin_client().table("profiles").upsert(
            row, on_conflict="id"
        ).execute()
        _log(f"Persisted profile for user {user_id}")
    except Exception as e:
        _log(f"Failed to persist profile: {e}")


class LessonTile(BaseModel):
    """One starter-lesson tile."""
    level: Literal["Beginner", "Intermediate", "Advanced"]
    title: str
    blurb: str
    arabic: Optional[str] = None


@function_tool
async def generate_lessons(
    context: RunContextWrapper[AppContext],
    intro: str,
    tiles: List[LessonTile],
) -> str:
    """
    Render three starter-lesson tiles tailored to the learner's motivation
    and mark onboarding complete. Call this exactly once, after you have a
    `name` and a `motivation` (or recorded the learner's refusal of either).

    Args:
        intro: One short line to introduce the picker. Currently not displayed
            on screen but persisted for analytics; keep it warm and concrete.
        tiles: Exactly three tiles — one Beginner, one Intermediate, one
            Advanced — each tailored to the learner's stated motivation.
    """
    app_context = context.context
    session_id = app_context.session_id

    if app_context.onboarding.completed:
        return "Onboarding is already complete; do not call generate_lessons again."

    if len(tiles) != 3:
        return f"Expected exactly 3 tiles (one per level); got {len(tiles)}."

    levels_seen = {t.level for t in tiles}
    if levels_seen != {"Beginner", "Intermediate", "Advanced"}:
        return (
            "Tiles must cover each level exactly once "
            "(Beginner, Intermediate, Advanced)."
        )

    props = {
        "intro": intro,
        "tiles": [t.model_dump() for t in tiles],
    }

    await create_transcript_message(
        session_id=session_id,
        message_source="tutor",
        message_kind="component",
        message_text=json.dumps(
            {"component_name": "LessonTiles", "props": props}
        ),
        flow="onboarding",
    )

    app_context.onboarding.collected["suggestions"] = props
    app_context.onboarding.completed = True

    _write_profile(app_context, props)

    return (
        "Lessons rendered and onboarding marked complete. Do NOT call any "
        "more tools and do NOT produce any text — the tiles carry the moment."
    )
