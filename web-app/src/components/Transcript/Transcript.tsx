import { motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes } from 'react';
import { useTranscriptionsWithParticipants } from '../../hooks/useTranscriptionsWithParticipants';
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
    const transcriptions = useTranscriptionsWithParticipants();

    return (
      <Box
        ref={ref}
        position="relative"
        overflow="hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          ...style,
        }}
        {...props}
      >
        {transcriptions && transcriptions.length > 0 && (
          <Flex
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            direction="column"
            gap={3}
            pr={2}
            pb={2}
          >
            {transcriptions.map((transcription, index) => {
              const isUser = transcription.type === 'user';
              return (
                <TranscriptBubble
                  key={`${transcription.timestamp}-${index}`}
                  text={transcription.text}
                  isUser={isUser}
                  timestamp={transcription.timestamp}
                  index={index}
                />
              );
            })}
          </Flex>
        )}
      </Box>
    );
  }
);

Transcript.displayName = 'Transcript';
