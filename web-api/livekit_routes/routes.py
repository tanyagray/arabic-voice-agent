"""LiveKit token generation routes."""

import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from livekit import api

from .models import TokenRequest, TokenResponse


router = APIRouter(prefix="/livekit", tags=["LiveKit"])


@router.post("/token", response_model=TokenResponse)
async def create_token(request: TokenRequest):
    """
    Generate a LiveKit access token.

    This endpoint creates a JWT token that allows a client to connect to a LiveKit room
    with the specified permissions.

    Args:
        request: TokenRequest containing room name, identity, and permissions

    Returns:
        TokenResponse with the generated JWT token and server URL

    Raises:
        HTTPException: If required environment variables are missing or token generation fails
    """
    # Get LiveKit credentials from environment
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    livekit_url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")

    if not api_key or not api_secret:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set"
        )

    try:
        # Create access token
        token = api.AccessToken(api_key, api_secret)

        # Set participant identity and name
        token = token.with_identity(request.participant_identity)
        if request.participant_name:
            token = token.with_name(request.participant_name)

        # Configure video grants (permissions)
        grants = api.VideoGrants(
            room_join=True,
            room=request.room_name,
            can_publish=request.can_publish,
            can_subscribe=request.can_subscribe,
            can_publish_data=request.can_publish_data,
        )
        token = token.with_grants(grants)

        # Generate JWT
        jwt_token = token.to_jwt()

        return TokenResponse(
            token=jwt_token,
            url=livekit_url
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate token: {str(e)}"
        )


@router.get("/token", response_model=TokenResponse)
async def create_token_get(
    room_name: str = Query(..., description="Name of the LiveKit room to join"),
    participant_identity: str = Query(..., description="Unique identity for the participant"),
    participant_name: Optional[str] = Query(None, description="Display name for the participant"),
    can_publish: bool = Query(True, description="Whether participant can publish audio/video"),
    can_subscribe: bool = Query(True, description="Whether participant can subscribe to tracks"),
    can_publish_data: bool = Query(True, description="Whether participant can publish data messages"),
):
    """
    Generate a LiveKit access token (GET method).

    Alternative GET endpoint for token generation, useful for simple integrations.
    POST method is recommended for production use.
    """
    request = TokenRequest(
        room_name=room_name,
        participant_identity=participant_identity,
        participant_name=participant_name,
        can_publish=can_publish,
        can_subscribe=can_subscribe,
        can_publish_data=can_publish_data,
    )
    return await create_token(request)
