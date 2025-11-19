import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { useAgentState } from '../../hooks/useAgentState';
import { useSessionContext } from '../../contexts/SessionContext';
import { BsMic, BsArrowRepeat } from 'react-icons/bs';

interface AudioInputProps {
  isActive: boolean;
  onActivate: () => void;
  state: string;
}

export function AudioInput({ isActive, onActivate }: AudioInputProps) {
  const { isRecording, startRecording, stopRecording } = useAudioRecording();
  const { uploadAudio } = useSessionContext();
  const agentState = useAgentState();
  const [isUploading, setIsUploading] = useState(false);

  // Use agent state from hook instead of prop
  const state = agentState;

  // Stop recording and release microphone when switching to text mode
  useEffect(() => {
    if (!isActive && isRecording) {
      stopRecording();
    }
  }, [isActive, isRecording, stopRecording]);

  const handleToggleToAudio = async () => {
    onActivate();
  };

  // Push-to-talk: Hold to record, release to send
  const handleMouseDown = async () => {
    if (isActive && !isRecording && !isUploading) {
      await startRecording();
    }
  };

  const handleMouseUp = async () => {
    if (isActive && isRecording && !isUploading) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        try {
          setIsUploading(true);
          await uploadAudio(audioBlob);
        } catch (error) {
          console.error('Failed to upload audio:', error);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const isTextMode = !isActive;

  // Determine button style based on state
  const getButtonStyle = () => {
    if (isTextMode) return 'bg-white/10 hover:bg-white/20';
    if (isUploading) return 'bg-yellow-500/30 border border-yellow-500/50';
    if (isRecording) return 'bg-red-500/30 hover:bg-red-500/40 border border-red-500/50';
    if (state === 'thinking') return 'bg-blue-500/30 hover:bg-blue-500/40 border border-blue-500/50';
    if (state === 'speaking') return 'bg-purple-500/30 hover:bg-purple-500/40 border border-purple-500/50';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <motion.button
      type="button"
      onClick={isTextMode ? handleToggleToAudio : undefined}
      onMouseDown={isTextMode ? undefined : handleMouseDown}
      onMouseUp={isTextMode ? undefined : handleMouseUp}
      onMouseLeave={isTextMode ? undefined : handleMouseUp}
      onTouchStart={isTextMode ? undefined : handleMouseDown}
      onTouchEnd={isTextMode ? undefined : handleMouseUp}
      className={`${getButtonStyle()} text-white ${isTextMode ? 'p-3' : 'px-6 py-3'} rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 select-none`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isTextMode ? (
        <BsMic className="w-5 h-5" />
      ) : (
        <>
          {/* Status indicator */}
          <AnimatePresence mode="wait">
            {isUploading && (
              <motion.div
                key="uploading-spinner"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BsArrowRepeat className="animate-spin h-5 w-5" />
              </motion.div>
            )}
            {!isUploading && isRecording && (
              <motion.span
                key="recording-dot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-3 h-3 bg-red-400 rounded-full animate-pulse"
              />
            )}
            {!isUploading && !isRecording && state === 'thinking' && (
              <motion.div
                key="thinking-spinner"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BsArrowRepeat className="animate-spin h-5 w-5" />
              </motion.div>
            )}
            {!isUploading && !isRecording && state === 'speaking' && (
              <motion.span
                key="speaking-dot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"
              />
            )}
            {!isUploading && !isRecording && !['thinking', 'speaking'].includes(state) && (
              <BsMic className="w-5 h-5" />
            )}
          </AnimatePresence>
          {/* Label text */}
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.span
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Processing...
              </motion.span>
            ) : isRecording ? (
              <motion.span
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Recording...
              </motion.span>
            ) : state === 'thinking' ? (
              <motion.span
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Thinking...
              </motion.span>
            ) : state === 'speaking' ? (
              <motion.span
                key="speaking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Speaking...
              </motion.span>
            ) : (
              <span key="hold">Hold to Talk</span>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.button>
  );
}
