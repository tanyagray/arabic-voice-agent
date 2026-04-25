import type { Theme } from '@/pages/Landing';

export type LessonTile = {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  title: string;
  blurb: string;
  arabic?: string | null;
};

export type LessonTilesProps = {
  intro: string;
  tiles: LessonTile[];
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
  const valid = Array.isArray(props.tiles) && props.tiles.length === 3;
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
        {props.tiles.map((tile) => (
          <button
            key={tile.level + tile.title}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.tintDeep,
                  background: theme.tintSoft,
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {tile.level}
              </span>
              {tile.arabic && (
                <span
                  style={{
                    fontFamily: 'Noto Sans Arabic, serif',
                    direction: 'rtl',
                    fontSize: 18,
                    color: theme.tint,
                  }}
                >
                  {tile.arabic}
                </span>
              )}
            </div>
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
              {tile.blurb}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
