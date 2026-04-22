import { useEffect, useState } from 'react';
import {
  usePipecatClient,
  usePipecatClientTransportState,
} from '@pipecat-ai/client-react';
import { PipecatProvider } from '@/providers/PipecatProvider';
import { CallView } from '@/components/CallView/CallView';
import { useSupabase } from '@/context/SupabaseContext';
import { AppSettings } from '@/lib/app-settings';

interface VoiceCallProps {
  sessionId: string;
  onEndCall: () => void;
}

function VoiceCallInner({ sessionId, onEndCall }: VoiceCallProps) {
  const supabase = useSupabase();
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const isVoiceConnecting =
    transportState === 'connecting' || transportState === 'initializing';
  const isVoiceConnected = transportState === 'ready';

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    const connect = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.access_token) {
          setVoiceError('Authentication required');
          return;
        }

        const wsUrl = AppSettings.apiUrl.replace(/^http/, 'ws');
        await client.connect({
          wsUrl: `${wsUrl}/pipecat/session/${sessionId}?token=${encodeURIComponent(session.access_token)}`,
        });
      } catch (err) {
        if (!cancelled) {
          setVoiceError(
            err instanceof Error ? err.message : 'Failed to connect voice'
          );
        }
      }
    };

    connect();
    return () => {
      cancelled = true;
    };
  }, [client, supabase, sessionId]);

  const handleEndCall = async () => {
    if (client && (isVoiceConnected || isVoiceConnecting)) {
      try {
        await client.disconnect();
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
    onEndCall();
  };

  return (
    <CallView
      sessionId={sessionId}
      isConnecting={isVoiceConnecting}
      isConnected={isVoiceConnected}
      error={voiceError}
      onEndCall={handleEndCall}
    />
  );
}

export default function VoiceCall(props: VoiceCallProps) {
  return (
    <PipecatProvider>
      <VoiceCallInner {...props} />
    </PipecatProvider>
  );
}
