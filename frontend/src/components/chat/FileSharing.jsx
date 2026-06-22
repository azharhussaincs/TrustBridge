'use client';

import { useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';

export default function FileSharing({ receiverId, currentUser }) {
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
      const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed 50MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
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

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      setUploadProgress(prev => ({ ...prev, [i]: 0 }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverId', receiverId);
      formData.append('isEncrypted', 'true');

      try {
        const token = localStorage.getItem('auth_token');
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
                reject(new Error(errorData.message || 'Upload failed'));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
        });

        xhr.open('POST', 'http://192.168.18.139:5000/api/files/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);

        const response = await uploadPromise;
        
        if (response.success) {
          uploadedCount++;
          // Send message with file ID
          const fileId = response.data.id;
          const fileName = file.name;
          const fileSize = formatFileSize(file.size);
          sendMessage(receiverId, `📎 ${fileName} (${fileSize})`, true, fileId);
        } else {
          failedCount++;
          setError(`Failed to upload: ${file.name}`);
        }

      } catch (err) {
        console.error('Upload error for file:', file.name, err);
        failedCount++;
        setError(`Failed to upload: ${file.name}`);
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
      setError('All files failed to upload');
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

  return (
    <div style={{ 
      borderTop: '1px solid #e5e7eb', 
      padding: '12px',
      backgroundColor: '#f9fafb'
    }}>
      {error && (
        <div style={{ 
          color: '#ef4444', 
          fontSize: '12px', 
          marginBottom: '8px',
          padding: '4px 8px',
          backgroundColor: '#fee2e2',
          borderRadius: '4px'
        }}>
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          color: '#22c55e', 
          fontSize: '12px', 
          marginBottom: '8px',
          padding: '4px 8px',
          backgroundColor: '#dcfce7',
          borderRadius: '4px'
        }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            multiple
            style={{ display: 'none' }}
            id="file-upload"
          />
          
          <label
            htmlFor="file-upload"
            style={{
              padding: '6px 14px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              borderRadius: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: uploading ? 0.5 : 1
            }}
          >
            📎 Choose Files
          </label>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            (Any file type, max 50MB each)
          </span>
        </div>

        {selectedFiles.length > 0 && (
          <div style={{ 
            maxHeight: '180px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '4px',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #e5e7eb'
          }}>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={{ fontSize: '18px' }}>{getFileIcon(file.name)}</span>
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '500',
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>
                    {formatFileSize(file.size)}
                    {uploadProgress[index] !== undefined && uploading && (
                      <span style={{ color: '#2563eb', marginLeft: '8px' }}>
                        {uploadProgress[index]}%
                      </span>
                    )}
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div style={{ 
              fontSize: '10px', 
              color: '#6b7280',
              padding: '2px 8px',
              borderTop: '1px solid #e5e7eb',
              marginTop: '2px'
            }}>
              Total: {selectedFiles.length} files ({formatFileSize(getTotalSize())})
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && !uploading && (
          <button
            onClick={handleUpload}
            style={{
              padding: '6px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Send All 📤 ({selectedFiles.length} files)
          </button>
        )}

        {uploading && (
          <div style={{ 
            width: '100%', 
            height: '4px', 
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${Object.values(uploadProgress).length > 0 ? Object.values(uploadProgress).reduce((a, b) => a + b, 0) / Object.values(uploadProgress).length : 0}%`, 
              height: '100%', 
              backgroundColor: '#2563eb',
              transition: 'width 0.3s'
            }} />
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '6px' }}>
        🔐 AES-GCM encrypted • Any file type • Multiple selection
      </div>
    </div>
  );
}
