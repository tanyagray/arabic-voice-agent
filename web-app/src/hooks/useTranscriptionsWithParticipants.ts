import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type TranscriptionSegment, type Participant } from 'livekit-client';

interface TranscriptionEntry {
  text: string;
  participantIdentity: string;
  timestamp: number;
}

export function useTranscriptionsWithParticipants() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      const newEntries = segments
        .filter(segment => segment.final) // Only process final segments
        .map(segment => ({
          text: segment.text,
          participantIdentity: participant?.identity || 'unknown',
          timestamp: Date.now(),
        }));

      if (newEntries.length > 0) {
        setTranscriptions(prev => [...prev, ...newEntries]);
      }
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

  return transcriptions;
}
