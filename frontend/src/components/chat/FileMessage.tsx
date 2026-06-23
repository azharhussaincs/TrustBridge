'use client';

import { cn } from '@/lib/utils';
import { parseFileMessageContent } from '@/lib/chat/fileMessage';
import { Button } from '@/components/ui/Button';

export interface FileMessageData {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  fileId: string | null;
  createdAt: string;
  read?: boolean;
  uploading?: boolean;
}

interface FileMessageProps {
  message: FileMessageData;
  isOwn: boolean;
  senderName?: string;
  statusText?: string;
  timeLabel: string;
  onDownload: (fileId: string, fileName: string) => void;
  onPreview?: (fileId: string, fileName: string) => void;
}

export function FileMessage({
  message,
  isOwn,
  senderName,
  statusText = '',
  timeLabel,
  onDownload,
  onPreview,
}: FileMessageProps) {
  const meta = parseFileMessageContent(message.content);
  const canDownload = Boolean(message.fileId) && !message.uploading;
  const canPreview = canDownload && meta.isImage && onPreview;

  return (
    <div
      className={cn(
        'file-message-card max-w-[280px] rounded-2xl border p-3 shadow-md',
        isOwn
          ? 'border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-800 text-white'
          : 'border-blue-200/60 bg-white text-slate-900'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl',
            isOwn ? 'bg-white/15' : 'bg-blue-50'
          )}
          aria-hidden="true"
        >
          {message.uploading ? '⏳' : meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-semibold', isOwn ? 'text-white' : 'text-slate-900')}>
            {meta.fileName}
          </p>
          <p className={cn('text-xs', isOwn ? 'text-blue-100' : 'text-slate-500')}>
            {message.uploading ? 'Uploading...' : meta.fileType}
          </p>
          {meta.fileSize && (
            <p className={cn('text-[11px]', isOwn ? 'text-blue-200/90' : 'text-slate-400')}>
              {meta.fileSize}
            </p>
          )}
        </div>
      </div>

      {!isOwn && senderName && (
        <p className="mt-2 text-[10px] text-slate-500">Sent by {senderName}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canPreview && (
          <Button
            type="button"
            size="sm"
            variant={isOwn ? 'outline' : 'primary'}
            className="text-xs"
            onClick={() => onPreview!(message.fileId!, meta.fileName)}
          >
            👁 Preview
          </Button>
        )}
        {canDownload ? (
          <Button
            type="button"
            size="sm"
            variant={isOwn ? 'secondary' : 'success'}
            className="text-xs"
            onClick={() => onDownload(message.fileId!, meta.fileName)}
          >
            ⬇️ Download
          </Button>
        ) : message.uploading ? (
          <span className={cn('text-xs italic', isOwn ? 'text-blue-100' : 'text-slate-500')}>
            ⏳ Uploading...
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          'm-0 mt-2 text-right text-[10px]',
          isOwn ? 'text-blue-100/80' : 'text-slate-400'
        )}
      >
        {timeLabel}
        {statusText}
      </p>
    </div>
  );
}
