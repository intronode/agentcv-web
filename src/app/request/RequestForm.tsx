'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RefConfig {
  slug: string;
  name: string;
}

interface RequestFormProps {
  refConfig: RefConfig | null;
}

type FormState = 'idle' | 'submitting' | 'done' | 'error';

const inputClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

const labelClasses = 'block text-xs font-medium uppercase tracking-wide text-text-tertiary';

export default function RequestForm({ refConfig }: RequestFormProps) {
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState('submitting');
    setError('');

    const payload: Record<string, unknown> = {
      kind: 'request_setup',
      requesterName: (form.get('requesterName') as string | null)?.trim() ?? '',
      requesterEmail: (form.get('requesterEmail') as string | null)?.trim() ?? '',
      message: (form.get('message') as string | null)?.trim() ?? '',
    };

    // Attach subject reference if we have one.
    if (refConfig) {
      payload['subjectType'] = 'configuration';
      payload['subjectSlug'] = refConfig.slug;
    }

    const orgRaw = (form.get('org') as string | null)?.trim();
    if (orgRaw) {
      // Append org to message since contact schema has no org field.
      payload['message'] = `[Org: ${orgRaw}]\n\n${payload['message'] as string}`;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        id?: number;
        error?: { message?: string } | string;
      };

      if (!res.ok || data.id === undefined) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : ((data.error as { message?: string })?.message ?? 'Request failed');
        setError(msg);
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
      <div className="mt-8 space-y-5">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-300">Request #{requestId} recorded.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-200/80">
            Routed to Intronode.{' '}
            {refConfig && (
              <>
                Referenced configuration:{' '}
                <Link
                  href={`/configurations/${refConfig.slug}`}
                  className="font-medium underline underline-offset-2 hover:text-emerald-100"
                >
                  {refConfig.name}
                </Link>
                .{' '}
              </>
            )}
            Every request is read by a person. Intronode replies directly — no automated funnel.
          </p>
        </div>
        <Link
          href="/configurations"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Browse more configurations
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      {/* Referenced configuration card */}
      {refConfig && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-xs text-text-tertiary">Referencing configuration</p>
          <Link
            href={`/configurations/${refConfig.slug}`}
            className="mt-0.5 block text-sm font-semibold text-text-primary hover:text-accent"
          >
            {refConfig.name}
          </Link>
          <p className="mt-1 text-[11px] text-text-tertiary">
            This request will be linked to the configuration above.
          </p>
        </div>
      )}

      {!refConfig && (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-text-tertiary">
          No specific configuration referenced. Describe what you need and Intronode will suggest
          the best fit.{' '}
          <Link href="/configurations" className="text-accent hover:underline">
            Browse configurations
          </Link>{' '}
          to reference one.
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5">
        <h2 className="text-sm font-semibold">Your details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="requesterName" className={labelClasses}>
              Your name *
            </label>
            <input
              id="requesterName"
              name="requesterName"
              required
              maxLength={80}
              placeholder="Full name"
              className={`mt-1.5 ${inputClasses}`}
            />
          </div>
          <div>
            <label htmlFor="requesterEmail" className={labelClasses}>
              Email *
            </label>
            <input
              id="requesterEmail"
              name="requesterEmail"
              required
              type="email"
              maxLength={200}
              placeholder="you@example.com"
              className={`mt-1.5 ${inputClasses}`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="org" className={labelClasses}>
            Organization
          </label>
          <input
            id="org"
            name="org"
            maxLength={120}
            placeholder="Optional — company or project name"
            className={`mt-1.5 ${inputClasses}`}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5">
        <h2 className="text-sm font-semibold">What you need</h2>

        <div>
          <label htmlFor="message" className={labelClasses}>
            Describe your work *
          </label>
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            What are you trying to build or run? What does success look like? The more specific, the
            better the match.
          </p>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            maxLength={4000}
            placeholder="e.g. We run a software agency and want to automate PR review and deployment monitoring across 12 repos. We need an orchestrator that can manage specialist agents per domain."
            className={`mt-1.5 ${inputClasses} resize-y`}
          />
        </div>
      </section>

      {state === 'error' && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {state === 'submitting' ? 'Sending…' : 'Send request'}
        </button>
        <p className="text-xs text-text-tertiary">
          Every request is read by a person. Intronode replies directly — no automated funnel.
        </p>
      </div>
    </form>
  );
}
