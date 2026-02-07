import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useStore } from '../../store';
import { ChatView } from '../ChatView/ChatView';
import { CallView } from '../CallView/CallView';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import {
  usePipecatClient,
  usePipecatClientTransportState,
} from '@pipecat-ai/client-react';
import { useSupabase } from '@/context/SupabaseContext';
import { useTranscriptMessages } from '@/hooks/useTranscriptMessages';

const MotionBox = motion.create(Box);

export type ViewMode = 'chat' | 'call';

export function ActiveSession() {
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  if (!activeSessionId) {
    return (
      <Flex w="full" h="full" align="center" justify="center">
        <Spinner size="xl" color="white" />
      </Flex>
    );
  }

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
      <SessionContent viewMode={viewMode} setViewMode={setViewMode} />
    </MotionBox>
  );
}

function SessionContent({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  const supabase = useSupabase();
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const messages = useStore((s) => s.session.messages);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Subscribe to transcript messages via Supabase Realtime
  useTranscriptMessages();

  const isVoiceConnecting =
    transportState === 'connecting' || transportState === 'initializing';
  const isVoiceConnected = transportState === 'ready';

  const handleStartCall = async () => {
    // Immediately switch to call view
    setViewMode('call');
    setVoiceError(null);

    // Connect to pipecat if not already connected
    if (!isVoiceConnected && !isVoiceConnecting && client && activeSessionId) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
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
        setVoiceError(
          err instanceof Error ? err.message : 'Failed to connect voice'
        );
      }
    }
  };

  const handleEndCall = async () => {
    // Disconnect from pipecat
    if (client && (isVoiceConnected || isVoiceConnecting)) {
      try {
        await client.disconnect();
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }

    // Switch back to chat view
    setViewMode('chat');
    setVoiceError(null);
  };

  return (
    <Flex direction="column" flex={1} minH={0}>
      <AnimatePresence mode="wait">
        {viewMode === 'chat' ? (
          <MotionBox
            key="chat-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            flex={1}
            display="flex"
            minH={0}
          >
            <ChatView messages={messages} onStartCall={handleStartCall} />
          </MotionBox>
        ) : (
          <MotionBox
            key="call-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            flex={1}
            display="flex"
            minH={0}
          >
            <CallView
              sessionId={activeSessionId}
              isConnecting={isVoiceConnecting}
              isConnected={isVoiceConnected}
              error={voiceError}
              onEndCall={handleEndCall}
            />
          </MotionBox>
        )}
      </AnimatePresence>
    </Flex>
  );
}
