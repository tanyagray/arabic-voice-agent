"""Public configuration endpoint for frontend clients."""

import os

from fastapi import APIRouter
from pydantic import BaseModel, Field


class ConfigResponse(BaseModel):
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_publishable_key: str = Field(..., description="Supabase anon/publishable key")


router = APIRouter(tags=["Config"])


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Return public configuration values for frontend clients."""
    return ConfigResponse(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_publishable_key=os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
    )
