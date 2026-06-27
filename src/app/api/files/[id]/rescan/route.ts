/**
 * POST /api/files/[id]/rescan
 * Manual rescan trigger. Owner-only. Queues an immediate in-process scan.
 * Spec: SANITIZER.md §10.1
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getFileById } from '@/lib/db/queries';
import type { OwnerRow } from '@/lib/db/types';
import { runScan } from '@/lib/sanitizer';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify ownership
    const db = getDb();
    const table = file.subject_type === 'agent' ? 'agents' : 'teams';
    const subject = (await db
      .prepare(`SELECT owner_id FROM ${table} WHERE id=?`)
      .get(file.subject_id)) as { owner_id: number } | undefined;
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    const owner = (await db
      .prepare('SELECT user_id FROM owners WHERE id=?')
      .get(subject.owner_id)) as OwnerRow | undefined;
    if (!owner || owner.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await runScan(id, 'manual_rescan');

    return NextResponse.json({
      scanLogId: result.scanLogId,
      findingCount: result.findings.length,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error('POST /api/files/[id]/rescan failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
