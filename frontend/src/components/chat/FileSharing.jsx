'use client';

import { useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api/config';
import { getAuthToken } from '@/lib/auth/session';
import { buildFileMessageContent } from '@/lib/chat/fileMessage';

export default function FileSharing({ receiverId, currentUser, onFileMessage }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const { sendMessage } = useSocket();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      setError('');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !receiverId) {
      setError('Please select files and a recipient');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const totalFiles = selectedFiles.length;
    let uploadedCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      setUploadProgress(prev => ({ ...prev, [i]: 0 }));

      const tempId = `temp-file-${Date.now()}-${i}`;
      const fileContent = buildFileMessageContent(file.name, file.size);

      if (onFileMessage) {
        onFileMessage({
          id: tempId,
          content: fileContent,
          senderId: currentUser.id,
          receiverId,
          fileId: null,
          createdAt: new Date().toISOString(),
          read: false,
          uploading: true,
        });
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverId', receiverId);
      formData.append('isEncrypted', 'true');

      try {
        const token = getAuthToken();
        if (!token) {
          setError('Not authenticated. Please login again.');
          break;
        }

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [i]: progress }));
          }
        });

        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.message || `Upload failed with status ${xhr.status}`));
              } catch (e) {
                const snippet = xhr.responseText?.slice(0, 200);
                reject(new Error(
                  snippet
                    ? `Upload failed (${xhr.status}): ${snippet}`
                    : `Upload failed with status ${xhr.status}`
                ));
              }
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
        });

        xhr.open('POST', apiUrl('/files/upload'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);

        const response = await uploadPromise;
        
        if (response.success) {
          uploadedCount++;
          const fileId = response.data.id;
          const fileName = file.name;
          const fileSize = formatFileSize(file.size);
          const content = buildFileMessageContent(fileName, file.size);

          if (onFileMessage) {
            onFileMessage({
              id: tempId,
              content,
              senderId: currentUser.id,
              receiverId,
              fileId,
              createdAt: new Date().toISOString(),
              read: false,
              uploading: false,
            });
          }

          sendMessage(receiverId, content, true, fileId);
          toast.success(`📎 File "${fileName}" sent!`);
        } else {
          failedCount++;
          const reason = response.message || 'Upload failed';
          lastError = `${file.name}: ${reason}`;
          setError(lastError);
        }

      } catch (err) {
        console.error('Upload error for file:', file.name, err);
        failedCount++;
        lastError = err instanceof Error ? err.message : `Failed to upload: ${file.name}`;
        setError(lastError);
        if (onFileMessage) {
          onFileMessage({
            id: tempId,
            content: fileContent,
            senderId: currentUser.id,
            receiverId,
            fileId: null,
            createdAt: new Date().toISOString(),
            read: false,
            uploading: false,
            failed: true,
          });
        }
      }
    }

    setUploading(false);
    
    if (uploadedCount === totalFiles) {
      setSuccess(`✅ ${uploadedCount} files sent successfully!`);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else if (uploadedCount > 0) {
      setSuccess(`✅ ${uploadedCount} files sent, ${failedCount} failed`);
      setSelectedFiles(prev => prev.slice(uploadedCount));
    } else {
      setError(lastError || 'All files failed to upload');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const icons = {
      'pdf': '📄', 'doc': '📝', 'docx': '📝',
      'xls': '📊', 'xlsx': '📊',
      'ppt': '📽️', 'pptx': '📽️',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
      'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬',
      'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
      'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
      'txt': '📃', 'js': '💻', 'py': '💻', 'html': '💻', 'css': '💻', 'json': '💻',
      'exe': '⚙️', 'msi': '⚙️',
      'one': '📓', 'onenote': '📓',
      'dwg': '📐', 'dxf': '📐',
      'psd': '🎨', 'ai': '🎨',
    };
    return icons[ext] || '📎';
  };

  const getTotalSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const avgProgress = Object.values(uploadProgress).length > 0
    ? Object.values(uploadProgress).reduce((a, b) => a + b, 0) / Object.values(uploadProgress).length
    : 0;

  return (
    <div className="panel-light border-t-0 mt-3 animate-fade-in">
      {error && <Alert variant="error" className="mb-3 text-xs">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3 text-xs">{success}</Alert>}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            multiple
            className="hidden"
            id="file-upload"
          />
          
          <label
            htmlFor="file-upload"
            className={cn(
              'inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50',
              uploading && 'cursor-not-allowed opacity-50'
            )}
          >
            📎 Choose Files
          </label>
          <span className="text-xs text-slate-500">
            (Any file type, no size limit)
          </span>
        </div>

        {selectedFiles.length > 0 && (
          <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
            <div className="flex flex-col gap-1.5">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5"
                >
                  <span className="text-lg" aria-hidden="true">{getFileIcon(file.name)}</span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate text-xs font-medium text-slate-900">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatFileSize(file.size)}
                      {uploadProgress[index] !== undefined && uploading && (
                        <span className="ml-2 text-brand-600">
                          {uploadProgress[index]}%
                        </span>
                      )}
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50"
                      aria-label={`Remove ${file.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
              Total: {selectedFiles.length} files ({formatFileSize(getTotalSize())})
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && !uploading && (
          <Button onClick={handleUpload} size="sm" className="self-start">
            Send All 📤 ({selectedFiles.length} files)
          </Button>
        )}

        {uploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${avgProgress}%` }}
              role="progressbar"
              aria-valuenow={avgProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>
      
      <p className="mt-2 text-[10px] text-slate-400">
        🔐 AES-GCM encrypted · Any file type · Any size · Multiple selection
      </p>
    </div>
  );
}
