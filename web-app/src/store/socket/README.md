# Socket Store Module

This module provides WebSocket connection management for real-time communication with the Arabic Voice Agent backend.

## Architecture

The socket store uses Zustand for state management with integrated WebSocket handling:

- **Store Layer** (`src/store/socket/`) - WebSocket connection state and message handling
- **Types Layer** (`src/types/chat.ts`) - Message type definitions

### Files

- `socket.store.ts` - Zustand store with WebSocket connection logic
- `socket.state.ts` - TypeScript interfaces for the store
- `index.ts` - Barrel exports

## Usage

### Basic Example

```tsx
import { useSocketStore } from '@/store/socket';
import { useEffect } from 'react';

function ChatComponent({ sessionId }: { sessionId: string }) {
  const { status, connect, disconnect, send, onMessage } = useSocketStore();

  useEffect(() => {
    // Connect when component mounts
    connect(sessionId);

    // Register message handler
    onMessage((message) => {
      console.log('Received message:', message);

      if (message.kind === 'transcript') {
        // Handle transcript message
        console.log('Transcript:', message.data.text);
      } else if (message.kind === 'audio') {
        // Handle audio message
        console.log('Audio received');
      }
    });

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect, onMessage]);

  const handleSendMessage = () => {
    if (status === 'connected') {
      send({ type: 'chat', text: 'Hello!' });
    }
  };

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={handleSendMessage} disabled={status !== 'connected'}>
        Send Message
      </button>
    </div>
  );
}
```

### Integration with Session Store

```tsx
import { useSessionStore } from '@/store/session';
import { useSocketStore } from '@/store/socket';
import { useEffect } from 'react';

function RealtimeChat() {
  const { activeSessionId, addMessage } = useSessionStore();
  const { status, connect, disconnect, send, onMessage } = useSocketStore();

  useEffect(() => {
    if (!activeSessionId) return;

    // Connect to WebSocket
    connect(activeSessionId);

    // Handle incoming messages
    onMessage((message) => {
      if (message.kind === 'transcript') {
        const { text, source } = message.data;
        addMessage({
          id: `${source}-${Date.now()}`,
          text,
          role: source === 'user' ? 'user' : 'assistant',
          timestamp: new Date(),
        });
      }
    });

    return () => {
      disconnect();
    };
  }, [activeSessionId, connect, disconnect, onMessage, addMessage]);

  const handleSendText = (text: string) => {
    if (status === 'connected') {
      send(text);
    }
  };

  return (
    <div>
      <ConnectionIndicator status={status} />
      <ChatMessages />
      <MessageInput onSend={handleSendText} disabled={status !== 'connected'} />
    </div>
  );
}
```

### Selective Store Access

For better performance, select only the state you need:

```tsx
import { useSocketStore } from '@/store/socket';

function ConnectionStatus() {
  const status = useSocketStore((state) => state.status);
  return <div>Connection: {status}</div>;
}
```

## API Reference

### `useSocketStore()` Hook

Returns an object with the following properties:

#### State

- `socket: WebSocket | null` - The active WebSocket connection
- `status: SocketStatus` - Connection status: `'idle' | 'connecting' | 'connected' | 'error'`
- `error: string | null` - Error message if connection failed

#### Actions

- `connect: (sessionId: string) => Promise<void>` - Connect to a session's WebSocket
- `disconnect: () => void` - Close the WebSocket connection
- `send: (data: any) => void` - Send data through the WebSocket
- `onMessage: (handler: (message: WebSocketMessage) => void) => void` - Register a message handler
- `removeMessageHandler: () => void` - Remove the registered message handler

### WebSocket Message Types

```typescript
interface WebSocketMessage {
  kind: 'transcript' | 'audio' | 'context';
  data: Record<string, any>;
}

interface TranscriptMessageData {
  source: 'user' | 'tutor' | 'system';
  text: string;
}

interface AudioMessageData {
  audio_data: string; // Base64 encoded
  format: 'mp3' | 'wav' | 'webm';
}
```

## Features

### Automatic Reconnection

The socket store automatically attempts to reconnect when the connection is lost:

```tsx
// Reconnection happens automatically after 3 seconds
// No manual intervention needed
```

### Authentication

The store automatically fetches and includes the Supabase JWT token:

```tsx
// Token is automatically retrieved from Supabase session
// and included in the WebSocket connection URL
```

### Error Handling

```tsx
function ChatWithErrorHandling() {
  const { status, error, connect } = useSocketStore();

  useEffect(() => {
    if (error) {
      console.error('WebSocket error:', error);
      // Show error notification to user
    }
  }, [error]);

  // ...
}
```

## Backend Endpoint

This module connects to the following WebSocket endpoint:

- `ws(s)://[API_URL]/realtime-session/{session_id}?token={jwt_token}`

See `web-api/routes/realtime_session.py` for backend implementation.

## Environment Variables

Make sure you have set up your environment variables:

```env
VITE_API_URL=http://localhost:8000
```

The store automatically converts `http` to `ws` and `https` to `wss`.

## Advanced Usage

### Custom Message Handling

```tsx
import { useSocketStore } from '@/store/socket';
import { useEffect, useRef } from 'react';

function AudioPlayer() {
  const { onMessage } = useSocketStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onMessage((message) => {
      if (message.kind === 'audio') {
        const { audio_data, format } = message.data;

        // Decode base64 and play audio
        const binaryString = atob(audio_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: `audio/${format}` });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.play();
        audioRef.current = audio;
      }
    });

    return () => {
      audioRef.current?.pause();
    };
  }, [onMessage]);

  return <div>Audio Player Active</div>;
}
```

### Manual Connection Control

```tsx
function ManualConnectionControl() {
  const { status, connect, disconnect } = useSocketStore();
  const [sessionId] = useState('your-session-id');

  return (
    <div>
      <button onClick={() => connect(sessionId)} disabled={status === 'connected'}>
        Connect
      </button>
      <button onClick={disconnect} disabled={status !== 'connected'}>
        Disconnect
      </button>
      <p>Status: {status}</p>
    </div>
  );
}
```

### Sending Complex Messages

```tsx
function SendComplexMessage() {
  const { send, status } = useSocketStore();

  const sendAudioMetadata = () => {
    send({
      type: 'audio_metadata',
      format: 'webm',
      duration: 5000,
      timestamp: Date.now(),
    });
  };

  return (
    <button onClick={sendAudioMetadata} disabled={status !== 'connected'}>
      Send Audio Metadata
    </button>
  );
}
```

## Migration from useChat Hook

If you're migrating from the `useChat` hook to the socket store:

**Before:**
```tsx
const { messages, connectionState } = useChat(sessionId);
```

**After:**
```tsx
const { status, connect, onMessage } = useSocketStore();
const { messages, addMessage } = useSessionStore();

useEffect(() => {
  connect(sessionId);
  onMessage((msg) => {
    if (msg.kind === 'transcript') {
      addMessage({ ...msg.data, id: Date.now() });
    }
  });
}, [sessionId]);
```

## Troubleshooting

### Connection Not Establishing

1. Check that `VITE_API_URL` is set correctly
2. Verify the session ID is valid
3. Ensure Supabase authentication is working
4. Check browser console for WebSocket errors

### Messages Not Being Received

1. Verify `onMessage` handler is registered
2. Check that the WebSocket status is `'connected'`
3. Look for JSON parsing errors in console
4. Verify backend is sending valid WebSocketMessage format

### Reconnection Loop

If the socket keeps reconnecting:
1. Check backend logs for connection rejections
2. Verify JWT token is valid and not expired
3. Ensure session ID exists in the backend
