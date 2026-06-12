'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubjectType, TrustTier } from '@/lib/db/types';

interface AttestationFormProps {
  subjectType: SubjectType;
  subjectSlug: string;
  /** Displayed in copy ("Attest to this configuration" vs "Attest to this agent") */
  subjectLabel?: string;
  /**
   * Current evidence count for the subject — used to honestly explain the tier rule.
   * The form states the real computeTier rule:
   *   peer_attested = evidence_linked AND attestation_count >= 1
   * i.e. adding an attestation alone is only enough if evidence >= 3 already.
   */
  evidenceCount: number;
}

type FormState = 'idle' | 'submitting' | 'done' | 'error';

const inputClasses =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

const PRESET_RELATIONSHIPS = [
  'used this configuration',
  'collaborated',
  'audited',
  'deployed this agent',
  'reviewed this agent',
  'worked alongside',
  'commissioned this build',
  'other',
];

const STATEMENT_MIN = 40;
const STATEMENT_MAX = 1000;

export default function AttestationForm({
  subjectType,
  subjectSlug,
  subjectLabel,
  evidenceCount,
}: AttestationFormProps) {
  const router = useRouter();
  const label = subjectLabel ?? subjectType;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statement, setStatement] = useState('');
  const [relationship, setRelationship] = useState(PRESET_RELATIONSHIPS[0]);
  const [customRelationship, setCustomRelationship] = useState('');

  // Real tier rule: evidence_count >= 3 AND attestation_count >= 1 → peer_attested
  const evidenceThreshold = 3;
  const willUnlockTier = evidenceCount >= evidenceThreshold;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const disclosureChecked = form.get('disclosure') === 'on';
    if (!disclosureChecked) {
      setError('You must confirm first-hand experience before submitting.');
      return;
    }

    const effectiveRelationship =
      relationship === 'other' ? customRelationship.trim() : relationship;

    setState('submitting');
    setError('');

    try {
      const res = await fetch('/api/attestations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectType,
          subjectSlug,
          author_name: form.get('author_name'),
          author_url: form.get('author_url') || undefined,
          relationship: effectiveRelationship,
          statement,
          disclosure: true,
        }),
      });
      const data = (await res.json()) as { id?: number; tier?: TrustTier; error?: string };
      if (!res.ok || data.id === undefined) {
        setError(data.error ?? 'Request failed');
        setState('error');
        return;
      }
      const tierMsg = data.tier === 'peer_attested' ? ' This subject is now Peer-Attested.' : '';
      setNotice(
        `Attestation #${data.id} recorded. Trust tier: ${data.tier ?? 'unchanged'}.${tierMsg}`
      );
      setOpen(false);
      setState('done');
      router.refresh();
    } catch {
      setError('Network error');
      setState('error');
    } finally {
      if (state === 'submitting') setState('idle');
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
            setState('idle');
            setError('');
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          + Attest to this {label}
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4"
        >
          <p className="text-xs font-medium text-text-primary">Attest to this {label}</p>
          <p className="text-xs leading-relaxed text-text-tertiary">
            Attestations are named third-party statements — they are what separates Peer-Attested
            from Evidence-Linked.{' '}
            {willUnlockTier ? (
              <span className="text-blue-300">
                This subject already has {evidenceCount} evidence-linked proof entries — your
                attestation will unlock Peer-Attested tier.
              </span>
            ) : (
              <span>
                Note: Peer-Attested tier requires both{' '}
                <span className="text-text-secondary">
                  {evidenceThreshold}+ evidence-linked proof entries
                </span>{' '}
                and at least one attestation. This subject currently has {evidenceCount} evidence-
                linked {evidenceCount === 1 ? 'entry' : 'entries'} — attesting alone will not change
                the tier until evidence reaches {evidenceThreshold}.
              </span>
            )}
          </p>

          <input
            name="author_name"
            required
            placeholder="Your name (public)"
            maxLength={120}
            className={inputClasses}
          />
          <input
            name="author_url"
            type="url"
            placeholder="Your URL (optional — LinkedIn, GitHub, personal site)"
            className={inputClasses}
          />

          <div>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className={inputClasses}
            >
              {PRESET_RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {relationship === 'other' && (
              <input
                className={`${inputClasses} mt-2`}
                placeholder="Describe your relationship (required)"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                maxLength={120}
                required
              />
            )}
          </div>

          <div>
            <textarea
              rows={4}
              required
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Your statement (minimum 40 characters — be substantive, not just '+1')"
              className={inputClasses}
            />
            <div className="mt-1 flex justify-end text-[10px] text-text-tertiary">
              <span className={statement.length < STATEMENT_MIN ? 'text-orange-400' : ''}>
                {statement.length}
              </span>
              /{STATEMENT_MAX}
              {statement.length < STATEMENT_MIN && (
                <span className="ml-1 text-orange-400">
                  · {STATEMENT_MIN - statement.length} more needed
                </span>
              )}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              name="disclosure"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span className="text-xs leading-relaxed text-text-secondary">
              I have first-hand experience with this {label} and this statement is accurate.
              Attestations are public and carry my name. AgentCV does not independently verify
              attestor identity at launch — your name is your accountability.
            </span>
          </label>

          {(state === 'error' || error) && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={state === 'submitting'}
              className="rounded-lg bg-accent-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover disabled:opacity-50"
            >
              {state === 'submitting' ? 'Recording…' : 'Submit attestation'}
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
