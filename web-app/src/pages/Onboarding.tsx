import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FONT_STACK,
  QuietFooter,
  THEMES,
  TopBar,
  UserInput,
  type ThemeKey,
} from './Landing';

export type OnboardingProps = {
  color?: ThemeKey;
};

type Step = 'name' | 'motivation' | 'suggestions';

type SuggestionTile = {
  level: string;
  title: string;
  blurb: string;
  arabic?: string;
};

const SUGGESTION_TILES: SuggestionTile[] = [
  {
    level: 'Beginner',
    title: 'Your first 10 words',
    blurb: 'Greetings, ordering coffee, saying your name — enough to feel brave.',
    arabic: 'مرحبا',
  },
  {
    level: 'Intermediate',
    title: 'Café in Cairo',
    blurb: 'Role-play ordering, small talk, asking for the bill — realistic and fun.',
    arabic: 'قهوة',
  },
  {
    level: 'Advanced',
    title: 'Today\u2019s headlines',
    blurb: 'Unpack a news story together — vocabulary for current affairs and opinion.',
    arabic: 'أخبار',
  },
];

type TextSegment = { text: string; color: string };
type Line = TextSegment[];

const CPS = 32;
const LINE_GAP = 800;
const FADE_MS = 350;
const segCharCount = (l: Line) => l.reduce((n, s) => n + [...s.text].length, 0);

function TypingHero({ lines, isMobile, theme, runKey }: {
  lines: Line[]; isMobile: boolean; theme: { tint: string; ink: string };
  runKey: string | number;
}) {
  const [counts, setCounts] = useState<number[]>(() => lines.map(() => 0));
  const [activeLine, setActiveLine] = useState(-1);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setCounts(lines.map(() => 0));
    setActiveLine(-1);

    const startAt = performance.now() + 150;
    const lineDur = lines.map((l) => (segCharCount(l) / CPS) * 1000);
    const lineStart: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      lineStart[i] = i === 0 ? startAt : lineStart[i - 1] + lineDur[i - 1] + LINE_GAP;
    }

    const tick = (now: number) => {
      const next = lines.map((l, i) => {
        const t = now - lineStart[i];
        if (t <= 0) return 0;
        return Math.min(segCharCount(l), Math.floor((t / 1000) * CPS));
      });
      setCounts(next);

      let active = -1;
      for (let i = 0; i < lines.length; i++) if (now >= lineStart[i]) active = i;
      setActiveLine(active);

      const lastEnd = lineStart[lines.length - 1] + lineDur[lines.length - 1];
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
  }, [runKey]);

  const bigSize = isMobile ? 56 : 104;
  const lineSize = isMobile ? 28 : 44;

  const renderLine = (segs: Line, count: number, style: CSSProperties, showCursor: boolean, cursorHeight: number) => {
    const chars = segs.flatMap((s) => [...s.text].map((ch) => ({ ch, color: s.color })));
    const visible = chars.slice(0, count);
    return (
      <div style={style}>
        {visible.map((c, i) => (<span key={i} style={{ color: c.color }}>{c.ch}</span>))}
        <span style={{
          display: 'inline-block', width: 2, height: cursorHeight,
          background: theme.tint, marginLeft: 3, verticalAlign: '-0.12em',
          opacity: showCursor ? 1 : 0,
          animation: showCursor ? 'mmLandingBlink 1s steps(2) infinite' : 'none',
        }} />
      </div>
    );
  };

  // First line gets "big" treatment only if it's the only huge headline (name step).
  // For a multi-line layout, first line is big if lines.length >= 3 and first line is short;
  // otherwise all lines use lineSize. Caller controls this via the passed lines.
  const firstIsBig = lines.length >= 3 && segCharCount(lines[0]) <= 20;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 22 }}>
      {lines.map((l, i) => {
        const isBig = firstIsBig && i === 0;
        const size = isBig ? bigSize : lineSize;
        const weight = isBig ? 700 : 600;
        const letterSpacing = isBig ? '-0.035em' : '-0.02em';
        const lineHeight = isBig ? 1 : 1.2;
        return renderLine(l, counts[i] ?? 0, {
          fontFamily: FONT_STACK,
          fontSize: size, fontWeight: weight,
          letterSpacing, lineHeight,
          minHeight: isBig ? size : size * 1.2,
        }, activeLine === i, isBig ? size * 0.82 : size * 0.95);
      })}
    </div>
  );
}

export function Onboarding({ color = 'apricot' }: OnboardingProps) {
  const theme = THEMES[color];
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Resolve current step from path. /onboarding → treat as /name.
  const step: Step = location.pathname.endsWith('/motivation')
    ? 'motivation'
    : location.pathname.endsWith('/suggestions')
      ? 'suggestions'
      : 'name';

  // Redirect bare /onboarding to /onboarding/name
  useEffect(() => {
    if (location.pathname === '/onboarding' || location.pathname === '/onboarding/') {
      navigate('/onboarding/name', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Name persists across steps. In future this will come from the LLM extracting
  // the name from the user's free-text reply.
  const [name, setName] = useState<string>(() => sessionStorage.getItem('mishmish:onboarding:name') || '');

  // Fade-transition the hero lines when the step changes.
  const [displayStep, setDisplayStep] = useState<Step>(step);
  const [linesVisible, setLinesVisible] = useState(true);

  useEffect(() => {
    if (displayStep === step) return;
    setLinesVisible(false);
    const t = setTimeout(() => {
      setDisplayStep(step);
      setLinesVisible(true);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [step, displayStep]);

  // Suggestion tiles reveal after the typing animation finishes on the suggestions step.
  const [tilesVisible, setTilesVisible] = useState(false);
  useEffect(() => {
    if (displayStep !== 'suggestions') {
      setTilesVisible(false);
      return;
    }
    const t = setTimeout(() => setTilesVisible(true), 2400);
    return () => clearTimeout(t);
  }, [displayStep]);

  const lines: Line[] = useMemo(() => {
    if (displayStep === 'motivation') {
      const greetName = name || 'friend';
      return [
        [
          { text: 'ahlan', color: theme.tint },
          { text: ` ya ${greetName}!`, color: theme.ink },
        ],
        [
          { text: 'tell me, why are you curious to learn ', color: theme.ink },
          { text: 'arabii', color: theme.tint },
          { text: '?', color: theme.ink },
        ],
      ];
    }
    if (displayStep === 'suggestions') {
      return [
        [
          { text: 'mumtaz', color: theme.tint },
          { text: "! that's a great reason to learn!", color: theme.ink },
        ],
        [{ text: 'where shall we begin?', color: theme.ink }],
      ];
    }
    // name step (default)
    return [
      [{ text: 'marhaban!', color: theme.tint }],
      [
        { text: "i'm ", color: theme.ink },
        { text: 'mishmish', color: theme.tint },
        { text: ', which means apricot \uD83D\uDE0A', color: theme.ink },
      ],
      [{ text: 'what is your name?', color: theme.ink }],
    ];
  }, [displayStep, name, theme.tint, theme.ink]);

  const handleSubmit = useCallback((msg: string) => {
    const trimmed = msg.trim();
    if (step === 'name') {
      // Naive client-side extraction for now — real extraction will happen on the backend.
      // Take the last "word" that looks like a name; fall back to the whole message.
      const guessed = trimmed.split(/\s+/).pop() || trimmed;
      setName(guessed);
      sessionStorage.setItem('mishmish:onboarding:name', guessed);
      navigate('/onboarding/motivation');
    } else if (step === 'motivation') {
      sessionStorage.setItem('mishmish:onboarding:motivation', trimmed);
      navigate('/onboarding/suggestions');
    } else {
      // suggestions — free-text entry falls through to the main app.
      sessionStorage.setItem('mishmish:onboarding:freeText', trimmed);
      navigate('/');
    }
  }, [step, navigate]);

  const handleSuggestionPick = useCallback((tile: SuggestionTile) => {
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
            {/* Hero lines — fade out/in on step change */}
            <div
              style={{
                opacity: linesVisible ? 1 : 0,
                transition: `opacity ${FADE_MS}ms cubic-bezier(.2,.7,.3,1)`,
              }}
            >
              <TypingHero lines={lines} isMobile={isMobile} theme={theme} runKey={displayStep} />
            </div>

            {/* Suggestion tiles — only on the suggestions step, fade/slide in after the lines type */}
            {displayStep === 'suggestions' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 12 : 16,
                  opacity: tilesVisible ? 1 : 0,
                  transform: tilesVisible ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity 500ms cubic-bezier(.2,.7,.3,1), transform 500ms cubic-bezier(.2,.7,.3,1)',
                  pointerEvents: tilesVisible ? 'auto' : 'none',
                }}
              >
                {SUGGESTION_TILES.map((tile) => (
                  <button
                    key={tile.level}
                    onClick={() => handleSuggestionPick(tile)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      padding: isMobile ? '16px 18px' : '20px 22px',
                      background: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 18,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      transition: 'transform 200ms, box-shadow 200ms, border-color 200ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.tint;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 16px 32px -20px ${theme.tint}88`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: theme.tintDeep,
                        background: theme.tintSoft,
                        padding: '3px 8px', borderRadius: 999,
                      }}>{tile.level}</span>
                      {tile.arabic && (
                        <span style={{
                          fontFamily: 'Noto Sans Arabic, serif', direction: 'rtl',
                          fontSize: 18, color: theme.tint,
                        }}>{tile.arabic}</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: isMobile ? 17 : 19,
                      fontWeight: 700,
                      color: theme.ink,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                    }}>{tile.title}</div>
                    <div style={{
                      fontSize: 13.5,
                      color: theme.sub,
                      lineHeight: 1.45,
                    }}>{tile.blurb}</div>
                  </button>
                ))}
              </div>
            )}

            {/* User input persists across steps (no key change → no remount) */}
            <UserInput
              theme={theme}
              isMobile={isMobile}
              onSubmit={handleSubmit}
              onMicClick={handleMicClick}
            />
          </div>
        </section>
        <QuietFooter theme={theme} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default Onboarding;
