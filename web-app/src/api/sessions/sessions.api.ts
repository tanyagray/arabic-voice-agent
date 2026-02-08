/**
 * Chat API service functions.
 *
 * These functions interact with the backend session and chat endpoints.
 * Backend routes defined in: web-api/routes/session.py
 */

import { apiClient } from '@/api/api-client';
import type {
  CreateSessionResponse,
  GetSessionsResponse,
  PatchSessionContextRequest,
  SendMessageRequest,
  SendMessageResponse,
  Session,
  SessionContextResponse,
} from './sessions.types';

/**
 * Get all chat sessions.
 *
 * @returns Promise resolving to an array of sessions
 * @throws Error if the request fails
 *
 * Backend endpoint: GET /sessions
 */
export async function getSessions(): Promise<Session[]> {
  const response = await apiClient.get<GetSessionsResponse>('/sessions');
  return response.data.sessions;
}

/**
 * Create a new chat session.
 *
 * @returns Promise resolving to the session ID
 * @throws Error if the request fails
 *
 * Backend endpoint: POST /sessions
 */
export async function createSession(): Promise<string> {
  const response = await apiClient.post<CreateSessionResponse>('/sessions');
  return response.data.session_id;
}

/**
 * Send a message to the chat agent for a specific session.
 *
 * @param sessionId - The session ID to send the message to
 * @param message - The text message to send
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to the agent's response text
 * @throws Error if the request fails or session not found (404)
 *
 * Backend endpoint: POST /sessions/{session_id}/chat
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  signal?: AbortSignal
): Promise<string> {
  const payload: SendMessageRequest = { message };

  const response = await apiClient.post<SendMessageResponse>(
    `/sessions/${sessionId}/chat`,
    payload,
    { signal }
  );

  return response.data.text;
}

/**
 * Send a voice message (audio file) to the agent for a specific session.
 *
 * @param sessionId - The session ID to send the audio to
 * @param audioBlob - The audio blob to upload
 * @returns Promise that resolves when the audio is successfully uploaded
 * @throws Error if the request fails or session not found (404)
 *
 * Backend endpoint: POST /sessions/{session_id}/audio
 */
export async function sendVoiceMessage(
  sessionId: string,
  audioBlob: Blob
): Promise<void> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  await apiClient.post(`/sessions/${sessionId}/audio`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Get the context for a specific session.
 *
 * @param sessionId - The session ID to fetch context for
 * @returns Promise resolving to the session context
 * @throws Error if the request fails or session not found (404)
 *
 * Backend endpoint: GET /sessions/{session_id}/context
 */
export async function getSessionContext(
  sessionId: string
): Promise<SessionContextResponse> {
  const response = await apiClient.get<SessionContextResponse>(
    `/sessions/${sessionId}/context`
  );
  return response.data;
}

/**
 * Update the context for a specific session.
 *
 * @param sessionId - The session ID to update context for
 * @param context - The context fields to update
 * @returns Promise resolving to the updated session context
 * @throws Error if the request fails or session not found (404)
 *
 * Backend endpoint: PATCH /sessions/{session_id}/context
 */
export async function patchSessionContext(
  sessionId: string,
  context: PatchSessionContextRequest
): Promise<SessionContextResponse> {
  const response = await apiClient.patch<SessionContextResponse>(
    `/sessions/${sessionId}/context`,
    context
  );
  return response.data;
}
