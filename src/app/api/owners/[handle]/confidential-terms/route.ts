/**
 * GET  /api/owners/[handle]/confidential-terms  — returns count (not terms; encrypted-at-rest)
 * POST /api/owners/[handle]/confidential-terms  — add a new term (encrypt client-side with AES-256-GCM)
 * Spec: SANITIZER.md §8
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  addConfidentialTerm,
  getConfidentialTermCount,
  getRawConfidentialTerms,
} from '@/lib/db/queries';
import { createCipheriv, randomBytes } from '@/lib/sanitizer';
import type { OwnerRow } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string }> };

async function resolveOwnerAndCheckAccess(
  handle: string,
  userId: number
): Promise<{ ownerId: number } | NextResponse> {
  const db = getDb();
  const owner = db.prepare('SELECT * FROM owners WHERE handle=?').get(handle) as
    | OwnerRow
    | undefined;
  if (!owner) {
    return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
  }
  if (owner.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { ownerId: owner.id };
}

export async function GET(_request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { handle } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const ownerOrError = await resolveOwnerAndCheckAccess(handle, userId);
    if (ownerOrError instanceof NextResponse) return ownerOrError;
    const { ownerId } = ownerOrError;

    const count = getConfidentialTermCount(ownerId);
    // Return count and redacted list (id + created_at only; encrypted content is never sent to client)
    const terms = getRawConfidentialTerms(ownerId).map(({ id, created_at }) => ({
      id,
      created_at,
    }));

    return NextResponse.json({ count, terms });
  } catch (error) {
    console.error('GET /api/owners/[handle]/confidential-terms failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { handle } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const ownerOrError = await resolveOwnerAndCheckAccess(handle, userId);
    if (ownerOrError instanceof NextResponse) return ownerOrError;
    const { ownerId } = ownerOrError;

    const body = await readJsonBody(request);
    const term = reqStr(body, 'term', { max: 200 });
    if (term.trim().length === 0) {
      return NextResponse.json({ error: 'Term cannot be empty' }, { status: 400 });
    }

    // Encrypt with AES-256-GCM using SANITIZER_KEY
    const key = process.env.SANITIZER_KEY;
    if (!key || key.length !== 64) {
      return NextResponse.json(
        { error: 'SANITIZER_KEY is not configured — cannot store confidential terms' },
        { status: 503 }
      );
    }

    const keyBuf = Buffer.from(key, 'hex');
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', keyBuf, iv);
    const encrypted = Buffer.concat([cipher.update(term, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const result = addConfidentialTerm({
      ownerId,
      termEncrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    });

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('POST /api/owners/[handle]/confidential-terms failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
