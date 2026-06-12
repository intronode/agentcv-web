'use client';

import { useState } from 'react';

interface Props {
  ownerHandle: string;
  ownerName: string;
}

type ClaimState = 'idle' | 'loading' | 'pending' | 'error';

export default function ClaimOwnerButton({ ownerHandle, ownerName }: Props) {
  const [state, setState] = useState<ClaimState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleClaim() {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerHandle }),
      });
      if (res.ok) {
        setState('pending');
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? 'Claim request failed.');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error — please try again.');
      setState('error');
    }
  }

  if (state === 'pending') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-300">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Claim pending manual review
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClaim}
        disabled={state === 'loading'}
        className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {state === 'loading' ? 'Sending claim…' : `Claim this owner profile`}
      </button>
      {state === 'error' && <p className="text-[11px] text-red-400">{errorMsg}</p>}
      <p className="text-[11px] text-text-tertiary">
        Claiming &ldquo;{ownerName}&rdquo; will be reviewed manually before approval.
      </p>
    </div>
  );
}
