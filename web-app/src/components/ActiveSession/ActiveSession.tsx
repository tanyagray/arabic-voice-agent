import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Transcript } from '../Transcript/Transcript';
import { TextInput } from '../TextInput/TextInput';
import { AudioInput } from '../AudioInput/AudioInput';
import { AudioToggle } from '../AudioToggle/AudioToggle';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import type { WebSocketMessage, TranscriptMessageData } from '../../types/chat';
import type { ChatMessage } from '../../api/sessions/sessions.types';

const MotionBox = motion.create(Box);

export function ActiveSession() {
  const activeSession = useStore((state) => state.session.activeSession);
  const socketStatus = useStore((state) => state.socket.status);
  const socketError = useStore((state) => state.socket.error);
  const socketConnect = useStore((state) => state.socket.connect);
  const socketDisconnect = useStore((state) => state.socket.disconnect);
  const socketOnMessage = useStore((state) => state.socket.onMessage);
  const removeMessageHandler = useStore((state) => state.socket.removeMessageHandler);
  const addMessage = useStore((state) => state.session.addMessage);

  // Handle incoming websocket messages
  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      console.log('Received websocket message:', message);

      // Handle transcript messages
      if (message.kind === 'transcript') {
        const data = message.data as TranscriptMessageData;

        // Convert source to role
        const role = data.source === 'user' ? 'user' : 'assistant';

        // Create ChatMessage from transcript
        const chatMessage: ChatMessage = {
          id: `${data.source}-${Date.now()}`,
          text: data.text,
          role,
          timestamp: new Date(),
        };

        console.log('Adding message to store:', chatMessage);
        addMessage(chatMessage);
      }
    };

    socketOnMessage(handleMessage);

    return () => {
      removeMessageHandler();
    };
  }, [socketOnMessage, removeMessageHandler, addMessage]);

  // Manage socket connection based on active session
  useEffect(() => {
    const sessionId = activeSession?.session_id ?? null;

    // Disconnect any existing socket connection
    socketDisconnect();

    // Connect to new session if session ID exists
    if (sessionId) {
      socketConnect(sessionId);
    }

    // Cleanup: disconnect on unmount or when session changes
    return () => {
      socketDisconnect();
    };
  }, [activeSession?.session_id, socketConnect, socketDisconnect]);

  const error = socketError;
  const isLoading = socketStatus === 'connecting';

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
      <Box flex={1} minH={0} w="full">
        <Transcript />
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
