import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { useAgentState } from '../../hooks/useAgentState';
import { useSessionContext } from '../../contexts/SessionContext';
import { BsMic, BsArrowRepeat } from 'react-icons/bs';
import { Button, Box } from '@chakra-ui/react';

interface AudioInputProps {
  isActive: boolean;
  onActivate: () => void;
  state: string;
}

const MotionButton = motion.create(Button);
const MotionBox = motion.create(Box);

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
  const getButtonProps = () => {
    if (isTextMode) return { bg: 'white/10', _hover: { bg: 'white/20' }, borderColor: 'transparent' };
    if (isUploading) return { bg: 'yellow.500/30', borderColor: 'yellow.500/50' };
    if (isRecording) return { bg: 'red.500/30', _hover: { bg: 'red.500/40' }, borderColor: 'red.500/50' };
    if (state === 'thinking') return { bg: 'blue.500/30', _hover: { bg: 'blue.500/40' }, borderColor: 'blue.500/50' };
    if (state === 'speaking') return { bg: 'purple.500/30', _hover: { bg: 'purple.500/40' }, borderColor: 'purple.500/50' };
    return { bg: 'gray.500', _hover: { bg: 'gray.600' }, borderColor: 'transparent' };
  };

  const buttonProps = getButtonProps();

  return (
    <MotionButton
      type="button"
      onClick={isTextMode ? handleToggleToAudio : undefined}
      onMouseDown={isTextMode ? undefined : handleMouseDown}
      onMouseUp={isTextMode ? undefined : handleMouseUp}
      onMouseLeave={isTextMode ? undefined : handleMouseUp}
      onTouchStart={isTextMode ? undefined : handleMouseDown}
      onTouchEnd={isTextMode ? undefined : handleMouseUp}

      rounded="full"
      fontWeight="semibold"
      fontSize="sm"
      shadow="lg"
      transitionProperty="all"
      transitionDuration="0.2s"
      display="flex"
      alignItems="center"
      gap={2}
      userSelect="none"
      borderWidth="1px"
      color="white"
      h="auto"
      py={isTextMode ? 3 : 3}
      px={isTextMode ? 3 : 6}
      minW={isTextMode ? "auto" : "140px"}
      {...buttonProps}

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
              <MotionBox
                key="uploading-spinner"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BsArrowRepeat className="animate-spin h-5 w-5" />
              </MotionBox>
            )}
            {!isUploading && isRecording && (
              <MotionBox
                key="recording-dot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                w={3}
                h={3}
                bg="red.400"
                rounded="full"
                animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
              />
            )}
            {!isUploading && !isRecording && state === 'thinking' && (
              <MotionBox
                key="thinking-spinner"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BsArrowRepeat className="animate-spin h-5 w-5" />
              </MotionBox>
            )}
            {!isUploading && !isRecording && state === 'speaking' && (
              <MotionBox
                key="speaking-dot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                w={3}
                h={3}
                bg="purple.400"
                rounded="full"
                animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
              />
            )}
            {!isUploading && !isRecording && !['thinking', 'speaking'].includes(state) && (
              <BsMic className="w-5 h-5" />
            )}
          </AnimatePresence>
          {/* Label text */}
          <AnimatePresence mode="wait">
            {isUploading ? (
              <MotionBox
                key="uploading"
                as="span"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Processing...
              </MotionBox>
            ) : isRecording ? (
              <MotionBox
                key="recording"
                as="span"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Recording...
              </MotionBox>
            ) : state === 'thinking' ? (
              <MotionBox
                key="thinking"
                as="span"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Thinking...
              </MotionBox>
            ) : state === 'speaking' ? (
              <MotionBox
                key="speaking"
                as="span"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Speaking...
              </MotionBox>
            ) : (
              <span key="hold">Hold to Talk</span>
            )}
          </AnimatePresence>
        </>
      )}
    </MotionButton>
  );
}
