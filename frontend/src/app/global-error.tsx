'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              padding: '2rem',
              background: '#fff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
            }}
          >
            <p style={{ fontSize: '2rem', margin: '0 0 1rem' }}>⚠️</p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Application Error
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              A critical error occurred. Please refresh the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1.25rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
