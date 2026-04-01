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
from pipecat.transcriptions.language import Language
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

from agent.tutor.tutor_instructions import _load_instructions
from .agent_session import AgentSession
from .context_service import get_context
from .scaffolding_service import generate_scaffolded_text, generate_transliterated_text
from .transcript_service import create_transcript_message


class DisplayTextGate(FrameProcessor):
    """Buffers full LLM response, generates display text, then releases to TTS.

    Sits between LLM and TTS. Accumulates all TextFrame tokens until
    LLMFullResponseEndFrame, calls the appropriate display text service
    (scaffolding or transliteration based on response_mode), passes the result
    to TTSTranscriptProcessor, then releases all buffered frames downstream.
    """

    def __init__(self, tts_transcript: "TTSTranscriptProcessor", session_id: str):
        super().__init__()
        self._buffered_frames: list = []
        self._buffering = False
        self._tts_transcript = tts_transcript
        self._session_id = session_id

    def _get_response_mode(self) -> str:
        context = get_context(self._session_id)
        return context.agent.response_mode if context else "scaffolded"

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
            logger.info(f"DisplayTextGate: canonical='{canonical_text}'")

            response_mode = self._get_response_mode()

            if response_mode == "canonical":
                # Canonical: pass through raw Arabic text with no transformation
                logger.info(f"DisplayTextGate: canonical (no transform)")
                for buffered_frame in self._buffered_frames:
                    await self.push_frame(buffered_frame, direction)
            elif response_mode == "transliterated":
                # Transliteration: word count matches canonical, enable word-by-word sync
                display_text = await generate_transliterated_text(canonical_text)
                logger.info(f"DisplayTextGate: transliterated='{display_text}'")
                transliterated_words = display_text.split()
                self._tts_transcript.set_transliteration_queue(transliterated_words)
                for buffered_frame in self._buffered_frames:
                    await self.push_frame(buffered_frame, direction)
            else:
                # Scaffolding: build TTS text (Arabic script) and display text (Arabizi)
                scaffolded = await generate_scaffolded_text(canonical_text)
                display_text = scaffolded.text
                tts_text = scaffolded.build_tts_text()
                logger.info(f"DisplayTextGate: scaffolded='{display_text}' tts='{tts_text}'")
                # Set up word queue so TTS words (Arabic) get swapped to Arabizi for client
                display_words = display_text.split()
                self._tts_transcript.set_transliteration_queue(display_words)
                # Store canonical for DB persistence
                self._tts_transcript.set_scaffolded_canonical(canonical_text)

                # Send Arabic-script version to TTS for proper pronunciation
                if tts_text:
                    await self.push_frame(TextFrame(text=tts_text), direction)
                else:
                    for buffered_frame in self._buffered_frames:
                        await self.push_frame(buffered_frame, direction)
            self._buffered_frames = []

            # Release the end frame
            await self.push_frame(frame, direction)

        else:
            # Pass through all other frames immediately (audio, control, etc.)
            await self.push_frame(frame, direction)


class TTSTranscriptProcessor(FrameProcessor):
    """Generates display text alongside TTS audio and saves to database.

    Supports two modes controlled by DisplayTextGate:
    - Transliterated: word-by-word replacement synced with TTS audio via queue.
    - Scaffolded: full display text stored upfront, canonical words accumulated
      from TTS frames, both persisted on TTSStoppedFrame.
    """

    def __init__(self, session_id: str):
        super().__init__()
        self._session_id = session_id
        self._current_sentence_canonical: list[str] = []
        self._current_sentence_transliterated: list[str] = []
        self._transliteration_queue: list[str] = []
        self._queue_index: int = 0
        # For scaffolded mode: full display text set by DisplayTextGate
        self._display_text: str | None = None
        # For scaffolded mode: canonical text when TTS receives scaffolded text directly
        self._scaffolded_canonical: str | None = None

    def set_transliteration_queue(self, words: list[str]):
        """Set the transliteration word queue (transliterated mode)."""
        self._transliteration_queue = words
        self._queue_index = 0
        self._display_text = None  # clear scaffolded text
        logger.debug(f"TTSTranscriptProcessor: transliteration queue set ({len(words)} words)")

    def set_display_text(self, text: str):
        """Set full display text (scaffolded mode) — legacy, kept for compatibility."""
        self._display_text = text
        self._transliteration_queue = []  # clear transliteration queue
        self._queue_index = 0
        logger.debug(f"TTSTranscriptProcessor: scaffolded display text set")

    def set_scaffolded_canonical(self, canonical_text: str):
        """Set the canonical Arabic text for scaffolded mode DB persistence.

        In scaffolded mode, TTS receives Arabic-script text but the display word
        queue (set via set_transliteration_queue) swaps words to Arabizi for the
        client. This just stores the original canonical for the DB.
        """
        self._scaffolded_canonical = canonical_text
        self._display_text = None
        logger.debug(f"TTSTranscriptProcessor: scaffolded canonical set")

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

                if self._transliteration_queue:
                    # Transliterated mode: dequeue next word and mutate frame
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

                # Scaffolded mode: no per-word mutation, pass canonical through

        elif isinstance(frame, TTSStoppedFrame):
            if self._current_sentence_canonical:
                if self._scaffolded_canonical is not None:
                    # Scaffolded mode: display text from word queue (Arabizi),
                    # canonical stored separately
                    canonical_text = self._scaffolded_canonical
                    self._scaffolded_canonical = None
                    if self._current_sentence_transliterated:
                        display_text = " ".join(self._current_sentence_transliterated)
                    else:
                        display_text = " ".join(self._current_sentence_canonical)
                elif self._display_text is not None:
                    # Legacy scaffolded mode (display text set directly)
                    canonical_text = " ".join(self._current_sentence_canonical)
                    display_text = self._display_text
                    self._display_text = None
                else:
                    # Transliterated mode: join accumulated words
                    canonical_text = " ".join(self._current_sentence_canonical)
                    display_text = " ".join(self._current_sentence_transliterated)

                logger.info(f"TTS sentence: canonical='{canonical_text}' display='{display_text}'")
                try:
                    await create_transcript_message(
                        session_id=self._session_id,
                        message_source="tutor",
                        message_kind="transcript",
                        message_text=display_text,
                        message_text_canonical=canonical_text,
                    )
                except Exception as e:
                    logger.error(f"Failed to persist TTS transcript: {e}")
                self._current_sentence_canonical = []
                self._current_sentence_transliterated = []

        # Always pass the frame downstream
        await self.push_frame(frame, direction)


def _convert_session_items_to_messages(items: list[dict]) -> list[dict]:
    """Convert OpenAI Agents SDK session items to simple chat messages.

    Filters for message-type items and extracts role/content pairs suitable
    for Pipecat's LLMContext.
    """
    messages = []
    for item in items:
        if item.get("type") != "message":
            continue
        role = item.get("role")
        if role not in ("user", "assistant"):
            continue
        content = item.get("content", "")
        # Content may be a list of content blocks (OpenAI format)
        if isinstance(content, list):
            text_parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "output_text":
                    text_parts.append(block.get("text", ""))
                elif isinstance(block, dict) and block.get("type") == "input_text":
                    text_parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    text_parts.append(block)
            content = " ".join(text_parts)
        if content:
            messages.append({"role": role, "content": content})
    return messages


async def run_pipecat_agent(
    websocket: WebSocket,
    session_id: str,
    session: AgentSession,
    user_access_token: Optional[str] = None,
) -> None:
    """
    Run a pipecat-based voice agent pipeline for a session.

    Args:
        websocket: FastAPI WebSocket connection
        session_id: Session identifier
        session: The AgentSession with conversation history
        user_access_token: Optional user access token for authentication
    """
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

    # Configure TTS (ElevenLabs) — use Arabic language hint for accent
    tts = ElevenLabsTTSService(
        api_key=os.getenv("ELEVEN_API_KEY"),
        voice_id=lang_config["elevenlabs_voice"],
        params=ElevenLabsTTSService.InputParams(
            language=Language.AR,
        ),
    )

    # Build LLM context from real tutor instructions + conversation history
    system_prompt = _load_instructions(language)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    # Load prior conversation history from the session
    session_items = await session.get_items()
    if session_items:
        history = _convert_session_items_to_messages(session_items)
        messages.extend(history)
        logger.info(f"Loaded {len(history)} messages from session history for {session_id}")

    # Always end with a user message so the LLM responds when LLMRunFrame fires
    messages.append({"role": "system", "content": "The user just joined a voice call with you. Greet them warmly."})

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

    # Create TTS transcript processor (must be created before DisplayTextGate)
    tts_transcript = TTSTranscriptProcessor(session_id)

    # Create display text gate between LLM and TTS
    display_text_gate = DisplayTextGate(tts_transcript, session_id)

    # Build pipeline
    pipeline = Pipeline(
        [
            transport.input(),  # WebSocket input
            rtvi,  # RTVI protocol handler
            stt,  # Speech-to-text
            user_aggregator,  # User context aggregation
            llm,  # Language model
            display_text_gate,  # Buffer response, generate display text
            tts,  # Text-to-speech (receives scaffolded or canonical text)
            tts_transcript,  # Word-sync for transliterated mode, save to DB
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
        # Write back to AgentSession so chat agent can see voice history
        try:
            await session.add_items([{"type": "message", "role": "user", "content": message.content}])
        except Exception as e:
            logger.error(f"Failed to write user turn to AgentSession: {e}")

    # Debug: Log assistant aggregator events
    @assistant_aggregator.event_handler("on_assistant_turn_started")
    async def on_assistant_turn_started(aggregator):
        logger.debug("Assistant turn started")

    @assistant_aggregator.event_handler("on_assistant_turn_stopped")
    async def on_assistant_turn_stopped(aggregator, message):
        # Note: Transcript is saved per-sentence by TTSTranscriptProcessor
        logger.debug(f"Assistant turn stopped (full response): {message.content}")
        # Write back to AgentSession so chat agent can see voice history
        try:
            await session.add_items([{"type": "message", "role": "assistant", "content": message.content}])
        except Exception as e:
            logger.error(f"Failed to write assistant turn to AgentSession: {e}")

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
