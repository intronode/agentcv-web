import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createFile, validateFilePath } from '@/lib/db/queries';
import type { AgentRow, TeamRow, OwnerRow } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const body = await readJsonBody(request);
    const subjectType = reqStr(body, 'subject_type', { oneOf: ['agent', 'team'] }) as
      | 'agent'
      | 'team';
    const subjectSlug = reqStr(body, 'subject_slug', { max: 80 });
    const path = reqStr(body, 'path', { max: 200 });
    const contentPrivate = reqStr(body, 'content', { max: 65536 });

    // Validate path
    const pathError = validateFilePath(path);
    if (pathError) {
      return NextResponse.json({ error: pathError }, { status: 400 });
    }

    // Resolve subject
    const db = getDb();
    const table = subjectType === 'agent' ? 'agents' : 'teams';
    const subject = db
      .prepare(`SELECT id, owner_id FROM ${table} WHERE slug=?`)
      .get(subjectSlug) as { id: number; owner_id: number } | undefined;
    if (!subject) {
      return NextResponse.json(
        { error: `Unknown ${subjectType}: ${subjectSlug}` },
        { status: 404 }
      );
    }

    // Check ownership — only the owner of the subject can upload files
    const owner = db.prepare('SELECT user_id FROM owners WHERE id=?').get(subject.owner_id) as
      | OwnerRow
      | undefined;
    if (!owner || owner.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden — only the subject owner can upload files' },
        { status: 403 }
      );
    }

    const result = createFile({
      subjectType,
      subjectId: subject.id,
      path,
      contentPrivate,
      uploadedBy: userId,
    });

    return NextResponse.json({ id: result.id, path, visibility: 'private' }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A file at that path already exists for this subject' },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message.includes('exceeds 64 KB')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('POST /api/files failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
