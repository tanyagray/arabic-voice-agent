import { useState, useCallback } from 'react';
import {
  usePipecatClientTransportState,
  useRTVIClientEvent,
} from '@pipecat-ai/client-react';
import { RTVIEvent } from '@pipecat-ai/client-js';
import type { AgentState } from '../types/chat';

export function useAgentState(): AgentState {
  const transportState = usePipecatClientTransportState();
  const [state, setState] = useState<AgentState>('idle');

  useRTVIClientEvent(
    RTVIEvent.BotStartedSpeaking,
    useCallback(() => setState('speaking'), [])
  );

  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => setState('idle'), [])
  );

  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => setState('thinking'), [])
  );

  if (transportState !== 'ready') {
    return 'idle';
  }

  return state;
}
