import { useState, useEffect } from 'react';
import { useSessionContext } from '../context/SessionContext';
import type { AgentState } from '../types/chat';

export function useAgentState(): AgentState {
  const { messages, connectionState } = useSessionContext();
  const [state, setState] = useState<AgentState>('idle');

  useEffect(() => {
    if (connectionState !== 'connected') {
      setState('idle');
      return;
    }

    // Determine state based on message history
    if (messages.length === 0) {
      setState('idle');
      return;
    }

    const lastMessage = messages[messages.length - 1];

    // If last message is from user, agent is thinking
    if (lastMessage.type === 'user') {
      setState('thinking');
    } else {
      // If last message is from agent, we're idle (ready for next input)
      setState('idle');
    }
  }, [messages, connectionState]);

  return state;
}
