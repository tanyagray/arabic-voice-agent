import { useSessionContext } from '../../contexts/SessionContext';
import './AudioToggle.css';

export function AudioToggle() {
  const { audioEnabled, isUpdatingContext, toggleAudioEnabled } = useSessionContext();

  const handleToggle = async () => {
    await toggleAudioEnabled();
  };

  return (
    <div className="audio-toggle">
      <button
        onClick={handleToggle}
        disabled={isUpdatingContext}
        className={`audio-toggle-button ${audioEnabled ? 'enabled' : 'disabled'}`}
        aria-label={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
      >
        <span className="audio-toggle-icon">
          {audioEnabled ? '🔊' : '🔇'}
        </span>
        <span className="audio-toggle-text">
          {audioEnabled ? 'Audio On' : 'Audio Off'}
        </span>
      </button>
    </div>
  );
}
