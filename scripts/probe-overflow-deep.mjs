#!/usr/bin/env node
/**
 * probe-overflow-deep.mjs — Deep horizontal-overflow forensics
 *
 * Extends probe-overflow.mjs with:
 *   1. Multiple widths: 320, 360, 375, 390, 414
 *   2. Element-level getBoundingClientRect scan (flags anything whose
 *      .right > viewportWidth + 2  OR  .left < -2)
 *   3. Interaction states: filters open, compare tray visible, 3-way compare,
 *      submit validation errors, submit Blueprint section, attestation form open,
 *      long-name config, agent with evidence URLs
 *   4. Post-scroll re-measure (triggers lazy-mounted elements like BackToTop)
 *
 * Usage:
 *   node scripts/probe-overflow-deep.mjs [--port 3190]
 *
 * Exit 0 = nothing found across full matrix.
 * Exit 1 = at least one finding.
 */

import { chromium } from 'playwright';
import { parseArgs } from 'util';

// ── CLI args ──────────────────────────────────────────────────────────────────
const { values: cliValues } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: 'string', default: '3190' },
  },
});
const PORT = parseInt(cliValues.port, 10);
const BASE = `http://localhost:${PORT}`;

// ── Widths under test ─────────────────────────────────────────────────────────
const WIDTHS = [320, 360, 375, 390, 414];
const VIEWPORT_HEIGHT = 844;
const TOLERANCE = 2; // px

// ── Base routes (same as probe-overflow.mjs, plus extra detail pages) ─────────
const BASE_ROUTES = [
  { path: '/', label: 'home' },
  { path: '/configurations', label: 'configurations' },
  { path: '/configurations?topology=hub_and_spoke', label: 'configurations-filtered' },
  { path: '/configurations/ari-collective', label: 'config-ari-collective' },
  { path: '/configurations/magentic-one', label: 'config-magentic-one' },
  { path: '/configurations/metagpt-pipeline', label: 'config-metagpt-pipeline' },
  { path: '/configurations/helios-swarm', label: 'config-helios-swarm' },
  { path: '/compare?ids=ari-collective,magentic-one,metagpt-pipeline', label: 'compare-three' },
  { path: '/agents', label: 'agents' },
  { path: '/agents/ari', label: 'agent-ari' },
  { path: '/owners/intronode', label: 'owners-intronode' },
  { path: '/harness-engineering', label: 'harness-engineering' },
  { path: '/submit', label: 'submit' },
  { path: '/request?config=ari-collective', label: 'request' },
  { path: '/this-route-does-not-exist', label: 'not-found' },
];

// ── Interaction scenarios ─────────────────────────────────────────────────────
// Each scenario: { label, setup(page, viewportWidth) → Promise<void> }
const SCENARIOS = [
  // (a) /configurations with mobile Filters disclosure OPEN
  {
    label: 'configurations-filters-open',
    path: '/configurations',
    setup: async (page) => {
      // Click the Filters button (only visible at < sm = 640px)
      const btn = page.locator('button', { hasText: 'Filters' });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    },
  },

  // (b) /configurations with compare tray visible
  {
    label: 'configurations-compare-tray',
    path: '/configurations?compare=ari-collective,magentic-one',
    setup: async (page) => {
      // The CompareTray reads from URL params — just wait for it to render
      await page.waitForTimeout(600);
    },
  },

  // (c) /compare 3-way (also covered in base routes, but with extra post-load wait)
  {
    label: 'compare-3way-interaction',
    path: '/compare?ids=ari-collective,magentic-one,metagpt-pipeline',
    setup: async (page) => {
      // Scroll to bottom to load any deferred elements, then back to check sticky header
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
    },
  },

  // (d) /submit with validation errors triggered
  {
    label: 'submit-validation-errors',
    path: '/submit',
    setup: async (page) => {
      // Click the submit button without filling in any fields
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    },
  },

  // (e) /submit scrolled to the Blueprint section
  {
    label: 'submit-blueprint-section',
    path: '/submit',
    setup: async (page) => {
      // Scroll to the Blueprint section (wide textarea)
      const section = page.locator('#section-blueprint');
      if (await section.isVisible()) {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
      } else {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(300);
      }
    },
  },

  // (f) a detail page with attestation form OPEN
  {
    label: 'config-attestation-open',
    path: '/configurations/ari-collective',
    setup: async (page) => {
      // Look for an "Attest" or "Add attestation" button
      const btn = page.locator('button', { hasText: /attest|vouch/i }).first();
      if (await btn.count() > 0 && await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    },
  },

  // (g) /configurations/metagpt-pipeline — longest config name (already in base, but with scroll)
  {
    label: 'config-metagpt-scrolled',
    path: '/configurations/metagpt-pipeline',
    setup: async (page) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
    },
  },

  // (h) agent page with long evidence URLs in proof entries (ari has evidence URLs)
  {
    label: 'agent-ari-scrolled',
    path: '/agents/ari',
    setup: async (page) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
    },
  },
];

// ── Element overflow scanner ──────────────────────────────────────────────────
/**
 * Walks all elements in the DOM and returns those whose bounding rect
 * escapes the viewport width. Skips invisible elements (offsetParent === null)
 * BUT includes fixed/sticky elements by checking position separately.
 *
 * Returns an array of { selector, rect, overflow } objects.
 *
 * This is a serializable function (passed to page.evaluate as a function,
 * not a string), so it receives its args as the first parameter.
 */
function scanOverflowingElements({ viewportWidth, tolerance }) {
  const findings = [];
  const seen = new WeakSet();

  function selectorPath(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && cur.nodeType === 1) {
      let seg = cur.tagName.toLowerCase();
      if (cur.id) {
        seg += '#' + cur.id;
      } else if (cur.className && typeof cur.className === 'string') {
        const cls = cur.className.trim().split(/\s+/).filter(c => c.length < 30).slice(0, 3).join('.');
        if (cls) seg += '.' + cls;
      }
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    if (style.position === 'fixed' || style.position === 'sticky') return true;
    return el.offsetParent !== null;
  }

  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (seen.has(el)) continue;
    seen.add(el);
    if (!isVisible(el)) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const escapesRight = rect.right > viewportWidth + tolerance;
    const escapesLeft = rect.left < -tolerance;

    if (escapesRight || escapesLeft) {
      findings.push({
        selector: selectorPath(el),
        tagName: el.tagName,
        classList: el.className ? String(el.className).slice(0, 120) : '',
        rectLeft: Math.round(rect.left),
        rectRight: Math.round(rect.right),
        rectTop: Math.round(rect.top),
        viewportWidth,
        overflowRight: escapesRight ? Math.round(rect.right - viewportWidth) : 0,
        overflowLeft: escapesLeft ? Math.round(-rect.left) : 0,
        position: window.getComputedStyle(el).position,
        overflow: window.getComputedStyle(el).overflow,
        innerText: el.innerText ? el.innerText.slice(0, 60).replace(/\n/g, '↵') : '',
      });
    }
  }
  return findings;
}

// ── Measure one page ──────────────────────────────────────────────────────────
async function probePage(browser, { path, label, setup }, width) {
  const context = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHT },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  const url = `${BASE}${path}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    } catch (e) {
      await context.close();
      return { label, width, url, error: String(e) };
    }
  }
  await page.waitForTimeout(400);

  // Run interaction setup if provided
  if (setup) {
    try {
      await setup(page, width);
    } catch {
      // Setup failures are noted but don't abort the scan
    }
  }

  // Scroll to bottom to trigger lazy-mounted elements (BackToTop etc.)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(350);

  // Measure document-level scrollWidth
  const docScrollWidth = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  );

  // Element-level scan — pass function directly so Playwright serializes it correctly
  const elementFindings = await page.evaluate(scanOverflowingElements, { viewportWidth: width, tolerance: TOLERANCE });

  await context.close();
  return {
    label,
    width,
    url,
    docScrollWidth,
    docOverflow: docScrollWidth > width + TOLERANCE,
    elementFindings,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  probe-overflow-deep.mjs`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Widths: ${WIDTHS.join(', ')} px`);
  console.log(`  Base routes: ${BASE_ROUTES.length}`);
  console.log(`  Interaction scenarios: ${SCENARIOS.length}`);
  console.log(`${'='.repeat(80)}\n`);

  const browser = await chromium.launch({ headless: true });

  const allFindings = [];
  let totalTested = 0;

  // ── Phase 1: Base routes × widths ──────────────────────────────────────────
  console.log('PHASE 1 — Base routes × widths\n');
  console.log(
    `${'ROUTE'.padEnd(40)} ${'WIDTH'.padEnd(7)} ${'DOC-SCROLL'.padEnd(12)} ${'ELEMS'.padEnd(7)} STATUS`
  );
  console.log('─'.repeat(80));

  for (const route of BASE_ROUTES) {
    for (const width of WIDTHS) {
      const result = await probePage(browser, route, width);
      totalTested++;

      if (result.error) {
        console.log(
          `${result.label.padEnd(40)} ${String(width).padEnd(7)} ${'ERROR'.padEnd(12)} ${'?'.padEnd(7)} ERROR: ${result.error.slice(0, 40)}`
        );
        continue;
      }

      const docStr = `${result.docScrollWidth}px${result.docOverflow ? ' ✗' : ''}`;
      const elemCount = result.elementFindings.length;
      const status = result.docOverflow || elemCount > 0 ? 'FAIL' : 'ok';

      console.log(
        `${result.label.padEnd(40)} ${String(width).padEnd(7)} ${docStr.padEnd(12)} ${String(elemCount).padEnd(7)} ${status}`
      );

      if (result.docOverflow || elemCount > 0) {
        allFindings.push(result);
      }
    }
  }

  // ── Phase 2: Interaction scenarios × widths ────────────────────────────────
  console.log('\nPHASE 2 — Interaction scenarios × widths\n');
  console.log(
    `${'SCENARIO'.padEnd(40)} ${'WIDTH'.padEnd(7)} ${'DOC-SCROLL'.padEnd(12)} ${'ELEMS'.padEnd(7)} STATUS`
  );
  console.log('─'.repeat(80));

  for (const scenario of SCENARIOS) {
    for (const width of WIDTHS) {
      const result = await probePage(browser, scenario, width);
      totalTested++;

      if (result.error) {
        console.log(
          `${result.label.padEnd(40)} ${String(width).padEnd(7)} ${'ERROR'.padEnd(12)} ${'?'.padEnd(7)} ERROR: ${result.error.slice(0, 40)}`
        );
        continue;
      }

      const docStr = `${result.docScrollWidth}px${result.docOverflow ? ' ✗' : ''}`;
      const elemCount = result.elementFindings.length;
      const status = result.docOverflow || elemCount > 0 ? 'FAIL' : 'ok';

      console.log(
        `${result.label.padEnd(40)} ${String(width).padEnd(7)} ${docStr.padEnd(12)} ${String(elemCount).padEnd(7)} ${status}`
      );

      if (result.docOverflow || elemCount > 0) {
        allFindings.push(result);
      }
    }
  }

  await browser.close();

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  SUMMARY: ${totalTested} (route, width) combinations tested`);
  console.log(`${'='.repeat(80)}`);

  if (allFindings.length === 0) {
    console.log('\nRESULT: CLEAN — no document overflow and no escaping elements found');
    console.log(`across all ${totalTested} (route, width, state) combinations.\n`);
    process.exit(0);
  }

  console.log(`\nRESULT: FINDINGS — ${allFindings.length} combination(s) with issues:\n`);

  for (const f of allFindings) {
    console.log(`\n┌─ ${f.label} @ ${f.width}px`);
    console.log(`│  URL: ${f.url}`);

    if (f.docOverflow) {
      console.log(`│  DOC scrollWidth: ${f.docScrollWidth}px (overflow: +${f.docScrollWidth - f.width}px)`);
    } else {
      console.log(`│  DOC scrollWidth: ${f.docScrollWidth}px (ok)`);
    }

    if (f.elementFindings.length > 0) {
      console.log(`│  ELEMENT-LEVEL ESCAPES (${f.elementFindings.length}):`);
      for (const el of f.elementFindings) {
        const direction = el.overflowRight > 0
          ? `right by ${el.overflowRight}px (rect.right=${el.rectRight})`
          : `left by ${el.overflowLeft}px (rect.left=${el.rectLeft})`;
        console.log(`│    • ${el.tagName} [${el.position}]`);
        console.log(`│      selector: ${el.selector.slice(0, 100)}`);
        if (el.classList) console.log(`│      classes:  ${el.classList.slice(0, 100)}`);
        console.log(`│      escapes:  ${direction}`);
        if (el.innerText) console.log(`│      text:     "${el.innerText}"`);
      }
    }
    console.log('└─');
  }

  console.log('');
  process.exit(1);
}

main().catch((err) => {
  console.error('probe-overflow-deep.mjs fatal:', err);
  process.exit(1);
});
