/**
 * Type definitions for session state management.
 */

import type { TranscriptMessage, Session } from '@/api/sessions/sessions.types';

export interface SessionContext {
  active_tool: string | null;
  language: string;
}

export interface SessionState {
  // State
  activeSessionId: string | null;
  sessions: Session[];
  messages: TranscriptMessage[];
  context: SessionContext;

  // Actions
  setActiveSessionId: (sessionId: string | null) => void;
  loadSessions: () => Promise<void>;
  addMessage: (message: TranscriptMessage) => void;
  setMessages: (messages: TranscriptMessage[]) => void;
  clearMessages: () => void;
  reset: () => void;
  setContext: (context: Partial<SessionContext>) => void;

  // API Actions
  createNewSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
}
