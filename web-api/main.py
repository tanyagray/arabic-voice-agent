"""
FastAPI application for LiveKit token generation.

This server provides an endpoint to generate JWT tokens for LiveKit clients.
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from livekit_routes import router as livekit_router

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

# Include LiveKit routes
app.include_router(livekit_router)


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
