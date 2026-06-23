'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          color: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid rgba(96, 165, 250, 0.35)',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.25)',
          fontSize: '14px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: { primary: '#34d399', secondary: '#1e3a8a' },
          style: {
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: '#ecfdf5',
            border: '1px solid rgba(52, 211, 153, 0.4)',
          },
        },
        error: {
          iconTheme: { primary: '#f87171', secondary: '#1e3a8a' },
          style: {
            background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
            color: '#fef2f2',
            border: '1px solid rgba(248, 113, 113, 0.4)',
          },
        },
      }}
    />
  );
}
