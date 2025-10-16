import { motion, AnimatePresence } from 'framer-motion';
import {
  LiveKitRoom,
  BarVisualizer,
  RoomAudioRenderer,
  useChat,
} from '@livekit/components-react';
import { useState, FormEvent, useEffect, useRef } from 'react';
import { useLiveKitConnection } from '../hooks/useLiveKitConnection';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { useTranscriptionsWithParticipants } from '../hooks/useTranscriptionsWithParticipants';

export function LiveDemoWidget() {
  const { token, wsUrl, error, isLoading, connect, disconnect } = useLiveKitConnection();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex flex-col justify-center w-full h-full"
    >
      {!token || !wsUrl ? (
        <ConnectButton
          onConnect={connect}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={disconnect}
        >
          <RoomUI onDisconnect={disconnect} />
        </LiveKitRoom>
      )}
    </motion.div>
  );
}

interface ConnectButtonProps {
  onConnect: () => void;
  isLoading: boolean;
  error: string;
}

function ConnectButton({ onConnect, isLoading, error }: ConnectButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        onClick={onConnect}
        disabled={isLoading}
        className="bg-gradient-to-br from-accent-400 to-accent-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            Talk Now
          </>
        )}
      </motion.button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-red-500/20 border border-red-500/50 text-white px-4 py-2 rounded-lg"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}

interface RoomUIProps {
  onDisconnect: () => void;
}

interface TranscriptBubbleProps {
  text: string;
  isUser: boolean;
  type: 'chat' | 'transcription';
  timestamp: number;
  index: number;
}

function TranscriptBubble({ text, isUser, type, timestamp, index }: TranscriptBubbleProps) {
  return (
    <motion.div
      key={`${timestamp}-${index}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} overflow-hidden`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser ? 'bg-accent-500 text-white rounded-br-sm' : 'bg-white/20 text-white rounded-bl-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium opacity-70">{isUser ? 'You' : 'Agent'}</span>
          {type === 'chat' ? (
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ) : (
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </div>
        <p className="text-lg leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

function StatusIndicator({ state }: { state: string }) {
  return (
    <div className="text-center flex-shrink-0">
      <AnimatePresence mode="wait">
        {state === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 px-6 py-3 rounded-full border border-green-500/30"
          >
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">Listening...</span>
          </motion.div>
        )}
        {state === 'thinking' && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-6 py-3 rounded-full border border-blue-500/30"
          >
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-medium">Thinking...</span>
          </motion.div>
        )}
        {state === 'speaking' && (
          <motion.div
            key="speaking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-6 py-3 rounded-full border border-purple-500/30"
          >
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
            <span className="font-medium">Speaking...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoomUI({ onDisconnect }: RoomUIProps) {
  const { state, audioTrack, isMicMuted, toggleMicrophone } = useLiveKitRoom();
  const transcriptions = useTranscriptionsWithParticipants();
  const { send, isSending } = useChat();
  const [isTextMode, setIsTextMode] = useState(false);
  const [textMessage, setTextMessage] = useState('');

  const handleToggleToText = () => {
    setIsTextMode(true);
    // Mute microphone when switching to text mode
    if (!isMicMuted) {
      toggleMicrophone();
    }
  };

  const handleToggleToVoice = () => {
    setIsTextMode(false);
    // Unmute microphone when switching to voice mode
    if (isMicMuted) {
      toggleMicrophone();
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (textMessage.trim() && !isSending) {
      await send(textMessage);
      setTextMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <RoomAudioRenderer />

      {/* Transcript */}
      {transcriptions && transcriptions.length > 0 && (
        <div
          className="relative flex-1 min-h-0 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          }}
        >
          <div className="bottom-0 left-0 right-0 space-y-3 px-2 pb-2">
            {transcriptions.map((transcription, index) => {
              const isUser = transcription.participantIdentity.startsWith('web-');
              return (
                <TranscriptBubble
                  key={`${transcription.timestamp}-${index}`}
                  text={transcription.text}
                  isUser={isUser}
                  type={transcription.type}
                  timestamp={transcription.timestamp}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      )}

      <StatusIndicator state={state} />

      {/* Control buttons */}
      <div className="flex justify-center gap-4 items-center flex-shrink-0">
        {/* Text input mode - expands when active */}
        <AnimatePresence mode="wait">
          {isTextMode ? (
            <motion.form
              key="text-input"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSendMessage}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isSending}
                className="bg-white/10 text-white placeholder-white/50 px-4 py-3 rounded-full border border-white/20 focus:outline-none focus:border-accent-400 transition-all disabled:opacity-50"
                autoFocus
              />
              <motion.button
                type="submit"
                disabled={!textMessage.trim() || isSending}
                className="bg-accent-500 hover:bg-accent-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </motion.button>
            </motion.form>
          ) : (
            <motion.button
              key="text-icon"
              type="button"
              onClick={handleToggleToText}
              initial={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Microphone button - collapses to icon when text mode is active */}
        <motion.button
          type="button"
          onClick={isTextMode ? handleToggleToVoice : toggleMicrophone}
          disabled={isTextMode && !isMicMuted}
          className={`${
            isTextMode
              ? 'bg-white/10 hover:bg-white/20'
              : isMicMuted
              ? 'bg-gray-500 hover:bg-gray-600'
              : 'bg-accent-500 hover:bg-accent-600'
          } text-white ${isTextMode ? 'p-3' : 'px-6 py-3'} rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isTextMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          ) : (
            <>
              {isMicMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
              {isMicMuted ? 'Unmute' : 'Mute'}
            </>
          )}
        </motion.button>

        {/* End call button */}
        <motion.button
          type="button"
          onClick={onDisconnect}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
          </svg>
          End Call
        </motion.button>
      </div>
    </div>
  );
}
