/**
 * Realtime-driven tile picker for a lesson proposal group.
 *
 * Unlike the onboarding `LessonTiles` (which is props-driven and level-based),
 * this component subscribes to a `proposal_group_id` and renders one tile per
 * `lessons` row in the group. As the chosen tile transitions through
 * `proposed -> generating -> ready`, the rendering reflects the live state.
 */

import { useMemo } from 'react';
import {
  useLessonProposalGroup,
  type LessonRow,
} from '@/hooks/useLessonProposalGroup';

export type LessonProposalTilesProps = {
  proposal_group_id: string;
  intro?: string;
};

export type LessonProposalTilesContext = {
  onPick: (lesson: LessonRow) => void;
};

export function LessonProposalTiles({
  props,
  ctx: { onPick },
}: {
  props: LessonProposalTilesProps;
  ctx: LessonProposalTilesContext;
}) {
  const { lessons, loading, error } = useLessonProposalGroup(
    props.proposal_group_id,
  );

  // Show only the proposals + the chosen one (whatever its status). Hide
  // dismissed siblings — they make the row jitter when it collapses.
  const visibleTiles = useMemo(
    () =>
      lessons.filter(
        (l) => l.status !== 'dismissed' && l.status !== 'archived',
      ),
    [lessons],
  );

  const isAnyGenerating = visibleTiles.some(
    (l) => l.status === 'generating',
  );

  if (loading || (visibleTiles.length === 0 && !error)) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 680,
        marginInline: 'auto',
        padding: '0 16px',
      }}
    >
      {error && (
        <div style={{ color: '#fca5a5', fontSize: 13 }}>
          Couldn't load lesson tiles: {error}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          gap: 12,
        }}
      >
        {visibleTiles.map((lesson) => {
          const isPicked =
            lesson.status === 'generating' ||
            lesson.status === 'ready' ||
            lesson.status === 'in_progress' ||
            lesson.status === 'completed';
          const isFailed = lesson.status === 'failed';
          const dimmed = isAnyGenerating && !isPicked;
          const disabled = dimmed || isPicked || isFailed;

          return (
            <button
              key={lesson.id}
              onClick={() => !disabled && onPick(lesson)}
              disabled={disabled}
              style={{
                textAlign: 'left',
                padding: '16px 18px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${isPicked ? 'rgba(255,255,255,0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: 16,
                cursor: disabled ? 'default' : 'pointer',
                fontFamily: 'inherit',
                color: 'white',
                opacity: dimmed ? 0.4 : 1,
                transition:
                  'opacity 200ms, border-color 200ms, transform 200ms',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.45)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled) {
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                {lesson.title}
              </div>
              <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.4 }}>
                {lesson.objective}
              </div>
              {lesson.status === 'generating' && (
                <div style={{ fontSize: 11, opacity: 0.7 }}>Preparing…</div>
              )}
              {lesson.status === 'ready' ||
              lesson.status === 'in_progress' ||
              lesson.status === 'completed' ? (
                <div style={{ fontSize: 11, opacity: 0.7 }}>Ready</div>
              ) : null}
              {isFailed && (
                <div style={{ fontSize: 11, color: '#fca5a5' }}>
                  Couldn't prepare this one.
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
