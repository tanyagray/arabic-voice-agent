"""Custom Pipecat frame processors for display text and transcript handling."""

from loguru import logger

from pipecat.frames.frames import (
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    TextFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    TTSTextFrame,
)
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection

from harness.context import get_context
from harness.scaffolding import generate_scaffolded_text, generate_transliterated_text
from services.transcript_service import create_transcript_message


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
                context = get_context(self._session_id)
                last_user_message = context.agent.last_user_message if context else None
                scaffolded = await generate_scaffolded_text(canonical_text, user_message=last_user_message)
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
