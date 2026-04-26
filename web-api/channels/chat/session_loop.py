"""Chat-channel session loop.

Reads user messages off the WebSocket and dispatches each into the
chat-channel `dispatch_turn`. Routes that need an opener turn (e.g.
onboarding's greeting) call `dispatch_turn` themselves before invoking
this loop.
"""

import asyncio
import sys
import traceback

from agents import Agent
from fastapi import WebSocket
from fastapi.websockets import WebSocketDisconnect

from channels.chat.connection_manager import Message, send_message
from channels.chat.turn_dispatcher import dispatch_turn
from harness.options import HarnessOptions
from services.transcript_service import create_transcript_message


def _log(msg: str) -> None:
    print(f"[SessionLoop] {msg}", flush=True, file=sys.stderr)


async def start_session_loop(
    websocket: WebSocket,
    session_id: str,
    *,
    agent: Agent,
    options: HarnessOptions,
    synthesize_audio: bool = False,
) -> None:
    """Drive a session until the WebSocket closes."""
    base_timeout = 5.0
    max_followups = 3
    followup_count = 0
    current_timeout = base_timeout

    turn_kwargs = dict(
        agent=agent,
        config=options.turn_config(),
        synthesize_audio=synthesize_audio,
    )

    while True:
        try:
            if options.idle_followups:
                user_message = await asyncio.wait_for(
                    websocket.receive_text(), timeout=current_timeout
                )
                followup_count = 0
                current_timeout = base_timeout
            else:
                user_message = await websocket.receive_text()
        except WebSocketDisconnect:
            return
        except asyncio.TimeoutError:
            if followup_count < max_followups:
                try:
                    await dispatch_turn(session_id, user_message=None, **turn_kwargs)
                except Exception as e:
                    _log(f"Followup turn failed: {e}")
                    traceback.print_exc()
                followup_count += 1
                current_timeout *= 2
            else:
                current_timeout = base_timeout * (2**max_followups)
            continue

        try:
            await create_transcript_message(
                session_id=session_id,
                message_source="user",
                message_kind=options.user_message_kind,
                message_text=user_message,
                flow=options.flow_tag,
            )
        except Exception as e:
            _log(f"Failed to persist user message: {e}")

        try:
            await dispatch_turn(
                session_id, user_message=user_message, **turn_kwargs
            )
        except Exception as e:
            _log(f"Agent turn failed: {e}")
            traceback.print_exc()
            try:
                await send_message(
                    session_id,
                    Message(
                        kind="error",
                        data={"message": f"Agent turn failed: {e}"},
                    ),
                )
            except Exception:
                pass
