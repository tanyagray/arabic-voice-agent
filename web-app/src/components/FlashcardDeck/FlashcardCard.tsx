import { useCallback, useRef } from 'react';
import { Box, Flex, Text, IconButton, Spinner } from '@chakra-ui/react';
import { BsVolumeUp } from 'react-icons/bs';
import type { Flashcard } from '@/api/flashcards/flashcards.types';
import type { ResponseMode } from '@/api/sessions/sessions.types';

interface FlashcardCardProps {
  card: Flashcard;
  responseMode: ResponseMode;
}

export function FlashcardCard({ card, responseMode }: FlashcardCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const displayText =
    responseMode === 'transliterated'
      ? card.transliteration
      : card.arabic_text;

  const isRtl = responseMode !== 'transliterated';

  const handlePlayAudio = useCallback(() => {
    if (!card.audio_url) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(card.audio_url);
    audioRef.current = audio;
    audio.play().catch((err) => console.error('Audio playback failed:', err));
  }, [card.audio_url]);

  const isGenerating = card.status !== 'complete' && card.status !== 'failed';

  return (
    <Flex
      direction="column"
      align="center"
      bg="white/10"
      rounded="xl"
      overflow="hidden"
      w="full"
      maxW="320px"
      mx="auto"
      flexShrink={0}
    >
      {/* Image area */}
      <Box w="full" aspectRatio="1" bg="white/5" position="relative">
        {card.image_url ? (
          <Box
            as="img"
            src={card.image_url}
            alt={card.english}
            w="full"
            h="full"
            objectFit="cover"
          />
        ) : (
          <Flex w="full" h="full" align="center" justify="center">
            {isGenerating ? (
              <Spinner size="lg" color="white/40" />
            ) : (
              <Text color="white/30" fontSize="sm">
                No image
              </Text>
            )}
          </Flex>
        )}
      </Box>

      {/* Text + audio */}
      <Flex
        direction="column"
        align="center"
        gap={2}
        px={4}
        py={4}
        w="full"
      >
        <Text
          fontSize="2xl"
          fontWeight="bold"
          color="white"
          dir={isRtl ? 'rtl' : undefined}
          textAlign="center"
          lineHeight="tall"
        >
          {displayText}
        </Text>

        {card.audio_url && (
          <IconButton
            aria-label="Play pronunciation"
            onClick={handlePlayAudio}
            variant="ghost"
            color="white/60"
            _hover={{ color: 'white', bg: 'white/10' }}
            rounded="full"
            size="sm"
          >
            <BsVolumeUp />
          </IconButton>
        )}
      </Flex>
    </Flex>
  );
}
