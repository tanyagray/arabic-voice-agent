"""Run an agent turn and emit the result to the WebSocket channel.

`dispatch_turn` is the WS-channel-specific wrapper around
`harness.turn.run_turn`. It pushes the persisted transcript to the
client, optionally synthesizes TTS audio, and broadcasts the latest
context. Other channels (Pipecat voice, future REST/WhatsApp) wrap
`run_turn` their own way.
"""

import sys
import traceback
from typing import Optional

from agents import Agent

from harness.context import get_context
from harness.turn import TurnConfig, TurnResult, run_turn
from services.tts_service import get_tts_service
from services.websocket_service import (
    Message,
    send_audio_message,
    send_message,
)


def _log(msg: str) -> None:
    print(f"[WSDispatcher] {msg}", flush=True, file=sys.stderr)


async def dispatch_turn(
    session_id: str,
    user_message: Optional[str] = None,
    *,
    agent: Agent,
    config: TurnConfig,
    synthesize_audio: bool = False,
) -> TurnResult:
    """Run a turn and emit it over the WebSocket."""
    result = await run_turn(
        session_id, user_message, agent=agent, config=config
    )

    await _send_transcript(session_id, result, config)

    if synthesize_audio:
        await _maybe_synthesize_audio(session_id, result)

    await broadcast_context(session_id)
    return result


async def _send_transcript(
    session_id: str, result: TurnResult, config: TurnConfig
) -> None:
    if result.persisted_message:
        await send_message(
            session_id,
            Message(
                kind="transcript",
                data=result.persisted_message.model_dump(mode="json"),
            ),
        )
        return

    # Persist failed (or was disabled) but we still have visible text —
    # send a degraded payload so the user isn't stuck waiting.
    if config.persist_final_output and result.display_text.strip():
        await send_message(
            session_id,
            Message(
                kind="transcript",
                data={"source": "tutor", "text": result.display_text},
            ),
        )


async def _maybe_synthesize_audio(
    session_id: str, result: TurnResult
) -> None:
    context = get_context(session_id)
    if not (
        context
        and context.agent.audio_enabled
        and result.canonical_text.strip()
    ):
        return
    try:
        tts_service = get_tts_service()
        audio_bytes = await tts_service.generate_audio(
            result.canonical_text, context.agent.language
        )
        if audio_bytes:
            audio_base64 = tts_service.encode_audio_base64(audio_bytes)
            await send_audio_message(session_id, audio_base64, format="mp3")
    except Exception as e:
        _log(f"TTS failed: {e}")
        traceback.print_exc()


async def broadcast_context(session_id: str) -> None:
    context = get_context(session_id)
    if context:
        await send_message(
            session_id,
            Message(kind="context", data=context.model_dump(mode="json")),
        )
