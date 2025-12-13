/**
 * Session store slice.
 *
 * This slice manages the client-side state for chat messages,
 * session information, and UI state.
 */

import type { StateCreator } from 'zustand';
import { getSessions, createSession, sendMessage as sendMessageApi } from '@/api/sessions/sessions.api';
import type { SessionState } from './session.state';
import type { ChatMessage } from '@/api/sessions/sessions.types';

/**
 * Namespaced session slice state.
 */
export interface SessionSlice {
  session: SessionState;
}

/**
 * Creates the session slice.
 *
 * This is a slice factory that can be composed into a larger store.
 * The slice is namespaced under the 'session' key.
 */
export const createSessionSlice: StateCreator<SessionSlice> = (set, get) => ({
  session: {
    activeSession: null,
    sessions: [],
    messages: [],

    setActiveSession: (session) =>
      set((state) => ({
        session: {
          ...state.session,
          activeSession: session,
        },
      })),

    loadSessions: async () => {
      const sessions = await getSessions();
      // Set the most recent session as active (assuming sessions are sorted by created_at descending)
      const mostRecentSession = sessions.length > 0 ? sessions[0] : null;
      set((state) => ({
        session: {
          ...state.session,
          sessions,
          activeSession: mostRecentSession,
        },
      }));
    },

    addMessage: (message) =>
      set((state) => ({
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
        },
      })),

    setMessages: (messages) =>
      set((state) => ({
        session: {
          ...state.session,
          messages,
        },
      })),

    clearMessages: () =>
      set((state) => ({
        session: {
          ...state.session,
          messages: [],
        },
      })),

    reset: () =>
      set((state) => ({
        session: {
          ...state.session,
          activeSession: null,
          messages: [],
        },
      })),

    createNewSession: async () => {
      const newSessionId = await createSession();
      set((state) => ({
        session: {
          ...state.session,
          activeSession: {
            session_id: newSessionId,
            created_at: new Date().toISOString(),
          },
        },
      }));
    },

    sendMessage: async (message: string) => {
      const { session } = get();
      const { activeSession, addMessage } = session;

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
  },
});
