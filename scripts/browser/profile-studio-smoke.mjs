#!/usr/bin/env node

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import {
  assertLocalSupabaseUrl,
  defaultAppPort,
  defaultDebugPort,
  findAvailablePort,
  loadLocalEnvironment,
  startChromium,
  startVite,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';
import { isReservedRouteSegment } from '../../src/lib/routeContract.js';
import { isProtectedUsername } from '../../src/lib/usernamePolicy.js';

const environment = await loadLocalEnvironment();

// Keep environment parsing private to the harness API while making this script
// fail early and clearly if somebody runs it against a deployed project.
if (!environment?.url || !environment?.key) {
  throw new Error('Local smoke requires VITE_SUPABASE_URL and VITE_SUPABASE_KEY (normally provided by .env.local).');
}
const supabaseUrl = assertLocalSupabaseUrl(environment.url);
const evidenceDir = await mkdtemp(join(tmpdir(), 'chromadie-profile-studio-smoke-'));

const results = {
  status: 'running',
  evidenceDir,
  screenshots: [],
  steps: [],
  account: {},
  browserConsole: [],
  requests: []
};
let vite;
let chromium;
let page;
let failure;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function step(name, action) {
  process.stdout.write(`\n[smoke] ${name} ... `);
  const started = Date.now();
  try {
    const detail = await action();
    const result = { name, status: 'passed', durationMs: Date.now() - started, ...(detail && typeof detail === 'object' ? { detail } : {}) };
    results.steps.push(result);
    console.log(`PASS (${result.durationMs} ms)`);
    return detail;
  } catch (error) {
    const result = { name, status: 'failed', durationMs: Date.now() - started, error: error.message };
    results.steps.push(result);
    console.log(`FAIL (${result.durationMs} ms)`);
    throw new Error(`${name}: ${error.message}`, { cause: error });
  }
}

async function writeEvidence() {
  results.status = failure ? 'failed' : 'passed';
  results.browserConsole = page?.consoleLog || [];
  results.requests = page?.requestLog || [];
  results.failure = failure ? { message: failure.message } : undefined;
  await writeFile(join(evidenceDir, 'evidence.json'), JSON.stringify(results, null, 2) + '\n');
}

async function capture(name) {
  const path = join(evidenceDir, `${name}.png`);
  await page.screenshot(path);
  results.screenshots.push(path);
  return path;
}

function dashboardStateExpression() {
  return `(() => {
    const preview = document.querySelector('.profile-settings-preview');
    const page = document.querySelector('.profile-shell-page--preview');
    const card = document.querySelector('.profile-settings-preview .identity-card');
    const roll = document.querySelector('.profile-settings-preview [data-profile-region="roll"]');
    const style = element => element ? getComputedStyle(element) : null;
    const read = element => {
      const computed = style(element);
      if (!computed) return null;
      return {
        blurVar: computed.getPropertyValue('--profile-surface-blur').trim(),
        surfaceVar: computed.getPropertyValue('--profile-surface-fill').trim(),
        backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter || '',
        rect: (() => { const rect = element.getBoundingClientRect(); return { width: Math.round(rect.width), height: Math.round(rect.height) }; })()
      };
    };
    return {
      preview: Boolean(preview),
      previewRect: preview ? (() => { const rect = preview.getBoundingClientRect(); return { width: Math.round(rect.width), height: Math.round(rect.height) }; })() : null,
      page: Boolean(page),
      card: read(card),
      roll: read(roll),
      publishDisabled: [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Publish')?.disabled ?? null,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    };
  })()`;
}

try {
  const authResponse = await waitForHttp(`${supabaseUrl.origin}/auth/v1/settings`, 5000).catch(error => {
    throw new Error(`Local Supabase is not reachable at ${supabaseUrl.origin}. Start local Supabase first. ${error.message}`);
  });
  assert(authResponse.ok, `Local Supabase auth endpoint returned HTTP ${authResponse.status}.`);

  const appPort = await findAvailablePort(defaultAppPort);
  const debugPort = await findAvailablePort(defaultDebugPort);
  results.ports = { appPort, debugPort };
  const appUrl = `http://127.0.0.1:${appPort}`;
  const shortAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789_';
  let canonicalUsername;
  do {
    canonicalUsername = Array.from({ length: 2 }, () => shortAlphabet[Math.floor(Math.random() * shortAlphabet.length)]).join('');
  } while (isProtectedUsername(canonicalUsername) || isReservedRouteSegment(canonicalUsername));
  const email = `smoke-${Date.now().toString(36)}-${canonicalUsername}@example.test`;
  const password = `Smoke-${Date.now().toString(36)}-Pass!`;

  vite = await startVite({ appPort, environment: { url: supabaseUrl.origin, key: environment.key }, evidenceDir });
  chromium = await startChromium({ appUrl, debugPort, evidenceDir });
  page = chromium.page;

  await step('open local homepage', async () => {
    await page.waitFor(`(() => {
      const image = document.querySelector('.home-browser img');
      const stage = document.querySelector('.home-hero__stage');
      return Boolean(document.querySelector('.site-mode-header')
        && document.querySelector('.home-page #home-title')
        && image?.complete
        && image.naturalWidth > 0
        && Number.parseFloat(getComputedStyle(stage).opacity || '1') > 0.99);
    })()`, 'hydrated homepage');
    assert((await page.evaluate('location.hostname')) === '127.0.0.1', 'Homepage did not load on loopback.');
    await capture('01-homepage');
  });

  await step('create a unique account through the signup UI', async () => {
    await page.clickText('Sign up', { description: 'homepage signup control' });
    await page.waitFor(`location.pathname === '/signup' && document.querySelector('.auth-page') && document.querySelector('.auth-page .site-mode-header--home') && document.querySelector('.auth-container') && document.querySelector('#username-input') && !document.querySelector('.auth-modal-overlay')`, 'standalone signup page');
    await capture('02-auth-signup');
    await page.clickText('Sign in', { description: 'auth route switch to sign in' });
    await page.waitFor(`location.pathname === '/login' && document.querySelector('.auth-page') && document.querySelector('#email-input')`, 'standalone login page');
    await capture('03-auth-login');
    await page.clickText('Create account', { description: 'auth route switch to create account' });
    await page.waitFor(`location.pathname === '/signup' && document.querySelector('.auth-page') && document.querySelector('#username-input')`, 'signup route after auth switch');
    await page.setInputValue('#username-input', canonicalUsername, ['input', 'change']);
    await page.setInputValue('#email-input', email, ['input', 'change']);
    await page.setInputValue('#password-input', password, ['input', 'change']);
    await page.click('.auth-submit', 'signup submit control');
    await page.waitFor(`location.pathname === ${JSON.stringify(`/${canonicalUsername}`)} && document.querySelector('.profile-shell-page') && document.querySelector('.profile-shell-page .identity-card') && !document.querySelector('.auth-page')`, 'authenticated session after signup', 30000);
    const accountName = await page.evaluate('document.querySelector(".identity-card__handle")?.textContent?.trim() || ""');
    assert(accountName.toLowerCase() === `@${canonicalUsername}` || accountName.toLowerCase() === canonicalUsername, `Authenticated profile shows ${JSON.stringify(accountName)}, expected ${canonicalUsername}.`);
    results.account = { username: canonicalUsername, email, canonicalPath: `/${canonicalUsername}` };
  });

  await step('authenticated auth route redirects to its safe destination', async () => {
    await page.navigate(`${appUrl}/login?next=%2Fprofile%2Fsettings`, 'authenticated login route');
    await page.waitFor(`location.pathname === '/profile/settings' && document.querySelector('.profile-settings-page') && !document.querySelector('.auth-page')`, 'authenticated auth-route redirect', 30000);
    const state = await page.evaluate(`(() => ({ path: location.pathname, settings: Boolean(document.querySelector('.profile-settings-page')), authPage: Boolean(document.querySelector('.auth-page')), overlay: Boolean(document.querySelector('.auth-modal-overlay')) }))()`);
    assert(state.path === '/profile/settings', `Safe auth redirect landed on ${state.path}.`);
    assert(state.settings && !state.authPage && !state.overlay, 'Authenticated auth route left an auth page or overlay mounted.');
    return state;
  });

  await step('direct-refresh authenticated Profile Studio', async () => {
    await page.navigate(`${appUrl}/profile/settings`, 'authenticated Profile Studio');
    await page.waitFor(`document.querySelector('.profile-settings-page') && document.querySelector('.profile-settings-page h1')`, 'Profile Studio');
    const state = await page.evaluate(`({ path: location.pathname, heading: document.querySelector('.profile-settings-page h1')?.textContent?.trim(), authenticated: Boolean(document.querySelector('.site-mode-header__account-name')) })`);
    assert(state.path === '/profile/settings', `Expected /profile/settings after refresh, got ${state.path}.`);
    assert(state.authenticated, 'Authenticated account control is missing after Profile Studio refresh.');
    await capture('04-profile-studio');
    return state;
  });

  await step('create an alias and resolve its direct-refresh path', async () => {
    const alias = `alias_${canonicalUsername}`;
    await page.navigate(`${appUrl}/profile/settings#profile-aliases`, 'Profile aliases');
    await page.waitFor(`document.querySelector('.aliases-editor') && document.querySelector('#profile-alias')`, 'Profile aliases editor');
    await page.setInputValue('#profile-alias', alias, ['input', 'change']);
    await page.click('.aliases-editor__save', 'add alias control');
    await page.waitFor(`document.querySelector('.aliases-editor__row a')?.getAttribute('href') === ${JSON.stringify(`/a/${alias}`)}`, 'created profile alias');
    const aliasPath = await page.evaluate('document.querySelector(".aliases-editor__row a")?.getAttribute("href") || ""');
    assert(aliasPath === `/a/${alias}`, `Alias path was ${aliasPath}, expected /a/${alias}.`);
    await page.command('Page.navigate', { url: `${appUrl}${aliasPath}` });
    await page.waitFor(`location.pathname === ${JSON.stringify(`/${canonicalUsername}`)} && document.querySelector('.profile-shell-page .identity-card')`, 'canonical profile after alias resolution', 30000);
    const state = await page.evaluate(`({ path: location.pathname, aliasPath: ${JSON.stringify(aliasPath)}, canonical: Boolean(document.querySelector('.profile-shell-page .identity-card')) })`);
    assert(state.path === `/${canonicalUsername}`, `Alias resolved to ${state.path} instead of canonical profile.`);
    assert(state.canonical, 'Canonical profile did not render after alias resolution.');
    await page.navigate(`${appUrl}/profile/settings`, 'Profile Studio after alias resolution');
    await page.waitFor('document.querySelector(".profile-settings-page")', 'Profile Studio after alias resolution');
    return state;
  });

  await step('inline live preview is present, not an overlay', async () => {
    await page.waitFor(`(() => {
      const preview = document.querySelector('.profile-settings-preview');
      const canvas = document.querySelector('.profile-settings-preview .profile-shell-page--preview');
      return Boolean(preview && canvas && !preview.closest('[role="dialog"]') && !preview.closest('.auth-modal-overlay'));
    })()`, 'inline live preview');
    return await page.evaluate(`(() => ({
      inline: Boolean(document.querySelector('.profile-settings-preview')),
      previewCanvas: Boolean(document.querySelector('.profile-settings-preview .profile-shell-page--preview')),
      overlay: Boolean(document.querySelector('.profile-settings-preview')?.closest('[role="dialog"], .auth-modal-overlay'))
    }))()`);
  });

  await step('Customize control changes the preview without publishing', async () => {
    await page.navigate(`${appUrl}/profile/settings#customize`, 'Customize section');
    await page.waitFor(`document.querySelector('.appearance-editor') && document.querySelector('.profile-settings-preview .identity-card')`, 'Customize editor and preview');
    const before = await page.evaluate(dashboardStateExpression());
    const publishRequestsBefore = page.requestLog.filter(request => request.url.includes('publish_profile_configuration_section')).length;
    await page.setInputValue('.appearance-editor__range:nth-child(2) input[type="range"]', 0, ['input']);
    await page.waitFor(`document.querySelector('.appearance-editor__range:nth-child(2) output')?.textContent?.trim() === '0px'`, 'zero blur preview value');
    const zero = await page.evaluate(dashboardStateExpression());
    await page.setInputValue('.appearance-editor__range:nth-child(2) input[type="range"]', 40, ['input']);
    await page.waitFor(`document.querySelector('.appearance-editor__range:nth-child(2) output')?.textContent?.trim() === '40px'`, 'maximum blur preview value');
    const after = await page.evaluate(dashboardStateExpression());
    const publishRequestsAfter = page.requestLog.filter(request => request.url.includes('publish_profile_configuration_section')).length;
    assert(before.preview && before.card && before.roll, 'Preview card or roll region was not available.');
    assert(zero.card.blurVar === '0px', `Preview did not apply 0px blur; observed ${JSON.stringify(zero.card.blurVar)}.`);
    assert(after.card.blurVar === '40px', `Preview did not apply 40px blur; observed ${JSON.stringify(after.card.blurVar)}.`);
    assert(after.card.backdropFilter.includes('40px'), `Computed card backdrop filter did not reflect 40px blur: ${after.card.backdropFilter || '<empty>'}.`);
    assert(after.roll.blurVar === '', `Appearance blur leaked into the roll region: ${JSON.stringify(after.roll.blurVar)}.`);
    assert(after.publishDisabled === false, 'Changing Customize did not create an unpublished draft.');
    assert(publishRequestsBefore === publishRequestsAfter, 'Changing Customize unexpectedly called the publish RPC.');
    await capture('05-customize-draft-blur');
    await page.clickText('Reset', { description: 'Customize reset control' });
    await page.waitFor(`document.querySelector('.appearance-editor__reset')?.disabled === true`, 'Customize reset');
    return { before, zero, after, publishRequests: publishRequestsAfter };
  });

  await step('narrow mobile layout contains the dashboard and restores keyboard focus', async () => {
    await page.setViewport(390, 844);
    await page.waitFor(`document.querySelector('.profile-dashboard-shell__mobile-bar button')`, 'mobile dashboard menu');
    const closed = await page.evaluate(`(() => {
      const trigger = document.querySelector('.profile-dashboard-shell__mobile-bar button');
      const sidebar = document.querySelector('#profile-dashboard-sidebar');
      return {
        visible: Boolean(trigger && trigger.getBoundingClientRect().width > 0),
        contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1,
        sidebarHidden: sidebar?.getAttribute('aria-hidden') === 'true' || sidebar?.hasAttribute('inert'),
        expanded: trigger?.getAttribute('aria-expanded')
      };
    })()`);
    assert(closed.visible, 'Mobile dashboard menu trigger is not visible.');
    assert(closed.contained, `Mobile dashboard overflows horizontally (${closed.documentScrollWidth}px document / ${closed.viewportWidth}px viewport).`);
    assert(closed.sidebarHidden, 'Closed mobile dashboard sidebar is not inert/hidden.');
    await page.click('.profile-dashboard-shell__mobile-bar button', 'mobile dashboard menu trigger');
    await page.waitFor(`document.querySelector('.profile-dashboard-shell__mobile-bar button')?.getAttribute('aria-expanded') === 'true' && document.activeElement?.closest('#profile-dashboard-sidebar')`, 'opened mobile menu focus');
    const opened = await page.evaluate(`(() => ({ expanded: document.querySelector('.profile-dashboard-shell__mobile-bar button')?.getAttribute('aria-expanded'), focusedInDrawer: Boolean(document.activeElement?.closest('#profile-dashboard-sidebar')) }))()`);
    await page.pressKey('Escape');
    await page.waitFor(`document.querySelector('.profile-dashboard-shell__mobile-bar button')?.getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector('.profile-dashboard-shell__mobile-bar button')`, 'mobile menu Escape focus restoration');
    await capture('06-mobile-dashboard-menu');
    return { closed, opened };
  });

  await step('reduced-motion media query is honored', async () => {
    await page.setReducedMotion(true);
    const reduced = await page.waitFor(`matchMedia('(prefers-reduced-motion: reduce)').matches`, 'reduced-motion media query');
    assert(reduced, 'Chromium did not report prefers-reduced-motion: reduce.');
    return { reducedMotionMatches: reduced };
  });

  await step('canonical public profile direct refresh', async () => {
    await page.setReducedMotion(false);
    await page.setViewport(1440, 900);
    const canonicalUrl = `${appUrl}/${canonicalUsername}`;
    await page.navigate(canonicalUrl, 'canonical public profile');
    await page.waitFor(`document.querySelector('.profile-shell-page') && document.querySelector('.profile-shell-page .identity-card')`, 'public profile canvas');
    await page.command('Page.reload', { ignoreCache: true });
    await delay(350);
    await page.waitFor(`document.querySelector('.profile-shell-page') && document.querySelector('.profile-shell-page .identity-card')`, 'public profile after direct refresh');
    const state = await page.evaluate(`(() => {
      const pageElement = document.querySelector('.profile-shell-page');
      const card = document.querySelector('.profile-shell-page .identity-card');
      const roll = document.querySelector('.profile-shell-page [data-profile-region="roll"]');
      const pageStyle = getComputedStyle(pageElement);
      const cardStyle = getComputedStyle(card);
      const rollStyle = roll ? getComputedStyle(roll) : null;
      return {
        path: location.pathname,
        username: document.querySelector('.identity-card__handle')?.textContent?.trim() || '',
        canvas: Boolean(pageElement),
        card: Boolean(card),
        roll: Boolean(roll),
        cardBlur: cardStyle.getPropertyValue('--profile-surface-blur').trim(),
        cardBackdropFilter: cardStyle.backdropFilter || cardStyle.webkitBackdropFilter || '',
        pageBlur: pageStyle.getPropertyValue('--profile-surface-blur').trim(),
        rollBlur: rollStyle?.getPropertyValue('--profile-surface-blur').trim() || '',
        pageBackground: pageStyle.backgroundImage || pageStyle.backgroundColor
      };
    })()`);
    assert(state.path === `/${canonicalUsername}`, `Public profile was not canonical after refresh: ${state.path}.`);
    assert(state.canvas && state.card, 'Public profile did not render its canvas and identity card.');
    assert(state.cardBlur, 'Public profile identity card has no surface blur variable.');
    assert(!state.pageBlur && !state.rollBlur, 'Public appearance variables leaked outside the card surface.');
    await capture('07-public-profile');
    return state;
  });
} catch (error) {
  failure = error;
  console.error(`\n[smoke] FAILED: ${error.message}`);
  try {
    if (page) {
      const filename = join(evidenceDir, 'failure.png');
      await page.screenshot(filename);
      results.screenshots.push(filename);
    }
  } catch (screenshotError) {
    console.error(`[smoke] Could not capture failure screenshot: ${screenshotError.message}`);
  }
} finally {
  await writeEvidence();
  await page?.close();
  await terminateProcess(chromium?.child, 'Chromium');
  await terminateProcess(vite?.child, 'Vite');
}

console.log(`\n[smoke] ${results.status.toUpperCase()}`);
console.log(`[smoke] Evidence: ${evidenceDir}`);
console.log(`[smoke] Results: ${join(evidenceDir, 'evidence.json')}`);
for (const screenshot of results.screenshots) console.log(`[smoke] Screenshot: ${screenshot}`);
if (results.account.username) console.log(`[smoke] Local account: ${results.account.username} (${results.account.email})`);
if (failure) process.exitCode = 1;
