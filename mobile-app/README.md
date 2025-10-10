# Arabic Voice Agent - Flutter App

Flutter mobile application for iOS and Android supporting text and voice-based Arabic language learning.

## Features

- **Google Sign-In**: Seamless authentication with Supabase
- **Text Chat**: WhatsApp-like interface for text conversations
- **Voice Calls**: Real-time voice conversations via LiveKit
- **Mode Switching**: Toggle between text and voice modes
- **Conversation History**: View past conversations
- **Cross-platform**: Works on both iOS and Android

## Prerequisites

- Flutter 3.24+
- Dart 3.9+
- Xcode (for iOS development)
- Android Studio (for Android development)

## Setup

### 1. Install Dependencies

```bash
cd apps/mobile
flutter pub get
```

### 2. Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials

### 3. Configure Google Sign-In - see main README

## Running

```bash
flutter run
```

## License

MIT
