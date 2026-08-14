#!/usr/bin/env node

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  defaultDebugPort,
  findAvailablePort,
  startChromium,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';

const appUrl = process.env.HOMEPAGE_SMOKE_URL || 'http://127.0.0.1:5173/';
const evidenceDir = process.env.HOMEPAGE_SMOKE_EVIDENCE_DIR
  || join(process.cwd(), 'artifacts', 'homepage-phase1-20260814');
const debugPort = await findAvailablePort(Number(process.env.HOMEPAGE_SMOKE_DEBUG_PORT || defaultDebugPort));
const results = {
  status: 'running',
  appUrl,
  evidenceDir,
  viewports: [],
  screenshots: [],
  checks: []
};
let chromium;
let page;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function capture(name) {
  const path = join(evidenceDir, `${name}.png`);
  await page.screenshot(path);
  results.screenshots.push(path);
}

async function check(name, action) {
  const detail = await action();
  results.checks.push({ name, detail: detail || true });
  console.log(`[homepage] PASS ${name}`);
  return detail;
}

await mkdir(evidenceDir, { recursive: true });
await waitForHttp(appUrl, 10000);

try {
  chromium = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 1000 });
  page = chromium.page;
  await page.waitFor(`Boolean(document.querySelector('.homepage-reference') && document.querySelector('.homepage-profile-renderer--hero .profile-shell-page[data-profile-render-model="v1"]'))`, 'homepage ProfileShell hero');
  await page.setReducedMotion(true);
  await page.setViewport(1440, 1000);

  await check('desktop shell and production renderer', async () => {
    const state = await page.evaluate(`(() => {
      const hero = document.querySelector('.homepage-hero');
      const stage = document.querySelector('.homepage-profile-stage');
      const shell = document.querySelector('.homepage-profile-renderer--hero .profile-shell-page');
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
      return {
        hero: rect(hero),
        stage: rect(stage),
        shell: rect(shell),
        fixtureCount: document.querySelectorAll('.homepage-profile-renderer').length,
        profileShellCount: document.querySelectorAll('.homepage-profile-renderer .profile-shell-page[data-profile-render-model="v1"]').length,
        legacyHeader: Boolean(document.querySelector('.site-mode-header')),
        oldBrowserFrame: Boolean(document.querySelector('.home-browser, .home-hero__stage, .home-page'))
      };
    })()`);
    assert(state.fixtureCount === 4 && state.profileShellCount === 4, `Expected four fixture ProfileShell renderers: ${JSON.stringify(state)}.`);
    assert(!state.legacyHeader && !state.oldBrowserFrame, `Legacy homepage presentation remains mounted: ${JSON.stringify(state)}.`);
    assert(state.stage && Math.abs((state.stage.left + state.stage.right) / 2 - 720) <= 2, `Hero stage is not centered on desktop: ${JSON.stringify(state)}.`);
    await capture('homepage-desktop-1440x1000');
    return state;
  });

  await check('carousel switches real fixture renderers', async () => {
    const before = await page.evaluate('document.querySelector(".homepage-profile-renderer--hero")?.dataset.homepageFixture || ""');
    await page.click('.homepage-theme-button--next', 'next homepage fixture');
    const after = await page.evaluate('document.querySelector(".homepage-profile-renderer--hero")?.dataset.homepageFixture || ""');
    assert(before !== after && after === 'sleek-arcade', `Carousel did not switch from the first fixture: ${before} -> ${after}.`);
    await page.click('.homepage-theme-button--prev', 'previous homepage fixture');
    return { before, after, restored: await page.evaluate('document.querySelector(".homepage-profile-renderer--hero")?.dataset.homepageFixture || ""') };
  });

  await check('claim validation remains real', async () => {
    await page.setInputValue('#homepage-claim-hero', 'bad handle', ['input', 'change']);
    await page.click('.homepage-claim__field button', 'invalid claim submit');
    const message = await page.evaluate('document.querySelector("#homepage-claim-hero-error")?.textContent?.trim() || ""');
    assert(message === 'Use 1–20 letters, numbers, or underscores.', `Username policy message changed: ${JSON.stringify(message)}.`);
    return { message };
  });

  await check('community owns the only live homepage profile feed', async () => {
    const state = await page.evaluate(`(() => ({
      community: Boolean(document.querySelector('.homepage-community')),
      oldDirectory: Boolean(document.querySelector('.homepage-directory, #home-leaderboard')),
      discoveryRequests: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/rpc/get_public_discovery')).length
    }))()`);
    assert(state.community && !state.oldDirectory, `Legacy community presentation remains mounted: ${JSON.stringify(state)}.`);
    return state;
  });

  await check('lower photographic showcase capture', async () => {
    await page.evaluate('document.querySelector("#showcase")?.scrollIntoView({ block: "start" })');
    await capture('homepage-showcase-1440x1000');
    await page.evaluate('document.querySelector("#community")?.scrollIntoView({ block: "start" })');
    await capture('homepage-community-1440x1000');
    return { showcase: true, community: true };
  });

  for (const [width, height, label] of [[1024, 900, 'tablet'], [390, 844, 'phone']]) {
    await page.setViewport(width, height);
    await page.navigate(appUrl, `${label} homepage`);
    await page.waitFor('Boolean(document.querySelector(".homepage-reference .homepage-profile-renderer--hero"))', `${label} homepage`);
    const state = await page.evaluate(`(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      heroColumns: getComputedStyle(document.querySelector('.homepage-hero')).gridTemplateColumns,
      contextDisplay: getComputedStyle(document.querySelector('.homepage-hero__context')).display,
      stage: (() => { const box = document.querySelector('.homepage-profile-stage')?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, width: box.width } : null; })()
    }))()`);
    assert(state.scrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1, `${label} homepage overflows horizontally: ${JSON.stringify(state)}.`);
    if (label === 'phone') assert(state.heroColumns.trim().split(' ').length === 1, `Phone homepage kept multi-column hero: ${JSON.stringify(state)}.`);
    results.viewports.push(state);
    await capture(`homepage-${label}-${width}x${height}`);
  }

  results.status = 'passed';
} catch (error) {
  results.status = 'failed';
  results.error = error.message;
  if (page) {
    try { await capture('homepage-failure'); } catch { /* preserve original failure */ }
  }
  throw error;
} finally {
  results.browserConsole = page?.consoleLog || [];
  results.requests = page?.requestLog || [];
  await writeFile(join(evidenceDir, 'evidence.json'), `${JSON.stringify(results, null, 2)}\n`);
  await page?.close();
  await terminateProcess(chromium?.child, 'Chromium');
}

console.log(`[homepage] Evidence: ${evidenceDir}`);
for (const screenshot of results.screenshots) console.log(`[homepage] Screenshot: ${screenshot}`);
