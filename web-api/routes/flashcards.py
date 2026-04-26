"""Flashcard routes for retrieving and sharing flashcard sets."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from dependencies.auth import get_current_user_token
from services.flashcard_service import get_flashcard_set
from services.supabase_client import get_supabase_admin_client


# Models
class FlashcardResponse(BaseModel):
    id: str
    set_id: str
    ordinal: int
    arabic_text: str
    transliteration: str
    english: str
    image_url: str | None = None
    audio_url: str | None = None
    status: str
    created_at: str
    updated_at: str


class FlashcardSetResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    language: str
    status: str
    is_public: bool
    error: str | None = None
    cards: list[FlashcardResponse]
    created_by: str
    created_at: str
    updated_at: str


class UpdateFlashcardSetRequest(BaseModel):
    is_public: bool = Field(..., description="Whether the flashcard set is publicly visible")


# Router
router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


@router.get("/{set_id}", response_model=FlashcardSetResponse)
async def get_set(
    set_id: str,
    _token: str = Depends(get_current_user_token),
):
    """Get a flashcard set by ID. Requires authentication."""
    data = await get_flashcard_set(set_id)
    if not data:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    return FlashcardSetResponse(**data)


@router.patch("/{set_id}", response_model=FlashcardSetResponse)
async def update_set(
    set_id: str,
    request: UpdateFlashcardSetRequest,
    _token: str = Depends(get_current_user_token),
):
    """Update a flashcard set (e.g. toggle public sharing). Owner only."""
    supabase = get_supabase_admin_client()

    # Update the set
    supabase.table("flashcard_sets").update({
        "is_public": request.is_public,
    }).eq("id", set_id).execute()

    # Return the updated set
    data = await get_flashcard_set(set_id)
    if not data:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    return FlashcardSetResponse(**data)


@router.get("/{set_id}/public", response_model=FlashcardSetResponse)
async def get_public_set(set_id: str):
    """Get a public flashcard set. No authentication required."""
    data = await get_flashcard_set(set_id)
    if not data or not data.get("is_public"):
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    return FlashcardSetResponse(**data)
