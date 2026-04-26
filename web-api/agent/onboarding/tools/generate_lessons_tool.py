"""Tool: generate_lessons — finalize onboarding and queue the lesson tiles.

Marks `onboarding.completed`, upserts the user's profile row, and queues a
`LessonTiles` ComponentMessage on `app_context.outbox`. The harness drains
the outbox after the turn and persists it as a `message_kind='component'`
transcript_messages row. The handoff text bubble (the agent's "why don't
we start with one of these duroos?" line) is the agent's own assistant
text, persisted by the harness from `result.new_items` — not anything
this tool does.
"""

import json
import sys
from typing import List, Literal, Optional

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel

from harness.components import ComponentMessage
from harness.context import AppContext
from harness.session_manager import get_session
from services.supabase_client import get_supabase_admin_client


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
    tiles: List[LessonTile],
) -> str:
    """
    Render three starter-lesson tiles tailored to the learner's motivation
    and finish onboarding. Call this exactly once, after you have a `name`
    and a `motivation` (or recorded the learner's refusal of either).

    In the SAME response as this tool call, write a short handoff sentence
    (e.g. "why don't we start with one of these duroos?"). That text becomes
    the on-screen bubble shown just above the tile picker — the harness
    persists it automatically. The Arabic word `duroos` (lessons) is tinted
    on screen via flow vocab; you don't need to mark it up.

    Args:
        tiles: Exactly three tiles — one Beginner, one Intermediate, one
            Advanced — each tailored to the learner's stated motivation.
            Each needs a `level`, a short `title` (3–6 words), a one-sentence
            `blurb`, and optionally a single Arabic word/phrase (`arabic`).
    """
    app_context = context.context

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

    props = {"tiles": [t.model_dump() for t in tiles]}

    app_context.outbox.append(
        ComponentMessage(component_name="LessonTiles", props=props)
    )

    app_context.onboarding.collected["suggestions"] = props
    app_context.onboarding.completed = True

    _write_profile(app_context, props)

    return "ok"
