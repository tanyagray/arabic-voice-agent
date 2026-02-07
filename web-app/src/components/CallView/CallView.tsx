import { useEffect } from 'react';
import { motion } from 'motion/react';
import { usePipecatClientMicControl } from '@pipecat-ai/client-react';
import { Box, Flex, Text, Spinner, IconButton } from '@chakra-ui/react';
import { BsMic, BsMicMute, BsTelephoneX } from 'react-icons/bs';

const MotionBox = motion.create(Box);
const MotionIconButton = motion.create(IconButton);

interface CallViewProps {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  onEndCall: () => void;
}

export function CallView({
  isConnecting,
  isConnected,
  error,
  onEndCall,
}: CallViewProps) {
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();

  // Auto-enable mic when call connects
  useEffect(() => {
    if (isConnected) {
      enableMic(true);
    }
  }, [isConnected, enableMic]);

  const handleToggleMic = () => {
    enableMic(!isMicEnabled);
  };

  return (
    <Flex
      direction="column"
      flex={1}
      align="center"
      justify="center"
      gap={8}
      minH={0}
    >
      {/* Connecting state */}
      {isConnecting && (
        <MotionBox
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={4}
        >
          <Spinner size="xl" color="white" />
          <Text color="white" fontSize="lg" fontWeight="medium">
            Connecting...
          </Text>
        </MotionBox>
      )}

      {/* Error state */}
      {error && (
        <MotionBox
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          bg="red.500/20"
          borderColor="red.500/50"
          borderWidth="1px"
          color="white"
          px={6}
          py={3}
          rounded="lg"
          fontSize="md"
          textAlign="center"
        >
          {error}
        </MotionBox>
      )}

      {/* Connected state - call controls */}
      {isConnected && (
        <MotionBox
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={6}
        >
          {/* Visual indicator for active call */}
          <MotionBox
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            w="120px"
            h="120px"
            rounded="full"
            bg={isMicEnabled ? 'green.500/30' : 'gray.500/30'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderWidth="2px"
            borderColor={isMicEnabled ? 'green.500/50' : 'gray.500/50'}
          >
            {isMicEnabled ? (
              <BsMic size={48} color="white" />
            ) : (
              <BsMicMute size={48} color="white" />
            )}
          </MotionBox>

          <Text color="white/70" fontSize="sm">
            {isMicEnabled ? 'Listening...' : 'Muted'}
          </Text>
        </MotionBox>
      )}

      {/* Call controls - always show when not in connecting state */}
      {!isConnecting && (
        <Flex gap={4} align="center">
          {/* Mute toggle */}
          <MotionIconButton
            type="button"
            onClick={handleToggleMic}
            aria-label={isMicEnabled ? 'Mute' : 'Unmute'}
            rounded="full"
            size="lg"
            shadow="lg"
            color="white"
            bg={isMicEnabled ? 'green.500' : 'gray.500'}
            _hover={{ bg: isMicEnabled ? 'green.600' : 'gray.600' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isMicEnabled ? <BsMic /> : <BsMicMute />}
          </MotionIconButton>

          {/* End Call button */}
          <MotionIconButton
            type="button"
            onClick={onEndCall}
            aria-label="End call"
            bg="red.500"
            color="white"
            _hover={{ bg: 'red.600' }}
            rounded="full"
            size="lg"
            shadow="lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BsTelephoneX />
          </MotionIconButton>
        </Flex>
      )}
    </Flex>
  );
}
