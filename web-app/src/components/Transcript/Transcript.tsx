import { motion } from 'motion/react';
import { forwardRef, type HTMLAttributes } from 'react';
import { useStore } from '../../store';
import { BsPlus, BsMic } from 'react-icons/bs';
import { Box, Flex, Text, Icon } from '@chakra-ui/react';

interface TranscriptBubbleProps {
  text: string;
  isUser: boolean;
  timestamp: number;
  index: number;
}

const MotionBox = motion.create(Box);

function TranscriptBubble({ text, isUser, timestamp, index }: TranscriptBubbleProps) {
  return (
    <MotionBox
      key={`${timestamp}-${index}`}
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
            <Icon as={BsPlus} w={4} h={4} opacity={0.7} />
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

export const Transcript = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => {
    const messages = useStore((state) => state.session.messages);

    console.log('Transcript rendering with messages:', messages);

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
        {messages && messages.length > 0 ? (
          messages.map((message, index) => {
            const isUser = message.role === 'user';
            console.log('Rendering message:', message);
            return (
              <TranscriptBubble
                key={`${message.id}-${index}`}
                text={message.text}
                isUser={isUser}
                timestamp={message.timestamp.getTime()}
                index={index}
              />
            );
          })
        ) : (
          <Flex h="full" align="center" justify="center">
            <Text color="white" opacity={0.5}>
              No messages yet
            </Text>
          </Flex>
        )}
      </Flex>
    );
  }
);

Transcript.displayName = 'Transcript';
