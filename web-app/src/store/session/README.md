# Chat Data Module

This module provides a complete chat interface for interacting with the Arabic Voice Agent backend.

## Architecture

The chat module uses Zustand for state management with integrated API calls:

- **Services Layer** (`src/services/`) - Technical infrastructure (HTTP client configuration)
- **Store Layer** (`src/store/session/`) - Business logic for session/chat feature with API integration

### Files

- `session.store.ts` - Zustand store with client-side state and API actions
- `session.state.ts` - TypeScript interfaces for the store

## Usage

### Basic Example

```tsx
import { useSessionStore } from '@/store/session/session.store';
import { useState } from 'react';

function ChatComponent() {
  const { messages, activeSessionId, sendMessage, createNewSession } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await createNewSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeSessionId) {
      alert('Create a session first!');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await sendMessage(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {!activeSessionId && (
        <button onClick={handleCreateSession} disabled={isLoading}>
          Start New Chat
        </button>
      )}

      {activeSessionId && (
        <>
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.message_id} className={msg.message_source}>
                <strong>{msg.message_source}:</strong> {msg.message_content}
              </div>
            ))}
          </div>

          <input
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleSendMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            placeholder="Type a message..."
            disabled={isLoading}
          />

          {isLoading && <p>Sending...</p>}
          {error && <p>Error: {error}</p>}
        </>
      )}
    </div>
  );
}
```

### Selective Store Access

For better performance, you can select only the state you need:

```tsx
import { useSessionStore } from '@/store/session/session.store';

function MessageCount() {
  const messages = useSessionStore((state) => state.messages);
  return <div>Messages: {messages.length}</div>;
}
```

### API Functions

You can also use the API functions directly outside of React components:

```tsx
import { createSession, sendMessage } from '@/api/sessions.api';

// Create a session
const sessionId = await createSession();

// Send a message
const response = await sendMessage(sessionId, 'Hello!');
console.log(response);
```

## API Reference

### `useSessionStore()` Hook

Returns an object with the following properties:

#### State

- `activeSessionId: string | null` - ID of the current active session
- `sessions: Session[]` - Array of all sessions
- `messages: TranscriptMessage[]` - Array of chat messages

#### Actions

- `setActiveSessionId: (sessionId: string | null) => void` - Set the active session ID
- `loadSessions: () => Promise<void>` - Load all sessions from the API
- `addMessage: (message: TranscriptMessage) => void` - Add a message to the store
- `setMessages: (messages: TranscriptMessage[]) => void` - Replace all messages
- `clearMessages: () => void` - Clear all messages
- `reset: () => void` - Reset the entire chat state
- `createNewSession: () => Promise<void>` - Create a new chat session (API call)
- `sendMessage: (message: string) => Promise<void>` - Send a message to the agent (API call)

> **Note:** Loading and error states are managed locally in components. The async actions return promises that can be caught for error handling.

### Types

```typescript
// Matches the transcript_messages table in Supabase
interface TranscriptMessage {
  message_id: string;
  session_id: string;
  user_id: string;
  message_source: 'user' | 'tutor' | 'system';
  message_kind: string;
  message_content: string;
  created_at: string;
  updated_at: string;
}
```

## Backend Endpoints

This module interacts with the following backend endpoints:

- `POST /sessions` - Create a new session
- `POST /sessions/{session_id}/chat` - Send a chat message

See `web-api/routes/session.py` for backend implementation.

## Environment Variables

Make sure you have set up your environment variables:

```env
VITE_API_URL=http://localhost:8000
```

## Advanced Usage

### Optimistic Updates

The `sendMessage` function automatically adds your message to the UI before receiving a response (optimistic update). If the request fails, catch the promise rejection in your component:

```tsx
try {
  await sendMessage(text);
} catch (err) {
  // Handle error in your component
  console.error('Failed to send message:', err);
}
```

### Multiple Sessions

To support multiple chat sessions, you can reset the store and create a new session:

```tsx
const { reset, createNewSession } = useSessionStore();

const startNewConversation = async () => {
  reset();
  await createNewSession();
};
```

### Persistent State

If you want to persist chat messages across page refreshes, you can use Zustand's persist middleware. Update `session.store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      // ... your store implementation
    }),
    {
      name: 'chat-storage',
    }
  )
);
```
