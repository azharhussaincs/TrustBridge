import toast from 'react-hot-toast';

let audioContext: AudioContext | null = null;

export function unlockMessageAudio() {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
}

export function playMessageBeep() {
  try {
    unlockMessageAudio();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.1;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    window.setTimeout(() => {
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    }, 140);
  } catch {
    // Browser may block audio until user interacts with the page.
  }
}

export function getIncomingPreview(content?: string | null, fileId?: string | null): string {
  if (fileId) return '📎 File shared';
  const text = content || '';
  if (text.startsWith('📎')) return text.length > 42 ? `${text.substring(0, 42)}…` : text;
  return text.length > 42 ? `${text.substring(0, 42)}…` : text;
}

export function notifyIncomingChatMessage(
  message: { id: string; content?: string; fileId?: string | null },
  senderName: string
) {
  const preview = getIncomingPreview(message.content, message.fileId);
  playMessageBeep();
  toast.success(`💬 ${senderName}: ${preview}`, {
    id: `chat-msg-${message.id}`,
    duration: 6000,
  });
}

export function notifyIncomingGroupMessage(
  message: { id: string; content?: string; fileId?: string | null },
  senderName: string,
  groupName: string
) {
  const preview = getIncomingPreview(message.content, message.fileId);
  playMessageBeep();
  toast.success(`👥 ${groupName} · ${senderName}: ${preview}`, {
    id: `group-msg-${message.id}`,
    duration: 6000,
  });
}
