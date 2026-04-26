"""Run a single agent turn — channel-agnostic.

`run_turn` invokes the agent, optionally scaffolds the output, persists
the resulting tutor message, and records analytics. It returns a
`TurnResult` describing what happened. It does no channel I/O — no
WebSocket sends, no TTS — those are the channel's job.
"""

import sys
import time
from dataclasses import dataclass, field
from typing import Optional

from agents import Agent, Runner, RunConfig

from harness.context import get_context
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
    persist_final_output: bool = True
    flow_tag: Optional[str] = None
    user_none_system_prompt: Optional[str] = None


@dataclass
class TurnResult:
    """Outcome of one agent turn — channels render this however they want."""

    canonical_text: str
    display_text: str
    highlights: list[dict] = field(default_factory=list)
    persisted_message: Optional[TranscriptMessage] = None
    timings: dict[str, float] = field(default_factory=dict)


async def _run_agent(
    agent: Agent,
    session_id: str,
    user_message: Optional[str],
    user_none_system_prompt: Optional[str],
) -> str:
    """Invoke the agent for one turn. Returns its final_output text."""
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session not found: {session_id}")
    context = get_context(session_id)

    if user_message is not None:
        result = await Runner.run(
            agent, user_message, session=session, context=context
        )
        return result.final_output or ""

    system_prompt = user_none_system_prompt or "Continue the conversation appropriately."
    system_message = {"role": "system", "content": system_prompt}

    def session_input_callback(history, new_input):
        return history + new_input

    run_config = RunConfig(session_input_callback=session_input_callback)
    result = await Runner.run(
        agent,
        [system_message],
        session=session,
        context=context,
        run_config=run_config,
    )
    return result.final_output or ""


async def _maybe_scaffold(
    canonical_text: str,
    user_message: Optional[str],
    config: TurnConfig,
) -> tuple[str, list[dict]]:
    if not (config.scaffold and canonical_text.strip()):
        return canonical_text, []
    scaffolded = await generate_scaffolded_text(
        canonical_text, user_message=user_message
    )
    return scaffolded.text, scaffolded.highlights


async def _maybe_persist(
    session_id: str,
    canonical_text: str,
    display_text: str,
    config: TurnConfig,
) -> Optional[TranscriptMessage]:
    if not (config.persist_final_output and canonical_text.strip()):
        return None
    try:
        return await create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="text",
            message_text=display_text,
            message_text_canonical=canonical_text if config.scaffold else None,
            flow=config.flow_tag,
        )
    except Exception as e:
        _log(f"Failed to persist tutor message: {e}")
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

    canonical_text = await _run_agent(
        agent, session_id, user_message, config.user_none_system_prompt
    )
    t_after_llm = time.monotonic()

    display_text, highlights = await _maybe_scaffold(
        canonical_text, user_message, config
    )
    t_after_scaffold = time.monotonic()

    persisted = await _maybe_persist(
        session_id, canonical_text, display_text, config
    )

    timings = {
        "total_ms": round((t_after_scaffold - t_start) * 1000, 1),
        "llm_ms": round((t_after_llm - t_start) * 1000, 1),
        "scaffolding_ms": round((t_after_scaffold - t_after_llm) * 1000, 1),
    }
    _record_analytics(session_id, timings, config)

    return TurnResult(
        canonical_text=canonical_text,
        display_text=display_text,
        highlights=highlights,
        persisted_message=persisted,
        timings=timings,
    )
