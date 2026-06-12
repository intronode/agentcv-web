/**
 * POST /api/files/[id]/findings/[findingId]/resolve
 * Resolve a finding: mask or dismiss (with typed reason).
 * Spec: SANITIZER.md §7
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getFileById, getFileFinding, resolveFileFinding } from '@/lib/db/queries';
import type { OwnerRow } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string; findingId: string }> };

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id: idStr, findingId: findingIdStr } = await params;
    const fileId = parseInt(idStr, 10);
    const findingId = parseInt(findingIdStr, 10);
    if (!Number.isInteger(fileId) || !Number.isInteger(findingId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const file = getFileById(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify ownership
    const db = getDb();
    const table = file.subject_type === 'agent' ? 'agents' : 'teams';
    const subject = db.prepare(`SELECT owner_id FROM ${table} WHERE id=?`).get(file.subject_id) as
      | { owner_id: number }
      | undefined;
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    const owner = db.prepare('SELECT user_id FROM owners WHERE id=?').get(subject.owner_id) as
      | OwnerRow
      | undefined;
    if (!owner || owner.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const finding = getFileFinding(findingId);
    if (!finding || finding.file_id !== fileId) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }
    if (finding.stale) {
      return NextResponse.json(
        { error: 'Finding is stale (file has been rescanned)' },
        { status: 409 }
      );
    }
    if (finding.status !== 'unresolved') {
      return NextResponse.json({ error: 'Finding already resolved' }, { status: 409 });
    }

    const body = await readJsonBody(request);
    const action = reqStr(body, 'action', { oneOf: ['mask', 'dismiss'] });

    if (action === 'mask') {
      // resolvedMask is optional: if omitted use suggestedMask
      const rawMask = (body as Record<string, unknown>)['resolved_mask'];
      const resolvedMask: string =
        typeof rawMask === 'string' && rawMask.trim().length > 0
          ? rawMask.trim()
          : finding.suggested_mask;

      // Validate mask token grammar: [a-z][a-z0-9-]*
      if (!/^\[[a-z][a-z0-9\-]*\]$/.test(resolvedMask)) {
        return NextResponse.json(
          {
            error:
              'Mask token must match [a-z][a-z0-9-]* wrapped in square brackets, e.g. [api-key]',
          },
          { status: 400 }
        );
      }

      resolveFileFinding(findingId, {
        status: 'masked',
        resolvedMask,
        resolvedBy: userId,
      });

      return NextResponse.json({ findingId, status: 'masked', resolvedMask });
    } else {
      // dismiss
      const dismissReason = reqStr(body, 'dismiss_reason', { max: 1000 });

      // Secrets require ≥20-char justification
      if (finding.finding_type === 'secret' && dismissReason.length < 20) {
        return NextResponse.json(
          { error: 'Dismissal of a secret finding requires a reason of at least 20 characters' },
          { status: 400 }
        );
      }

      resolveFileFinding(findingId, {
        status: 'dismissed',
        dismissReason,
        resolvedBy: userId,
      });

      return NextResponse.json({ findingId, status: 'dismissed' });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('POST /api/files/[id]/findings/[findingId]/resolve failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
