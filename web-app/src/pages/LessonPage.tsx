import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flex, Spinner, Text } from '@chakra-ui/react';
import { ChatView } from '../components/ChatView/ChatView';
import { useStore } from '../store';
import { THEMES, FONT_STACK, TopBar } from '@/pages/Landing';
import { useTranscriptMessages } from '@/hooks/useTranscriptMessages';
import { getLesson, type LessonData } from '@/api/lessons';
import { createSession } from '@/api/sessions/sessions.api';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

const theme = THEMES['apricot'];

function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const pageStyle: React.CSSProperties = {
    background: theme.bg,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: FONT_STACK,
    WebkitFontSmoothing: 'antialiased',
    color: theme.ink,
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <Flex flex={1} align="center" justify="center">
          <Spinner size="xl" color={theme.tint} />
        </Flex>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <Flex flex={1} align="center" justify="center">
          <Text fontSize="lg" style={{ color: theme.sub }}>{error}</Text>
        </Flex>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <TopBar theme={theme} isMobile={isMobile} isReturning={true} />
      <Flex
        flex={1}
        minH={0}
        direction="column"
        px={{ base: 0, md: 6 }}
        pb={{ base: 4, md: 6 }}
      >
        {!activeSessionId ? (
          <Flex w="full" h="full" align="center" justify="center">
            <Spinner size="xl" color={theme.tint} />
          </Flex>
        ) : (
          <ChatView messages={allMessages} onStartCall={() => {}} theme={theme} />
        )}
      </Flex>
    </div>
  );
}

export default LessonPage;
