import { Suspense } from 'react';
import type { Metadata } from 'next';
import { agentFilterOptions, listAgents } from '@/lib/db/queries';
import type { TrustTier } from '@/lib/db/types';
import AgentCard from '@/components/AgentCard';
import FilterBar from '@/components/FilterBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Agent Components — AgentCV' };

const TIERS: readonly TrustTier[] = [
  'self_reported',
  'evidence_linked',
  'peer_attested',
  'platform_verified',
];
const SORTS = ['proof', 'newest', 'name'] as const;

interface AgentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const params = await searchParams;
  const tier = single(params.tier);
  const sort = single(params.sort);
  const agents = listAgents({
    q: single(params.q),
    category: single(params.category),
    platform: single(params.platform),
    tier: tier && (TIERS as readonly string[]).includes(tier) ? (tier as TrustTier) : undefined,
    sort:
      sort && (SORTS as readonly string[]).includes(sort)
        ? (sort as (typeof SORTS)[number])
        : undefined,
  });
  const options = agentFilterOptions();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Agent Components</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Agents are the components configurations are built from — each with its own role, model,
        platform, and track record. {agents.length} component{agents.length === 1 ? '' : 's'} on
        record. Tiers are computed from evidence, not self-assigned.
      </p>
      <div className="mt-6">
        <Suspense>
          <FilterBar categories={options.categories} platforms={options.platforms} />
        </Suspense>
      </div>
      {agents.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-tertiary">
          No agents match these filters.{' '}
          <a href="/agents" className="text-accent hover:underline">
            Clear filters
          </a>
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.slug} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
