import { useState, useCallback, useRef, useMemo } from 'react';
import { useRTVIClientEvent } from '@pipecat-ai/client-react';
import { RTVIEvent } from '@pipecat-ai/client-js';
import type { TranscriptData, BotLLMTextData } from '@pipecat-ai/client-js';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

interface LiveMessage {
  id: string;
  source: 'user' | 'tutor';
  content: string;
  isStreaming: boolean;
  createdAt: string;
}

function createTranscriptMessage(
  liveMessage: LiveMessage,
  sessionId: string
): TranscriptMessage {
  return {
    message_id: liveMessage.id,
    session_id: sessionId,
    user_id: '',
    message_source: liveMessage.source,
    message_kind: 'transcript',
    message_content: liveMessage.content,
    created_at: liveMessage.createdAt,
    updated_at: liveMessage.createdAt,
  };
}

/**
 * Hook that provides real-time transcript messages from the Pipecat connection.
 * Handles streaming STT results for user speech and streaming LLM results for agent speech.
 */
export function useLiveTranscript(sessionId: string | null) {
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const currentUserMessageId = useRef<string | null>(null);
  const currentBotMessageId = useRef<string | null>(null);
  const botTextBuffer = useRef<string>('');

  // Handle user transcript events (interim and final STT results)
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((data: TranscriptData) => {
      if (!data.text.trim()) return;

      setLiveMessages((prev) => {
        // If this is interim (not final), update or create the current user message
        if (!data.final) {
          if (currentUserMessageId.current) {
            // Update existing interim message
            return prev.map((msg) =>
              msg.id === currentUserMessageId.current
                ? { ...msg, content: data.text }
                : msg
            );
          } else {
            // Create new interim message
            const id = `user-${Date.now()}`;
            currentUserMessageId.current = id;
            return [
              ...prev,
              {
                id,
                source: 'user' as const,
                content: data.text,
                isStreaming: true,
                createdAt: new Date().toISOString(),
              },
            ];
          }
        } else {
          // Final transcript - finalize the message
          if (currentUserMessageId.current) {
            const finalMessages = prev.map((msg) =>
              msg.id === currentUserMessageId.current
                ? { ...msg, content: data.text, isStreaming: false }
                : msg
            );
            currentUserMessageId.current = null;
            return finalMessages;
          } else {
            // No interim message existed, create final directly
            const id = `user-${Date.now()}`;
            return [
              ...prev,
              {
                id,
                source: 'user' as const,
                content: data.text,
                isStreaming: false,
                createdAt: new Date().toISOString(),
              },
            ];
          }
        }
      });
    }, [])
  );

  // Handle bot LLM started - prepare for streaming
  useRTVIClientEvent(
    RTVIEvent.BotLlmStarted,
    useCallback(() => {
      const id = `bot-${Date.now()}`;
      currentBotMessageId.current = id;
      botTextBuffer.current = '';
      setLiveMessages((prev) => [
        ...prev,
        {
          id,
          source: 'tutor' as const,
          content: '',
          isStreaming: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    }, [])
  );

  // Handle streaming LLM text
  useRTVIClientEvent(
    RTVIEvent.BotLlmText,
    useCallback((data: BotLLMTextData) => {
      if (!currentBotMessageId.current) return;

      botTextBuffer.current += data.text;
      const currentText = botTextBuffer.current;

      setLiveMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentBotMessageId.current
            ? { ...msg, content: currentText }
            : msg
        )
      );
    }, [])
  );

  // Handle bot LLM stopped - finalize the message
  useRTVIClientEvent(
    RTVIEvent.BotLlmStopped,
    useCallback(() => {
      if (!currentBotMessageId.current) return;

      setLiveMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentBotMessageId.current
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
      currentBotMessageId.current = null;
      botTextBuffer.current = '';
    }, [])
  );

  // Convert live messages to TranscriptMessage format (memoized to prevent unnecessary re-renders)
  const messages: TranscriptMessage[] = useMemo(
    () =>
      liveMessages
        .filter((msg) => msg.content.trim() !== '')
        .map((msg) => createTranscriptMessage(msg, sessionId || '')),
    [liveMessages, sessionId]
  );

  // Clear all messages (useful when ending a call)
  const clearMessages = useCallback(() => {
    setLiveMessages([]);
    currentUserMessageId.current = null;
    currentBotMessageId.current = null;
    botTextBuffer.current = '';
  }, []);

  return { messages, clearMessages };
}
