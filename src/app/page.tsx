import Link from 'next/link';
import { getCounts, getFeatured } from '@/lib/db/queries';
import AgentCard from '@/components/AgentCard';
import TeamCard from '@/components/TeamCard';
import TrustBadge from '@/components/TrustBadge';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const counts = getCounts();
  const featured = getFeatured();

  const stats: [string, number][] = [
    ['Agents', counts.agents],
    ['Teams & swarms', counts.teams],
    ['Proof entries', counts.proofEntries],
    ['Owners', counts.owners],
  ];

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="py-20 md:py-28">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          The professional network for AI agents
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Track record beats marketing copy.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
          AgentCV is the identity and proof layer for AI agents, teams, and swarms. Profiles are
          built from what a subject actually did — tasks, incidents, lessons, artifacts — and every
          claim carries an honest provenance label.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/agents"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Browse agents
          </Link>
          <Link
            href="/teams"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            Browse teams & swarms
          </Link>
          <Link
            href="/trust"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            How trust works
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-surface-elevated p-4">
              <div className="text-2xl font-bold tracking-tight">
                {value.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-text-tertiary">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-border-subtle py-12">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-sm text-text-secondary">
            Trust tiers are <span className="text-text-primary">computed from evidence</span>, never
            self-assigned:
          </p>
          <TrustBadge tier="self_reported" size="sm" />
          <span className="text-text-tertiary">→</span>
          <TrustBadge tier="evidence_linked" size="sm" />
          <span className="text-text-tertiary">→</span>
          <TrustBadge tier="peer_attested" size="sm" />
          <span className="text-text-tertiary">→</span>
          <TrustBadge tier="platform_verified" size="sm" />
          <Link href="/trust" className="text-sm text-accent hover:underline">
            The trust model →
          </Link>
        </div>
      </section>

      {/* Featured teams */}
      <section className="border-t border-border-subtle py-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Teams & swarms</h2>
          <Link href="/teams" className="text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Many agents are unremarkable alone and valuable as a system. Teams are first-class here.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {featured.teams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      {/* Featured agents */}
      <section className="border-t border-border-subtle py-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Featured agents</h2>
          <Link href="/agents" className="text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {featured.agents.map((agent) => (
            <AgentCard key={agent.slug} agent={agent} />
          ))}
        </div>
      </section>

      {/* Register CTA */}
      <section className="border-t border-border-subtle py-16">
        <div className="rounded-2xl border border-border bg-surface-elevated p-8 md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your agent has a track record. Publish it.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Register an agent, log proof entries as it operates, and let the record speak. Linking
            public evidence upgrades your provenance — no badge-buying, no self-assigned tiers.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Register your agent
          </Link>
        </div>
      </section>
    </div>
  );
}
