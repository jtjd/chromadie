#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  defaultDebugPort,
  findAvailablePort,
  startChromium,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';

const appUrl = process.env.HOMEPAGE_SMOKE_URL || 'http://127.0.0.1:5173/';
const evidenceDir = process.env.HOMEPAGE_SMOKE_EVIDENCE_DIR
  || join(process.cwd(), 'artifacts', 'homepage-reference-fidelity-20260814');
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

async function pressEnter() {
  const key = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await page.command('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...key });
  await page.command('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter', code: 'Enter' });
  await page.command('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
}

function homepageNetworkSnapshot() {
  const requests = page.requestLog.filter(request => request.method !== 'OPTIONS');
  const parsed = requests.map(request => {
    try { return { ...request, parsed: new URL(request.url) }; } catch { return { ...request, parsed: null }; }
  });
  const rpc = parsed.filter(request => request.parsed?.pathname.includes('/rest/v1/rpc/'));
  const supabase = parsed.filter(request => request.parsed?.hostname.endsWith('.supabase.co'));
  const discovery = rpc.filter(request => request.parsed.pathname.endsWith('/get_public_discovery'));
  const profileHydration = rpc.filter(request => /\/get_public_profile_[^/]+/.test(request.parsed.pathname));
  const storage = parsed.filter(request => request.parsed?.pathname.includes('/storage/v1'));
  const remoteMedia = parsed.filter(request => {
    const hostname = request.parsed?.hostname || '';
    return hostname === 'media.chm.lol' || hostname.endsWith('.r2.cloudflarestorage.com')
      || /\.(?:mp3|mp4|webm)(?:\?|$)/i.test(request.parsed?.pathname || '');
  });
  return {
    requestCount: requests.length,
    supabaseRequestCount: supabase.length,
    discoveryCount: discovery.length,
    profileHydrationCount: profileHydration.length,
    storageCount: storage.length,
    remoteMediaCount: remoteMedia.length,
    requests: requests.map(request => request.url)
  };
}

const homepageIdleWaitMs = Number(process.env.HOMEPAGE_NETWORK_IDLE_MS ?? 61000);

await mkdir(evidenceDir, { recursive: true });
await waitForHttp(appUrl, 10000);

try {
  chromium = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 900 });
  page = chromium.page;
  await page.setReducedMotion(true);
  await page.setViewport(1440, 900);
  await page.waitFor('Boolean(document.querySelector(".homepage-reference") && document.querySelector(".homepage-profile-demo--hero"))', 'homepage direct profile specimen');

  await check('desktop reference anatomy and centered geometry', async () => {
    const state = await page.evaluate(`(() => {
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
      const stage = document.querySelector('.homepage-profile-stage');
      const card = document.querySelector('.homepage-profile-demo--hero');
      const background = document.querySelector('.homepage-background');
      return {
        stage: rect(stage),
        card: rect(card),
        backgroundImage: getComputedStyle(background).backgroundImage,
        claim: Boolean(document.querySelector('#claim .homepage-claim__field')),
        avatar: Boolean(card?.querySelector('.homepage-profile-demo__avatar')),
        name: Boolean(card?.querySelector('.homepage-profile-demo__name')),
        bio: Boolean(card?.querySelector('.homepage-profile-demo__bio')),
        linkCount: card?.querySelectorAll('.homepage-profile-demo__links a').length || 0,
        roll: Boolean(card?.querySelector('.homepage-profile-demo__roll')),
        specimenCount: document.querySelectorAll('[data-homepage-profile-specimen]').length,
        profileShellCount: document.querySelectorAll('.profile-shell-page').length,
        oldBrowserFrame: Boolean(document.querySelector('.home-browser, .home-hero__stage, .home-page')),
        arrowGlyph: document.querySelector('.homepage-reference')?.textContent?.includes('↗') || false
      };
    })()`);
    assert(state.specimenCount === 4, `Expected one hero and three showcase specimens: ${JSON.stringify(state)}.`);
    assert(state.profileShellCount === 0, `Homepage mounted a public ProfileShell: ${JSON.stringify(state)}.`);
    assert(!state.oldBrowserFrame && !state.arrowGlyph, `Obsolete homepage treatment remains: ${JSON.stringify(state)}.`);
    assert(state.claim && state.avatar && state.name && state.bio && state.linkCount === 4 && state.roll, `Reference profile anatomy is incomplete: ${JSON.stringify(state)}.`);
    assert(state.backgroundImage.includes('compact-background.png'), `Homepage background is not photographic fixture one: ${JSON.stringify(state)}.`);
    assert(state.stage && Math.abs((state.stage.left + state.stage.right) / 2 - 720) <= 2, `Hero stage is not centered: ${JSON.stringify(state)}.`);
    assert(state.card && state.card.width >= 370 && state.card.width <= 395 && state.card.height >= 420 && state.card.height <= 490, `Hero card drifted from reference proportions: ${JSON.stringify(state)}.`);
    await capture('homepage-1440x900');
    return state;
  });

  await check('keyboard carousel switches the complete fixture environment', async () => {
    const networkBefore = homepageNetworkSnapshot();
    const before = await page.evaluate(`(() => ({
      fixture: document.querySelector('.homepage-profile-demo--hero')?.dataset.homepageFixture || '',
      name: document.querySelector('.homepage-profile-demo__name')?.textContent?.trim() || '',
      background: getComputedStyle(document.querySelector('.homepage-background')).backgroundImage,
      roll: document.querySelector('.homepage-profile-demo__roll strong')?.textContent?.trim() || ''
    }))()`);
    await page.evaluate('document.querySelector(".homepage-theme-button--next")?.focus()');
    await pressEnter();
    await page.waitFor('document.querySelector(".homepage-profile-demo--hero")?.dataset.homepageFixture === "sleek-arcade"', 'next deterministic homepage fixture');
    const after = await page.evaluate(`(() => ({
      fixture: document.querySelector('.homepage-profile-demo--hero')?.dataset.homepageFixture || '',
      name: document.querySelector('.homepage-profile-demo__name')?.textContent?.trim() || '',
      background: getComputedStyle(document.querySelector('.homepage-background')).backgroundImage,
      roll: document.querySelector('.homepage-profile-demo__roll strong')?.textContent?.trim() || ''
    }))()`);
    assert(before.fixture === 'compact-tjz' && after.fixture === 'sleek-arcade', `Carousel fixture state is not deterministic: ${JSON.stringify({ before, after })}.`);
    assert(before.name !== after.name && before.background !== after.background && before.roll !== after.roll, `Carousel did not update the complete environment: ${JSON.stringify({ before, after })}.`);
    await page.evaluate('document.querySelector(".homepage-theme-button--prev")?.focus()');
    await pressEnter();
    await page.waitFor('document.querySelector(".homepage-profile-demo--hero")?.dataset.homepageFixture === "compact-tjz"', 'previous deterministic homepage fixture');
    const networkAfter = homepageNetworkSnapshot();
    assert(networkAfter.discoveryCount === networkBefore.discoveryCount
      && networkAfter.profileHydrationCount === networkBefore.profileHydrationCount
      && networkAfter.storageCount === networkBefore.storageCount
      && networkAfter.remoteMediaCount === networkBefore.remoteMediaCount
      && networkAfter.supabaseRequestCount === networkBefore.supabaseRequestCount,
    `Carousel interaction made an unexpected network request: ${JSON.stringify({ networkBefore, networkAfter })}.`);
    return { before, after, restored: true, networkBefore, networkAfter };
  });

  await check('claim validation remains real and visually transparent', async () => {
    await page.setInputValue('#homepage-claim-hero', 'bad handle', ['input', 'change']);
    await page.click('#claim .homepage-button', 'invalid claim submit');
    const message = await page.evaluate('document.querySelector("#homepage-claim-hero-error")?.textContent?.trim() || ""');
    const style = await page.evaluate(`(() => {
      const field = document.querySelector('#claim .homepage-claim__field');
      const computed = getComputedStyle(field);
      return { background: computed.backgroundColor, borderRadius: computed.borderRadius, backdropFilter: computed.backdropFilter };
    })()`);
    assert(message === 'Use 1–20 letters, numbers, or underscores.', `Username policy message changed: ${JSON.stringify(message)}.`);
    assert(style.borderRadius === '11px' && style.backdropFilter.includes('blur'), `Claim control treatment drifted: ${JSON.stringify(style)}.`);
    return { message, style };
  });

  await check('community owns the only live homepage profile feed', async () => {
    const state = await page.evaluate(`(() => ({
      community: Boolean(document.querySelector('.homepage-community')),
      oldDirectory: Boolean(document.querySelector('.homepage-directory, #home-leaderboard')),
      discoveryRequests: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/rpc/get_public_discovery')).length
    }))()`);
    assert(state.community && !state.oldDirectory, `Legacy community presentation remains mounted: ${JSON.stringify(state)}.`);
    const initialNetwork = homepageNetworkSnapshot();
    assert(initialNetwork.discoveryCount <= 1, `Homepage exceeded its bounded discovery budget: ${JSON.stringify(initialNetwork)}.`);
    assert(initialNetwork.profileHydrationCount === 0, `Homepage hydrated arbitrary public profiles: ${JSON.stringify(initialNetwork)}.`);
    assert(initialNetwork.storageCount === 0, `Homepage contacted Supabase Storage: ${JSON.stringify(initialNetwork)}.`);
    assert(initialNetwork.remoteMediaCount === 0, `Homepage downloaded user media: ${JSON.stringify(initialNetwork)}.`);
    if (homepageIdleWaitMs > 0) {
      await delay(homepageIdleWaitMs);
      const idleNetwork = homepageNetworkSnapshot();
      assert(idleNetwork.supabaseRequestCount === initialNetwork.supabaseRequestCount
        && idleNetwork.discoveryCount === initialNetwork.discoveryCount
        && idleNetwork.profileHydrationCount === 0
        && idleNetwork.storageCount === 0
        && idleNetwork.remoteMediaCount === 0,
      `Homepage generated network activity while idle for ${homepageIdleWaitMs}ms: ${JSON.stringify({ initialNetwork, idleNetwork })}.`);
      return { ...state, initialNetwork, idleNetwork, idleWaitMs: homepageIdleWaitMs };
    }
    return { ...state, initialNetwork, idleWaitMs: 0 };
  });

  await check('lower photographic showcase capture', async () => {
    await page.evaluate('document.querySelector("#showcase")?.scrollIntoView({ block: "start" })');
    await capture('homepage-showcase-1440x900');
    await page.evaluate('document.querySelector("#community")?.scrollIntoView({ block: "start" })');
    await capture('homepage-community-1440x900');
    return { showcase: true, community: true };
  });

  for (const [width, height] of [[1440, 900], [1280, 800], [1024, 900], [768, 1024], [390, 844], [375, 812]]) {
    await page.setViewport(width, height);
    await page.navigate(appUrl, `${width}x${height} homepage`);
    await page.waitFor('Boolean(document.querySelector(".homepage-reference .homepage-profile-demo--hero"))', `${width}x${height} direct homepage specimen`);
    const state = await page.evaluate(`(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      heroColumns: getComputedStyle(document.querySelector('.homepage-hero')).gridTemplateColumns,
      contextDisplay: getComputedStyle(document.querySelector('.homepage-hero__context')).display,
      stage: (() => { const box = document.querySelector('.homepage-profile-stage')?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, width: box.width } : null; })(),
      card: (() => { const box = document.querySelector('.homepage-profile-demo--hero')?.getBoundingClientRect(); return box ? { width: box.width, height: box.height } : null; })()
    }))()`);
    assert(state.scrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1, `${width}x${height} homepage overflows horizontally: ${JSON.stringify(state)}.`);
    if (width <= 768) assert(state.heroColumns.trim().split(' ').length === 1, `Mobile homepage kept multi-column hero: ${JSON.stringify(state)}.`);
    results.viewports.push(state);
    await capture(`homepage-${width}x${height}`);
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
