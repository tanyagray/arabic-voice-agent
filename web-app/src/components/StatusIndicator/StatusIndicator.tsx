import { motion, AnimatePresence } from 'motion/react';
import { BsArrowRepeat } from 'react-icons/bs';

interface StatusIndicatorProps {
  state: string;
}

export function StatusIndicator({ state }: StatusIndicatorProps) {
  return (
    <div className="text-center flex-shrink-0">
      <AnimatePresence mode="wait">
        {state === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 px-6 py-3 rounded-full border border-green-500/30"
          >
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">Listening...</span>
          </motion.div>
        )}
        {state === 'thinking' && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-6 py-3 rounded-full border border-blue-500/30"
          >
            <BsArrowRepeat className="animate-spin h-5 w-5" />
            <span className="font-medium">Thinking...</span>
          </motion.div>
        )}
        {state === 'speaking' && (
          <motion.div
            key="speaking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-6 py-3 rounded-full border border-purple-500/30"
          >
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
            <span className="font-medium">Speaking...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
