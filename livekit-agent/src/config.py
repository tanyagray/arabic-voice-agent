"""
Configuration for the Arabic Voice Agent
Includes system prompts, dialect settings, and voice configurations
"""

import os
from enum import Enum
from dotenv import load_dotenv

load_dotenv()


class ArabicDialect(Enum):
    """Supported Arabic dialects"""
    MSA = "msa"  # Modern Standard Arabic
    IRAQI = "iraqi"
    EGYPTIAN = "egyptian"
    MIXED = "mixed"  # All dialects mixed with English


# =============================================================================
# ENVIRONMENT VARIABLES
# =============================================================================

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# LiveKit
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ElevenLabs
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

# Deepgram
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# Agent Configuration
ARABIC_DIALECT = os.getenv("ARABIC_DIALECT", "mixed")
AGENT_LOG_LEVEL = os.getenv("AGENT_LOG_LEVEL", "INFO")


# =============================================================================
# SYSTEM PROMPTS (Easily Editable)
# =============================================================================

SYSTEM_PROMPT_BASE = """You are a friendly and informal Arabic language tutor assistant.
You help users practice conversational Arabic mixed with English in a natural, encouraging way.

Your personality:
- Warm, patient, and encouraging
- Informal and conversational (like a friendly tutor, not a formal teacher)
- Adapt to the user's proficiency level
- Correct mistakes gently and constructively
- Use positive reinforcement

Your teaching approach:
- Start conversations naturally
- Ask open-ended questions to encourage speaking
- Provide translations when needed
- Explain cultural context when relevant
- Keep responses concise for voice conversations (2-3 sentences max)
"""

# Dialect-specific instructions
DIALECT_INSTRUCTIONS = {
    ArabicDialect.MSA: """
Focus on Modern Standard Arabic (الفصحى). This is the formal Arabic used in media,
literature, and formal settings across the Arab world.
""",

    ArabicDialect.IRAQI: """
Focus on Iraqi Arabic (اللهجة العراقية). Use Iraqi colloquialisms, pronunciation,
and vocabulary. This is the everyday Arabic spoken in Iraq.
""",

    ArabicDialect.EGYPTIAN: """
Focus on Egyptian Arabic (اللهجة المصرية). Use Egyptian colloquialisms, pronunciation,
and vocabulary. This is the widely understood dialect from Egypt.
""",

    ArabicDialect.MIXED: """
Use a natural mix of Modern Standard Arabic, Iraqi, and Egyptian dialects along with English.
Code-switch naturally as native bilingual speakers do. Explain which dialect you're using
when introducing new phrases.
"""
}


def get_system_prompt(dialect: str = ARABIC_DIALECT) -> str:
    """
    Get the complete system prompt based on the selected dialect

    Args:
        dialect: Arabic dialect code (msa, iraqi, egyptian, mixed)

    Returns:
        Complete system prompt string
    """
    try:
        dialect_enum = ArabicDialect(dialect.lower())
    except ValueError:
        dialect_enum = ArabicDialect.MIXED

    dialect_instruction = DIALECT_INSTRUCTIONS.get(dialect_enum, DIALECT_INSTRUCTIONS[ArabicDialect.MIXED])

    return f"""{SYSTEM_PROMPT_BASE}

{dialect_instruction}

Remember: Keep your responses natural and conversational. This is a voice conversation,
so speak as you would to a friend learning Arabic.
"""


# =============================================================================
# DEEPGRAM CONFIGURATION
# =============================================================================

DEEPGRAM_CONFIG = {
    "model": "nova-2",
    "language": "ar",  # Arabic
    "smart_format": True,
    "interim_results": True,
    "endpointing_ms": 300,  # ms of silence before finalizing
}


# =============================================================================
# ELEVENLABS CONFIGURATION
# =============================================================================

ELEVENLABS_CONFIG = {
    "model": "eleven_multilingual_v2",  # Supports Arabic + English code-switching
    "voice_id": ELEVENLABS_VOICE_ID,
    "streaming_latency": 2,
}


# =============================================================================
# OPENAI CONFIGURATION
# =============================================================================

OPENAI_CONFIG = {
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 150,  # Keep responses concise for voice
}


# =============================================================================
# CONVERSATION SETTINGS
# =============================================================================

# Fresh context per session (no history loaded)
LOAD_CONVERSATION_HISTORY = False
MAX_HISTORY_MESSAGES = 0

# Analytics tracking
TRACK_ANALYTICS = True
