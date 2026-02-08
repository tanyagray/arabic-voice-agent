/**
 * Session store slice.
 *
 * This slice manages the client-side state for chat messages,
 * session information, and UI state.
 */

import axios from 'axios';
import type { StateCreator } from 'zustand';
import {
  getSessions,
  createSession,
  sendMessage as sendMessageApi,
} from '@/api/sessions/sessions.api';
import type { SessionState } from './session.state';

// Track the current pending message request's AbortController
let pendingMessageController: AbortController | null = null;

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

      if (!sessions || sessions.length === 0) {
        await get().session.createNewSession();
        get().session.loadSessions();
        return;
      }

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

    sendMessage: async (message: string) => {
      const { session } = get();
      const { activeSessionId } = session;

      if (!activeSessionId) {
        throw new Error('No active session. Create a session first.');
      }

      // Cancel any pending message request (interruption)
      if (pendingMessageController) {
        pendingMessageController.abort();
      }

      // Create a new AbortController for this request
      const controller = new AbortController();
      pendingMessageController = controller;

      try {
        // Messages are added via Supabase Realtime subscription in useTranscriptMessages
        await sendMessageApi(activeSessionId, message, controller.signal);
      } catch (error) {
        // Ignore cancellation errors (user interrupted with a new message)
        if (axios.isCancel(error)) {
          return;
        }
        throw error;
      } finally {
        // Clear the controller if this was the active request
        if (pendingMessageController === controller) {
          pendingMessageController = null;
        }
      }
    },

  },
});
