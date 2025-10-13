"""
FastAPI application for LiveKit token generation.

This server provides an endpoint to generate JWT tokens for LiveKit clients.
"""

import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from livekit import api
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory as this script
# Use override=True to ensure this .env takes precedence over parent directory .env files
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)


app = FastAPI(
    title="LiveKit Token Server",
    description="API for generating LiveKit access tokens",
    version="1.0.0"
)

# Configure CORS - adjust origins as needed for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "LiveKit Token Server",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    # Check if required environment variables are set
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    config_status = "ok" if api_key and api_secret else "misconfigured"

    return {
        "status": "healthy",
        "service": "LiveKit Token Server",
        "version": "1.0.0",
        "config": config_status
    }


@app.post("/livekit/token", response_model=TokenResponse)
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


@app.get("/livekit/token", response_model=TokenResponse)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
