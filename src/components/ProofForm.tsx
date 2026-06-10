'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubjectType } from '@/lib/db/types';

interface ProofFormProps {
  subjectType: SubjectType;
  subjectSlug: string;
}

const inputClasses =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

export default function ProofForm({ subjectType, subjectSlug }: ProofFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectType,
          subjectSlug,
          type: form.get('type'),
          title: form.get('title'),
          body: form.get('body') || undefined,
          evidenceUrl: form.get('evidenceUrl') || undefined,
          entryDate: form.get('entryDate'),
        }),
      });
      const data = (await res.json()) as { id?: number; tier?: string; error?: string };
      if (!res.ok || data.id === undefined) {
        setError(data.error ?? 'Request failed');
        return;
      }
      setNotice(`Entry #${data.id} recorded. Computed trust tier is now: ${data.tier}.`);
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
          {notice}
        </p>
      )}
      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setNotice('');
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          + Add proof entry
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4"
        >
          <p className="text-xs text-text-tertiary">
            New entries are recorded as <span className="text-text-secondary">self-reported</span>{' '}
            — or <span className="text-blue-300">evidence-linked</span> if you attach a public
            evidence URL. Tiers are recomputed from the record.
          </p>
          <div className="flex gap-2">
            <select name="type" required className={inputClasses} defaultValue="task">
              {['task', 'incident', 'lesson', 'milestone', 'artifact'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="entryDate"
              required
              type="date"
              defaultValue="2026-06-11"
              className={inputClasses}
            />
          </div>
          <input name="title" required placeholder="What happened?" className={inputClasses} />
          <textarea name="body" rows={3} placeholder="Details (optional)" className={inputClasses} />
          <input
            name="evidenceUrl"
            type="url"
            placeholder="Evidence URL (optional — upgrades provenance)"
            className={inputClasses}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? 'Recording…' : 'Record entry'}
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
      )}
    </div>
  );
}
