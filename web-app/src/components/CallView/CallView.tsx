import { useEffect } from 'react';
import { motion } from 'motion/react';
import { usePipecatClientMicControl } from '@pipecat-ai/client-react';
import { Box, Flex, Text, Spinner, IconButton } from '@chakra-ui/react';
import { BsMic, BsMicMute, BsTelephoneX } from 'react-icons/bs';
import { Transcript } from '@/components/Transcript/Transcript';
import { useLiveTranscript } from '@/hooks/useLiveTranscript';

const MotionBox = motion.create(Box);
const MotionIconButton = motion.create(IconButton);

interface CallViewProps {
  sessionId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  onEndCall: () => void;
}

export function CallView({
  sessionId,
  isConnecting,
  isConnected,
  error,
  onEndCall,
}: CallViewProps) {
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();
  const { messages, clearMessages } = useLiveTranscript(sessionId);

  // Auto-enable mic when call connects
  useEffect(() => {
    if (isConnected) {
      enableMic(true);
    }
  }, [isConnected, enableMic]);

  const handleToggleMic = () => {
    enableMic(!isMicEnabled);
  };

  const handleEndCall = () => {
    clearMessages();
    onEndCall();
  };

  return (
    <Flex direction="column" flex={1} minH={0} gap={4}>
      {/* Connecting state */}
      {isConnecting && (
        <Flex flex={1} align="center" justify="center">
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
        </Flex>
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
          mx="auto"
        >
          {error}
        </MotionBox>
      )}

      {/* Connected state - transcript and controls */}
      {isConnected && (
        <>
          {/* Transcript area */}
          <Box flex={1} minH={0} px={4}>
            <Transcript
              messages={messages}
              emptyText="Start speaking..."
            />
          </Box>

          {/* Call status indicator */}
          <Flex justify="center" align="center" gap={2}>
            <MotionBox
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              w={3}
              h={3}
              rounded="full"
              bg={isMicEnabled ? 'green.500' : 'gray.500'}
            />
            <Text color="white/70" fontSize="sm">
              {isMicEnabled ? 'Listening...' : 'Muted'}
            </Text>
          </Flex>
        </>
      )}

      {/* Call controls - always show when not in connecting state */}
      {!isConnecting && (
        <Flex gap={4} align="center" justify="center" py={4}>
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
            onClick={handleEndCall}
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
