/**
 * Type definitions for session state management.
 */

import type { ChatMessage, Session } from '@/api/sessions/sessions.types';

export interface SessionState {
  // State
  activeSession: Session | null;
  sessions: Session[];
  messages: ChatMessage[];

  // Actions
  setActiveSession: (session: Session | null) => void;
  loadSessions: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  reset: () => void;

  // API Actions
  createNewSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
}
