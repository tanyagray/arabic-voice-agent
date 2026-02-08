import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, type FormEvent } from 'react';
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
  const sendMessage = useStore((state) => state.session.sendMessage);
  const [textMessage, setTextMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleToText = () => {
    onActivate();
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const message = textMessage.trim();
    if (message && !isSending) {
      setTextMessage('');
      inputRef.current?.focus();
      setIsSending(true);
      try {
        await sendMessage(message);
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
          overflow="hidden"
          bg="white/10"
          rounded="full"
          borderWidth="1px"
          borderColor="white/20"
          css={{ transition: "all 0.2s" }}
          _focusWithin={{ borderColor: "accent.400" }}
          px={2}
        >
          <Input
            ref={inputRef}
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            flex={1}
            bg="transparent"
            color="white"
            _placeholder={{ color: "white/50" }}
            px={4}
            size="lg"
            border="none"
            _focus={{ outline: "none", boxShadow: "none" }}
            _disabled={{ opacity: 0.5 }}
            autoFocus
          />
          <MotionIconButton
            type="submit"
            aria-label="Send message"
            disabled={!textMessage.trim() || isSending}
            bg="transparent"
            color="white/60"
            _hover={{ color: "white" }}
            rounded="full"
            size="md"
            variant="ghost"
            whileTap={{ scale: 0.9 }}
            _disabled={{ opacity: 0.3, cursor: "not-allowed" }}
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
