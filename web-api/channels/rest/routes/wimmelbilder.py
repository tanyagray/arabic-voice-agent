"""Wimmelbilder routes for creating and retrieving interactive scene images."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from dependencies.admin_auth import get_admin_user
from dependencies.auth import get_current_user_token
from services.wimmelbilder_service import create_wimmelbilder, get_wimmelbilder


# Models
class CreateWimmelbilderRequest(BaseModel):
    description: str = Field(..., description="Description of the scene to generate")


class CreateWimmelbilderResponse(BaseModel):
    id: str
    status: str


class WimmelbilderResponse(BaseModel):
    id: str
    description: str
    status: str
    image_path: str | None = None
    image_width: int | None = None
    image_height: int | None = None
    objects: list[dict[str, Any]] | None = None
    error: str | None = None
    created_at: str
    updated_at: str


# Router
router = APIRouter(prefix="/wimmelbilder", tags=["Wimmelbilder"])


@router.post("", response_model=CreateWimmelbilderResponse)
async def create(
    request: CreateWimmelbilderRequest,
    user_id: str = Depends(get_admin_user),
):
    """Create a new wimmelbilder. Admin only. Returns immediately with pending status."""
    wimmelbilder_id = await create_wimmelbilder(request.description, user_id)
    return CreateWimmelbilderResponse(id=wimmelbilder_id, status="pending")


@router.get("/{wimmelbilder_id}", response_model=WimmelbilderResponse)
async def get(
    wimmelbilder_id: str,
    _token: str = Depends(get_current_user_token),
):
    """Get a wimmelbilder by ID. Requires authentication (including anonymous)."""
    data = await get_wimmelbilder(wimmelbilder_id)
    if not data:
        raise HTTPException(status_code=404, detail="Wimmelbilder not found")
    return WimmelbilderResponse(**data)
