"""
Main voice agent implementation using LiveKit
Handles voice conversations with Deepgram (STT), OpenAI (LLM), and ElevenLabs (TTS)
"""

import logging
import asyncio
from datetime import datetime
from typing import Optional

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    Agent,
)
from livekit.plugins import deepgram, elevenlabs, openai

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
        await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

        # Initialize plugins
        stt = deepgram.STT(
            api_key=DEEPGRAM_API_KEY,
            **DEEPGRAM_CONFIG
        )

        llm_instance = openai.LLM(
            api_key=OPENAI_API_KEY,
            model=OPENAI_CONFIG["model"],
        )

        tts = elevenlabs.TTS(
            api_key=ELEVENLABS_API_KEY,
            **ELEVENLABS_CONFIG
        )

        # Create the agent with system prompt
        system_prompt = get_system_prompt(ARABIC_DIALECT)

        # The Agent is automatically created by the JobContext
        # We just need to configure it
        ctx.agent.instructions = system_prompt
        ctx.agent.llm = llm_instance
        ctx.agent.stt = stt
        ctx.agent.tts = tts

        # Set up function calling (optional - can be enabled later)
        # ctx.agent.update_tools(self.user_tools.get_function_definitions())

        # TODO: Implement message saving with new Agent API
        # The new Agent API doesn't expose chat_ctx the same way
        # Will need to use event listeners for message tracking

        # End conversation
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


# async def request_fnc(req) -> None:
#     """
#     Handle function call requests from the LLM
#     (Currently disabled - can be enabled by uncommenting assistant.register_functions above)
#
#     Args:
#         req: Function call request from LLM
#     """
#     logger.info(f"Function call: {req.function_info.name} with args: {req.arguments}")
#     # Implementation would go here when function calling is enabled
