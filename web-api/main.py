"""
FastAPI application for mishmish.ai backend.

This server provides API endpoints for session management, content delivery, and webhooks.
"""

import os
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from routes.session import router as session_router
from routes.realtime_session import router as realtime_session_router
from routes.realtime_pipecat import router as realtime_pipecat_router
from routes.content import router as content_router
from routes.webhooks import router as webhooks_router
from routes.admin import router as admin_router
from routes.config import router as config_router

# Load environment variables from .env file in the same directory as this script
# Use override=True to ensure this .env takes precedence over parent directory .env files
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)


from services import posthog_service  # noqa: E402 — must import after dotenv


app = FastAPI(
    title="mishmish.ai API",
    description="Backend API for the mishmish.ai application",
    version="1.0.0"
)

# Configure CORS
# Note: allow_credentials=True is incompatible with allow_origins=["*"] —
# browsers reject Access-Control-Allow-Origin: * when credentials are included.
# Since auth uses Authorization headers (not cookies), credentials mode is not needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Catch-all exception handler to ensure unhandled errors still return proper
# JSON responses with CORS headers (the CORSMiddleware wraps the response,
# but only if a response object is actually produced — unhandled exceptions
# in some Starlette versions can bypass it).
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include routes
app.include_router(session_router)
app.include_router(realtime_session_router)
app.include_router(realtime_pipecat_router)
app.include_router(content_router)
app.include_router(webhooks_router)
app.include_router(admin_router)
app.include_router(config_router)


@app.on_event("shutdown")
def shutdown_posthog():
    """Flush pending PostHog events on shutdown."""
    posthog_service.shutdown()


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
