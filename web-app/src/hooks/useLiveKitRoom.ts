import { useState, useCallback } from 'react';
import { useVoiceAssistant, useLocalParticipant } from '@livekit/components-react';

interface UseLiveKitRoomReturn {
  state: string;
  audioTrack: any;
  isMicMuted: boolean;
  toggleMicrophone: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
}

export function useLiveKitRoom(): UseLiveKitRoomReturn {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [isMicMuted, setIsMicMuted] = useState(false);

  const toggleMicrophone = useCallback(async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      setIsMicMuted(enabled);
    }
  }, [localParticipant]);

  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(enabled);
      setIsMicMuted(!enabled);
    }
  }, [localParticipant]);

  return {
    state,
    audioTrack,
    isMicMuted,
    toggleMicrophone,
    setMicrophoneEnabled,
  };
}
