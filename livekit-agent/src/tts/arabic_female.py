from livekit.plugins import elevenlabs

def get_arabic_female_tts() -> elevenlabs.TTS:
    """
    Returns an ElevenLabs TTS instance configured for Arabic female voice.
    This is a factory function to ensure the TTS is created at runtime
    when environment variables are available, not at module import time.
    """
    return elevenlabs.TTS(
        voice_id="cgSgspJ2msm6clMCkdW9",
        model="eleven_multilingual_v2",
        language="ar",
        voice_settings=elevenlabs.VoiceSettings(
            speed=0.8,
            stability=0.5,
            similarity_boost=0.75
        )
    )
