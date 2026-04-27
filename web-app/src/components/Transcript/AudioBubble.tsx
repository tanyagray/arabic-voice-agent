import { useRef, useState } from 'react';
import { Flex, IconButton, Text } from '@chakra-ui/react';
import { BsPlayFill, BsPauseFill } from 'react-icons/bs';

interface AudioBubbleProps {
  audioUrl: string;
  /** The text label shown alongside the play button. */
  label?: string;
  /** Text direction for the label ('rtl' for Arabic script). */
  dir?: 'rtl' | 'ltr';
  /** Set false when rendered on a light background. Defaults to true (dark background). */
  isDark?: boolean;
}

export function AudioBubble({ audioUrl, label, dir, isDark = true }: AudioBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('[AudioBubble] playback failed:', err);
      }
    }
  };

  const fg = isDark ? 'white' : 'gray.800';
  const fgMuted = isDark ? 'white/70' : 'gray.500';
  const buttonBg = isDark ? 'white/20' : 'blackAlpha.100';
  const buttonHoverBg = isDark ? 'white/30' : 'blackAlpha.200';

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
        bg={buttonBg}
        color={fg}
        _hover={{ bg: buttonHoverBg }}
        variant="ghost"
      >
        {isPlaying ? <BsPauseFill /> : <BsPlayFill />}
      </IconButton>
      {label && (
        <Text fontSize="sm" color={fgMuted} dir={dir}>
          {label}
        </Text>
      )}
    </Flex>
  );
}
