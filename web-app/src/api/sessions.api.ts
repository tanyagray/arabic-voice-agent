/**
 * Chat API service functions.
 *
 * These functions interact with the backend session and chat endpoints.
 * Backend routes defined in: web-api/routes/session.py
 */

import { apiClient } from '@/api/api-client';
import type {
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './sessions.types';

/**
 * Create a new chat session.
 *
 * @returns Promise resolving to the session ID
 * @throws Error if the request fails
 *
 * Backend endpoint: POST /session
 */
export async function createSession(): Promise<string> {
  const response = await apiClient.post<CreateSessionResponse>('/session');
  return response.data.session_id;
}

/**
 * Send a message to the chat agent for a specific session.
 *
 * @param sessionId - The session ID to send the message to
 * @param message - The text message to send
 * @returns Promise resolving to the agent's response text
 * @throws Error if the request fails or session not found (404)
 *
 * Backend endpoint: POST /session/{session_id}/chat
 */
export async function sendMessage(
  sessionId: string,
  message: string
): Promise<string> {
  const payload: SendMessageRequest = { message };

  const response = await apiClient.post<SendMessageResponse>(
    `/session/${sessionId}/chat`,
    payload
  );

  return response.data.text;
}
