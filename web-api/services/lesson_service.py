"""Service for managing lesson rows."""

import uuid
from typing import Any, Optional

from .supabase_client import get_supabase_admin_client


def insert_lesson_proposals(
    proposal_group_id: str,
    user_id: str,
    session_id: Optional[str],
    proposals: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Insert N rows in `status='proposed'` sharing the same proposal_group_id.

    Each entry in `proposals` must include `title` and `objective`.
    """
    rows = [
        {
            "proposal_group_id": proposal_group_id,
            "created_by": user_id,
            "session_id": session_id,
            "title": p["title"],
            "objective": p["objective"],
            "status": "proposed",
        }
        for p in proposals
    ]
    result = get_supabase_admin_client().table("lessons").insert(rows).execute()
    return result.data or []


def insert_suggestion_lesson(
    user_id: str,
    title: str,
    objective: str,
) -> dict[str, Any]:
    """Create a lesson row from an onboarding suggestion tile.

    These lessons have no content yet — they're created when the user confirms a
    tile pick, giving us an ID to navigate to before any activities are generated.
    """
    row = {
        "proposal_group_id": str(uuid.uuid4()),
        "created_by": user_id,
        "title": title,
        "objective": objective,
        "status": "proposed",
    }
    result = get_supabase_admin_client().table("lessons").insert(row).execute()
    return result.data[0]


def get_lesson(lesson_id: str) -> Optional[dict[str, Any]]:
    result = (
        get_supabase_admin_client()
        .table("lessons")
        .select("*")
        .eq("id", lesson_id)
        .maybe_single()
        .execute()
    )
    return result.data


def update_lesson(lesson_id: str, **fields: Any) -> None:
    if not fields:
        return
    get_supabase_admin_client().table("lessons").update(fields).eq("id", lesson_id).execute()


def dismiss_sibling_proposals(proposal_group_id: str, except_id: str) -> None:
    """Mark every still-`proposed` row in the group as `dismissed`, except the chosen one."""
    (
        get_supabase_admin_client()
        .table("lessons")
        .update({"status": "dismissed"})
        .eq("proposal_group_id", proposal_group_id)
        .eq("status", "proposed")
        .neq("id", except_id)
        .execute()
    )
