"""Pipecat service for real-time voice agent pipeline."""

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
from pipecat.services.soniox.stt import SonioxSTTService, SonioxInputParams
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.processors.frameworks.rtvi import (
    RTVIProcessor,
    RTVIObserver,
    RTVIObserverParams,
)

from .context_service import get_context
from .session_service import get_session
from .transcript_service import create_transcript_message


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
        "ar-AR": {"elevenlabs_voice": "cgSgspJ2msm6clMCkdW9", "soniox_lang": "ar"},
        "es-MX": {"elevenlabs_voice": "m7yTemJqdIqrcNleANfX", "soniox_lang": "es"},
        "ru-RU": {"elevenlabs_voice": "cgSgspJ2msm6clMCkdW9", "soniox_lang": "ru"},
        "mi-NZ": {"elevenlabs_voice": "BHhU6fTKdSX6bN7T1tpz", "soniox_lang": "en"},
    }
    lang_config = language_map.get(language, language_map["ar-AR"])

    # Configure transport
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=ProtobufFrameSerializer(),
        ),
    )

    # Configure STT (Soniox)
    stt = SonioxSTTService(
        api_key=os.getenv("SONIOX_API_KEY"),
        params=SonioxInputParams(
            language_hints=[lang_config["soniox_lang"]],
        ),
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

    # Create RTVI processor and observer for real-time transcription
    rtvi = RTVIProcessor(transport=transport)
    rtvi_observer = RTVIObserver(
        rtvi=rtvi,
        params=RTVIObserverParams(
            user_transcription_enabled=True,
            bot_llm_enabled=True,
            bot_tts_enabled=True,
            bot_speaking_enabled=True,
            user_speaking_enabled=True,
        ),
    )

    # Build pipeline
    pipeline = Pipeline(
        [
            transport.input(),  # WebSocket input
            rtvi,  # RTVI protocol handler
            stt,  # Speech-to-text
            user_aggregator,  # User context aggregation
            llm,  # Language model
            tts,  # Text-to-speech
            transport.output(),  # WebSocket output
            assistant_aggregator,  # Assistant context aggregation
        ]
    )

    # Create pipeline task with RTVI observer
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[rtvi_observer],
    )

    # Debug: Log STT events
    @stt.event_handler("on_transcription")
    async def on_transcription(stt_service, frame):
        logger.debug(f"STT transcription (interim): {frame.text}")

    @stt.event_handler("on_final_transcription")
    async def on_final_transcription(stt_service, frame):
        logger.info(f"STT transcription (final): {frame.text}")

    # Debug: Log user aggregator events
    @user_aggregator.event_handler("on_user_turn_started")
    async def on_user_turn_started(aggregator, strategy):
        logger.debug(f"User turn started (strategy: {type(strategy).__name__})")

    # Persist transcript updates to database via aggregator events
    @user_aggregator.event_handler("on_user_turn_stopped")
    async def on_user_turn_stopped(aggregator, strategy, message):
        logger.info(f"User turn stopped: {message.content}")
        try:
            await create_transcript_message(
                session_id=session_id,
                message_source="user",
                message_kind="transcript",
                message_content=message.content,
            )
        except Exception as e:
            logger.error(f"Failed to persist user transcript: {e}")

    # Debug: Log assistant aggregator events
    @assistant_aggregator.event_handler("on_assistant_turn_started")
    async def on_assistant_turn_started(aggregator):
        logger.debug("Assistant turn started")

    @assistant_aggregator.event_handler("on_assistant_turn_stopped")
    async def on_assistant_turn_stopped(aggregator, message):
        logger.info(f"Assistant turn stopped: {message.content}")
        try:
            await create_transcript_message(
                session_id=session_id,
                message_source="tutor",
                message_kind="transcript",
                message_content=message.content,
            )
        except Exception as e:
            logger.error(f"Failed to persist assistant transcript: {e}")

    # RTVI event handlers
    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(processor):
        """Handle RTVI client ready - send bot ready response."""
        logger.info(f"RTVI client ready for session {session_id}")
        await processor.set_bot_ready()

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
