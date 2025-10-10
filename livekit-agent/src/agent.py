"""
Main voice agent implementation using LiveKit
Handles voice conversations with Deepgram (STT), OpenAI (LLM), and ElevenLabs (TTS)
"""

import logging
from datetime import datetime
from typing import Optional

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    noise_cancellation,
    RoomInputOptions,
)
from livekit.plugins import deepgram, elevenlabs, openai, silero

from src.config import (
    get_system_prompt,
    ARABIC_DIALECT,
    DEEPGRAM_CONFIG,
    ELEVENLABS_CONFIG,
    OPENAI_CONFIG,
    DEEPGRAM_API_KEY,
    ELEVENLABS_API_KEY,
    OPENAI_API_KEY,
    TRACK_ANALYTICS,
)
from src.database import SupabaseClient
from src.functions.user_tools import UserTools

logger = logging.getLogger(__name__)


class ArabicVoiceAgent:
    """Voice agent for Arabic language tutoring"""

    def __init__(self):
        self.db = SupabaseClient()
        self.user_tools = UserTools(self.db)
        self.conversation_id: Optional[str] = None
        self.user_id: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.session: Optional[AgentSession] = None

    async def entrypoint(self, ctx: JobContext):
        """
        Main entry point for the LiveKit agent

        Args:
            ctx: JobContext from LiveKit
        """
        logger.info(f"Agent starting for room: {ctx.room.name}")
        self.start_time = datetime.utcnow()

        # Extract user ID from room metadata
        self.user_id = ctx.room.metadata.get("user_id") if ctx.room.metadata else None

        if not self.user_id:
            logger.warning("No user_id in room metadata")

        # Create conversation record
        if self.user_id:
            self.conversation_id = await self.db.create_conversation(
                user_id=self.user_id,
                room_id=ctx.room.name,
                mode="voice"
            )

            if TRACK_ANALYTICS and self.conversation_id:
                await self.db.track_analytics_event(
                    user_id=self.user_id,
                    event_type="conversation_start",
                    conversation_id=self.conversation_id,
                    metadata={"dialect": ARABIC_DIALECT}
                )

        # Connect to the room
        await ctx.connect()

        # Create the agent with system prompt
        system_prompt = get_system_prompt(ARABIC_DIALECT)
        agent = Agent(instructions=system_prompt)

        # Create the agent session with all components
        self.session = AgentSession(
            vad=silero.VAD.load(),
            stt=deepgram.STT(
                api_key=DEEPGRAM_API_KEY,
                **DEEPGRAM_CONFIG
            ),
            llm=openai.LLM(
                api_key=OPENAI_API_KEY,
                model=OPENAI_CONFIG["model"],
            ),
            tts=elevenlabs.TTS(
                api_key=ELEVENLABS_API_KEY,
                **ELEVENLABS_CONFIG
            ),
        )

        # Start the session
        await self.session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            )
        )

        # Generate initial greeting
        await self.session.generate_reply(
            instructions="Greet the user warmly in a mix of Arabic and English, introduce yourself as their Arabic tutor, and ask how they're doing today."
        )

        # Wait for the session to complete
        # The session will continue until the user disconnects
        # We can add event listeners here if needed for tracking

        # End conversation when session completes
        if self.conversation_id and self.start_time:
            duration = int((datetime.utcnow() - self.start_time).total_seconds())
            await self.db.end_conversation(self.conversation_id, duration)

            if TRACK_ANALYTICS and self.user_id:
                await self.db.track_analytics_event(
                    user_id=self.user_id,
                    event_type="conversation_end",
                    conversation_id=self.conversation_id,
                    metadata={"duration_seconds": duration}
                )

        logger.info(f"Agent finished for room: {ctx.room.name}")
