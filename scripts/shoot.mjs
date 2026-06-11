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
 *   <slug>-desktop.png  (1440×900, full-page)
 *   <slug>-mobile.png   (390×844, full-page)
 *
 * Console errors per page are written to console-log.txt in the out dir.
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

async function main() {
  const { port, outDir } = parseCliArgs();
  mkdirSync(outDir, { recursive: true });

  const baseUrl = `http://localhost:${port}`;
  const consoleEntries = []; // { route, level, text }

  console.log(`\n📸 shoot.mjs — base: ${baseUrl}  out: ${outDir}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const route of ROUTES) {
    const url = `${baseUrl}${route.path}`;
    console.log(`  → ${route.slug}  (${route.path})`);

    for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
      const context = await browser.newContext({
        viewport,
        // suppress animations / transitions for stable screenshots
        reducedMotion: 'reduce',
      });

      const page = await context.newPage();

      // collect console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleEntries.push({
            route: route.slug,
            viewport: viewportName,
            text: msg.text(),
          });
        }
      });
      page.on('pageerror', err => {
        consoleEntries.push({
          route: route.slug,
          viewport: viewportName,
          text: `[pageerror] ${err.message}`,
        });
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (err) {
        // networkidle can time out on routes with long polling; fall back
        console.warn(`    ⚠  networkidle timeout for ${route.slug} ${viewportName}, using load`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }

      // small settle for any client-side hydration / animation
      await sleep(SETTLE_MS);

      const filename = `${route.slug}-${viewportName}.png`;
      await page.screenshot({
        path: join(outDir, filename),
        fullPage: true,
      });

      await context.close();
    }
  }

  await browser.close();

  // write console-log.txt
  const logPath = join(outDir, 'console-log.txt');
  if (consoleEntries.length === 0) {
    writeFileSync(logPath, '# No console errors captured\n');
    console.log('\n✅ No console errors.');
  } else {
    const lines = consoleEntries.map(
      e => `[${e.route}] [${e.viewport}] ${e.text}`
    );
    writeFileSync(logPath, lines.join('\n') + '\n');
    console.log(`\n⚠  ${consoleEntries.length} console error(s) — see ${logPath}`);
  }

  console.log(`\nDone. Output: ${outDir}\n`);
}

main().catch(err => {
  console.error('shoot.mjs fatal:', err);
  process.exit(1);
});
