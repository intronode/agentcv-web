#!/usr/bin/env node
/**
 * check-contrast.mjs — WCAG AA automated contrast checker
 *
 * Usage:
 *   node scripts/check-contrast.mjs --port 3190
 *
 * Or via npm script:
 *   npm run check:contrast
 *
 * The server must be running before invoking this script.
 * It does NOT start or stop any server.
 *
 * For each route in ROUTES (same list as shoot.mjs), at desktop 1440×900:
 *   - Walks all visible text nodes (elements with direct text content)
 *   - Computes effective foreground color (color property)
 *   - Walks up ancestors to find first non-transparent background color
 *   - Computes WCAG contrast ratio
 *   - Classifies as large text (≥24px normal, or ≥18.66px bold) → threshold 3:1
 *     else normal text → threshold 4.5:1
 *   - Skips aria-hidden elements (decorative)
 *   - De-duplicates by (fg hex, bg hex, is-large-text) pair
 *   - Reports per-route table + unique-failing-pairs summary
 *
 * Integration note: wired into qa-shoot.sh as a hard gate (Step e2). Also runnable standalone.
 * To verify after a build: npm run check:contrast
 * Or with explicit port: node scripts/check-contrast.mjs --port 3190
 */

import { chromium } from 'playwright';
import { parseArgs } from 'util';

// ── Import ROUTES from shoot.mjs ─────────────────────────────────────────────
import { ROUTES } from './shoot.mjs';

const DESKTOP = { width: 1440, height: 900 };
const SETTLE_MS = 800;

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      port: { type: 'string', default: '3190' },
    },
  });
  return { port: parseInt(values.port, 10) };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── WCAG contrast math ───────────────────────────────────────────────────────

/** Parse "rgb(r, g, b)" or "rgba(r, g, b, a)" to { r, g, b, a }. Returns null on failure. */
function parseRgb(str) {
  if (!str) return null;
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return {
    r: parseInt(m[1], 10),
    g: parseInt(m[2], 10),
    b: parseInt(m[3], 10),
    a: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}

/** sRGB linearise — WCAG formula */
function linearise(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blend foreground over background using alpha compositing */
function alphaBlend(fg, bg) {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function toHex({ r, g, b }) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

// ── Per-page contrast scan (runs in browser context via page.evaluate) ────────

/**
 * Evaluate all visible text nodes and return contrast data.
 * This function is serialised and executed inside the browser — no imports.
 */
function browserContrastScan() {
  /**
   * Resolve ANY CSS color string to { r, g, b, a } using a 1×1 canvas.
   * Handles rgb(), rgba(), hsl(), color-mix(), oklab(), named colors, etc.
   * Returns null ONLY if the string is empty, transparent, or truly unresolvable.
   */
  function resolveColor(str) {
    if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null;
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      // Test if the color is parseable: set sentinel then attempt target
      ctx.fillStyle = 'rgba(0,0,0,0)'; // clear sentinel
      ctx.fillStyle = str;             // attempt to set the target color
      const resolved = ctx.fillStyle;  // browser normalizes to rgb(...) if valid
      if (resolved === 'rgba(0, 0, 0, 0)') return null; // rejected / transparent
      // Measure the actual pixel value
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = str;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch (_e) {
      return null;
    }
  }

  function alphaBlendInBrowser(fg, bg) {
    const a = fg.a;
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
      a: 1,
    };
  }

  /**
   * Walk up ancestors from el to find the first non-transparent background color.
   * Returns composited RGB with alpha resolved against #0a0a0a page base.
   */
  function effectiveBg(el) {
    const PAGE_BASE = { r: 10, g: 10, b: 10, a: 1 }; // --color-surface #0a0a0a
    let composited = PAGE_BASE;

    // Collect the chain from element up to body
    const chain = [];
    let cur = el;
    while (cur && cur !== document.documentElement) {
      chain.push(cur);
      cur = cur.parentElement;
    }
    chain.push(document.body);
    chain.reverse(); // outermost first

    for (const node of chain) {
      const cs = window.getComputedStyle(node);
      const bgColor = cs.backgroundColor;
      if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') continue;
      const parsed = resolveColor(bgColor);
      if (!parsed) continue;
      if (parsed.a === 0) continue;
      if (parsed.a < 1) {
        composited = alphaBlendInBrowser(parsed, composited);
      } else {
        composited = parsed;
      }
    }
    return composited;
  }

  /**
   * Determine if an element is inside an aria-hidden tree (decorative).
   */
  function isAriaHidden(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      if (cur.getAttribute('aria-hidden') === 'true') return true;
      cur = cur.parentElement;
    }
    return false;
  }

  /**
   * Returns true if element is actually visible (not display:none, not visibility:hidden,
   * has non-zero dimensions, is within the document).
   */
  function isVisible(el) {
    if (!el.offsetParent && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
      // offsetParent null can mean position:fixed — check rect
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
    }
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none') return false;
    if (cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return true;
  }

  /**
   * Build a short class-signature string for deduplication (first 3 meaningful classes).
   */
  function classSignature(el) {
    const classes = Array.from(el.classList)
      .filter((c) => !c.startsWith('hover:') && !c.startsWith('focus:'))
      .slice(0, 4)
      .join(' ');
    return classes || el.tagName.toLowerCase();
  }

  const uncheckable = [];
  const results = [];

  // Walk all elements — get those with direct text children
  const allEls = document.querySelectorAll('*');
  for (const el of allEls) {
    // Only look at elements that have at least one non-empty direct text node
    let hasDirectText = false;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
        hasDirectText = true;
        break;
      }
    }
    if (!hasDirectText) continue;

    // Skip aria-hidden trees
    if (isAriaHidden(el)) continue;

    // Skip invisible elements
    if (!isVisible(el)) continue;

    const cs = window.getComputedStyle(el);

    // Get foreground color
    const fgStr = cs.color;
    if (!fgStr) continue;
    const fgParsed = resolveColor(fgStr);
    if (!fgParsed) {
      // Not transparent/empty but canvas couldn't parse — track as uncheckable
      if (fgStr && fgStr !== 'transparent' && fgStr !== 'rgba(0, 0, 0, 0)') {
        uncheckable.push({
          tag: el.tagName.toLowerCase(),
          classSig: classSignature(el),
          colorStr: fgStr.slice(0, 100),
          textSample: el.textContent.trim().slice(0, 40),
        });
      }
      continue;
    }

    // Get effective background
    const bgComposited = effectiveBg(el);

    // Composite fg alpha over bg if needed
    const fgResolved =
      fgParsed.a < 1 ? alphaBlendInBrowser(fgParsed, bgComposited) : fgParsed;

    // Determine font size and weight for large-text classification
    const fontSize = parseFloat(cs.fontSize); // in px
    const fontWeight = parseInt(cs.fontWeight, 10) || 400;
    const isBold = fontWeight >= 700;
    const isLargeText = fontSize >= 24 || (isBold && fontSize >= 18.66);

    results.push({
      tag: el.tagName.toLowerCase(),
      classSig: classSignature(el),
      fgR: fgResolved.r,
      fgG: fgResolved.g,
      fgB: fgResolved.b,
      bgR: bgComposited.r,
      bgG: bgComposited.g,
      bgB: bgComposited.b,
      fontSize: Math.round(fontSize * 10) / 10,
      fontWeight,
      isLargeText,
      // Include a short text sample for easier debugging
      textSample: el.textContent.trim().slice(0, 40),
    });
  }

  return { results, uncheckable };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { port } = parseCliArgs();
  const baseUrl = `http://localhost:${port}`;

  console.log(`\ncheck-contrast.mjs — WCAG AA audit`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Routes:   ${ROUTES.length}`);
  console.log(`Thresholds: normal text >=4.5:1, large text >=3:1\n`);

  // ── 2a. SERVER PREFLIGHT ────────────────────────────────────────────────────
  console.log(`Checking server reachability at ${baseUrl}/...`);
  try {
    const preflight = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(5000) });
    if (!preflight.ok) {
      console.error(`ERROR: cannot reach server at ${baseUrl} — HTTP ${preflight.status} (expected 2xx). Start a server first (the gate runs this while the qa-shoot server is up; standalone: npm start) before running check-contrast.`);
      process.exit(2);
    }
    console.log(`Server reachable (HTTP ${preflight.status}). OK.\n`);
  } catch (err) {
    console.error(`ERROR: cannot reach server at ${baseUrl} — ${err.message}. Start a server first (the gate runs this while the qa-shoot server is up; standalone: npm start) before running check-contrast.`);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });

  /** All failing pairs across all routes: Map<"fg|bg|isLarge", {fg, bg, isLarge, ratio, threshold, routes[]}> */
  const globalFailMap = new Map();
  /** Per-route results */
  const routeResults = [];

  for (const route of ROUTES) {
    const url = `${baseUrl}${route.path}`;
    process.stdout.write(`  -> ${route.slug.padEnd(42)}`);

    const context = await browser.newContext({
      viewport: DESKTOP,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      } catch (loadErr) {
        console.log(`SKIP (load failed)`);
        await context.close();
        // 2b. Track skips as failures
        routeResults.push({ slug: route.slug, failures: [], scanned: 0, skipped: true, reason: `load failed: ${loadErr.message}` });
        continue;
      }
    }

    await sleep(SETTLE_MS);

    // Run the contrast scan in browser context
    let rawResults;
    let uncheckable;
    try {
      const evalResult = await page.evaluate(browserContrastScan);
      rawResults = evalResult.results;
      uncheckable = evalResult.uncheckable;
    } catch (err) {
      console.log(`SKIP (evaluate failed: ${err.message})`);
      await context.close();
      // 2b. Track skips as failures
      routeResults.push({ slug: route.slug, failures: [], scanned: 0, skipped: true, reason: `evaluate failed: ${err.message}` });
      continue;
    }

    await context.close();

    if (uncheckable.length > 0) {
      console.log(`     (${uncheckable.length} uncheckable: ${uncheckable.map(u => `"${u.textSample}"`).join(', ').slice(0, 80)})`);
    }

    // 2b. Zero text nodes = page did not render — treat as skip/failure
    if (rawResults.length === 0) {
      console.log(`SKIP (0 text nodes — page likely did not render)`);
      routeResults.push({ slug: route.slug, failures: [], scanned: 0, skipped: true, reason: '0 text nodes scanned — page likely did not render' });
      continue;
    }

    // Process results
    const failures = [];
    /** De-duplicate by (fgHex, bgHex, isLargeText) within this route */
    const seenPairs = new Set();

    for (const r of rawResults) {
      const fg = { r: r.fgR, g: r.fgG, b: r.fgB };
      const bg = { r: r.bgR, g: r.bgG, b: r.bgB };
      const fgHex = toHex(fg);
      const bgHex = toHex(bg);
      const key = `${fgHex}|${bgHex}|${r.isLargeText ? 'L' : 'N'}`;

      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      const fgL = relativeLuminance(fg);
      const bgL = relativeLuminance(bg);
      const ratio = contrastRatio(fgL, bgL);
      const threshold = r.isLargeText ? 3.0 : 4.5;

      if (ratio < threshold) {
        const failure = {
          fg: fgHex,
          bg: bgHex,
          ratio: Math.round(ratio * 100) / 100,
          threshold,
          isLargeText: r.isLargeText,
          fontSize: r.fontSize,
          fontWeight: r.fontWeight,
          tag: r.tag,
          classSig: r.classSig,
          textSample: r.textSample,
        };
        failures.push(failure);

        // Register in global map
        const globalKey = `${fgHex}|${bgHex}|${r.isLargeText ? 'L' : 'N'}`;
        if (!globalFailMap.has(globalKey)) {
          globalFailMap.set(globalKey, {
            fg: fgHex,
            bg: bgHex,
            ratio: Math.round(ratio * 100) / 100,
            threshold,
            isLargeText: r.isLargeText,
            fontSize: r.fontSize,
            fontWeight: r.fontWeight,
            tag: r.tag,
            classSig: r.classSig,
            textSample: r.textSample,
            routes: [],
          });
        }
        globalFailMap.get(globalKey).routes.push(route.slug);
        // keep lowest ratio in global map
        const existing = globalFailMap.get(globalKey);
        if (ratio < existing.ratio) existing.ratio = Math.round(ratio * 100) / 100;
      }
    }

    const uncheckableCount = uncheckable.length;
    let status;
    if (failures.length === 0 && uncheckableCount === 0) {
      status = `PASS (${seenPairs.size} pairs, ${rawResults.length} els)`;
    } else if (failures.length > 0) {
      status = `FAIL (${failures.length} pair${failures.length === 1 ? '' : 's'}${uncheckableCount > 0 ? `; ${uncheckableCount} uncheckable` : ''})`;
    } else {
      status = `FAIL (${uncheckableCount} uncheckable)`;
    }
    console.log(status);
    routeResults.push({ slug: route.slug, failures, scanned: seenPairs.size + failures.length, uncheckableCount });
  }

  await browser.close();

  // ── Per-route report ───────────────────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('PER-ROUTE CONTRAST FAILURES');
  console.log('-'.repeat(80));

  let totalRouteFailures = 0;
  for (const r of routeResults) {
    if (r.failures.length === 0) continue;
    totalRouteFailures++;
    console.log(`\nRoute: ${r.slug}`);
    console.log(`  ${'FG'.padEnd(10)} ${'BG'.padEnd(10)} ${'Ratio'.padEnd(8)} ${'Threshold'.padEnd(11)} ${'Size'.padEnd(8)} Text sample`);
    console.log(`  ${'-'.repeat(70)}`);
    for (const f of r.failures) {
      const large = f.isLargeText ? ' (large)' : '';
      console.log(
        `  ${f.fg.padEnd(10)} ${f.bg.padEnd(10)} ${String(f.ratio).padEnd(8)} ${String(f.threshold).padEnd(11)} ${String(f.fontSize + 'px').padEnd(8)} "${f.textSample}"${large}`,
      );
    }
  }

  if (totalRouteFailures === 0) {
    console.log('\n  (no per-route failures)');
  }

  // ── Unique failing pairs summary ──────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('UNIQUE FAILING PAIRS SUMMARY');
  console.log('-'.repeat(80));

  const globalFails = Array.from(globalFailMap.values()).sort((a, b) => a.ratio - b.ratio);

  if (globalFails.length === 0) {
    console.log('\n  (no failing pairs)');
  } else {
    console.log(`\n  ${globalFails.length} unique failing pair${globalFails.length === 1 ? '' : 's'}:\n`);
    console.log(
      `  ${'FG'.padEnd(10)} ${'BG'.padEnd(10)} ${'Ratio'.padEnd(8)} ${'Thresh'.padEnd(8)} ${'Type'.padEnd(10)} Routes`,
    );
    console.log(`  ${'-'.repeat(70)}`);
    for (const f of globalFails) {
      const type = f.isLargeText ? 'large' : 'normal';
      console.log(
        `  ${f.fg.padEnd(10)} ${f.bg.padEnd(10)} ${String(f.ratio).padEnd(8)} ${String(f.threshold).padEnd(8)} ${type.padEnd(10)} ${f.routes.slice(0, 3).join(', ')}${f.routes.length > 3 ? ` +${f.routes.length - 3} more` : ''}`,
      );
      console.log(`       Sample: "${f.textSample}"`);
    }
  }

  // ── 2c. Final gate logic (fail-loud) ─────────────────────────────────────
  const skippedRoutes = routeResults.filter((r) => r.skipped);
  const routesChecked = routeResults.length;
  const routesFailed = routeResults.filter((r) => r.failures.length > 0).length;
  const uniquePairs = globalFails.length;

  const totalUncheckable = routeResults.reduce((s, r) => s + (r.uncheckableCount || 0), 0);

  console.log('\n' + '-'.repeat(80));
  console.log(`SUMMARY: ${routesChecked} routes checked, ${routesFailed} routes with failures, ${skippedRoutes.length} routes skipped, ${uniquePairs} unique failing pair${uniquePairs === 1 ? '' : 's'}, ${totalUncheckable} uncheckable elements`);
  console.log('-'.repeat(80) + '\n');

  if (skippedRoutes.length > 0) {
    console.error(`CHECK FAILED: ${skippedRoutes.length} route(s) could not be evaluated (skipped) — a skipped route is a failure of the check, NOT a pass:`);
    for (const r of skippedRoutes) {
      console.error(`  - ${r.slug}: ${r.reason}`);
    }
    console.error('');
    process.exit(1);
  }

  if (uniquePairs > 0) {
    process.exit(1);
  }

  if (totalUncheckable > 0) {
    process.exit(1);
  }

  console.log('ZERO contrast failures across all routes. All routes evaluated.');
}

main().catch((err) => {
  console.error('check-contrast.mjs fatal:', err);
  process.exit(1);
});
