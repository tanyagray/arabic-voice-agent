import { useRef } from 'react';
import { PipecatClient } from '@pipecat-ai/client-js';
import {
  PipecatClientProvider,
  PipecatClientAudio,
} from '@pipecat-ai/client-react';
import {
  WebSocketTransport,
  ProtobufFrameSerializer,
} from '@pipecat-ai/websocket-transport';

export function PipecatProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<PipecatClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new PipecatClient({
      transport: new WebSocketTransport({
        serializer: new ProtobufFrameSerializer(),
      }),
      enableMic: false,
      enableCam: false,
    });
  }

  return (
    <PipecatClientProvider client={clientRef.current}>
      <PipecatClientAudio />
      {children}
    </PipecatClientProvider>
  );
}
