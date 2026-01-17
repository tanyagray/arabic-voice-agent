/**
 * Socket store slice.
 *
 * This slice manages the WebSocket connection for real-time communication
 * with the backend. It handles connection state, reconnection logic, and
 * message handling.
 */

import { type StateCreator } from 'zustand';
import type { SocketState } from './socket.state';
import type { WebSocketMessage } from '@/types/chat';
import { useStore } from '../index';

// Module-level variable to maintain reconnect timeout across slice instances
let reconnectTimeout: NodeJS.Timeout | null = null;

/**
 * Namespaced socket slice state.
 */
export interface SocketSlice {
  socket: SocketState;
}

/**
 * Creates the socket slice.
 *
 * This is a slice factory that can be composed into a larger store.
 * The slice is namespaced under the 'socket' key.
 */
export const createSocketSlice: StateCreator<SocketSlice> = (set, get) => ({
  socket: {
    socket: null,
    status: 'idle',
    error: null,

    connect: async (sessionId: string) => {

      // Close existing socket if any
      const activeSocket = get().socket.socket;    
      if (activeSocket) {
        await get().socket.disconnect();
      }

      // Update state to connecting
      set((state) => ({
        socket: {
          ...state.socket,
          status: 'connecting',
          error: null,
        },
      }));

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
          set((state) => ({
            socket: {
              ...state.socket,
              socket: ws,
              status: 'connected',
              error: null,
            },
          }));

          // Clear any pending reconnect
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          set((state) => ({
            socket: {
              ...state.socket,
              status: 'error',
              error: 'WebSocket connection error',
            },
          }));
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          set((state) => ({
            socket: {
              ...state.socket,
              socket: null,
              status: 'idle',
            },
          }));

          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            get().socket.connect(sessionId);
          }, 3000);
        };

        ws.onmessage = (event) => {
          console.log('WebSocket message received:', event.data);

          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            switch (message.kind) {
              case 'transcript':
                useStore.getState().session.onWebSocketTranscript(message);
                break;
            }
            
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        set((state) => ({
          socket: {
            ...state.socket,
            socket: ws,
          },
        }));
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
        set((state) => ({
          socket: {
            ...state.socket,
            status: 'error',
            error: errorMessage,
          },
        }));
      }
    },

    disconnect: () => {
      const { socket: socketState } = get();

      // Clear reconnect timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      if (socketState.socket) {
        socketState.socket.close();
      }

      set((state) => ({
        socket: {
          ...state.socket,
          socket: null,
          status: 'idle',
          error: null,
        },
      }));
    },

    send: (data: any) => {
      const { socket: socketState } = get();

      if (!socketState.socket || socketState.status !== 'connected') {
        console.error('Cannot send message: WebSocket not connected');
        set((state) => ({
          socket: {
            ...state.socket,
            error: 'Not connected',
          },
        }));
        return;
      }

      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        socketState.socket.send(message);
      } catch (err) {
        console.error('Error sending message:', err);
        set((state) => ({
          socket: {
            ...state.socket,
            error: 'Failed to send message',
          },
        }));
      }
    },
  },
});
