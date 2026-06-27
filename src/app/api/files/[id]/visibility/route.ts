import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tooManyRequests } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';
import { getDb } from '@/lib/db';
import { getFileById, canMakeFilePublic, setFileVisibility, publishFile } from '@/lib/db/queries';
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

    const rl = await rateLimit(`file-visibility:user:${userId}`, 60, 3600);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

    const body = await readJsonBody(request);
    const visibility = reqStr(body, 'visibility', { oneOf: ['private', 'public'] }) as
      | 'private'
      | 'public';

    if (visibility === 'public') {
      // Sanitization gate: scan_complete + no unresolved findings
      if (!(await canMakeFilePublic(id))) {
        return NextResponse.json(
          {
            error:
              'Cannot publish: file must be scanned with no unresolved findings. ' +
              'Complete the sanitization review at /review before publishing.',
          },
          { status: 403 }
        );
      }
      // publishFile applies masks → content_public and sets visibility='public'
      await publishFile(id);
    } else {
      // Reverting to private: simple visibility update (no mask application needed)
      await setFileVisibility(id, visibility);
    }

    return NextResponse.json({ id, visibility });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('PATCH /api/files/[id]/visibility failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
