"""Tool: record_profile — persist the learner's name and motivation mid-conversation.

Called by the onboarding agent once it has collected both pieces of info (or
accepted a refusal for either). Stores them in the session context so that
`generate_lessons` can include them in the final profile upsert, and also
writes an early partial row to the profiles table so the data is never lost
even if the session ends before the learner picks a lesson.
"""

import sys
from typing import Optional

from agents import RunContextWrapper, function_tool

from harness.context import AppContext
from harness.session_manager import get_session
from services.supabase_client import get_supabase_admin_client


def _log(msg: str) -> None:
    print(f"[record_profile] {msg}", flush=True, file=sys.stderr)


@function_tool
def record_profile(
    context: RunContextWrapper[AppContext],
    name: Optional[str],
    motivation: Optional[str],
) -> str:
    """
    Store the learner's name and motivation so they are available for the
    final profile upsert when `generate_lessons` is called.

    Call this as soon as you have both pieces of information (or a refusal
    for either). Do NOT wait until you call `generate_lessons`.

    Args:
        name: The learner's first name as they gave it, or null if they declined.
        motivation: A short phrase capturing why they want to learn Arabic,
            or null if they declined to say.
    """
    app_context = context.context
    if not app_context:
        return "ok"

    app_context.onboarding.collected["name"] = name
    app_context.onboarding.collected["motivation"] = motivation

    # Early partial write so the name survives even if the session drops
    # before generate_lessons is called.
    session = get_session(app_context.session_id)
    user_id = getattr(getattr(session, "user", None), "id", None)
    if user_id and name:
        try:
            get_supabase_admin_client().table("profiles").upsert(
                {"id": user_id, "name": name, "motivation": motivation},
                on_conflict="id",
            ).execute()
            _log(f"Early profile write for user {user_id}: name={name!r}")
        except Exception as e:
            _log(f"Early profile write failed: {e}")

    return "ok"
