"""Admin routes for prompt file management and agent testing."""

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from dependencies.admin_auth import get_admin_user
from services import session_service, context_service, scaffolding_service
from services.scaffolding_service import generate_scaffolded_text_with_metadata, generate_transliterated_text_with_metadata
from services.agent_session import AgentSession
from services.supabase_client import get_supabase_admin_client
from services.context_service import create_context, get_context, delete_context
from agent.tutor.tutor_agent import agent
from agent.tutor.tutor_instructions import _load_instructions
from agents import Runner

LANGUAGES_DIR = Path(__file__).parent.parent / "agent" / "tutor" / "languages"
PROMPTS_DIR = Path(__file__).parent.parent / "agent" / "tutor" / "prompts"

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
    highlights: list[dict[str, Any]] = []
    system_prompt: str | None = None
    messages: list[Any]
    raw_responses: list[Any]
    phase2_response: dict[str, Any] | None = None
    usage: dict[str, Any] | None


class UpdateContextRequest(BaseModel):
    audio_enabled: bool | None = None
    language: str | None = None
    response_mode: str | None = None


class ContextResponse(BaseModel):
    session_id: str
    audio_enabled: bool
    language: str
    active_tool: str | None
    response_mode: str


# ── Prompt file endpoints ─────────────────────────────────────────────────────

@router.get("/prompts/languages")
async def list_languages(_: str = Depends(get_admin_user)) -> list[str]:
    """List available language codes."""
    if not LANGUAGES_DIR.exists():
        return []
    return [p.stem for p in sorted(LANGUAGES_DIR.glob("*.md"))]


@router.get("/prompts/base/{language}")
async def get_base_prompt(language: str, _: str = Depends(get_admin_user)) -> PromptContent:
    """Return the markdown content of a language base prompt file."""
    path = LANGUAGES_DIR / f"{language}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Prompt file not found: {language}")
    return PromptContent(content=path.read_text(encoding="utf-8"))


@router.put("/prompts/base/{language}")
async def update_base_prompt(
    language: str,
    body: PromptContent,
    _: str = Depends(get_admin_user),
) -> PromptContent:
    """Overwrite a language base prompt file."""
    path = LANGUAGES_DIR / f"{language}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Prompt file not found: {language}")
    path.write_text(body.content, encoding="utf-8")
    return PromptContent(content=body.content)


@router.get("/prompts/scaffolding")
async def get_scaffolding_prompt(_: str = Depends(get_admin_user)) -> PromptContent:
    """Return the scaffolding prompt content."""
    path = PROMPTS_DIR / "scaffolding.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Scaffolding prompt file not found")
    return PromptContent(content=path.read_text(encoding="utf-8"))


@router.put("/prompts/scaffolding")
async def update_scaffolding_prompt(
    body: PromptContent,
    _: str = Depends(get_admin_user),
) -> PromptContent:
    """Overwrite the scaffolding prompt file."""
    path = PROMPTS_DIR / "scaffolding.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Scaffolding prompt file not found")
    path.write_text(body.content, encoding="utf-8")
    return PromptContent(content=body.content)


@router.get("/prompts/transliteration")
async def get_transliteration_prompt(_: str = Depends(get_admin_user)) -> PromptContent:
    """Return the transliteration prompt content."""
    path = PROMPTS_DIR / "transliteration.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Transliteration prompt file not found")
    return PromptContent(content=path.read_text(encoding="utf-8"))


@router.put("/prompts/transliteration")
async def update_transliteration_prompt(
    body: PromptContent,
    _: str = Depends(get_admin_user),
) -> PromptContent:
    """Overwrite the transliteration prompt file."""
    path = PROMPTS_DIR / "transliteration.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Transliteration prompt file not found")
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
    result = await Runner.run(agent, request.message, session=session, context=context)

    # Resolve the system prompt that was used for this request
    language = context.agent.language if context and context.agent else "ar-AR"
    try:
        system_prompt = _load_instructions(language)
        # Append USER INFO the same way get_instructions does
        user_info_lines = []
        if context and context.user:
            if context.user.user_id:
                user_info_lines.append(f"- id: {context.user.user_id}")
            if context.user.user_name:
                user_info_lines.append(f"- name: {context.user.user_name}")
        user_context = "\n".join(user_info_lines) if user_info_lines else "- No user information available"
        system_prompt = f"{system_prompt}\n\nUSER INFO:\n{user_context}\n"
    except FileNotFoundError:
        system_prompt = f"[Error: instructions file not found for language '{language}']"

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

    # Phase 2: Generate display text based on session's response_mode
    canonical_text = result.final_output
    response_mode = context.agent.response_mode if context else "scaffolded"
    if response_mode == "transliterated":
        phase2_result = await generate_transliterated_text_with_metadata(canonical_text)
    else:
        phase2_result = await generate_scaffolded_text_with_metadata(canonical_text)

    return ChatResponse(
        text=phase2_result.text,
        text_canonical=canonical_text,
        highlights=phase2_result.highlights,
        system_prompt=system_prompt,
        messages=messages,
        raw_responses=raw_responses,
        phase2_response=phase2_result.to_dict(),
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
        response_mode=ctx.agent.response_mode,
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
    if request.response_mode is not None:
        ctx.set_response_mode(request.response_mode)
    return ContextResponse(
        session_id=ctx.session_id,
        audio_enabled=ctx.agent.audio_enabled,
        language=ctx.agent.language,
        active_tool=ctx.agent.active_tool,
        response_mode=ctx.agent.response_mode,
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
