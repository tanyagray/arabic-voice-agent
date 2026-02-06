import { motion } from 'motion/react';
import { forwardRef, type HTMLAttributes } from 'react';
import { BsPersonFill, BsMic } from 'react-icons/bs';
import { Box, Flex, Text, Icon } from '@chakra-ui/react';

/**
 * A single message in the transcript.
 */
export interface TranscriptMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp?: number;
}

export interface TranscriptProps extends HTMLAttributes<HTMLDivElement> {
  /** Messages to display in the transcript */
  messages: TranscriptMessage[];
  /** Text to show when there are no messages */
  emptyText?: string;
}

interface TranscriptBubbleProps {
  text: string;
  isUser: boolean;
  timestamp?: number;
  index: number;
}

const MotionBox = motion.create(Box);

function TranscriptBubble({ text, isUser, timestamp, index }: TranscriptBubbleProps) {
  return (
    <MotionBox
      key={`${timestamp ?? index}-${index}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      overflow="hidden"
    >
      <Box
        maxW="80%"
        rounded="2xl"
        px={4}
        py={2}
        bg={isUser ? 'accent.500' : 'white/20'}
        color="white"
        roundedBottomRight={isUser ? 'sm' : '2xl'}
        roundedBottomLeft={isUser ? '2xl' : 'sm'}
      >
        <Flex align="center" gap={2} mb={1}>
          <Text fontSize="sm" fontWeight="medium" opacity={0.7}>
            {isUser ? 'You' : 'Agent'}
          </Text>
          {isUser ? (
            <Icon as={BsPersonFill} w={4} h={4} opacity={0.7} />
          ) : (
            <Icon as={BsMic} w={4} h={4} opacity={0.7} />
          )}
        </Flex>
        <Text fontSize="lg" lineHeight="relaxed">
          {text}
        </Text>
      </Box>
    </MotionBox>
  );
}

/**
 * Transcript component displays a list of chat messages.
 *
 * This is a presentational component - data should be passed via the `messages` prop.
 */
export const Transcript = forwardRef<HTMLDivElement, TranscriptProps>(
  ({ messages, emptyText = 'No messages yet', style, ...props }, ref) => {
    return (
      <Flex
        ref={ref}
        direction="column"
        gap={3}
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
          messages.map((message, index) => (
            <TranscriptBubble
              key={message.id}
              text={message.text}
              isUser={message.isUser}
              timestamp={message.timestamp}
              index={index}
            />
          ))
        ) : (
          <Flex h="full" align="center" justify="center">
            <Text color="white" opacity={0.5}>
              {emptyText}
            </Text>
          </Flex>
        )}
      </Flex>
    );
  }
);

Transcript.displayName = 'Transcript';
