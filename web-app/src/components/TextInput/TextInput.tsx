import { motion, AnimatePresence } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../store';
import { BsSend, BsPencil } from 'react-icons/bs';
import { Box, IconButton, Input } from '@chakra-ui/react';

interface TextInputProps {
  isActive: boolean;
  onActivate: () => void;
}

const MotionBox = motion.create(Box);
const MotionIconButton = motion.create(IconButton);

export function TextInput({ isActive, onActivate }: TextInputProps) {
  const send = useStore((state) => state.socket.send);
  const addMessage = useStore((state) => state.session.addMessage);
  const activeSessionId = useStore((state) => state.session.activeSessionId);
  const [textMessage, setTextMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleToggleToText = () => {
    onActivate();
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (textMessage.trim() && !isSending) {
      setIsSending(true);
      try {
        // Add user message to local state immediately
        if (activeSessionId) {
          const userMessage = {
            message_id: `user-${Date.now()}`,
            session_id: activeSessionId,
            user_id: '',
            message_source: 'user' as const,
            message_kind: 'text',
            message_content: textMessage,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          addMessage(userMessage);
        }

        // Send message through WebSocket
        send(textMessage);
        setTextMessage('');
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isActive ? (
        <MotionBox
          key="text-input"
          as="form"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSendMessage}
          display="flex"
          alignItems="center"
          gap={2}
          overflow="hidden"
        >
          <Input
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            flex={1}
            bg="white/10"
            color="white"
            _placeholder={{ color: "white/50" }}
            px={4}
            size="lg"
            rounded="full"
            borderColor="white/20"
            _focus={{ borderColor: "accent.400", outline: "none" }}
            transition="all 0.2s"
            _disabled={{ opacity: 0.5 }}
            autoFocus
          />
          <MotionIconButton
            type="submit"
            aria-label="Send message"
            disabled={!textMessage.trim() || isSending}
            bg="accent.500"
            color="white"
            _hover={{ bg: "accent.600" }}
            rounded="full"
            size="lg"
            shadow="lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            <BsSend />
          </MotionIconButton>
        </MotionBox>
      ) : (
        <MotionIconButton
          key="text-icon"
          type="button"
          onClick={handleToggleToText}
          initial={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          aria-label="Switch to text input"
          bg="white/10"
          color="white"
          _hover={{ bg: "white/20" }}
          rounded="full"
          size="xl"
          shadow="lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BsPencil />
        </MotionIconButton>
      )}
    </AnimatePresence>
  );
}
