/**
 * Type definitions for session state management.
 */

import type { ChatMessage } from '@/api/sessions/sessions.types';

export interface SessionState {
  // State
  sessionId: string | null;
  messages: ChatMessage[];
  currentInput: string;

  // Actions
  setSessionId: (sessionId: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setCurrentInput: (input: string) => void;
  reset: () => void;
}
