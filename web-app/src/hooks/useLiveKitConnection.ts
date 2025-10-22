import { useState, useCallback, useEffect } from 'react';

interface UseLiveKitConnectionReturn {
  token: string;
  wsUrl: string;
  error: string;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useLiveKitConnection(): UseLiveKitConnectionReturn {
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: 'arabic-tutor-demo',
          participant_identity: `web-${Date.now()}`,
          participant_name: 'Web User',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      setToken(data.token);
      setWsUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      console.error('Error generating token:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setToken('');
    setWsUrl('');
    setError('');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    token,
    wsUrl,
    error,
    isLoading,
    connect,
    disconnect,
  };
}
