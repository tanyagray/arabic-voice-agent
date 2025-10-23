"""Pydantic models for LiveKit token generation."""

from typing import Optional
from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    """Request model for token generation."""
    room_name: str = Field(..., description="Name of the LiveKit room to join")
    participant_identity: str = Field(..., description="Unique identity for the participant")
    participant_name: Optional[str] = Field(None, description="Display name for the participant")
    can_publish: bool = Field(True, description="Whether participant can publish audio/video")
    can_subscribe: bool = Field(True, description="Whether participant can subscribe to tracks")
    can_publish_data: bool = Field(True, description="Whether participant can publish data messages")


class TokenResponse(BaseModel):
    """Response model containing the generated token."""
    token: str = Field(..., description="JWT token for LiveKit authentication")
    url: str = Field(..., description="LiveKit server URL")
