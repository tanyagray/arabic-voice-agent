import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { Header } from '../components/Header';
import { UpgradeBanner } from '../components/Paywall/UpgradeBanner';
import { ChatView } from '../components/ChatView/ChatView';
import { useStore } from '../store';
import { appGradient } from '@/lib/styles';
import { useTranscriptMessages } from '@/hooks/useTranscriptMessages';
import { getLesson, type LessonData } from '@/api/lessons';
import { createSession } from '@/api/sessions/sessions.api';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setActiveSessionId = useStore((s) => s.session.setActiveSessionId);
  const setMessages = useStore((s) => s.session.setMessages);
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const messages = useStore((s) => s.session.messages);

  useTranscriptMessages();

  useEffect(() => {
    if (!lessonId) {
      navigate('/home');
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const [lessonData, sessionId] = await Promise.all([
          getLesson(lessonId!),
          createSession(),
        ]);
        if (cancelled) return;
        setLesson(lessonData);
        setMessages([]);
        setActiveSessionId(sessionId);
      } catch {
        if (!cancelled) setError('Failed to load lesson. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Synthetic first "agent" message showing the lesson summary
  const lessonIntroMessage = useMemo<TranscriptMessage | null>(() => {
    if (!lesson || !activeSessionId) return null;
    return {
      message_id: `lesson:${lesson.id}:intro`,
      session_id: activeSessionId,
      user_id: '',
      message_source: 'tutor',
      message_kind: 'text',
      message_text: `**${lesson.title}**\n\n${lesson.objective}`,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    };
  }, [lesson, activeSessionId]);

  const allMessages = useMemo(
    () => (lessonIntroMessage ? [lessonIntroMessage, ...messages] : messages),
    [lessonIntroMessage, messages],
  );

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" style={{ backgroundImage: appGradient }}>
        <Spinner size="xl" color="white" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex minH="100vh" align="center" justify="center" style={{ backgroundImage: appGradient }}>
        <Text color="white" fontSize="lg">{error}</Text>
      </Flex>
    );
  }

  return (
    <Flex
      minH="100vh"
      h="100vh"
      direction="column"
      overflow="hidden"
      style={{ backgroundImage: appGradient }}
    >
      <Header />
      <UpgradeBanner />
      <Box
        flex={1}
        minH={0}
        pt="80px"
        px={{ base: 0, md: 6 }}
        pb={{ base: 4, md: 6 }}
        position="relative"
        zIndex={1}
      >
        {!activeSessionId ? (
          <Flex w="full" h="full" align="center" justify="center">
            <Spinner size="xl" color="white" />
          </Flex>
        ) : (
          <Flex direction="column" flex={1} h="full">
            <ChatView messages={allMessages} onStartCall={() => {}} />
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

export default LessonPage;
