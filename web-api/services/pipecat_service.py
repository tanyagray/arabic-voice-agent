"""Pipecat service for real-time voice agent pipeline."""

import os
from typing import Optional

from fastapi import WebSocket
from loguru import logger

from pipecat.frames.frames import (
    EndFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMRunFrame,
    TextFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    TTSTextFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
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
from .scaffolding_service import generate_transliterated_text
from .session_service import get_session
from .transcript_service import create_transcript_message


class TransliterationGate(FrameProcessor):
    """Buffers full LLM response, transliterates it, then releases to TTS.

    Sits between LLM and TTS. Accumulates all TextFrame tokens until
    LLMFullResponseEndFrame, calls the transliteration service, stores the
    transliterated word queue on the TTSTranscriptProcessor, then releases
    all buffered frames downstream.
    """

    def __init__(self, tts_transcript: "TTSTranscriptProcessor"):
        super().__init__()
        self._buffered_frames: list = []
        self._buffering = False
        self._tts_transcript = tts_transcript

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._buffering = True
            self._buffered_frames = []
            await self.push_frame(frame, direction)

        elif self._buffering and isinstance(frame, TextFrame) and not isinstance(frame, TTSTextFrame):
            # Buffer LLM text tokens (guard against TTSTextFrame which is a TextFrame subclass)
            self._buffered_frames.append(frame)

        elif isinstance(frame, LLMFullResponseEndFrame):
            self._buffering = False
            canonical_text = "".join(f.text for f in self._buffered_frames)
            logger.info(f"TransliterationGate: canonical='{canonical_text}'")

            # Call transliteration service
            transliterated = await generate_transliterated_text(canonical_text)
            logger.info(f"TransliterationGate: transliterated='{transliterated}'")

            # Build word queue and pass to TTSTranscriptProcessor
            transliterated_words = transliterated.split()
            self._tts_transcript.set_transliteration_queue(transliterated_words)

            # Release all buffered text frames downstream to TTS
            for buffered_frame in self._buffered_frames:
                await self.push_frame(buffered_frame, direction)
            self._buffered_frames = []

            # Release the end frame
            await self.push_frame(frame, direction)

        else:
            # Pass through all other frames immediately (audio, control, etc.)
            await self.push_frame(frame, direction)


class TTSTranscriptProcessor(FrameProcessor):
    """Replaces TTS text with transliterated words and saves to database.

    Intercepts TTSTextFrame events (one per word, synchronized with audio),
    replaces the frame text with the next transliterated word from the queue,
    and accumulates both canonical and transliterated text for DB storage.
    """

    def __init__(self, session_id: str):
        super().__init__()
        self._session_id = session_id
        self._current_sentence_canonical: list[str] = []
        self._current_sentence_transliterated: list[str] = []
        self._transliteration_queue: list[str] = []
        self._queue_index: int = 0

    def set_transliteration_queue(self, words: list[str]):
        """Set the transliteration word queue for the current LLM response."""
        self._transliteration_queue = words
        self._queue_index = 0
        logger.debug(f"TTSTranscriptProcessor: transliteration queue set ({len(words)} words)")

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TTSStartedFrame):
            logger.debug("TTSTranscriptProcessor: TTSStartedFrame received")
            self._current_sentence_canonical = []
            self._current_sentence_transliterated = []

        elif isinstance(frame, TTSTextFrame):
            canonical_word = frame.text.strip()
            if canonical_word:
                self._current_sentence_canonical.append(canonical_word)

                # Dequeue next transliterated word
                if self._queue_index < len(self._transliteration_queue):
                    transliterated_word = self._transliteration_queue[self._queue_index]
                    self._queue_index += 1
                else:
                    transliterated_word = canonical_word
                    logger.warning(f"Transliteration queue exhausted at word '{canonical_word}'")

                self._current_sentence_transliterated.append(transliterated_word)
                logger.debug(f"TTSTranscriptProcessor: '{canonical_word}' → '{transliterated_word}'")

                # Mutate frame text so RTVIObserver sends transliterated to client
                frame.text = transliterated_word

        elif isinstance(frame, TTSStoppedFrame):
            if self._current_sentence_canonical:
                canonical_text = " ".join(self._current_sentence_canonical)
                transliterated_text = " ".join(self._current_sentence_transliterated)
                logger.info(f"TTS sentence: canonical='{canonical_text}' display='{transliterated_text}'")
                try:
                    await create_transcript_message(
                        session_id=self._session_id,
                        message_source="tutor",
                        message_kind="transcript",
                        message_text=transliterated_text,
                        message_text_canonical=canonical_text,
                    )
                except Exception as e:
                    logger.error(f"Failed to persist TTS transcript: {e}")
                self._current_sentence_canonical = []
                self._current_sentence_transliterated = []

        # Always pass the frame downstream
        await self.push_frame(frame, direction)


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
        "ar-IQ": {"elevenlabs_voice": "cgSgspJ2msm6clMCkdW9", "soniox_lang": "ar"},
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
    system_prompt = "You are a helpful Arabic language tutor. Keep your responses concise and conversational. When the conversation starts, greet the user warmly."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Hello"},
    ]
    llm_context = LLMContext(messages)
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(llm_context)

    # Create RTVI processor and observer for real-time transcription
    rtvi = RTVIProcessor(transport=transport)
    rtvi_observer = RTVIObserver(
        rtvi=rtvi,
        params=RTVIObserverParams(
            user_transcription_enabled=True,
            bot_llm_enabled=False,
            bot_tts_enabled=True,
            bot_speaking_enabled=True,
            user_speaking_enabled=True,
        ),
    )

    # Create TTS transcript processor (must be created before TransliterationGate)
    tts_transcript = TTSTranscriptProcessor(session_id)

    # Create transliteration gate between LLM and TTS
    transliteration_gate = TransliterationGate(tts_transcript)

    # Build pipeline
    pipeline = Pipeline(
        [
            transport.input(),  # WebSocket input
            rtvi,  # RTVI protocol handler
            stt,  # Speech-to-text
            user_aggregator,  # User context aggregation
            llm,  # Language model
            transliteration_gate,  # Buffer response, transliterate, build word queue
            tts,  # Text-to-speech (receives canonical Arabic)
            tts_transcript,  # Replace TTS words with transliterated, save to DB
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
                message_text=message.content,
            )
        except Exception as e:
            logger.error(f"Failed to persist user transcript: {e}")

    # Debug: Log assistant aggregator events
    @assistant_aggregator.event_handler("on_assistant_turn_started")
    async def on_assistant_turn_started(aggregator):
        logger.debug("Assistant turn started")

    @assistant_aggregator.event_handler("on_assistant_turn_stopped")
    async def on_assistant_turn_stopped(aggregator, message):
        # Note: Transcript is saved per-sentence by TTSTranscriptProcessor
        logger.debug(f"Assistant turn stopped (full response): {message.content}")

    # RTVI event handlers
    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(processor):
        """Handle RTVI client ready - send bot ready response and trigger greeting."""
        logger.info(f"RTVI client ready for session {session_id}")
        await processor.set_bot_ready()
        # Trigger initial greeting by running the LLM with the current context
        await task.queue_frames([LLMRunFrame()])

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
