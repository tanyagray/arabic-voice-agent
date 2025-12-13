/**
 * Type definitions for session state management.
 */

import type { ChatMessage, Session } from '@/api/sessions/sessions.types';

export interface SessionState {
  // State
  activeSession: Session | null;
  sessions: Session[];
  messages: ChatMessage[];
  currentInput: string;

  // Actions
  setActiveSession: (session: Session | null) => void;
  loadSessions: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setCurrentInput: (input: string) => void;
  reset: () => void;
}
