/**
 * /api/configurations — 308 permanent alias for /api/teams
 *
 * Kept for backwards-compat with any external clients that still hit the old
 * endpoint.  All new code should use /api/teams directly.
 */
import { NextResponse } from 'next/server';

function redirectToTeams(request: Request): NextResponse {
  const url = new URL(request.url);
  url.pathname = '/api/teams';
  return NextResponse.redirect(url.toString(), { status: 308 });
}

export async function GET(request: Request): Promise<NextResponse> {
  return redirectToTeams(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return redirectToTeams(request);
}
