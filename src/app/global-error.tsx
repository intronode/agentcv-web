'use client';

import { useEffect } from 'react';

/**
 * Root error boundary — replaces the WHOLE document (including the root layout)
 * when the layout itself or a top-level render throws. Because the normal
 * layout (and globals.css) is bypassed here, styles are inlined so the page
 * still looks intentional. Routine route errors use app/error.tsx instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AgentCV global error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: '#0a0a0a',
          color: '#fafafa',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.15em', color: '#818cf8' }}>
          ERROR
        </p>
        <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: '24rem', fontSize: '0.875rem', color: '#a1a1aa' }}>
          A top-level error occurred. The data is fine — this is likely a transient issue.
        </p>
        {error.digest && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', fontFamily: 'monospace' }}>
            digest: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={reset}
            style={{
              borderRadius: '0.5rem',
              border: 'none',
              background: '#4f46e5',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              borderRadius: '0.5rem',
              border: '1px solid #3f3f46',
              color: '#fafafa',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
