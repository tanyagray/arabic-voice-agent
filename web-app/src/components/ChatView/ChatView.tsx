import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../store';
import { Transcript } from '../Transcript/Transcript';
import { Box, Flex, Input, IconButton } from '@chakra-ui/react';
import { BsSend, BsMic } from 'react-icons/bs';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

const MotionBox = motion.create(Box);
const MotionIconButton = motion.create(IconButton);

interface ChatViewProps {
  messages: TranscriptMessage[];
  onStartCall: () => void;
}

export function ChatView({ messages, onStartCall }: ChatViewProps) {
  const sendMessage = useStore((state) => state.session.sendMessage);
  const [textMessage, setTextMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (textMessage.trim() && !isSending) {
      setIsSending(true);
      try {
        await sendMessage(textMessage);
        setTextMessage('');
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <Flex direction="column" flex={1} gap={6} minH={0}>
      {/* Transcript - fills available space */}
      <Box flex={1} minH={0} w="full">
        <Transcript messages={messages} />
      </Box>

      {/* Input controls */}
      <Flex justify="center" gap={3} align="center" flexShrink={0} px={4}>
        <MotionBox
          as="form"
          onSubmit={handleSendMessage}
          display="flex"
          alignItems="center"
          gap={2}
          flex={1}
          maxW="600px"
        >
          <Input
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            flex={1}
            bg="white/10"
            color="white"
            _placeholder={{ color: 'white/50' }}
            px={4}
            size="lg"
            rounded="full"
            borderColor="white/20"
            _focus={{ borderColor: 'accent.400', outline: 'none' }}
            transition="all 0.2s"
            _disabled={{ opacity: 0.5 }}
          />
          <MotionIconButton
            type="submit"
            aria-label="Send message"
            disabled={!textMessage.trim() || isSending}
            bg="accent.500"
            color="white"
            _hover={{ bg: 'accent.600' }}
            rounded="full"
            size="lg"
            shadow="lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            <BsSend />
          </MotionIconButton>
        </MotionBox>

        {/* Start Call button */}
        <MotionIconButton
          type="button"
          onClick={onStartCall}
          aria-label="Start voice call"
          bg="green.500"
          color="white"
          _hover={{ bg: 'green.600' }}
          rounded="full"
          size="lg"
          shadow="lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BsMic />
        </MotionIconButton>
      </Flex>
    </Flex>
  );
}
