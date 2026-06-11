import { Suspense } from 'react';
import type { Metadata } from 'next';
import { configurationFilterOptions, listConfigurations } from '@/lib/db/queries';
import type { TrustTier } from '@/lib/db/types';
import ConfigurationCard from '@/components/ConfigurationCard';
import ConfigurationFilterBar from '@/components/ConfigurationFilterBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Configurations — AgentCV',
  description:
    'The registry of working agent configurations — harness designs that run real work, published with evidence.',
};

const VALID_TIERS: readonly TrustTier[] = [
  'self_reported',
  'evidence_linked',
  'peer_attested',
  'platform_verified',
];
const VALID_SORTS = ['featured', 'recency', 'tier', 'agent_count'] as const;
const VALID_BANDS = ['1-2', '3-5', '6+'] as const;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

export default async function ConfigurationsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = single(params.q);
  const topology = single(params.topology);
  const platform = single(params.platform);
  const industry = single(params.industry);
  const tierRaw = single(params.tier);
  const tier =
    tierRaw && (VALID_TIERS as readonly string[]).includes(tierRaw)
      ? (tierRaw as TrustTier)
      : undefined;
  const layer = single(params.layer);
  const agentsRaw = single(params.agents);
  const agentBand =
    agentsRaw && (VALID_BANDS as readonly string[]).includes(agentsRaw)
      ? (agentsRaw as (typeof VALID_BANDS)[number])
      : undefined;
  const sortRaw = single(params.sort);
  const sort =
    sortRaw && (VALID_SORTS as readonly string[]).includes(sortRaw)
      ? (sortRaw as (typeof VALID_SORTS)[number])
      : undefined;

  const configurations = listConfigurations({
    q,
    topology_type: topology,
    platform,
    industry,
    tier,
    seed_layer: layer,
    agent_count_band: agentBand,
    sort: sort as 'recency' | 'tier' | 'agent_count' | undefined,
  });

  const options = configurationFilterOptions();
  const hasFilters = !!(q || topology || platform || industry || tier || layer || agentBand);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Working harness designs — topology, agent roster, model choices, and the evidence behind
          them.{' '}
          <span className="text-text-tertiary">
            {configurations.length} configuration{configurations.length === 1 ? '' : 's'} on record.
          </span>
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <Suspense>
          <ConfigurationFilterBar
            platforms={options.platforms}
            topologyTypes={options.topologyTypes}
          />
        </Suspense>
      </div>

      {/* Results */}
      {configurations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-text-tertiary">
            {hasFilters
              ? 'No configurations match these filters.'
              : 'No configurations on record yet.'}
          </p>
          {hasFilters && (
            <a
              href="/configurations"
              className="mt-3 inline-block text-sm text-accent hover:underline"
            >
              Clear filters
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configurations.map((config) => (
            <ConfigurationCard key={config.slug} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
