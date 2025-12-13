/**
 * Zustand store for session state management.
 *
 * This store manages the client-side state for chat messages,
 * session information, and UI state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getSessions, createSession, sendMessage as sendMessageApi } from '@/api/sessions/sessions.api';
import type { SessionState } from './session.state';
import type { ChatMessage } from '@/api/sessions/sessions.types';

/**
 * Session store hook.
 *
 * Usage:
 * ```tsx
 * const { messages, addMessage, activeSession, createNewSession } = useSessionStore();
 * ```
 */
export const useSessionStore = create<SessionState>()(
  devtools(
    (set, get) => ({
  activeSession: null,
  sessions: [],
  messages: [],

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

  reset: () =>
    set({
      activeSession: null,
      messages: [],
    }),

  createNewSession: async () => {
    const newSessionId = await createSession();
    set({
      activeSession: {
        session_id: newSessionId,
        created_at: new Date().toISOString(),
      },
    });
  },

  sendMessage: async (message: string) => {
    const { activeSession, addMessage } = get();

    if (!activeSession) {
      throw new Error('No active session. Create a session first.');
    }

    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: message,
      role: 'user',
      timestamp: new Date(),
    };
    addMessage(userMessage);

    const responseText = await sendMessageApi(activeSession.session_id, message);

    // Add assistant response
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      text: responseText,
      role: 'assistant',
      timestamp: new Date(),
    };
    addMessage(assistantMessage);
  },
    }),
    { name: 'SessionStore' }
  )
);
