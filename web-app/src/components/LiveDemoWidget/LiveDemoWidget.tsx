import { motion } from 'framer-motion';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useState } from 'react';
import { useLiveKitConnection } from '../../hooks/useLiveKitConnection';
import { useLiveKitRoom } from '../../hooks/useLiveKitRoom';
import { Transcript } from '../Transcript/Transcript';
import { TextInput } from '../TextInput/TextInput';
import { AudioInput } from '../AudioInput/AudioInput';
import { BsArrowRepeat } from 'react-icons/bs';

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
              <BsArrowRepeat className="animate-spin h-8 w-8" />
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
