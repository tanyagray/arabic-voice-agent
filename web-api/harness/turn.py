"""Run a single agent turn — channel-agnostic.

`run_turn` invokes the agent, optionally scaffolds each text output, and
persists every visible bubble the turn produced. It returns a `TurnResult`
listing the persisted rows. It does no channel I/O — no WebSocket sends,
no TTS — those are the channel's job.

The harness owns `transcript_messages`. Two sources land here:

- **Text bubbles** come from any `MessageOutputItem` in `result.new_items`
  (the LLM's assistant text, including text emitted alongside a tool call).
  Each one becomes a `message_kind='text'` row, optionally scaffolded
  (Arabic → Arabizi) and tagged with flow-vocab highlights.

- **Component bubbles** come from `app_context.outbox`, which tools fill
  during the run by appending `ComponentMessage` instances. Each one
  becomes a `message_kind='component'` row.

Tools never call `create_transcript_message` themselves.
"""

import json
import sys
import time
from dataclasses import dataclass, field
from typing import Optional

from agents import Agent, Runner, RunConfig
from agents.items import ItemHelpers, MessageOutputItem

from harness.context import get_context
from harness.highlights import compute_highlights
from harness.scaffolding import generate_scaffolded_text
from harness.session_manager import get_session
from services import posthog_service
from services.transcript_service import TranscriptMessage, create_transcript_message


def _log(msg: str) -> None:
    print(f"[Turn] {msg}", flush=True, file=sys.stderr)


@dataclass(frozen=True)
class TurnConfig:
    """Per-turn behavior. Decoupled from delivery channel."""

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


async def _persist_text_item(
    session_id: str,
    canonical_text: str,
    config: TurnConfig,
    user_message: Optional[str],
) -> tuple[Optional[TranscriptMessage], str, str]:
    """Persist one assistant-text item. Returns (row, canonical, display)."""
    canonical = canonical_text.strip()
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
        _log(f"Failed to persist tutor text message: {e}")
        return None, canonical, display
    return row, canonical, display


async def _persist_component_messages(
    session_id: str,
    config: TurnConfig,
) -> list[TranscriptMessage]:
    """Drain the context outbox and persist each queued ComponentMessage."""
    context = get_context(session_id)
    if not context or not context.outbox:
        return []
    queued = context.outbox
    context.outbox = []
    rows: list[TranscriptMessage] = []
    for cm in queued:
        try:
            row = await create_transcript_message(
                session_id=session_id,
                message_source="tutor",
                message_kind="component",
                message_text=json.dumps(
                    {"component_name": cm.component_name, "props": cm.props}
                ),
                flow=config.flow_tag,
            )
            rows.append(row)
        except Exception as e:
            _log(f"Failed to persist component message {cm.component_name}: {e}")
    return rows


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

    persisted: list[TranscriptMessage] = []
    canonical_parts: list[str] = []
    display_parts: list[str] = []

    for item in run_result.new_items:
        if not isinstance(item, MessageOutputItem):
            continue
        text = ItemHelpers.text_message_output(item)
        row, canonical, display = await _persist_text_item(
            session_id, text, config, user_message
        )
        if row is not None:
            persisted.append(row)
        if canonical:
            canonical_parts.append(canonical)
        if display:
            display_parts.append(display)

    t_after_scaffold = time.monotonic()

    persisted.extend(await _persist_component_messages(session_id, config))

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
