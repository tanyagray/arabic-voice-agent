import { useState, useCallback } from 'react';
import { motion, type PanInfo } from 'motion/react';
import { Box, Flex, Text, IconButton, Spinner } from '@chakra-ui/react';
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

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, completedCards.length - 1));
  }, [completedCards.length]);

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

  if (completedCards.length === 0) {
    return (
      <Text color="white/40" fontSize="sm" py={2} px={4}>
        No flashcards were generated.
      </Text>
    );
  }

  // Clamp index
  const safeIndex = Math.min(currentIndex, completedCards.length - 1);

  return (
    <Flex direction="column" align="center" gap={3} py={2} w="full">
      {/* Title */}
      <Text color="white" fontSize="md" fontWeight="medium">
        {title}
      </Text>

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
        <FlashcardCard
          card={completedCards[safeIndex]}
          responseMode={responseMode}
        />
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
          {completedCards.map((card, i) => (
            <Box
              key={card.id}
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
          disabled={safeIndex === completedCards.length - 1}
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
        {safeIndex + 1} / {completedCards.length}
      </Text>
    </Flex>
  );
}
