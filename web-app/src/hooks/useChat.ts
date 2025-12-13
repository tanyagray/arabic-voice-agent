import { useState, useEffect, useCallback, useRef } from 'react';
import { sendVoiceMessage } from '../api/sessions/sessions.api';
import type {
  Message,
  ConnectionState,
  WebSocketMessage,
  AudioMessageData,
  TranscriptMessageData
} from '../types/chat';

interface UseChatReturn {
  messages: Message[];
  sendMessage: (text: string) => void;
  uploadAudio: (audioBlob: Blob) => Promise<void>;
  connectionState: ConnectionState;
  error: string | null;
}

export function useChat(sessionId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Function to play audio from base64 data
  const playAudioMessage = useCallback((audioDataBase64: string, format: string) => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Decode base64 to binary
      const binaryString = atob(audioDataBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob with appropriate MIME type
      const mimeType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;
      const audioBlob = new Blob([bytes], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      // Clean up object URL when audio finishes
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      // Clean up on error
      audio.onerror = (err) => {
        console.error('Error playing audio:', err);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      // Auto-play the audio
      audio.play().catch((err) => {
        console.error('Error auto-playing audio:', err);
        URL.revokeObjectURL(audioUrl);
      });

      console.log('Audio playback started');
    } catch (err) {
      console.error('Error processing audio message:', err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!sessionId) return;

    // Get the access token from Supabase
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.error('No access token available');
      setConnectionState('error');
      setError('Authentication required');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    // Convert http(s) to ws(s)
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    const url = `${wsUrl}/realtime-session/${sessionId}?token=${encodeURIComponent(session.access_token)}`;

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
          const message: WebSocketMessage = JSON.parse(event.data);

          // Handle transcript messages
          if (message.kind === 'transcript') {
            const data = message.data as TranscriptMessageData;
            const source = data.source || 'agent';
            const messageType = source === 'user' ? 'user' : 'agent';

            const transcriptMessage: Message = {
              text: data.text,
              participantIdentity: source,
              timestamp: Date.now(),
              type: messageType,
            };
            setMessages((prev) => [...prev, transcriptMessage]);
          }
          // Handle audio messages
          else if (message.kind === 'audio') {
            console.log('Audio message received');
            const audioData = message.data as AudioMessageData;
            playAudioMessage(audioData.audio_data, audioData.format);
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

  const uploadAudio = useCallback(async (audioBlob: Blob) => {
    if (!sessionId) {
      console.error('No session ID available');
      setError('No active session');
      return;
    }

    try {
      await sendVoiceMessage(sessionId, audioBlob);
      console.log('Audio uploaded successfully');
      // The transcription will be sent back via WebSocket when complete
    } catch (err) {
      console.error('Error uploading audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload audio');
      throw err;
    }
  }, [sessionId]);

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
      // Stop any playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [sessionId, connect]);

  return {
    messages,
    sendMessage,
    uploadAudio,
    connectionState,
    error,
  };
}
