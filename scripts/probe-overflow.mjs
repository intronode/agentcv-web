#!/usr/bin/env node
/**
 * probe-overflow.mjs — one-shot scrollWidth overflow probe
 *
 * Usage:
 *   node scripts/probe-overflow.mjs --port 3190
 *
 * Loads every route in ROUTES at 390×844 (mobile) and 1440×900 (desktop),
 * measures document.documentElement.scrollWidth vs viewport width,
 * and prints a table to stdout.  Exits 0 (pass) or 1 (overflow found).
 *
 * This is the standalone probe used for the initial diagnosis.
 * The integrated version (emitting overflow-report.txt) lives in shoot.mjs.
 */

import { chromium } from 'playwright';
import { parseArgs } from 'util';

// Routes from shoot.mjs
const ROUTES = [
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

const TOLERANCE = 2; // px — browser sub-pixel rounding allowance

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      port: { type: 'string', default: '3000' },
    },
  });
  return { port: parseInt(values.port, 10) };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function measureScrollWidth(browser, url, viewport, slug) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  }
  await sleep(500);
  const scrollWidth = await page.evaluate(() => {
    return Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
  });
  await context.close();
  return scrollWidth;
}

async function main() {
  const { port } = parseCliArgs();
  const baseUrl = `http://localhost:${port}`;

  console.log(`\nOverflow probe — base: ${baseUrl}\n`);
  console.log(`${'ROUTE'.padEnd(45)} ${'MOBILE(390)'.padEnd(14)} ${'DESKTOP(1440)'.padEnd(15)} STATUS`);
  console.log('─'.repeat(90));

  const browser = await chromium.launch({ headless: true });
  const fails = [];

  for (const route of ROUTES) {
    const url = `${baseUrl}${route.path}`;
    const mobileW = await measureScrollWidth(browser, url, { width: 390, height: 844 }, route.slug);
    const desktopW = await measureScrollWidth(browser, url, { width: 1440, height: 900 }, route.slug);
    const mobileFail = mobileW > 390 + TOLERANCE;
    const desktopFail = desktopW > 1440 + TOLERANCE;
    const status = (mobileFail || desktopFail) ? 'FAIL' : 'PASS';
    if (mobileFail || desktopFail) fails.push({ slug: route.slug, mobileW, desktopW });

    const mobileStr = `${mobileW}px${mobileFail ? ' ✗' : ''}`;
    const desktopStr = `${desktopW}px${desktopFail ? ' ✗' : ''}`;
    console.log(`${route.slug.padEnd(45)} ${mobileStr.padEnd(14)} ${desktopStr.padEnd(15)} ${status}`);
  }

  await browser.close();

  console.log('─'.repeat(90));
  if (fails.length === 0) {
    console.log('\nAll routes PASS (no overflow detected)\n');
    process.exit(0);
  } else {
    console.log(`\nFAIL — ${fails.length} route(s) overflow:\n`);
    for (const f of fails) {
      const mobileOver = f.mobileW > 390 + TOLERANCE ? `  mobile: ${f.mobileW}px > 390` : '';
      const desktopOver = f.desktopW > 1440 + TOLERANCE ? `  desktop: ${f.desktopW}px > 1440` : '';
      console.log(`  ${f.slug}${mobileOver}${desktopOver}`);
    }
    console.log();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('probe-overflow.mjs fatal:', err);
  process.exit(1);
});
