import { motion } from 'motion/react';
import { useState } from 'react';
import { SessionProvider, useSessionContext } from '../../context/SessionContext';
import { useStore } from '../../store';
import { Transcript } from '../Transcript/Transcript';
import { TextInput } from '../TextInput/TextInput';
import { AudioInput } from '../AudioInput/AudioInput';
import { AudioToggle } from '../AudioToggle/AudioToggle';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';

export function ActiveSession() {
  return (
    <SessionProvider>
      <ActiveSessionContent />
    </SessionProvider>
  );
}

const MotionBox = motion.create(Box);

function ActiveSessionContent() {
  const { isCreating, sessionError } = useSessionContext();
  const socketStatus = useStore((state) => state.socket.status);
  const socketError = useStore((state) => state.socket.error);
  const error = sessionError || socketError;
  const isLoading = isCreating || socketStatus === 'connecting';

  return (
    <MotionBox
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      display="flex"
      flexDirection="column"
      w="full"
      h="full"
    >
      {socketStatus === 'idle' || socketStatus === 'error' || socketStatus === 'connecting' ? (
        <>
          {isLoading && <LoadingState />}
          {error && <ErrorState error={error} />}
        </>
      ) : (
        <RoomUI />
      )}
    </MotionBox>
  );
}

export type InputMode = 'audio' | 'text';

function LoadingState() {
  return (
    <Flex direction="column" align="center" justify="center" gap={4}>
      <Flex align="center" gap={2} color="white">
        <Spinner size="lg" />
        <Text fontSize="lg">Connecting...</Text>
      </Flex>
    </Flex>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <Flex direction="column" align="center" justify="center" gap={4}>
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
      >
        {error}
      </MotionBox>
    </Flex>
  );
}

function RoomUI() {
  const [inputMode, setInputMode] = useState<InputMode>('text');

  return (
    <Flex direction="column" flex={1} gap={6} minH={0}>
      {/* Transcript - fills available space */}
      <Box flex={1} minH={0} position="relative" w="full">
        <Transcript style={{ position: 'absolute', inset: 0 }} />
      </Box>

      {/* Control buttons */}
      <Flex justify="center" gap={4} align="center" flexShrink={0}>
        <AudioToggle />
        <TextInput
          isActive={inputMode === 'text'}
          onActivate={() => setInputMode('text')}
        />
        <AudioInput
          isActive={inputMode === 'audio'}
          onActivate={() => setInputMode('audio')}
          state="idle"
        />
      </Flex>
    </Flex>
  );
}
