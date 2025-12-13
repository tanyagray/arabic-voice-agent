# Chat Data Module

This module provides a complete chat interface for interacting with the Arabic Voice Agent backend.

## Architecture

The chat module follows a hybrid architecture pattern:

- **Services Layer** (`src/services/`) - Technical infrastructure (HTTP client configuration)
- **Data Layer** (`src/data/chat/`) - Business logic for chat feature

### Files

- `types.ts` - TypeScript type definitions matching the backend API
- `api.ts` - API functions for chat endpoints
- `store.ts` - Zustand store for client-side chat state
- `useChat.ts` - Main React hook combining React Query + Zustand

## Usage

### Basic Example

```tsx
import { useChat } from '@/data/chat/useChat';

function ChatComponent() {
  const {
    messages,
    sessionId,
    sendMessage,
    createNewSession,
    isLoading,
    error,
  } = useChat();

  const handleCreateSession = () => {
    createNewSession();
  };

  const handleSendMessage = (text: string) => {
    if (!sessionId) {
      alert('Create a session first!');
      return;
    }
    sendMessage(text);
  };

  return (
    <div>
      {!sessionId && (
        <button onClick={handleCreateSession}>Start New Chat</button>
      )}

      {sessionId && (
        <>
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role}>
                <strong>{msg.role}:</strong> {msg.text}
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
          {error && <p>Error: {error.message}</p>}
        </>
      )}
    </div>
  );
}
```

### Direct Store Access

You can also access the store directly in any component:

```tsx
import { useChatStore } from '@/data/chat/store';

function MessageCount() {
  const messages = useChatStore((state) => state.messages);
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

### `useChat()` Hook

Returns an object with the following properties:

#### State

- `sessionId: string | null` - Current session ID
- `messages: ChatMessage[]` - Array of chat messages
- `currentInput: string` - Current input text (for controlled inputs)

#### Actions

- `createNewSession: () => void` - Create a new chat session
- `sendMessage: (message: string) => void` - Send a message to the agent
- `setCurrentInput: (input: string) => void` - Update current input
- `reset: () => void` - Reset the entire chat state

#### Loading/Error States

- `isCreatingSession: boolean` - True while creating a session
- `isSendingMessage: boolean` - True while sending a message
- `isLoading: boolean` - True if any operation is in progress
- `createSessionError: Error | null` - Error from session creation
- `sendMessageError: Error | null` - Error from sending message
- `error: Error | null` - Combined error state

### Types

```typescript
interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}
```

## Backend Endpoints

This module interacts with the following backend endpoints:

- `POST /session` - Create a new session
- `POST /session/{session_id}/chat` - Send a chat message

See `web-api/routes/session.py` for backend implementation.

## Environment Variables

Make sure you have set up your environment variables:

```env
VITE_API_URL=http://localhost:8000
```

## Advanced Usage

### Optimistic Updates

The `sendMessage` function automatically adds your message to the UI before receiving a response (optimistic update). If the request fails, you can handle it via the error state.

### Multiple Sessions

To support multiple chat sessions, you can reset the store and create a new session:

```tsx
const { reset, createNewSession } = useChat();

const startNewConversation = () => {
  reset();
  createNewSession();
};
```

### Persistent State

If you want to persist chat messages across page refreshes, you can use Zustand's persist middleware. Update `store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useChatStore = create<ChatState>()(
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
