/**
 * Type definitions for the chat feature.
 *
 * These types match the backend API models defined in web-api/routes/session.py
 */

/**
 * Represents a single transcript message.
 * Matches the transcript_messages table schema in the database.
 */
export interface TranscriptMessage {
  message_id: string;
  session_id: string;
  user_id: string;
  message_source: 'user' | 'tutor' | 'system';
  message_kind: string;
  message_content: string;
  created_at: string;
  updated_at: string;
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

/**
 * Request payload for updating session context.
 */
export interface PatchSessionContextRequest {
  audio_enabled?: boolean;
  language?: string;
  active_tool?: string | null;
}

/**
 * Response from fetching or updating session context.
 */
export interface SessionContextResponse {
  session_id: string;
  audio_enabled: boolean;
  language: string;
  active_tool: string | null;
}
