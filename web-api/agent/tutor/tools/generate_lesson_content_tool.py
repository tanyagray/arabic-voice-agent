"""Tool: generate_lesson_content — generate the content for a picked lesson.

Drives the lesson state machine for the chosen tile:

    proposed -> generating -> ready  (siblings -> dismissed)

Dispatches generation by reading the format's `generator_handler` from
`lesson_formats` and calling it. The handler creates the format-specific
content rows (e.g. a `flashcard_sets` + `flashcards`) and returns the link.
This tool then populates the lesson's polymorphic `content_table` /
`content_id` and emits the format-appropriate transcript message so the
frontend renders the new content (e.g. a flashcard deck bubble).
"""

import json
import traceback

from agents import RunContextWrapper, function_tool

from harness.context import AppContext
from services.lesson_service import (
    dismiss_sibling_proposals,
    get_lesson,
    get_lesson_format,
    resolve_generator,
    update_lesson,
)
from services.supabase_client import get_supabase_admin_client


@function_tool
async def generate_lesson_content(
    context: RunContextWrapper[AppContext],
    lesson_id: str,
) -> str:
    """
    Generate the actual content for a previously-proposed lesson and present it
    to the user. Call this only after `propose_lessons` has been called and the
    user has picked one of the tiles. Pass the lesson_id of the picked tile,
    which was returned from `propose_lessons`.

    This tool dismisses the sibling proposals, generates the format-specific
    content (e.g. flashcards), and emits the rendered content into the chat.

    Args:
        lesson_id: The UUID of the lesson the user picked.

    Returns:
        Confirmation string. After this returns, do not produce any further
        commentary — let the rendered lesson speak for itself.
    """
    app_context = context.context
    session_id = app_context.session_id

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
        return "Could not generate the lesson — unable to identify the user."

    lesson = get_lesson(lesson_id)
    if not lesson:
        return f"No lesson found with id {lesson_id}."
    if lesson["created_by"] != user_id:
        return "That lesson does not belong to the current user."
    if lesson["status"] != "proposed":
        return (
            f"Lesson {lesson_id} is in status '{lesson['status']}', not 'proposed'. "
            "It can't be generated again."
        )

    fmt = get_lesson_format(lesson["format"])
    if not fmt or not fmt.get("enabled"):
        return f"Lesson format '{lesson['format']}' is not available."

    update_lesson(lesson_id, status="generating", error=None)
    dismiss_sibling_proposals(
        proposal_group_id=lesson["proposal_group_id"],
        except_id=lesson_id,
    )

    try:
        handler = resolve_generator(fmt["generator_handler"])
        content_table, content_id = await handler(app_context, lesson)
    except Exception as exc:
        traceback.print_exc()
        update_lesson(lesson_id, status="failed", error=str(exc))
        return f"Sorry, generating that lesson failed: {exc}"

    update_lesson(
        lesson_id,
        status="ready",
        content_table=content_table,
        content_id=content_id,
    )

    if lesson["format"] == "flashcards":
        return json.dumps({
            "status": "ok",
            "format": "flashcards",
            "set_id": content_id,
            "title": lesson["title"],
            "language": app_context.agent.language,
            "instruction": (
                f"Include a 'flashcard-set' message in your response with "
                f"set_id='{content_id}', title='{lesson['title']}', "
                f"language='{app_context.agent.language}'. "
                "Do not produce any additional text commentary."
            ),
        })
    else:
        # Future formats: extend this dispatch as new renderers land.
        return (
            f"Generated lesson '{lesson['title']}' but no transcript renderer "
            f"is wired up for format '{lesson['format']}' yet."
        )
