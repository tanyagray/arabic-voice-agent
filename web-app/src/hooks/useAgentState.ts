import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { AgentState } from '../types/chat';

export function useAgentState(): AgentState {
  const messages = useStore((state) => state.session.messages);
  const socketStatus = useStore((state) => state.socket.status);
  const [state, setState] = useState<AgentState>('idle');

  useEffect(() => {
    if (socketStatus !== 'connected') {
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
    if (lastMessage.message_source === 'user') {
      setState('thinking');
    } else {
      // If last message is from agent, we're idle (ready for next input)
      setState('idle');
    }
  }, [messages, socketStatus]);

  return state;
}
