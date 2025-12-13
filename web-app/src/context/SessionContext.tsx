import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import { useStore } from '../store';

interface SessionContextValue {
  sessionId: string | null;
  isCreating: boolean;
  sessionError: string | null;
  audioEnabled: boolean;
  isUpdatingContext: boolean;
  toggleAudioEnabled: () => Promise<void>;
  setAudioEnabled: (enabled: boolean) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const activeSession = useStore((state) => state.session.activeSession);
  const {
    isCreating,
    error: sessionError,
    audioEnabled,
    isUpdatingContext,
    toggleAudioEnabled,
    setAudioEnabled,
  } = useSession();

  const value: SessionContextValue = {
    sessionId: activeSession?.session_id ?? null,
    isCreating,
    sessionError,
    audioEnabled,
    isUpdatingContext,
    toggleAudioEnabled,
    setAudioEnabled,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
