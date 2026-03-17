"""Admin routes for prompt file management and agent testing."""

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from dependencies.admin_auth import get_admin_user
from services import session_service, context_service, scaffolding_service
from services.agent_session import AgentSession
from services.supabase_client import get_supabase_admin_client
from services.context_service import create_context, get_context, delete_context
from services.telemetry import admin_span
from agent.tutor.tutor_agent import agent
from agents import Runner

LANGUAGES_DIR = Path(__file__).parent.parent / "agent" / "tutor" / "languages"

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Models ────────────────────────────────────────────────────────────────────

class PromptContent(BaseModel):
    content: str


class CreateSessionResponse(BaseModel):
    session_id: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    text: str
    text_canonical: str | None = None
    messages: list[Any]
    raw_responses: list[Any]
    usage: dict[str, Any] | None


class UpdateContextRequest(BaseModel):
    audio_enabled: bool | None = None
    language: str | None = None


class ContextResponse(BaseModel):
    session_id: str
    audio_enabled: bool
    language: str
    active_tool: str | None


# ── Prompt file endpoints ─────────────────────────────────────────────────────

@router.get("/prompts")
async def list_prompts(_: str = Depends(get_admin_user)) -> list[str]:
    """List available language prompt files."""
    if not LANGUAGES_DIR.exists():
        return []
    return [p.stem for p in sorted(LANGUAGES_DIR.glob("*.md"))]


@router.get("/prompts/{language}")
async def get_prompt(language: str, _: str = Depends(get_admin_user)) -> PromptContent:
    """Return the markdown content of a language prompt file."""
    path = LANGUAGES_DIR / f"{language}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Prompt file not found: {language}")
    return PromptContent(content=path.read_text(encoding="utf-8"))


@router.put("/prompts/{language}")
async def update_prompt(
    language: str,
    body: PromptContent,
    _: str = Depends(get_admin_user),
) -> PromptContent:
    """Overwrite a language prompt file."""
    path = LANGUAGES_DIR / f"{language}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Prompt file not found: {language}")
    path.write_text(body.content, encoding="utf-8")
    return PromptContent(content=body.content)


# ── Admin chat sessions ───────────────────────────────────────────────────────

# In-memory store for admin sessions (separate from user sessions)
_admin_sessions: dict[str, AgentSession] = {}


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_admin_session(admin_user_id: str = Depends(get_admin_user)) -> CreateSessionResponse:
    """Create a new admin chat session."""
    session_id = str(uuid.uuid4())
    admin_client = get_supabase_admin_client()

    # Insert a session row using the admin's real user_id
    admin_client.table("agent_sessions").insert({
        "session_id": session_id,
        "user_id": admin_user_id,
        "items": [],
    }).execute()

    session = AgentSession.__new__(AgentSession)
    session.session_id = session_id
    session.supabase = admin_client
    session.user_access_token = None
    _admin_sessions[session_id] = session

    create_context(session_id=session_id, user_id="admin", user_name="Admin")
    return CreateSessionResponse(session_id=session_id)


@router.post("/sessions/{session_id}/chat", response_model=ChatResponse)
async def admin_chat(
    session_id: str,
    request: ChatRequest,
    _: str = Depends(get_admin_user),
) -> ChatResponse:
    """Send a message to the agent and return the full LLM response."""
    session = _admin_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Admin session not found: {session_id}")

    context = get_context(session_id)
    with admin_span("admin_chat"):
        result = await Runner.run(agent, request.message, session=session, context=context)

    # Serialize new_items (messages, tool calls, etc.)
    messages: list[Any] = []
    for item in result.new_items:
        try:
            messages.append(_safe_serialize(item.to_input_item()))
        except Exception:
            messages.append(repr(item))

    # Serialize raw_responses (ModelResponse pydantic dataclasses)
    raw_responses: list[Any] = []
    for resp in result.raw_responses:
        try:
            raw_responses.append(_safe_serialize({
                "response_id": resp.response_id,
                "usage": {
                    "input_tokens": resp.usage.input_tokens,
                    "output_tokens": resp.usage.output_tokens,
                    "total_tokens": resp.usage.total_tokens,
                },
                "output": [_safe_serialize(o.model_dump()) for o in resp.output],
            }))
        except Exception:
            raw_responses.append(repr(resp))

    # Aggregate total usage across all responses
    usage: dict[str, Any] | None = None
    if result.raw_responses:
        usage = {
            "input_tokens": sum(r.usage.input_tokens for r in result.raw_responses),
            "output_tokens": sum(r.usage.output_tokens for r in result.raw_responses),
            "total_tokens": sum(r.usage.total_tokens for r in result.raw_responses),
        }

    # Generate scaffolded (arabizi) display text from the canonical Arabic response
    canonical_text = result.final_output
    scaffolded_text = await scaffolding_service.generate_scaffolded_text(canonical_text)

    return ChatResponse(
        text=scaffolded_text,
        text_canonical=canonical_text,
        messages=messages,
        raw_responses=raw_responses,
        usage=usage,
    )


@router.delete("/sessions/{session_id}")
async def delete_admin_session(session_id: str, _: str = Depends(get_admin_user)) -> dict:
    """Clean up an admin chat session."""
    _admin_sessions.pop(session_id, None)
    delete_context(session_id)
    try:
        get_supabase_admin_client().table("agent_sessions").delete().eq("session_id", session_id).execute()
    except Exception:
        pass
    return {"deleted": session_id}


@router.get("/sessions/{session_id}/context", response_model=ContextResponse)
async def get_admin_context(session_id: str, _: str = Depends(get_admin_user)) -> ContextResponse:
    """Get context for an admin session."""
    if session_id not in _admin_sessions:
        raise HTTPException(status_code=404, detail=f"Admin session not found: {session_id}")
    ctx = get_context(session_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Context not found")
    return ContextResponse(
        session_id=ctx.session_id,
        audio_enabled=ctx.agent.audio_enabled,
        language=ctx.agent.language,
        active_tool=ctx.agent.active_tool,
    )


@router.patch("/sessions/{session_id}/context", response_model=ContextResponse)
async def update_admin_context(
    session_id: str,
    request: UpdateContextRequest,
    _: str = Depends(get_admin_user),
) -> ContextResponse:
    """Update context for an admin session."""
    if session_id not in _admin_sessions:
        raise HTTPException(status_code=404, detail=f"Admin session not found: {session_id}")
    ctx = get_context(session_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Context not found")
    if request.audio_enabled is not None:
        ctx.set_audio_enabled(request.audio_enabled)
    if request.language is not None:
        ctx.set_language(request.language)
    return ContextResponse(
        session_id=ctx.session_id,
        audio_enabled=ctx.agent.audio_enabled,
        language=ctx.agent.language,
        active_tool=ctx.agent.active_tool,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_serialize(obj: Any) -> Any:
    """Recursively serialize an object, falling back to repr() for non-serializable values."""
    if isinstance(obj, dict):
        return {k: _safe_serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_safe_serialize(v) for v in obj]
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    try:
        import json
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return repr(obj)
