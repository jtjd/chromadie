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
  return {
    requestCount: requests.length,
    discoveryCount: requests.filter(request => request.url.includes('/rpc/get_public_discovery_spotlight')).length,
    profileHydrationCount: requests.filter(request => /\/rpc\/get_public_profile_/.test(request.url)).length,
    storageCount: requests.filter(request => /\/storage\/v1\/object\//.test(request.url)).length
  };
}

await mkdir(evidenceDir, { recursive: true });

try {
  if (externalAppUrl) await waitForHttp(appUrl, 10000);
  else server = await startVite({ appPort, evidenceDir });

  chromium = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 900 });
  page = chromium.page;
  await page.navigate(appUrl, 'stable homepage entry');
  await page.setReducedMotion(true);
  await page.waitFor('Boolean(document.querySelector(".homepage-reference .roll-page") && document.querySelector(".homepage-best-roll"))', 'Roll hero and top roller');
  await page.evaluate('document.fonts.ready.then(() => true)');

  await check('homepage centers the Roll hero and authentic top roller', async () => {
    const state = await page.evaluate(`(() => {
      const root = document.querySelector('.homepage-reference');
      const headerLabels = [...document.querySelectorAll('.site-mode-header__nav button')].map(node => node.textContent?.trim());
      const footer = document.querySelector('.site-footer--home-compact');
      const footerLinks = [...(footer?.querySelectorAll('a') || [])].map(link => link.getAttribute('href'));
      return {
        rollPageCount: document.querySelectorAll('.homepage-reference .roll-page').length,
        gameCount: document.querySelectorAll('.homepage-reference .game-container--dedicated').length,
        rollButtonCount: document.querySelectorAll('.roll-stage--preroll .roll-action__button').length,
        rollButtonLabel: document.querySelector('.roll-stage--preroll .roll-action__button')?.textContent?.trim() || '',
        title: document.querySelector('.roll-page__context h1')?.textContent?.trim() || '',
        bestRollCount: document.querySelectorAll('.homepage-best-roll').length,
        bestRollTitle: document.querySelector('.homepage-best-roll h2')?.textContent?.trim() || '',
        heroAmbient: getComputedStyle(document.querySelector('.roll-page--homepage'), '::after').backgroundImage.includes('homepage-hero-atmosphere-anime-v1'),
        removedSections: [...document.querySelectorAll('.profile-example, .homepage-collection, .homepage-community, .homepage-pricing, .homepage-start, .homepage-questions')].length,
        footer: Boolean(footer),
        footerDisplay: footer ? getComputedStyle(footer).display : '',
        footerLinks,
        headerLabels,
        noDeadFooterAnchors: footerLinks.every(href => href && !href.startsWith('#')),
        directionalGlyph: /[‹›↗→↓]/.test(root?.textContent || '')
      };
    })()`);
    assert(state.rollPageCount === 1 && state.gameCount === 1, `Homepage did not mount one real game: ${JSON.stringify(state)}.`);
    assert(state.rollButtonCount === 1 && state.rollButtonLabel === 'Roll today’s color', `Primary action drifted: ${JSON.stringify(state)}.`);
    assert(state.title === 'Roll today’s color.', `First-visit explanation drifted: ${JSON.stringify(state)}.`);
    assert(state.bestRollCount === 1 && state.bestRollTitle === 'Today’s top roll', `Top-roll preview drifted: ${JSON.stringify(state)}.`);
    assert(state.removedSections === 0 && state.footer && state.footerDisplay === 'flex' && state.noDeadFooterAnchors, `Removed content or dead footer routes returned: ${JSON.stringify(state)}.`);
    assert(['/leaderboard', '/pricing', '/how-to-play', '/privacy', '/terms'].every(path => state.footerLinks.includes(path)), `Compact footer routes drifted: ${JSON.stringify(state)}.`);
    assert(['Leaderboard', 'Progression', 'Customize', 'Pricing'].every(label => state.headerLabels.includes(label)), `Homepage header routes drifted: ${JSON.stringify(state)}.`);
    assert(state.heroAmbient && !state.directionalGlyph, `Hero treatment drifted: ${JSON.stringify(state)}.`);
    return state;
  });

  await check('homepage top-roll request stays bounded and public-profile only', async () => {
    const state = networkSnapshot();
    assert(state.discoveryCount <= 1 && state.profileHydrationCount === 0 && state.storageCount === 0, `Homepage network boundary drifted: ${JSON.stringify(state)}.`);
    return state;
  });

  await check('homepage hero motion respects reduced-motion preference', async () => {
    const reduced = await page.evaluate(`(() => ({
      preferred: matchMedia('(prefers-reduced-motion: reduce)').matches,
      ready: document.querySelector('#chromadie-homepage')?.classList.contains('homepage-motion-ready'),
      active: document.querySelector('#chromadie-homepage')?.classList.contains('homepage-motion-active'),
      heroAnimation: getComputedStyle(document.querySelector('.roll-page--homepage'), '::after').animationName,
      bestRollAnimation: getComputedStyle(document.querySelector('.homepage-best-roll')).animationName
    }))()`);
    assert(reduced.preferred && reduced.ready && reduced.active && reduced.heroAnimation === 'none' && reduced.bestRollAnimation === 'none', `Reduced-motion homepage remained animated: ${JSON.stringify(reduced)}.`);
    await page.setReducedMotion(false);
    await page.waitFor('getComputedStyle(document.querySelector(".roll-page--homepage"), "::after").animationName === "homepage-hero-camera"', 'hero atmosphere motion');
    return reduced;
  });

  for (const [width, height] of [[2048, 1024], [1440, 900], [1280, 720], [1024, 900], [900, 900], [768, 1024], [390, 844], [375, 812], [320, 812]]) {
    await page.setViewport(width, height);
    await page.waitFor('Boolean(document.querySelector(".homepage-reference .roll-page") && document.querySelector(".homepage-best-roll"))', `${width}x${height} homepage`);
    await page.evaluate('document.fonts.ready.then(() => true)');
    const state = await page.evaluate(`(() => {
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
      const grid = document.querySelector('.roll-page__game');
      const action = document.querySelector('.roll-stage--preroll .roll-action__button');
      const bestRoll = document.querySelector('.homepage-best-roll');
      const game = document.querySelector('.game-container--dedicated');
      return {
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        columns: getComputedStyle(grid).gridTemplateColumns,
        grid: rect(grid),
        action: rect(action),
        bestRoll: rect(bestRoll),
        game: rect(game),
        footer: rect(document.querySelector('.site-footer--home-compact')),
        heroAmbient: getComputedStyle(document.querySelector('.roll-page--homepage'), '::after').backgroundImage.includes('homepage-hero-atmosphere-anime')
      };
    })()`);
    assert(state.scrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1, `${width}x${height} homepage overflows: ${JSON.stringify(state)}.`);
    assert(state.heroAmbient, `${width}x${height} homepage atmosphere is missing: ${JSON.stringify(state)}.`);
    assert(state.grid && state.grid.left >= -1 && state.grid.right <= width + 1, `${width}x${height} roll grid escapes: ${JSON.stringify(state)}.`);
    assert(Math.abs((state.grid.left + state.grid.right) / 2 - width / 2) <= 1, `${width}x${height} roll grid is not centered: ${JSON.stringify(state)}.`);
    assert(state.action && state.action.left >= -1 && state.action.right <= width + 1, `${width}x${height} roll action escapes: ${JSON.stringify(state)}.`);
    assert(state.bestRoll && state.bestRoll.left >= -1 && state.bestRoll.right <= width + 1, `${width}x${height} top roller escapes: ${JSON.stringify(state)}.`);
    assert(state.footer && state.footer.left >= -1 && state.footer.right <= width + 1, `${width}x${height} compact footer escapes: ${JSON.stringify(state)}.`);
    const columns = state.columns.trim().split(/\s+/).length;
    assert(columns === (width <= 900 ? 1 : 2), `${width}x${height} roll grid columns drifted: ${JSON.stringify(state)}.`);
    if (width > 900) assert(state.game && state.game.left < state.bestRoll.left, `${width}x${height} top roller left the game column: ${JSON.stringify(state)}.`);
    results.viewports.push(state);
    await capture(`homepage-${width}x${height}`);
  }

  const unexpectedFailedRequests = page.requestLog.filter(request => request.failed && !request.url.includes('cloudflareinsights.com/cdn-cgi/rum'));
  const analyticsFailed = page.requestLog.some(request => request.failed && request.url.includes('cloudflareinsights.com/cdn-cgi/rum'));
  const browserErrors = page.consoleLog.filter(entry => {
    if (!['error', 'exception', 'log-error'].includes(entry.type)) return false;
    if (entry.text.includes('cloudflareinsights.com/cdn-cgi/rum')) return false;
    return !(analyticsFailed && entry.text.includes('Failed to load resource: net::ERR_FAILED'));
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
