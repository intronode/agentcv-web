'use client';

/**
 * ConfidentialTermsManager — owner-only "Confidential terms" section.
 *
 * Renders in the owner profile page when the signed-in user owns the profile.
 * Allows the owner to add and remove terms from their deny-list.
 * Terms are stored encrypted at rest (AES-256-GCM via SANITIZER_KEY).
 * The GET API returns only IDs + created_at; the raw term values are never
 * sent back to the client after being saved.
 *
 * Spec: SANITIZER.md §5.3.1, §8
 */

import { useState, useCallback, useEffect } from 'react';

interface TermEntry {
  id: number;
  created_at: string;
  /** label shown in UI — set to the term value at add-time; after a page reload
   * only the ordinal (Term #N) is shown because the encrypted value is never returned. */
  label?: string;
}

interface Props {
  ownerHandle: string;
  initialCount: number;
  initialTerms: Array<{ id: number; created_at: string }>;
}

export default function ConfidentialTermsManager({
  ownerHandle,
  initialCount,
  initialTerms,
}: Props) {
  const [terms, setTerms] = useState<TermEntry[]>(
    initialTerms.map((t) => ({ id: t.id, created_at: t.created_at }))
  );
  // configured: whether SANITIZER_KEY is set on the server (determined via GET response)
  const [configured, setConfigured] = useState<boolean | null>(null);

  // Refresh configured flag from GET response on mount
  useEffect(() => {
    fetch(`/api/owners/${ownerHandle}/confidential-terms`)
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => {
        setConfigured(data.configured ?? false);
      })
      .catch(() => setConfigured(false));
  }, [ownerHandle]);
  const [inputValue, setInputValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const termCount = terms.length || initialCount;

  const handleAdd = useCallback(async () => {
    const term = inputValue.trim();
    if (!term) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch(`/api/owners/${ownerHandle}/confidential-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setAddError(data.error ?? 'Failed to add term.');
        return;
      }
      const created = (await res.json()) as { id: number };
      setTerms((prev) => [
        ...prev,
        {
          id: created.id,
          created_at: new Date().toISOString(),
          label: term,
        },
      ]);
      setInputValue('');
    } catch {
      setAddError('Network error — please try again.');
    } finally {
      setAdding(false);
    }
  }, [ownerHandle, inputValue]);

  const handleDelete = useCallback(
    async (termId: number) => {
      setDeletingIds((prev) => new Set(prev).add(termId));
      try {
        const res = await fetch(`/api/owners/${ownerHandle}/confidential-terms/${termId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setTerms((prev) => prev.filter((t) => t.id !== termId));
        }
      } catch {
        // ignore — term stays in list
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(termId);
          return next;
        });
      }
    },
    [ownerHandle]
  );

  return (
    <section
      id="confidential-terms"
      className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-amber-200">Confidential terms</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-tertiary">
            Client names, partner names, and project codenames the scanner should always flag. Terms
            are encrypted at rest and never displayed after saving.
          </p>
        </div>
        <span className="shrink-0 rounded border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
          {termCount} term{termCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Term list */}
      {terms.length === 0 ? (
        <p className="mb-4 text-[11px] text-text-tertiary">
          No terms added yet. Add client names, partner names, or project codenames to ensure the
          scanner flags them before files are published.
        </p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {terms.map((t, idx) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/10 bg-surface px-3 py-2"
            >
              <span className="text-xs text-text-secondary">
                {t.label ? (
                  <>
                    <span className="font-medium text-amber-200">{t.label}</span>
                    <span className="ml-2 text-[10px] text-text-tertiary">
                      (hidden after page reload)
                    </span>
                  </>
                ) : (
                  <span className="font-medium text-text-primary">Term #{idx + 1}</span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Remove term ${t.label ?? `#${idx + 1}`}`}
                disabled={deletingIds.has(t.id)}
                onClick={() => handleDelete(t.id)}
                className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                {deletingIds.has(t.id) ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Not-configured notice — shown when SANITIZER_KEY is absent on the server */}
      {configured === false && (
        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
          <span className="font-semibold">SANITIZER_KEY not configured.</span> Terms are encrypted
          at rest — the server needs a 64-hex SANITIZER_KEY env var before new terms can be stored.
          Existing terms are listed above. See{' '}
          <span className="font-mono text-amber-200">docs/SANITIZER.md §10.3</span> for setup.
        </p>
      )}

      {/* Add form */}
      <div className="flex gap-2">
        <input
          id="confidential-term-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !adding) void handleAdd();
          }}
          placeholder="e.g. Initech or Acme Corp"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
          maxLength={200}
          aria-label="Confidential term to add"
          disabled={configured === false}
        />
        <button
          type="button"
          disabled={adding || inputValue.trim().length === 0 || configured === false}
          onClick={() => void handleAdd()}
          className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
      {addError && <p className="mt-1.5 text-[11px] text-red-400">{addError}</p>}

      <p className="mt-3 text-[10px] leading-relaxed text-text-tertiary">
        The scanner flags these terms in any file owned by this profile before allowing publication.
        After adding a term, re-scan files that may contain it. If a scanner finding matches both
        this deny-list and the proximity detector, the deny-list finding is shown (deduplication:
        highest-priority sub-pass wins).
      </p>
    </section>
  );
}
