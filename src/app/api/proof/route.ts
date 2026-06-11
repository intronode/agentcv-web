import { NextResponse } from 'next/server';
import { addProofEntry } from '@/lib/db/queries';
import type { ProofType, SubjectType } from '@/lib/db/types';
import {
  ValidationError,
  readJsonBody,
  reqStr,
  optStr,
  DATE_PATTERN,
  URL_PATTERN,
} from '@/lib/validate';

export const dynamic = 'force-dynamic';

const SUBJECT_TYPES = ['agent', 'configuration'] as const;
const PROOF_TYPES = ['task', 'incident', 'lesson', 'milestone', 'artifact'] as const;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const result = addProofEntry({
      subjectType: reqStr(body, 'subjectType', { oneOf: SUBJECT_TYPES }) as SubjectType,
      subjectSlug: reqStr(body, 'subjectSlug', { max: 80 }),
      type: reqStr(body, 'type', { oneOf: PROOF_TYPES }) as ProofType,
      title: reqStr(body, 'title', { max: 200 }),
      body: optStr(body, 'body', { max: 4000 }),
      evidenceUrl: optStr(body, 'evidenceUrl', {
        max: 500,
        pattern: URL_PATTERN,
        patternHint: 'must be an http(s) URL',
      }),
      entryDate: reqStr(body, 'entryDate', {
        pattern: DATE_PATTERN,
        patternHint: 'must be YYYY-MM-DD',
      }),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Unknown')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('POST /api/proof failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
