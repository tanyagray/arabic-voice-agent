export interface Message {
  text: string;
  participantIdentity: string;
  timestamp: number;
  type: 'user' | 'agent';
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

/**
 * WebSocket message types received from the backend
 */
export interface WebSocketMessage {
  kind: 'transcript' | 'audio' | 'context';
  data: Record<string, any>;
}

export interface AudioMessageData {
  audio_data: string; // Base64 encoded audio
  format: 'mp3' | 'wav' | 'webm';
}
