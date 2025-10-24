export interface Message {
  text: string;
  participantIdentity: string;
  timestamp: number;
  type: 'user' | 'agent';
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';
