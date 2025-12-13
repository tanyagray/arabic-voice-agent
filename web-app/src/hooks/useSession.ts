import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/api-client';
import { useAuth } from './useAuth';

interface SessionResponse {
  session_id: string;
}

interface ContextResponse {
  session_id: string;
  audio_enabled: boolean;
  language: string;
  active_tool: string | null;
}

interface UseSessionReturn {
  sessionId: string | null;
  isCreating: boolean;
  error: string | null;
  audioEnabled: boolean;
  isUpdatingContext: boolean;
  createSession: () => Promise<void>;
  toggleAudioEnabled: () => Promise<void>;
  setAudioEnabled: (enabled: boolean) => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabledState] = useState(false);
  const [isUpdatingContext, setIsUpdatingContext] = useState(false);

  const createSession = useCallback(async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<SessionResponse>('/session');
      setSessionId(response.data.session_id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating session:', err);
    } finally {
      setIsCreating(false);
    }
  }, []);

  const setAudioEnabled = useCallback(async (enabled: boolean) => {
    if (!sessionId) {
      console.error('Cannot update audio: no session ID');
      return;
    }

    setIsUpdatingContext(true);
    setError(null);

    try {
      const response = await apiClient.patch<ContextResponse>(
        `/session/${sessionId}/context`,
        { audio_enabled: enabled }
      );
      setAudioEnabledState(response.data.audio_enabled);
      console.log(`Audio ${response.data.audio_enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update audio setting';
      setError(errorMessage);
      console.error('Error updating audio setting:', err);
    } finally {
      setIsUpdatingContext(false);
    }
  }, [sessionId]);

  const toggleAudioEnabled = useCallback(async () => {
    await setAudioEnabled(!audioEnabled);
  }, [audioEnabled, setAudioEnabled]);

  // Fetch initial context when session is created
  useEffect(() => {
    const fetchContext = async () => {
      if (!sessionId) return;

      try {
        const response = await apiClient.get<ContextResponse>(`/session/${sessionId}/context`);
        setAudioEnabledState(response.data.audio_enabled);
      } catch (err) {
        console.error('Error fetching context:', err);
      }
    };

    fetchContext();
  }, [sessionId]);

  const { session: userSession, isLoading: isAuthLoading } = useAuth();
  const hasCreatedSession = useRef(false);

  // Auto-create session on mount, but only after auth is ready
  useEffect(() => {
    if (!isAuthLoading && userSession && !hasCreatedSession.current) {
      hasCreatedSession.current = true;
      createSession();
    }
  }, [createSession, isAuthLoading, userSession]);

  return {
    sessionId,
    isCreating,
    error,
    audioEnabled,
    isUpdatingContext,
    createSession,
    toggleAudioEnabled,
    setAudioEnabled,
  };
}
