"""Tool: say — emit one tutor chat bubble.

The onboarding agent uses this instead of `final_output` so each visible
line is its own structured message (with optional word-level highlights)
rather than being parsed out of newline-separated free text.
"""

from typing import List, Optional

from agents import RunContextWrapper, function_tool
from pydantic import BaseModel

from harness.context import AppContext
from services.transcript_service import create_transcript_message


class Highlight(BaseModel):
    """Word-level annotation rendered as a hoverable tinted span."""
    word: str
    meaning: str


@function_tool
async def say(
    context: RunContextWrapper[AppContext],
    text: str,
    highlights: Optional[List[Highlight]] = None,
) -> str:
    """
    Speak one chat bubble to the learner. Call 1+ times per turn — each call
    is a separate bubble in the order called.

    Args:
        text: The line to display, in English. Keep it short (1 sentence).
            A single Arabic interjection (marhaban, ahlan, mumtaz, mashallah)
            may appear as flavour but the line is otherwise English. Never
            output Arabic script or a full Arabic sentence.
        highlights: Optional word annotations. Each entry carries the literal
            `word` (must appear verbatim in `text`) and its English `meaning`.
            Mark Arabic interjections this way so the UI shows their meaning
            on hover. Character offsets are computed server-side from `word`.
    """
    app_context = context.context

    resolved: list[dict] = []
    for h in highlights or []:
        idx = text.find(h.word)
        if idx < 0:
            continue
        resolved.append(
            {
                "word": h.word,
                "meaning": h.meaning,
                "start": idx,
                "end": idx + len(h.word),
            }
        )

    await create_transcript_message(
        session_id=app_context.session_id,
        message_source="tutor",
        message_kind="transcript",
        message_text=text,
        highlights=resolved,
        flow="onboarding",
    )
    return "ok"
