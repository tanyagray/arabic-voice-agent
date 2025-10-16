import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, TranscriptionSegment } from 'livekit-client';

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

    const handleTranscription = (segments: TranscriptionSegment[], participantIdentity?: string) => {
      const newEntries = segments.map(segment => ({
        text: segment.final ? segment.final : segment.text,
        participantIdentity: participantIdentity || 'unknown',
        timestamp: Date.now(),
      }));

      setTranscriptions(prev => [...prev, ...newEntries]);
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

  return transcriptions;
}
