"""Tool: generate_lessons — finalize onboarding and return lesson tile data.

Marks `onboarding.completed`, upserts the user's profile row, and returns the
tile data as JSON so the agent can include a `lesson-suggestions` message in
its structured response. The agent is responsible for emitting both the handoff
text bubble and the lesson-suggestions message in the same response.
"""

import json
import sys
from typing import List, Literal, Optional

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel

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
    objective: str


@function_tool
async def generate_lessons(
    context: RunContextWrapper[AppContext],
    tiles: List[LessonTile],
) -> str:
    """
    Render three starter-lesson tiles tailored to the learner's motivation
    and finish onboarding. Call this exactly once, after you have a `name`
    and a `motivation` (or recorded the learner's refusal of either).

    After this tool returns, include BOTH a `text` message (your handoff
    sentence using 'duroos') AND a `lesson-suggestions` message (using the
    tile data from this tool's response) in your structured JSON response.

    Args:
        tiles: Exactly three tiles — one Beginner, one Intermediate, one
            Advanced — each tailored to the learner's stated motivation.
            Each needs a `level`, a short `title` (3–6 words), and a one-sentence
            `objective` stating what the learner will be able to do.
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

    app_context.onboarding.collected["suggestions"] = props
    app_context.onboarding.completed = True

    _write_profile(app_context, props)

    return json.dumps({
        "status": "ok",
        "lessons": [
            {
                "title": t.title,
                "objective": t.objective,
            }
            for t in tiles
        ],
        "instruction": (
            "Include a 'lesson-suggestions' message in your response with these lessons. "
            "Your text message should be only the handoff sentence using 'duroos'."
        ),
    })
