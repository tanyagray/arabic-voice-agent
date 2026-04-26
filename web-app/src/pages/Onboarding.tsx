import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FONT_STACK,
  QuietFooter,
  THEMES,
  TopBar,
  UserInput,
  type ThemeKey,
} from './Landing';
import { useOnboardingSession } from '@/hooks/useOnboardingSession';
import type { Highlight, TranscriptMessage } from '@/api/sessions/sessions.types';
import {
  parseComponentMessage,
  renderTranscriptComponent,
} from '@/components/TranscriptComponents/registry';
import type { LessonTile } from '@/components/TranscriptComponents/LessonTiles';

export type OnboardingProps = {
  color?: ThemeKey;
};

type TextSegment = { text: string; color: string; meaning?: string };
type Line = TextSegment[];

const CPS = 48;
const FADE_MS = 200;
const segCharCount = (l: Line) => l.reduce((n, s) => n + [...s.text].length, 0);

type PopoverState = { meaning: string; top: number; left: number };

function HighlightSpan({
  seg,
  visibleText,
  onShow,
  onHide,
}: {
  seg: TextSegment;
  visibleText: string;
  onShow: (meaning: string, el: HTMLElement) => void;
  onHide: () => void;
}) {
  return (
    <span
      style={{
        color: seg.color,
        cursor: 'pointer',
        backgroundColor: `${seg.color}22`,
        borderRadius: '4px',
        padding: '2px 6px',
        display: 'inline-block',
        lineHeight: 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onShow(seg.meaning!, e.currentTarget as HTMLElement);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') onShow(seg.meaning!, e.currentTarget as HTMLElement);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') onHide();
      }}
    >
      {visibleText}
    </span>
  );
}

function TypingHero({ lines, isMobile, theme, resetKey }: {
  lines: Line[]; isMobile: boolean; theme: { tint: string; ink: string };
  resetKey: string | number;
}) {
  const [counts, setCounts] = useState<number[]>(() => lines.map(() => 0));
  const [activeLine, setActiveLine] = useState(-1);
  const rafRef = useRef<number | undefined>(undefined);
  const prevResetRef = useRef<string | number>(resetKey);
  const prevLenRef = useRef<number>(0);
  const linesRef = useRef<Line[]>(lines);
  linesRef.current = lines;

  useEffect(() => {
    const resetChanged = prevResetRef.current !== resetKey;
    prevResetRef.current = resetKey;

    // Determine which lines should appear already-typed vs animate from scratch.
    const carriedCount = resetChanged ? 0 : prevLenRef.current;
    prevLenRef.current = lines.length;

    setCounts(
      lines.map((l, i) => (i < carriedCount ? segCharCount(l) : 0)),
    );
    setActiveLine(-1);

    if (lines.length <= carriedCount) return;

    const startAt = performance.now() + 60;
    const lineDur = lines.map((l) => (segCharCount(l) / CPS) * 1000);
    const lineStart: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i < carriedCount) {
        lineStart[i] = -Infinity;
      } else if (i === carriedCount) {
        lineStart[i] = startAt;
      } else {
        lineStart[i] = lineStart[i - 1] + lineDur[i - 1] + 200;
      }
    }

    const tick = (now: number) => {
      const currentLines = linesRef.current;
      const next = currentLines.map((l, i) => {
        if (i < carriedCount) return segCharCount(l);
        const t = now - lineStart[i];
        if (t <= 0) return 0;
        return Math.min(segCharCount(l), Math.floor((t / 1000) * CPS));
      });
      setCounts(next);

      let active = -1;
      for (let i = carriedCount; i < currentLines.length; i++) {
        if (now >= lineStart[i]) active = i;
      }
      setActiveLine(active);

      const lastEnd =
        lineStart[currentLines.length - 1] + lineDur[currentLines.length - 1];
      if (now < lastEnd + 400) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setActiveLine(-1);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, resetKey]);

  const lineSize = isMobile ? 30 : 44;

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    const handlePointerDown = (e: PointerEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', close, true);
    };
  }, [popover]);

  const showPopover = useCallback((meaning: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setPopover({
      meaning,
      top: rect.top - 4,
      left: rect.left + rect.width / 2,
    });
  }, []);
  const hidePopover = useCallback(() => setPopover(null), []);

  const renderLine = (segs: Line, count: number, style: CSSProperties, showCursor: boolean, cursorHeight: number, key: string | number) => {
    let remaining = count;
    const nodes: ReactNode[] = [];
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const chars = [...s.text];
      if (remaining <= 0) break;
      const take = Math.min(chars.length, remaining);
      const visibleText = chars.slice(0, take).join('');
      remaining -= take;
      if (s.meaning) {
        nodes.push(
          <HighlightSpan
            key={i}
            seg={s}
            visibleText={visibleText}
            onShow={showPopover}
            onHide={hidePopover}
          />,
        );
      } else {
        nodes.push(
          <span key={i} style={{ color: s.color }}>
            {visibleText}
          </span>,
        );
      }
    }
    return (
      <div key={key} style={style}>
        {nodes}
        <span style={{
          display: 'inline-block', width: 2, height: cursorHeight,
          background: theme.tint, marginLeft: 3, verticalAlign: '-0.12em',
          opacity: showCursor ? 1 : 0,
          animation: showCursor ? 'mmLandingBlink 1s steps(2) infinite' : 'none',
        }} />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
      {lines.map((l, i) => {
        return renderLine(l, counts[i] ?? 0, {
          fontFamily: FONT_STACK,
          fontSize: lineSize,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          minHeight: lineSize * 1.2,
        }, activeLine === i, lineSize * 0.95, i);
      })}
      {popover && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${popover.top}px`,
            left: `${popover.left}px`,
            transform: 'translate(-50%, -100%)',
            background: '#1f2937',
            color: 'white',
            padding: '6px 12px',
            borderRadius: 8,
            boxShadow: '0 10px 24px -12px rgba(0,0,0,0.4)',
            fontFamily: FONT_STACK,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 0,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          {popover.meaning}
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1f2937',
          }} />
        </div>,
        document.body,
      )}
    </div>
  );
}

/**
 * Build a Line from a transcript message, using the message's own `highlights`
 * (DB-driven) to mark tinted, interactive segments. Falls back to the
 * `marhaban/mishmish` keyword highlights so the initial placeholder and any
 * messages without highlights still get a tint.
 */
const FALLBACK_MEANINGS: Record<string, string> = {
  marhaban: 'Hello',
  mishmish: 'apricot',
};
const FALLBACK_RE = /(marhaban|mishmish)/gi;

// The agent emits one transcript row per turn; we split it into sentences so
// each one types in as its own bubble, preserving the multi-line cadence the
// UI was designed around. Trailing whitespace is trimmed; a fragment without
// a terminator (e.g. "Hi there") is treated as one sentence. If the regex
// finds nothing, return the whole text as a single sentence.
function splitSentences(text: string): string[] {
  const matches = text.match(/[^.?!]+[.?!]+(?=\s|$)|[^.?!]+$/g);
  if (!matches) return [text];
  const trimmed = matches.map((s) => s.trim()).filter((s) => s.length > 0);
  return trimmed.length > 0 ? trimmed : [text];
}

function textToLine(text: string, highlights: Highlight[] | null | undefined, theme: { tint: string; ink: string }): Line {
  const segs: TextSegment[] = [];
  if (highlights && highlights.length > 0) {
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    let cursor = 0;
    for (const h of sorted) {
      if (h.start > cursor) segs.push({ text: text.slice(cursor, h.start), color: theme.ink });
      segs.push({ text: text.slice(h.start, h.end), color: theme.tint, meaning: h.meaning });
      cursor = h.end;
    }
    if (cursor < text.length) segs.push({ text: text.slice(cursor), color: theme.ink });
    return segs;
  }
  let last = 0;
  for (const m of text.matchAll(FALLBACK_RE)) {
    const start = m.index ?? 0;
    if (start > last) segs.push({ text: text.slice(last, start), color: theme.ink });
    segs.push({
      text: m[0],
      color: theme.tint,
      meaning: FALLBACK_MEANINGS[m[0].toLowerCase()],
    });
    last = start + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last), color: theme.ink });
  return segs.length ? segs : [{ text, color: theme.ink }];
}

// Static greeting bubbles, shown to every new visitor without an LLM call.
// These three lines are part of the brand experience — they're rendered
// client-side so refreshes and idle visits cost zero tokens. The real
// onboarding agent only spins up after the learner submits their first
// message (their answer to "what is your name?").
function buildInitialMessages(now: string): TranscriptMessage[] {
  const stub = {
    session_id: '',
    user_id: '',
    message_source: 'tutor' as const,
    message_kind: 'text',
    flow: 'onboarding',
    created_at: now,
    updated_at: now,
  };
  return [
    {
      ...stub,
      message_id: 'mishmish:initial:0',
      message_text: 'marhaban!',
      highlights: [{ word: 'marhaban', meaning: 'hello', start: 0, end: 8 }],
    },
    {
      ...stub,
      message_id: 'mishmish:initial:1',
      message_text: "i'm mishmish, which means apricot in Arabic \uD83D\uDE0A",
      highlights: [{ word: 'mishmish', meaning: 'apricot', start: 4, end: 12 }],
    },
    {
      ...stub,
      message_id: 'mishmish:initial:2',
      message_text: 'what is your name?',
      highlights: null,
    },
  ];
}

export function Onboarding({ color = 'apricot' }: OnboardingProps) {
  const theme = THEMES[color];
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [hasStarted, setHasStarted] = useState(false);
  const initialMessages = useMemo(() => buildInitialMessages(new Date().toISOString()), []);

  const {
    error,
    messages: liveMessages,
    sendMessage,
    isAgentThinking,
  } = useOnboardingSession(hasStarted);

  // Show the synthetic greeting bubbles only until any live message arrives.
  // Once the agent has spoken (or the user message echoes back), we hand off
  // entirely to the live messages — this avoids the failure mode where a
  // tutor message lands via Realtime before its preceding user message and
  // gets glued onto the synthetic "first turn" forever.
  const messages = useMemo(
    () => (liveMessages.length === 0 ? initialMessages : liveMessages),
    [initialMessages, liveMessages],
  );

  // The hero shows the agent's *current* turn — i.e. tutor messages that came
  // after the most recent user message. As soon as the learner submits, the
  // earlier bubbles fall out of the slice and the hero clears, then the new
  // tutor bubbles type in as they arrive. Component messages (LessonTiles)
  // share the same slice so they vanish on the next user turn too — fine,
  // because clicking a tile navigates away.
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
    // Identify the turn by the boundary (last user message id) — NOT by the
    // tutor messages themselves. Otherwise every newly-arriving tutor bubble
    // looks like a new turn and TypingHero re-animates all prior lines.
    const turnKey = lastUserIdx >= 0 ? messages[lastUserIdx].message_id : 'start';
    return { visibleTutorMessages: tutor, turnKey };
  }, [messages]);
  const turnFingerprint = `${turnKey}::${visibleTutorMessages.map((m) => m.message_id).join('|')}`;

  // Cross-fade between turns so the swap reads softly.
  const [displayMessages, setDisplayMessages] = useState<TranscriptMessage[]>([]);
  const [displayTurn, setDisplayTurn] = useState<string>('');
  // Mirrors `turnKey` but only advances in lockstep with `displayMessages`, so
  // TypingHero doesn't see a new resetKey while it's still rendering the
  // outgoing turn's lines (which would re-animate them mid-fade).
  const [displayTurnKey, setDisplayTurnKey] = useState<string>('start');
  const [linesVisible, setLinesVisible] = useState(true);

  useEffect(() => {
    if (turnFingerprint === displayTurn) return;
    const wasEmpty = displayMessages.length === 0;
    const isFreshTurn = turnKey !== displayTurnKey;

    // First bubbles ever, or appending more bubbles within the SAME turn —
    // type in directly without a fade.
    if (wasEmpty || (!isFreshTurn && visibleTutorMessages.length >= displayMessages.length)) {
      setDisplayMessages(visibleTutorMessages);
      setDisplayTurn(turnFingerprint);
      setDisplayTurnKey(turnKey);
      setLinesVisible(true);
      return;
    }

    // Fresh turn (user just submitted) but the agent hasn't replied yet —
    // keep the previous turn's bubbles visible so the user has context while
    // they wait. Don't update display state.
    if (isFreshTurn && visibleTutorMessages.length === 0) {
      return;
    }

    // Fresh turn AND the first new tutor bubble has arrived — fade out the
    // old bubbles, then swap to the new content (which TypingHero animates in).
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

  // Split text messages (typed into the hero) vs component messages (rendered
  // via the TranscriptComponents registry below the hero).
  const textMessages = useMemo(
    () => displayMessages.filter((m) => m.message_kind !== 'component'),
    [displayMessages],
  );
  const componentMessages = useMemo(
    () => displayMessages.filter((m) => m.message_kind === 'component'),
    [displayMessages],
  );

  // One transcript row → one Line per sentence. Single-sentence messages keep
  // their DB highlights (offsets are valid against the full text). Multi-
  // sentence messages drop them — the offsets would be wrong against each
  // split fragment. The FALLBACK_RE inside textToLine still tints
  // "marhaban"/"mishmish" client-side either way.
  const lines: Line[] = useMemo(() => {
    const result: Line[] = [];
    for (const m of textMessages) {
      const sentences = splitSentences(m.message_text);
      if (sentences.length <= 1) {
        result.push(
          textToLine(m.message_text, m.highlights, { tint: theme.tint, ink: theme.ink }),
        );
      } else {
        for (const sentence of sentences) {
          result.push(
            textToLine(sentence, null, { tint: theme.tint, ink: theme.ink }),
          );
        }
      }
    }
    return result;
  }, [textMessages, theme.tint, theme.ink]);

  // Tracks "user has submitted, waiting for agent reply". Drives the input's
  // disabled/spinner state. We can't use `isAgentThinking` directly because it
  // is also true on initial page load (before the first greeting), and we
  // don't want the input to start out disabled.
  const [submitPending, setSubmitPending] = useState(false);
  useEffect(() => {
    if (submitPending && !isAgentThinking) setSubmitPending(false);
  }, [isAgentThinking, submitPending]);

  const handleSubmit = useCallback((msg: string) => {
    setSubmitPending(true);
    if (!hasStarted) setHasStarted(true);
    sendMessage(msg);
  }, [hasStarted, sendMessage]);

  const handleLessonPick = useCallback((tile: LessonTile) => {
    sessionStorage.setItem('mishmish:onboarding:pick', tile.level.toLowerCase());
    navigate('/');
  }, [navigate]);

  const handleMicClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const gutter = isMobile ? 20 : 64;
  const containerMax = isMobile ? '100%' : 1100;

  return (
    <div style={{
      background: theme.bg, color: theme.ink, minHeight: '100vh',
      fontFamily: FONT_STACK,
      WebkitFontSmoothing: 'antialiased',
      letterSpacing: '-0.01em',
    }}>
      <style>{`@keyframes mmLandingBlink { 0%, 50% { opacity: 1 } 50.01%, 100% { opacity: 0 } }`}</style>
      <TopBar theme={theme} isMobile={isMobile} isReturning={false} />
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

            <div
              style={{
                opacity: linesVisible ? 1 : 0,
                transition: `opacity ${FADE_MS}ms cubic-bezier(.2,.7,.3,1)`,
                minHeight: isMobile ? 100 : 140,
              }}
            >
              <TypingHero
                lines={lines}
                isMobile={isMobile}
                theme={theme}
                resetKey={displayTurnKey}
              />
            </div>

            {componentMessages.map((m) => {
              const parsed = parseComponentMessage(m);
              if (!parsed) return null;
              return (
                <div key={m.message_id}>
                  {renderTranscriptComponent(m, {
                    LessonTiles: {
                      theme,
                      isMobile,
                      visible: linesVisible,
                      onPick: handleLessonPick,
                    },
                  })}
                </div>
              );
            })}

            <UserInput
              theme={theme}
              isMobile={isMobile}
              onSubmit={handleSubmit}
              onMicClick={handleMicClick}
              disabled={submitPending}
            />
          </div>
        </section>
        <QuietFooter theme={theme} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default Onboarding;
