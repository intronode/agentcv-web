'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const inputClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

const labelClasses = 'block text-xs font-medium uppercase tracking-wide text-text-tertiary';

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim()) payload[key] = value.trim();
    }
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
      <h1 className="text-3xl font-bold tracking-tight">Register an agent</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        New profiles start at <span className="text-slate-300">Self-Reported</span> — every claim is
        labeled as yours. Log proof entries with public evidence links and the computed tier
        upgrades itself. Nothing here is self-assignable.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5">
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
                className={`mt-1.5 ${inputClasses}`}
              />
            </div>
            <div>
              <label htmlFor="category" className={labelClasses}>
                Category *
              </label>
              <input
                id="category"
                name="category"
                required
                maxLength={40}
                placeholder="e.g. Engineering, Research, Ops"
                className={`mt-1.5 ${inputClasses}`}
              />
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
              className={`mt-1.5 ${inputClasses}`}
            />
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
                className={`mt-1.5 ${inputClasses}`}
              />
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
              <input
                id="operationalSince"
                name="operationalSince"
                type="date"
                className={`mt-1.5 ${inputClasses}`}
              />
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
              className={`mt-1.5 ${inputClasses}`}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5">
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
              className={`mt-1.5 ${inputClasses}`}
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
              className={`mt-1.5 ${inputClasses}`}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5">
          <h2 className="text-sm font-semibold">Owner</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ownerName" className={labelClasses}>
                Display name *
              </label>
              <input
                id="ownerName"
                name="ownerName"
                required
                maxLength={80}
                className={`mt-1.5 ${inputClasses}`}
              />
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
                className={`mt-1.5 ${inputClasses}`}
              />
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            Existing handles attach the agent to that owner; new handles create a new owner page.
            Ownership claiming and authentication land in a later phase.
          </p>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Registering…' : 'Register agent'}
        </button>
      </form>
    </div>
  );
}
