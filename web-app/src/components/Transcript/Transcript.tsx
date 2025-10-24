import { motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes } from 'react';
import { useTranscriptionsWithParticipants } from '../../hooks/useTranscriptionsWithParticipants';
import { BsPlus, BsMic } from 'react-icons/bs';

interface TranscriptBubbleProps {
  text: string;
  isUser: boolean;
  timestamp: number;
  index: number;
}

function TranscriptBubble({ text, isUser, timestamp, index }: TranscriptBubbleProps) {
  return (
    <motion.div
      key={`${timestamp}-${index}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} overflow-hidden`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser ? 'bg-accent-500 text-white rounded-br-sm' : 'bg-white/20 text-white rounded-bl-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium opacity-70">{isUser ? 'You' : 'Agent'}</span>
          {/* Show chat icon for user messages, mic icon for agent (since agent uses voice) */}
          {isUser ? (
            <BsPlus className="w-4 h-4 opacity-70" />
          ) : (
            <BsMic className="w-4 h-4 opacity-70" />
          )}
        </div>
        <p className="text-lg leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

export const Transcript = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => {
    const transcriptions = useTranscriptionsWithParticipants();

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden ${className}`}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
          ...style,
        }}
        {...props}
      >
        {transcriptions && transcriptions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-col space-y-3 pr-2 pb-2">
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
          </div>
        )}
      </div>
    );
  }
);

Transcript.displayName = 'Transcript';
