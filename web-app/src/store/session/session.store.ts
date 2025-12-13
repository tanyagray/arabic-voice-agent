/**
 * Zustand store for session state management.
 *
 * This store manages the client-side state for chat messages,
 * session information, and UI state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getSessions } from '@/api/sessions/sessions.api';
import type { SessionState } from './session.state';

/**
 * Session store hook.
 *
 * Usage:
 * ```tsx
 * const { messages, addMessage, activeSession } = useSessionStore();
 * ```
 */
export const useSessionStore = create<SessionState>()(
  devtools(
    (set) => ({
  activeSession: null,
  sessions: [],
  messages: [],
  currentInput: '',

  setActiveSession: (session) => set({ activeSession: session }),

  loadSessions: async () => {
    const sessions = await getSessions();
    // Set the most recent session as active (assuming sessions are sorted by created_at descending)
    const mostRecentSession = sessions.length > 0 ? sessions[0] : null;
    set({ sessions, activeSession: mostRecentSession });
  },

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setCurrentInput: (input) => set({ currentInput: input }),

  reset: () =>
    set({
      activeSession: null,
      messages: [],
      currentInput: '',
    }),
    }),
    { name: 'SessionStore' }
  )
);
