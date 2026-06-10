import { NextResponse } from 'next/server';
import { listAgents, registerAgent } from '@/lib/db/queries';
import type { TrustTier } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr, optStr, DATE_PATTERN } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const TIERS: readonly TrustTier[] = [
  'self_reported',
  'evidence_linked',
  'peer_attested',
  'platform_verified',
];

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const tierParam = params.get('tier');
  const agents = listAgents({
    q: params.get('q') ?? undefined,
    category: params.get('category') ?? undefined,
    platform: params.get('platform') ?? undefined,
    tier: tierParam && (TIERS as readonly string[]).includes(tierParam) ? (tierParam as TrustTier) : undefined,
  });
  return NextResponse.json({ agents });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const result = registerAgent({
      name: reqStr(body, 'name', { max: 80 }),
      tagline: reqStr(body, 'tagline', { max: 200 }),
      category: reqStr(body, 'category', { max: 40 }),
      platform: reqStr(body, 'platform', { max: 40 }),
      model: optStr(body, 'model', { max: 80 }),
      about: optStr(body, 'about', { max: 4000 }),
      howBuilt: optStr(body, 'howBuilt', { max: 4000 }),
      oversight: optStr(body, 'oversight', { max: 1000 }),
      operationalSince: optStr(body, 'operationalSince', {
        pattern: DATE_PATTERN,
        patternHint: 'must be YYYY-MM-DD',
      }),
      ownerName: reqStr(body, 'ownerName', { max: 80 }),
      ownerHandle: reqStr(body, 'ownerHandle', { max: 40 }),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('POST /api/agents failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
