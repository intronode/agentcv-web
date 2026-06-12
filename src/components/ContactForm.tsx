'use client';

import { useState } from 'react';
import type { ContactSubjectType } from '@/lib/db/types';

interface ContactFormProps {
  subjectType: ContactSubjectType;
  subjectSlug: string;
  subjectName: string;
}

type FormState = 'idle' | 'submitting' | 'done' | 'error';

const inputClasses =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

export default function ContactForm({ subjectType, subjectSlug, subjectName }: ContactFormProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState('submitting');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectType,
          subjectSlug,
          requesterName: form.get('name'),
          requesterEmail: form.get('email'),
          message: form.get('message'),
        }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || data.id === undefined) {
        setError(data.error ?? 'Request failed');
        setState('error');
        return;
      }
      setRequestId(data.id);
      setState('done');
    } catch {
      setError('Network error');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
        Contact request #{requestId} recorded. The owner of {subjectName} can follow up by email.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-accent-button px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover"
      >
        Contact owner about {subjectName}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4"
    >
      <p className="text-sm font-medium text-text-primary">Contact owner about {subjectName}</p>
      <input name="name" required placeholder="Your name" className={inputClasses} />
      <input name="email" required type="email" placeholder="Your email" className={inputClasses} />
      <textarea
        name="message"
        required
        rows={4}
        placeholder="What do you want to build or run?"
        className={inputClasses}
      />
      {state === 'error' && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="rounded-lg bg-accent-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover disabled:opacity-50"
        >
          {state === 'submitting' ? 'Sending…' : 'Send request'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
