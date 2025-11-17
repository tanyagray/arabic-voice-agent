import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import { useChat } from '../hooks/useChat';
import type { Message, ConnectionState } from '../types/chat';

interface SessionContextValue {
  sessionId: string | null;
  isCreating: boolean;
  sessionError: string | null;
  messages: Message[];
  sendMessage: (text: string) => void;
  uploadAudio: (audioBlob: Blob) => Promise<void>;
  connectionState: ConnectionState;
  chatError: string | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { sessionId, isCreating, error: sessionError } = useSession();
  const { messages, sendMessage, uploadAudio, connectionState, error: chatError } = useChat(sessionId);

  const value: SessionContextValue = {
    sessionId,
    isCreating,
    sessionError,
    messages,
    sendMessage,
    uploadAudio,
    connectionState,
    chatError,
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
