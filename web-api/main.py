"""
FastAPI application for mishmish.ai backend.

This server provides API endpoints for session management, content delivery, and webhooks.
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.session import router as session_router
from routes.realtime_session import router as realtime_session_router
from routes.realtime_pipecat import router as realtime_pipecat_router
from routes.content import router as content_router
from routes.webhooks import router as webhooks_router
from routes.admin import router as admin_router
from services.telemetry import setup_telemetry

# Load environment variables from .env file in the same directory as this script
# Use override=True to ensure this .env takes precedence over parent directory .env files
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

setup_telemetry()

app = FastAPI(
    title="mishmish.ai API",
    description="Backend API for the mishmish.ai application",
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

# Include routes
app.include_router(session_router)
app.include_router(realtime_session_router)
app.include_router(realtime_pipecat_router)
app.include_router(content_router)
app.include_router(webhooks_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "mishmish.ai API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "mishmish.ai API",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn

    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = os.getenv("PORT", 8000)
    uvicorn.run(app, host=HOST, port=PORT)
