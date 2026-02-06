import { motion } from 'motion/react';
import { useState } from 'react';
import { useStore } from '../../store';
import { Transcript } from '../Transcript/Transcript';
import { TextInput } from '../TextInput/TextInput';
import { AudioInput } from '../AudioInput/AudioInput';
import { AudioToggle } from '../AudioToggle/AudioToggle';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import {
  usePipecatClient,
  usePipecatClientTransportState,
} from '@pipecat-ai/client-react';
import { supabase } from '@/lib/supabase';

const MotionBox = motion.create(Box);

export type InputMode = 'audio' | 'text';

export function ActiveSession() {
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const [inputMode, setInputMode] = useState<InputMode>('text');

  if (!activeSessionId) return null;

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
      <RoomUI inputMode={inputMode} setInputMode={setInputMode} />
    </MotionBox>
  );
}

function RoomUI({
  inputMode,
  setInputMode,
}: {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
}) {
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const isVoiceConnecting = transportState === 'connecting' || transportState === 'initializing';
  const isVoiceConnected = transportState === 'ready';

  const handleActivateAudio = async () => {
    setInputMode('audio');

    // Connect to pipecat if not already connected
    if (!isVoiceConnected && !isVoiceConnecting && client && activeSessionId) {
      try {
        setVoiceError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setVoiceError('Authentication required');
          return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const wsUrl = apiUrl.replace(/^http/, 'ws');

        await client.connect({
          wsUrl: `${wsUrl}/pipecat/session/${activeSessionId}?token=${encodeURIComponent(session.access_token)}`,
        });
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : 'Failed to connect voice');
      }
    }
  };

  return (
    <Flex direction="column" flex={1} gap={6} minH={0}>
      {/* Transcript - fills available space */}
      <Box flex={1} minH={0} w="full">
        <Transcript />
      </Box>

      {/* Voice connection status */}
      {inputMode === 'audio' && isVoiceConnecting && (
        <Flex justify="center" align="center" gap={2} color="white" opacity={0.7}>
          <Spinner size="sm" />
          <Text fontSize="sm">Connecting voice...</Text>
        </Flex>
      )}
      {voiceError && (
        <Flex justify="center">
          <MotionBox
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            bg="red.500/20"
            borderColor="red.500/50"
            borderWidth="1px"
            color="white"
            px={4}
            py={2}
            rounded="lg"
            fontSize="sm"
          >
            {voiceError}
          </MotionBox>
        </Flex>
      )}

      {/* Control buttons */}
      <Flex justify="center" gap={4} align="center" flexShrink={0}>
        <AudioToggle />
        <TextInput
          isActive={inputMode === 'text'}
          onActivate={() => setInputMode('text')}
        />
        <AudioInput
          isActive={inputMode === 'audio'}
          onActivate={handleActivateAudio}
        />
      </Flex>
    </Flex>
  );
}
