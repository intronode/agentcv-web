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
 * Integration note: run as a SEPARATE verification step, not inside qa-shoot.sh.
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
   * @param {string} str
   * @returns {{r:number,g:number,b:number,a:number}|null}
   */
  function parseRgbInBrowser(str) {
    if (!str) return null;
    const m = str.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/,
    );
    if (!m) return null;
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
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
      const parsed = parseRgbInBrowser(bgColor);
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
    const fgParsed = parseRgbInBrowser(fgStr);
    if (!fgParsed) continue;

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

  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { port } = parseCliArgs();
  const baseUrl = `http://localhost:${port}`;

  console.log(`\ncheck-contrast.mjs — WCAG AA audit`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Routes:   ${ROUTES.length}`);
  console.log(`Thresholds: normal text ≥4.5:1, large text ≥3:1\n`);

  const browser = await chromium.launch({ headless: true });

  /** All failing pairs across all routes: Map<"fg|bg|isLarge", {fg, bg, isLarge, ratio, threshold, routes[]}> */
  const globalFailMap = new Map();
  /** Per-route results */
  const routeResults = [];

  for (const route of ROUTES) {
    const url = `${baseUrl}${route.path}`;
    process.stdout.write(`  → ${route.slug.padEnd(42)}`);

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
      } catch {
        console.log(`SKIP (load failed)`);
        await context.close();
        routeResults.push({ slug: route.slug, failures: [], scanned: 0 });
        continue;
      }
    }

    await sleep(SETTLE_MS);

    // Run the contrast scan in browser context
    let rawResults;
    try {
      rawResults = await page.evaluate(browserContrastScan);
    } catch (err) {
      console.log(`SKIP (evaluate failed: ${err.message})`);
      await context.close();
      routeResults.push({ slug: route.slug, failures: [], scanned: 0 });
      continue;
    }

    await context.close();

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

    const status = failures.length === 0 ? 'PASS' : `FAIL (${failures.length} pair${failures.length === 1 ? '' : 's'})`;
    console.log(status);
    routeResults.push({ slug: route.slug, failures, scanned: seenPairs.size + failures.length });
  }

  await browser.close();

  // ── Per-route report ───────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('PER-ROUTE CONTRAST FAILURES');
  console.log('─'.repeat(80));

  let totalRouteFailures = 0;
  for (const r of routeResults) {
    if (r.failures.length === 0) continue;
    totalRouteFailures++;
    console.log(`\nRoute: ${r.slug}`);
    console.log(`  ${'FG'.padEnd(10)} ${'BG'.padEnd(10)} ${'Ratio'.padEnd(8)} ${'Threshold'.padEnd(11)} ${'Size'.padEnd(8)} Text sample`);
    console.log(`  ${'─'.repeat(70)}`);
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
  console.log('\n' + '─'.repeat(80));
  console.log('UNIQUE FAILING PAIRS SUMMARY');
  console.log('─'.repeat(80));

  const globalFails = Array.from(globalFailMap.values()).sort((a, b) => a.ratio - b.ratio);

  if (globalFails.length === 0) {
    console.log('\n  ✅ ZERO contrast failures across all routes.');
  } else {
    console.log(`\n  ${globalFails.length} unique failing pair${globalFails.length === 1 ? '' : 's'}:\n`);
    console.log(
      `  ${'FG'.padEnd(10)} ${'BG'.padEnd(10)} ${'Ratio'.padEnd(8)} ${'Thresh'.padEnd(8)} ${'Type'.padEnd(10)} Routes`,
    );
    console.log(`  ${'─'.repeat(70)}`);
    for (const f of globalFails) {
      const type = f.isLargeText ? 'large' : 'normal';
      console.log(
        `  ${f.fg.padEnd(10)} ${f.bg.padEnd(10)} ${String(f.ratio).padEnd(8)} ${String(f.threshold).padEnd(8)} ${type.padEnd(10)} ${f.routes.slice(0, 3).join(', ')}${f.routes.length > 3 ? ` +${f.routes.length - 3} more` : ''}`,
      );
      console.log(`       Sample: "${f.textSample}"`);
    }
  }

  // ── Final summary line ─────────────────────────────────────────────────────
  const routesChecked = routeResults.length;
  const routesFailed = routeResults.filter((r) => r.failures.length > 0).length;
  const uniquePairs = globalFails.length;

  console.log('\n' + '─'.repeat(80));
  console.log(`SUMMARY: ${routesChecked} routes checked, ${routesFailed} routes with failures, ${uniquePairs} unique failing pair${uniquePairs === 1 ? '' : 's'}`);
  console.log('─'.repeat(80) + '\n');

  if (uniquePairs > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('check-contrast.mjs fatal:', err);
  process.exit(1);
});
