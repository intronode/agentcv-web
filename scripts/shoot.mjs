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
 *   submit-validation-errors.png   — /submit with empty form submitted
 *   compare-tray-selected.png      — /configurations with 2 items selected
 *
 * Console errors per page are written to console-log.txt in the out dir.
 * The deliberate /this-route-does-not-exist 404 is annotated in console-log.txt.
 * Animations are suppressed via prefers-reduced-motion for stable shots.
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { parseArgs } from 'util';

// ─── ROUTES LIST (edit this to add/remove surfaces) ─────────────────────────
export const ROUTES = [
  { path: '/',                                                              slug: 'home' },
  { path: '/configurations',                                               slug: 'configurations-directory' },
  { path: '/configurations?topology=hub_and_spoke',                       slug: 'configurations-filtered-hub-spoke' },
  { path: '/configurations/ari-collective',                                slug: 'configurations-ari-collective' },
  { path: '/configurations/magentic-one',                                  slug: 'configurations-magentic-one' },
  { path: '/configurations/helios-swarm',                                  slug: 'configurations-helios-swarm' },
  { path: '/compare?ids=ari-collective,magentic-one,metagpt-pipeline',    slug: 'compare-three' },
  { path: '/agents',                                                        slug: 'agents-directory' },
  { path: '/agents/ari',                                                    slug: 'agents-ari' },
  { path: '/owners/intronode',                                              slug: 'owners-intronode' },
  { path: '/harness-engineering',                                           slug: 'harness-engineering' },
  { path: '/submit',                                                        slug: 'submit' },
  { path: '/request?config=ari-collective',                                slug: 'request' },
  { path: '/this-route-does-not-exist',                                    slug: 'not-found' },
];
// ────────────────────────────────────────────────────────────────────────────

const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };
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
 * Open a new desktop context+page, wire console capture, navigate to url,
 * settle, then return { page, context }.  Caller must context.close().
 */
async function openDesktopPage(browser, url, consoleEntries, routeSlug) {
  const context = await browser.newContext({
    viewport: DESKTOP,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleEntries.push({ route: routeSlug, viewport: 'desktop', text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    consoleEntries.push({ route: routeSlug, viewport: 'desktop', text: `[pageerror] ${err.message}` });
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    console.warn(`    ⚠  networkidle timeout for ${routeSlug} desktop, using load`);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  }

  await sleep(SETTLE_MS);
  return { page, context };
}

async function main() {
  const { port, outDir } = parseCliArgs();
  mkdirSync(outDir, { recursive: true });

  const baseUrl = `http://localhost:${port}`;
  const consoleEntries = []; // { route, viewport, text, expected? }

  console.log(`\n📸 shoot.mjs — base: ${baseUrl}  out: ${outDir}\n`);

  const browser = await chromium.launch({ headless: true });

  // ── Per-route: full-page desktop + fold + full-page mobile ────────────────
  for (const route of ROUTES) {
    const url = `${baseUrl}${route.path}`;
    console.log(`  → ${route.slug}  (${route.path})`);

    // Desktop: full-page + fold
    {
      const context = await browser.newContext({
        viewport: DESKTOP,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleEntries.push({
            route: route.slug,
            viewport: 'desktop',
            text: msg.text(),
            expected: EXPECTED_404_SLUGS.has(route.slug),
          });
        }
      });
      page.on('pageerror', err => {
        consoleEntries.push({
          route: route.slug,
          viewport: 'desktop',
          text: `[pageerror] ${err.message}`,
          expected: EXPECTED_404_SLUGS.has(route.slug),
        });
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        console.warn(`    ⚠  networkidle timeout for ${route.slug} desktop, using load`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }

      await sleep(SETTLE_MS);

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

    // Mobile: full-page only
    {
      const context = await browser.newContext({
        viewport: MOBILE,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleEntries.push({
            route: route.slug,
            viewport: 'mobile',
            text: msg.text(),
            expected: EXPECTED_404_SLUGS.has(route.slug),
          });
        }
      });
      page.on('pageerror', err => {
        consoleEntries.push({
          route: route.slug,
          viewport: 'mobile',
          text: `[pageerror] ${err.message}`,
          expected: EXPECTED_404_SLUGS.has(route.slug),
        });
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        console.warn(`    ⚠  networkidle timeout for ${route.slug} mobile, using load`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }

      await sleep(SETTLE_MS);

      await page.screenshot({
        path: join(outDir, `${route.slug}-mobile.png`),
        fullPage: true,
      });

      await context.close();
    }
  }

  // ── Interaction capture 1: submit form validation errors ──────────────────
  console.log(`  → [interaction] submit-validation-errors`);
  {
    const { page, context } = await openDesktopPage(
      browser,
      `${baseUrl}/submit`,
      consoleEntries,
      'submit-interaction',
    );

    // Click submit without filling anything
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Brief wait for React state to update and render error messages
    await sleep(400);

    // Screenshot the full form area (full-page to capture all validation inline errors)
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
      `${baseUrl}/configurations?compare=ari-collective,magentic-one`,
      consoleEntries,
      'configurations-compare-interaction',
    );

    // The floating tray (CompareTray) appears when compare param has ≥1 slug.
    // Wait for it to be visible, then screenshot the viewport (fold) to show tray.
    const tray = page.locator('[role="status"][aria-live="polite"]');
    try {
      await tray.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      console.warn('    ⚠  compare tray not visible within 5s — screenshot anyway');
    }

    // Viewport (not full-page) to keep the floating tray and card grid both in frame
    await page.screenshot({
      path: join(outDir, 'compare-tray-selected.png'),
      fullPage: false,
    });

    await context.close();
  }

  await browser.close();

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

main().catch(err => {
  console.error('shoot.mjs fatal:', err);
  process.exit(1);
});
