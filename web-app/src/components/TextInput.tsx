import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@livekit/components-react';
import { useState, type FormEvent } from 'react';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';

interface TextInputProps {
  isActive: boolean;
  onActivate: () => void;
}

export function TextInput({ isActive, onActivate }: TextInputProps) {
  const { send, isSending } = useChat();
  const { setMicrophoneEnabled } = useLiveKitRoom();
  const [textMessage, setTextMessage] = useState('');

  const handleToggleToText = () => {
    onActivate();
    // Explicitly disable microphone when switching to text mode
    setMicrophoneEnabled(false);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (textMessage.trim() && !isSending) {
      await send(textMessage);
      setTextMessage('');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isActive ? (
        <motion.form
          key="text-input"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSendMessage}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="bg-white/10 text-white placeholder-white/50 px-4 py-3 rounded-full border border-white/20 focus:outline-none focus:border-accent-400 transition-all disabled:opacity-50"
            autoFocus
          />
          <motion.button
            type="submit"
            disabled={!textMessage.trim() || isSending}
            className="bg-accent-500 hover:bg-accent-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </motion.button>
        </motion.form>
      ) : (
        <motion.button
          key="text-icon"
          type="button"
          onClick={handleToggleToText}
          initial={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
