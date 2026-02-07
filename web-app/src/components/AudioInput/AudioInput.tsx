import { motion, AnimatePresence } from 'motion/react';
import { usePipecatClientMicControl } from '@pipecat-ai/client-react';
import { BsMic, BsMicMute, BsTelephone } from 'react-icons/bs';
import { Button } from '@chakra-ui/react';

interface AudioInputProps {
  isActive: boolean;
  onActivate: () => void;
}

const MotionButton = motion.create(Button);

export function AudioInput({ isActive, onActivate }: AudioInputProps) {
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();

  const handleToggleToAudio = () => {
    onActivate();
  };

  const handleToggleMic = () => {
    enableMic(!isMicEnabled);
  };

  const isTextMode = !isActive;

  const getButtonProps = () => {
    if (isTextMode) return { bg: 'white/10', _hover: { bg: 'white/20' }, borderColor: 'transparent' };
    if (isMicEnabled) return { bg: 'green.500/30', _hover: { bg: 'green.500/40' }, borderColor: 'green.500/50' };
    return { bg: 'gray.500', _hover: { bg: 'gray.600' }, borderColor: 'transparent' };
  };

  const buttonProps = getButtonProps();

  return (
    <MotionButton
      type="button"
      onClick={isTextMode ? handleToggleToAudio : handleToggleMic}
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
      py={3}
      px={isTextMode ? 3 : 6}
      minW={isTextMode ? "auto" : "140px"}
      {...buttonProps}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isTextMode ? (
        <BsTelephone className="w-5 h-5" />
      ) : (
        <>
          <AnimatePresence mode="wait">
            {isMicEnabled ? (
              <BsMic key="mic-on" className="w-5 h-5" />
            ) : (
              <BsMicMute key="mic-off" className="w-5 h-5" />
            )}
          </AnimatePresence>
          <span>{isMicEnabled ? 'Mic On' : 'Mic Off'}</span>
        </>
      )}
    </MotionButton>
  );
}
