import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../store';
import { Transcript } from '../Transcript/Transcript';
import { Box, Flex, Input, IconButton } from '@chakra-ui/react';
import { BsSend, BsTelephone } from 'react-icons/bs';
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
          flex={1}
          maxW="600px"
          bg="white/10"
          rounded="full"
          borderWidth="1px"
          borderColor="white/20"
          css={{ transition: "all 0.2s" }}
          _focusWithin={{ borderColor: 'accent.400' }}
          px={2}
        >
          <Input
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            flex={1}
            bg="transparent"
            color="white"
            _placeholder={{ color: 'white/50' }}
            px={4}
            size="lg"
            border="none"
            _focus={{ outline: 'none', boxShadow: 'none' }}
            _disabled={{ opacity: 0.5 }}
          />
          <MotionIconButton
            type="submit"
            aria-label="Send message"
            disabled={!textMessage.trim() || isSending}
            bg="transparent"
            color="white/60"
            _hover={{ color: 'white' }}
            rounded="full"
            size="md"
            variant="ghost"
            whileTap={{ scale: 0.9 }}
            _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
          >
            <BsSend />
          </MotionIconButton>
        </MotionBox>

        {/* Start Call button */}
        <MotionIconButton
          type="button"
          onClick={onStartCall}
          aria-label="Start voice call"
          bg="white/10"
          color="white"
          _hover={{ bg: 'white/20' }}
          rounded="full"
          size="lg"
          shadow="lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BsTelephone />
        </MotionIconButton>
      </Flex>
    </Flex>
  );
}
