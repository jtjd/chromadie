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
        profileSceneCount: document.querySelectorAll('.profile-example__controls button').length,
        pricingAnchorCount: document.querySelectorAll('#pricing').length,
        homeFooter: Boolean(document.querySelector('.site-footer--home .site-footer__home-grid')),
        homeFooterDisplay: getComputedStyle(document.querySelector('.site-footer--home')).display,
        sceneryCount: document.querySelectorAll('.homepage-background, .homepage-atmosphere').length,
        finalClaimCount: document.querySelectorAll('#claim, .homepage-claim__field').length,
        directionalGlyph: /[‹›↗→↓]/.test(root?.textContent || ''),
        headerLabels
      };
    })()`);
    assert(state.rollPageCount === 1 && state.gameCount === 1, `Homepage did not mount one real game: ${JSON.stringify(state)}.`);
    assert(state.rollButtonCount === 1 && state.rollButtonLabel === 'Roll today’s color', `Primary action drifted: ${JSON.stringify(state)}.`);
    assert(state.title === 'Roll today’s color.' && state.accountPrompt.includes('to start your profile history.'), `First-visit explanation drifted: ${JSON.stringify(state)}.`);
    assert(state.bestRollCount === 1 && state.bestRollTitle === 'Today’s top roll', `Best-roll invitation drifted: ${JSON.stringify(state)}.`);
    assert(state.profileSceneCount === 3 && state.homeFooter && state.homeFooterDisplay === 'grid', `Homepage product showcase/footer drifted: ${JSON.stringify(state)}.`);
    assert(state.pricingAnchorCount === 1, `Homepage pricing preview anchor drifted: ${JSON.stringify(state)}.`);
    assert(state.profileSpecimenCount === 0 && state.sceneryCount === 0 && state.finalClaimCount === 0, `Retired homepage marketing returned: ${JSON.stringify(state)}.`);
    assert(!state.headerLabels.includes('Roll') && !state.headerLabels.includes('Claim handle'), `Competing controls returned: ${JSON.stringify(state)}.`);
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
        scoring: rect(document.querySelector('.homepage-collection')),
        nextSection: rect(document.querySelector('.profile-example')),
        start: rect(document.querySelector('.homepage-start')),
        board: rect(document.querySelector('.homepage-community'))
      };
    })()`);
    assert(state.scrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1, `${width}x${height} homepage overflows: ${JSON.stringify(state)}.`);
    assert(state.grid && state.grid.left >= -1 && state.grid.right <= width + 1, `${width}x${height} roll grid escapes: ${JSON.stringify(state)}.`);
    assert(Math.abs((state.grid.left + state.grid.right) / 2 - width / 2) <= 1, `${width}x${height} roll grid is not centered: ${JSON.stringify(state)}.`);
    assert(state.action && state.action.left >= -1 && state.action.right <= width + 1, `${width}x${height} roll action escapes: ${JSON.stringify(state)}.`);
    // The community section intentionally disappears when the bounded feed is empty.
    assert(state.scoring && state.nextSection && state.start, `${width}x${height} supporting content is missing: ${JSON.stringify(state)}.`);
    if (state.board) assert(state.board.left >= -1 && state.board.right <= width + 1, `${width}x${height} community content escapes the viewport.`);
    if (width < 1000) assert(state.columns.trim().split(' ').length === 1, `${width}x${height} roll grid did not stack: ${JSON.stringify(state)}.`);
    else {
      assert(state.nextSection?.top >= height - 1, `${width}x${height} next section bleeds into the hero: ${JSON.stringify(state)}.`);
      assert(state.columns.trim().split(' ').length === 2, `${width}x${height} roll grid did not use the side-by-side composition: ${JSON.stringify(state)}.`);
      assert(state.bestRoll && state.game && state.game.left < state.bestRoll.left, `${width}x${height} kept the pre-roll game on the wrong side of today's best roll: ${JSON.stringify(state)}.`);
    }
    results.viewports.push(state);
    await capture(`homepage-${width}x${height}`);
  }

  await check('homepage pricing shows the current free and Plus offers', async () => {
    for (const width of [1440, 390]) {
      await page.setViewport(width, 900);
      await page.evaluate("document.querySelector('#pricing').scrollIntoView({ block: 'center' })");
      await page.waitFor("document.querySelector('.homepage-pricing__card--plus')", 'Homepage pricing preview');
      const state = await page.evaluate(`(() => ({
        section: Boolean(document.querySelector('.homepage-pricing')),
        cards: document.querySelectorAll('.homepage-pricing__card').length,
        freeFeatures: document.querySelectorAll('.homepage-pricing__card--free li').length,
        plusFeatures: document.querySelectorAll('.homepage-pricing__card--plus li').length,
        plusPrice: document.querySelector('.homepage-pricing__card--plus .homepage-pricing__price')?.textContent?.trim() || '',
        overflow: document.documentElement.scrollWidth > innerWidth + 1
      }))()`);
      assert(state.section && state.cards === 2 && state.freeFeatures === 4 && state.plusFeatures === 6 && state.plusPrice.includes('$7.99') && !state.overflow, `Homepage pricing geometry or offer drifted: ${JSON.stringify(state)}.`);
      await capture(`homepage-pricing-${width}`);
    }
  });

  await check('Tjz published profile replaces the Sleek homepage example', async () => {
    for (const width of [1440, 390]) {
      await page.setViewport(width, 900);
      await page.evaluate("document.querySelector('#profiles').scrollIntoView({ block: 'center' })");
      await page.click('[aria-label="Show Tjz profile"]', 'Tjz profile preview');
      await page.waitFor("document.querySelector('.tjz-profile .profile-reference-card')", 'Tjz framed profile');
      await page.waitFor("[...document.querySelectorAll('.tjz-profile img')].every(img => img.complete && img.naturalWidth > 0)", 'Tjz published media');
      const state = await page.evaluate(`(() => ({
        address: document.querySelector('.profile-example__browser-address').textContent.trim(),
        content: document.querySelector('.tjz-profile').textContent,
        joined: document.querySelector('.tjz-profile').textContent.includes('Joined'),
        exampleWidth: document.querySelector('.profile-example')?.getBoundingClientRect().width || 0,
        browserWidth: document.querySelector('.profile-example__browser')?.getBoundingClientRect().width || 0,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        links: [...document.querySelectorAll('.tjz-profile a')].map(a => a.href)
      }))()`);
      assert(state.address === 'chm.lol/tjz' && state.content.includes('Tjz') && state.content.includes('why does this keep resetting'), 'Tjz identity does not match the published snapshot.');
      assert(!state.joined && !state.overflow && state.links.includes('https://github.com/jtjd'), 'Tjz preview metadata, geometry, or links drifted.');
      if (width >= 1000) assert(state.exampleWidth >= width * .9 && state.browserWidth >= 800, `Desktop profile preview is too constrained: ${JSON.stringify(state)}.`);
      await capture(`homepage-tjz-${width}`);
    }
    assert(networkSnapshot().profileHydrationCount === 0, 'The captured profile added homepage hydration requests.');
  });

  await check('Simplistic reuses the current Tjz profile with a feminine showcase identity', async () => {
    for (const width of [1440, 390]) {
      await page.setViewport(width, 900);
      await page.evaluate("document.querySelector('#profiles').scrollIntoView({ block: 'center' })");
      await page.click('[aria-label="Show Simplistic layout"]', 'Simplistic profile preview');
      await page.waitFor('document.querySelector(\'.profile-example [data-profile-layout-content="full-bleed"]\')', 'Simplistic full-bleed profile');
      await page.waitFor('document.querySelector(\'.profile-example [data-profile-layout-content="full-bleed"] [data-name-font-ready="true"]\')', 'Simplistic profile font');
      await page.waitFor('document.querySelector(\'.profile-example [data-profile-layout-content="full-bleed"] .profile-full-bleed__avatar\')?.naturalWidth > 0', 'Simplistic profile avatar');
      await page.waitFor('document.querySelector(\'.profile-example [data-profile-layout-content="full-bleed"] ~ .profile-environment__atmosphere, .profile-example .profile-environment__atmosphere\')', 'Simplistic profile atmosphere');
      const state = await page.evaluate(`(() => {
        const card = document.querySelector('.profile-example [data-profile-layout-content="full-bleed"]');
        return {
          name: card?.querySelector('.profile-full-bleed__name')?.textContent?.trim() || '',
          bio: card?.querySelector('.profile-full-bleed__bio')?.textContent?.trim() || '',
          address: document.querySelector('.profile-example__browser-address')?.textContent?.trim() || '',
          avatar: card?.querySelector('.profile-full-bleed__avatar')?.getAttribute('src') || '',
          effect: card?.querySelector('[data-avatar-effect]')?.getAttribute('data-avatar-effect') || '',
          motion: card?.closest('[data-profile-motion]')?.getAttribute('data-profile-motion') || '',
          joined: card?.textContent?.includes('Joined') || false,
          links: card?.querySelectorAll('.profile-full-bleed__link-placeholder').length || 0,
          canvasPadding: getComputedStyle(document.querySelector('.profile-example__canvas')).padding,
          overflow: document.documentElement.scrollWidth > innerWidth + 1
        };
      })()`);
      assert(state.name === 'Mira' && state.bio === 'collecting soft colors and quiet moments.', `Simplistic identity drifted: ${JSON.stringify(state)}.`);
      assert(state.address === 'chm.lol/mira' && state.effect === 'cloud-bunny' && !state.motion && !state.joined && state.links === 4 && state.canvasPadding === '0px', `Simplistic Tjz profile source drifted: ${JSON.stringify(state)}.`);
      assert(!state.overflow && state.avatar.includes('/profiles/c177316f-415a-48ad-8e4e-901fc6766693/26623dc6-5915-4852-a042-16505799a7b2/'), `Simplistic profile geometry or avatar drifted: ${JSON.stringify(state)}.`);
      await capture(`homepage-simplistic-${width}`);
    }
    assert(networkSnapshot().profileHydrationCount === 0, 'The Simplistic profile added homepage hydration requests.');
  });

  const legacyTjzCursorAsset = '/7709b00b-f15a-42b4-9a22-ba3d2bcb93d5/0a6dffc2823137e622e786f47bb049cec213e76d621ab0661aed72a2d68d9080.webp';
  const unexpectedFailedRequests = page.requestLog.filter(request => request.failed && !request.url.includes('cloudflareinsights.com/cdn-cgi/rum') && !request.url.includes(legacyTjzCursorAsset));
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
