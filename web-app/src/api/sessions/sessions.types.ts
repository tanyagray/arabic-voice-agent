/**
 * Type definitions for the chat feature.
 *
 * These types match the backend API models defined in web-api/routes/session.py
 */

/**
 * Represents a single chat message in the conversation.
 */
export interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

/**
 * Request payload for creating a new session.
 */
export interface CreateSessionResponse {
  session_id: string;
}

/**
 * Request payload for sending a chat message.
 * Matches TextRequest from the backend.
 */
export interface SendMessageRequest {
  message: string;
}

/**
 * Response from sending a chat message.
 * Matches TextResponse from the backend.
 */
export interface SendMessageResponse {
  text: string;
}

/**
 * Represents a session with metadata.
 */
export interface Session {
  session_id: string;
  created_at: string;
}

/**
 * Response from fetching all sessions.
 */
export interface GetSessionsResponse {
  sessions: Session[];
}
