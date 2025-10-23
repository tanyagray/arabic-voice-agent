/**
 * Zustand store for chat state management.
 *
 * This store manages the client-side state for chat messages,
 * session information, and UI state.
 */

import { create } from 'zustand';
import type { ChatMessage } from './types';

interface ChatState {
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

const initialState = {
  sessionId: null,
  messages: [],
  currentInput: '',
};

/**
 * Chat store hook.
 *
 * Usage:
 * ```tsx
 * const { messages, addMessage, sessionId } = useChatStore();
 * ```
 */
export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setSessionId: (sessionId) => set({ sessionId }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setCurrentInput: (input) => set({ currentInput: input }),

  reset: () => set(initialState),
}));
