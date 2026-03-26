import { motion, AnimatePresence } from 'motion/react';
import { forwardRef, memo, useEffect, useRef, type HTMLAttributes } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';
import { MarkdownContent } from './MarkdownContent';

export type { TranscriptMessage };

export interface TranscriptProps extends HTMLAttributes<HTMLDivElement> {
  /** Messages to display in the transcript */
  messages: TranscriptMessage[];
  /** Text to show when there are no messages */
  emptyText?: string;
}

interface TranscriptBubbleProps {
  message: TranscriptMessage;
  isFirstInGroup: boolean;
}

const MotionBox = motion.create(Box);

function TranscriptBubble({ message, isFirstInGroup }: TranscriptBubbleProps) {
  const isUser = message.message_source === 'user';

  // First in group: small corner only on bottom (tail side)
  // Non-first: small corners on both top and bottom (tail side)
  const roundedTopRight = !isFirstInGroup && isUser ? 'sm' : '2xl';
  const roundedTopLeft = !isFirstInGroup && !isUser ? 'sm' : '2xl';
  const roundedBottomRight = isUser ? 'sm' : '2xl';
  const roundedBottomLeft = isUser ? '2xl' : 'sm';

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
        bg={isUser ? 'accent.500' : 'white/20'}
        color="white"
        roundedTopRight={roundedTopRight}
        roundedTopLeft={roundedTopLeft}
        roundedBottomRight={roundedBottomRight}
        roundedBottomLeft={roundedBottomLeft}
      >
        {isUser ? (
          <Text fontSize="lg" lineHeight="relaxed">
            {message.message_text}
          </Text>
        ) : (
          <MarkdownContent>{message.message_text}</MarkdownContent>
        )}
      </Box>
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
  ({ messages, emptyText = 'No messages yet', style, ...props }, ref) => {
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
      <Box
        ref={setRefs}
        h="full"
        w="full"
        overflowY="auto"
        pr={2}
        pb={2}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          ...style,
        }}
        {...props}
      >
        {messages.length > 0 ? (
          <Flex direction="column" gap={3}>
            {groupMessages(messages).map((group) => (
              <Flex key={group[0].message_id} direction="column" gap={1}>
                <AnimatePresence initial={false}>
                  {group.map((message, i) => (
                    <TranscriptBubble
                      key={message.message_id}
                      message={message}
                      isFirstInGroup={i === 0}
                    />
                  ))}
                </AnimatePresence>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Flex h="full" align="center" justify="center">
            <Text color="white" opacity={0.5}>
              {emptyText}
            </Text>
          </Flex>
        )}
      </Box>
    );
  }
));

Transcript.displayName = 'Transcript';
