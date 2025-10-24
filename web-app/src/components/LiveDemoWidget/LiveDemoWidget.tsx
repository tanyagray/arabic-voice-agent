import { motion } from 'framer-motion';
import { useState } from 'react';
import { SessionProvider, useSessionContext } from '../../contexts/SessionContext';
import { Transcript } from '../Transcript/Transcript';
import { TextInput } from '../TextInput/TextInput';
import { AudioInput } from '../AudioInput/AudioInput';
import { BsArrowRepeat } from 'react-icons/bs';

export function LiveDemoWidget() {
  return (
    <SessionProvider>
      <LiveDemoWidgetContent />
    </SessionProvider>
  );
}

function LiveDemoWidgetContent() {
  const { isCreating, sessionError, connectionState, chatError } = useSessionContext();
  const error = sessionError || chatError;
  const isLoading = isCreating || connectionState === 'connecting';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex flex-col w-full h-full border border-red-500"
    >
      {connectionState === 'disconnected' || connectionState === 'error' ? (
        <>
          {isLoading && <LoadingState />}
          {error && <ErrorState error={error} />}
        </>
      ) : (
        <RoomUI />
      )}
    </motion.div>
  );
}

export type InputMode = 'audio' | 'text';

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-white">
        <BsArrowRepeat className="animate-spin h-8 w-8" />
        <span className="text-lg">Connecting...</span>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/20 border border-red-500/50 text-white px-6 py-3 rounded-lg"
      >
        {error}
      </motion.div>
    </div>
  );
}

function RoomUI() {
  const [inputMode, setInputMode] = useState<InputMode>('text');

  return (
    <div className="flex flex-col flex-1 gap-6 min-h-0">
      {/* Transcript - fills available space */}
      <Transcript className="flex-1 min-h-0" />

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
          state="idle"
        />
      </div>
    </div>
  );
}
