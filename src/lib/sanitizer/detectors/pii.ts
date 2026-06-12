/**
 * PII detector — prose-only segments.
 * Patterns: email, international phone, credit card + Luhn, IBAN + MOD-97, IPv4, KR RRN + checksum.
 * Spec: SANITIZER.md §5.2
 */
import type { Segment, Finding } from '../types';
import { buildExcerpt } from '../masks';

const DETECTOR_VERSION = '1.0';

// ── Luhn checksum ────────────────────────────────────────────────────────────
function luhn(digits: string): boolean {
  let sum = 0;
  let odd = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i] ?? '', 10);
    if (odd) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    odd = !odd;
  }
  return sum % 10 === 0;
}

// ── IBAN MOD-97 ──────────────────────────────────────────────────────────────
function ibanMod97(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .toUpperCase()
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 65 && code <= 90 ? String(code - 55) : c;
    })
    .join('');
  // Process in 9-digit chunks to avoid JS float overflow
  let remainder = '';
  for (const chunk of numeric.match(/.{1,9}/g) ?? []) {
    remainder = String(parseInt(remainder + chunk, 10) % 97);
  }
  return parseInt(remainder, 10) === 1;
}

// ── KR RRN checksum ─────────────────────────────────────────────────────────
function rrnChecksum(digits: string): boolean {
  if (digits.length !== 13) return false;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i] ?? '', 10) * (w[i] ?? 2);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(digits[12] ?? '', 10);
}

// ── Patterns ─────────────────────────────────────────────────────────────────
// Email
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

// International phone: +1-800-555-5555, +82 10 1234 5678, etc.
// Must start with + and have 7–15 digits total (E.164-ish)
const PHONE_RE = /\+\d[\d\s\-().]{6,18}\d/g;

// Credit card: 13–19 digit groups (Visa, MC, Amex, Discover patterns)
// Accept spaces or hyphens as separators between 4-digit groups
const CC_RE = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b(?:\d{4}[-\s]?){2}\d{4,7}\b/g;

// IBAN: 2-letter country + 2 digits + up to 30 alphanumeric (spaces allowed)
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}(?:\s[A-Z0-9]{4})*\b/g;

// IPv4: non-documentation ranges (exclude 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 127.x, 10.x, 172.16-31.x as private doc ranges are fine)
// We flag all dotted-quad IPs and let the reviewer decide.
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;

// KR RRN: YYMMDD-GNNNNC (6 digits, hyphen, 7 digits)
const RRN_RE = /\b(\d{6})-(\d{7})\b/g;

// Documentation IPs to skip (RFC 5737)
function isDocIp(ip: string): boolean {
  return (
    ip.startsWith('192.0.2.') ||
    ip.startsWith('198.51.100.') ||
    ip.startsWith('203.0.113.') ||
    ip.startsWith('127.') ||
    ip === '0.0.0.0' ||
    ip.startsWith('255.')
  );
}

export function detectPii(segments: Segment[], content: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<number>();

  function add(
    detectorId: string,
    spanStart: number,
    spanEnd: number,
    mask: string,
    severity: Finding['severity'] = 'blocking'
  ) {
    if (seen.has(spanStart)) return;
    seen.add(spanStart);
    findings.push({
      detectorId,
      detectorVersion: DETECTOR_VERSION,
      findingType: 'pii',
      severity,
      spanStart,
      spanEnd,
      excerpt: buildExcerpt(content, spanStart, spanEnd, false),
      suggestedMask: mask,
    });
  }

  for (const segment of segments) {
    // PII only in prose and inline_code (not code_block)
    if (segment.type === 'code_block') continue;

    const seg = segment.content;
    const base = segment.offset;

    // Email
    EMAIL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EMAIL_RE.exec(seg)) !== null) {
      add('pii.email', base + m.index, base + m.index + m[0].length, '[email]', 'blocking');
    }

    // Phone
    PHONE_RE.lastIndex = 0;
    while ((m = PHONE_RE.exec(seg)) !== null) {
      add('pii.phone', base + m.index, base + m.index + m[0].length, '[phone]', 'blocking');
    }

    // Credit card + Luhn
    CC_RE.lastIndex = 0;
    while ((m = CC_RE.exec(seg)) !== null) {
      const digits = m[0].replace(/[\s\-]/g, '');
      if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
        add(
          'pii.credit-card',
          base + m.index,
          base + m.index + m[0].length,
          '[credit-card]',
          'critical'
        );
      }
    }

    // IBAN + MOD-97
    IBAN_RE.lastIndex = 0;
    while ((m = IBAN_RE.exec(seg)) !== null) {
      const raw = m[0].replace(/\s/g, '');
      if (raw.length >= 15 && raw.length <= 34 && ibanMod97(raw)) {
        add('pii.iban', base + m.index, base + m.index + m[0].length, '[bank-account]', 'critical');
      }
    }

    // IPv4
    IPV4_RE.lastIndex = 0;
    while ((m = IPV4_RE.exec(seg)) !== null) {
      if (!isDocIp(m[0])) {
        add('pii.ipv4', base + m.index, base + m.index + m[0].length, '[ip-address]', 'advisory');
      }
    }

    // KR RRN
    RRN_RE.lastIndex = 0;
    while ((m = RRN_RE.exec(seg)) !== null) {
      const digits = (m[1] ?? '') + (m[2] ?? '');
      if (rrnChecksum(digits)) {
        add('pii.kr-rrn', base + m.index, base + m.index + m[0].length, '[rrn]', 'critical');
      }
    }
  }

  return findings;
}
