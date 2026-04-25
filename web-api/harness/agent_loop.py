"""Run a single agent turn and emit all of its side-effects.

Transport-agnostic: takes a session_id and the per-turn knobs, drives the
agent via `Runner.run`, persists messages, broadcasts context, and runs
scaffolding/TTS/analytics. The WebSocket receive loop lives in
`channels/rest/websocket/session_loop.py`.
"""

import sys
import time
from typing import Optional

from agents import Agent, Runner, RunConfig

from harness.context import get_context
from harness.scaffolding import generate_scaffolded_text
from harness.session_manager import get_session
from services import posthog_service
from services.tts_service import get_tts_service
from services.transcript_service import create_transcript_message
from services.websocket_service import (
    Message,
    send_audio_message,
    send_message,
)


def _log(msg: str) -> None:
    print(f"[AgentLoop] {msg}", flush=True, file=sys.stderr)


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


async def broadcast_context(session_id: str) -> None:
    context = get_context(session_id)
    if context:
        await send_message(
            session_id,
            Message(kind="context", data=context.model_dump(mode="json")),
        )


async def trigger_turn(
    session_id: str,
    user_message: Optional[str] = None,
    *,
    agent: Agent,
    scaffold: bool = False,
    tts: bool = False,
    persist_final_output: bool = True,
    flow_tag: Optional[str] = None,
    user_none_system_prompt: Optional[str] = None,
) -> None:
    """Run one full agent turn and emit all side-effects."""
    t_start = time.monotonic()

    text_response = await _run_agent(
        agent, session_id, user_message, user_none_system_prompt
    )
    t_after_llm = time.monotonic()

    scaffolded_response = text_response
    if scaffold and text_response.strip():
        scaffolded_response = await generate_scaffolded_text(
            text_response, user_message=user_message
        )
    t_after_scaffolding = time.monotonic()

    if persist_final_output and text_response.strip():
        try:
            transcript_message = await create_transcript_message(
                session_id=session_id,
                message_source="tutor",
                message_kind="text",
                message_text=scaffolded_response,
                message_text_canonical=text_response if scaffold else None,
                flow=flow_tag,
            )
            await send_message(
                session_id,
                Message(
                    kind="transcript",
                    data=transcript_message.model_dump(mode="json"),
                ),
            )
        except Exception as e:
            _log(f"Failed to persist tutor message: {e}")
            await send_message(
                session_id,
                Message(
                    kind="transcript",
                    data={"source": "tutor", "text": scaffolded_response},
                ),
            )

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
                "flow": flow_tag,
                "total_ms": round((t_after_scaffolding - t_start) * 1000, 1),
                "llm_ms": round((t_after_llm - t_start) * 1000, 1),
                "scaffolding_ms": round(
                    (t_after_scaffolding - t_after_llm) * 1000, 1
                ),
                "tts_ms": None,
                "language": context.agent.language if context else "ar-AR",
            },
        )
    except Exception as e:
        _log(f"Analytics capture failed: {e}")

    if tts:
        context = get_context(session_id)
        if context and context.agent.audio_enabled and text_response.strip():
            try:
                tts_service = get_tts_service()
                audio_bytes = await tts_service.generate_audio(
                    text_response, context.agent.language
                )
                if audio_bytes:
                    audio_base64 = tts_service.encode_audio_base64(audio_bytes)
                    await send_audio_message(
                        session_id, audio_base64, format="mp3"
                    )
            except Exception as e:
                _log(f"TTS failed: {e}")

    await broadcast_context(session_id)
