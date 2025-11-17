import { useState, useEffect, useCallback } from 'react';

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data: SessionResponse = await response.json();
      setSessionId(data.session_id);
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/session/${sessionId}/context`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_enabled: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update audio setting');
      }

      const data: ContextResponse = await response.json();
      setAudioEnabledState(data.audio_enabled);
      console.log(`Audio ${data.audio_enabled ? 'enabled' : 'disabled'}`);
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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/session/${sessionId}/context`);

        if (response.ok) {
          const data: ContextResponse = await response.json();
          setAudioEnabledState(data.audio_enabled);
        }
      } catch (err) {
        console.error('Error fetching context:', err);
      }
    };

    fetchContext();
  }, [sessionId]);

  // Auto-create session on mount
  useEffect(() => {
    createSession();
  }, [createSession]);

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
