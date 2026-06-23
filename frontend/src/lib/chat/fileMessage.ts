export interface FileMessageMeta {
  fileName: string;
  fileSize: string;
  fileType: string;
  icon: string;
  isImage: boolean;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  xls: '📊',
  xlsx: '📊',
  ppt: '📽️',
  pptx: '📽️',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  webp: '🖼️',
  svg: '🖼️',
  mp4: '🎬',
  avi: '🎬',
  mkv: '🎬',
  mov: '🎬',
  mp3: '🎵',
  wav: '🎵',
  flac: '🎵',
  zip: '📦',
  rar: '📦',
  '7z': '📦',
  tar: '📦',
  gz: '📦',
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF Document',
  doc: 'Word Document',
  docx: 'Word Document',
  xls: 'Excel Spreadsheet',
  xlsx: 'Excel Spreadsheet',
  ppt: 'PowerPoint',
  pptx: 'PowerPoint',
  jpg: 'Image',
  jpeg: 'Image',
  png: 'Image',
  gif: 'Image',
  webp: 'Image',
  svg: 'Image',
  mp4: 'Video',
  avi: 'Video',
  mkv: 'Video',
  mov: 'Video',
  mp3: 'Audio',
  wav: 'Audio',
  flac: 'Audio',
  zip: 'Archive',
  rar: 'Archive',
  '7z': 'Archive',
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function getFileIcon(fileName: string): string {
  const ext = getFileExtension(fileName);
  return FILE_ICONS[ext] || '📎';
}

export function getFileTypeLabel(fileName: string): string {
  const ext = getFileExtension(fileName);
  return FILE_TYPE_LABELS[ext] || 'File';
}

export function isImageFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

/** Parse message content like "📎 name.pdf (2.4 MB)" */
export function parseFileMessageContent(content: string): FileMessageMeta {
  const match = content.match(/📎\s*(.+?)\s*\(([^)]+)\)\s*$/);
  const fileName = match?.[1]?.trim() || content.replace(/^📎\s*/, '').trim() || 'file';
  const fileSize = match?.[2]?.trim() || '';
  return {
    fileName,
    fileSize,
    fileType: getFileTypeLabel(fileName),
    icon: getFileIcon(fileName),
    isImage: isImageFile(fileName),
  };
}

export function buildFileMessageContent(fileName: string, sizeBytes: number): string {
  return `📎 ${fileName} (${formatFileSize(sizeBytes)})`;
}

export function getMessagePreview(content: string, fileId?: string | null): string {
  if (fileId) {
    const meta = parseFileMessageContent(content);
    return `📎 ${meta.fileName}`;
  }
  return content.length > 40 ? `${content.substring(0, 40)}...` : content;
}
