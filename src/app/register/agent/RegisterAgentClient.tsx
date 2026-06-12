'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

const labelClasses = 'block text-xs font-medium uppercase tracking-wide text-text-tertiary';

// ISO date validation — identical pattern to /submit cycle-09 solution
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidISODate(val: string): boolean {
  if (!ISO_DATE_RE.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export interface SessionUser {
  id?: string;
  name: string | null;
  email: string | null;
}

interface Props {
  sessionUser?: SessionUser | null;
  agentCategories?: string[];
}

export default function RegisterAgentClient({ sessionUser, agentCategories = [] }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ownerName, setOwnerName] = useState(sessionUser?.name ?? '');
  // Controlled state for the ISO date field (cycle-09 pattern — no native date picker)
  const [opSinceDraft, setOpSinceDraft] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim()) payload[key] = value.trim();
    }
    if (ownerName.trim()) payload['ownerName'] = ownerName.trim();
    // Inject controlled date value (not in FormData because it's controlled)
    if (opSinceDraft.trim()) payload['operationalSince'] = opSinceDraft.trim();

    // Client-side required field check
    const errs: Record<string, string> = {};
    if (!payload['name']) errs['name'] = 'Name is required';
    if (!payload['tagline']) errs['tagline'] = 'Tagline is required';
    if (!payload['category']) errs['category'] = 'Category is required';
    if (!payload['platform']) errs['platform'] = 'Platform is required';
    if (!payload['ownerName']) errs['ownerName'] = 'Owner display name is required';
    if (!payload['ownerHandle']) errs['ownerHandle'] = 'Owner handle is required';
    if (opSinceDraft.trim() && !isValidISODate(opSinceDraft.trim())) {
      errs['operationalSince'] = 'Use YYYY-MM-DD format — e.g. 2024-03-15';
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      // Scroll to TOP so the first errors (Name, Tagline) are visible in frame
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok || !data.slug) {
        setError(data.error ?? 'Registration failed');
        setSubmitting(false);
        return;
      }
      router.push(`/agents/${data.slug}`);
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-6 text-xs text-text-tertiary">
        <Link href="/register" className="hover:text-text-primary transition-colors">
          Register
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-secondary">Agent</span>
      </nav>

      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Register</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Register an agent</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        A single AI agent profile — model, platform, role, and what it does. New profiles start at{' '}
        <span className="text-slate-300">Self-Reported</span> — every claim is labeled as yours. Log
        proof entries with public evidence links and the computed tier upgrades itself. Nothing here
        is self-assignable.
      </p>

      {sessionUser && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-text-secondary">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-accent"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>
            Signed in as{' '}
            <span className="font-medium text-text-primary">
              {sessionUser.name ?? sessionUser.email ?? 'you'}
            </span>{' '}
            — this submission will be linked to your account.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <section
          id="section-identity"
          className="scroll-mt-32 space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">Identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClasses}>
                Agent name *
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. Atlas"
                className={`mt-1.5 ${inputClasses} ${fieldErrors['name'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['name'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['name']}</p>
              )}
            </div>
            <div>
              <label htmlFor="category" className={labelClasses}>
                Category *
              </label>
              {agentCategories.length > 0 && (
                <datalist id="agent-category-suggestions">
                  {agentCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
              <input
                id="category"
                name="category"
                required
                maxLength={40}
                placeholder="e.g. Engineering, Research, Ops"
                list={agentCategories.length > 0 ? 'agent-category-suggestions' : undefined}
                className={`mt-1.5 ${inputClasses} ${fieldErrors['category'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['category'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['category']}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tagline" className={labelClasses}>
              Tagline *
            </label>
            <input
              id="tagline"
              name="tagline"
              required
              maxLength={200}
              placeholder="One sentence: what does it actually do?"
              className={`mt-1.5 ${inputClasses} ${fieldErrors['tagline'] ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors['tagline'] && (
              <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['tagline']}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="platform" className={labelClasses}>
                Platform *
              </label>
              <input
                id="platform"
                name="platform"
                required
                maxLength={40}
                placeholder="OpenClaw, Claude Code, …"
                className={`mt-1.5 ${inputClasses} ${fieldErrors['platform'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['platform'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['platform']}</p>
              )}
            </div>
            <div>
              <label htmlFor="model" className={labelClasses}>
                Model
              </label>
              <input
                id="model"
                name="model"
                maxLength={80}
                placeholder="optional"
                className={`mt-1.5 ${inputClasses}`}
              />
            </div>
            <div>
              <label htmlFor="operationalSince" className={labelClasses}>
                Operating since
              </label>
              {/* type=text instead of type=date — avoids native date-picker chrome that
                  breaks the dark design language. Cycle-09 pattern: ISO text input. */}
              <input
                id="operationalSince"
                name="operationalSince"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                maxLength={10}
                value={opSinceDraft}
                onChange={(e) => setOpSinceDraft(e.target.value)}
                className={`mt-1.5 font-mono ${inputClasses} ${fieldErrors['operationalSince'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['operationalSince'] ? (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['operationalSince']}</p>
              ) : (
                <p className="mt-0.5 text-[11px] text-text-tertiary">
                  ISO format — e.g. 2024-03-15. Day is required.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="about" className={labelClasses}>
              About
            </label>
            <textarea
              id="about"
              name="about"
              rows={3}
              maxLength={4000}
              placeholder="What it does, for whom, and within what limits."
              className={`mt-1.5 ${inputClasses} resize-y`}
            />
          </div>
        </section>

        <section
          id="section-how-built"
          className="scroll-mt-32 space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">How it&apos;s built</h2>
          <div>
            <label htmlFor="howBuilt" className={labelClasses}>
              Architecture
            </label>
            <textarea
              id="howBuilt"
              name="howBuilt"
              rows={3}
              maxLength={4000}
              placeholder="Operational DNA: runtime, memory, routing — the plans, not the house."
              className={`mt-1.5 ${inputClasses} resize-y`}
            />
          </div>
          <div>
            <label htmlFor="oversight" className={labelClasses}>
              Oversight model
            </label>
            <textarea
              id="oversight"
              name="oversight"
              rows={2}
              maxLength={1000}
              placeholder="What requires a human? What is autonomous?"
              className={`mt-1.5 ${inputClasses} resize-y`}
            />
          </div>
        </section>

        <section
          id="section-owner"
          className="scroll-mt-32 space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">Owner</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ownerName" className={labelClasses}>
                Display name *
              </label>
              {sessionUser?.name && (
                <p className="mt-0.5 text-[11px] text-accent/80">
                  Prefilled from your account — edit if different.
                </p>
              )}
              <input
                id="ownerName"
                name="ownerName"
                required
                maxLength={80}
                placeholder="Your name or org"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={`mt-1.5 ${inputClasses} ${fieldErrors['ownerName'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['ownerName'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['ownerName']}</p>
              )}
            </div>
            <div>
              <label htmlFor="ownerHandle" className={labelClasses}>
                Handle *
              </label>
              <input
                id="ownerHandle"
                name="ownerHandle"
                required
                maxLength={40}
                placeholder="lowercase, no spaces"
                className={`mt-1.5 ${inputClasses} ${fieldErrors['ownerHandle'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['ownerHandle'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['ownerHandle']}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            Existing handles attach the agent to that owner; new handles create a new owner page.
            {sessionUser
              ? ' This submission will be linked to your account.'
              : ' Sign in to automatically link submissions to your account.'}
          </p>
        </section>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent-button px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register agent'}
          </button>
          <Link
            href="/register"
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            ← Back to chooser
          </Link>
        </div>
      </form>
    </div>
  );
}
