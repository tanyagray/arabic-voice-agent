import { motion } from 'framer-motion';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useState } from 'react';
import { useLiveKitConnection } from '../hooks/useLiveKitConnection';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { Transcript } from './Transcript';
import { TextInput } from './TextInput';
import { AudioInput } from './AudioInput';

export function LiveDemoWidget() {
  const { token, wsUrl, error, isLoading, disconnect } = useLiveKitConnection();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex flex-col justify-center w-full h-full"
    >
      {!token || !wsUrl ? (
        <div className="flex flex-col items-center justify-center gap-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-white">
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
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
              <span className="text-lg">Connecting...</span>
            </div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 text-white px-6 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}
        </div>
      ) : (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={false}
          video={false}
          onDisconnected={disconnect}
        >
          <RoomUI />
        </LiveKitRoom>
      )}
    </motion.div>
  );
}

export type InputMode = 'audio' | 'text';

function RoomUI() {
  const { state } = useLiveKitRoom();
  const [inputMode, setInputMode] = useState<InputMode>('text');

  return (
    <div className="flex flex-col h-full gap-6">
      <RoomAudioRenderer />

      {/* Transcript */}
      <Transcript />

      {/* Control buttons */}
      <div className="flex justify-center gap-4 items-center flex-shrink-0">
        <TextInput
          isActive={inputMode === 'text'}
          onActivate={() => setInputMode('text')}
        />
        <AudioInput
          isActive={inputMode === 'audio'}
          onActivate={() => setInputMode('audio')}
          onDeactivate={() => setInputMode('text')}
          state={state}
        />
      </div>
    </div>
  );
}
