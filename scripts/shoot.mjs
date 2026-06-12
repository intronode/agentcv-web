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
 *
 * Failed resource loads are captured via response/requestfailed events so that
 * the failing URL is included in the log (not just the browser console text).
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { parseArgs } from 'util';

// Overflow tolerance: browser sub-pixel rounding can add ≤2 px
const OVERFLOW_TOLERANCE_PX = 2;

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

    // Clip to the form element bounding box — a full-page shot is illegible
    // because validation errors appear inline and the form is only a portion
    // of the viewport.  locator.screenshot() clips to the element exactly.
    await page.locator('form').screenshot({
      path: join(outDir, 'submit-validation-errors.png'),
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

main().catch(err => {
  console.error('shoot.mjs fatal:', err);
  process.exit(1);
});
