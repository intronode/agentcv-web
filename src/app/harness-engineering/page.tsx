import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Harness Engineering — AgentCV' };

export default function HarnessEngineeringPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Explainer</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">What is harness engineering?</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
        Agent = Model + Harness. The model is rented — you choose from whatever the market offers.
        The harness is what you own: the topology, roles, tools, memory design, context
        architecture, and handoff protocol that determines how much of that model&apos;s capability
        actually reaches real work.
      </p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
        The full explainer — formalized definition, benchmark evidence, M^N composition problem, and
        the practitioner gap — is in progress. Check back soon.
      </p>
      <Link
        href="/configurations"
        className="mt-8 inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
      >
        Browse configurations →
      </Link>
    </div>
  );
}
