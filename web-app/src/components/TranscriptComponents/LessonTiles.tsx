import type { Theme } from '@/pages/Landing';

export type LessonTile = {
  title: string;
  objective: string;
};

export type LessonTilesProps = {
  lessons: LessonTile[];
};

export type LessonTilesContext = {
  theme: Theme;
  isMobile: boolean;
  visible: boolean;
  onPick: (tile: LessonTile) => void;
};

export function LessonTiles({
  props,
  ctx: { theme, isMobile, visible, onPick },
}: {
  props: LessonTilesProps;
  ctx: LessonTilesContext;
}) {
  const valid = Array.isArray(props.lessons) && props.lessons.length > 0;
  if (!valid) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 12 : 16,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition:
          'opacity 500ms cubic-bezier(.2,.7,.3,1), transform 500ms cubic-bezier(.2,.7,.3,1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 12 : 16,
        }}
      >
        {props.lessons.map((tile) => (
          <button
            key={tile.title}
            onClick={() => onPick(tile)}
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
              transition:
                'transform 200ms, box-shadow 200ms, border-color 200ms',
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
            <div
              style={{
                fontSize: isMobile ? 17 : 19,
                fontWeight: 700,
                color: theme.ink,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              {tile.title}
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: theme.sub,
                lineHeight: 1.45,
              }}
            >
              {tile.objective}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
