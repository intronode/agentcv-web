export class ValidationError extends Error {}

interface StrOpts {
  max?: number;
  oneOf?: readonly string[];
  pattern?: RegExp;
  patternHint?: string;
}

export function reqStr(body: Record<string, unknown>, key: string, opts: StrOpts = {}): string {
  const value = optStr(body, key, opts);
  if (value === undefined) throw new ValidationError(`${key} is required`);
  return value;
}

export function optStr(
  body: Record<string, unknown>,
  key: string,
  opts: StrOpts = {},
): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${key} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw new ValidationError(`${key} must be at most ${opts.max} characters`);
  }
  if (opts.oneOf && !opts.oneOf.includes(trimmed)) {
    throw new ValidationError(`${key} must be one of: ${opts.oneOf.join(', ')}`);
  }
  if (opts.pattern && !opts.pattern.test(trimmed)) {
    throw new ValidationError(`${key} ${opts.patternHint ?? 'has an invalid format'}`);
  }
  return trimmed;
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_PATTERN = /^https?:\/\/\S+$/;
