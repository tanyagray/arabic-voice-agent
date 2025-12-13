/**
 * Session store slice.
 *
 * This slice manages the client-side state for chat messages,
 * session information, and UI state.
 */

import type { StateCreator } from 'zustand';
import {
  getSessions,
  createSession,
  sendMessage as sendMessageApi,
  patchSessionContext,
} from '@/api/sessions/sessions.api';
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
    activeSessionId: null,
    sessions: [],
    messages: [],
    context: {
      active_tool: null,
      language: 'en',
      audio_enabled: false,
    },

    setActiveSessionId: (sessionId) =>
      set((state) => ({
        session: {
          ...state.session,
          activeSessionId: sessionId,
        },
      })),

    loadSessions: async () => {
      const sessions = await getSessions();
      // Set the most recent session as active (assuming sessions are sorted by created_at descending)
      const mostRecentSessionId = sessions.length > 0 ? sessions[0].session_id : null;
      set((state) => ({
        session: {
          ...state.session,
          sessions,
          activeSessionId: mostRecentSessionId,
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

    setContext: (context) =>
      set((state) => ({
        session: {
          ...state.session,
          context: {
            ...state.session.context,
            ...context,
          },
        },
      })),

    reset: () =>
      set((state) => ({
        session: {
          ...state.session,
          activeSessionId: null,
          messages: [],
        },
      })),

    createNewSession: async () => {
      await createSession();
    },

    setAudioEnabled: async (enabled: boolean) => {
      const { session } = get();
      const sessionId = session.activeSessionId;

      if (!sessionId) {
        console.error('Cannot update audio: no session ID');
        return;
      }

      const response = await patchSessionContext(sessionId, { audio_enabled: enabled });
      set((state) => ({
        session: {
          ...state.session,
          context: {
            ...state.session.context,
            audio_enabled: response.audio_enabled,
          },
        },
      }));
    },

    sendMessage: async (message: string) => {
      const { session } = get();
      const { activeSessionId, addMessage } = session;

      if (!activeSessionId) {
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

      const responseText = await sendMessageApi(activeSessionId, message);

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
