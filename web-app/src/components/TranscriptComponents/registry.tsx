/**
 * Registry for `message_kind='component'` transcript messages.
 *
 * Each such message carries a JSON payload in `message_text`:
 *   { component_name: string, props: object }
 *
 * The registry maps `component_name` to a React renderer. A generic per-caller
 * `ctx` object is threaded through so callers can pass page-specific context
 * (theme, viewport, click handlers) without coupling the registry to any one
 * consumer.
 */
import type { ReactElement } from 'react';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';
import {
  LessonTiles,
  type LessonTilesContext,
  type LessonTilesProps,
} from './LessonTiles';
import {
  LessonProposalTiles,
  type LessonProposalTilesContext,
  type LessonProposalTilesProps,
} from './LessonProposalTiles';

export type ComponentMessagePayload = {
  component_name: string;
  props: unknown;
};

export function parseComponentMessage(
  m: TranscriptMessage,
): ComponentMessagePayload | null {
  if (m.message_kind !== 'component') return null;
  try {
    const parsed = JSON.parse(m.message_text) as ComponentMessagePayload;
    if (typeof parsed?.component_name !== 'string') return null;
    return parsed;
  } catch {
    console.warn('[TranscriptComponent] failed to parse', m.message_id);
    return null;
  }
}

/** Context shapes indexed by component_name. Extend as new components land. */
export type ComponentContextMap = {
  LessonTiles: LessonTilesContext;
  LessonProposalTiles: LessonProposalTilesContext;
};

export function renderTranscriptComponent<K extends keyof ComponentContextMap>(
  message: TranscriptMessage,
  ctxMap: Partial<ComponentContextMap>,
): ReactElement | null {
  const payload = parseComponentMessage(message);
  if (!payload) return null;

  switch (payload.component_name as K) {
    case 'LessonTiles':
      if (!ctxMap.LessonTiles) return null;
      return (
        <LessonTiles
          props={payload.props as LessonTilesProps}
          ctx={ctxMap.LessonTiles}
        />
      );
    case 'LessonProposalTiles':
      if (!ctxMap.LessonProposalTiles) return null;
      return (
        <LessonProposalTiles
          props={payload.props as LessonProposalTilesProps}
          ctx={ctxMap.LessonProposalTiles}
        />
      );
    default:
      console.warn(
        `[TranscriptComponent] no renderer for '${payload.component_name}'`,
      );
      return null;
  }
}
