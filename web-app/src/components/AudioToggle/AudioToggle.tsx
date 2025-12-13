import { useStore } from '../../store';
import { BsVolumeUp, BsVolumeMute } from 'react-icons/bs';
import { IconButton } from '@chakra-ui/react';

export function AudioToggle() {
  const audioEnabled = useStore((state) => state.session.context.audio_enabled);
  const setAudioEnabled = useStore((state) => state.session.setAudioEnabled);

  const handleToggle = () => {
    setAudioEnabled(!audioEnabled);
  };

  return (
    <IconButton
      onClick={handleToggle}
      aria-label={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
      rounded="full"
      size="xl"
      shadow="lg"
      transition="all 0.2s"
      bg={audioEnabled ? 'accent.500' : 'white/10'}
      color="white"
      _hover={{
        shadow: "xl",
        transform: "scale(1.05)",
        bg: audioEnabled ? 'accent.600' : 'white/20'
      }}
    >
      {audioEnabled ? (
        <BsVolumeUp size="1.25em" />
      ) : (
        <BsVolumeMute size="1.25em" />
      )}
    </IconButton>
  );
}
