/**
 * Root Zustand store with devtools enabled.
 *
 * This store manages session state with devtools middleware.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createSessionSlice, type SessionSlice } from './session/session.store';

/**
 * Combined store state.
 */
export type AppStore = SessionSlice;

/**
 * Root store hook.
 *
 * Usage:
 * ```tsx
 * const { activeSessionId, messages, createNewSession } = useStore((state) => state.session);
 * const activeSessionId = useStore((state) => state.session.activeSessionId);
 * ```
 */
export const useStore = create<AppStore>()(
  devtools(
    (...args) => ({
      ...createSessionSlice(...args),
    }),
    { name: 'AppStore' }
  )
);

// Export individual slice types for convenience
export type { SessionState } from './session/session.state';
