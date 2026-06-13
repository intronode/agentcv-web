#!/usr/bin/env node
/**
 * test-sanitizer.mjs — Fixture-based unit tests for the sanitizer pipeline.
 *
 * Each test is a { name, script, assert } triple where:
 *   - script: string of TS code that prints JSON to stdout
 *   - assert: (result: unknown) => boolean
 *
 * Usage: node scripts/test-sanitizer.mjs
 * Exit code: 0 if all PASS, 1 if any FAIL.
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ─── Test definitions ─────────────────────────────────────────────────────────

const TESTS = [
  // ── Parser ──────────────────────────────────────────────────────────────────

  {
    name: 'parser: fenced code block is classified as code_block',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
const result = parseMarkdownSegments('# Header\\n\`\`\`js\\nconst x = 1;\\n\`\`\`\\nProse after.');
console.log(JSON.stringify(result.map(s => s.type)));
`,
    assert: (r) => Array.isArray(r) && r.includes('code_block') && r.includes('prose'),
  },

  {
    name: 'parser: indented 4-space block is classified as code_block',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
const result = parseMarkdownSegments('Before\\n\\n    const x = 1;\\n    const y = 2;\\n\\nAfter');
console.log(JSON.stringify(result.map(s => s.type)));
`,
    assert: (r) => Array.isArray(r) && r.includes('code_block'),
  },

  {
    name: 'parser: inline code span is classified as inline_code',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
const result = parseMarkdownSegments('Use \`MY_SECRET_KEY\` in your config.');
console.log(JSON.stringify(result.map(s => s.type)));
`,
    assert: (r) => Array.isArray(r) && r.includes('inline_code'),
  },

  // ── Entropy ──────────────────────────────────────────────────────────────────

  {
    name: 'entropy: high-entropy string scores >= 3.5',
    script: `
import { shannonEntropy } from './src/lib/sanitizer/entropy';
console.log(JSON.stringify(shannonEntropy('sk-ant-api03-xB7Kf9qP2mNvR4tWz1LYdUeAcJhOsGiXbVk5p')));
`,
    assert: (r) => typeof r === 'number' && r >= 3.5,
  },

  {
    name: 'entropy: low-entropy string scores < 3.5',
    script: `
import { shannonEntropy } from './src/lib/sanitizer/entropy';
console.log(JSON.stringify(shannonEntropy('aaaaaaaaaaaaaaaaaa')));
`,
    assert: (r) => typeof r === 'number' && r < 3.5,
  },

  {
    name: 'entropy: empty string scores 0',
    script: `
import { shannonEntropy } from './src/lib/sanitizer/entropy';
console.log(JSON.stringify(shannonEntropy('')));
`,
    assert: (r) => r === 0,
  },

  // ── Secrets detector ─────────────────────────────────────────────────────────

  {
    name: 'secrets: Anthropic API key detected',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = 'My key is sk-ant-api03-xB7Kf9qP2mNvR4tWzLYdUeAcJhOsGiXbVk5pQR-AAA1111222233334444-BBBBBBBB';
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.some((id) => String(id).includes('anthropic')),
  },

  {
    // Rule: /\bsk-(?!ant-)[A-Za-z0-9]{20,}\b/g  — requires 20+ alphanum directly after "sk-"
    name: 'secrets: OpenAI key detected (40 alphanum chars after sk-)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = 'sk-aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcdefGH';
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.some((id) => String(id).includes('openai')),
  },

  {
    // Rule: /(ghp_|gho_)[A-Za-z0-9]{36,}\b/g — requires 36+ alphanum after the prefix
    name: 'secrets: GitHub PAT detected (36+ alphanum after ghp_)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = 'token: ' + 'ghp_' + 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcdefGHIJ';
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.some((id) => String(id).includes('github')),
  },

  {
    name: 'secrets: GitHub fine-grained token detected',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = 'token: github_pat_' + 'A'.repeat(22) + '_' + 'B'.repeat(59);
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('secrets.provider-prefix.github'),
  },

  {
    name: 'secrets: AWS temporary access key detected',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = 'aws_access_key_id = ' + 'ASIA' + 'ABCDEFGHIJKLMNOP';
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('secrets.provider-prefix.aws'),
  },

  {
    name: 'secrets: Stripe live secret key detected',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = 'stripe_key=' + 'sk_' + 'live_' + 'aBcDeFgHiJkLmNoPqRsTuVwXyZ123456';
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('secrets.provider-prefix.stripe'),
  },

  {
    name: 'secrets: code block with API key still scanned',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectSecrets } from './src/lib/sanitizer/detectors/secrets';
const content = '\`\`\`\\nsk-ant-api03-xB7Kf9qP2mNvR4tWzLYdUeAcJhOsGiXbVk5pQR-AAA1111222233334444-BBBBBBBB\\n\`\`\`';
const segs = parseMarkdownSegments(content);
const result = detectSecrets(segs, content);
console.log(JSON.stringify(result.length));
`,
    assert: (r) => typeof r === 'number' && r > 0,
  },

  // ── PII detector ─────────────────────────────────────────────────────────────

  {
    name: 'pii: email detected in prose',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Contact me at user@example.com for details.';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('pii.email'),
  },

  {
    name: 'pii: phone detected in prose',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Call us at +1-800-555-5555 any time.';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('pii.phone'),
  },

  {
    name: 'pii: credit card detected and Luhn-validated (Visa test 4532015112830366)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Card: 4532 0151 1283 0366';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('pii.credit-card'),
  },

  {
    name: 'pii: invalid credit card not detected (fails Luhn: 4532015112830367)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Card: 4532 0151 1283 0367';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && !r.includes('pii.credit-card'),
  },

  {
    name: 'pii: IBAN detected (GB82WEST12345698765432 — MOD-97 valid)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Bank: GB82WEST12345698765432';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('pii.iban'),
  },

  {
    name: 'pii: IPv4 detected (private address)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Server is at 192.168.1.100 — do not share.';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('pii.ipv4'),
  },

  {
    name: 'pii: documentation IPv4 not detected (RFC 5737 — 192.0.2.x)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = 'Example IP: 192.0.2.1 and 198.51.100.1';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && !r.includes('pii.ipv4'),
  },

  {
    name: 'pii: email NOT detected inside fenced code_block',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectPii } from './src/lib/sanitizer/detectors/pii';
const content = '\`\`\`\\nemail=user@example.com\\n\`\`\`';
const segs = parseMarkdownSegments(content);
const result = detectPii(segs, content);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && !r.includes('pii.email'),
  },

  // ── Confidential detector ─────────────────────────────────────────────────────

  {
    name: 'confidential: deny-list term detected in prose',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'We are in talks with Acme Corp about the deal.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, ['Acme Corp']);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.includes('confidential.deny-list'),
  },

  {
    name: 'confidential: deny-list NOT matched in fenced code_block',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = '\`\`\`\\n# partner: Acme Corp\\n\`\`\`';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, ['Acme Corp']);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && !r.includes('confidential.deny-list'),
  },

  {
    name: 'confidential: internal URL detected (private IP)',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'Connect to http://192.168.1.10:8080/api for the dashboard.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
console.log(JSON.stringify(result.map(f => f.detectorId)));
`,
    assert: (r) => Array.isArray(r) && r.some((id) => String(id).includes('internal-url')),
  },

  // ── Deal-proximity span correctness ──────────────────────────────────────────
  // Regression: "our client Initech paid $40,000 under the retainer contract."
  // Previously: counterparty ref "client" was treated as a primary element and
  // generated a spurious [amount] finding at the wrong span; two [amount]s fired
  // where one amount existed.
  // Expected: exactly ONE deal-proximity finding, spanning "$40,000" only.

  {
    name: 'confidential: deal-proximity — exactly one [amount] finding for single currency token',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'Per our confidential engagement, our client Initech paid $40,000 under the retainer contract. This information is proprietary and not for public release.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
const amountFindings = result.filter(f => f.suggestedMask === '[amount]');
console.log(JSON.stringify({ count: amountFindings.length, spans: amountFindings.map(f => content.slice(f.spanStart, f.spanEnd)) }));
`,
    assert: (r) => {
      if (typeof r !== 'object' || r === null) return false;
      if (r.count !== 1) return false;
      const spans = r.spans;
      return Array.isArray(spans) && spans.length === 1 && spans[0] === '$40,000';
    },
  },

  {
    name: 'confidential: deal-proximity — [amount] span is exactly the currency token "$40,000"',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'Per our confidential engagement, our client Initech paid $40,000 under the retainer contract. This information is proprietary and not for public release.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
const amountFindings = result.filter(f => f.suggestedMask === '[amount]');
const finding = amountFindings[0];
// Assert the span exactly captures "$40,000" and nothing else
console.log(JSON.stringify(finding ? content.slice(finding.spanStart, finding.spanEnd) : null));
`,
    assert: (r) => r === '$40,000',
  },

  // ── Counterparty-name detector ────────────────────────────────────────────────

  {
    name: 'confidential: counterparty-name — "Initech" detected near "client"',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'Per our confidential engagement, our client Initech paid $40,000 under the retainer contract. This information is proprietary and not for public release.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
const cpFindings = result.filter(f => f.detectorId === 'confidential.counterparty-name');
console.log(JSON.stringify({ count: cpFindings.length, names: cpFindings.map(f => content.slice(f.spanStart, f.spanEnd)), masks: cpFindings.map(f => f.suggestedMask) }));
`,
    assert: (r) => {
      if (typeof r !== 'object' || r === null) return false;
      if (r.count < 1) return false;
      return (
        Array.isArray(r.names) &&
        r.names.includes('Initech') &&
        Array.isArray(r.masks) &&
        r.masks[0] === '[client]'
      );
    },
  },

  {
    name: 'confidential: counterparty-name — multiple org names detected near confidential contract terms',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'The confidential contract covers Acme Labs and Globex Systems. Both project names are proprietary.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
const cpFindings = result.filter(f => f.detectorId === 'confidential.counterparty-name');
console.log(JSON.stringify(cpFindings.map(f => content.slice(f.spanStart, f.spanEnd))));
`,
    assert: (r) => Array.isArray(r) && r.includes('Acme Labs') && r.includes('Globex Systems'),
  },

  {
    name: 'confidential: counterparty-name — common word "The" NOT flagged near "client"',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'The client reviewed the proposal and signed the contract.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
const cpFindings = result.filter(f => f.detectorId === 'confidential.counterparty-name');
console.log(JSON.stringify(cpFindings.map(f => content.slice(f.spanStart, f.spanEnd))));
`,
    assert: (r) => Array.isArray(r) && !r.includes('The'),
  },

  {
    name: 'confidential: counterparty-name — NOT matched in fenced code_block',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = '\`\`\`\\n# client: Initech\\ncustomer: Acme Corp\\n\`\`\`';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, []);
const cpFindings = result.filter(f => f.detectorId === 'confidential.counterparty-name');
console.log(JSON.stringify(cpFindings.length));
`,
    assert: (r) => r === 0,
  },

  // ── Deny-list deduplication with counterparty-name ────────────────────────────
  // When deny-list fires on "Initech" AND counterparty-name would also fire on "Initech",
  // only the deny-list finding should appear (higher-priority sub-pass wins).

  {
    name: 'confidential: deny-list takes priority over counterparty-name at same spanStart',
    script: `
import { parseMarkdownSegments } from './src/lib/sanitizer/parser';
import { detectConfidential } from './src/lib/sanitizer/detectors/confidential';
const content = 'Our client Initech signed the retainer contract.';
const segs = parseMarkdownSegments(content);
const result = detectConfidential(segs, content, ['Initech']);
const initechFindings = result.filter(f => {
  const span = content.slice(f.spanStart, f.spanEnd);
  return span === 'Initech';
});
console.log(JSON.stringify(initechFindings.map(f => f.detectorId)));
`,
    assert: (r) => {
      if (!Array.isArray(r)) return false;
      // Exactly one finding for "Initech" span, and it must be the deny-list (not counterparty-name)
      return r.length === 1 && r[0] === 'confidential.deny-list';
    },
  },

  // ── Masks ─────────────────────────────────────────────────────────────────────

  {
    name: 'masks: buildMaskToken produces [email] for base "email" (no entity num)',
    script: `
import { buildMaskToken } from './src/lib/sanitizer/masks';
console.log(JSON.stringify(buildMaskToken('email')));
`,
    assert: (r) => r === '[email]',
  },

  {
    name: 'masks: buildMaskToken produces [email-2] for entityNum=2',
    script: `
import { buildMaskToken } from './src/lib/sanitizer/masks';
console.log(JSON.stringify(buildMaskToken('email', 2)));
`,
    assert: (r) => r === '[email-2]',
  },

  {
    name: 'masks: buildMaskToken produces [api-key] for base "api_key"',
    script: `
import { buildMaskToken } from './src/lib/sanitizer/masks';
console.log(JSON.stringify(buildMaskToken('api_key')));
`,
    assert: (r) => r === '[api-key]',
  },

  {
    name: 'masks: buildExcerpt masks the span with [REDACTED] when maskSpan=true',
    script: `
import { buildExcerpt } from './src/lib/sanitizer/masks';
const content = 'hello world user@example.com is here';
const result = buildExcerpt(content, 12, 28, true);
console.log(JSON.stringify(result));
`,
    assert: (r) => typeof r === 'string' && r.includes('[REDACTED]'),
  },

  {
    name: 'masks: buildExcerpt shows plain text when maskSpan=false',
    script: `
import { buildExcerpt } from './src/lib/sanitizer/masks';
const content = 'hello world user@example.com is here';
const result = buildExcerpt(content, 12, 28, false);
console.log(JSON.stringify(result));
`,
    assert: (r) => typeof r === 'string' && r.includes('user@example.com'),
  },

  {
    name: 'masks: applyMasks replaces span with mask token',
    script: `
import { applyMasks } from './src/lib/sanitizer/masks';
const result = applyMasks('hello user@example.com world', [{ spanStart: 6, spanEnd: 22, maskToken: '[email]' }]);
console.log(JSON.stringify(result));
`,
    assert: (r) => r === 'hello [email] world',
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

function runTest(test) {
  const tmpPath = join(
    PROJECT_ROOT,
    `.tmp-sanitizer-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mts`
  );
  try {
    writeFileSync(tmpPath, test.script.trim() + '\n', 'utf8');
    const stdout = execSync(`npx tsx ${tmpPath}`, {
      cwd: PROJECT_ROOT,
      timeout: 20000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    })
      .toString()
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return {
        name: test.name,
        pass: false,
        error: `JSON parse failed. stdout: ${stdout.slice(0, 300)}`,
      };
    }

    const pass = test.assert(parsed);
    return {
      name: test.name,
      pass,
      error: pass ? undefined : `Assertion failed. result=${JSON.stringify(parsed).slice(0, 400)}`,
    };
  } catch (err) {
    const stderr = (err.stderr?.toString?.() ?? '').slice(0, 600);
    return { name: test.name, pass: false, error: `exec error: ${err.message}\n${stderr}` };
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n--- test-sanitizer.mjs ---\n');

let passed = 0;
let failed = 0;

for (const test of TESTS) {
  const result = runTest(test);
  if (result.pass) {
    console.log(`  PASS  ${result.name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${result.name}`);
    if (result.error) {
      // Indent error lines
      for (const line of result.error.split('\n').slice(0, 8)) {
        console.log(`        ${line}`);
      }
    }
    failed++;
  }
}

console.log(`\n${passed + failed} tests: ${passed} PASS, ${failed} FAIL\n`);

if (failed > 0) {
  process.exit(1);
}
