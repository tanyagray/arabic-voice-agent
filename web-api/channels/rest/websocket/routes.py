"""WebSocket session routes — tutor and onboarding.

Both endpoints share the same accept/auth/register boilerplate. They differ
only in the agent and its `harness_options`, which the agent module owns.
"""

import sys
import traceback

from agents import Agent
from fastapi import APIRouter, WebSocket
from fastapi.websockets import WebSocketDisconnect

from agent.onboarding import onboarding_agent as onboarding_module
from agent.tutor import tutor_agent as tutor_module
from channels.rest.websocket import connection_manager as websocket_service
from channels.rest.websocket.session_loop import start_session_loop
from harness import session_manager as session_service
from harness.agent_loop import trigger_turn
from harness.options import HarnessOptions
from services.websocket_service import Message, send_message


router = APIRouter(tags=["Session"])


async def _open_session(
    websocket: WebSocket,
    session_id: str,
    *,
    agent: Agent,
    options: HarnessOptions,
) -> None:
    """Shared boilerplate: accept WS, validate token, register, run loop."""
    await websocket.accept()

    try:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.send_json({
                "kind": "error",
                "data": {"message": "Missing authentication token. Provide token as query parameter."},
            })
            await websocket.close(code=1008, reason="Missing authentication token")
            return

        session = session_service.get_session(session_id, user_access_token=token)
        if not session:
            await websocket.send_json({
                "kind": "error",
                "data": {"message": f"Session '{session_id}' not found"},
            })
            await websocket.close(code=1008, reason="Session not found")
            return

        # User token expires after ~1h; WS sessions are long-lived. Switch to
        # the admin client to avoid JWT expiration mid-session.
        session_service.upgrade_session_to_admin(session_id)
        websocket_service.register_websocket(session_id, websocket)

        try:
            if options.fire_opener:
                try:
                    await trigger_turn(
                        session_id,
                        user_message=None,
                        agent=agent,
                        scaffold=options.scaffold,
                        tts=options.tts,
                        persist_final_output=options.persist_final_output,
                        flow_tag=options.flow_tag,
                        user_none_system_prompt=options.user_none_system_prompt,
                    )
                except Exception as e:
                    print(f"[Routes] Opener failed: {e}", flush=True, file=sys.stderr)
                    traceback.print_exc()
                    try:
                        await send_message(
                            session_id,
                            Message(kind="error", data={"message": f"Opener failed: {e}"}),
                        )
                    except Exception:
                        pass

            await start_session_loop(
                websocket, session_id, agent=agent, options=options
            )
        finally:
            websocket_service.unregister_websocket(session_id)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "kind": "error",
                "data": {"message": f"Internal server error: {str(e)}"},
            })
        except Exception:
            pass
        finally:
            await websocket.close(code=1011, reason="Internal server error")


@router.websocket("/realtime-session/{session_id}")
async def open_realtime_websocket(websocket: WebSocket, session_id: str):
    """Open a WebSocket for the realtime tutor agent."""
    await _open_session(
        websocket,
        session_id,
        agent=tutor_module.agent,
        options=tutor_module.harness_options,
    )


@router.websocket("/onboarding-session/{session_id}")
async def open_onboarding_websocket(websocket: WebSocket, session_id: str):
    """Open a WebSocket for the onboarding agent."""
    await _open_session(
        websocket,
        session_id,
        agent=onboarding_module.agent,
        options=onboarding_module.harness_options,
    )
