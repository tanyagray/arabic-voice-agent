import { motion, AnimatePresence } from 'framer-motion';
import { useLiveKitRoom } from '../../hooks/useLiveKitRoom';
import { BsMic, BsVolumeMute, BsArrowRepeat } from 'react-icons/bs';

interface AudioInputProps {
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  state: string;
}

export function AudioInput({ isActive, onActivate, onDeactivate, state }: AudioInputProps) {
  const { isMicMuted, setMicrophoneEnabled } = useLiveKitRoom();

  const handleToggleToAudio = () => {
    onActivate();
    // Explicitly enable microphone when switching to audio mode
    setMicrophoneEnabled(true);
  };

  const handleMuteToggle = () => {
    if (isMicMuted) {
      // Unmuting - enable microphone
      setMicrophoneEnabled(true);
    } else {
      // Muting - disable microphone and switch to text mode
      setMicrophoneEnabled(false);
      onDeactivate();
    }
  };

  const isTextMode = !isActive;

  // Determine button style based on state
  const getButtonStyle = () => {
    if (isTextMode) return 'bg-white/10 hover:bg-white/20';
    if (isMicMuted) return 'bg-gray-500 hover:bg-gray-600';
    if (state === 'listening') return 'bg-green-500/30 hover:bg-green-500/40 border border-green-500/50';
    if (state === 'thinking') return 'bg-blue-500/30 hover:bg-blue-500/40 border border-blue-500/50';
    if (state === 'speaking') return 'bg-purple-500/30 hover:bg-purple-500/40 border border-purple-500/50';
    return 'bg-accent-500 hover:bg-accent-600';
  };

  return (
    <motion.button
      type="button"
      onClick={isTextMode ? handleToggleToAudio : handleMuteToggle}
      className={`${getButtonStyle()} text-white ${isTextMode ? 'p-3' : 'px-6 py-3'} rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isTextMode ? (
        <BsMic className="w-5 h-5" />
      ) : (
        <>
          {isMicMuted ? (
            <BsVolumeMute className="w-5 h-5" />
          ) : (
            <>
              {/* Status indicator */}
              <AnimatePresence mode="wait">
                {state === 'listening' && (
                  <motion.span
                    key="listening-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-3 h-3 bg-green-400 rounded-full animate-pulse"
                  />
                )}
                {state === 'thinking' && (
                  <motion.div
                    key="thinking-spinner"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <BsArrowRepeat className="animate-spin h-5 w-5" />
                  </motion.div>
                )}
                {state === 'speaking' && (
                  <motion.span
                    key="speaking-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"
                  />
                )}
                {!['listening', 'thinking', 'speaking'].includes(state) && (
                  <BsMic className="w-5 h-5" />
                )}
              </AnimatePresence>
            </>
          )}
          {/* Label text */}
          <AnimatePresence mode="wait">
            {isMicMuted ? (
              <span key="unmute">Unmute</span>
            ) : state === 'listening' ? (
              <motion.span
                key="listening"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Listening...
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
              <span key="mute">Mute</span>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.button>
  );
}
