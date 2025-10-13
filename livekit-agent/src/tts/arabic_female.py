from livekit.plugins import elevenlabs

# Arabic female voice configuration using ElevenLabs
ArabicFemale = elevenlabs.TTS(
    voice_id="cgSgspJ2msm6clMCkdW9",
    model="eleven_multilingual_v2",
    language="ar",
    voice_settings=elevenlabs.VoiceSettings(
        speed=0.8,
        stability=0.5,
        similarity_boost=0.75
    )
)
