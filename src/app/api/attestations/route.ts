import { NextResponse } from 'next/server';
import { addAttestation } from '@/lib/db/queries';
import type { SubjectType } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr, optStr, URL_PATTERN } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const SUBJECT_TYPES = ['agent', 'configuration'] as const;

// Preset relationships; "other" is accepted but caller must supply statement content.
const RELATIONSHIP_VALUES = [
  'used this team',
  'collaborated',
  'audited',
  'deployed this agent',
  'reviewed this agent',
  'worked alongside',
  'commissioned this build',
  'other',
] as const;

const STATEMENT_MIN = 40;
const STATEMENT_MAX = 1000;
const AUTHOR_NAME_MAX = 120;
const RELATIONSHIP_MAX = 120;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);

    // disclosure is a required boolean — must be explicitly true.
    const disclosure = body['disclosure'];
    if (disclosure !== true) {
      throw new ValidationError(
        'disclosure must be true — you must confirm first-hand experience before submitting an attestation'
      );
    }

    const subjectType = reqStr(body, 'subjectType', {
      oneOf: SUBJECT_TYPES,
    }) as SubjectType;
    const subjectSlug = reqStr(body, 'subjectSlug', { max: 80 });
    const authorName = reqStr(body, 'author_name', { max: AUTHOR_NAME_MAX });

    const authorUrl = optStr(body, 'author_url', {
      max: 500,
      pattern: URL_PATTERN,
      patternHint: 'must be an http(s) URL',
    });

    // relationship: accept preset values OR free text (bounded)
    const relationship = reqStr(body, 'relationship', { max: RELATIONSHIP_MAX });
    if (relationship.length < 3) {
      throw new ValidationError('relationship must be at least 3 characters');
    }

    const statement = reqStr(body, 'statement', { max: STATEMENT_MAX });
    if (statement.length < STATEMENT_MIN) {
      throw new ValidationError(
        `statement must be at least ${STATEMENT_MIN} characters — attestations must be substantive`
      );
    }

    const result = addAttestation({
      subjectType,
      subjectSlug,
      authorName,
      authorUrl,
      relationship,
      statement,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Unknown')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('POST /api/attestations failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
