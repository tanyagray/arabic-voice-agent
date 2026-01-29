"""Pipecat service for real-time voice agent pipeline."""

import asyncio
import os
from typing import Optional

from fastapi import WebSocket
from loguru import logger

from pipecat.frames.frames import EndFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.serializers.protobuf import ProtobufFrameSerializer

from .context_service import get_context
from .session_service import get_session


async def run_pipecat_agent(
    websocket: WebSocket,
    session_id: str,
    user_access_token: Optional[str] = None,
) -> None:
    """
    Run a pipecat-based voice agent pipeline for a session.

    Args:
        websocket: FastAPI WebSocket connection
        session_id: Session identifier
        user_access_token: Optional user access token for authentication
    """
    # Validate session exists
    session = get_session(session_id, user_access_token)
    if not session:
        await websocket.send_json({
            "kind": "error",
            "data": {"message": f"Session '{session_id}' not found"}
        })
        await websocket.close(code=1008, reason="Session not found")
        return

    # Get context for language and settings
    context = get_context(session_id)
    language = context.agent.language if context else "ar-AR"

    # Map language to voice and STT settings
    language_map = {
        "ar-AR": {"elevenlabs_voice": "cgSgspJ2msm6clMCkdW9", "deepgram_lang": "ar"},
        "es-MX": {"elevenlabs_voice": "m7yTemJqdIqrcNleANfX", "deepgram_lang": "es"},
        "ru-RU": {"elevenlabs_voice": "cgSgspJ2msm6clMCkdW9", "deepgram_lang": "ru"},
        "mi-NZ": {"elevenlabs_voice": "BHhU6fTKdSX6bN7T1tpz", "deepgram_lang": "en"},
    }
    lang_config = language_map.get(language, language_map["ar-AR"])

    # Configure transport
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
            serializer=ProtobufFrameSerializer(),
        ),
    )

    # Configure STT (Deepgram)
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        language=lang_config["deepgram_lang"],
    )

    # Configure LLM (OpenAI)
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o",
    )

    # Configure TTS (ElevenLabs)
    tts = ElevenLabsTTSService(
        api_key=os.getenv("ELEVEN_API_KEY"),
        voice_id=lang_config["elevenlabs_voice"],
    )

    # Create LLM context with system prompt
    system_prompt = "You are a helpful Arabic language tutor. Keep your responses concise and conversational."
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    llm_context = LLMContext(messages)
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(llm_context)

    # Build pipeline
    pipeline = Pipeline(
        [
            transport.input(),  # WebSocket input
            stt,  # Speech-to-text
            user_aggregator,  # User context aggregation
            llm,  # Language model
            tts,  # Text-to-speech
            transport.output(),  # WebSocket output
            assistant_aggregator,  # Assistant context aggregation
        ]
    )

    # Create pipeline task
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # Event handlers
    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        """Handle client connection."""
        logger.info(f"Client connected to session {session_id}")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        """Handle client disconnection."""
        logger.info(f"Client disconnected from session {session_id}")
        await task.queue_frames([EndFrame()])

    # Run the pipeline
    runner = PipelineRunner()
    await runner.run(task)
