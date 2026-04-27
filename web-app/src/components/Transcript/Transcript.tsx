import { motion, AnimatePresence } from 'motion/react';
import { forwardRef, memo, useCallback, useEffect, useRef, type HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, Text } from '@chakra-ui/react';
import type { TranscriptMessage, ResponseMode } from '@/api/sessions/sessions.types';
import type { Theme } from '@/pages/Landing';
import { AudioBubble } from './AudioBubble';
import { HighlightedText } from './HighlightedText';
import { MarkdownContent } from './MarkdownContent';
import { FlashcardDeck } from '@/components/FlashcardDeck';
import { renderTranscriptComponent } from '@/components/TranscriptComponents/registry';
import type { LessonRow } from '@/hooks/useLessonProposalGroup';
import { useStore } from '@/store';

export type { TranscriptMessage };

export interface TranscriptProps extends HTMLAttributes<HTMLDivElement> {
  /** Messages to display in the transcript */
  messages: TranscriptMessage[];
  /** Text to show when there are no messages */
  emptyText?: string;
  theme?: Theme;
}

interface TranscriptBubbleProps {
  message: TranscriptMessage;
  isFirstInGroup: boolean;
  responseMode: ResponseMode;
  theme?: Theme;
}

const MotionBox = motion.create(Box);

/** Pick the display text for a tutor message based on response mode. */
function getDisplayText(message: TranscriptMessage, mode: ResponseMode): string {
  if (mode === 'canonical' && message.message_text_canonical) {
    return message.message_text_canonical;
  }
  if (mode === 'transliterated' && message.message_text_transliterated) {
    return message.message_text_transliterated;
  }
  if (mode === 'scaffolded' && message.message_text_scaffolded) {
    return message.message_text_scaffolded;
  }
  // Fallback to the stored display text
  return message.message_text;
}

function TranscriptBubble({ message, isFirstInGroup, responseMode, theme }: TranscriptBubbleProps) {
  const isUser = message.message_source === 'user';
  const isTutor = message.message_source === 'tutor';
  const sendMessage = useStore((s) => s.session.sendMessage);

  // Flashcard messages render as a full-width deck, not inside a bubble
  if (message.message_kind === 'flash_cards') {
    return (
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        w="full"
      >
        <FlashcardDeck message={message} />
      </MotionBox>
    );
  }

  if (message.message_kind === 'component') {
    return (
      <ComponentBubble message={message} sendMessage={sendMessage} />
    );
  }

  // First in group: small corner only on bottom (tail side)
  // Non-first: small corners on both top and bottom (tail side)
  const roundedTopRight = !isFirstInGroup && isUser ? 'sm' : '2xl';
  const roundedTopLeft = !isFirstInGroup && !isUser ? 'sm' : '2xl';
  const roundedBottomRight = isUser ? 'sm' : '2xl';
  const roundedBottomLeft = isUser ? '2xl' : 'sm';

  const displayText = isTutor ? getDisplayText(message, responseMode) : message.message_text;
  const showHighlights = isTutor && responseMode === 'scaffolded' && message.highlights?.length;

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
    >
      <Box
        maxW="80%"
        px={4}
        py={2}
        bg={isUser ? 'accent.500' : (theme ? theme.surface : 'white/20')}
        color={isUser ? 'white' : (theme ? theme.ink : 'white')}
        roundedTopRight={roundedTopRight}
        roundedTopLeft={roundedTopLeft}
        roundedBottomRight={roundedBottomRight}
        roundedBottomLeft={roundedBottomLeft}
        dir={isTutor && responseMode === 'canonical' ? 'rtl' : undefined}
        style={theme && !isUser ? { border: `1px solid ${theme.border}` } : undefined}
      >
        {message.message_kind === 'audio' ? (
          <AudioBubble
            audioUrl={message.message_text}
            label={
              responseMode === 'canonical'
                ? message.message_text_canonical ?? undefined
                : message.message_text_transliterated ?? message.message_text_canonical ?? undefined
            }
            dir={responseMode === 'canonical' ? 'rtl' : undefined}
          />
        ) : isUser ? (
          <Text fontSize="lg" lineHeight="relaxed">
            {displayText}
          </Text>
        ) : showHighlights ? (
          <HighlightedText text={displayText} highlights={message.highlights!} />
        ) : (
          <MarkdownContent>{displayText}</MarkdownContent>
        )}
      </Box>
    </MotionBox>
  );
}

function ComponentBubble({
  message,
}: {
  message: TranscriptMessage;
  sendMessage: (m: string) => Promise<void>;
}) {
  const navigate = useNavigate();

  const handlePickProposal = useCallback(
    (lesson: LessonRow) => {
      navigate(`/lesson/${lesson.id}`);
    },
    [navigate],
  );

  const rendered = renderTranscriptComponent(message, {
    LessonProposalTiles: { onPick: handlePickProposal },
  });

  if (!rendered) return null;

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      w="full"
    >
      {rendered}
    </MotionBox>
  );
}

/** Group consecutive messages from the same source */
function groupMessages(messages: TranscriptMessage[]): TranscriptMessage[][] {
  const groups: TranscriptMessage[][] = [];
  for (const message of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].message_source === message.message_source) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
  }
  return groups;
}

/**
 * Transcript component displays a list of chat messages.
 *
 * This is a presentational component - data should be passed via the `messages` prop.
 */
export const Transcript = memo(forwardRef<HTMLDivElement, TranscriptProps>(
  ({ messages, emptyText = 'No messages yet', theme, style, ...props }, ref) => {
    const responseMode = useStore((s) => s.session.context.response_mode);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasScrolledRef = useRef(false);

    // Scroll to bottom when new messages are added
    useEffect(() => {
      if (containerRef.current && messages.length > 0) {
        const behavior = hasScrolledRef.current ? 'smooth' : 'instant';
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior,
        });
        hasScrolledRef.current = true;
      }
    }, [messages.length]);

    // Combine internal ref with forwarded ref
    const setRefs = (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    return (
      <Flex
        ref={setRefs}
        direction="column"
        h="full"
        w="full"
        overflowY="auto"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          ...style,
        }}
        {...props}
      >
        {messages.length > 0 ? (
          <Flex direction="column" gap={3} w="full" maxW="680px" mx="auto" px={4} pb={2} mt="auto">
            {groupMessages(messages).map((group) => (
              <Flex key={group[0].message_id} direction="column" gap={1}>
                <AnimatePresence initial={false}>
                  {group.map((message, i) => (
                    <TranscriptBubble
                      key={message.message_id}
                      message={message}
                      isFirstInGroup={i === 0}
                      responseMode={responseMode}
                      theme={theme}
                    />
                  ))}
                </AnimatePresence>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Flex h="full" align="center" justify="center">
            <Text style={{ color: theme ? theme.sub : undefined }} color={theme ? undefined : 'white'} opacity={0.5}>
              {emptyText}
            </Text>
          </Flex>
        )}
      </Flex>
    );
  }
));

Transcript.displayName = 'Transcript';
