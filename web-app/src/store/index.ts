/**
 * Root Zustand store with devtools enabled.
 *
 * This store composes the session and socket slices into a single store
 * with devtools middleware enabled at the root level.
 *
 * The store structure is namespaced with 'session' and 'socket' at the root level.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createSessionSlice, type SessionSlice } from './session/session.store';
import { createSocketSlice, type SocketSlice } from './socket/socket.store';

/**
 * Combined store state.
 *
 * This type combines all slice states into a single namespaced store state.
 */
export type AppStore = SessionSlice & SocketSlice;

/**
 * Root store hook.
 *
 * Usage:
 * ```tsx
 * // Session state and actions (namespaced under 'session')
 * const { activeSessionId, messages, createNewSession } = useStore((state) => state.session);
 *
 * // Socket state and actions (namespaced under 'socket')
 * const { status, connect, disconnect } = useStore((state) => state.socket);
 *
 * // Or destructure directly
 * const activeSessionId = useStore((state) => state.session.activeSessionId);
 * const socketStatus = useStore((state) => state.socket.status);
 * ```
 */
export const useStore = create<AppStore>()(
  devtools(
    (...args) => ({
      ...createSessionSlice(...args),
      ...createSocketSlice(...args),
    }),
    { name: 'AppStore' }
  )
);

// Export individual slice types for convenience
export type { SessionState } from './session/session.state';
export type { SocketState, SocketStatus } from './socket/socket.state';
