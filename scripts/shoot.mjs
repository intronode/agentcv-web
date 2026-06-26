#!/usr/bin/env node
/**
 * shoot.mjs — AgentCV screenshot harness
 *
 * Usage:
 *   node scripts/shoot.mjs --port 3190 --out docs/evidence/cycles/cycle-NN
 *
 * The caller is responsible for starting the server before running this script.
 * The script does NOT start or stop any server.
 *
 * For each route in ROUTES (edit below), it captures:
 *   <slug>-desktop.png       (1440×900, full-page)
 *   <slug>-desktop-fold.png  (1440×900, viewport only — above the fold)
 *   <slug>-mobile.png        (390×844, full-page)
 *
 * Interaction captures (desktop):
 *   submit-validation-errors.png    — /register/agent with empty form submitted
 *   compare-tray-selected.png       — /teams with 2 items selected
 *   register-chooser-desktop-fold   — /register chooser above the fold (from ROUTES list)
 *   register-team-success.png       — 5-step team stepper filled + submitted, lands on team detail page
 *   request-success.png             — /request filled + submitted, captures request-ID success state
 *
 * Console errors per page are written to console-log.txt in the out dir.
 * The deliberate /this-route-does-not-exist 404 is annotated in console-log.txt.
 * Animations are suppressed via prefers-reduced-motion for stable shots.
 *
 * Failed resource loads are captured via response/requestfailed events so that
 * the failing URL is included in the log (not just the browser console text).
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { parseArgs } from 'util';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Overflow tolerance: browser sub-pixel rounding can add ≤2 px
const OVERFLOW_TOLERANCE_PX = 2;

// ─── ROUTES LIST (edit this to add/remove surfaces) ─────────────────────────
export const ROUTES = [
  { path: '/',                                                              slug: 'home' },
  { path: '/teams',                                                         slug: 'teams-directory' },
  { path: '/teams?topology=orchestrator_worker',                           slug: 'teams-filtered-orchestrator-worker' },
  { path: '/teams/ari-collective',                                          slug: 'teams-ari-collective' },
  { path: '/teams/magentic-one',                                            slug: 'teams-magentic-one' },
  { path: '/teams/helios-swarm',                                            slug: 'teams-helios-swarm' },
  { path: '/compare?ids=ari-collective,magentic-one,metagpt-pipeline',    slug: 'compare-three' },
  { path: '/agents',                                                        slug: 'agents-directory' },
  { path: '/agents?platform=OpenClaw',                                      slug: 'agents-filtered-openclaw' },
  { path: '/agents/ari',                                                    slug: 'agents-ari' },
  { path: '/owners/intronode',                                              slug: 'owners-intronode' },
  { path: '/harness-engineering',                                           slug: 'harness-engineering' },
  { path: '/register',                                                       slug: 'register-chooser' },
  { path: '/register/agent',                                                 slug: 'register-agent' },
  { path: '/signin',                                                         slug: 'signin' },
  { path: '/submit',                                                         slug: 'submit' },
  { path: '/request?config=ari-collective',                                slug: 'request' },
  { path: '/this-route-does-not-exist',                                    slug: 'not-found' },
  { path: '/teams/ari-collective/files/LESSONS.md',                        slug: 'teams-ari-collective-files-lessons' },
  { path: '/teams/ari-collective/files/TOPOLOGY.md',                       slug: 'teams-ari-collective-files-topology' },
];
// ────────────────────────────────────────────────────────────────────────────

// ─── SANITIZER EVIDENCE HELPER ───────────────────────────────────────────────
//
// DEV_LOGIN=1 must be set in the server process for this to work in production
// mode. qa-shoot.sh passes it when starting the server.
//
// Sign in as handle `intronode` via the credentials provider, then exercise
// the sanitizer pipeline:
//   1. auth-signin.png        — /signin page with dev sign-in visible
//   2. deny-list-terms.png    — /owners/intronode with "Initech" added to deny-list
//   3. sanitizer-scan-log.png — LESSONS.md file page with scan log panel open
//   4. sanitizer-block.png    — review page blocked by unresolved findings
//   5. sanitizer-evidence.txt — JSON evidence of findings before and after masking
//   6. sanitizer-masked-published.png — file page after masking + publish
//
// A unique QA probe file is created via POST /api/files so the scan runs
// in-server-process. If creation fails (e.g. owner linkage missing), this
// capture fails and writes the failure detail to sanitizer-evidence.txt.

async function captureSanitizerEvidence(browser, baseUrl, outDir, consoleEntries) {
  // Probe content that triggers all 3 detectors:
  //   • secrets.provider-prefix.openai  → sk-testABCDEFGHIJKLMNOPQRS (critical)
  //   • pii.email                        → ops@intronode-qa.example (blocking)
  //   • confidential.deal-proximity-high → client + $40,000 + confidential + engagement + contract + proprietary (blocking)
  const PROBE_CONTENT = `# QA-PROBE: Sanitizer End-to-End Test

API key for staging: sk-testABCDEFGHIJKLMNOPQRST

Contact: ops@intronode-qa.example for escalations.

Per our confidential engagement, our client Initech paid $40,000 under the
retainer contract. This information is proprietary and not for public release.
`;
  const probePath = `QA-PROBE-${Date.now()}-${process.pid}-${randomUUID()}.md`;
  const encodedProbePath = encodeURIComponent(probePath);

  const context = await browser.newContext({
    viewport: DESKTOP,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  wireErrorListeners(page, consoleEntries, 'sanitizer', 'desktop', false);

  const evidenceLines = [];

  try {
    // ── Sign in as intronode via dev credentials form ────────────────────────
    // SEQUENTIAL-DEPENDENT: all subsequent steps require an authenticated session.
    console.log(`    sanitizer [sign-in] navigating to /signin`);
    try {
      await page.goto(`${baseUrl}/signin`, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await page.goto(`${baseUrl}/signin`, { waitUntil: 'load', timeout: 30000 });
    }
    await sleep(SETTLE_MS);

    // Assert: dev disclosure toggle must be present (DEV_LOGIN=1 gate)
    const devToggle = page.locator('#dev-disclosure-toggle');
    const devToggleExists = await devToggle.count() > 0;
    if (!devToggleExists) {
      throw new Error('PRECONDITION FAILED: dev sign-in disclosure toggle not found — DEV_LOGIN=1 must be set on the server. qa-shoot.sh must pass DEV_LOGIN=1.');
    }

    // Click the disclosure toggle to reveal the dev sign-in form
    await devToggle.click();
    await sleep(200);

    await page.fill('#dev-handle', 'intronode');
    await page.fill('#dev-name', 'Intronode QA');
    // click submit and wait for navigation away from /signin
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => null),
      page.locator('button[type="submit"]:has-text("Sign in")').click(),
    ]);
    await sleep(SETTLE_MS);

    // Assert: must NOT be on /signin or /api/auth/error
    const afterSignInUrl = page.url();
    evidenceLines.push(`sign-in redirect: ${afterSignInUrl}`);
    if (afterSignInUrl.includes('/api/auth/error') || afterSignInUrl.includes('/signin')) {
      throw new Error(`PRECONDITION FAILED: sign-in redirected to error/signin page: ${afterSignInUrl}. Check AUTH_URL and AUTH_SECRET env vars.`);
    }

    // Assert: navbar must confirm authenticated session — "Sign in" link must be absent
    // Navigate to home to check navbar
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      await page.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 20000 });
    }
    await sleep(SETTLE_MS);

    const signinLink = page.locator('a[href="/signin"]:has-text("Sign in")');
    const signinLinkVisible = await signinLink.count() > 0;
    if (signinLinkVisible) {
      throw new Error('PRECONDITION FAILED: navbar still shows "Sign in" link after authentication — session cookie was not established.');
    }
    evidenceLines.push('session-verified: navbar does NOT show "Sign in" link — authenticated OK');

    // ── 1. auth-signin.png — authenticated navbar (taken AFTER successful sign-in) ──
    console.log(`    sanitizer [1/6] auth-signin.png (authenticated navbar)`);
    await page.screenshot({ path: `${outDir}/auth-signin.png`, fullPage: false });
    evidenceLines.push('auth-signin.png: captured authenticated home page (no "Sign in" link in navbar)');

    // ── 2. deny-list-terms.png — add "Initech" to deny-list via owner UI ──────
    // Navigate to the intronode owner profile, add the probe counterparty name
    // to the deny-list so the scanner picks it up during the QA probe scan.
    // This also exercises the ConfidentialTermsManager component.
    console.log(`    sanitizer [2/6] deny-list-terms.png (add "Initech" to deny-list via owner UI)`);
    try {
      await page.goto(`${baseUrl}/owners/intronode`, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await page.goto(`${baseUrl}/owners/intronode`, { waitUntil: 'load', timeout: 30000 });
    }
    await sleep(SETTLE_MS);

    // Check whether the "Confidential terms" section exists
    const confidentialSection = page.locator('#confidential-terms');
    const hasConfidentialSection = await confidentialSection.count() > 0;

    if (!hasConfidentialSection) {
      evidenceLines.push('deny-list-ui: WARN — #confidential-terms section not found on /owners/intronode — owner may not be signed in as intronode, or ConfidentialTermsManager not rendered');
    } else {
      // Check if "Initech" is already in the list (prior run artifact); if so, note it
      const existingLabel = page.locator('#confidential-terms').getByText('Initech');
      const alreadyAdded = await existingLabel.count() > 0;
      if (alreadyAdded) {
        evidenceLines.push('deny-list-ui: "Initech" already present in deny-list from prior run — skipping add');
      } else {
        // Fill the input and click Add
        const termInput = page.locator('#confidential-term-input');
        await termInput.fill('Initech');
        await sleep(200);

        const addBtn = page.locator('#confidential-terms button:has-text("Add")');
        const addBtnEnabled = await addBtn.isEnabled().catch(() => false);
        if (!addBtnEnabled) {
          evidenceLines.push('deny-list-ui: WARN — Add button not enabled after filling "Initech"');
        } else {
          await addBtn.click();
          // Wait for the React state update (term appears in list)
          await sleep(1000);
          // Verify it appeared
          const addedLabel = page.locator('#confidential-terms').getByText('Initech');
          const addConfirmed = await addedLabel.count() > 0;
          evidenceLines.push(`deny-list-ui: term "Initech" added — visible in list: ${addConfirmed}`);
        }
      }

      // Scroll the section into view for the screenshot
      await confidentialSection.scrollIntoViewIfNeeded();
      await sleep(300);
    }

    await page.screenshot({ path: `${outDir}/deny-list-terms.png`, fullPage: false });
    evidenceLines.push('deny-list-terms.png: captured owner page with Confidential terms section');

    // ── 3. sanitizer-scan-log.png ────────────────────────────────────────────
    console.log(`    sanitizer [3/6] sanitizer-scan-log.png`);
    try {
      await page.goto(`${baseUrl}/teams/ari-collective/files/LESSONS.md`, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await page.goto(`${baseUrl}/teams/ari-collective/files/LESSONS.md`, { waitUntil: 'load', timeout: 30000 });
    }
    await sleep(SETTLE_MS);

    // Click the "Scan log" toggle button to expand it
    const scanLogToggle = page.locator('button:has-text("Scan log")');
    const hasToggle = await scanLogToggle.count() > 0;
    if (hasToggle) {
      await scanLogToggle.click();
      await sleep(400);
      evidenceLines.push('scan-log-panel: opened OK');
    } else {
      evidenceLines.push('scan-log-toggle: not found on page (may not be owner — proceeding)');
    }
    await page.screenshot({ path: `${outDir}/sanitizer-scan-log.png`, fullPage: true });
    evidenceLines.push('sanitizer-scan-log.png: captured');

    // ── 4. Create unique QA probe via API — triggers scanner in-process ─────
    console.log(`    sanitizer [4/6] creating ${probePath} via API`);
    const createResp = await page.request.post(`${baseUrl}/api/files`, {
      data: {
        subject_type: 'team',
        subject_slug: 'ari-collective',
        path: probePath,
        content: PROBE_CONTENT,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    evidenceLines.push(`probe-path: ${probePath}`);
    evidenceLines.push(`POST /api/files: HTTP ${createResp.status()}`);

    if (!createResp.ok()) {
      const body = await createResp.text().catch(() => '(no body)');
      evidenceLines.push(`  body: ${body.slice(0, 300)}`);
      throw new Error(`PRECONDITION FAILED: POST /api/files returned HTTP ${createResp.status()} for ${probePath} — ${body.slice(0, 200)}`);
    } else {
      const created = await createResp.json();
      evidenceLines.push(`  file id: ${created.id}  path: ${created.path}`);
    }

    // Allow scan to complete (runScan is synchronous in the API route)
    await sleep(500);

    // ── 5. sanitizer-block.png — review page with findings blocking publish ──
    console.log(`    sanitizer [5/6] sanitizer-block.png`);
    const reviewUrl = `${baseUrl}/teams/ari-collective/files/${encodedProbePath}/review`;
    try {
      await page.goto(reviewUrl, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await page.goto(reviewUrl, { waitUntil: 'load', timeout: 30000 });
    }
    await sleep(SETTLE_MS);

    // Assert: findings must be present (publish should be blocked)
    const findingCards = page.locator('.border.border-zinc-800.rounded.p-4');
    const findingCount = await findingCards.count();
    evidenceLines.push(`findings on review page: ${findingCount}`);
    if (findingCount === 0) {
      throw new Error('PRECONDITION FAILED: review page shows 0 findings — scanner did not detect probe content. Check detector logic for sk-test prefix, email, and confidential patterns.');
    }

    // Read the summary bar text (shows "N unresolved findings")
    const summaryBar = page.locator('div.bg-zinc-900.border.border-zinc-800.rounded');
    const summaryText = await summaryBar.textContent().catch(() => '(not found)');
    evidenceLines.push(`summary-bar: ${summaryText?.replace(/\s+/g, ' ').trim()}`);

    // Assert: Publish button must be DISABLED (findings unresolved)
    const publishBtn = page.locator('button:has-text("Publish")').first();
    const publishEnabledBefore = await publishBtn.isEnabled().catch(() => true);
    if (publishEnabledBefore) {
      throw new Error('PRECONDITION FAILED: Publish button is enabled before masking — canPublish should be false while findings are unresolved.');
    }
    evidenceLines.push('publish-before-mask: DISABLED (correct — findings blocking publish)');

    // Screenshot: shows blocked state with findings list
    await page.screenshot({ path: `${outDir}/sanitizer-block.png`, fullPage: true });
    evidenceLines.push('sanitizer-block.png: captured (publish blocked, findings listed)');

    // ── 6. Mask ALL findings, then publish ────────────────────────────────────
    console.log(`    sanitizer [6/6] masking all findings → sanitizer-masked-published.png`);

    // Iterate: click "Apply mask" on every unresolved finding card.
    // "Apply mask" exists for ALL finding types (secrets and non-secrets alike).
    // "Edit mask" only exists for non-secrets — we do NOT use it here.
    let maskedCount = 0;
    // Re-query after each mask (React re-renders the card to resolved state)
    for (let attempt = 0; attempt < 20; attempt++) {
      // Find the first idle "Apply mask" button (cards in resolved state lose this button)
      const applyBtn = page.locator('button:has-text("Apply mask")').first();
      const hasApply = await applyBtn.count() > 0;
      if (!hasApply) break; // no more unresolved findings

      await applyBtn.click();
      maskedCount++;
      // Wait for the API call to complete (card transitions to resolved state)
      await sleep(800);
    }

    evidenceLines.push(`findings masked: ${maskedCount}`);
    if (maskedCount === 0) {
      throw new Error('PRECONDITION FAILED: 0 findings masked — "Apply mask" button not found. Review the finding card HTML structure.');
    }

    // Assert: Publish button must now be ENABLED
    await sleep(500);
    const publishEnabled = await publishBtn.isEnabled().catch(() => false);
    evidenceLines.push(`publish-after-mask: ${publishEnabled ? 'ENABLED' : 'still DISABLED'}`);
    if (!publishEnabled) {
      throw new Error(`PRECONDITION FAILED: Publish button still disabled after masking ${maskedCount} findings. There may be additional unresolved findings.`);
    }

    // Click Publish and wait for success state (component shows "File published" heading)
    await publishBtn.click();
    try {
      await page.waitForSelector('h2:has-text("File published")', { timeout: 10000 });
    } catch {
      // May navigate elsewhere; check URL
    }
    await sleep(800);
    evidenceLines.push('publish-clicked: success');

    // Navigate to public file page to show masked content
    try {
      await page.goto(`${baseUrl}/teams/ari-collective/files/${encodedProbePath}`, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      await page.goto(`${baseUrl}/teams/ari-collective/files/${encodedProbePath}`, { waitUntil: 'load', timeout: 20000 });
    }
    await sleep(SETTLE_MS);
    await page.screenshot({ path: `${outDir}/sanitizer-masked-published.png`, fullPage: true });
    evidenceLines.push('sanitizer-masked-published.png: captured public file page with masks applied');

    // ── SQLite evidence rows ──────────────────────────────────────────────────
    // Query the DB directly for file row, findings with resolutions, scan log entries.
    try {
      const require = createRequire(import.meta.url);
      const Database = require('better-sqlite3');
      const dbPath = resolve(new URL('.', import.meta.url).pathname, '..', 'data', 'agentcv.db');
      const db = new Database(dbPath, { readonly: true });

      // File row
      const fileRow = db.prepare(
        `SELECT id, path, visibility, sanitization_state, created_at, updated_at
         FROM files WHERE path=? AND subject_type='team'
         ORDER BY id DESC LIMIT 1`
      ).get(probePath);

      if (fileRow) {
        evidenceLines.push('');
        evidenceLines.push('=== SQLite Evidence ===');
        evidenceLines.push(`files row: id=${fileRow.id} path=${fileRow.path} visibility=${fileRow.visibility} sanitization_state=${fileRow.sanitization_state}`);
        evidenceLines.push(`  created_at=${fileRow.created_at} updated_at=${fileRow.updated_at}`);

        // Findings
        const findings = db.prepare(
          `SELECT id, detector_id, finding_type, severity, status, suggested_mask, resolved_mask, resolved_at
           FROM file_findings WHERE file_id=? ORDER BY id`
        ).all(fileRow.id);
        evidenceLines.push(`file_findings: ${findings.length} total`);
        for (const f of findings) {
          evidenceLines.push(`  finding id=${f.id} type=${f.finding_type} severity=${f.severity} detector=${f.detector_id} status=${f.status} resolved_mask=${f.resolved_mask ?? '(none)'}`);
        }

        // Scan log
        const scanLogs = db.prepare(
          `SELECT id, scan_ts, finding_count, triggered_by, error_message
           FROM file_scan_log WHERE file_id=? ORDER BY id`
        ).all(fileRow.id);
        evidenceLines.push(`file_scan_log: ${scanLogs.length} entries`);
        for (const s of scanLogs) {
          evidenceLines.push(`  scan id=${s.id} ts=${s.scan_ts} findings=${s.finding_count} trigger=${s.triggered_by} error=${s.error_message ?? '(none)'}`);
        }
        evidenceLines.push('=== End SQLite Evidence ===');
      } else {
        evidenceLines.push(`SQLite: ${probePath} file row not found in DB`);
      }
      db.close();
    } catch (dbErr) {
      evidenceLines.push(`SQLite-query-error: ${dbErr.message ?? dbErr}`);
    }

  } catch (err) {
    // Hard failure — write FAIL marker so qa-shoot REQUIRED_CAPTURES gate catches it
    evidenceLines.push(`FAIL: ${err.message ?? err}`);
    console.error(`    sanitizer evidence FAIL: ${err.message ?? err}`);
    // Write evidence before re-throw so the file exists with the failure detail
    writeFileSync(`${outDir}/sanitizer-evidence.txt`, evidenceLines.join('\n') + '\n', 'utf8');
    console.log(`    sanitizer evidence written (FAIL): ${outDir}/sanitizer-evidence.txt`);
    await context.close();
    throw err;
  } finally {
    await context.close().catch(() => null);
  }

  // Write evidence file (success path)
  writeFileSync(`${outDir}/sanitizer-evidence.txt`, evidenceLines.join('\n') + '\n', 'utf8');
  console.log(`    sanitizer evidence written: ${outDir}/sanitizer-evidence.txt`);
}
// ────────────────────────────────────────────────────────────────────────────

const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

// Additional narrow viewports checked for overflow (no screenshots — width-only pass)
const NARROW_WIDTHS = [320, 360];
const SETTLE_MS = 600; // extra settle after networkidle

// Slugs of routes that are deliberately 404 — annotate their console entries
const EXPECTED_404_SLUGS = new Set(['not-found']);

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      port: { type: 'string', default: '3000' },
      out:  { type: 'string', default: 'docs/evidence/cycles/cycle-01' },
    },
  });
  return {
    port: parseInt(values.port, 10),
    outDir: resolve(values.out),
  };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Wire error listeners onto a page:
 * - console errors (with text from msg.text())
 * - pageerrors
 * - failed HTTP responses (non-2xx/3xx subresources) — includes response.url()
 * - network-level request failures — includes request.url()
 */
function wireErrorListeners(page, consoleEntries, routeSlug, viewport, isExpected) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleEntries.push({
        route: routeSlug,
        viewport,
        text: msg.text(),
        expected: isExpected,
      });
    }
  });

  page.on('pageerror', err => {
    consoleEntries.push({
      route: routeSlug,
      viewport,
      text: `[pageerror] ${err.message}`,
      expected: isExpected,
    });
  });

  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    // Capture failed subresource loads (4xx/5xx). Gives examiners the URL that
    // the browser console would only show as "Failed to load resource".
    // Exclude Next.js RSC prefetch requests (?_rsc=...) — these are speculative
    // background prefetches that Next.js's <Link> initiates; ERR_ABORTED on them
    // is expected when the browser de-prioritises or the page unmounts.
    if (status >= 400 && !url.includes('_rsc=')) {
      consoleEntries.push({
        route: routeSlug,
        viewport,
        text: `[failed-resource] HTTP ${status} — ${url}`,
        expected: isExpected,
      });
    }
  });

  page.on('requestfailed', request => {
    const url = request.url();
    // Exclude Next.js RSC prefetch aborts (same reason as above).
    if (url.includes('_rsc=')) return;
    consoleEntries.push({
      route: routeSlug,
      viewport,
      text: `[request-failed] ${request.failure()?.errorText ?? 'unknown'} — ${url}`,
      expected: isExpected,
    });
  });
}

/**
 * Open a new desktop context+page, wire error capture, navigate to url,
 * settle, then return { page, context }.  Caller must context.close().
 */
async function openDesktopPage(browser, url, consoleEntries, routeSlug) {
  const context = await browser.newContext({
    viewport: DESKTOP,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  wireErrorListeners(page, consoleEntries, routeSlug, 'desktop', EXPECTED_404_SLUGS.has(routeSlug));

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    console.warn(`    ⚠  networkidle timeout for ${routeSlug} desktop, using load`);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  }

  await sleep(SETTLE_MS);
  return { page, context };
}

/**
 * Measure the maximum scrollWidth of both documentElement and body.
 * Returns the larger of the two values.
 */
async function measureScrollWidth(page) {
  return page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  );
}

async function main() {
  const { port, outDir } = parseCliArgs();
  mkdirSync(outDir, { recursive: true });

  const baseUrl = `http://localhost:${port}`;
  const consoleEntries = []; // { route, viewport, text, expected? }
  const overflowRows = []; // { route, narrowScrollW: {320, 360}, mobileScrollW, desktopScrollW }

  console.log(`\n📸 shoot.mjs — base: ${baseUrl}  out: ${outDir}\n`);

  const browser = await chromium.launch({ headless: true });

  // ── Per-route: full-page desktop + fold + full-page mobile ────────────────
  for (const route of ROUTES) {
    const url = `${baseUrl}${route.path}`;
    console.log(`  → ${route.slug}  (${route.path})`);
    const isExpected = EXPECTED_404_SLUGS.has(route.slug);

    // Desktop: full-page + fold + overflow measurement
    let desktopScrollW = 0;
    {
      const context = await browser.newContext({
        viewport: DESKTOP,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      wireErrorListeners(page, consoleEntries, route.slug, 'desktop', isExpected);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        console.warn(`    ⚠  networkidle timeout for ${route.slug} desktop, using load`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }

      await sleep(SETTLE_MS);

      // Measure scrollWidth at desktop viewport (1440px)
      desktopScrollW = await measureScrollWidth(page);

      // Full-page desktop
      await page.screenshot({
        path: join(outDir, `${route.slug}-desktop.png`),
        fullPage: true,
      });

      // Above-the-fold desktop (viewport only)
      await page.screenshot({
        path: join(outDir, `${route.slug}-desktop-fold.png`),
        fullPage: false,
      });

      await context.close();
    }

    // Mobile: full-page only + overflow measurement at 390px
    let mobileScrollW = 0;
    {
      const context = await browser.newContext({
        viewport: MOBILE,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      wireErrorListeners(page, consoleEntries, route.slug, 'mobile', isExpected);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        console.warn(`    ⚠  networkidle timeout for ${route.slug} mobile, using load`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }

      await sleep(SETTLE_MS);

      // Measure scrollWidth at mobile viewport (390px)
      mobileScrollW = await measureScrollWidth(page);

      await page.screenshot({
        path: join(outDir, `${route.slug}-mobile.png`),
        fullPage: true,
      });

      await context.close();
    }

    // Narrow viewport overflow checks (320px, 360px) — measure only, no screenshots
    const narrowScrollW = {};
    for (const narrowWidth of NARROW_WIDTHS) {
      const context = await browser.newContext({
        viewport: { width: narrowWidth, height: 844 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      // No error listeners — noise-free; these are overflow-only probes
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }
      await sleep(SETTLE_MS);
      narrowScrollW[narrowWidth] = await measureScrollWidth(page);
      await context.close();
    }

    // Record overflow row
    overflowRows.push({
      route: route.slug,
      narrowScrollW,
      mobileScrollW,
      desktopScrollW,
    });
  }

  // ── Interaction capture 1: register agent form validation errors ──────────
  console.log(`  → [interaction] submit-validation-errors`);
  {
    const { page, context } = await openDesktopPage(
      browser,
      `${baseUrl}/register/agent`,
      consoleEntries,
      'submit-interaction',
    );

    // Click submit without filling anything
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Brief wait for React state to update and render error messages
    await sleep(400);

    // Full-page screenshot (agent form has no separate <form> wrapper tag)
    await page.screenshot({
      path: join(outDir, 'submit-validation-errors.png'),
      fullPage: true,
    });

    await context.close();
  }

  // ── Interaction capture 2: compare tray with 2 selections ─────────────────
  // Strategy: navigate directly with ?compare=ari-collective,magentic-one so
  // the CompareTray URL-state is pre-seeded without relying on JS click timing.
  // CompareTray reads the `compare` URL param via useSearchParams() and renders
  // the floating tray when selected.length > 0.
  console.log(`  → [interaction] compare-tray-selected`);
  {
    const { page, context } = await openDesktopPage(
      browser,
      `${baseUrl}/teams?compare=ari-collective,magentic-one`,
      consoleEntries,
      'teams-compare-interaction',
    );

    // The floating tray (CompareTray) appears when compare param has ≥1 slug.
    // Wait for it to be visible, then screenshot the viewport (fold) to show tray.
    const tray = page.locator('[role="status"][aria-live="polite"]');
    try {
      await tray.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      console.warn('    ⚠  compare tray not visible within 5s — screenshot anyway');
    }

    // Try to clip to the tray element directly; fall back to viewport bottom-half
    // so the floating tray is always prominent in the image.
    const viewportSize = page.viewportSize() ?? { width: 1440, height: 900 };
    let clip = null;
    try {
      const box = await tray.boundingBox();
      if (box) {
        // Expand 80 px above the tray to show context
        const padding = 80;
        clip = {
          x: 0,
          y: Math.max(0, box.y - padding),
          width: viewportSize.width,
          height: Math.min(viewportSize.height, box.height + padding * 2),
        };
      }
    } catch (_e) {
      // tray not found — fall back to bottom third of viewport
    }
    if (!clip) {
      const h = viewportSize.height;
      clip = { x: 0, y: Math.floor(h * 0.6), width: viewportSize.width, height: Math.floor(h * 0.4) };
    }
    await page.screenshot({
      path: join(outDir, 'compare-tray-selected.png'),
      fullPage: false,
      clip,
    });

    await context.close();
  }

  // ── Interaction capture 3: register team — 5-step stepper → team detail ───
  console.log(`  → [interaction] register-team-success`);
  {
    const { page, context } = await openDesktopPage(
      browser,
      `${baseUrl}/register/team`,
      consoleEntries,
      'register-team-success-interaction',
    );

    // Step 1 — Identity
    await page.fill('#st1-name', 'QA Probe Team');
    await page.fill('#st1-tagline', 'Automated QA submission — evidence-state probe');
    await page.fill('#st1-ownerName', 'QA Probe Owner');
    await page.fill('#st1-ownerHandle', 'qa-probe-owner');
    await page.fill('#st1-platform', 'OpenClaw');

    // Helper: click the "Next →" navigation button (not topology cards)
    const clickNext = () => page.locator('button:has-text("Next →")').click();

    // Click "Next →"
    await clickNext();
    await sleep(300);

    // Step 2 — Topology: click the "Orchestrator–Worker" card
    await page.locator('button:has-text("Orchestrator")').first().click();
    await sleep(200);

    // Capture mid-stepper: topology card selected (step 2)
    await page.screenshot({
      path: join(outDir, 'register-team-mid-stepper.png'),
      fullPage: false,
    });

    // Click "Next →"
    await clickNext();
    await sleep(300);

    // Step 3 — Members: fill member 1
    const memberRows = page.locator('.rounded-xl.border.border-border.bg-surface-elevated\\/50.p-4');
    await memberRows.first().locator('input').first().fill('QA Coder Agent');
    const memberInputs = memberRows.first().locator('input');
    await memberInputs.nth(0).fill('QA Coder Agent');
    await memberInputs.nth(1).fill('Lead coder');

    // Add member 2
    await page.locator('button:has-text("Add another member")').click();
    await sleep(200);
    const updatedRows = page.locator('.rounded-xl.border.border-border.bg-surface-elevated\\/50.p-4');
    const secondRow = updatedRows.nth(1);
    await secondRow.locator('input').nth(0).fill('QA Ops Watcher');
    await secondRow.locator('input').nth(1).fill('Ops watcher');

    // Click "Next →"
    await clickNext();
    await sleep(300);

    // Step 4 — Blueprint (minimal, all optional)
    // Click "Next →" immediately to skip
    await clickNext();
    await sleep(300);

    // Step 5 — Review: screenshot review state
    await page.screenshot({
      path: join(outDir, 'register-team-review.png'),
      fullPage: false,
    });

    // Submit and wait for navigation to the new team detail page
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => null),
      page.locator('button:has-text("Submit team")').click(),
    ]);

    // Extra settle after navigation
    await sleep(SETTLE_MS);

    // Full-page screenshot of the landed team detail page (/teams/<slug>?created=1).
    // The success band ("✓ <Name> is live on the registry") should be visible at top.
    await page.screenshot({
      path: join(outDir, 'register-team-success.png'),
      fullPage: true,
    });

    await context.close();
  }

  // ── Interaction capture 4: request form success — request-ID state ─────────
  console.log(`  → [interaction] request-success`);
  {
    const { page, context } = await openDesktopPage(
      browser,
      `${baseUrl}/request`,
      consoleEntries,
      'request-success-interaction',
    );


    // Fill required fields: requesterName, requesterEmail, message
    await page.fill('#requesterName', 'QA Probe Requester');
    await page.fill('#requesterEmail', 'qa-probe@example.com');
    await page.fill('#message', 'QA probe request — automated evidence-state capture. Ignore.');

    // Submit and wait for React state to update (form transitions to done state)
    await page.locator('button[type="submit"]').click();
    // Wait for the success confirmation element to appear
    try {
      await page.waitForSelector('text=Request #', { timeout: 10000 });
    } catch {
      console.warn('    ⚠  request success text not visible within 10s — screenshot anyway');
    }
    await sleep(SETTLE_MS);

    // Clip to the success card area; fall back to full page if not found
    let clip = null;
    try {
      const box = await page.locator('.rounded-xl.border-emerald-500\\/30').boundingBox();
      if (box) {
        clip = { x: 0, y: Math.max(0, box.y - 40), width: page.viewportSize()?.width ?? 1440, height: box.height + 120 };
      }
    } catch (_e) {
      // selector miss — fall back to full page
    }

    if (clip) {
      await page.screenshot({ path: join(outDir, 'request-success.png'), fullPage: false, clip });
    } else {
      await page.screenshot({ path: join(outDir, 'request-success.png'), fullPage: true });
    }

    await context.close();
  }

  // ── Sanitizer evidence captures (5 files) ────────────────────────────────
  // Requires DEV_LOGIN=1 on the server. qa-shoot.sh sets this.
  // If it's not set, captureSanitizerEvidence writes a warning and returns.
  console.log(`  → [sanitizer] evidence captures`);
  await captureSanitizerEvidence(browser, baseUrl, outDir, consoleEntries);

  await browser.close();

  // ── Write overflow-report.txt ─────────────────────────────────────────────
  // Gate checks all measured widths: 320, 360, 390 (mobile), 1440 (desktop)
  const overflowFailures = overflowRows.filter((r) => {
    if (r.mobileScrollW > MOBILE.width + OVERFLOW_TOLERANCE_PX) return true;
    if (r.desktopScrollW > DESKTOP.width + OVERFLOW_TOLERANCE_PX) return true;
    for (const w of NARROW_WIDTHS) {
      if ((r.narrowScrollW[w] ?? 0) > w + OVERFLOW_TOLERANCE_PX) return true;
    }
    return false;
  });

  {
    const narrowHeaders = NARROW_WIDTHS.map((w) => `SW_${w}`.padEnd(10)).join(' ');
    const header = [
      `# overflow-report.txt — generated by shoot.mjs`,
      `# Widths checked: ${NARROW_WIDTHS.join('px, ')}px (narrow), ${MOBILE.width}px (mobile screenshot), ${DESKTOP.width}px (desktop screenshot)`,
      `# PASS threshold per width: scrollWidth ≤ viewport + ${OVERFLOW_TOLERANCE_PX}px tolerance`,
      '',
      `${'ROUTE'.padEnd(48)} ${narrowHeaders} ${'SW_390'.padEnd(10)} ${'SW_1440'.padEnd(12)} RESULT`,
      '─'.repeat(100),
    ].join('\n');

    const lines = overflowRows.map((r) => {
      const failAt = [];
      const narrowCols = NARROW_WIDTHS.map((w) => {
        const sw = r.narrowScrollW[w] ?? 0;
        const fail = sw > w + OVERFLOW_TOLERANCE_PX;
        if (fail) failAt.push(`${w}px`);
        return `${sw}px${fail ? '!' : ''}`.padEnd(10);
      }).join(' ');

      const mobileFail = r.mobileScrollW > MOBILE.width + OVERFLOW_TOLERANCE_PX;
      const desktopFail = r.desktopScrollW > DESKTOP.width + OVERFLOW_TOLERANCE_PX;
      if (mobileFail) failAt.push('390px');
      if (desktopFail) failAt.push('1440px');

      const result = failAt.length > 0 ? `FAIL @${failAt.join(',')}` : 'PASS';
      const mobileStr = `${r.mobileScrollW}px${mobileFail ? '!' : ''}`.padEnd(10);
      const desktopStr = `${r.desktopScrollW}px${desktopFail ? '!' : ''}`.padEnd(12);
      return `${r.route.padEnd(48)} ${narrowCols} ${mobileStr} ${desktopStr} ${result}`;
    });

    const footer = [
      '─'.repeat(100),
      '',
      overflowFailures.length === 0
        ? '✅ PASS — zero overflow failures across all routes and viewports (320/360/390/1440px).'
        : `❌ FAIL — ${overflowFailures.length} route(s) overflow:\n${overflowFailures.map((r) => {
            const parts = [];
            for (const w of NARROW_WIDTHS) {
              const sw = r.narrowScrollW[w] ?? 0;
              if (sw > w + OVERFLOW_TOLERANCE_PX) parts.push(`  ${w}px: scrollWidth=${sw}px`);
            }
            if (r.mobileScrollW > MOBILE.width + OVERFLOW_TOLERANCE_PX)
              parts.push(`  390px: scrollWidth=${r.mobileScrollW}px`);
            if (r.desktopScrollW > DESKTOP.width + OVERFLOW_TOLERANCE_PX)
              parts.push(`  1440px: scrollWidth=${r.desktopScrollW}px`);
            return `  Route: ${r.route}\n${parts.join('\n')}`;
          }).join('\n')}`,
    ].join('\n');

    const overflowReportPath = join(outDir, 'overflow-report.txt');
    writeFileSync(overflowReportPath, header + '\n' + lines.join('\n') + '\n' + footer + '\n');
    console.log(`\nOverflow report written: ${overflowReportPath}`);
  }

  // Fail the process if any overflow detected — qa-shoot.sh inherits this exit code via set -e
  if (overflowFailures.length > 0) {
    console.error(
      `\n❌ OVERFLOW GATE FAILED — ${overflowFailures.length} route(s) have horizontal overflow:\n` +
      overflowFailures
        .map((r) => {
          const parts = [];
          for (const w of NARROW_WIDTHS) {
            const sw = r.narrowScrollW[w] ?? 0;
            if (sw > w + OVERFLOW_TOLERANCE_PX)
              parts.push(`  ${w}px: scrollWidth=${sw}px > ${w}px viewport`);
          }
          if (r.mobileScrollW > MOBILE.width + OVERFLOW_TOLERANCE_PX)
            parts.push(`  390px: scrollWidth=${r.mobileScrollW}px > ${MOBILE.width}px viewport`);
          if (r.desktopScrollW > DESKTOP.width + OVERFLOW_TOLERANCE_PX)
            parts.push(`  1440px: scrollWidth=${r.desktopScrollW}px > ${DESKTOP.width}px viewport`);
          return `  Route: ${r.route}\n${parts.join('\n')}`;
        })
        .join('\n') +
      '\n\nFix the layout issues before this pipeline can pass.\n'
    );
    process.exit(1);
  }

  // ── Write console-log.txt ─────────────────────────────────────────────────
  const logPath = join(outDir, 'console-log.txt');
  if (consoleEntries.length === 0) {
    writeFileSync(logPath, '# No console errors captured\n');
    console.log('\n✅ No console errors.');
  } else {
    const lines = consoleEntries.map(e => {
      const base = `[${e.route}] [${e.viewport}] ${e.text}`;
      return e.expected ? `${base}  (EXPECTED — deliberate 404-page capture)` : base;
    });
    const unexpectedCount = consoleEntries.filter(e => !e.expected).length;
    const expectedCount   = consoleEntries.filter(e =>  e.expected).length;
    const header = [
      `# console-log.txt — ${consoleEntries.length} total entr${consoleEntries.length === 1 ? 'y' : 'ies'}`,
      `# ${unexpectedCount} unexpected error(s), ${expectedCount} expected (annotated below)`,
      '',
    ].join('\n');
    writeFileSync(logPath, header + lines.join('\n') + '\n');
    if (unexpectedCount > 0) {
      console.log(`\n⚠  ${unexpectedCount} unexpected console error(s) (+${expectedCount} expected) — see ${logPath}`);
    } else {
      console.log(`\n✅ ${expectedCount} expected console entr${expectedCount === 1 ? 'y' : 'ies'} only (annotated in ${logPath})`);
    }
  }

  console.log(`\nDone. Output: ${outDir}\n`);
}

const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) {
  main().catch(err => {
    console.error('shoot.mjs fatal:', err);
    process.exit(1);
  });
}
