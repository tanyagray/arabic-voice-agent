/**
 * Zustand store for session state management.
 *
 * This store manages the client-side state for chat messages,
 * session information, and UI state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SessionState } from './session.state';

/**
 * Session store hook.
 *
 * Usage:
 * ```tsx
 * const { messages, addMessage, sessionId } = useSessionStore();
 * ```
 */
export const useSessionStore = create<SessionState>()(
  devtools(
    (set) => ({
  sessionId: null,
  messages: [],
  currentInput: '',

  setSessionId: (sessionId) => set({ sessionId }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setCurrentInput: (input) => set({ currentInput: input }),

  reset: () =>
    set({
      sessionId: null,
      messages: [],
      currentInput: '',
    }),
    }),
    { name: 'SessionStore' }
  )
);
