"""
Soniox Speech Recognition service for async audio transcription.

Handles:
- Uploading audio files to Soniox Files API
- Creating transcription jobs with webhook callbacks
- Fetching completed transcripts
"""

import os
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

# In-memory storage for mapping transcription IDs to session IDs
_transcription_jobs: Dict[str, str] = {}

# Soniox API configuration
SONIOX_API_KEY = os.getenv("SONIOX_API_KEY")
SONIOX_API_URL = "https://api.soniox.com"
WEBHOOK_BASE_URL = os.getenv("WEBHOOK_BASE_URL", "http://localhost:8000")


async def upload_audio_file(audio_bytes: bytes, filename: str) -> str:
    """
    Upload an audio file to Soniox Files API.

    Args:
        audio_bytes: Raw audio file bytes
        filename: Original filename

    Returns:
        file_id: Soniox file identifier for transcription

    Raises:
        httpx.HTTPStatusError: If upload fails
    """
    if not SONIOX_API_KEY:
        raise ValueError("SONIOX_API_KEY environment variable not set")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SONIOX_API_URL}/v1/files",
            headers={"Authorization": f"Bearer {SONIOX_API_KEY}"},
            files={"file": (filename, audio_bytes)},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        return data["id"]


async def create_transcription(file_id: str, session_id: str, target_language: str = "ar") -> str:
    """
    Create an async transcription job with Soniox.

    Args:
        file_id: Soniox file ID from upload_audio_file
        session_id: Application session ID for webhook callback
        target_language: Target language code (e.g., 'ar', 'es', 'ru', 'mi') for language hints

    Returns:
        transcription_id: Soniox transcription job identifier

    Raises:
        httpx.HTTPStatusError: If transcription creation fails
    """
    if not SONIOX_API_KEY:
        raise ValueError("SONIOX_API_KEY environment variable not set")

    webhook_url = f"{WEBHOOK_BASE_URL}/webhooks/soniox"

    # Always include English plus the target language for bilingual conversations
    language_hints = [target_language, "en"] if target_language != "en" else ["en"]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SONIOX_API_URL}/v1/transcriptions",
            headers={
                "Authorization": f"Bearer {SONIOX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "stt-async-preview",
                "file_id": file_id,
                "webhook_url": webhook_url,
                "language_hints": language_hints,
                "enable_language_identification": True,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        transcription_id = data["id"]

        # Store mapping for webhook callback
        _transcription_jobs[transcription_id] = session_id

        return transcription_id


async def get_transcript(transcription_id: str) -> str:
    """
    Fetch the transcript text from a completed transcription.

    Args:
        transcription_id: Soniox transcription job identifier

    Returns:
        transcript_text: The transcribed text

    Raises:
        httpx.HTTPStatusError: If fetching transcript fails
    """
    if not SONIOX_API_KEY:
        raise ValueError("SONIOX_API_KEY environment variable not set")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SONIOX_API_URL}/v1/transcriptions/{transcription_id}/transcript",
            headers={"Authorization": f"Bearer {SONIOX_API_KEY}"},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()

        # Extract text from transcript response
        # The transcript contains a 'text' field with the complete transcription
        return data.get("text", "")


def get_session_id(transcription_id: str) -> Optional[str]:
    """
    Look up the session ID associated with a transcription.

    Args:
        transcription_id: Soniox transcription job identifier

    Returns:
        session_id: Application session ID, or None if not found
    """
    return _transcription_jobs.get(transcription_id)


def remove_transcription_job(transcription_id: str) -> None:
    """
    Clean up transcription job mapping after processing.

    Args:
        transcription_id: Soniox transcription job identifier
    """
    _transcription_jobs.pop(transcription_id, None)
