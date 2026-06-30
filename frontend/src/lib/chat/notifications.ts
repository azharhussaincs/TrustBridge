import toast from 'react-hot-toast';

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
  toast.success(`💬 ${senderName}: ${preview}`, {
    id: `chat-msg-${message.id}`,
    duration: 6000,
  });
}
