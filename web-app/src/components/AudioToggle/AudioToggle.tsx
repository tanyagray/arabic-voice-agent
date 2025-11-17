import { useSessionContext } from '../../contexts/SessionContext';
import { BsVolumeUp, BsVolumeMute } from 'react-icons/bs';

export function AudioToggle() {
  const { audioEnabled, isUpdatingContext, toggleAudioEnabled } = useSessionContext();

  const handleToggle = async () => {
    await toggleAudioEnabled();
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdatingContext}
      className={`p-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
        audioEnabled
          ? 'bg-accent-500 hover:bg-accent-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white'
      }`}
      aria-label={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
    >
      {audioEnabled ? (
        <BsVolumeUp className="w-5 h-5" />
      ) : (
        <BsVolumeMute className="w-5 h-5" />
      )}
    </button>
  );
}
