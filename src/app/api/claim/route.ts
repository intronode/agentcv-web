import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tooManyRequests } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';
import { createOwnerClaimRequest } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized — sign in to claim an owner profile.' },
      { status: 401 }
    );
  }
  const userId = Number(session.user.id);

  const rl = await rateLimit(`claim:user:${userId}`, 10, 3600);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).ownerHandle !== 'string' ||
    !(body as Record<string, unknown>).ownerHandle
  ) {
    return NextResponse.json({ error: 'ownerHandle is required.' }, { status: 422 });
  }

  const ownerHandle = ((body as Record<string, unknown>).ownerHandle as string).trim();

  // Derive requester name/email from session; dev accounts have no email.
  const requesterName = session.user.name ?? session.user.email ?? `user:${userId}`;
  const requesterEmail = session.user.email ?? '';

  try {
    const result = await createOwnerClaimRequest({
      userId,
      ownerHandle,
      requesterName,
      requesterEmail,
    });
    return NextResponse.json({ id: result.id, status: 'pending' }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found') || msg.includes('Unknown owner')) {
      return NextResponse.json({ error: `Owner '${ownerHandle}' not found.` }, { status: 404 });
    }
    if (msg.includes('already claimed')) {
      return NextResponse.json(
        { error: 'This owner profile is already claimed.' },
        { status: 409 }
      );
    }
    console.error('[/api/claim] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
