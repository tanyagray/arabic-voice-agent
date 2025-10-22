import { useState, useEffect, useMemo } from 'react';
import { useRoomContext, useChat } from '@livekit/components-react';
import { RoomEvent, type TranscriptionSegment, type Participant } from 'livekit-client';

interface TranscriptionEntry {
  text: string;
  participantIdentity: string;
  timestamp: number;
  type: 'transcription' | 'chat';
}

export function useTranscriptionsWithParticipants() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const room = useRoomContext();
  const { chatMessages } = useChat();

  useEffect(() => {
    if (!room) return;

    // Handle voice transcriptions (STT from audio)
    const handleTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      const newEntries = segments
        .filter(segment => segment.final) // Only process final segments
        .map(segment => ({
          text: segment.text,
          participantIdentity: participant?.identity || 'unknown',
          timestamp: Date.now(),
          type: 'transcription' as const,
        }));

      if (newEntries.length > 0) {
        setTranscriptions(prev => [...prev, ...newEntries]);
      }
    };

    // Listen to transcription events
    room.on(RoomEvent.TranscriptionReceived, handleTranscription);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

  // Merge transcriptions with chat messages
  const allMessages = useMemo(() => {
    // Convert chat messages to TranscriptionEntry format
    const chatEntries: TranscriptionEntry[] = chatMessages.map(msg => ({
      text: msg.message,
      participantIdentity: msg.from?.identity || 'unknown',
      timestamp: msg.timestamp,
      type: 'chat' as const,
    }));

    // Combine and sort by timestamp
    return [...transcriptions, ...chatEntries].sort((a, b) => a.timestamp - b.timestamp);
  }, [transcriptions, chatMessages]);

  return allMessages;
}
