import { useSessionContext } from '../context/SessionContext';

interface TranscriptionEntry {
  text: string;
  participantIdentity: string;
  timestamp: number;
  type: 'user' | 'agent';
}

export function useTranscriptionsWithParticipants(): TranscriptionEntry[] {
  const { messages } = useSessionContext();

  // Messages from SessionContext already have the correct format
  return messages;
}
