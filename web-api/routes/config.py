"""Public configuration endpoint for frontend clients."""

import os

from fastapi import APIRouter
from pydantic import BaseModel, Field


class ConfigResponse(BaseModel):
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_publishable_key: str = Field(..., description="Supabase anon/publishable key")
    posthog_key: str = Field("", description="PostHog project API key (public)")
    posthog_host: str = Field("", description="PostHog ingest host")


router = APIRouter(tags=["Config"])


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Return public configuration values for frontend clients."""
    return ConfigResponse(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_publishable_key=os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
        posthog_key=os.getenv("POSTHOG_API_KEY", ""),
        posthog_host=os.getenv("POSTHOG_HOST", ""),
    )
