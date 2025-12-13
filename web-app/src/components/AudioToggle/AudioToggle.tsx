import { useSession } from '../../hooks/useSession';
import { BsVolumeUp, BsVolumeMute } from 'react-icons/bs';
import { IconButton } from '@chakra-ui/react';

export function AudioToggle() {
  const { audioEnabled, isUpdatingContext, toggleAudioEnabled } = useSession();

  const handleToggle = async () => {
    await toggleAudioEnabled();
  };

  return (
    <IconButton
      onClick={handleToggle}
      disabled={isUpdatingContext}
      aria-label={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
      rounded="full"
      size="xl"
      shadow="lg"
      transition="all 0.2s"
      _disabled={{ opacity: 0.5, cursor: "not-allowed", transform: "none" }}
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
