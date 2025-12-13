/**
 * Zustand store for WebSocket connection management.
 *
 * This store manages the WebSocket connection for real-time communication
 * with the backend. It handles connection state, reconnection logic, and
 * message handling.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SocketState } from './socket.state';
import type { WebSocketMessage } from '@/types/chat';

/**
 * Socket store hook.
 *
 * Usage:
 * ```tsx
 * const { socket, status, connect, disconnect, send } = useSocketStore();
 *
 * // Connect to a session
 * await connect(sessionId);
 *
 * // Send a message
 * send({ type: 'chat', text: 'Hello' });
 *
 * // Register a message handler
 * onMessage((message) => {
 *   console.log('Received:', message);
 * });
 *
 * // Disconnect
 * disconnect();
 * ```
 */
export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => {
      let messageHandler: ((message: WebSocketMessage) => void) | null = null;
      let reconnectTimeout: NodeJS.Timeout | null = null;

      return {
        socket: null,
        status: 'idle',
        error: null,

        connect: async (sessionId: string) => {
          // Don't connect if already connected or connecting
          const currentSocket = get().socket;
          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
          }

          set({ status: 'connecting', error: null });

          try {
            // Get the access token from Supabase
            const { supabase } = await import('@/lib/supabase');
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
              throw new Error('Authentication required');
            }

            // Build WebSocket URL
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const wsUrl = apiUrl.replace(/^http/, 'ws');
            const url = `${wsUrl}/realtime-session/${sessionId}?token=${encodeURIComponent(
              session.access_token
            )}`;

            const ws = new WebSocket(url);

            ws.onopen = () => {
              console.log('WebSocket connected');
              set({ socket: ws, status: 'connected', error: null });

              // Clear any pending reconnect
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            };

            ws.onerror = (event) => {
              console.error('WebSocket error:', event);
              set({ status: 'error', error: 'WebSocket connection error' });
            };

            ws.onclose = () => {
              console.log('WebSocket closed');
              set({ socket: null, status: 'idle' });

              // Attempt to reconnect after 3 seconds
              reconnectTimeout = setTimeout(() => {
                console.log('Attempting to reconnect...');
                get().connect(sessionId);
              }, 3000);
            };

            ws.onmessage = (event) => {
              console.log('WebSocket message received:', event.data);

              try {
                const message: WebSocketMessage = JSON.parse(event.data);

                // Call registered message handler if available
                if (messageHandler) {
                  messageHandler(message);
                }
              } catch (err) {
                console.error('Error parsing WebSocket message:', err);
              }
            };

            set({ socket: ws });
          } catch (err) {
            console.error('Error creating WebSocket:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
            set({ status: 'error', error: errorMessage });
          }
        },

        disconnect: () => {
          const { socket } = get();

          // Clear reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          if (socket) {
            socket.close();
          }

          set({ socket: null, status: 'idle', error: null });
        },

        send: (data: any) => {
          const { socket, status } = get();

          if (!socket || status !== 'connected') {
            console.error('Cannot send message: WebSocket not connected');
            set({ error: 'Not connected' });
            return;
          }

          try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            socket.send(message);
          } catch (err) {
            console.error('Error sending message:', err);
            set({ error: 'Failed to send message' });
          }
        },

        onMessage: (handler: (message: WebSocketMessage) => void) => {
          messageHandler = handler;
        },

        removeMessageHandler: () => {
          messageHandler = null;
        },
      };
    },
    { name: 'SocketStore' }
  )
);
