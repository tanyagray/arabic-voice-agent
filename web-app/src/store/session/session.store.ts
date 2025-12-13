/**
 * Zustand store for session state management.
 *
 * This store manages the client-side state for chat messages,
 * session information, and UI state.
 */

import { create } from 'zustand';
import type { SessionState } from './session.state';

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
export const useChatStore = create<SessionState>((set) => ({
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
