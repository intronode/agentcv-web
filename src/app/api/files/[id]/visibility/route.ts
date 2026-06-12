import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getFileById, canMakeFilePublic, setFileVisibility } from '@/lib/db/queries';
import type { OwnerRow } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params): Promise<NextResponse> {
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

    const file = getFileById(id);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

    const body = await readJsonBody(request);
    const visibility = reqStr(body, 'visibility', { oneOf: ['private', 'public'] }) as
      | 'private'
      | 'public';

    // Publishing requires a completed (non-error) scan log row
    if (visibility === 'public' && !canMakeFilePublic(id)) {
      return NextResponse.json(
        {
          error: 'Sanitization review required — coming soon in the publish flow',
        },
        { status: 403 }
      );
    }

    setFileVisibility(id, visibility);

    return NextResponse.json({ id, visibility });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('PATCH /api/files/[id]/visibility failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
