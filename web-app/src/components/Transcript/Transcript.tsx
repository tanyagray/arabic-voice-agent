import { motion } from 'framer-motion';
import { useTranscriptionsWithParticipants } from '../../hooks/useTranscriptionsWithParticipants';
import { BsPlus, BsMic } from 'react-icons/bs';

interface TranscriptBubbleProps {
  text: string;
  isUser: boolean;
  type: 'chat' | 'transcription';
  timestamp: number;
  index: number;
}

function TranscriptBubble({ text, isUser, type, timestamp, index }: TranscriptBubbleProps) {
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
          {type === 'chat' ? (
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

export function Transcript() {
  const transcriptions = useTranscriptionsWithParticipants();

  if (!transcriptions || transcriptions.length === 0) {
    return null;
  }

  return (
    <div
      className="relative flex-1 min-h-0 overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem, black 100%)',
      }}
    >
      <div className="bottom-0 left-0 right-0 space-y-3 px-2 pb-2">
        {transcriptions.map((transcription, index) => {
          const isUser = transcription.participantIdentity.startsWith('web-');
          return (
            <TranscriptBubble
              key={`${transcription.timestamp}-${index}`}
              text={transcription.text}
              isUser={isUser}
              type={transcription.type}
              timestamp={transcription.timestamp}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}
