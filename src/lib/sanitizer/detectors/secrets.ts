/**
 * Secrets detector — three sub-passes:
 * 1. Provider-prefix regexes (PROVIDER_PREFIX_RULES)
 * 2. Generic high-entropy assignment (≥3.5 Shannon, base64/hex-ish, ≥20 chars)
 * 3. Connection string credentials
 * Spec: SANITIZER.md §5.1
 * Runs on ALL segments (prose + code).
 */
import type { Segment, Finding } from '../types';
import { shannonEntropy } from '../entropy';
import { PROVIDER_PREFIX_RULES } from '../rules';
import { buildExcerpt } from '../masks';

const DETECTOR_VERSION = '1.0';

/** Base64/hex-ish charset test — token must be mostly from this charset */
function isHighEntropyToken(token: string): boolean {
  // Must be ≥20 chars
  if (token.length < 20) return false;
  // Mostly base64 or hex characters
  const base64Like = /^[A-Za-z0-9+/=_\-]+$/;
  if (!base64Like.test(token)) return false;
  return shannonEntropy(token) >= 3.5;
}

/**
 * High-entropy assignment pattern: key = "value" / key: value / key=value
 * where value is a high-entropy token ≥20 chars.
 */
const HIGH_ENTROPY_ASSIGNMENT =
  /(?:key|token|secret|password|passwd|pwd|api_?key|access_?key|auth|credential|private_?key|client_?secret)\s*[=:]\s*["']?([A-Za-z0-9+/=_\-]{20,})["']?/gi;

/** Connection string: protocol://user:password@host */
const CONNECTION_STRING =
  /(?:postgres(?:ql)?|mysql|mongodb|redis|amqp|smtp|ftp):\/\/[^:@\s]+:([^@\s]{6,})@[^\s"']+/gi;

export function detectSecrets(segments: Segment[], content: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<number>(); // deduplicate by spanStart

  function addFinding(
    detectorId: string,
    spanStart: number,
    spanEnd: number,
    suggestedMaskBase: string,
    severity: Finding['severity']
  ) {
    if (seen.has(spanStart)) return;
    seen.add(spanStart);
    findings.push({
      detectorId,
      detectorVersion: DETECTOR_VERSION,
      findingType: 'secret',
      severity,
      spanStart,
      spanEnd,
      excerpt: buildExcerpt(content, spanStart, spanEnd, true),
      suggestedMask: `[${suggestedMaskBase}]`,
    });
  }

  for (const segment of segments) {
    const segContent = segment.content;
    const base = segment.offset;

    // Sub-pass 1: Provider-prefix rules (all segments including code)
    for (const rule of PROVIDER_PREFIX_RULES) {
      rule.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.pattern.exec(segContent)) !== null) {
        addFinding(
          rule.id,
          base + m.index,
          base + m.index + m[0].length,
          rule.suggestedMaskBase,
          rule.severity
        );
      }
    }

    // Sub-pass 2: Generic high-entropy assignment (all segments)
    HIGH_ENTROPY_ASSIGNMENT.lastIndex = 0;
    let m2: RegExpExecArray | null;
    while ((m2 = HIGH_ENTROPY_ASSIGNMENT.exec(segContent)) !== null) {
      const valueCapture = m2[1] ?? '';
      if (isHighEntropyToken(valueCapture)) {
        // Span covers the entire match (key=value), not just the value,
        // so the reviewer sees context
        const spanStart = base + m2.index;
        const spanEnd = base + m2.index + m2[0].length;
        addFinding(
          'secrets.high-entropy-assignment',
          spanStart,
          spanEnd,
          'secret-value',
          'blocking'
        );
      }
    }

    // Sub-pass 3: Connection string credentials (all segments)
    CONNECTION_STRING.lastIndex = 0;
    let m3: RegExpExecArray | null;
    while ((m3 = CONNECTION_STRING.exec(segContent)) !== null) {
      const spanStart = base + m3.index;
      const spanEnd = base + m3.index + m3[0].length;
      addFinding('secrets.connection-string', spanStart, spanEnd, 'connection-string', 'critical');
    }
  }

  return findings;
}
