/**
 * DELETE /api/owners/[handle]/confidential-terms/[termId]
 * Remove a confidential term by ID. Owner-only.
 * Spec: SANITIZER.md §8
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { deleteConfidentialTerm } from '@/lib/db/queries';
import type { OwnerRow } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string; termId: string }> };

export async function DELETE(_request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { handle, termId: termIdStr } = await params;
    const termId = parseInt(termIdStr, 10);
    if (!Number.isInteger(termId)) {
      return NextResponse.json({ error: 'Invalid term id' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);

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

    deleteConfidentialTerm(termId, owner.id);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/owners/[handle]/confidential-terms/[termId] failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
