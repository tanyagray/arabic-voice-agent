import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, ConnectionState } from '../types/chat';

interface UseChatReturn {
  messages: Message[];
  sendMessage: (text: string) => void;
  connectionState: ConnectionState;
  error: string | null;
}

export function useChat(sessionId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    // Convert http(s) to ws(s)
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    const url = `${wsUrl}/session/${sessionId}`;

    setConnectionState('connecting');
    setError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setError(null);
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);

        // Parse the JSON message
        try {
          const message = JSON.parse(event.data);

          // Handle transcript messages
          if (message.kind === 'transcript') {
            const agentMessage: Message = {
              text: message.data.text,
              participantIdentity: message.data.source || 'agent',
              timestamp: Date.now(),
              type: 'agent',
            };
            setMessages((prev) => [...prev, agentMessage]);
          }
          // Handle context messages (ignore for now, but can be used for state updates)
          else if (message.kind === 'context') {
            console.log('Context update received:', message.data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionState('error');
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnectionState('disconnected');
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setConnectionState('error');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [sessionId]);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      setError('Not connected to chat');
      return;
    }

    // Add user message to messages immediately
    const userMessage: Message = {
      text,
      participantIdentity: 'user',
      timestamp: Date.now(),
      type: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to server
    wsRef.current.send(text);
  }, []);

  // Connect when sessionId is available
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, connect]);

  return {
    messages,
    sendMessage,
    connectionState,
    error,
  };
}
