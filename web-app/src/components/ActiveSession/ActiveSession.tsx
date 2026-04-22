import { motion, AnimatePresence } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { useStore } from '../../store';
import { ChatView } from '../ChatView/ChatView';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import { useTranscriptMessages } from '@/hooks/useTranscriptMessages';

const VoiceCall = lazy(() => import('../VoiceCall/VoiceCall'));

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
      <SessionContent
        sessionId={activeSessionId}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </MotionBox>
  );
}

function SessionContent({
  sessionId,
  viewMode,
  setViewMode,
}: {
  sessionId: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  const messages = useStore((s) => s.session.messages);

  // Subscribe to transcript messages via Supabase Realtime
  useTranscriptMessages();

  const handleStartCall = () => setViewMode('call');
  const handleEndCall = () => setViewMode('chat');

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
            <Suspense
              fallback={
                <Flex flex={1} align="center" justify="center">
                  <Spinner size="xl" color="white" />
                </Flex>
              }
            >
              <VoiceCall sessionId={sessionId} onEndCall={handleEndCall} />
            </Suspense>
          </MotionBox>
        )}
      </AnimatePresence>
    </Flex>
  );
}
