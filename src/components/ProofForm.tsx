'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SubjectType } from '@/lib/db/types';

interface ProofFormProps {
  subjectType: SubjectType;
  subjectSlug: string;
  /** When true, the form opens automatically on mount (used by NextSteps CTA link). */
  defaultOpen?: boolean;
}

const inputClasses =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ISO date validation — cycle-09 / cycle-13 pattern: no native date picker
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidISODate(val: string): boolean {
  if (!ISO_DATE_RE.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export default function ProofForm({
  subjectType,
  subjectSlug,
  defaultOpen = false,
}: ProofFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  // Also open when the URL hash is #add-proof (NextSteps CTA anchor)
  useEffect(() => {
    if (defaultOpen) return; // already open
    if (typeof window !== 'undefined' && window.location.hash === '#add-proof') {
      setOpen(true);
    }
  }, [defaultOpen]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Controlled ISO date field (prefilled with today) — avoids native date-picker chrome
  const [entryDateDraft, setEntryDateDraft] = useState(todayIso());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Validate the controlled date field before submitting
    if (!isValidISODate(entryDateDraft.trim())) {
      setError('Entry date must be a valid date in YYYY-MM-DD format — e.g. 2024-03-15');
      return;
    }
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
          entryDate: entryDateDraft.trim(),
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
            setEntryDateDraft(todayIso());
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
            New entries are recorded as <span className="text-text-secondary">self-reported</span> —
            or <span className="text-blue-300">evidence-linked</span> if you attach a public
            evidence URL. Tiers are recomputed from the record.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select name="type" required className={inputClasses} defaultValue="task">
              {['task', 'incident', 'lesson', 'milestone', 'artifact'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="flex-1">
              {/* type=text — avoids native date-picker chrome (cycle-13 fix, same as cycle-09) */}
              <input
                name="entryDate"
                required
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                maxLength={10}
                value={entryDateDraft}
                onChange={(e) => setEntryDateDraft(e.target.value)}
                className={`font-mono ${inputClasses}`}
              />
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                ISO format — e.g. 2024-03-15. Day is required.
              </p>
            </div>
          </div>
          <input name="title" required placeholder="What happened?" className={inputClasses} />
          <textarea
            name="body"
            rows={3}
            placeholder="Details (optional)"
            className={inputClasses}
          />
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
              className="rounded-lg bg-accent-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover disabled:opacity-50"
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
