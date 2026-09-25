#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  defaultDebugPort,
  findAvailablePort,
  startChromium,
  startVitePreview,
  terminateProcess
} from './cdp-harness.mjs';

const evidenceDir = process.env.HOW_TO_PLAY_SMOKE_EVIDENCE_DIR || join(process.cwd(), 'artifacts', 'how-to-play-guide');
const appPort = await findAvailablePort(Number(process.env.HOW_TO_PLAY_SMOKE_APP_PORT || 5210));
const debugPort = await findAvailablePort(Number(process.env.HOW_TO_PLAY_SMOKE_DEBUG_PORT || defaultDebugPort));
const appUrl = `http://127.0.0.1:${appPort}/`;
const pageUrl = `${appUrl}how-to-play`;
const results = { status: 'running', pageUrl, evidenceDir, checks: [], viewports: [], screenshots: [] };
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
  console.log(`[how-to-play] PASS ${name}`);
}

await mkdir(evidenceDir, { recursive: true });

try {
  server = await startVitePreview({ appPort, evidenceDir });
  chromium = await startChromium({ appUrl: pageUrl, debugPort, evidenceDir, width: 1440, height: 1000 });
  page = chromium.page;
  await page.navigate(pageUrl, 'How to Play route');
  await page.setReducedMotion(true);
  await page.waitFor('Boolean(document.querySelector(".how-to-play__example .roll-result-hero") && document.querySelector(".how-to-play__journey"))', 'guide result and journey', 30000);
  await page.evaluate('document.fonts.ready.then(() => true)');

  await check('guide presents current result and discovery paths', async () => {
    const state = await page.evaluate(`(() => ({
      title: document.querySelector('#guide-title')?.textContent?.trim() || '',
      resultName: document.querySelector('.how-to-play__example .roll-color-name')?.textContent?.trim() || '',
      resultHex: document.querySelector('.how-to-play__example .roll-color-hex')?.textContent?.trim() || '',
      resultRarity: document.querySelector('.how-to-play__example .roll-color-rarity')?.textContent?.trim() || '',
      resultScore: document.querySelector('.how-to-play__example .roll-result-hero__score')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      tileLabel: document.querySelector('.how-to-play__example .roll-tile')?.getAttribute('aria-label') || '',
      traitCount: document.querySelectorAll('.how-to-play__example .roll-attr-tag').length,
      breakdownRows: document.querySelectorAll('.how-to-play__example-breakdown .roll-result-summary__condition').length,
      breakdownButton: document.querySelector('.how-to-play__example-breakdown .roll-result-summary__details-button')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      actionHrefs: [...document.querySelectorAll('.how-to-play__actions a')].map(link => link.getAttribute('href')),
      topRollCopy: document.querySelector('.how-to-play__journey li:last-child p')?.textContent?.includes('When available') || false,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      route: location.pathname
    }))()`);
    assert(state.route === '/how-to-play', `Direct guide route failed: ${JSON.stringify(state)}.`);
    assert(state.title === 'Roll a color. Grow your profile.', `Guide headline drifted: ${JSON.stringify(state)}.`);
    assert(state.resultName === 'Balanced Electric Lime' && state.resultHex === '#B7FD4D', `Example color result drifted: ${JSON.stringify(state)}.`);
    assert(state.resultRarity === 'Uncommon' && state.resultScore.includes('43,194') && state.resultScore.includes('pts'), `Example score or rarity drifted: ${JSON.stringify(state)}.`);
    assert(state.tileLabel.includes('#B7FD4D') && state.traitCount === 2 && state.topRollCopy, `Accessible result, live trait count, or conditional top-roll guidance is missing: ${JSON.stringify(state)}.`);
    assert(state.breakdownRows === 3 && state.breakdownButton.includes('View full breakdown'), `The example score breakdown is missing or out of sync: ${JSON.stringify(state)}.`);
    assert(state.actionHrefs.includes('/') && state.actionHrefs.includes('/leaderboard'), `Primary guide paths drifted: ${JSON.stringify(state)}.`);
    assert(state.canonical.endsWith('/how-to-play'), `Guide canonical drifted: ${JSON.stringify(state)}.`);
    return state;
  });

  await check('example breakdown opens with the full matching score', async () => {
    await page.clickText('View full breakdown', { exact: false, description: 'example score breakdown' });
    const breakdown = await page.evaluate(`(() => {
      const dialog = document.querySelector('.roll-result-breakdown-dialog');
      return {
        open: Boolean(dialog),
        rows: dialog?.querySelectorAll('.roll-result-breakdown-dialog__row').length || 0,
        hasBase: dialog?.textContent?.includes('Base roll') || false,
        hasScore: dialog?.textContent?.includes('43,194') || false
      };
    })()`);
    assert(breakdown.open && breakdown.rows === 19 && !breakdown.hasBase && breakdown.hasScore, `The example breakdown is incomplete: ${JSON.stringify(breakdown)}.`);
    await page.clickText('Close');
    const closed = await page.evaluate('!document.querySelector(".roll-result-breakdown-dialog")');
    assert(closed, 'The example score breakdown did not close.');
    return { ...breakdown, closed };
  });

  await check('keyboard reaches a visible guide action and disclosures work', async () => {
    await page.evaluate('document.activeElement?.blur()');
    let active = null;
    for (let index = 0; index < 32; index += 1) {
      await page.pressKey('Tab');
      active = await page.evaluate(`(() => {
        const element = document.activeElement;
        return {
          primary: Boolean(element?.matches('.how-to-play__button--primary')),
          visibleFocus: element?.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none'
        };
      })()`);
      if (active.primary) break;
    }
    assert(active?.primary && active.visibleFocus, `Keyboard focus did not reveal the primary action: ${JSON.stringify(active)}.`);

    await page.clickText('What happens if I reroll?');
    const disclosure = await page.evaluate('[...document.querySelectorAll(".how-to-play__faq summary")].some(summary => summary.textContent.includes("What happens if I reroll?") && summary.closest("details")?.open)');
    assert(disclosure, 'The native guide disclosure did not open.');
    await page.evaluate('document.activeElement?.blur(); window.scrollTo(0, 0)');
    return { primaryActionVisible: active.visibleFocus, disclosureOpen: disclosure };
  });

  for (const [width, height] of [[1440, 1000], [1024, 900], [768, 1024], [390, 844], [320, 812]]) {
    await page.setViewport(width, height);
    await page.evaluate('document.fonts.ready.then(() => true)');
    const state = await page.evaluate(`(() => {
      const bounds = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) } : null;
      };
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        hero: bounds(document.querySelector('.how-to-play__hero')),
        result: bounds(document.querySelector('.how-to-play__example')),
        action: bounds(document.querySelector('.how-to-play__button--primary')),
        disclosure: bounds(document.querySelector('.how-to-play__faq summary'))
      };
    })()`);
    assert(state.documentWidth <= width + 1 && state.bodyWidth <= width + 1, `${width}px guide overflows horizontally: ${JSON.stringify(state)}.`);
    assert(state.hero && state.hero.left >= 0 && state.hero.right <= width, `${width}px hero escapes the viewport: ${JSON.stringify(state)}.`);
    assert(state.result && state.action && state.disclosure, `${width}px guide lost core content: ${JSON.stringify(state)}.`);
    results.viewports.push(state);
    if ([1440, 390, 320].includes(width)) await capture(`how-to-play-${width}`);
  }

  await check('reduced motion removes guide link transitions', async () => {
    const motion = await page.evaluate(`(() => ({
      preferred: matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: getComputedStyle(document.querySelector('.how-to-play__button--primary')).transitionDuration,
      durationSeconds: parseFloat(getComputedStyle(document.querySelector('.how-to-play__button--primary')).transitionDuration) || 0
    }))()`);
    assert(motion.preferred && motion.durationSeconds <= 0.001, `Reduced-motion guide transition remained active: ${JSON.stringify(motion)}.`);
    return motion;
  });

  const isAnalyticsRequest = request => request.url.includes('cloudflareinsights.com/beacon.min.js')
    || request.url.includes('cloudflareinsights.com/cdn-cgi/rum');
  const unexpectedFailedRequests = page.requestLog.filter(request => request.failed && !isAnalyticsRequest(request));
  const analyticsFailed = page.requestLog.some(request => request.failed && isAnalyticsRequest(request));
  const browserErrors = page.consoleLog.filter(entry => {
    if (!['error', 'exception', 'log-error'].includes(entry.type)) return false;
    if (entry.text.includes('cloudflareinsights.com')) return false;
    return !(analyticsFailed && entry.text.includes('Failed to load resource: net::ERR_FAILED'));
  });
  assert(unexpectedFailedRequests.length === 0, `Guide requests failed: ${JSON.stringify(unexpectedFailedRequests)}.`);
  assert(browserErrors.length === 0, `Guide emitted browser errors: ${JSON.stringify(browserErrors)}.`);
  results.status = 'passed';
} catch (error) {
  results.status = 'failed';
  results.error = error.message;
  if (page) {
    try { await capture('how-to-play-failure'); } catch { /* preserve original error */ }
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

console.log(`[how-to-play] Evidence: ${evidenceDir}`);
for (const screenshot of results.screenshots) console.log(`[how-to-play] Screenshot: ${screenshot}`);
