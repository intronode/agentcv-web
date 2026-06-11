'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface to console for ops diagnostics
    console.error('[AgentCV error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-2xl">
        ⚡
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-accent">Error</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
        A runtime error occurred. The data is fine — this is likely a transient issue.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-text-tertiary">digest: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
