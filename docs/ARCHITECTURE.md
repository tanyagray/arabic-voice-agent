# Architecture Overview

System architecture for the Arabic Voice Agent application.

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile Apps (Flutter)                   │
│                    iOS & Android Clients                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   Chat   │  │  Voice   │  │ History  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────┬──────────────────────────┬──────────────────────────┘
        │                          │
        │ Google OAuth             │ WebRTC/WebSocket
        │ REST API                 │
        │                          │
┌───────▼──────────────┐    ┌──────▼───────────────┐
│                      │    │                      │
│   Supabase           │    │   LiveKit Cloud      │
│   ┌──────────────┐   │    │   ┌──────────────┐   │
│   │ Auth         │   │    │   │  WebRTC      │   │
│   │ (Google)     │   │    │   │  Rooms       │   │
│   └──────────────┘   │    │   └──────────────┘   │
│   ┌──────────────┐   │    └──────┬───────────────┘
│   │ PostgreSQL   │   │           │
│   │ Database     │   │           │ Agent Connection
│   └──────────────┘   │           │
│                      │    ┌──────▼───────────────┐
└──────┬───────────────┘    │                      │
       │                    │   Python Agent       │
       │ Query/Insert       │   (Render Worker)    │
       │                    │                      │
┌──────▼───────────────┐    │   ┌──────────────┐   │
│                      │    │   │  LiveKit SDK │   │
│  Agent Backend       │◄───┤   └──────────────┘   │
│  (Database Access)   │    │   ┌──────────────┐   │
│                      │    │   │  Deepgram    │   │
│                      │    │   │  STT         │   │
│                      │    │   └──────────────┘   │
└──────────────────────┘    │   ┌──────────────┐   │
                            │   │  OpenAI      │   │
                            │   │  GPT-4o      │   │
                            │   └──────────────┘   │
                            │   ┌──────────────┐   │
                            │   │  ElevenLabs  │   │
                            │   │  TTS         │   │
                            │   └──────────────┘   │
                            │                      │
                            └──────────────────────┘
```

---

## Component Overview

### 1. Mobile Apps (Flutter)

**Technology**: Flutter 3.24+, Dart 3.9+

**Platforms**: iOS, Android

**Features**:
- Google Sign-In authentication
- WhatsApp-like text chat interface
- LiveKit voice call integration
- Conversation history
- Mode switching (text ↔ voice)

**Key Dependencies**:
- `supabase_flutter` - Auth & database client
- `livekit_client` - WebRTC voice calls
- `google_sign_in` - OAuth authentication
- `provider` - State management

**State Management**:
- `AuthProvider` - User authentication state
- `ChatProvider` - Conversation & message state

---

### 2. Supabase (Backend as a Service)

**Services Used**:
- ✅ Authentication (Google OAuth)
- ✅ PostgreSQL Database
- ❌ Edge Functions (Disabled as requested)

**Database Schema**:

```sql
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  language_preference TEXT,
  notification_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  room_id TEXT UNIQUE,
  mode TEXT,  -- 'text' or 'voice'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  message_count INTEGER
)

messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations,
  role TEXT,  -- 'user' or 'assistant'
  content TEXT,
  content_arabic TEXT,
  content_english TEXT,
  audio_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)

user_analytics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  conversation_id UUID,
  event_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

**Security**:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Service role key used by agent for system operations

---

### 3. LiveKit Cloud (Voice Infrastructure)

**Purpose**: Managed WebRTC infrastructure for voice calls

**Architecture**:
- Rooms created per conversation
- Mobile app connects as participant
- Agent joins as second participant
- Audio streams bidirectionally

**Room Lifecycle**:
1. User initiates voice call
2. Mobile app creates room via backend
3. User joins room
4. Agent auto-joins room (via webhook or polling)
5. Conversation happens
6. User leaves → room closed
7. Agent saves transcript to database

**Cost Model**: Pay-per-use based on:
- Number of concurrent participants
- Call duration
- Bandwidth usage

---

### 4. Python Agent (Render Background Worker)

**Technology**: Python 3.11, LiveKit Agents SDK

**Deployment**: Render (Background Worker)

**Architecture**:

```python
Agent Entry Point (main.py)
    │
    ├─► LiveKit Connection (agent.py)
    │     │
    │     ├─► Speech-to-Text (Deepgram)
    │     ├─► LLM Processing (OpenAI)
    │     └─► Text-to-Speech (ElevenLabs)
    │
    ├─► Configuration (config.py)
    │     │
    │     ├─► System Prompts (editable)
    │     ├─► Dialect Settings (MSA/Iraqi/Egyptian/Mixed)
    │     └─► Voice Settings
    │
    ├─► Database (database.py)
    │     └─► Supabase Client (service role)
    │
    └─► Function Calling (functions/)
          └─► User Tools (user_tools.py)
```

**Voice Pipeline**:
1. User speaks → Deepgram transcribes (Arabic/English)
2. Transcript → OpenAI GPT-4o (generates response)
3. Response → ElevenLabs synthesizes (Arabic/English)
4. Audio streams back to user
5. Transcript saved to Supabase

**Dialect Support**:
- Environment variable: `ARABIC_DIALECT`
- Options: `msa`, `iraqi`, `egyptian`, `mixed`
- Configures both system prompt and voice model

**Context Management**:
- Fresh context per session (no history loaded)
- Can be changed in `config.py`

---

### 5. External APIs

#### OpenAI GPT-4o
- **Purpose**: Natural language understanding & generation
- **Model**: `gpt-4o`
- **Features**:
  - Excellent Arabic support
  - Code-switching (Arabic ↔ English)
  - Function calling
- **Cost**: Per token (input + output)

#### ElevenLabs
- **Purpose**: Text-to-speech synthesis
- **Model**: `eleven_multilingual_v2`
- **Features**:
  - Seamless Arabic/English code-switching
  - Natural pronunciation
  - Low latency streaming
- **Cost**: Per character synthesized

#### Deepgram
- **Purpose**: Speech-to-text transcription
- **Model**: `nova-2`
- **Features**:
  - Real-time streaming
  - Arabic language support
  - Punctuation & formatting
- **Cost**: Per minute of audio

---

## Data Flow

### Text Message Flow

```
1. User types message in app
2. Message saved to Supabase (messages table)
3. Backend function calls OpenAI API
4. OpenAI generates response
5. Response saved to Supabase
6. App receives response via real-time subscription
7. Response displayed to user
```

### Voice Call Flow

```
1. User switches to voice mode
2. App creates conversation in Supabase
3. App generates LiveKit room token
4. User joins LiveKit room
5. Agent receives webhook/notification
6. Agent joins same room
7. Voice pipeline starts:
   - User speech → Deepgram → Text
   - Text → OpenAI → Response text
   - Response text → ElevenLabs → Audio
   - Audio → User
8. Conversation transcript saved to Supabase
9. User ends call
10. Agent updates conversation (end time, duration)
```

---

## Security Architecture

### Authentication Flow

```
1. User clicks "Sign in with Google"
2. Google OAuth consent screen
3. User approves
4. Google returns tokens
5. Supabase verifies tokens
6. Supabase creates session
7. App receives user object + session token
8. Session token used for all API calls
```

### API Security

**Mobile → Supabase**:
- Anon key (public)
- RLS policies enforce data access
- Session JWT validates user

**Agent → Supabase**:
- Service role key (secret)
- Bypasses RLS (trusted backend)
- Never exposed to clients

**Mobile → LiveKit**:
- Room token (JWT)
- Generated per session
- Expires after use

### Data Access Control

**RLS Policies**:
```sql
-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see their own messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────┐
│ Local Machine   │
├─────────────────┤
│ Flutter App     │ → Android Emulator / iOS Simulator
│ Python Agent    │ → Local Python env
│ Supabase        │ → Cloud (dev project)
│ LiveKit         │ → Cloud (dev project)
└─────────────────┘
```

### Production Environment

```
┌──────────────┐     ┌──────────────┐
│ App Store    │     │ Google Play  │
│ (iOS)        │     │ (Android)    │
└──────────────┘     └──────────────┘
       │                    │
       └────────┬───────────┘
                │
        ┌───────▼────────┐
        │ Mobile Users   │
        └───────┬────────┘
                │
    ┌───────────┴────────────┐
    │                        │
┌───▼────────┐     ┌─────────▼────┐
│ Supabase   │     │ LiveKit Cloud│
│ (Prod)     │     │ (Prod)       │
└────────────┘     └─────────┬────┘
                             │
                   ┌─────────▼────────┐
                   │ Render           │
                   │ (Background      │
                   │  Worker)         │
                   └──────────────────┘
```

---

## Scalability Considerations

### Database
- **Current**: Supabase Pro (shared compute)
- **Scale**: Dedicated compute, read replicas
- **Optimization**: Indexes on frequently queried columns

### Agent
- **Current**: Single background worker
- **Scale**: Multiple workers (Render auto-scales)
- **Limit**: LiveKit room assignment logic

### LiveKit
- **Current**: Shared infrastructure
- **Scale**: Dedicated deployment, multi-region
- **Optimization**: Codec selection, bandwidth limits

### Mobile App
- **Current**: Client-side rendering
- **Optimization**: Lazy loading, pagination, caching

---

## Monitoring & Observability

### Metrics to Track

**Application**:
- Active users
- Conversations per day
- Average conversation duration
- Mode distribution (text vs voice)

**Performance**:
- API latency
- Voice call quality
- Error rates
- Crash reports

**Cost**:
- OpenAI token usage
- ElevenLabs character usage
- Deepgram minutes used
- LiveKit bandwidth

### Logging

**Agent Logs**:
- Structured logging (JSON)
- Log levels: DEBUG, INFO, WARNING, ERROR
- Streamed to Render dashboard

**Database Logs**:
- Query performance
- Slow queries
- Connection pool stats

---

## Future Enhancements

### Potential Features
1. **Conversation replay**: Listen to past voice calls
2. **Progress tracking**: Grammar scores, fluency metrics
3. **Custom topics**: User-defined conversation themes
4. **Group lessons**: Multi-user voice rooms
5. **Offline mode**: Download lessons for offline practice
6. **Web app**: Browser-based version

### Technical Improvements
1. **Caching**: Redis for frequently accessed data
2. **CDN**: Asset delivery optimization
3. **Analytics**: Dedicated analytics pipeline
4. **A/B testing**: Feature experimentation
5. **Push notifications**: Reminder notifications
6. **Background sync**: Queue-based message processing

---

## Conclusion

The architecture is designed for:
- **Simplicity**: Managed services reduce operational complexity
- **Scalability**: Components can scale independently
- **Cost-effectiveness**: Pay-per-use pricing
- **Security**: Multiple layers of access control
- **Flexibility**: Easy to modify and extend

For more details:
- [SETUP.md](SETUP.md) - Development setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
