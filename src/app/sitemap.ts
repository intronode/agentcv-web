import type { MetadataRoute } from 'next';
import { listTeams, listAgents } from '@/lib/db/queries';
import { getDb } from '@/lib/db';

const BASE = 'https://agentcv.ai';

// Dynamic: enumerated from the live directory so new teams/agents/owners appear
// without a rebuild.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teams, agents, owners] = await Promise.all([
    listTeams(),
    listAgents(),
    getDb().prepare('SELECT handle FROM owners ORDER BY handle').all<{ handle: string }>(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/teams`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/agents`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/harness-engineering`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/compare`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/register/team`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/register/agent`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const teamRoutes: MetadataRoute.Sitemap = teams.map((t) => ({
    url: `${BASE}/teams/${t.slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  const agentRoutes: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${BASE}/agents/${a.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
  const ownerRoutes: MetadataRoute.Sitemap = owners.map((o) => ({
    url: `${BASE}/owners/${o.handle}`,
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  return [...staticRoutes, ...teamRoutes, ...agentRoutes, ...ownerRoutes];
}
