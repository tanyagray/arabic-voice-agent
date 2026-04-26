// Dev-only mic shim for voice-mode smoke testing.
//
// Activated only when VITE_FAKE_MIC=1. Patches navigator.mediaDevices.getUserMedia
// to return a controllable MediaStream backed by a MediaStreamAudioDestinationNode,
// and exposes window.__pushMic(path?) which fetches an MP3 (default: /dev-fake-mic.mp3)
// and plays it into that stream — so Pipecat sees synthesized audio as mic input.
//
// Generate the MP3 with web-api/scripts/fake_tts.py.

declare global {
  interface Window {
    __pushMic?: (path?: string) => Promise<void>;
  }
}

if (import.meta.env.VITE_FAKE_MIC === '1') {
  let audioCtx: AudioContext | null = null;
  let destNode: MediaStreamAudioDestinationNode | null = null;

  const isStreamDead = (node: MediaStreamAudioDestinationNode) =>
    node.stream.getAudioTracks().some((t) => t.readyState === 'ended');

  const ensureContext = () => {
    if (!audioCtx) audioCtx = new AudioContext();
    if (!destNode || isStreamDead(destNode)) {
      destNode = audioCtx.createMediaStreamDestination();
    }
    return { audioCtx, destNode };
  };

  const realGetUserMedia =
    navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (constraints?.audio && !constraints.video) {
      const { destNode } = ensureContext();
      console.info('[fake-mic] Returning fake audio stream');
      return destNode.stream;
    }
    return realGetUserMedia(constraints);
  };

  window.__pushMic = async (path = '/dev-fake-mic.mp3') => {
    const { audioCtx, destNode } = ensureContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const url = `${path}?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`[fake-mic] fetch ${url} failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(buf);

    const src = audioCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(destNode);
    src.connect(audioCtx.destination); // also play audibly so a human can hear the fake user

    return new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start();
    });
  };

  console.info('[fake-mic] Shim active. Call window.__pushMic() to inject audio.');
}

export {};
