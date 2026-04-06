import { useState, useCallback } from 'react';
import { motion, type PanInfo } from 'motion/react';
import { Box, Flex, Text, IconButton, Spinner, Image } from '@chakra-ui/react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';
import { useFlashcardSet } from '@/hooks/useFlashcardSet';
import { useStore } from '@/store';
import { FlashcardCard } from './FlashcardCard';

const MotionBox = motion.create(Box);

interface FlashcardDeckProps {
  message: TranscriptMessage;
}

const SWIPE_THRESHOLD = 50;

export function FlashcardDeck({ message }: FlashcardDeckProps) {
  const responseMode = useStore((s) => s.session.context.response_mode);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Parse the set_id from message_text JSON
  let setId: string | undefined;
  let title = '';
  try {
    const parsed = JSON.parse(message.message_text);
    setId = parsed.set_id;
    title = parsed.title;
  } catch {
    // fallback
  }

  const { set, loading, error } = useFlashcardSet(setId);

  const completedCards = set?.cards.filter((c) => c.status === 'complete') ?? [];
  const totalCards = set?.cards.length ?? 0;
  const hasCover = !!set?.cover_image_url;
  // Total slides = cover (if present) + completed cards
  const totalSlides = (hasCover ? 1 : 0) + completedCards.length;

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD) {
        goNext();
      } else if (info.offset.x > SWIPE_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  // Loading / error states
  if (loading) {
    return (
      <Flex align="center" gap={2} py={3} px={4}>
        <Spinner size="sm" color="white/50" />
        <Text color="white/60" fontSize="sm">
          Loading flashcards...
        </Text>
      </Flex>
    );
  }

  if (error || !set) {
    return (
      <Text color="white/40" fontSize="sm" py={2} px={4}>
        Failed to load flashcards.
      </Text>
    );
  }

  // Generating state
  if (set.status !== 'complete' && set.status !== 'failed') {
    return (
      <Flex direction="column" align="center" gap={3} py={4} px={4}>
        <Text color="white" fontSize="md" fontWeight="medium">
          {title}
        </Text>
        <Flex align="center" gap={2}>
          <Spinner size="sm" color="accent.400" />
          <Text color="white/60" fontSize="sm">
            Generating cards... {completedCards.length}/{totalCards}
          </Text>
        </Flex>
        {/* Show the first completed card as preview */}
        {completedCards.length > 0 && (
          <FlashcardCard card={completedCards[0]} responseMode={responseMode} />
        )}
      </Flex>
    );
  }

  if (completedCards.length === 0 && !hasCover) {
    return (
      <Text color="white/40" fontSize="sm" py={2} px={4}>
        No flashcards were generated.
      </Text>
    );
  }

  // Clamp index
  const safeIndex = Math.min(currentIndex, totalSlides - 1);
  // Whether we're showing the cover card
  const showingCover = hasCover && safeIndex === 0;
  // Index into completedCards (offset by 1 when cover exists)
  const cardIndex = hasCover ? safeIndex - 1 : safeIndex;

  return (
    <Flex direction="column" align="center" gap={3} py={2} w="full">
      {/* Card carousel */}
      <MotionBox
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        w="full"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
      >
        {showingCover ? (
          /* Cover card */
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
            <Box w="full" aspectRatio="1" bg="white/5" position="relative">
              <Image
                src={set!.cover_image_url!}
                alt={title}
                w="full"
                h="full"
                objectFit="cover"
              />
            </Box>
            <Flex
              direction="column"
              align="center"
              gap={1}
              px={4}
              py={4}
              w="full"
            >
              <Text
                fontSize="xl"
                fontWeight="bold"
                color="white"
                textAlign="center"
              >
                {title}
              </Text>
              <Text color="white/50" fontSize="sm">
                {completedCards.length} cards
              </Text>
            </Flex>
          </Flex>
        ) : (
          <FlashcardCard
            card={completedCards[cardIndex]}
            responseMode={responseMode}
          />
        )}
      </MotionBox>

      {/* Navigation */}
      <Flex align="center" gap={3}>
        <IconButton
          aria-label="Previous card"
          onClick={goPrev}
          disabled={safeIndex === 0}
          variant="ghost"
          color="white/60"
          _hover={{ color: 'white' }}
          _disabled={{ opacity: 0.2, cursor: 'not-allowed' }}
          rounded="full"
          size="sm"
        >
          <BsChevronLeft />
        </IconButton>

        {/* Dot indicators */}
        <Flex gap={1} align="center">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <Box
              key={i}
              w={i === safeIndex ? '8px' : '6px'}
              h={i === safeIndex ? '8px' : '6px'}
              rounded="full"
              bg={i === safeIndex ? 'accent.400' : 'white/30'}
              transition="all 0.2s"
            />
          ))}
        </Flex>

        <IconButton
          aria-label="Next card"
          onClick={goNext}
          disabled={safeIndex === totalSlides - 1}
          variant="ghost"
          color="white/60"
          _hover={{ color: 'white' }}
          _disabled={{ opacity: 0.2, cursor: 'not-allowed' }}
          rounded="full"
          size="sm"
        >
          <BsChevronRight />
        </IconButton>
      </Flex>

      {/* Card counter */}
      <Text color="white/40" fontSize="xs">
        {showingCover ? 'Cover' : `${cardIndex + 1} / ${completedCards.length}`}
      </Text>
    </Flex>
  );
}
