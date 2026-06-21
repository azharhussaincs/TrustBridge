'use client';

import { useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';

export default function FileSharing({ receiverId, currentUser }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const { sendMessage } = useSocket();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !receiverId) {
      setError('Please select a file and a recipient');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('receiverId', receiverId);
    formData.append('isEncrypted', 'true');

    try {
      const token = localStorage.getItem('auth_token');
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
      });

      xhr.open('POST', 'http://localhost:5000/api/files/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

      const response = await uploadPromise;
      
      if (response.success) {
        setSuccess(`✅ File "${selectedFile.name}" sent successfully!`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Send a message notification about the file
        sendMessage(receiverId, `📎 File shared: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
      } else {
        setError(response.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const icons = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'ppt': '📽️',
      'pptx': '📽️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'mp4': '🎬',
      'avi': '🎬',
      'mkv': '🎬',
      'mp3': '🎵',
      'wav': '🎵',
      'zip': '📦',
      'rar': '📦',
      '7z': '📦',
      'txt': '📃',
      'js': '💻',
      'py': '💻',
      'html': '💻',
      'css': '💻',
      'json': '💻',
    };
    return icons[ext] || '📎';
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
          id="file-upload"
        />
        
        <label
          htmlFor="file-upload"
          style={{
            padding: '6px 12px',
            backgroundColor: '#e5e7eb',
            color: '#374151',
            borderRadius: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            opacity: uploading ? 0.5 : 1
          }}
        >
          📎 Choose File
        </label>

        {selectedFile && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '20px' }}>{getFileIcon(selectedFile.name)}</span>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                {formatFileSize(selectedFile.size)}
              </div>
            </div>
            {uploading ? (
              <div style={{ fontSize: '12px', color: '#2563eb' }}>
                {uploadProgress}%
              </div>
            ) : (
              <button
                onClick={handleUpload}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Send 📤
              </button>
            )}
          </div>
        )}

        {uploading && (
          <div style={{ 
            width: '100px', 
            height: '4px', 
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${uploadProgress}%`, 
              height: '100%', 
              backgroundColor: '#2563eb',
              transition: 'width 0.3s'
            }} />
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
        🔐 Files are encrypted with AES-GCM before sending
      </div>
    </div>
  );
}
