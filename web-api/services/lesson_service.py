"""Service for managing lesson rows and their format-specific content."""

import importlib
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

    Each `proposals` entry must include `title`, `blurb`, and `format`, and may
    include `arabic_preview` and `generation_hints`.
    """
    rows = [
        {
            "proposal_group_id": proposal_group_id,
            "created_by": user_id,
            "session_id": session_id,
            "title": p["title"],
            "blurb": p["blurb"],
            "arabic_preview": p.get("arabic_preview"),
            "format": p["format"],
            "generation_hints": p.get("generation_hints") or {},
            "status": "proposed",
        }
        for p in proposals
    ]
    result = get_supabase_admin_client().table("lessons").insert(rows).execute()
    return result.data or []


def insert_ready_lesson(
    user_id: str,
    session_id: Optional[str],
    title: str,
    blurb: str,
    fmt: str,
    content_table: str,
    content_id: str,
    arabic_preview: Optional[str] = None,
    generation_hints: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Insert a `status='ready'` row with content already linked.

    Used by the direct-path flashcards tool, which generates content first and
    only then records the lesson — there's no proposal cycle to go through.
    Each direct lesson is a singleton proposal group of size 1.
    """
    row = {
        "proposal_group_id": str(uuid.uuid4()),
        "created_by": user_id,
        "session_id": session_id,
        "title": title,
        "blurb": blurb,
        "arabic_preview": arabic_preview,
        "format": fmt,
        "generation_hints": generation_hints or {},
        "content_table": content_table,
        "content_id": content_id,
        "status": "ready",
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


def get_lesson_format(slug: str) -> Optional[dict[str, Any]]:
    result = (
        get_supabase_admin_client()
        .table("lesson_formats")
        .select("*")
        .eq("slug", slug)
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


def resolve_generator(handler_path: str):
    """Resolve a dotted path like 'agent.tutor.tools.generators.flashcards.generate'
    to the callable, importing the module if necessary."""
    module_path, _, attr = handler_path.rpartition(".")
    if not module_path or not attr:
        raise ValueError(f"Invalid generator handler path: {handler_path!r}")
    module = importlib.import_module(module_path)
    return getattr(module, attr)
