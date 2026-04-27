import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FONT_STACK,
  QuietFooter,
  THEMES,
  TopBar,
  UserInput,
  type ThemeKey,
} from './Landing';
import {
  TypingHero,
  splitSentences,
  shiftHighlights,
  textToLine,
  FADE_MS,
  type Line,
} from './Onboarding';
import { useWelcomeBackSession } from '@/hooks/useWelcomeBackSession';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

const WB_LAST_SEEN_KEY = 'wb-last-seen';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function markWelcomeSeen(): void {
  localStorage.setItem(WB_LAST_SEEN_KEY, todayStr());
}

export type WelcomeBackProps = {
  color?: ThemeKey;
};

export function WelcomeBack({ color = 'apricot' }: WelcomeBackProps) {
  const theme = THEMES[color];
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Connect immediately — fire_opener=True means the agent sends the first
  // message itself without waiting for user input.
  const {
    error,
    messages,
    completed,
    sendMessage,
    isAgentThinking,
  } = useWelcomeBackSession(true);

  useEffect(() => {
    if (!completed) return;
    markWelcomeSeen();
    navigate('/home');
  }, [completed, navigate]);

  const { visibleTutorMessages, turnKey } = useMemo<{
    visibleTutorMessages: TranscriptMessage[];
    turnKey: string;
  }>(() => {
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].message_source === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    const tutor = messages
      .slice(lastUserIdx + 1)
      .filter((m) => m.message_source === 'tutor');
    const turnKey = lastUserIdx >= 0 ? messages[lastUserIdx].message_id : 'start';
    return { visibleTutorMessages: tutor, turnKey };
  }, [messages]);
  const turnFingerprint = `${turnKey}::${visibleTutorMessages.map((m) => m.message_id).join('|')}`;

  const [displayMessages, setDisplayMessages] = useState<TranscriptMessage[]>([]);
  const [displayTurn, setDisplayTurn] = useState<string>('');
  const [displayTurnKey, setDisplayTurnKey] = useState<string>('start');
  const [linesVisible, setLinesVisible] = useState(true);

  useEffect(() => {
    if (turnFingerprint === displayTurn) return;
    const wasEmpty = displayMessages.length === 0;
    const isFreshTurn = turnKey !== displayTurnKey;

    if (wasEmpty || (!isFreshTurn && visibleTutorMessages.length >= displayMessages.length)) {
      setDisplayMessages(visibleTutorMessages);
      setDisplayTurn(turnFingerprint);
      setDisplayTurnKey(turnKey);
      setLinesVisible(true);
      return;
    }

    if (isFreshTurn && visibleTutorMessages.length === 0) {
      return;
    }

    setLinesVisible(false);
    const t = setTimeout(() => {
      setDisplayMessages(visibleTutorMessages);
      setDisplayTurn(turnFingerprint);
      setDisplayTurnKey(turnKey);
      setLinesVisible(true);
    }, FADE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnFingerprint]);

  const lines: Line[] = useMemo(() => {
    const result: Line[] = [];
    for (const m of displayMessages) {
      if (m.message_kind === 'component') continue;
      const sentences = splitSentences(m.message_text);
      for (const sentence of sentences) {
        const localHighlights = shiftHighlights(m.highlights, sentence);
        result.push(textToLine(sentence.text, localHighlights, { tint: theme.tint, ink: theme.ink }));
      }
    }
    return result;
  }, [displayMessages, theme.tint, theme.ink]);

  const [submitPending, setSubmitPending] = useState(false);
  useEffect(() => {
    if (submitPending && !isAgentThinking) setSubmitPending(false);
  }, [isAgentThinking, submitPending]);

  const handleSubmit = useCallback((msg: string) => {
    setSubmitPending(true);
    sendMessage(msg);
  }, [sendMessage]);

  const handleMicClick = useCallback(() => {
    markWelcomeSeen();
    navigate('/home');
  }, [navigate]);

  const gutter = isMobile ? 20 : 64;
  const containerMax = isMobile ? '100%' : 1100;

  // Show a subtle pulse while waiting for the opener
  const openerPending = messages.length === 0;

  return (
    <div style={{
      background: theme.bg, color: theme.ink, minHeight: '100vh',
      fontFamily: FONT_STACK,
      WebkitFontSmoothing: 'antialiased',
      letterSpacing: '-0.01em',
    }}>
      <style>{`@keyframes mmLandingBlink { 0%, 50% { opacity: 1 } 50.01%, 100% { opacity: 0 } }`}</style>
      <TopBar theme={theme} isMobile={isMobile} isReturning={true} />
      <div style={{
        maxWidth: containerMax, margin: '0 auto',
        padding: `0 ${gutter}px`, paddingBottom: 28,
      }}>
        <section style={{
          minHeight: isMobile ? 'calc(100vh - 80px)' : '86vh',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: isMobile ? '12px 0 24px' : '40px 0 60px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 22, maxWidth: isMobile ? '100%' : 860 }}>

            {error && (
              <div style={{
                color: '#a33', background: '#fee',
                padding: '10px 14px', borderRadius: 10, fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <div style={{
              opacity: linesVisible ? 1 : 0,
              transition: `opacity ${FADE_MS}ms cubic-bezier(.2,.7,.3,1)`,
              minHeight: isMobile ? 100 : 140,
            }}>
              {openerPending
                ? (
                  <div style={{
                    fontSize: isMobile ? 30 : 44, fontWeight: 600,
                    letterSpacing: '-0.02em', color: theme.sub,
                  }}>
                    <span style={{
                      display: 'inline-block', width: 2, height: (isMobile ? 30 : 44) * 0.95,
                      background: theme.tint, verticalAlign: '-0.12em',
                      animation: 'mmLandingBlink 1s steps(2) infinite',
                    }} />
                  </div>
                )
                : (
                  <TypingHero
                    lines={lines}
                    isMobile={isMobile}
                    theme={theme}
                    resetKey={displayTurnKey}
                  />
                )}
            </div>

            <UserInput
              theme={theme}
              isMobile={isMobile}
              onSubmit={handleSubmit}
              onMicClick={handleMicClick}
              disabled={submitPending || openerPending}
            />
          </div>
        </section>
        <QuietFooter theme={theme} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default WelcomeBack;
