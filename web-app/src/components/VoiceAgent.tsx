import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

interface VoiceAgentProps {
  onActiveChange: (active: boolean) => void;
}

export function VoiceAgent({ onActiveChange }: VoiceAgentProps) {
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const generateToken = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: 'arabic-tutor-demo',
          participant_identity: `web-${Date.now()}`,
          participant_name: 'Web User',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      setToken(data.token);
      setWsUrl(data.url);
      onActiveChange(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      console.error('Error generating token:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onActiveChange]);

  const handleDisconnect = useCallback(() => {
    setToken('');
    setWsUrl('');
    onActiveChange(false);
  }, [onActiveChange]);

  if (!token || !wsUrl) {
    return (
      <div className="flex flex-col items-center">
        <motion.button
          onClick={generateToken}
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

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={handleDisconnect}
    >
      <VoiceAgentUI onDisconnect={handleDisconnect} />
    </LiveKitRoom>
  );
}

function VoiceAgentUI({ onDisconnect }: { onDisconnect: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [isMicMuted, setIsMicMuted] = useState(false);

  const toggleMicrophone = useCallback(async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      setIsMicMuted(enabled);
    }
  }, [localParticipant]);

  return (
    <div className="space-y-6">
      <RoomAudioRenderer />

      {/* Status indicator */}
      <div className="text-center">
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

      {/* Audio visualizer */}
      {audioTrack && (
        <div className="h-32 flex items-center justify-center">
          <BarVisualizer
            state={state}
            barCount={30}
            trackRef={audioTrack}
            className="text-accent-400"
          />
        </div>
      )}

      {/* Control buttons */}
      <div className="flex justify-center gap-4">
        <motion.button
          onClick={toggleMicrophone}
          className={`${
            isMicMuted
              ? 'bg-gray-500 hover:bg-gray-600'
              : 'bg-accent-500 hover:bg-accent-600'
          } text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
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
        </motion.button>

        <motion.button
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
