import { motion } from 'motion/react';
import { forwardRef, useCallback, useState, type HTMLAttributes } from 'react';
import { useStore } from '../../store';
import { useRTVIClientEvent } from '@pipecat-ai/client-react';
import { RTVIEvent } from '@pipecat-ai/client-js';
import { BsPlus, BsMic } from 'react-icons/bs';
import { Box, Flex, Text, Icon } from '@chakra-ui/react';

interface TranscriptEntry {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  final: boolean;
}

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
    // Messages from HTTP text chat (session store)
    const httpMessages = useStore((state) => state.session.messages);

    // Messages from RTVI voice events (local state)
    const [voiceMessages, setVoiceMessages] = useState<TranscriptEntry[]>([]);

    // Listen for user transcriptions from the voice pipeline
    useRTVIClientEvent(
      RTVIEvent.UserTranscript,
      useCallback((data: { text: string; final: boolean; timestamp: string; user_id: string }) => {
        if (!data.final) return; // Only show final transcripts
        setVoiceMessages((prev) => [
          ...prev,
          {
            id: `voice-user-${Date.now()}`,
            text: data.text,
            isUser: true,
            timestamp: Date.now(),
            final: true,
          },
        ]);
      }, [])
    );

    // Listen for bot output from the voice pipeline
    useRTVIClientEvent(
      RTVIEvent.BotOutput,
      useCallback((data: { text: string; spoken: boolean }) => {
        setVoiceMessages((prev) => [
          ...prev,
          {
            id: `voice-bot-${Date.now()}`,
            text: data.text,
            isUser: false,
            timestamp: Date.now(),
            final: true,
          },
        ]);
      }, [])
    );

    // Combine HTTP messages and voice messages, sorted by time
    const allMessages = [
      ...httpMessages.map((m) => ({
        id: m.message_id,
        text: m.message_content,
        isUser: m.message_source === 'user',
        timestamp: new Date(m.created_at).getTime(),
      })),
      ...voiceMessages.map((m) => ({
        id: m.id,
        text: m.text,
        isUser: m.isUser,
        timestamp: m.timestamp,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);

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
        {allMessages.length > 0 ? (
          allMessages.map((message, index) => (
            <TranscriptBubble
              key={`${message.id}-${index}`}
              text={message.text}
              isUser={message.isUser}
              timestamp={message.timestamp}
              index={index}
            />
          ))
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
