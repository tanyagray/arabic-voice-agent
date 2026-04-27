"""Run a single agent turn — channel-agnostic.

`run_turn` invokes the agent, processes its structured `AgentResponse`, applies
per-type transforms (scaffolding, highlights), and persists every message.  It
returns a `TurnResult` listing the persisted rows.  It does no channel I/O.

The harness owns `transcript_messages`.  Every message in the agent's response
lands here:

- **text** bubbles are optionally scaffolded (Arabic → Arabizi) and tagged
  with flow-vocab highlights, then persisted as `message_kind='text'`.

- **lesson-suggestions** bubbles are persisted as `message_kind='component'`
  rows so the frontend can render the appropriate picker UI.

- **image** bubbles are persisted as `message_kind='component'` rows.

Tools never call `create_transcript_message` themselves (except `generate_flashcards`
which predates this pattern and still writes its own component row directly).
"""

import json
import sys
import time
from dataclasses import dataclass, field
from typing import Optional

from agents import Agent, Runner, RunConfig

from harness.context import get_context
from harness.highlights import compute_highlights
from harness.response import (
    AgentResponse,
    FlashcardSetMessage,
    ImageMessage,
    LessonSuggestionsMessage,
    TextMessage,
)
from harness.scaffolding import generate_scaffolded_text
from harness.session_manager import get_session
from services import posthog_service
from services.transcript_service import TranscriptMessage, create_transcript_message


def _log(msg: str) -> None:
    print(f"[Turn] {msg}", flush=True, file=sys.stderr)


@dataclass(frozen=True)
class TurnConfig:
    """Per-turn behaviour. Decoupled from delivery channel."""

    scaffold: bool = False
    flow_tag: Optional[str] = None
    user_none_system_prompt: Optional[str] = None


@dataclass
class TurnResult:
    """Outcome of one agent turn — channels render this however they want."""

    # Concatenated canonical text from all text bubbles, for TTS / analytics.
    canonical_text: str
    # Concatenated display text (post-scaffold), for the WebSocket "degraded"
    # fallback path when persistence has nothing to surface.
    display_text: str
    persisted_messages: list[TranscriptMessage] = field(default_factory=list)
    timings: dict[str, float] = field(default_factory=dict)


async def _run_agent(
    agent: Agent,
    session_id: str,
    user_message: Optional[str],
    user_none_system_prompt: Optional[str],
):
    """Invoke the agent for one turn. Returns the SDK RunResult."""
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session not found: {session_id}")
    context = get_context(session_id)

    if user_message is not None:
        return await Runner.run(
            agent, user_message, session=session, context=context
        )

    system_prompt = user_none_system_prompt or "Continue the conversation appropriately."
    system_message = {"role": "system", "content": system_prompt}

    def session_input_callback(history, new_input):
        return history + new_input

    run_config = RunConfig(session_input_callback=session_input_callback)
    return await Runner.run(
        agent,
        [system_message],
        session=session,
        context=context,
        run_config=run_config,
    )


async def _persist_text_message(
    session_id: str,
    msg: TextMessage,
    config: TurnConfig,
    user_message: Optional[str],
) -> tuple[Optional[TranscriptMessage], str, str]:
    """Scaffold, highlight, and persist one text message. Returns (row, canonical, display)."""
    canonical = msg.content.text.strip()
    if not canonical:
        return None, "", ""

    if config.scaffold:
        scaffolded = await generate_scaffolded_text(canonical, user_message=user_message)
        display = scaffolded.text
        highlights = scaffolded.highlights
    else:
        display = canonical
        highlights = compute_highlights(display, config.flow_tag)

    try:
        row = await create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="text",
            message_text=display,
            message_text_canonical=canonical if config.scaffold else None,
            highlights=highlights,
            flow=config.flow_tag,
        )
    except Exception as e:
        _log(f"Failed to persist text message: {e}")
        return None, canonical, display
    return row, canonical, display


async def _persist_lesson_suggestions_message(
    session_id: str,
    msg: LessonSuggestionsMessage,
    config: TurnConfig,
) -> Optional[TranscriptMessage]:
    """Persist a lesson-suggestions message as a component row."""
    content = msg.content
    if content.proposal_group_id:
        # Tutor proposal flow — frontend subscribes via realtime using the group ID.
        props = {
            "proposal_group_id": content.proposal_group_id,
            "lessons": [l.model_dump(exclude_none=True) for l in content.lessons],
        }
        component_name = "LessonProposalTiles"
    else:
        # Onboarding lesson flow — rendered inline. Map to the shape LessonTiles expects:
        # {lessons: [{level, title, blurb, arabic}]}
        props = {
            "lessons": [
                {
                    "level": l.level,
                    "title": l.title,
                    "blurb": l.description,
                    "arabic": l.arabic_preview,
                }
                for l in content.lessons
            ],
        }
        component_name = "LessonTiles"

    try:
        return await create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="component",
            message_text=json.dumps({"component_name": component_name, "props": props}),
            flow=config.flow_tag,
        )
    except Exception as e:
        _log(f"Failed to persist lesson-suggestions message: {e}")
        return None


async def _persist_image_message(
    session_id: str,
    msg: ImageMessage,
    config: TurnConfig,
) -> Optional[TranscriptMessage]:
    """Persist an image message as a component row."""
    props = {
        "url": msg.content.url,
        "alt_text": msg.content.alt_text,
        "language": msg.content.language,
    }
    try:
        return await create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="component",
            message_text=json.dumps({"component_name": "Image", "props": props}),
            flow=config.flow_tag,
        )
    except Exception as e:
        _log(f"Failed to persist image message: {e}")
        return None


async def _persist_flashcard_set_message(
    session_id: str,
    msg: FlashcardSetMessage,
    config: TurnConfig,
) -> Optional[TranscriptMessage]:
    """Persist a flashcard-set message as a flash_cards row (frontend expects this kind)."""
    try:
        return await create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="flash_cards",
            message_text=json.dumps({"set_id": msg.content.set_id, "title": msg.content.title}),
            flow=config.flow_tag,
        )
    except Exception as e:
        _log(f"Failed to persist flashcard-set message: {e}")
        return None


def _record_analytics(
    session_id: str,
    timings: dict[str, float],
    config: TurnConfig,
) -> None:
    try:
        session = get_session(session_id)
        user = getattr(session, "user", None) if session else None
        context = get_context(session_id)
        posthog_service.capture(
            distinct_id=user.id if user else session_id,
            event="agent_response_completed",
            properties={
                "session_id": session_id,
                "mode": "text_websocket",
                "flow": config.flow_tag,
                "total_ms": timings.get("total_ms"),
                "llm_ms": timings.get("llm_ms"),
                "scaffolding_ms": timings.get("scaffolding_ms"),
                "tts_ms": None,
                "language": context.agent.language if context else "ar-AR",
            },
        )
    except Exception as e:
        _log(f"Analytics capture failed: {e}")


async def run_turn(
    session_id: str,
    user_message: Optional[str] = None,
    *,
    agent: Agent,
    config: TurnConfig,
) -> TurnResult:
    """Run one agent turn end-to-end and return the result."""
    t_start = time.monotonic()

    run_result = await _run_agent(
        agent, session_id, user_message, config.user_none_system_prompt
    )
    t_after_llm = time.monotonic()

    response: AgentResponse = run_result.final_output

    persisted: list[TranscriptMessage] = []
    canonical_parts: list[str] = []
    display_parts: list[str] = []

    for msg in response.messages:
        if isinstance(msg, TextMessage):
            row, canonical, display = await _persist_text_message(
                session_id, msg, config, user_message
            )
            if row is not None:
                persisted.append(row)
            if canonical:
                canonical_parts.append(canonical)
            if display:
                display_parts.append(display)

        elif isinstance(msg, LessonSuggestionsMessage):
            row = await _persist_lesson_suggestions_message(session_id, msg, config)
            if row is not None:
                persisted.append(row)

        elif isinstance(msg, ImageMessage):
            row = await _persist_image_message(session_id, msg, config)
            if row is not None:
                persisted.append(row)

        elif isinstance(msg, FlashcardSetMessage):
            row = await _persist_flashcard_set_message(session_id, msg, config)
            if row is not None:
                persisted.append(row)

    t_after_scaffold = time.monotonic()

    timings = {
        "total_ms": round((t_after_scaffold - t_start) * 1000, 1),
        "llm_ms": round((t_after_llm - t_start) * 1000, 1),
        "scaffolding_ms": round((t_after_scaffold - t_after_llm) * 1000, 1),
    }
    _record_analytics(session_id, timings, config)

    return TurnResult(
        canonical_text=" ".join(canonical_parts),
        display_text=" ".join(display_parts),
        persisted_messages=persisted,
        timings=timings,
    )
