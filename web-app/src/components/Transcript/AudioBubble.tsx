import { useRef, useState } from 'react';
import { Flex, IconButton, Text } from '@chakra-ui/react';
import { BsPlayFill, BsPauseFill } from 'react-icons/bs';

interface AudioBubbleProps {
  audioUrl: string;
  /** The text label shown alongside the play button. */
  label?: string;
  /** Text direction for the label ('rtl' for Arabic script). */
  dir?: 'rtl' | 'ltr';
}

export function AudioBubble({ audioUrl, label, dir }: AudioBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <Flex align="center" gap={3}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />
      <IconButton
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={togglePlay}
        rounded="full"
        size="sm"
        bg="white/20"
        color="white"
        _hover={{ bg: 'white/30' }}
        variant="ghost"
      >
        {isPlaying ? <BsPauseFill /> : <BsPlayFill />}
      </IconButton>
      {label && (
        <Text fontSize="sm" color="white/70" dir={dir}>
          {label}
        </Text>
      )}
    </Flex>
  );
}
