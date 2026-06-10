import { NextResponse } from 'next/server';
import { createContactRequest } from '@/lib/db/queries';
import type { ContactSubjectType } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr, EMAIL_PATTERN } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const SUBJECT_TYPES = ['agent', 'team', 'owner'] as const;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const result = createContactRequest({
      subjectType: reqStr(body, 'subjectType', { oneOf: SUBJECT_TYPES }) as ContactSubjectType,
      subjectSlug: reqStr(body, 'subjectSlug', { max: 80 }),
      requesterName: reqStr(body, 'requesterName', { max: 80 }),
      requesterEmail: reqStr(body, 'requesterEmail', {
        max: 200,
        pattern: EMAIL_PATTERN,
        patternHint: 'must be a valid email address',
      }),
      message: reqStr(body, 'message', { max: 4000 }),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Unknown')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('POST /api/contact failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
