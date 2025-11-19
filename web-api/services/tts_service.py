"""Text-to-Speech service using ElevenLabs API."""

import os
import base64
from typing import Optional
import httpx


class TTSService:
    """
    Service for generating audio from text using ElevenLabs API.
    """

    def __init__(self):
        """Initialize TTS service with ElevenLabs API key."""
        self.api_key = os.getenv("ELEVEN_API_KEY")
        if not self.api_key:
            raise ValueError("ELEVEN_API_KEY environment variable not set")

        self.base_url = "https://api.elevenlabs.io/v1"
        self.model = "eleven_multilingual_v2"

        # Voice configurations for different languages
        self.voice_configs = {
            "ar-AR": {
                "voice_id": "cgSgspJ2msm6clMCkdW9",  # Arabic female voice
                "language_code": "ar",
            },
            "es-MX": {
                "voice_id": "cgSgspJ2msm6clMCkdW9",  # Spanish female voice
                "language_code": "es",
            },
            "ru-RU": {
                "voice_id": "cgSgspJ2msm6clMCkdW9",  # Russian female voice
                "language_code": "ru",
            },
            "mi-NZ": {
                "voice_id": "cgSgspJ2msm6clMCkdW9",  # Maori female voice
                "language_code": "mi",
            },
        }

        # Voice settings for ElevenLabs
        self.voice_settings = {
            "stability": 0.5,
            "similarity_boost": 0.75,
        }

    async def generate_audio(
        self, text: str, language: str = "ar-AR"
    ) -> Optional[bytes]:
        """
        Generate audio from text using ElevenLabs API.

        Args:
            text: The text to convert to speech
            language: Language code (e.g., 'ar-AR', 'es-MX', 'ru-RU', 'mi-NZ')

        Returns:
            Audio data as bytes (MP3 format), or None if generation fails
        """
        # Get voice configuration for language
        voice_config = self.voice_configs.get(language, self.voice_configs["ar-AR"])
        voice_id = voice_config["voice_id"]

        url = f"{self.base_url}/text-to-speech/{voice_id}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

        # Apply speed setting
        voice_settings_with_speed = {
            **self.voice_settings,
            "speed": 0.8,
        }

        payload = {
            "text": text,
            "model_id": self.model,
            "voice_settings": voice_settings_with_speed,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()

                # Return the MP3 audio data
                audio_data = response.content
                print(
                    f"[TTS] Generated audio: {len(audio_data)} bytes, language={language}"
                )
                return audio_data

        except httpx.HTTPStatusError as e:
            print(f"[TTS Error] HTTP {e.response.status_code}: {e.response.text}")
            return None
        except Exception as e:
            print(f"[TTS Error] Failed to generate audio: {e}")
            return None

    def encode_audio_base64(self, audio_data: bytes) -> str:
        """
        Encode audio data to base64 string for WebSocket transmission.

        Args:
            audio_data: Raw audio bytes

        Returns:
            Base64 encoded string
        """
        return base64.b64encode(audio_data).decode("utf-8")


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """
    Get or create the singleton TTS service instance.

    Returns:
        TTSService: The TTS service instance
    """
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
