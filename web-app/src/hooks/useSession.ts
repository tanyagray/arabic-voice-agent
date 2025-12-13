import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createSession as createSessionApi,
  getSessionContext,
  patchSessionContext,
} from '../api/sessions/sessions.api';
import { useAuth } from './useAuth';

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
      const sessionId = await createSessionApi();
      setSessionId(sessionId);
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
      const response = await patchSessionContext(sessionId, { audio_enabled: enabled });
      setAudioEnabledState(response.audio_enabled);
      console.log(`Audio ${response.audio_enabled ? 'enabled' : 'disabled'}`);
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
        const context = await getSessionContext(sessionId);
        setAudioEnabledState(context.audio_enabled);
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
