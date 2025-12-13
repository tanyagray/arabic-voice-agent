/**
 * Main chat hook combining React Query and Zustand.
 *
 * This hook provides a simple interface for components to interact
 * with the chat feature, handling both API calls and state management.
 */

import { useMutation } from '@tanstack/react-query';
import { useChatStore } from './session.store';
import { createSession, sendMessage } from '@/api/sessions/sessions.api';
import type { ChatMessage } from '@/api/sessions/sessions.types';

/**
 * Custom hook for chat functionality.
 *
 * Provides methods to create sessions, send messages, and access chat state.
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     messages,
 *     sessionId,
 *     sendMessage,
 *     createNewSession,
 *     isLoading,
 *     error
 *   } = useChat();
 *
 *   const handleSend = (text: string) => {
 *     sendMessage(text);
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
 *       {isLoading && <div>Sending...</div>}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat() {
  const {
    sessionId,
    messages,
    currentInput,
    setSessionId,
    addMessage,
    setCurrentInput,
    reset,
  } = useChatStore();

  // Mutation for creating a new session
  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (newSessionId) => {
      setSessionId(newSessionId);
    },
  });

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!sessionId) {
        throw new Error('No active session. Create a session first.');
      }
      return sendMessage(sessionId, message);
    },
    onMutate: (message) => {
      // Optimistically add user message to the store
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        text: message,
        role: 'user',
        timestamp: new Date(),
      };
      addMessage(userMessage);
    },
    onSuccess: (responseText) => {
      // Add assistant response to the store
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        text: responseText,
        role: 'assistant',
        timestamp: new Date(),
      };
      addMessage(assistantMessage);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      // Optionally: Remove the optimistically added message or add an error message
    },
  });

  return {
    // State
    sessionId,
    messages,
    currentInput,

    // Actions
    createNewSession: () => createSessionMutation.mutate(),
    sendMessage: (message: string) => sendMessageMutation.mutate(message),
    setCurrentInput,
    reset,

    // Loading and error states
    isCreatingSession: createSessionMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isLoading: createSessionMutation.isPending || sendMessageMutation.isPending,
    createSessionError: createSessionMutation.error,
    sendMessageError: sendMessageMutation.error,
    error: createSessionMutation.error || sendMessageMutation.error,
  };
}
