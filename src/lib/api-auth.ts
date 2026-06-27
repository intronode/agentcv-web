import { NextResponse } from 'next/server';
import { auth } from './auth';

/** Shared helpers for API-route auth + rate-limit responses. */

/** The numeric user id of the signed-in user, or null if unauthenticated. */
export async function currentUserId(): Promise<number | null> {
  const session = await auth();
  return session?.user?.id ? Number(session.user.id) : null;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: { message: 'Sign in required.' } }, { status: 401 });
}

export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: { message: 'Too many requests — please slow down.' } },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)) } }
  );
}

/** Best-effort client IP for rate-limit bucketing (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
