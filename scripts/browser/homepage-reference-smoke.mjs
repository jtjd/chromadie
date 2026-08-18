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
  await page.evaluate('document.fonts.ready.then(() => true)');

  await check('desktop reference anatomy and centered geometry', async () => {
    const state = await page.evaluate(`(() => {
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
      const stage = document.querySelector('.homepage-profile-stage');
      const card = document.querySelector('.homepage-profile-demo--hero');
      const background = document.querySelector('.homepage-background');
      const avatar = card?.querySelector('.profile-full-bleed__avatar, .profile-reference-card__avatar');
      const profileName = card?.querySelector('.profile-full-bleed__name, .profile-reference-card__name');
      const profileBio = card?.querySelector('.profile-full-bleed__bio, .profile-reference-card__bio');
      const headlineStyle = getComputedStyle(document.querySelector('.homepage-hero h1'));
      const profileNameStyle = getComputedStyle(profileName || card);
      const bodyStyle = getComputedStyle(document.querySelector('.homepage-hero__lede'));
      return {
        stage: rect(stage),
        card: rect(card),
        layout: card?.dataset.homepageProfileLayout || '',
        backgroundImage: getComputedStyle(background).backgroundImage,
        avatarImage: avatar?.getAttribute('src') || (avatar ? getComputedStyle(avatar).backgroundImage : ''),
        claim: Boolean(document.querySelector('#claim .homepage-claim__field')),
        avatar: Boolean(avatar),
        name: Boolean(profileName),
        bio: Boolean(profileBio),
        fullBleed: Boolean(card?.querySelector('[data-profile-layout-content="full-bleed"]')),
        linkCount: card?.querySelectorAll('.profile-full-bleed__links a, .profile-reference-card__links a').length || 0,
        homepageRoll: Boolean(document.querySelector('.homepage-roll-compact__result')),
        fonts: {
          status: document.fonts.status,
          clash: document.fonts.check('600 48px "Clash Display"'),
          inter: document.fonts.check('400 16px "Inter"'),
          headline: headlineStyle.fontFamily,
          profileName: profileNameStyle.fontFamily,
          body: bodyStyle.fontFamily
        },
        specimenCount: document.querySelectorAll('[data-homepage-profile-specimen]').length,
        profileShellCount: document.querySelectorAll('.profile-shell-page').length,
        oldBrowserFrame: Boolean(document.querySelector('.home-browser, .home-hero__stage, .home-page')),
        arrowGlyph: document.querySelector('.homepage-reference')?.textContent?.includes('↗') || false
      };
    })()`);
    assert(state.specimenCount === 4, `Expected one hero and three showcase specimens: ${JSON.stringify(state)}.`);
    assert(state.profileShellCount === 0, `Homepage mounted a public ProfileShell: ${JSON.stringify(state)}.`);
    assert(!state.oldBrowserFrame && !state.arrowGlyph, `Obsolete homepage treatment remains: ${JSON.stringify(state)}.`);
    assert(state.layout === 'full-bleed' && state.fullBleed, `Homepage fixture one is not using the Immersive renderer: ${JSON.stringify(state)}.`);
    assert(state.claim && state.avatar && state.name && state.bio && state.linkCount === 4 && state.homepageRoll, `Immersive profile anatomy is incomplete: ${JSON.stringify(state)}.`);
    assert(state.fonts.status === 'loaded' && state.fonts.clash && state.fonts.inter
      && state.fonts.headline.includes('Clash Display')
      && state.fonts.profileName.includes('Clash Display')
      && state.fonts.body.includes('Inter'), `Homepage typography is not rendering the approved font faces: ${JSON.stringify(state.fonts)}.`);
    assert(state.backgroundImage.includes('meilin/background-dusk-v2.webp'), `Homepage background is not Meilin's dedicated fixture: ${JSON.stringify(state)}.`);
    assert(state.avatarImage.includes('meilin/avatar.webp'), `Homepage fixture one is not using Meilin's dedicated avatar: ${JSON.stringify(state)}.`);
    assert(state.stage && Math.abs((state.stage.left + state.stage.right) / 2 - 720) <= 2, `Hero stage is not centered: ${JSON.stringify(state)}.`);
    assert(state.card && state.card.width >= 370 && state.card.width <= 395 && state.card.height >= 280 && state.card.height <= 340, `Immersive hero identity drifted from reference proportions: ${JSON.stringify(state)}.`);
    await capture('homepage-1440x900');
    return state;
  });

  await check('desktop hero drives the card tilt while surrounding controls remain stationary', async () => {
    await page.setReducedMotion(false);
    await delay(80);
    const finePointerAvailable = await page.evaluate('window.matchMedia("(hover: hover) and (pointer: fine)").matches');
    if (!finePointerAvailable) {
      return { skipped: true, reason: 'Headless Chromium does not expose a fine-pointer media capability.' };
    }
    const bounds = await page.evaluate(`(() => {
      const box = document.querySelector('.homepage-hero')?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null;
    })()`);
    assert(bounds, 'Homepage hero bounds are unavailable for tilt verification.');
    await page.command('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: bounds.right - 4,
      y: bounds.top + 4,
      buttons: 0,
      pointerType: 'mouse'
    });
    await delay(60);
    const active = await page.evaluate(`(() => ({
      transform: getComputedStyle(document.querySelector('.profile-motion-effect__motion')).transform,
      claimTransform: getComputedStyle(document.querySelector('.homepage-claim__field')).transform,
      prevTransform: getComputedStyle(document.querySelector('.homepage-theme-button--prev')).transform
    }))()`);
    assert(active.transform !== 'none', `Hero-wide pointer movement did not produce the requested visible tilt: ${JSON.stringify(active)}.`);
    assert(active.claimTransform === 'none', `Claim bar moved with the profile card: ${JSON.stringify(active)}.`);

    await page.command('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.max(1, bounds.left - 8),
      y: bounds.top + 20,
      buttons: 0,
      pointerType: 'mouse'
    });
    await delay(620);
    const resting = await page.evaluate(`(() => ({
      style: document.querySelector('.profile-motion-effect__motion')?.getAttribute('style') || '',
      transform: getComputedStyle(document.querySelector('.profile-motion-effect__motion')).transform
    }))()`);
    assert(resting.style.includes('rotateY(-4deg)') && resting.style.includes('rotateX(2deg)') && resting.transform !== 'none', `Profile did not return to its resting CSS tilt: ${JSON.stringify({ active, resting })}.`);
    return { active, resting };
  });

  await check('preview roll animates locally and honors reduced motion', async () => {
    const networkBefore = homepageNetworkSnapshot();
    const initialHex = await page.evaluate('document.querySelector(".homepage-roll-compact__result span:last-child")?.textContent?.trim() || ""');
    const globalAccentBefore = await page.evaluate('getComputedStyle(document.querySelector(".homepage-reference")).getPropertyValue("--homepage-accent").trim()');
    await page.click('.homepage-roll-compact__button', 'animated homepage preview roll');
    const rollingLabel = await page.evaluate('document.querySelector(".homepage-roll-compact__button")?.textContent?.trim() || ""');
    assert(rollingLabel === 'Rolling…', `Preview roll did not enter its disabled rolling state: ${JSON.stringify(rollingLabel)}.`);
    await delay(125);
    const duringSpin = await page.evaluate(`(() => ({
      globalAccent: getComputedStyle(document.querySelector('.homepage-reference')).getPropertyValue('--homepage-accent').trim(),
      localAccent: getComputedStyle(document.querySelector('.homepage-hero')).getPropertyValue('--homepage-roll-accent').trim(),
      cardHex: document.querySelector('.homepage-roll-compact__result span:last-child')?.textContent?.trim() || ''
    }))()`);
    assert(duringSpin.globalAccent === globalAccentBefore && duringSpin.localAccent !== globalAccentBefore && duringSpin.cardHex !== initialHex,
      `SPIN changed the global accent or failed to update local roll visuals: ${JSON.stringify({ globalAccentBefore, duringSpin })}.`);
    await page.waitFor('document.querySelector(".homepage-roll-compact__button")?.textContent?.trim() === "Roll again"', 'animated homepage preview roll result');
    await page.waitFor('document.querySelectorAll(".homepage-roll-particles span").length > 0', 'homepage roll impact phase');
    const animated = await page.evaluate(`(() => {
      const dot = document.querySelector('.homepage-roll-compact__dot');
      const headline = document.querySelector('.homepage-hero h1 span');
      return {
        accent: getComputedStyle(document.querySelector('.homepage-reference')).getPropertyValue('--homepage-accent').trim(),
        localAccent: getComputedStyle(document.querySelector('.homepage-hero')).getPropertyValue('--homepage-roll-accent').trim(),
        leftHex: document.querySelector('.homepage-roll-compact__result span:last-child')?.textContent?.trim() || '',
        cardHex: document.querySelector('.homepage-roll-compact__result span:last-child')?.textContent?.trim() || '',
        dotColor: dot ? getComputedStyle(dot).backgroundColor : '',
        headlineColor: headline ? getComputedStyle(headline).color : '',
        particles: document.querySelectorAll('.homepage-roll-particles span').length,
        pop: document.querySelector('.homepage-profile-pop')?.classList.contains('homepage-profile-pop--active') || false
      };
    })()`);
    assert(animated.cardHex !== initialHex && animated.leftHex === animated.cardHex && animated.accent === animated.cardHex && animated.localAccent === animated.cardHex,
      `Preview roll did not update the complete accent and roll state: ${JSON.stringify({ initialHex, animated })}.`);
    assert(animated.dotColor === animated.headlineColor,
      `Preview roll color consumers diverged: ${JSON.stringify(animated)}.`);
    assert(animated.particles > 0 && animated.pop, `Animated roll omitted the profile response: ${JSON.stringify(animated)}.`);

    await page.waitFor('document.querySelector(".homepage-roll-compact__button")?.disabled === false', 'homepage impact phase completion');
    await page.setReducedMotion(true);
    await page.click('.homepage-roll-compact__button', 'reduced-motion homepage preview roll');
    await delay(60);
    const reduced = await page.evaluate(`(() => ({
      label: document.querySelector('.homepage-roll-compact__button')?.textContent?.trim() || '',
      cardHex: document.querySelector('.homepage-roll-compact__result span:last-child')?.textContent?.trim() || '',
      particles: document.querySelectorAll('.homepage-roll-particles span').length,
      pop: document.querySelector('.homepage-profile-pop')?.classList.contains('homepage-profile-pop--active') || false
    }))()`);
    assert(reduced.label === 'Roll again' && reduced.cardHex !== animated.cardHex && reduced.particles === 0 && !reduced.pop,
      `Reduced-motion preview roll did not settle immediately and quietly: ${JSON.stringify({ animated, reduced })}.`);
    const networkAfter = homepageNetworkSnapshot();
    assert(networkAfter.supabaseRequestCount === networkBefore.supabaseRequestCount
      && networkAfter.storageCount === networkBefore.storageCount
      && networkAfter.remoteMediaCount === networkBefore.remoteMediaCount,
    `Local homepage roll preview made an unexpected network request: ${JSON.stringify({ networkBefore, networkAfter })}.`);
    return { initialHex, animated, reduced, networkBefore, networkAfter };
  });

  await check('keyboard carousel switches the complete fixture environment', async () => {
    const networkBefore = homepageNetworkSnapshot();
    const before = await page.evaluate(`(() => ({
      fixture: document.querySelector('.homepage-profile-demo--hero')?.dataset.homepageFixture || '',
      layout: document.querySelector('.homepage-profile-demo--hero')?.dataset.homepageProfileLayout || '',
      name: document.querySelector('.homepage-profile-demo--hero .profile-full-bleed__name, .homepage-profile-demo--hero .profile-reference-card__name')?.textContent?.trim() || '',
      background: getComputedStyle(document.querySelector('.homepage-background')).backgroundImage,
      roll: document.querySelector('.homepage-roll-compact__result span:last-child')?.textContent?.trim() || ''
    }))()`);
    await page.evaluate('document.querySelector(".homepage-theme-button--next")?.focus()');
    await pressEnter();
    await page.waitFor('document.querySelector(".homepage-profile-demo--hero")?.dataset.homepageFixture === "sleek-arcade"', 'next deterministic homepage fixture');
    const after = await page.evaluate(`(() => ({
      fixture: document.querySelector('.homepage-profile-demo--hero')?.dataset.homepageFixture || '',
      layout: document.querySelector('.homepage-profile-demo--hero')?.dataset.homepageProfileLayout || '',
      name: document.querySelector('.homepage-profile-demo--hero .profile-full-bleed__name, .homepage-profile-demo--hero .profile-reference-card__name')?.textContent?.trim() || '',
      background: getComputedStyle(document.querySelector('.homepage-background')).backgroundImage,
      roll: document.querySelector('.homepage-roll-compact__result span:last-child')?.textContent?.trim() || ''
    }))()`);
    assert(before.fixture === 'meilin-horizon' && after.fixture === 'sleek-arcade', `Carousel fixture state is not deterministic: ${JSON.stringify({ before, after })}.`);
    assert(before.layout === 'full-bleed' && after.layout === 'compact' && before.name !== after.name && before.background !== after.background && before.roll !== after.roll, `Carousel did not update the complete environment: ${JSON.stringify({ before, after })}.`);
    await page.evaluate('document.querySelector(".homepage-theme-button--prev")?.focus()');
    await pressEnter();
    await page.waitFor('document.querySelector(".homepage-profile-demo--hero")?.dataset.homepageFixture === "meilin-horizon"', 'previous deterministic homepage fixture');
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
    await page.evaluate('document.fonts.ready.then(() => true)');
    const state = await page.evaluate(`(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      heroColumns: getComputedStyle(document.querySelector('.homepage-hero')).gridTemplateColumns,
      contextDisplay: getComputedStyle(document.querySelector('.homepage-hero__context')).display,
      stage: (() => { const box = document.querySelector('.homepage-profile-stage')?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, width: box.width } : null; })(),
      card: (() => { const box = document.querySelector('.homepage-profile-demo--hero')?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, width: box.width, height: box.height } : null; })(),
      claim: (() => { const box = document.querySelector('.homepage-claim__field')?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, width: box.width } : null; })(),
      headlineFont: getComputedStyle(document.querySelector('.homepage-hero h1')).fontFamily
    }))()`);
    assert(state.scrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1, `${width}x${height} homepage overflows horizontally: ${JSON.stringify(state)}.`);
    if (width <= 768) assert(state.heroColumns.trim().split(' ').length === 1, `Mobile homepage kept multi-column hero: ${JSON.stringify(state)}.`);
    if (width <= 768) {
      assert(state.claim && state.claim.left >= -1 && state.claim.right <= width + 1, `${width}x${height} claim control drifted outside the viewport: ${JSON.stringify(state)}.`);
      assert(state.card && state.card.left >= -1 && state.card.right <= width + 1, `${width}x${height} profile card drifted outside the viewport: ${JSON.stringify(state)}.`);
    }
    if (width > 930 && width <= 1180) {
      assert(state.claim && Math.abs(state.claim.width - 390) <= 1, `${width}x${height} intermediate claim width drifted from the reference: ${JSON.stringify(state)}.`);
    }
    assert(state.headlineFont.includes('Clash Display'), `${width}x${height} homepage headline lost Clash Display: ${JSON.stringify(state)}.`);
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
