import { motion, AnimatePresence } from 'framer-motion';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';

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
                  <motion.svg
                    key="thinking-spinner"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
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
                  </motion.svg>
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
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
