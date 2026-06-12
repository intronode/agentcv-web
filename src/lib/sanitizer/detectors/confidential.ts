/**
 * Business-confidential heuristic detector — prose-only segments.
 * Four sub-passes:
 * 1. Owner deny-list (whole-word, case-insensitive match)
 * 2. Deal/contract language proximity (currency amounts as primary, 250-char window)
 * 3. Counterparty-name detection (capitalized proper-noun sequences near role words)
 * 4. Internal URL / hostname detection
 *
 * IMPORTANT — span correctness:
 *   Deal-proximity findings span ONLY the currency amount token (e.g. "$40,000").
 *   Counterparty role words (client, customer, …) serve as SUPPORTING elements
 *   only — they increase the supportCount for nearby currency amounts but do NOT
 *   produce findings of their own (they are not masked).
 *
 * Deduplication:
 *   Findings from multiple sub-passes can overlap (e.g. deny-list + counterparty-name
 *   both fire on "Initech"). The `seen` set deduplicates by spanStart; the first
 *   sub-pass to add a finding for a given spanStart wins. Sub-passes run in priority
 *   order: deny-list → deal-proximity → counterparty-name → internal-url.
 *   When two findings share a spanStart, only the higher-priority one is kept.
 *
 * Spec: SANITIZER.md §5.3
 */
import type { Segment, Finding } from '../types';
import { buildExcerpt } from '../masks';

const DETECTOR_VERSION = '1.0';

// ── Deal/contract language ───────────────────────────────────────────────────

/** Primary elements: currency amounts ONLY — these are what get masked as [amount] */
const CURRENCY_AMOUNT =
  /\$[\d,]+(?:\.\d{2})?(?:[KkMmBb])?\b|\b\d+(?:\.\d+)?\s*(?:USD|KRW|EUR|GBP)\b/g;

/**
 * Supporting context: counterparty role words within the deal-proximity window.
 * These SUPPORT the confidence calculation for a nearby currency amount finding
 * but do NOT produce findings themselves and are NOT masked.
 */
const COUNTERPARTY_SUPPORT = /\b(?:client|customer|partner|vendor|contractor|agency)\b/gi;

/** Supporting elements: contract vocabulary */
const DEAL_TERMS =
  /\b(?:contract|NDA|non-disclosure|agreement|SLA|retainer|invoice|payment|deliverable|milestone|scope|SOW|statement of work|engagement|confidential|proprietary)\b/gi;

/** Internal URL indicators */
const URL_RE =
  /https?:\/\/[^\s"'<>]+|(?:^|\s)((?:[a-z0-9-]+\.)+(?:internal|local|corp|intranet))(?:\s|$)/gi;
const PRIVATE_IP_URL =
  /https?:\/\/(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|::1)(?::\d+)?/gi;
const BARE_HOSTNAME = /\bhttps?:\/\/[a-z][a-z0-9-]*(?::\d+)\//gi; // http://redis:6379/ style
const INTERNAL_TLD = /\bhttps?:\/\/[^\s"'<>]*\.(?:internal|local|corp|intranet)\b/gi;

// ── Counterparty-name detector constants ──────────────────────────────────────

/**
 * Context words that signal a counterparty/named-entity is nearby.
 * Used as the "proximity anchor" for the counterparty-name sub-pass.
 */
const COUNTERPARTY_CONTEXT = /\b(?:client|customer|partner|vendor|account|contractor|agency)\b/gi;

/** Tight window for counterparty-name detection: ±60 chars of a context word */
const COUNTERPARTY_NAME_WINDOW = 60;

/**
 * Proper-noun shape: one to three capitalized words (each [A-Z][a-z]+).
 * We require at least the first word to be capitalized.
 * The regex captures multi-word sequences like "Acme Corp" or "Blue Sky Solutions".
 */
const PROPER_NOUN_SEQ = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

/**
 * Small stoplist: common words that look like proper nouns but are not company names.
 * Sentence-initial common words, title-case abbreviations, etc.
 */
const COUNTERPARTY_STOPLIST = new Set([
  // English common words that happen to be capitalized (sentence-initial or titles)
  'The',
  'This',
  'That',
  'These',
  'Those',
  'Our',
  'Your',
  'Their',
  'Its',
  'We',
  'They',
  'He',
  'She',
  'It',
  'You',
  'I',
  'And',
  'Or',
  'But',
  'For',
  'Nor',
  'So',
  'Yet',
  'In',
  'On',
  'At',
  'To',
  'Of',
  'By',
  'As',
  'Is',
  'Are',
  'Was',
  'Were',
  'Not',
  'With',
  'From',
  'Into',
  'About',
  'After',
  'Before',
  'Under',
  'Over',
  'Between',
  'Through',
  'During',
  'Per',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'Here',
  'There',
  'Where',
  'When',
  'How',
  'Why',
  'What',
  'Who',
  'All',
  'Any',
  'Some',
  'No',
  'None',
  'Both',
  'Each',
  'Every',
  'More',
  'Most',
  'Less',
  'Least',
  'Many',
  'Few',
  'Much',
  'New',
  'Old',
  'First',
  'Last',
  'Next',
  'Same',
  'Other',
  'Another',
  'Please',
  'Thank',
  'Dear',
  'Hi',
  'Hello',
  'Note',
  'See',
  'Also',
  'However',
  'Therefore',
  'Thus',
  'Hence',
  'Report',
  'Summary',
  'Update',
  'Review',
  'Plan',
  'Proposal',
  'Total',
  'Final',
  'Draft',
  'Version',
]);

function isLikelyProperName(seq: string): boolean {
  const words = seq.split(/\s+/);
  // All words in stoplist → not a company name
  if (words.every((w) => COUNTERPARTY_STOPLIST.has(w))) return false;
  return true;
}

function findAllMatches(
  re: RegExp,
  text: string
): Array<{ index: number; end: number; match: string }> {
  re.lastIndex = 0;
  const results: Array<{ index: number; end: number; match: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ index: m.index, end: m.index + m[0].length, match: m[0] });
  }
  return results;
}

export function detectConfidential(
  segments: Segment[],
  content: string,
  denyList: string[]
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<number>();

  function add(
    detectorId: string,
    spanStart: number,
    spanEnd: number,
    mask: string,
    severity: Finding['severity']
  ) {
    if (seen.has(spanStart)) return; // deduplication: first sub-pass to claim this spanStart wins
    seen.add(spanStart);
    findings.push({
      detectorId,
      detectorVersion: DETECTOR_VERSION,
      findingType: 'confidential',
      severity,
      spanStart,
      spanEnd,
      excerpt: buildExcerpt(content, spanStart, spanEnd, false),
      suggestedMask: mask,
    });
  }

  // Build deny-list patterns (whole-word, case-insensitive)
  const denyPatterns: Array<{ re: RegExp; term: string }> = denyList
    .filter((t) => t.trim().length > 0)
    .map((term) => ({
      term,
      re: new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi'),
    }));

  for (const segment of segments) {
    if (segment.type === 'code_block') continue;

    const seg = segment.content;
    const base = segment.offset;

    // ── Sub-pass 1: Owner deny-list ──────────────────────────────────────────
    for (const { re, term } of denyPatterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(seg)) !== null) {
        const mask = inferDenyListMask(term);
        add(
          'confidential.deny-list',
          base + m.index,
          base + m.index + m[0].length,
          mask,
          'blocking'
        );
      }
    }

    // ── Sub-pass 2: Deal/contract proximity (currency amounts only) ──────────
    //
    // SPAN CONTRACT: only currency amounts produce findings (span = the amount token).
    // Counterparty role words (client, customer, …) contribute to supportCount
    // for proximity scoring but are NOT themselves masked or flagged.
    //
    // supportCount includes BOTH deal terms AND counterparty context words found
    // in the proximity window — this increases confidence correctly when a sentence
    // says "our client paid $40,000 under the retainer contract".
    const currencyMatches = findAllMatches(CURRENCY_AMOUNT, seg);

    for (const primary of currencyMatches) {
      // Count supporting elements in 250-char window
      const windowStart = Math.max(0, primary.index - 250);
      const windowEnd = Math.min(seg.length, primary.end + 250);
      const window = seg.slice(windowStart, windowEnd);

      let supportCount = 0;

      DEAL_TERMS.lastIndex = 0;
      while (DEAL_TERMS.exec(window) !== null) {
        supportCount++;
      }

      // Counterparty role words also count as supporting context
      COUNTERPARTY_SUPPORT.lastIndex = 0;
      while (COUNTERPARTY_SUPPORT.exec(window) !== null) {
        supportCount++;
      }

      if (supportCount === 0) {
        // Low confidence — advisory only
        add(
          'confidential.deal-proximity-low',
          base + primary.index,
          base + primary.end,
          '[amount]',
          'advisory'
        );
      } else if (supportCount === 1) {
        add(
          'confidential.deal-proximity-medium',
          base + primary.index,
          base + primary.end,
          '[amount]',
          'blocking'
        );
      } else {
        // 2+ supporting elements — high confidence
        add(
          'confidential.deal-proximity-high',
          base + primary.index,
          base + primary.end,
          '[amount]',
          'blocking'
        );
      }
    }

    // ── Sub-pass 3: Counterparty-name detection ──────────────────────────────
    //
    // Detect capitalized proper-noun sequences (1–3 words, not sentence-initial
    // common words) within a ±60-char window of a counterparty context word
    // (client|customer|partner|vendor|account). Suggested mask: [client] (or
    // [client-N] for multiple distinct names, assigned by the caller's
    // entity-numbering pass).
    //
    // False-positive rate: moderate — the stoplist and proximity gate reduce noise,
    // but a product or feature name near the word "client" will still fire. The
    // review UI dismiss-with-reason is the safety valve.
    const contextMatches = findAllMatches(COUNTERPARTY_CONTEXT, seg);
    const properNounMatches = findAllMatches(PROPER_NOUN_SEQ, seg);

    for (const noun of properNounMatches) {
      if (!isLikelyProperName(noun.match)) continue;

      // Check whether this noun is within COUNTERPARTY_NAME_WINDOW chars of any context word
      const nearContext = contextMatches.some(
        (ctx) =>
          Math.abs(ctx.index - noun.index) <= COUNTERPARTY_NAME_WINDOW ||
          Math.abs(ctx.end - noun.end) <= COUNTERPARTY_NAME_WINDOW
      );
      if (!nearContext) continue;

      add(
        'confidential.counterparty-name',
        base + noun.index,
        base + noun.end,
        '[client]',
        'blocking'
      );
    }

    // ── Sub-pass 4: Internal URL detection ───────────────────────────────────
    for (const pattern of [PRIVATE_IP_URL, INTERNAL_TLD, BARE_HOSTNAME]) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(seg)) !== null) {
        add(
          'confidential.internal-url',
          base + m.index,
          base + m.index + m[0].length,
          '[internal-url]',
          'blocking'
        );
      }
    }
  }

  return findings;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferDenyListMask(term: string): string {
  // Single-word terms that start uppercase → [codename]; multi-word → [client]
  if (!term.includes(' ') && /^[A-Z]/.test(term)) {
    return '[codename]';
  }
  return '[client]';
}
