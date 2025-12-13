/**
 * Type definitions for session state management.
 */

import type { ChatMessage, Session } from '@/api/sessions/sessions.types';

export interface SessionContext {
  active_tool: string | null;
  language: string;
  audio_enabled: boolean;
}

export interface SessionState {
  // State
  activeSession: Session | null;
  sessions: Session[];
  messages: ChatMessage[];
  context: SessionContext;

  // Actions
  setActiveSession: (session: Session | null) => void;
  loadSessions: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  reset: () => void;
  setContext: (context: Partial<SessionContext>) => void;
  setAudioEnabled: (enabled: boolean) => Promise<void>;

  // API Actions
  createNewSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
}
