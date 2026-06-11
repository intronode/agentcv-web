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
  opts: StrOpts = {}
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

interface ArrOpts {
  maxItems?: number;
  maxItemLength?: number;
}

/**
 * Parse an optional JSON array of strings from the request body.
 * Accepts either a real Array value or a comma-separated string.
 * Returns undefined if the key is absent or empty.
 */
export function optArr(
  body: Record<string, unknown>,
  key: string,
  opts: ArrOpts = {}
): string[] | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;

  let items: string[];
  if (Array.isArray(value)) {
    items = value.map((v) => {
      if (typeof v !== 'string') throw new ValidationError(`${key} items must be strings`);
      return v.trim();
    });
  } else if (typeof value === 'string') {
    items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    throw new ValidationError(`${key} must be an array or comma-separated string`);
  }

  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return undefined;

  if (opts.maxItems !== undefined && filtered.length > opts.maxItems) {
    throw new ValidationError(`${key} must have at most ${opts.maxItems} items`);
  }
  if (opts.maxItemLength !== undefined) {
    for (const item of filtered) {
      if (item.length > opts.maxItemLength) {
        throw new ValidationError(
          `${key} items must be at most ${opts.maxItemLength} characters each`
        );
      }
    }
  }
  return filtered;
}

/**
 * Parse an optional integer from the request body.
 */
export function optInt(
  body: Record<string, unknown>,
  key: string,
  opts: { min?: number; max?: number } = {}
): number | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  const n =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN;
  if (!Number.isInteger(n)) throw new ValidationError(`${key} must be an integer`);
  if (opts.min !== undefined && n < opts.min)
    throw new ValidationError(`${key} must be at least ${opts.min}`);
  if (opts.max !== undefined && n > opts.max)
    throw new ValidationError(`${key} must be at most ${opts.max}`);
  return n;
}
