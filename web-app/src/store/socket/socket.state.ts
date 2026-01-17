/**
 * Type definitions for socket state management.
 */

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface SocketState {
  // State
  socket: WebSocket | null;
  status: SocketStatus;
  error: string | null;

  // Actions
  connect: (sessionId: string) => Promise<void>;
  disconnect: () => void;
  send: (data: any) => void;

}
