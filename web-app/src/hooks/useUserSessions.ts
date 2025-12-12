import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api-client';
import { useAuth } from '../contexts/AuthContext';

interface Session {
  session_id: string;
  created_at: string;
}

interface SessionListResponse {
  sessions: Session[];
}

interface UseUserSessionsReturn {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserSessions(): UseUserSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAnonymous } = useAuth();

  const fetchSessions = useCallback(async () => {
    if (isAnonymous || !user) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<SessionListResponse>('/session');
      setSessions(response.data.sessions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAnonymous]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
  };
}
