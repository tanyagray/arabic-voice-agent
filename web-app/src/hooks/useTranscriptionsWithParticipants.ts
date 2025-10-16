import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type TranscriptionSegment, type Participant, type ChatMessage, type RemoteParticipant, type LocalParticipant } from 'livekit-client';

interface TranscriptionEntry {
  text: string;
  participantIdentity: string;
  timestamp: number;
  type: 'transcription' | 'chat';
}

export function useTranscriptionsWithParticipants() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const room = useRoomContext();

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

    // Handle chat messages (text sent via useChat)
    const handleChatMessage = (message: ChatMessage, participant?: RemoteParticipant | LocalParticipant) => {
      console.log('Chat message received:', message, 'from:', participant?.identity);

      const chatEntry: TranscriptionEntry = {
        text: message.message,
        participantIdentity: participant?.identity || 'unknown',
        timestamp: message.timestamp,
        type: 'chat',
      };

      setTranscriptions(prev => [...prev, chatEntry]);
    };

    // Listen to both events
    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    room.on(RoomEvent.ChatMessage, handleChatMessage);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
      room.off(RoomEvent.ChatMessage, handleChatMessage);
    };
  }, [room]);

  return transcriptions;
}
