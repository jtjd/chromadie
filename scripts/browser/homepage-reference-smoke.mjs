#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  defaultDebugPort,
  findAvailablePort,
  startChromium,
  startVite,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';

const externalAppUrl = String(process.env.HOMEPAGE_SMOKE_URL || '').trim();
const evidenceDir = process.env.HOMEPAGE_SMOKE_EVIDENCE_DIR || join(process.cwd(), 'artifacts', 'homepage-roll-first');
const appPort = externalAppUrl ? null : await findAvailablePort(Number(process.env.HOMEPAGE_SMOKE_APP_PORT || 5190));
const appUrl = externalAppUrl || `http://127.0.0.1:${appPort}/`;
const debugPort = await findAvailablePort(Number(process.env.HOMEPAGE_SMOKE_DEBUG_PORT || defaultDebugPort));
const results = { status: 'running', appUrl, serverMode: externalAppUrl ? 'external' : 'isolated', evidenceDir, checks: [], viewports: [], screenshots: [] };
let chromium;
let page;
let server;

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
}

function networkSnapshot() {
  const requests = page.requestLog.filter(request => request.method !== 'OPTIONS');
  const parsed = requests.map(request => {
    try { return { ...request, parsed: new URL(request.url) }; } catch { return { ...request, parsed: null }; }
  });
  return {
    requestCount: requests.length,
    discoveryCount: parsed.filter(request => request.parsed?.pathname.endsWith('/rpc/get_public_discovery_spotlight')).length,
    profileHydrationCount: parsed.filter(request => /\/rpc\/get_public_profile_/.test(request.parsed?.pathname || '')).length,
    storageCount: parsed.filter(request => request.parsed?.pathname.includes('/storage/v1')).length
  };
}

await mkdir(evidenceDir, { recursive: true });

try {
  if (externalAppUrl) await waitForHttp(appUrl, 10000);
  else server = await startVite({ appPort, evidenceDir });

  chromium = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 900 });
  page = chromium.page;
  await page.setReducedMotion(true);
  await page.waitFor('Boolean(document.querySelector(".homepage-reference .roll-page") && document.querySelector(".roll-stage--preroll, .roll-stage--results"))', 'playable homepage');
  await page.evaluate('document.fonts.ready.then(() => true)');

  await check('homepage keeps one playable hero without retired specimens or competing claim actions', async () => {
    const state = await page.evaluate(`(() => {
      const root = document.querySelector('.homepage-reference');
      const headerLabels = [...document.querySelectorAll('.site-mode-header__nav button, .site-mode-header__nav a')].map(node => node.textContent?.trim());
      return {
        rollPageCount: document.querySelectorAll('.homepage-reference .roll-page').length,
        gameCount: document.querySelectorAll('.homepage-reference .game-container--dedicated').length,
        rollButtonCount: document.querySelectorAll('.roll-stage--preroll .roll-action__button').length,
        rollButtonLabel: document.querySelector('.roll-stage--preroll .roll-action__button')?.textContent?.trim() || '',
        title: document.querySelector('.roll-page__context h1')?.textContent?.trim() || '',
        accountPrompt: document.querySelector('.guest-prompt--preroll')?.textContent?.trim() || '',
        bestRollCount: document.querySelectorAll('.homepage-best-roll').length,
        bestRollTitle: document.querySelector('.homepage-best-roll h2')?.textContent?.trim() || '',
        bestRollIdentity: document.querySelector('.homepage-best-roll__identity-name')?.textContent?.trim() || '',
        bestRollConditionCount: document.querySelectorAll('.homepage-best-roll__condition').length,
        profileSpecimenCount: document.querySelectorAll('[data-homepage-profile-specimen], .homepage-profile-demo, .homepage-profile-stage').length,
        sceneryCount: document.querySelectorAll('.homepage-background, .homepage-atmosphere').length,
        finalClaimCount: document.querySelectorAll('#claim, .homepage-claim__field').length,
        directionalGlyph: /[‹›↗→↓]/.test(root?.textContent || ''),
        headerLabels
      };
    })()`);
    assert(state.rollPageCount === 1 && state.gameCount === 1, `Homepage did not mount one real game: ${JSON.stringify(state)}.`);
    assert(state.rollButtonCount === 1 && state.rollButtonLabel === 'Roll today’s color', `Primary action drifted: ${JSON.stringify(state)}.`);
    assert(state.title === 'What color is your day?' && state.accountPrompt.includes('to start your profile history.'), `First-visit explanation drifted: ${JSON.stringify(state)}.`);
    assert(state.bestRollCount === 1 && state.bestRollTitle === 'Today’s top roll', `Best-roll invitation drifted: ${JSON.stringify(state)}.`);
    assert(state.profileSpecimenCount === 0 && state.sceneryCount === 0 && state.finalClaimCount === 0, `Retired homepage marketing returned: ${JSON.stringify(state)}.`);
    assert(!state.directionalGlyph && !state.headerLabels.includes('Roll') && !state.headerLabels.includes('Claim handle'), `Competing controls returned: ${JSON.stringify(state)}.`);
  });

  await check('homepage keeps one bounded authentic discovery feed', async () => {
    const state = networkSnapshot();
    assert(state.discoveryCount <= 1 && state.profileHydrationCount === 0 && state.storageCount === 0, `Homepage network boundary drifted: ${JSON.stringify(state)}.`);
    return state;
  });

  for (const [width, height] of [[2048, 1024], [1440, 900], [1280, 720], [1280, 800], [1024, 900], [768, 1024], [390, 844], [375, 812], [320, 812]]) {
    await page.setViewport(width, height);
    await page.waitFor('Boolean(document.querySelector(".homepage-reference .roll-page") && document.querySelector(".roll-stage--preroll, .roll-stage--results"))', `${width}x${height} playable homepage`);
    await page.evaluate('document.fonts.ready.then(() => true)');
    const state = await page.evaluate(`(() => {
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
      const rollGrid = document.querySelector('.roll-page__game');
      const action = document.querySelector('.roll-stage--preroll .roll-action__button, .roll-stage--results .roll-action__button--claimed');
      const bestRoll = document.querySelector('.homepage-best-roll');
      const game = document.querySelector('.game-container--dedicated');
      return {
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        columns: getComputedStyle(rollGrid).gridTemplateColumns,
        grid: rect(rollGrid),
        action: rect(action),
        bestRoll: rect(bestRoll),
        game: rect(game),
        scoring: rect(document.querySelector('.homepage-scoring')),
        nextSection: rect(document.querySelector('.homepage-loop')),
        board: rect(document.querySelector('.homepage-community'))
      };
    })()`);
    assert(state.scrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1, `${width}x${height} homepage overflows: ${JSON.stringify(state)}.`);
    assert(state.grid && state.grid.left >= -1 && state.grid.right <= width + 1, `${width}x${height} roll grid escapes: ${JSON.stringify(state)}.`);
    assert(state.action && state.action.left >= -1 && state.action.right <= width + 1, `${width}x${height} roll action escapes: ${JSON.stringify(state)}.`);
    assert(state.scoring && state.board, `${width}x${height} explanatory content is missing: ${JSON.stringify(state)}.`);
    if (width < 1000) assert(state.columns.trim().split(' ').length === 1, `${width}x${height} roll grid did not stack: ${JSON.stringify(state)}.`);
    else {
      assert(state.nextSection?.top >= height - 1, `${width}x${height} next section bleeds into the hero: ${JSON.stringify(state)}.`);
      assert(state.columns.trim().split(' ').length === 2, `${width}x${height} roll grid did not use the side-by-side composition: ${JSON.stringify(state)}.`);
      assert(state.bestRoll && state.game && state.game.left < state.bestRoll.left, `${width}x${height} kept the pre-roll game on the wrong side of today's best roll: ${JSON.stringify(state)}.`);
    }
    results.viewports.push(state);
    await capture(`homepage-${width}x${height}`);
  }

  const unexpectedFailedRequests = page.requestLog.filter(request => request.failed && !request.url.includes('cloudflareinsights.com/cdn-cgi/rum'));
  const browserErrors = page.consoleLog.filter(entry => {
    if (!['error', 'exception', 'log-error'].includes(entry.type)) return false;
    if (entry.text.includes('cloudflareinsights.com/cdn-cgi/rum')) return false;
    if (entry.text === 'Failed to load resource: net::ERR_FAILED' && unexpectedFailedRequests.length === 0) return false;
    return true;
  });
  assert(unexpectedFailedRequests.length === 0, `Homepage requests failed: ${JSON.stringify(unexpectedFailedRequests)}.`);
  assert(browserErrors.length === 0, `Homepage emitted browser errors: ${JSON.stringify(browserErrors)}.`);
  results.status = 'passed';
} catch (error) {
  results.status = 'failed';
  results.error = error.message;
  if (page) {
    try { await capture('homepage-failure'); } catch { /* preserve original error */ }
  }
  throw error;
} finally {
  results.browserConsole = page?.consoleLog || [];
  results.requests = page?.requestLog || [];
  await writeFile(join(evidenceDir, 'evidence.json'), `${JSON.stringify(results, null, 2)}\n`);
  await page?.close();
  await terminateProcess(chromium?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}

console.log(`[homepage] Evidence: ${evidenceDir}`);
for (const screenshot of results.screenshots) console.log(`[homepage] Screenshot: ${screenshot}`);
