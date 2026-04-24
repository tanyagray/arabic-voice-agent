import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type SVGProps } from 'react';
import { useStore } from '@/store';
import { useTranscriptMessages } from '@/hooks/useTranscriptMessages';
import { useSupabase } from '@/context/SupabaseContext';
import type { TranscriptMessage, ResponseMode } from '@/api/sessions/sessions.types';

export type ThemeKey = 'apricot' | 'dark';
type UserState = 'new' | 'returning';

export type Theme = {
  bg: string;
  surface: string;
  ink: string;
  sub: string;
  border: string;
  tint: string;
  tintDeep: string;
  tintSoft: string;
  highlight: string;
  isDark: boolean;
};

export const THEMES: Record<ThemeKey, Theme> = {
  apricot: {
    bg: '#FBF6EC',
    surface: '#FFFFFF',
    ink: '#2A1D12',
    sub: '#6E5A46',
    border: '#EADFC9',
    tint: '#E87E3C',
    tintDeep: '#C35A1C',
    tintSoft: '#FCE8CF',
    highlight: '#FFE8CC',
    isDark: false,
  },
  dark: {
    bg: '#141012',
    surface: '#1E1819',
    ink: '#F6EFE5',
    sub: '#9A8E80',
    border: '#2E2624',
    tint: '#F19248',
    tintDeep: '#E87E3C',
    tintSoft: 'rgba(241,146,72,0.15)',
    highlight: 'rgba(241,146,72,0.22)',
    isDark: true,
  },
};

export const FONT_STACK = "'Noto Sans Arabic', 'Inter', system-ui, sans-serif";

const Icon = {
  mic: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  ),
  play: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z" /></svg>
  ),
  send: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 3 11 13" />
      <path d="M21 3 14.5 21l-3.5-8-8-3.5L21 3z" />
    </svg>
  ),
  user: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  settings: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
};

function ApricotMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id="apr-body-2" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFD199" />
          <stop offset="55%" stopColor="#F09B53" />
          <stop offset="100%" stopColor="#B8501A" />
        </radialGradient>
      </defs>
      <path d="M20 9 C12 9 6 15 6 23 C6 31 12 36 20 36 C28 36 34 31 34 23 C34 15 28 9 20 9 Z" fill="url(#apr-body-2)" />
      <path d="M20 10 C19 14 19 30 20 36" stroke="rgba(155,63,16,0.35)" strokeWidth="1" fill="none" />
      <path d="M20 10 C18 5 14 3 10 4 C11 8 15 11 20 10 Z" fill="#5DA34D" />
      <ellipse cx="14" cy="17" rx="3.5" ry="2" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

type TextSegment = { text: string; color: string };
type ChipSegment = { chip: { ar: string; latin: string; meaning: string } };
type Segment = TextSegment | ChipSegment;

const isChip = (s: Segment): s is ChipSegment => 'chip' in s;
const segLen = (s: Segment): number => (isChip(s) ? 1 : [...s.text].length);
const totalChars = (segs: Segment[]): number => segs.reduce((n, s) => n + segLen(s), 0);

const CPS = 32;
const LINE_GAP = 800;

function FadeSlide({ show, children, delay = 0 }: { show: boolean; children: React.ReactNode; delay?: number }) {
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(18px)',
      transition: `opacity 0.7s cubic-bezier(.2,.7,.3,1) ${delay}ms, transform 0.7s cubic-bezier(.2,.7,.3,1) ${delay}ms`,
      willChange: 'transform, opacity',
    }}>{children}</div>
  );
}

export function UserInput({ theme, isMobile, prefilled = null, autoFocus = true, onSubmit, onMicClick, disabled = false }: {
  theme: Theme; isMobile: boolean; prefilled?: string | null; autoFocus?: boolean;
  onSubmit: (msg: string) => void; onMicClick?: () => void; disabled?: boolean;
}) {
  const [value, setValue] = useState(prefilled || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = value.trim();
    if (!msg || disabled) return;
    onSubmit(msg);
    setValue('');
    inputRef.current?.focus();
  };

  const handleMicClick = () => {
    if (onMicClick) onMicClick();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: isMobile ? 4 : 8, background: theme.surface,
        border: `1.5px solid ${theme.tint}`,
        borderRadius: isMobile ? 18 : 22, padding: isMobile ? '16px 16px' : '22px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: `0 20px 40px -24px ${theme.tint}66, 0 0 0 4px ${theme.tintSoft}`,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        style={{
          flex: 1, minWidth: 0,
          fontFamily: FONT_STACK,
          fontSize: isMobile ? 26 : 40, color: theme.ink,
          lineHeight: 1.1, letterSpacing: '-0.02em',
          fontWeight: 600,
          background: 'transparent', border: 'none', outline: 'none',
          caretColor: theme.tint,
        }}
      />
      {value.trim() ? (
        <button
          type="submit"
          aria-label="Send message"
          style={{
            width: isMobile ? 44 : 54, height: isMobile ? 44 : 54, borderRadius: '50%',
            background: theme.tint, color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: `0 8px 24px -6px ${theme.tint}88`,
          }}
        >
          <Icon.send width={isMobile ? 18 : 22} height={isMobile ? 18 : 22} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleMicClick}
          aria-label="Start voice call"
          style={{
            width: isMobile ? 44 : 54, height: isMobile ? 44 : 54, borderRadius: '50%',
            background: theme.tint, color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: `0 8px 24px -6px ${theme.tint}88`,
          }}
        >
          <Icon.mic width={isMobile ? 18 : 22} height={isMobile ? 18 : 22} />
        </button>
      )}
    </form>
  );
}

function ArabicChip({ ar, latin, meaning, theme }: { ar: string; latin: string; meaning: string; theme: Theme }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => setHover((v) => !v)}
      style={{
        position: 'relative',
        background: theme.highlight,
        borderRadius: 6,
        padding: '0 6px',
        cursor: 'pointer',
        color: theme.tintDeep,
        display: 'inline-block',
        lineHeight: 1.1,
      }}>
      {latin}
      <span style={{
        position: 'absolute', left: '50%', bottom: '100%',
        transform: `translate(-50%, ${hover ? '-6px' : '0'})`,
        opacity: hover ? 1 : 0, pointerEvents: 'none',
        transition: 'all .22s cubic-bezier(.2,.7,.3,1)',
        background: theme.ink, color: theme.bg,
        padding: '8px 12px', borderRadius: 10, whiteSpace: 'nowrap',
        fontFamily: FONT_STACK, fontStyle: 'normal', fontWeight: 500,
        fontSize: 13, letterSpacing: '-0.01em',
        boxShadow: '0 10px 24px -8px rgba(0,0,0,0.3)', zIndex: 5,
      }}>
        <span style={{
          fontFamily: 'Noto Sans Arabic, serif', direction: 'rtl',
          fontSize: 18, marginRight: 8, color: theme.tint,
        }}>{ar}</span>
        <span style={{ opacity: 0.75 }}>— {meaning}</span>
      </span>
    </span>
  );
}

function groupBySource(messages: TranscriptMessage[]): TranscriptMessage[][] {
  const groups: TranscriptMessage[][] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].message_source === m.message_source) last.push(m);
    else groups.push([m]);
  }
  return groups;
}

function getTutorDisplayText(m: TranscriptMessage, mode: ResponseMode): string {
  if (mode === 'canonical' && m.message_text_canonical) return m.message_text_canonical;
  if (mode === 'transliterated' && m.message_text_transliterated) return m.message_text_transliterated;
  if (mode === 'scaffolded' && m.message_text_scaffolded) return m.message_text_scaffolded;
  return m.message_text;
}

export function ChatMessages({ theme, isMobile, messages, responseMode }: {
  theme: Theme; isMobile: boolean; messages: TranscriptMessage[]; responseMode: ResponseMode;
}) {
  const filtered = messages.filter(
    (m) => (m.message_kind === 'text' || m.message_kind === 'audio') && m.message_source !== 'system'
  );
  if (filtered.length === 0) return null;
  const groups = groupBySource(filtered);
  const bigR = 20;
  const smallR = 6;
  const fontSize = isMobile ? 17 : 19;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
      {groups.map((group) => {
        const isUser = group[0].message_source === 'user';
        return (
          <div
            key={group[0].message_id}
            style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {group.map((m, i) => {
              const isFirst = i === 0;
              const isLast = i === group.length - 1;
              const displayText = isUser ? m.message_text : getTutorDisplayText(m, responseMode);
              const isRtl = !isUser && responseMode === 'canonical';
              // Tail is on the side of the sender; flatten corner on tail side when grouped
              const topRight = isUser ? (isFirst ? bigR : smallR) : bigR;
              const topLeft = !isUser ? (isFirst ? bigR : smallR) : bigR;
              const bottomRight = isUser ? (isLast ? smallR : smallR) : bigR;
              const bottomLeft = !isUser ? (isLast ? smallR : smallR) : bigR;
              return (
                <div
                  key={m.message_id}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    dir={isRtl ? 'rtl' : undefined}
                    style={{
                      maxWidth: '80%',
                      padding: isMobile ? '10px 14px' : '12px 16px',
                      background: isUser ? theme.tint : theme.surface,
                      color: isUser ? '#fff' : theme.ink,
                      border: isUser ? 'none' : `1px solid ${theme.border}`,
                      borderTopRightRadius: topRight,
                      borderTopLeftRadius: topLeft,
                      borderBottomRightRadius: bottomRight,
                      borderBottomLeftRadius: bottomLeft,
                      fontFamily: FONT_STACK,
                      fontSize,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {displayText}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function NewUserHero({ theme, isMobile, messages, responseMode, onSubmit, onMicClick, inputDisabled }: {
  theme: Theme; isMobile: boolean; messages: TranscriptMessage[]; responseMode: ResponseMode;
  onSubmit: (msg: string) => void; onMicClick: () => void; inputDisabled: boolean;
}) {
  const LINES: Segment[][] = useMemo(() => [
    [{ text: 'marhaban!', color: theme.tint }],
    [
      { text: "i'm ", color: theme.ink },
      { text: 'mishmish', color: theme.tint },
      { text: ', which means apricot \uD83D\uDE0A', color: theme.ink },
    ],
    [{ text: 'what is your name?', color: theme.ink }],
  ], [theme.tint, theme.ink]);

  const [counts, setCounts] = useState([0, 0, 0]);
  const [activeLine, setActiveLine] = useState(-1);
  const [showInput, setShowInput] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);

  const run = useCallback(() => {
    setCounts([0, 0, 0]);
    setActiveLine(-1);
    setShowInput(false);
    const startAt = performance.now() + 150;
    const lineDur = LINES.map((l) => (totalChars(l) / CPS) * 1000);
    const lineStart: number[] = [];
    for (let i = 0; i < LINES.length; i++) {
      lineStart[i] = i === 0 ? startAt : lineStart[i - 1] + lineDur[i - 1] + LINE_GAP;
    }

    const tick = (now: number) => {
      const next = LINES.map((l, i) => {
        const t = now - lineStart[i];
        if (t <= 0) return 0;
        return Math.min(totalChars(l), Math.floor((t / 1000) * CPS));
      });
      setCounts(next);

      let active = -1;
      for (let i = 0; i < LINES.length; i++) {
        if (now >= lineStart[i]) active = i;
      }
      setActiveLine(active);

      const lastEnd = lineStart[LINES.length - 1] + lineDur[LINES.length - 1];
      if (now < lastEnd + 600) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setActiveLine(-1);
        setTimeout(() => setShowInput(true), 200);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [LINES]);

  useEffect(() => {
    run();
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [run]);

  const bigSize = isMobile ? 56 : 104;
  const lineSize = isMobile ? 28 : 44;

  const renderLine = (segs: Segment[], count: number, style: CSSProperties, showCursor: boolean, cursorHeight: number) => {
    const chars = segs.flatMap((s) => (isChip(s) ? [] : [...s.text].map((ch) => ({ ch, color: s.color }))));
    const visible = chars.slice(0, count);
    return (
      <div style={style}>
        {visible.map((c, i) => (<span key={i} style={{ color: c.color }}>{c.ch}</span>))}
        <span style={{
          display: 'inline-block',
          width: 2,
          height: cursorHeight,
          background: theme.tint,
          marginLeft: 3,
          verticalAlign: '-0.12em',
          opacity: showCursor ? 1 : 0,
          animation: showCursor ? 'mmLandingBlink 1s steps(2) infinite' : 'none',
        }} />
      </div>
    );
  };

  return (
    <section style={{
      minHeight: isMobile ? 'calc(100vh - 80px)' : '86vh',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: isMobile ? '12px 0 24px' : '40px 0 60px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 22, maxWidth: isMobile ? '100%' : 860 }}>
        {renderLine(LINES[0], counts[0], {
          fontFamily: FONT_STACK,
          fontSize: bigSize, fontWeight: 700,
          letterSpacing: '-0.035em', lineHeight: 1,
          minHeight: bigSize,
        }, activeLine === 0, bigSize * 0.82)}

        {renderLine(LINES[1], counts[1], {
          fontFamily: FONT_STACK,
          fontSize: lineSize, fontWeight: 600,
          letterSpacing: '-0.02em', lineHeight: 1.2,
          minHeight: lineSize * 1.2,
        }, activeLine === 1, lineSize * 0.95)}

        {renderLine(LINES[2], counts[2], {
          fontFamily: FONT_STACK,
          fontSize: lineSize, fontWeight: 600,
          letterSpacing: '-0.02em', lineHeight: 1.2,
          minHeight: lineSize * 1.2,
        }, activeLine === 2, lineSize * 0.95)}

        <ChatMessages theme={theme} isMobile={isMobile} messages={messages} responseMode={responseMode} />

        <FadeSlide show={showInput}>
          <UserInput
            theme={theme}
            isMobile={isMobile}
            onSubmit={onSubmit}
            onMicClick={onMicClick}
            disabled={inputDisabled}
          />
        </FadeSlide>
      </div>
    </section>
  );
}

function ReturningHero({ theme, isMobile, onSubmit, onMicClick, inputDisabled }: {
  theme: Theme; isMobile: boolean;
  onSubmit: (msg: string) => void; onMicClick: () => void; inputDisabled: boolean;
}) {
  const lineSize = isMobile ? 30 : 48;

  const LINES: Segment[][] = useMemo(() => [[
    { chip: { ar: 'أهلاً', latin: 'Ahlan', meaning: 'hello, welcome' } },
    { text: ', salma — have you been practising your ', color: theme.ink },
    { chip: { ar: 'خضراوات', latin: 'khadrawaat', meaning: 'vegetables' } },
    { text: '?', color: theme.ink },
  ]], [theme.ink]);

  const [counts, setCounts] = useState([0]);
  const [activeLine, setActiveLine] = useState(-1);
  const [showAfter, setShowAfter] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);

  const run = useCallback(() => {
    setCounts([0]);
    setActiveLine(-1);
    setShowAfter(false);
    const startAt = performance.now() + 150;
    const lineDur = LINES.map((l) => (totalChars(l) / CPS) * 1000);
    const lineStart: number[] = [];
    for (let i = 0; i < LINES.length; i++) {
      lineStart[i] = i === 0 ? startAt : lineStart[i - 1] + lineDur[i - 1] + LINE_GAP;
    }

    const tick = (now: number) => {
      const next = LINES.map((l, i) => {
        const t = now - lineStart[i];
        if (t <= 0) return 0;
        return Math.min(totalChars(l), Math.floor((t / 1000) * CPS));
      });
      setCounts(next);

      let active = -1;
      for (let i = 0; i < LINES.length; i++) if (now >= lineStart[i]) active = i;
      setActiveLine(active);

      const lastEnd = lineStart[LINES.length - 1] + lineDur[LINES.length - 1];
      if (now < lastEnd + 400) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setActiveLine(-1);
        setTimeout(() => setShowAfter(true), 200);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [LINES]);

  useEffect(() => {
    run();
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [run]);

  const renderLine = (segs: Segment[], count: number, showCursor: boolean) => {
    const atoms: Array<
      | { type: 'ch'; ch: string; color: string; key: string }
      | { type: 'chip'; data: { ar: string; latin: string; meaning: string }; key: string }
    > = [];
    segs.forEach((s, si) => {
      if (isChip(s)) atoms.push({ type: 'chip', data: s.chip, key: `c${si}` });
      else [...s.text].forEach((ch, ci) => atoms.push({ type: 'ch', ch, color: s.color, key: `t${si}-${ci}` }));
    });
    const visible = atoms.slice(0, count);
    return (
      <div style={{
        fontFamily: FONT_STACK,
        fontSize: lineSize, fontWeight: 600,
        letterSpacing: '-0.02em', lineHeight: 1.2,
        minHeight: lineSize * 1.2,
      }}>
        {visible.map((a) => a.type === 'ch'
          ? (<span key={a.key} style={{ color: a.color }}>{a.ch}</span>)
          : (<ArabicChip key={a.key} theme={theme} {...a.data} />))}
        <span style={{
          display: 'inline-block', width: 2, height: lineSize * 0.95,
          background: theme.tint, marginLeft: 3, verticalAlign: '-0.12em',
          opacity: showCursor ? 1 : 0,
          animation: showCursor ? 'mmLandingBlink 1s steps(2) infinite' : 'none',
        }} />
      </div>
    );
  };

  return (
    <section style={{
      minHeight: isMobile ? 'calc(100vh - 80px)' : '86vh',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: isMobile ? '12px 0 24px' : '40px 0 60px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 26, maxWidth: isMobile ? '100%' : 900 }}>
        {renderLine(LINES[0], counts[0], activeLine === 0)}

        <FadeSlide show={showAfter}>
          <UserInput theme={theme} isMobile={isMobile}
            prefilled="ayy, i tried to order fūl at breakfast…"
            onSubmit={onSubmit}
            onMicClick={onMicClick}
            disabled={inputDisabled} />
        </FadeSlide>

        <FadeSlide show={showAfter} delay={200}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            fontSize: 13, color: theme.sub, marginTop: isMobile ? 4 : 8,
          }}>
            <span>Or jump to</span>
            {[
              { l: 'Role-play: at the souk', ar: 'السوق' },
              { l: 'Review 8 words', ar: null },
              { l: 'Story · 2 min', ar: null },
            ].map((x) => (
              <button key={x.l} style={{
                background: theme.surface, border: `1px solid ${theme.border}`,
                borderRadius: 999, padding: '6px 12px', fontSize: 13, color: theme.ink,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {x.l}
                {x.ar && <span style={{ fontFamily: 'Noto Sans Arabic, serif', direction: 'rtl', color: theme.tint }}>{x.ar}</span>}
              </button>
            ))}
          </div>
        </FadeSlide>
      </div>
    </section>
  );
}

export function TopBar({ theme, isMobile, isReturning }: { theme: Theme; isMobile: boolean; isReturning: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '58px 20px 10px' : '28px 64px 14px',
      position: 'sticky', top: 0, zIndex: 30,
      background: `${theme.bg}e6`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <ApricotMark size={26} />
        <span style={{
          fontFamily: FONT_STACK, fontSize: 20, fontWeight: 700,
          color: theme.ink, letterSpacing: '-0.02em',
        }}>mishmish</span>
      </div>
      <button style={{
        background: 'transparent', color: theme.sub, border: `1px solid ${theme.border}`,
        borderRadius: 999, fontSize: 13, cursor: 'pointer',
        padding: '7px 14px 7px 11px', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 7,
      }}>
        {isReturning ? <Icon.settings width={14} height={14} /> : <Icon.user width={14} height={14} />}
        {isReturning ? 'Settings' : 'Sign in'}
      </button>
    </div>
  );
}

export function QuietFooter({ theme, isMobile }: { theme: Theme; isMobile: boolean }) {
  return (
    <div style={{
      marginTop: isMobile ? 32 : 60, paddingTop: 28,
      borderTop: `1px solid ${theme.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
      color: theme.sub, fontSize: 12.5,
    }}>
      <div>© mishmish · an Arabic tutor that lets you ramble</div>
      <div style={{ display: 'flex', gap: 18 }}>
        {['Egyptian', 'MSA', 'Iraqi'].map((d) => (<span key={d}>{d}</span>))}
      </div>
    </div>
  );
}

export type LandingProps = {
  userState?: UserState;
  color?: ThemeKey;
};

export function Landing({ userState = 'new', color = 'apricot' }: LandingProps) {
  const theme = THEMES[color];
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const isReturning = userState === 'returning';

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadSessions = useStore((s) => s.session.loadSessions);
  const sendMessage = useStore((s) => s.session.sendMessage);
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const messages = useStore((s) => s.session.messages);
  const setMessages = useStore((s) => s.session.setMessages);
  const addMessage = useStore((s) => s.session.addMessage);
  const responseMode = useStore((s) => s.session.context.response_mode);
  const supabase = useSupabase();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useTranscriptMessages();

  const refetchMessages = useCallback(async () => {
    if (!activeSessionId) return;
    const { data, error } = await supabase
      .from('transcript_messages')
      .select('*')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as TranscriptMessage[]);
  }, [supabase, activeSessionId, setMessages]);

  const handleSubmit = useCallback(async (msg: string) => {
    if (!activeSessionId) return;
    // Optimistic add so the user sees their message immediately
    const optimisticId = `optimistic-${Date.now()}`;
    addMessage({
      message_id: optimisticId,
      session_id: activeSessionId,
      user_id: '',
      message_source: 'user',
      message_kind: 'text',
      message_text: msg,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    try {
      await sendMessage(msg);
    } catch (err) {
      console.error('sendMessage failed', err);
    }
    // Refetch to reconcile optimistic message + pull in tutor reply (realtime can be flaky in dev)
    await refetchMessages();
  }, [activeSessionId, addMessage, sendMessage, refetchMessages]);

  const handleMicClick = useCallback(() => {
    window.location.href = '/';
  }, []);

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
      <TopBar theme={theme} isMobile={isMobile} isReturning={isReturning} />
      <div style={{
        maxWidth: containerMax, margin: '0 auto',
        padding: `0 ${gutter}px`, paddingBottom: 28,
      }}>
        {isReturning
          ? <ReturningHero theme={theme} isMobile={isMobile}
              onSubmit={handleSubmit} onMicClick={handleMicClick}
              inputDisabled={!activeSessionId} />
          : <NewUserHero theme={theme} isMobile={isMobile}
              messages={messages} responseMode={responseMode}
              onSubmit={handleSubmit} onMicClick={handleMicClick}
              inputDisabled={!activeSessionId} />}
        <QuietFooter theme={theme} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default Landing;
