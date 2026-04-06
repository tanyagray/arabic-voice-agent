import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useRTVIClientEvent } from '@pipecat-ai/client-react';
import { RTVIEvent } from '@pipecat-ai/client-js';
import type { TranscriptData, BotTTSTextData } from '@pipecat-ai/client-js';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';
import { useSupabase } from '@/context/SupabaseContext';

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
    message_text: liveMessage.content,
    created_at: liveMessage.createdAt,
    updated_at: liveMessage.createdAt,
  };
}

/**
 * Hook that provides real-time transcript messages from the Pipecat connection.
 * Handles streaming STT results for user speech and word-synchronized TTS for agent speech.
 * Each TTS sentence becomes a separate message, matching the database structure.
 */
export function useLiveTranscript(sessionId: string | null) {
  const supabase = useSupabase();
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [dbMessages, setDbMessages] = useState<TranscriptMessage[]>([]);
  const currentUserMessageId = useRef<string | null>(null);
  const currentBotMessageId = useRef<string | null>(null);
  const botTextBuffer = useRef<string>('');

  // Subscribe to flash_cards messages from Supabase Realtime
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`flash_cards:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const msg = payload.new as TranscriptMessage;
          if (msg.message_kind === 'flash_cards') {
            setDbMessages((prev) => [...prev, msg]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId]);

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

  // Handle bot TTS started - create a new message
  // Also finalizes any previous message since events can arrive out of order
  useRTVIClientEvent(
    RTVIEvent.BotTtsStarted,
    useCallback(() => {
      console.log('[TTS] BotTtsStarted, previous msgId:', currentBotMessageId.current);

      // Finalize previous message if exists (handles out-of-order events)
      if (currentBotMessageId.current) {
        setLiveMessages((prev) =>
          prev.map((msg) =>
            msg.id === currentBotMessageId.current
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      }

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

  // Handle streaming TTS text (word-by-word, synchronized with audio playback)
  useRTVIClientEvent(
    RTVIEvent.BotTtsText,
    useCallback((data: BotTTSTextData) => {
      console.log('[TTS] BotTtsText:', data.text, 'msgId:', currentBotMessageId.current);
      if (!currentBotMessageId.current) {
        console.log('[TTS] BotTtsText DROPPED - no currentBotMessageId');
        return;
      }

      // Words arrive as they're spoken - append with proper spacing
      const newWord = data.text.trim();
      if (!newWord) return;

      if (botTextBuffer.current) {
        botTextBuffer.current += ' ' + newWord;
      } else {
        botTextBuffer.current = newWord;
      }
      const currentText = botTextBuffer.current;

      setLiveMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentBotMessageId.current
            ? { ...msg, content: currentText, isStreaming: true }
            : msg
        )
      );
    }, [])
  );

  // Handle bot TTS stopped - mark as not streaming but keep message ID
  // (more text events may arrive out of order)
  useRTVIClientEvent(
    RTVIEvent.BotTtsStopped,
    useCallback(() => {
      console.log('[TTS] BotTtsStopped, msgId:', currentBotMessageId.current, 'buffer:', botTextBuffer.current);
      if (!currentBotMessageId.current) return;

      setLiveMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentBotMessageId.current
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
      // Don't reset - more text events may arrive after this due to out-of-order delivery
    }, [])
  );

  // Reset when user starts speaking (new turn)
  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      console.log('[TTS] UserStartedSpeaking - resetting bot message');
      currentBotMessageId.current = null;
      botTextBuffer.current = '';
    }, [])
  );

  // Convert live messages to TranscriptMessage format and merge with DB messages
  const messages: TranscriptMessage[] = useMemo(() => {
    const live = liveMessages
      .filter((msg) => msg.content.trim() !== '')
      .map((msg) => createTranscriptMessage(msg, sessionId || ''));

    // Merge live transcript messages with flash_cards messages from DB, sorted by time
    const all = [...live, ...dbMessages];
    all.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return all;
  }, [liveMessages, dbMessages, sessionId]);

  // Clear all messages (useful when ending a call)
  const clearMessages = useCallback(() => {
    setLiveMessages([]);
    setDbMessages([]);
    currentUserMessageId.current = null;
    currentBotMessageId.current = null;
    botTextBuffer.current = '';
  }, []);

  return { messages, clearMessages };
}
