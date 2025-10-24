import { useState, useEffect, useCallback } from 'react';

interface SessionResponse {
  session_id: string;
}

interface UseSessionReturn {
  sessionId: string | null;
  isCreating: boolean;
  error: string | null;
  createSession: () => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Auto-create session on mount
  useEffect(() => {
    createSession();
  }, [createSession]);

  return {
    sessionId,
    isCreating,
    error,
    createSession,
  };
}
