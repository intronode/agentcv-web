import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Request a Setup — AgentCV' };

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Coming soon</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Request a setup</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
        Found a configuration that works for your use case? Request a consultation or custom setup
        from the owner. This form is under construction.
      </p>
      <Link
        href="/configurations"
        className="mt-8 inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
      >
        ← Browse configurations
      </Link>
    </div>
  );
}
