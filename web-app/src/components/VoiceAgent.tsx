import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
} from '@livekit/components-react';

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
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="text-center">
          <motion.div
            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-12 h-12 text-white"
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
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-4">
            Try it Now - Start Speaking Arabic!
          </h2>

          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Click the button below to start a voice conversation with your AI Arabic tutor.
            Practice any dialect or mix English and Arabic naturally.
          </p>

          <motion.button
            onClick={generateToken}
            disabled={isLoading}
            className="bg-gradient-to-r from-accent-500 to-accent-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
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
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Start Conversation
              </span>
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
      className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
    >
      <VoiceAgentUI onDisconnect={handleDisconnect} />
    </LiveKitRoom>
  );
}

function VoiceAgentUI({ onDisconnect }: { onDisconnect: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();

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

      {/* Controls */}
      <div className="flex justify-center">
        <VoiceAssistantControlBar controls={{ leave: false }} />
      </div>

      {/* Disconnect button */}
      <div className="text-center pt-4">
        <button
          onClick={onDisconnect}
          className="text-white/70 hover:text-white underline text-sm transition-colors"
        >
          End Conversation
        </button>
      </div>
    </div>
  );
}
