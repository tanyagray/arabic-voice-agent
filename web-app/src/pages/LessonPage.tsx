import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flex, Spinner, Text } from '@chakra-ui/react';
import { ChatView } from '../components/ChatView/ChatView';
import { useStore } from '../store';
import { THEMES, FONT_STACK, TopBar } from '@/pages/Landing';
import { useTranscriptMessages } from '@/hooks/useTranscriptMessages';
import { createSession, fireOpener } from '@/api/sessions/sessions.api';

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
        const sessionId = await createSession(lessonId!);
        if (cancelled) return;
        await fireOpener(sessionId);
        if (cancelled) return;
        setMessages([]);
        setActiveSessionId(sessionId);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail ?? (err as { message?: string })?.message ?? 'Unknown error';
        console.error('[LessonPage] init failed:', err);
        if (!cancelled) setError(`Failed to load lesson: ${msg}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

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
          <ChatView messages={messages} onStartCall={() => {}} theme={theme} />
        )}
      </Flex>
    </div>
  );
}

export default LessonPage;
