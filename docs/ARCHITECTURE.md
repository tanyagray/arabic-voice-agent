# Architecture Overview

System architecture for the mishmish.ai application.

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
        │ Google OAuth             │ WebSocket
        │ REST API                 │
        │                          │
┌───────▼──────────────┐    ┌──────▼───────────────┐
│                      │    │                      │
│   Supabase           │    │   Web API            │
│   ┌──────────────┐   │    │   (FastAPI)          │
│   │ Auth         │   │    │                      │
│   │ (Google)     │   │    │   ┌──────────────┐   │
│   └──────────────┘   │    │   │  Soniox      │   │
│   ┌──────────────┐   │    │   │  STT         │   │
│   │ PostgreSQL   │   │    │   └──────────────┘   │
│   │ Database     │   │    │   ┌──────────────┐   │
│   └──────────────┘   │    │   │  OpenAI      │   │
│                      │    │   │  GPT-4o      │   │
└──────────────────────┘    │   └──────────────┘   │
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

---

### 3. Web API (FastAPI Backend)

**Technology**: FastAPI, Python 3.11+

**Features**:
- WebSocket-based voice interactions
- Text chat with LLM
- Audio streaming with Soniox STT
- Text-to-speech with ElevenLabs

**Architecture**:

```python
Web API Entry Point
    │
    ├─► Chat Service (chat_service.py)
    │     └─► OpenAI GPT-4o
    │
    ├─► STT Service (stt_service.py)
    │     └─► Soniox (Arabic/English)
    │
    └─► TTS Service (tts_service.py)
          └─► ElevenLabs
```

**Voice Pipeline**:
1. User speaks → Soniox transcribes (Arabic/English)
2. Transcript → OpenAI GPT-4o (generates response)
3. Response → ElevenLabs synthesizes (Arabic/English)
4. Audio streams back to user
5. Transcript saved to Supabase

**Dialect Support**:
- Supports Modern Standard Arabic (MSA)
- Iraqi Arabic
- Egyptian Arabic
- Mixed English/Arabic

---

### 4. External APIs

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

#### Soniox
- **Purpose**: Speech-to-text transcription
- **Features**:
  - Real-time streaming
  - Arabic language support
  - English language support
  - Automatic language detection
- **Cost**: Per minute of audio

---

## Data Flow

### Text Message Flow

```
1. User types message in app
2. Message sent to Web API
3. Web API calls OpenAI GPT-4o
4. OpenAI generates response
5. Response sent back to app
6. Message and response saved to Supabase
7. Response displayed to user
```

### Voice Call Flow

```
1. User switches to voice mode
2. App creates WebSocket connection to Web API
3. User starts speaking
4. Voice pipeline:
   - User speech → Soniox → Text
   - Text → OpenAI → Response text
   - Response text → ElevenLabs → Audio
   - Audio → User (via WebSocket)
5. Conversation transcript saved to Supabase
6. User ends call
7. Web API updates conversation (end time, duration)
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

**Mobile → Web API**:
- Session JWT validates user
- WebSocket connections authenticated
- CORS configured for allowed origins

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
│ Web API         │ → Local Python env
│ Supabase        │ → Cloud (dev project)
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
│ Supabase   │     │ Web API      │
│ (Prod)     │     │ (Render)     │
└────────────┘     └──────────────┘
```

---

## Scalability Considerations

### Database
- **Current**: Supabase Pro (shared compute)
- **Scale**: Dedicated compute, read replicas
- **Optimization**: Indexes on frequently queried columns

### Web API
- **Current**: Single instance
- **Scale**: Multiple instances with load balancer
- **Optimization**: Connection pooling, caching

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
- Soniox minutes used

### Logging

**Web API Logs**:
- Structured logging (JSON)
- Log levels: DEBUG, INFO, WARNING, ERROR
- Available via hosting platform dashboard

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
