import { NextResponse } from 'next/server';
import { createContactRequest } from '@/lib/db/queries';
import type { ContactSubjectType } from '@/lib/db/types';
import { ValidationError, readJsonBody, reqStr, optStr, EMAIL_PATTERN } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const SUBJECT_TYPES = ['agent', 'configuration', 'owner'] as const;
const CONTACT_KINDS = ['request_setup', 'claim', 'general'] as const;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);

    const kind = optStr(body, 'kind', { oneOf: CONTACT_KINDS }) ?? 'general';

    // Subject is optional for request_setup (no referenced config) and general.
    // Validate subject fields only when both are provided.
    const subjectTypeRaw = optStr(body, 'subjectType');
    const subjectSlugRaw = optStr(body, 'subjectSlug', { max: 80 });

    let subjectType: ContactSubjectType | undefined;
    let subjectSlug: string | undefined;

    if (subjectTypeRaw !== undefined || subjectSlugRaw !== undefined) {
      // If either is provided, both must be valid.
      if (
        subjectTypeRaw === undefined ||
        !(SUBJECT_TYPES as readonly string[]).includes(subjectTypeRaw)
      ) {
        throw new ValidationError(`subjectType must be one of: ${SUBJECT_TYPES.join(', ')}`);
      }
      if (!subjectSlugRaw) {
        throw new ValidationError('subjectSlug is required when subjectType is set');
      }
      subjectType = subjectTypeRaw as ContactSubjectType;
      subjectSlug = subjectSlugRaw;
    }

    const result = createContactRequest({
      subjectType,
      subjectSlug,
      requesterName: reqStr(body, 'requesterName', { max: 80 }),
      requesterEmail: reqStr(body, 'requesterEmail', {
        max: 200,
        pattern: EMAIL_PATTERN,
        patternHint: 'must be a valid email address',
      }),
      message: reqStr(body, 'message', { max: 4000 }),
      kind,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Unknown')) {
      return NextResponse.json({ error: { message: error.message } }, { status: 404 });
    }
    console.error('POST /api/contact failed:', error);
    return NextResponse.json({ error: { message: 'Internal error' } }, { status: 500 });
  }
}
