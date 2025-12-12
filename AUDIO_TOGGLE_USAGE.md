# Audio Toggle Usage Guide

This guide shows you how to enable/disable audio responses in the UI.

## Implementation Complete ✅

The audio toggle functionality has been fully implemented with:

1. **Backend API endpoints** for updating session context
2. **Frontend hook** (`useSession`) with audio state management
3. **SessionContext** exposing audio controls throughout the app
4. **Ready-to-use `AudioToggle` component**

---

## Quick Start: Add Audio Toggle to Your UI

### Option 1: Use the AudioToggle Component (Recommended)

Simply import and add the `<AudioToggle />` component anywhere in your UI:

```tsx
import { AudioToggle } from '../components/AudioToggle';

function MyComponent() {
  return (
    <div>
      <AudioToggle />
      {/* Your other UI elements */}
    </div>
  );
}
```

### Option 2: Add to LiveSession

To add the audio toggle to the existing LiveSession, modify:

**File:** `web-app/src/components/LiveSession/LiveSession.tsx`

```tsx
import { AudioToggle } from '../AudioToggle';

function RoomUI() {
  const [inputMode, setInputMode] = useState<InputMode>('text');

  return (
    <div className="flex flex-col flex-1 gap-6 min-h-0">
      {/* Transcript - fills available space */}
      <Transcript className="flex-1 min-h-0" />

      {/* Audio Toggle */}
      <div className="flex justify-center">
        <AudioToggle />
      </div>

      {/* Control buttons */}
      <div className="flex justify-center gap-4 items-center flex-shrink-0">
        <TextInput
          isActive={inputMode === 'text'}
          onActivate={() => setInputMode('text')}
        />
        <AudioInput
          isActive={inputMode === 'audio'}
          onActivate={() => setInputMode('audio')}
        />
      </div>
    </div>
  );
}
```

### Option 3: Create a Custom Toggle

Use the SessionContext directly to create your own custom UI:

```tsx
import { useSessionContext } from '../../contexts/SessionContext';

function CustomAudioToggle() {
  const { audioEnabled, toggleAudioEnabled, isUpdatingContext } = useSessionContext();

  return (
    <button
      onClick={toggleAudioEnabled}
      disabled={isUpdatingContext}
      className={audioEnabled ? 'audio-on' : 'audio-off'}
    >
      {audioEnabled ? '🔊 Audio Enabled' : '🔇 Audio Disabled'}
    </button>
  );
}
```

---

## How It Works

1. **User clicks the toggle button**
2. **Frontend** sends PATCH request to `/session/{session_id}/context` with `{ audio_enabled: true }`
3. **Backend** updates the `AppContext.agent.audio_enabled` property
4. **Backend** starts generating audio for all future agent responses (if enabled)
5. **Frontend** receives audio messages via WebSocket and auto-plays them

---

## API Reference

### Session Context

The `useSessionContext()` hook provides:

```typescript
interface SessionContextValue {
  // Audio controls
  audioEnabled: boolean;              // Current audio state
  isUpdatingContext: boolean;         // Loading state for updates
  toggleAudioEnabled: () => Promise<void>;     // Toggle on/off
  setAudioEnabled: (enabled: boolean) => Promise<void>;  // Set directly

  // Other session properties...
  sessionId: string | null;
  messages: Message[];
  sendMessage: (text: string) => void;
  // ...
}
```

### Backend Endpoints

**GET `/session/{session_id}/context`**
- Returns current session context including `audio_enabled`

**PATCH `/session/{session_id}/context`**
- Update session settings
- Body: `{ audio_enabled?: boolean, language?: string }`
- Returns updated context

---

## Example: Programmatic Control

You can also control audio programmatically:

```tsx
function MyComponent() {
  const { setAudioEnabled } = useSessionContext();

  const enableAudio = () => setAudioEnabled(true);
  const disableAudio = () => setAudioEnabled(false);

  return (
    <div>
      <button onClick={enableAudio}>Turn Audio On</button>
      <button onClick={disableAudio}>Turn Audio Off</button>
    </div>
  );
}
```

---

## Customizing the AudioToggle Component

The component uses standard CSS. Customize by editing:
- `web-app/src/components/AudioToggle/AudioToggle.css`

Or create your own styles:

```tsx
import { useSessionContext } from '../../contexts/SessionContext';

export function StyledAudioToggle() {
  const { audioEnabled, toggleAudioEnabled } = useSessionContext();

  return (
    <div className="my-custom-class">
      <button
        onClick={toggleAudioEnabled}
        style={{
          backgroundColor: audioEnabled ? 'green' : 'gray',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
        }}
      >
        {audioEnabled ? 'Audio On' : 'Audio Off'}
      </button>
    </div>
  );
}
```

---

## Testing

1. Start your backend: `cd web-api && uv run dev`
2. Start your frontend: `cd web-app && npm run dev`
3. Add `<AudioToggle />` to your UI
4. Click the toggle button
5. Send a message - you should hear audio when enabled

**Note:** Make sure `ELEVEN_API_KEY` is set in your `.env` file!

---

## Files Created/Modified

### New Files:
- `web-api/services/tts_service.py` - ElevenLabs TTS integration
- `web-app/src/components/AudioToggle/AudioToggle.tsx` - Toggle component
- `web-app/src/components/AudioToggle/AudioToggle.css` - Toggle styles
- `web-app/src/components/AudioToggle/index.ts` - Barrel export

### Modified Files:
- `web-api/services/context_service.py` - Added `audio_enabled` field
- `web-api/services/agent_service.py` - Added conditional audio generation
- `web-api/services/websocket_service.py` - Added audio message support
- `web-api/routes/session.py` - Added context endpoints
- `web-app/src/hooks/useSession.ts` - Added audio controls
- `web-app/src/hooks/useChat.ts` - Added audio playback
- `web-app/src/contexts/SessionContext.tsx` - Exposed audio state
- `web-app/src/types/chat.ts` - Added audio message types
