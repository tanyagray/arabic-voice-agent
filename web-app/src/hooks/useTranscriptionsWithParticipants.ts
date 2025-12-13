import { useStore } from '../store';

interface TranscriptionEntry {
  text: string;
  participantIdentity: string;
  timestamp: number;
  type: 'user' | 'agent';
}

export function useTranscriptionsWithParticipants(): TranscriptionEntry[] {
  const messages = useStore((state) => state.session.messages);

  // Map ChatMessage to TranscriptionEntry format
  return messages.map((msg) => ({
    text: msg.text,
    participantIdentity: msg.role,
    timestamp: msg.timestamp.getTime(),
    type: msg.role === 'user' ? 'user' : 'agent',
  }));
}
