import { NextResponse } from 'next/server';
import { listTeams, registerTeam } from '@/lib/db/queries';
import type { TrustTier } from '@/lib/db/types';
import {
  ValidationError,
  readJsonBody,
  reqStr,
  optStr,
  optInt,
  optArr,
  DATE_PATTERN,
} from '@/lib/validate';

export const dynamic = 'force-dynamic';

const TOPOLOGY_TYPES = [
  'orchestrator_worker',
  'supervisor',
  'swarm',
  'pipeline',
  'router',
  'solo_plus_tools',
  'other',
] as const;

const TIERS: readonly TrustTier[] = [
  'self_reported',
  'evidence_linked',
  'peer_attested',
  'platform_verified',
];

const SEED_LAYERS = ['real', 'curated', 'illustrative'] as const;

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const tierParam = params.get('tier');
  const seedParam = params.get('seed_layer');
  const bandParam = params.get('agent_count_band');

  const teams = listTeams({
    q: params.get('q') ?? undefined,
    topology_type: params.get('topology_type') ?? undefined,
    platform: params.get('platform') ?? undefined,
    industry: params.get('industry') ?? undefined,
    tier:
      tierParam && (TIERS as readonly string[]).includes(tierParam)
        ? (tierParam as TrustTier)
        : undefined,
    seed_layer:
      seedParam && (SEED_LAYERS as readonly string[]).includes(seedParam) ? seedParam : undefined,
    agent_count_band:
      bandParam === '1-2' || bandParam === '3-5' || bandParam === '6+' ? bandParam : undefined,
    sort:
      params.get('sort') === 'recency'
        ? 'recency'
        : params.get('sort') === 'tier'
          ? 'tier'
          : params.get('sort') === 'agent_count'
            ? 'agent_count'
            : undefined,
  });
  return NextResponse.json({ teams });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);

    // Parse members array if provided
    let members: { agentSlug: string; role: string }[] | undefined;
    const rawMembers = body['members'];
    if (rawMembers !== undefined && rawMembers !== null) {
      if (!Array.isArray(rawMembers)) {
        throw new ValidationError('members must be an array');
      }
      if (rawMembers.length > 20) {
        throw new ValidationError('members must have at most 20 items');
      }
      members = rawMembers.map((m: unknown, i: number) => {
        if (typeof m !== 'object' || m === null) {
          throw new ValidationError(`members[${i}] must be an object`);
        }
        const obj = m as Record<string, unknown>;
        if (typeof obj['agentSlug'] !== 'string' || !obj['agentSlug']) {
          throw new ValidationError(`members[${i}].agentSlug is required`);
        }
        if (typeof obj['role'] !== 'string' || !obj['role']) {
          throw new ValidationError(`members[${i}].role is required`);
        }
        return {
          agentSlug: (obj['agentSlug'] as string).trim().slice(0, 80),
          role: (obj['role'] as string).trim().slice(0, 80),
        };
      });
    }

    const result = registerTeam({
      name: reqStr(body, 'name', { max: 80 }),
      tagline: reqStr(body, 'tagline', { max: 200 }),
      topologyType: optStr(body, 'topologyType', { oneOf: TOPOLOGY_TYPES }),
      platform: optStr(body, 'platform', { max: 60 }),
      agentCount: optInt(body, 'agentCount', { min: 1, max: 50 }),
      industries: optArr(body, 'industries', { maxItems: 10, maxItemLength: 40 }),
      taskKinds: optArr(body, 'taskKinds', { maxItems: 10, maxItemLength: 40 }),
      topology: optStr(body, 'topology', { max: 2000 }),
      whyItWorks: optStr(body, 'whyItWorks', { max: 4000 }),
      howBuilt: optStr(body, 'howBuilt', { max: 4000 }),
      oversight: optStr(body, 'oversight', { max: 2000 }),
      operationalSince: optStr(body, 'operationalSince', {
        pattern: DATE_PATTERN,
        patternHint: 'must be YYYY-MM-DD',
      }),
      ownerName: reqStr(body, 'ownerName', { max: 80 }),
      ownerHandle: reqStr(body, 'ownerHandle', { max: 40 }),
      members,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Unknown agent:')) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }
    console.error('POST /api/teams failed:', error);
    return NextResponse.json({ error: { message: 'Internal error' } }, { status: 500 });
  }
}
