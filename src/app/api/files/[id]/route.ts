import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getFileById, updateFile } from '@/lib/db/queries';
import type { OwnerRow } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr } from '@/lib/validate';
import { runScan } from '@/lib/sanitizer';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params): Promise<NextResponse> {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
  }

  const file = getFileById(id);
  if (!file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check visibility: private files require ownership
  if (file.visibility === 'private') {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);
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
  }

  // Never return content_private — return content_public for public files, omit for private
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content_private, ...safeFile } = file;
  const response =
    file.visibility === 'public' ? { ...safeFile, content: file.content_public } : safeFile;

  return NextResponse.json(response);
}

export async function PUT(request: Request, { params }: Params): Promise<NextResponse> {
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
    const contentPrivate = reqStr(body, 'content', { max: 65536 });

    updateFile(id, { contentPrivate });

    // Revert to private if currently public (content changed — re-review required)
    const refreshed = getFileById(id);
    if (refreshed?.visibility === 'public') {
      getDb()
        .prepare(`UPDATE files SET visibility='private', updated_at=datetime('now') WHERE id=?`)
        .run(id);
    }

    // Trigger rescan (fail-closed)
    try {
      runScan(id, 'content_change');
    } catch (scanErr) {
      console.error('PUT /api/files/[id] — scan failed for file', id, scanErr);
    }

    return NextResponse.json({ id, updated: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('exceeds 64 KB')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('PUT /api/files/[id] failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
