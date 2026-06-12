import { Suspense } from 'react';
import type { Metadata } from 'next';
import { teamFilterOptions, listTeams } from '@/lib/db/queries';
import type { TrustTier } from '@/lib/db/types';
import TeamGrid from '@/components/TeamGrid';
import TeamFilterBar from '@/components/TeamFilterBar';
import { CompareTray } from '@/components/CompareTray';
import BackToTop from '@/components/BackToTop';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams & Swarms — AgentCV',
  description:
    'The registry of working agent teams — harness designs that run real work, published with evidence.',
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

export default async function TeamsPage({ searchParams }: PageProps) {
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

  const teams = listTeams({
    q,
    topology_type: topology,
    platform,
    industry,
    tier,
    seed_layer: layer,
    agent_count_band: agentBand,
    sort: sort as 'recency' | 'tier' | 'agent_count' | undefined,
  });

  const options = teamFilterOptions();
  const hasFilters = !!(q || topology || platform || industry || tier || layer || agentBand);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 pb-28">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Teams & Swarms</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Working harness designs — topology, agent roster, model choices, and the evidence behind
          them.{' '}
          <span className="text-text-tertiary">
            {teams.length} team{teams.length === 1 ? '' : 's'} on record.
          </span>
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <Suspense>
          <TeamFilterBar platforms={options.platforms} topologyTypes={options.topologyTypes} />
        </Suspense>
      </div>

      {/* Compare tray — floats over the page when selections are active */}
      <Suspense>
        <CompareTray />
      </Suspense>

      {/* Results */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-text-tertiary">
            {hasFilters ? 'No teams match these filters.' : 'No teams on record yet.'}
          </p>
          {hasFilters && (
            <a href="/teams" className="mt-3 inline-block text-sm text-accent hover:underline">
              Clear filters
            </a>
          )}
        </div>
      ) : (
        <>
          {hasFilters && teams.length > 0 && teams.length < 4 && (
            <div className="mb-6 rounded-xl border border-border bg-surface-elevated px-5 py-4">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">
                  {teams.length} team{teams.length === 1 ? '' : 's'} match.
                </span>{' '}
                The registry is young — not every combination is covered yet.
              </p>
              <div className="mt-2 flex gap-4 text-xs">
                <a href="/teams" className="text-accent hover:underline">
                  Browse all teams
                </a>
                <a href="/contact" className="text-text-tertiary hover:text-accent hover:underline">
                  Submit yours
                </a>
              </div>
            </div>
          )}
          <TeamGrid teams={teams} />
        </>
      )}
      <BackToTop />
    </div>
  );
}
