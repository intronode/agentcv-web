/**
 * Mask token generation and content masking.
 * Spec: SANITIZER.md §6
 */
import type { Finding } from './types';

/**
 * Build a mask token for a finding.
 * Grammar: [a-z][a-z0-9\-]* wrapped in square brackets.
 * Entity numbers are appended per-file when multiple entities of the same base exist.
 * e.g. "[api-key]", "[client-1]", "[client-2]"
 */
export function buildMaskToken(base: string, entityNum?: number): string {
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const token = clean || 'redacted';
  if (entityNum !== undefined && entityNum > 1) {
    return `[${token}-${entityNum}]`;
  }
  return `[${token}]`;
}

/**
 * Apply masks to `original` content, replacing finding spans with their mask tokens.
 * Findings MUST be sorted end→start (descending spanStart) to avoid offset drift.
 * Returns the masked string.
 */
export function applyMasks(
  original: string,
  masks: Array<{ spanStart: number; spanEnd: number; maskToken: string }>
): string {
  // Sort descending by spanStart
  const sorted = [...masks].sort((a, b) => b.spanStart - a.spanStart);
  let result = original;
  for (const m of sorted) {
    result = result.slice(0, m.spanStart) + m.maskToken + result.slice(m.spanEnd);
  }
  return result;
}

/**
 * Build an excerpt ±20 chars around a span, masking the span itself for secrets.
 */
export function buildExcerpt(
  content: string,
  spanStart: number,
  spanEnd: number,
  maskSpan: boolean
): string {
  const ctxStart = Math.max(0, spanStart - 20);
  const ctxEnd = Math.min(content.length, spanEnd + 20);
  const before = content.slice(ctxStart, spanStart);
  const middle = maskSpan ? '[REDACTED]' : content.slice(spanStart, spanEnd);
  const after = content.slice(spanEnd, ctxEnd);
  return (ctxStart > 0 ? '…' : '') + before + middle + after + (ctxEnd < content.length ? '…' : '');
}

/**
 * Assign entity numbers to findings with the same suggestedMask base.
 * Returns an array of { finding, maskToken } pairs.
 */
export function assignMaskTokens(findings: Finding[]): Array<Finding & { maskToken: string }> {
  const baseCount = new Map<string, number>();
  return findings.map((f) => {
    const base = f.suggestedMask.replace(/^\[/, '').replace(/\]$/, '').replace(/-\d+$/, '');
    const count = (baseCount.get(base) ?? 0) + 1;
    baseCount.set(base, count);
    const maskToken = buildMaskToken(base, count > 1 ? count : undefined);
    return { ...f, suggestedMask: maskToken, maskToken };
  });
}
