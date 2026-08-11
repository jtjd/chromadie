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
  startVitePreview,
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
const smokeMode = process.env.PROFILE_STUDIO_SMOKE_MODE === 'preview' ? 'preview' : 'dev';

const results = {
  status: 'running',
  serverMode: smokeMode,
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

  const startAppServer = smokeMode === 'preview' ? startVitePreview : startVite;
  vite = await startAppServer({ appPort, environment: { url: supabaseUrl.origin, key: environment.key }, evidenceDir });
  chromium = await startChromium({ appUrl, debugPort, evidenceDir, ignoreCertificateErrors: smokeMode === 'preview' });
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

  await step('compiled homepage keeps its phone layout', async () => {
    await page.setViewport(402, 874);
    await page.waitFor(`document.querySelector('.home-hero__intro') && document.querySelector('.home-hero__stage')`, 'homepage phone layout');
    const state = await page.evaluate(`(() => {
      const select = selector => document.querySelector(selector);
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
      };
      const nav = select('.site-mode-header__nav');
      const right = select('.site-mode-header__right');
      const mobileMenu = select('.site-mode-header__mobile-menu');
      const intro = select('.home-hero__intro');
      const stage = select('.home-hero__stage');
      const title = select('#home-title');
      const side = select('.home-hero__side');
      const introStyle = getComputedStyle(intro);
      const stageStyle = getComputedStyle(stage);
      const titleBox = rect(title);
      const sideBox = rect(side);
      return {
        headerNav: nav ? getComputedStyle(nav).display : '',
        headerRight: right ? getComputedStyle(right).display : '',
        mobileMenu: mobileMenu ? getComputedStyle(mobileMenu).display : '',
        introColumns: introStyle.gridTemplateColumns,
        stageColumns: stageStyle.gridTemplateColumns,
        title: titleBox,
        side: sideBox,
        stacked: Boolean(titleBox && sideBox && sideBox.top >= titleBox.bottom - 1),
        contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(state.headerNav === 'none' && state.headerRight === 'none' && state.mobileMenu !== 'none', `Production header did not switch to its mobile state: ${JSON.stringify(state)}.`);
    assert(state.introColumns.split(' ').length === 1 && state.stageColumns.split(' ').length === 1, `Production homepage retained multi-column phone geometry: ${JSON.stringify(state)}.`);
    assert(state.stacked && state.contained, `Production homepage phone layout is not contained: ${JSON.stringify(state)}.`);
    await capture('01-homepage-mobile');
    await page.setViewport(1440, 1000);
    return state;
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
    if (smokeMode === 'preview') {
      await page.waitFor(`(() => {
        const response = document.querySelector('[name="cf-turnstile-response"]');
        return Boolean(response?.value);
      })()`, 'production Turnstile test token', 30000);
    }
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
    // This navigation intentionally redirects away from the requested auth
    // URL, so wait on the destination rather than the source URL prefix.
    await page.command('Page.navigate', { url: `${appUrl}/login?next=%2Fprofile%2Fsettings` });
    await page.waitFor(`location.pathname === '/profile/settings' && document.querySelector('.profile-settings-page') && !document.querySelector('.auth-page')`, 'authenticated auth-route redirect', 30000);
    // Let the first authenticated hydration settle before the next step
    // deliberately performs a direct refresh. This keeps local Supabase auth
    // token propagation from racing the refresh assertion in CI.
    await page.waitFor('document.querySelector(".profile-dashboard-shell__owner")', 'authenticated Profile Studio shell', 30000);
    const state = await page.evaluate(`(() => ({ path: location.pathname, settings: Boolean(document.querySelector('.profile-settings-page')), authPage: Boolean(document.querySelector('.auth-page')), overlay: Boolean(document.querySelector('.auth-modal-overlay')) }))()`);
    assert(state.path === '/profile/settings', `Safe auth redirect landed on ${state.path}.`);
    assert(state.settings && !state.authPage && !state.overlay, 'Authenticated auth route left an auth page or overlay mounted.');
    return state;
  });

  await step('direct-refresh authenticated Profile Studio', async () => {
    await page.navigate(`${appUrl}/profile/settings`, 'authenticated Profile Studio');
    await page.waitFor(`document.querySelector('.profile-settings-page') && document.querySelector('.profile-customize-page') && document.querySelector('.profile-dashboard-shell__owner')`, 'Profile Studio');
    const state = await page.evaluate(`({ path: location.pathname, section: document.querySelector('.profile-dashboard-shell__nav button.active')?.textContent?.trim(), authenticated: Boolean(document.querySelector('.profile-dashboard-shell__owner')), globalHeader: Boolean(document.querySelector('.site-mode-header')) })`);
    assert(state.path === '/profile/settings', `Expected /profile/settings after refresh, got ${state.path}.`);
    assert(state.authenticated, 'Authenticated owner card is missing after Profile Studio refresh.');
    assert(!state.globalHeader, 'Profile Studio mounted the redundant global site header.');
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

  await step('live preview opens on demand and closes cleanly', async () => {
    await page.navigate(`${appUrl}/profile/settings#links`, 'Links section for preview');
    await page.waitFor(`document.querySelector('.profile-links-page') && document.querySelector('.profile-studio-header__toolbar')`, 'Links toolbar');
    const initiallyOpen = await page.evaluate(`Boolean(document.querySelector('.profile-studio-preview'))`);
    assert(!initiallyOpen, 'Live preview should be collapsed when Links opens.');
    await page.clickText('Preview', { description: 'open live preview control' });
    await page.waitFor(`(() => {
      const preview = document.querySelector('.profile-studio-preview');
      const canvas = document.querySelector('.profile-studio-preview .profile-shell-page--preview');
      return Boolean(preview && canvas && !preview.closest('.auth-modal-overlay'));
    })()`, 'on-demand live preview');
    const state = await page.evaluate(`(() => ({
      open: Boolean(document.querySelector('.profile-studio-preview')),
      previewCanvas: Boolean(document.querySelector('.profile-studio-preview .profile-shell-page--preview')),
      authOverlay: Boolean(document.querySelector('.profile-studio-preview')?.closest('.auth-modal-overlay'))
    }))()`);
    await page.click('.profile-studio-preview__close', 'close live preview control');
    await page.waitFor(`!document.querySelector('.profile-studio-preview')`, 'closed live preview');
    return { ...state, closed: true };
  });

  await step('Customize controls publish the configured surface depth', async () => {
    await page.navigate(`${appUrl}/profile/settings#customize-effects`, 'legacy Effects destination');
    await page.waitFor(`document.querySelector('[role="tablist"][aria-label="Customize profile"]') && document.querySelector('.profile-studio-preview .profile-shell-page--preview')`, 'Customize tab workspace and persistent preview');
    await page.waitFor(`document.querySelector('.profile-dashboard-actions')`, 'dashboard profile actions');
    const customizeTabs = await page.evaluate(`[...document.querySelectorAll('[role="tablist"][aria-label="Customize profile"] [role="tab"]')].map(tab => tab.textContent.trim())`);
    assert(JSON.stringify(customizeTabs) === JSON.stringify(['Appearance', 'Media', 'Layout']), `Customize tabs did not collapse Effects into Appearance: ${JSON.stringify(customizeTabs)}.`);
    await page.waitFor(`!document.querySelector('#customize-effects')?.hidden`, 'visual effects inside Appearance');
    await page.click('#profile-customize-tab-media', 'Media customize tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="media"]')?.hidden`, 'visible Media editor');
    await page.waitFor(`(() => {
      const grid = document.querySelector('.profile-expression-editor__compact-grid');
      return Boolean(grid && grid.querySelectorAll('.profile-expression-editor__compact-card, .rich-media-editor__compact-card').length === 4);
    })()`, 'compact media upload rail');
    const mediaRail = await page.evaluate(`(() => {
      const grid = document.querySelector('.profile-expression-editor__compact-grid');
      const cards = [...(grid?.querySelectorAll(':scope > article') || [])];
      const workspace = document.querySelector('.profile-media-workspace');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom), width: Math.round(box.width), height: Math.round(box.height) } : null;
      };
      const cardGeometry = Object.fromEntries(cards.map(card => [card.querySelector('strong')?.textContent?.trim() || '', rect(card)]));
      const options = rect(workspace?.querySelector('.profile-background-treatment'));
      return {
        labels: cards.map(card => card.querySelector('strong')?.textContent?.trim() || ''),
        editable: cards.filter(card => card.querySelector('button[type="button"]')).map(card => card.querySelector('strong')?.textContent?.trim() || ''),
        advancedPresent: Boolean(grid?.parentElement?.querySelector('.profile-expression-editor__advanced')),
        workspace: rect(workspace),
        cardGeometry,
        options
      };
    })()`);
    assert(mediaRail.labels.length === 4, `Compact media rail rendered ${mediaRail.labels.length} cards instead of four.`);
    assert((mediaRail.labels.includes('Avatar') || mediaRail.labels.includes('Profile avatar')) && mediaRail.labels.includes('Background'), 'Compact media rail is missing the core image upload cards.');
    assert((mediaRail.editable.includes('Avatar') || mediaRail.editable.includes('Profile avatar')) && mediaRail.editable.includes('Background'), 'Core media cards are not clickable upload controls.');
    assert(mediaRail.advancedPresent === false, 'Redundant advanced media controls are still visible.');
    const background = mediaRail.cardGeometry.Background;
    const avatar = mediaRail.cardGeometry.Avatar;
    const audio = mediaRail.cardGeometry['Profile audio'];
    const cursor = mediaRail.cardGeometry['Custom cursor'];
    assert(mediaRail.workspace?.width > 0 && mediaRail.workspace?.right >= (mediaRail.options?.right || 0) - 2, `Media workspace overflows its own bounds: ${JSON.stringify(mediaRail)}.`);
    assert(background && avatar && audio && cursor && mediaRail.options, `Media reference geometry is incomplete: ${JSON.stringify(mediaRail)}.`);
    assert(Math.abs(background.top - avatar.top) <= 2 && Math.abs(avatar.top - audio.top) <= 2, `Media top row is not aligned: ${JSON.stringify(mediaRail)}.`);
    assert(background.left < avatar.left && avatar.left < audio.left, `Media top row order is not Background, Avatar, Audio: ${JSON.stringify(mediaRail)}.`);
    assert(cursor.top > background.top && Math.abs(cursor.top - mediaRail.options.top) <= 2 && cursor.left < mediaRail.options.left, `Media second row does not pair Custom cursor with Background options: ${JSON.stringify(mediaRail)}.`);
    await page.evaluate(`document.querySelector('[data-editor-section="media"]')?.scrollIntoView({ block: 'start' })`);
    await capture('04-media-workspace');
    await page.click('#profile-customize-tab-layout', 'Layout customize tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="layout"]')?.hidden`, 'visible Layout editor');
    const layoutState = await page.evaluate(`(() => {
      const editor = document.querySelector('[data-editor-section="layout"]');
      const workspace = document.querySelector('.profile-studio-workspace');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { width: Math.round(box.width), height: Math.round(box.height), top: Math.round(box.top), bottom: Math.round(box.bottom) } : null;
      };
      return { editor: rect(editor), workspace: rect(workspace), viewport: { width: innerWidth, height: innerHeight } };
    })()`);
    assert((layoutState.editor?.width || 0) > 0 && (layoutState.editor?.height || 0) > 0, `Layout editor has no visible geometry: ${JSON.stringify(layoutState)}.`);
    assert((layoutState.workspace?.width || 0) > 0 && (layoutState.workspace?.bottom || 0) <= layoutState.viewport.height + 2, `Layout workspace escapes the viewport: ${JSON.stringify(layoutState)}.`);
    await page.evaluate(`document.querySelector('[data-editor-section="layout"]')?.scrollIntoView({ block: 'start' })`);
    await capture('04-layout-workspace');
    if (smokeMode === 'preview') {
      // The remaining cosmetic fixture setup intentionally uses a Vite dev
      // module import to grant test-only inventory. Production preview must
      // not expose that source path, so its smoke pass continues with the
      // real account defaults after validating the built editor geometry.
      return { layoutState, mediaRail, productionPreview: true };
    }
    await page.click('#profile-customize-tab-appearance', 'Appearance customize tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="appearance"]')?.hidden`, 'visible Appearance editor');
    await page.evaluate(`(async () => {
      const { userInventory } = await import('/src/lib/stores.js');
      userInventory.update(items => [...new Set([...(Array.isArray(items) ? items : []), 'name_font_marker_tag', 'name_material_blueprint_ink', 'name_motion_typewriter_name', 'avatar_effect_ghost_double', 'border_celestial', 'cursor_trail_pixel_wake', 'profile_atmosphere_rain_window', 'profile_atmosphere_silk_folds'])]);
    })()`);
    await page.waitFor(`document.querySelector('#cosmetic-name_font option[value="name_font_marker_tag"]') && document.querySelector('#cosmetic-name_material option[value="name_material_blueprint_ink"]') && document.querySelector('#cosmetic-name_motion option[value="name_motion_typewriter_name"]') && document.querySelector('#cosmetic-avatar-effect option[value="avatar_effect_ghost_double"]') && document.querySelector('#cosmetic-profile-border option[value="border_celestial"]') && document.querySelector('#cosmetic-cursor-trail option[value="cursor_trail_pixel_wake"]') && document.querySelector('#cosmetic-profile-atmosphere option[value="profile_atmosphere_rain_window"]') && document.querySelector('#cosmetic-profile-atmosphere option[value="profile_atmosphere_silk_folds"]')`, 'owned cosmetic preview fixtures');
    await page.waitFor(`document.querySelectorAll('.profile-cosmetics-name-preview .name-effect-canvas').length === 3 && document.querySelectorAll('.profile-cosmetics-name-preview > span').length === 0`, 'composed default name previews');
    const defaultNamePreviewState = await page.evaluate(`(() => ({
      renderers: document.querySelectorAll('.profile-cosmetics-name-preview .name-effect-canvas').length,
      fallbackPreviews: document.querySelectorAll('.profile-cosmetics-name-preview > span').length,
      rendererKeys: [...document.querySelectorAll('.profile-cosmetics-name-preview .name-effect-canvas')].map(node => node.getAttribute('data-name-renderer'))
    }))()`);
    assert(defaultNamePreviewState.renderers === 3 && defaultNamePreviewState.fallbackPreviews === 0 && new Set(defaultNamePreviewState.rendererKeys).size === 1, `Default name previews are not using one composed renderer: ${JSON.stringify(defaultNamePreviewState)}.`);
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-name_font');
      select.value = 'name_font_marker_tag';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`(() => {
      const liveName = document.querySelector('.profile-studio-preview .name-effect-canvas__semantic');
      return liveName?.getAttribute('style')?.includes('Permanent Marker');
    })()`, 'font renderer in live preview');
    const fontCardState = await page.evaluate(`(() => ({
      preview: Boolean(document.querySelector('.profile-cosmetics-name-preview')),
      renderer: Boolean(document.querySelector('.profile-cosmetics-name-preview .name-effect-canvas')),
      selected: document.querySelector('#cosmetic-name_font')?.value || ''
    }))()`);
    assert(fontCardState.preview && fontCardState.renderer, `Font card did not mount the production renderer: ${JSON.stringify(fontCardState)}.`);
    await page.evaluate(`(() => {
      for (const [id, value] of [
        ['cosmetic-name_material', 'name_material_blueprint_ink'],
        ['cosmetic-name_motion', 'name_motion_typewriter_name'],
        ['cosmetic-avatar-effect', 'avatar_effect_ghost_double'],
        ['cosmetic-profile-border', 'border_celestial'],
        ['cosmetic-cursor-trail', 'cursor_trail_pixel_wake'],
        ['cosmetic-profile-atmosphere', 'profile_atmosphere_rain_window']
      ]) {
        const select = document.getElementById(id);
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await page.waitFor(`document.querySelector('#cosmetic-name_material')?.value === 'name_material_blueprint_ink' && document.querySelector('#cosmetic-name_motion')?.value === 'name_motion_typewriter_name' && document.querySelector('#cosmetic-avatar-effect')?.value === 'avatar_effect_ghost_double' && document.querySelector('#cosmetic-profile-border')?.value === 'border_celestial' && document.querySelector('#cosmetic-cursor-trail')?.value === 'cursor_trail_pixel_wake' && document.querySelector('#cosmetic-profile-atmosphere')?.value === 'profile_atmosphere_rain_window' && document.querySelectorAll('.profile-cosmetics-name-preview .name-effect-canvas').length === 3 && document.querySelector('[aria-label="Avatar effect preview"] .avatar-effect--ghost-double') && document.querySelector('[aria-label="Profile border preview"] [data-profile-border="celestial"]') && document.querySelector('[aria-label="Cursor trail preview"] .cursor-trail-layer[data-input-mode="demo"][data-trail-key="pixel-wake"]') && document.querySelector('[aria-label="Profile atmosphere preview"] [data-atmosphere="rain-window"]')`, 'all cosmetic renderers in the fitting room');
    await page.waitFor(`(() => {
      const previews = [...document.querySelectorAll('.profile-cosmetics-name-preview .name-effect-canvas')];
      return previews.length === 3
        && previews[0]?.getAttribute('data-name-font') === 'marker-tag'
        && previews[1]?.getAttribute('data-name-material') === 'blueprint-ink'
        && previews[2]?.getAttribute('data-name-motion') === 'typewriter-name';
    })()`, 'progressive name composition');
    const progressiveNameState = await page.evaluate(`(() => [...document.querySelectorAll('.profile-cosmetics-name-preview .name-effect-canvas')].map(node => ({
      font: node.getAttribute('data-name-font') || '',
      material: node.getAttribute('data-name-material') || '',
      motion: node.getAttribute('data-name-motion') || '',
    })))()`);
    assert(JSON.stringify(progressiveNameState) === JSON.stringify([
      { font: 'marker-tag', material: '', motion: '' },
      { font: 'marker-tag', material: 'blueprint-ink', motion: '' },
      { font: 'marker-tag', material: 'blueprint-ink', motion: 'typewriter-name' }
    ]), `Name controls did not use progressive composition: ${JSON.stringify(progressiveNameState)}.`);
    const nameEffectsLayout = await page.evaluate(`(() => {
      const grid = document.querySelector('.profile-cosmetics-name-grid');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { width: Math.round(box.width), height: Math.round(box.height), top: Math.round(box.top), bottom: Math.round(box.bottom) } : null;
      };
      return {
        labels: [...(grid?.querySelectorAll('label') || [])].map(label => label.textContent?.trim() || ''),
        controls: [...(grid?.querySelectorAll('select') || [])].map(select => rect(select)?.height || 0),
        previews: [...(grid?.querySelectorAll('.profile-cosmetics-name-preview') || [])].map(preview => ({
          box: rect(preview),
          semantic: rect(preview.querySelector('.name-effect-canvas__semantic')),
          fontSize: getComputedStyle(preview.querySelector('.name-effect-canvas__semantic')).fontSize,
          lineHeight: getComputedStyle(preview.querySelector('.name-effect-canvas__semantic')).lineHeight,
          fontFamily: getComputedStyle(preview.querySelector('.name-effect-canvas__semantic')).fontFamily,
          renderer: preview.querySelector('.name-effect-canvas')?.getAttribute('data-name-renderer') || '',
          fallback: rect(preview.querySelector(':scope > span')),
          centerDelta: (() => {
            const box = preview.getBoundingClientRect();
            const content = preview.querySelector('.name-effect-canvas__semantic, :scope > span')?.getBoundingClientRect();
            return content ? Math.round(Math.abs((content.top + content.height / 2) - (box.top + box.height / 2))) : null;
          })()
        })),
        grid: rect(grid)
      };
    })()`);
    assert(JSON.stringify(nameEffectsLayout.labels) === JSON.stringify(['Font', 'Material', 'Motion']), `Name effect labels do not match the compact reference: ${JSON.stringify(nameEffectsLayout)}.`);
    assert(nameEffectsLayout.controls.length === 3 && nameEffectsLayout.controls.every(height => height >= 36 && height <= 44), `Name effect controls are outside the readable compact range: ${JSON.stringify(nameEffectsLayout)}.`);
    assert(nameEffectsLayout.previews.length === 3 && nameEffectsLayout.previews.every(({ box, semantic, centerDelta }) => (box?.height || 0) >= 28 && (semantic?.height || 0) >= 16 && (centerDelta ?? 99) <= 4), `Name effect previews are not centered and bounded: ${JSON.stringify(nameEffectsLayout)}.`);
    assert(new Set(nameEffectsLayout.previews.map(({ fontSize, lineHeight, fontFamily, renderer }) => `${fontSize}/${lineHeight}/${fontFamily}/${renderer}`)).size === 1, `Name effect preview text formatting changes between slots: ${JSON.stringify(nameEffectsLayout)}.`);
    const visualPreviewState = await page.evaluate(`(() => [...document.querySelectorAll('.profile-cosmetics-visual-preview')].map(preview => {
      const stage = preview.querySelector('.shop-preview-area');
      const avatar = preview.querySelector('.avatar-effect');
      const atmosphere = preview.querySelector('.shop-atmosphere-preview');
      const cursorLayer = preview.querySelector('.cursor-trail-layer');
      return {
        label: preview.getAttribute('aria-label') || '',
        stageBackground: stage ? getComputedStyle(stage).backgroundColor : '',
        avatarBackground: avatar ? getComputedStyle(avatar).backgroundColor : '',
        atmosphereBackground: atmosphere ? getComputedStyle(atmosphere).backgroundColor : '',
        cursorInputMode: cursorLayer?.getAttribute('data-input-mode') || '',
        cursorKey: cursorLayer?.getAttribute('data-trail-key') || ''
      };
    }))()`);
    assert(visualPreviewState.length === 4 && visualPreviewState.every(({ stageBackground }) => stageBackground === 'rgba(0, 0, 0, 0)'), `Effect cards inherited a catalog background: ${JSON.stringify(visualPreviewState)}.`);
    assert(visualPreviewState.find(({ label }) => label === 'Avatar effect preview')?.avatarBackground === 'rgba(0, 0, 0, 0)', `Avatar effect preview has an opaque background: ${JSON.stringify(visualPreviewState)}.`);
    assert(visualPreviewState.find(({ label }) => label === 'Profile atmosphere preview')?.atmosphereBackground === 'rgba(0, 0, 0, 0)', `Atmosphere preview has an opaque background: ${JSON.stringify(visualPreviewState)}.`);
    const cursorPreviewState = visualPreviewState.find(({ label }) => label === 'Cursor trail preview');
    assert(cursorPreviewState?.cursorInputMode === 'demo' && cursorPreviewState.cursorKey === 'pixel-wake', `Pixel Wake cursor preview did not mount the production demo renderer: ${JSON.stringify(visualPreviewState)}.`);
    assert((nameEffectsLayout.grid?.height || 0) >= 80 && (nameEffectsLayout.grid?.height || 0) <= 104, `Name effect row is outside the readable compact range: ${JSON.stringify(nameEffectsLayout)}.`);
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-profile-border');
      select.value = 'border_celestial';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`document.querySelector('[aria-label="Profile border preview"] [data-profile-border="celestial"]') && document.querySelector('.profile-studio-preview [data-profile-border="celestial"]')`, 'border renderer in card and live preview');
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-profile-atmosphere');
      select.value = 'profile_atmosphere_rain_window';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`document.querySelector('[aria-label="Profile atmosphere preview"] [data-atmosphere="rain-window"]') && document.querySelector('.profile-studio-preview [data-atmosphere="rain-window"]')`, 'atmosphere renderer in card and live preview');
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-profile-atmosphere');
      select.value = 'profile_atmosphere_silk_folds';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`document.querySelector('[aria-label="Profile atmosphere preview"] [data-atmosphere="silk-folds"]') && document.querySelector('.profile-studio-preview [data-atmosphere="silk-folds"]') && [...document.querySelectorAll('[data-atmosphere="silk-folds"] video')].every(video => video.currentSrc.includes('/atmospheres/silk-folds/'))`, 'atmosphere renderer changes in card and live preview');
    const beforeTabSwitch = await page.evaluate(`(() => {
      const cursorCanvas = document.querySelector('[aria-label="Cursor trail preview"] .cursor-trail-layer canvas');
      const atmosphere = document.querySelector('[aria-label="Profile atmosphere preview"] [data-atmosphere="silk-folds"]');
      const video = atmosphere?.querySelector('video');
      return {
        cursorFrame: cursorCanvas?.toDataURL() || '',
        atmosphereState: atmosphere?.getAttribute('data-atmosphere-state') || '',
        videoTime: video?.currentTime || 0,
        videoPaused: video?.paused ?? true
      };
    })()`);
    await page.click('#profile-customize-tab-media', 'Media tab before animation resume check');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && document.querySelector('[data-editor-section="media"]')?.hidden === false`, 'visible Media during animation resume check');
    await page.click('#profile-customize-tab-layout', 'Layout tab before animation resume check');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && document.querySelector('[data-editor-section="layout"]')?.hidden === false`, 'visible Layout during animation resume check');
    await page.click('#profile-customize-tab-appearance', 'Appearance tab after animation resume check');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && !document.querySelector('#customize-effects')?.hidden`, 'effects after tab switching');
    await page.evaluate(`document.querySelector('#customize-effects')?.scrollIntoView({ block: 'start' })`);
    try {
      await page.waitFor(`document.querySelector('[aria-label="Cursor trail preview"] .cursor-trail-layer[data-input-mode="demo"]') && document.querySelector('[aria-label="Profile atmosphere preview"] [data-atmosphere="silk-folds"][data-atmosphere-state="animated"]')`, 'cosmetic animations resumed after tab switching');
    } catch (error) {
      const animationState = await page.evaluate(`(() => {
        const cursor = document.querySelector('[aria-label="Cursor trail preview"] .cursor-trail-layer');
        const atmospheres = [...document.querySelectorAll('[data-atmosphere="silk-folds"]')].map(node => ({
          state: node.getAttribute('data-atmosphere-state') || '',
          classes: node.className || '',
          video: node.querySelector('video') ? {
            readyState: node.querySelector('video').readyState,
            paused: node.querySelector('video').paused,
            currentTime: node.querySelector('video').currentTime,
            error: node.querySelector('video').error?.message || ''
          } : null
        }));
        return { cursor: cursor ? { className: cursor.className, canvas: Boolean(cursor.querySelector('canvas')) } : null, atmospheres };
      })()`);
      throw new Error(`${error.message} State: ${JSON.stringify(animationState)}`, { cause: error });
    }
    await delay(180);
    const afterTabSwitch = await page.evaluate(`(() => {
      const cursorCanvas = document.querySelector('[aria-label="Cursor trail preview"] .cursor-trail-layer canvas');
      const atmosphere = document.querySelector('[aria-label="Profile atmosphere preview"] [data-atmosphere="silk-folds"]');
      const video = atmosphere?.querySelector('video');
      return {
        cursorFrame: cursorCanvas?.toDataURL() || '',
        atmosphereState: atmosphere?.getAttribute('data-atmosphere-state') || '',
        videoTime: video?.currentTime || 0,
        videoPaused: video?.paused ?? true
      };
    })()`);
    assert(afterTabSwitch.atmosphereState === 'animated' && !afterTabSwitch.videoPaused, `Atmosphere did not resume after tab switching: ${JSON.stringify({ beforeTabSwitch, afterTabSwitch })}.`);
    assert(afterTabSwitch.cursorFrame && afterTabSwitch.cursorFrame !== beforeTabSwitch.cursorFrame, 'Cursor trail demo frame did not advance after tab switching.');
    await capture('05-effects-live-preview');
    await page.evaluate(`(() => {
      for (const id of ['cosmetic-name_font', 'cosmetic-name_material', 'cosmetic-name_motion', 'cosmetic-avatar-effect', 'cosmetic-profile-border', 'cosmetic-cursor-trail', 'cosmetic-profile-atmosphere']) {
        const select = document.getElementById(id);
        select.value = '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelector('[data-editor-section="general"]')?.scrollIntoView({ block: 'start' });
    })()`);
    await page.setInputValue('#profile-bio', 'Live preview draft', ['input']);
    await page.waitFor(`document.querySelector('.profile-studio-preview .identity-card__bio')?.textContent?.trim() === 'Live preview draft'`, 'identity draft in live preview');
    const identityRequestsBefore = page.requestLog.filter(request => request.url.includes('update_my_profile_identity')).length;
    const originalTextColor = await page.evaluate(`document.querySelector('[data-color-role="text"] .appearance-editor__hex')?.value || '#F4F6FB'`);
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', '#12ABEF', ['input']);
    await page.waitFor(`getComputedStyle(document.querySelector('.profile-studio-preview .profile-shell__approved-opening')).getPropertyValue('--profile-text').trim().toUpperCase() === '#12ABEF'`, 'color draft in live preview');
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', originalTextColor, ['input']);
    const originalBackgroundColor = await page.evaluate(`document.querySelector('[data-color-role="background"] .appearance-editor__hex')?.value || '#07080B'`);
    await page.setInputValue('[data-color-role="background"] .appearance-editor__hex', '#123456', ['input']);
    await page.waitFor(`(() => {
      const pageElement = document.querySelector('.profile-studio-preview .profile-shell-page--preview');
      const opening = document.querySelector('.profile-studio-preview .profile-shell__approved-opening');
      return getComputedStyle(opening).getPropertyValue('--profile-background').trim().toUpperCase() === '#123456'
        && getComputedStyle(pageElement).backgroundColor !== 'rgb(18, 52, 86)';
    })()`, 'rounded profile background draft in live preview');
    await page.setInputValue('[data-color-role="background"] .appearance-editor__hex', originalBackgroundColor, ['input']);
    const originalSurfaceColor = await page.evaluate(`document.querySelector('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex')?.value || '#11141B'`);
    const surfacePlacement = await page.evaluate(`({
      inColorMatrix: Boolean(document.querySelector('.appearance-editor__color-grid [data-color-role="surface"]')),
      inSurfaceSection: Boolean(document.querySelector('.appearance-editor__surface-grid [data-color-role="surface"]'))
    })`);
    assert(!surfacePlacement.inColorMatrix && surfacePlacement.inSurfaceSection, `Profile surface color is not grouped with surface depth: ${JSON.stringify(surfacePlacement)}.`);
    await page.setInputValue('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex', '#234567', ['input']);
    await page.waitFor(`getComputedStyle(document.querySelector('.profile-studio-preview .profile-shell__approved-opening')).getPropertyValue('--profile-surface').trim().toUpperCase() === '#234567'`, 'surface color draft in live preview');
    await page.setInputValue('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex', originalSurfaceColor, ['input']);
    const publishRequestsBefore = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2')).length;
    await page.setInputValue('.appearance-editor__surface-grid .appearance-editor__range:nth-child(4) input[type="range"]', 40, ['input']);
    await page.waitFor(`document.querySelector('.appearance-editor__surface-grid .appearance-editor__range:nth-child(4) output')?.textContent?.trim() === '40px'`, 'blur draft value');
    const publishRequestsAfter = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2')).length;
    const identityLayout = await page.evaluate(`(() => {
      const field = selector => document.querySelector(selector)?.closest('.identity-editor__field');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { top: box.top, bottom: box.bottom, height: box.height } : null;
      };
      const bio = rect(field('#profile-bio'));
      // The reference places the behavior row immediately below the second
      // metadata field (Timezone); use the visual checkbox control rather than
      // the offset wrapper when checking the compact identity rhythm.
      const meta = rect(document.querySelector('.identity-editor__grid--meta .identity-editor__field:last-child'));
      const behavior = rect(document.querySelector('.identity-editor__grid--behavior .identity-editor__field'));
      const options = rect(document.querySelector('.identity-editor__options input'));
      return {
        bio,
        meta,
        behavior,
        options,
        behaviorGap: meta && behavior ? behavior.top - meta.bottom : null
      };
    })()`);
    assert(identityLayout.bio && identityLayout.behavior && identityLayout.bio.bottom >= identityLayout.behavior.bottom - 8, `Bio does not reach the behavior row: ${JSON.stringify(identityLayout)}.`);
    assert(identityLayout.options && identityLayout.bio && identityLayout.options.top >= identityLayout.bio.bottom - 8, `Visibility options did not move below Bio: ${JSON.stringify(identityLayout)}.`);
    assert(identityLayout.behaviorGap !== null && identityLayout.behaviorGap <= 20, `Metadata-to-behavior gap is too large: ${JSON.stringify(identityLayout)}.`);
    const draftState = await page.evaluate(`({
      publishDisabled: [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Publish profile')?.disabled ?? null,
      toolbarVisible: Boolean(document.querySelector('.profile-studio-header__toolbar')),
      previewVisible: Boolean(document.querySelector('.profile-studio-preview'))
    })`);
    assert(draftState.publishDisabled === false, 'Changing Customize did not create an unpublished draft.');
    assert(!draftState.toolbarVisible && draftState.previewVisible, 'Customize did not keep its persistent desktop preview beside the tabbed editor.');
    assert(publishRequestsBefore === publishRequestsAfter, 'Changing Customize unexpectedly called the publish RPC.');
    await capture('05-customize-draft-blur');
    await page.clickText('Publish profile', { description: 'publish configured surface depth' });
    await page.waitFor(`document.querySelector('.profile-dashboard-actions__message')?.textContent?.trim() === 'Profile published.'`, 'published profile appearance');
    const publishedState = await page.evaluate(`({
      publishDisabled: [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Publish profile')?.disabled ?? null,
      status: document.querySelector('.profile-dashboard-actions__message')?.textContent?.trim() || ''
    })`);
    const publishRequests = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2')).length;
    const identityRequests = page.requestLog.filter(request => request.url.includes('update_my_profile_identity')).length;
    assert(publishedState.publishDisabled === true, 'Publishing did not clear the dashboard draft state.');
    assert(publishRequests > publishRequestsAfter, 'Publishing the surface depth did not call the configuration RPCs.');
    assert(identityRequests > identityRequestsBefore, 'Publishing an Identity draft did not call the identity RPC.');
    return { draftState, publishedState, identityLayout, publishRequests, identityRequests, mediaRail };
  });

  await step('narrow mobile layout contains the dashboard and restores keyboard focus', async () => {
    await page.setViewport(390, 844);
    await page.waitFor(`document.querySelector('.profile-studio-preview__devices button:nth-child(2)')`, 'live preview device controls');
    await page.click('.profile-studio-preview__devices button:nth-child(2)', 'mobile live preview device');
    await page.waitFor(`document.querySelector('.profile-studio-preview__canvas--mobile .profile-shell-page--preview-mobile[data-preview-device="mobile"]')`, 'bounded mobile live preview');
    const mobilePreview = await page.evaluate(`(() => {
      const phone = document.querySelector('.profile-studio-preview__canvas--mobile .profile-shell-page--preview-mobile');
      const card = phone?.querySelector('.identity-card');
      const name = card?.querySelector('.identity-card__name');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width), height: Math.round(box.height) } : null;
      };
      const phoneRect = rect(phone);
      const overflow = [...(phone?.querySelectorAll('*') || [])]
        .map(element => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0 && (box.right > (phoneRect?.right || 0) + 1 || box.left < (phoneRect?.left || 0) - 1))
        .slice(0, 5)
        .map(({ element, box }) => ({ tag: element.tagName, className: element.className, left: Math.round(box.left), right: Math.round(box.right) }));
      return {
        device: phone?.getAttribute('data-preview-device') || '',
        phone: phoneRect,
        card: rect(card),
        name: rect(name),
        nameScrollWidth: name?.scrollWidth || 0,
        nameClientWidth: name?.clientWidth || 0,
        overflow,
        phoneScrollWidth: phone?.scrollWidth || 0,
        phoneClientWidth: phone?.clientWidth || 0
      };
    })()`);
    assert(mobilePreview.device === 'mobile', `Mobile live preview did not activate: ${JSON.stringify(mobilePreview)}.`);
    assert((mobilePreview.phone?.width || 0) <= 322 && (mobilePreview.card?.width || 0) > 200, `Mobile live preview is not a bounded phone canvas: ${JSON.stringify(mobilePreview)}.`);
    assert(!mobilePreview.overflow.length && mobilePreview.phoneScrollWidth <= mobilePreview.phoneClientWidth + 1 && mobilePreview.nameScrollWidth <= mobilePreview.nameClientWidth + 1, `Mobile live preview has horizontal content overflow: ${JSON.stringify(mobilePreview)}.`);
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
    return { mobilePreview, closed, opened };
  });

  await step('responsive dashboard geometry fits phone, tablet, and narrow desktop widths', async () => {
    await page.pressKey('Escape');
    await page.setViewport(390, 844);
    if (await page.evaluate('Boolean(document.querySelector(".profile-studio-preview__close"))')) {
      await page.click('.profile-studio-preview__close', 'close preview before responsive geometry audit');
      await page.waitFor('!document.querySelector(".profile-studio-preview")', 'closed preview for responsive geometry audit');
    }

    const widths = [320, 360, 390, 414, 480, 520, 524, 544, 576, 600, 768, 1024, 1100, 1280];
    const measurements = [];
    const customizeTabs = ['appearance', 'media', 'layout'];

    for (const width of widths) {
      await page.setViewport(width, width <= 1024 ? 844 : 900);
      await page.waitFor(`document.querySelector('.profile-customize-page') && document.querySelector('.profile-studio-header__customize-tabs')`, `Customize at ${width}px`);
      if (width > 1024) {
        await page.waitFor('document.querySelector(".profile-studio-preview__devices button")', `narrow-desktop preview at ${width}px`);
        await page.click('.profile-studio-preview__devices button:first-child', `desktop preview mode at ${width}px`);
      }
      for (const tab of customizeTabs) {
        await page.click(`#profile-customize-tab-${tab}`, `${tab} tab at ${width}px`);
        await page.waitFor(`document.querySelector('#profile-customize-tab-${tab}')?.getAttribute('aria-selected') === 'true' && document.querySelector('[data-editor-section="${tab === 'appearance' ? 'appearance' : tab}"]')?.hidden === false`, `${tab} panel at ${width}px`);
        const state = await page.evaluate(`(() => {
          const visible = element => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
          };
          const rect = element => {
            const box = element?.getBoundingClientRect();
            return box ? {
              left: Math.round(box.left),
              right: Math.round(box.right),
              top: Math.round(box.top),
              bottom: Math.round(box.bottom),
              width: Math.round(box.width),
              height: Math.round(box.height)
            } : null;
          };
          const sidebar = document.querySelector('.profile-dashboard-shell__sidebar');
          const inClosedSidebar = element => element.closest('.profile-dashboard-shell__sidebar') && (sidebar?.hasAttribute('inert') || sidebar?.getAttribute('aria-hidden') === 'true');
          const candidates = [...document.querySelectorAll('.profile-studio-header__customize-tabs, .profile-studio-header__customize-tabs [role="tab"], .profile-dashboard-actions, [data-editor-section]:not([hidden]), input, select, textarea, [role="slider"]')]
            .filter(element => visible(element) && !inClosedSidebar(element));
          const overflow = candidates
            .map(element => ({ element, box: element.getBoundingClientRect() }))
            .filter(({ box }) => box.left < -1 || box.right > innerWidth + 1)
            .slice(0, 8)
            .map(({ element, box }) => ({ selector: element.className || element.tagName, tag: element.tagName, type: element.getAttribute('type') || '', aria: element.getAttribute('aria-label') || '', parent: element.parentElement?.className || '', left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) }));
          const activePanel = document.querySelector('[data-editor-section="${tab === 'appearance' ? 'appearance' : tab}"]');
          const preview = document.querySelector('.profile-dashboard-shell__preview');
          const previewBox = preview?.getBoundingClientRect();
          const activeBox = activePanel?.getBoundingClientRect();
          const previewCanvas = preview?.querySelector('.profile-studio-preview__canvas');
          const previewCard = preview?.querySelector('.profile-shell-page--preview .identity-card');
          const previewCopy = previewCard?.querySelector('.identity-card__copy');
          const previewCanvasBox = previewCanvas?.getBoundingClientRect();
          const previewCardBox = previewCard?.getBoundingClientRect();
          const visualGrid = document.querySelector('.profile-cosmetics-visual-grid');
          const visualCards = [...(visualGrid?.querySelectorAll(':scope > .profile-cosmetics-slot') || [])];
          const namePreview = document.querySelector('.profile-cosmetics-name-preview');
          const cosmeticsSurface = document.querySelector('.profile-cosmetics-surface--compact');
          const cosmeticsControls = document.querySelector('.profile-cosmetics-surface--compact .profile-cosmetics-controls');
          const nameGrid = document.querySelector('.profile-cosmetics-name-grid');
          const pageWidth = document.documentElement.scrollWidth;
          const bodyWidth = document.body.scrollWidth;
          return {
            viewport: innerWidth,
            pageWidth,
            bodyWidth,
            contained: pageWidth <= innerWidth + 1 && bodyWidth <= innerWidth + 1,
            overflow,
            tablist: rect(document.querySelector('.profile-studio-header__tablist')),
            tabs: [...document.querySelectorAll('.profile-studio-header__tablist [role="tab"]')].map(rect),
            actions: rect(document.querySelector('.profile-dashboard-actions')),
            activePanel: rect(activePanel),
            panelBottom: activePanel ? Math.round(activePanel.getBoundingClientRect().bottom) : null,
            preview: rect(preview),
            previewOverlap: Boolean(previewBox && activeBox && activeBox.right > previewBox.left + 1 && activeBox.left < previewBox.right - 1 && activeBox.bottom > previewBox.top + 1 && activeBox.top < previewBox.bottom - 1),
            previewLayout: previewCard && previewCanvas ? {
              display: getComputedStyle(previewCard).display,
              canvasWidth: Math.round(previewCanvasBox?.width || 0),
              cardWidth: Math.round(previewCardBox?.width || 0),
              cardScrollWidth: previewCard.scrollWidth,
              cardClientWidth: previewCard.clientWidth,
              copyScrollWidth: previewCopy?.scrollWidth || 0,
              copyClientWidth: previewCopy?.clientWidth || 0
            } : null,
            effects: visualGrid ? {
              columns: new Set(visualCards.map(card => Math.round(card.getBoundingClientRect().left))).size,
              cardWidths: visualCards.map(card => Math.round(card.getBoundingClientRect().width)),
              cardBoxes: visualCards.map(card => rect(card)),
              namePreviewPosition: namePreview ? getComputedStyle(namePreview).position : '',
              gridStyle: {
                columns: getComputedStyle(visualGrid).gridTemplateColumns,
                rows: getComputedStyle(visualGrid).gridTemplateRows,
                autoFlow: getComputedStyle(visualGrid).gridAutoFlow,
                justifyItems: getComputedStyle(visualGrid).justifyItems
              },
              gridBox: rect(visualGrid),
              surfaceBox: rect(cosmeticsSurface),
              controlsBox: rect(cosmeticsControls),
              nameGridBox: rect(nameGrid)
            } : null
          };
        })()`);
        assert(state.contained && !state.overflow.length, `Dashboard overflows at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        assert(state.tabs.length === 3 && state.tabs.every(tabRect => tabRect && tabRect.left >= -1 && tabRect.right <= width + 1), `Customize tabs escape the viewport at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        assert((state.activePanel?.width || 0) > 0, `Customize panel has no width at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        assert(!state.previewOverlap, `Live preview overlaps the editor at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        if (tab === 'appearance' && width === 524) {
          assert(state.effects?.columns === 2 && state.effects.cardWidths.every(cardWidth => cardWidth >= 140) && state.effects.namePreviewPosition === 'static', `Visual Effects remains compressed at the 524px breakpoint: ${JSON.stringify(state.effects)}.`);
        }
        if (tab === 'appearance' && width === 390) {
          assert(state.effects?.columns === 1 && state.effects.cardWidths.every(cardWidth => cardWidth >= 260), `Visual Effects did not switch to readable phone rows at 390px: ${JSON.stringify(state.effects)}.`);
        }
        if (width > 1024) {
          assert(state.previewLayout?.display === 'flex' && state.previewLayout.cardWidth <= state.previewLayout.canvasWidth + 1 && state.previewLayout.cardScrollWidth <= state.previewLayout.cardClientWidth + 1 && state.previewLayout.copyScrollWidth <= state.previewLayout.copyClientWidth + 1, `Narrow desktop preview card is not readable at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        }
        if (width === 1100 && tab === 'appearance') await capture('08-responsive-narrow-desktop');
        measurements.push({ width, tab, ...state });
      }
    }

    await page.setViewport(414, 896);
    await page.click('#profile-customize-tab-appearance', 'Appearance before narrow mobile drawer audit');
    await page.waitFor('document.querySelector(".profile-customize-page")', 'Appearance at 414px');
    await page.click('.profile-dashboard-shell__mobile-bar button', 'open narrow mobile drawer');
    await page.waitFor('document.querySelector(".profile-dashboard-shell__sidebar.is-open")', 'open narrow mobile drawer state');
    await delay(240);
    const drawer = await page.evaluate(`(() => {
      const sidebar = document.querySelector('.profile-dashboard-shell__sidebar.is-open');
      const rect = sidebar?.getBoundingClientRect();
      const visibleButtons = [...(sidebar?.querySelectorAll('button') || [])].filter(button => getComputedStyle(button).display !== 'none' && button.getBoundingClientRect().height > 0);
      return {
        viewport: innerWidth,
        left: rect ? Math.round(rect.left) : null,
        right: rect ? Math.round(rect.right) : null,
        width: rect ? Math.round(rect.width) : null,
        buttons: visibleButtons.length,
        contained: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1)
      };
    })()`);
    assert(drawer.contained && drawer.buttons >= 4, `Narrow mobile drawer is not usable at 414px: ${JSON.stringify(drawer)}.`);
    await page.pressKey('Escape');
    await page.waitFor('document.querySelector(".profile-dashboard-shell__sidebar")?.getAttribute("aria-hidden") === "true"', 'close narrow mobile drawer');

    await page.setViewport(600, 844);
    await page.waitFor(`matchMedia('(max-width: 64rem)').matches && document.querySelector('.profile-dashboard-shell__mobile-preview')`, 'tablet mobile viewport state');
    if (await page.evaluate('Boolean(document.querySelector(".profile-studio-preview"))')) {
      await page.click('.profile-studio-preview__close', 'close preview before tablet preview drawer audit');
      await page.waitFor('!document.querySelector(".profile-studio-preview")', 'closed preview before tablet preview drawer audit');
    }
    await page.click('#profile-customize-tab-appearance', 'Appearance before preview drawer audit');
    await page.waitFor('document.querySelector(".profile-dashboard-shell__mobile-preview")', 'mobile preview toggle');
    await page.click('.profile-dashboard-shell__mobile-preview', 'open tablet preview drawer');
    await delay(100);
    const tabletToggle = await page.evaluate(`(() => {
      const button = document.querySelector('.profile-dashboard-shell__mobile-preview');
      return {
        ariaExpanded: button?.getAttribute('aria-expanded') || '',
        text: button?.textContent?.trim() || '',
        disabled: Boolean(button?.disabled),
        outerHTML: button?.outerHTML || '',
        activeSection: document.querySelector('.profile-dashboard-shell__nav button.active')?.getAttribute('data-section') || '',
        selectedTab: document.querySelector('.profile-studio-header__tablist [role="tab"][aria-selected="true"]')?.id || '',
        customizePanel: Boolean(document.querySelector('#profile-customize-tabpanel')),
        preview: Boolean(document.querySelector('.profile-studio-preview'))
      };
    })()`);
    assert(tabletToggle.ariaExpanded === 'true', `Tablet preview toggle did not open: ${JSON.stringify(tabletToggle)}.`);
    await page.waitFor('document.querySelector(".profile-studio-preview")', 'tablet preview drawer');
    await delay(240);
    const tabletPreview = await page.evaluate(`(() => {
      const preview = document.querySelector('.profile-dashboard-shell__preview');
      const box = preview?.getBoundingClientRect();
      return {
        viewport: innerWidth,
        left: box ? Math.round(box.left) : null,
        right: box ? Math.round(box.right) : null,
        top: box ? Math.round(box.top) : null,
        bottom: box ? Math.round(box.bottom) : null,
        width: box ? Math.round(box.width) : null,
        height: box ? Math.round(box.height) : null,
        contained: Boolean(box && box.left >= -1 && box.right <= innerWidth + 1 && box.top >= -1 && box.bottom <= innerHeight + 1),
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(tabletPreview.contained && tabletPreview.pageContained, `Tablet live preview escapes its drawer bounds: ${JSON.stringify(tabletPreview)}.`);
    await page.click('.profile-studio-preview__close', 'close tablet preview drawer');
    await page.waitFor('!document.querySelector(".profile-studio-preview")', 'closed tablet preview drawer');

    await page.setViewport(414, 896);
    await page.waitFor('document.querySelector(".profile-dashboard-shell__mobile-preview")', 'phone preview toggle');
    await page.click('.profile-dashboard-shell__mobile-preview', 'open phone preview drawer');
    await page.waitFor('document.querySelector(".profile-studio-preview")', 'phone preview drawer');
    await delay(240);
    const phonePreview = await page.evaluate(`(() => {
      const preview = document.querySelector('.profile-dashboard-shell__preview');
      const previewBox = preview?.getBoundingClientRect();
      const canvas = preview?.querySelector('.profile-studio-preview__canvas');
      const card = preview?.querySelector('.profile-shell-page--preview .identity-card');
      const copy = card?.querySelector('.identity-card__copy');
      const sidebar = document.querySelector('.profile-dashboard-shell__sidebar');
      return {
        viewport: innerWidth,
        preview: previewBox ? { left: Math.round(previewBox.left), right: Math.round(previewBox.right), top: Math.round(previewBox.top), bottom: Math.round(previewBox.bottom), width: Math.round(previewBox.width), height: Math.round(previewBox.height) } : null,
        card: card ? { display: getComputedStyle(card).display, width: Math.round(card.getBoundingClientRect().width), scrollWidth: card.scrollWidth, clientWidth: card.clientWidth } : null,
        canvasWidth: Math.round(canvas?.getBoundingClientRect().width || 0),
        copy: copy ? { scrollWidth: copy.scrollWidth, clientWidth: copy.clientWidth } : null,
        sidebarHidden: sidebar?.getAttribute('aria-hidden') === 'true' && sidebar?.hasAttribute('inert'),
        contained: Boolean(previewBox && previewBox.left >= -1 && previewBox.right <= innerWidth + 1 && previewBox.top >= -1 && previewBox.bottom <= innerHeight + 1),
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(phonePreview.contained && phonePreview.pageContained && phonePreview.sidebarHidden && phonePreview.card?.display === 'flex' && phonePreview.card.width <= phonePreview.canvasWidth + 1 && phonePreview.card.scrollWidth <= phonePreview.card.clientWidth + 1 && phonePreview.copy?.scrollWidth <= phonePreview.copy.clientWidth + 1, `Phone live preview is not a readable bounded drawer: ${JSON.stringify(phonePreview)}.`);
    await capture('09-mobile-preview-414');
    await page.click('.profile-studio-preview__close', 'close phone preview drawer');
    await page.waitFor('!document.querySelector(".profile-studio-preview")', 'closed phone preview drawer');

    await page.evaluate(`document.querySelector('#customize-identity')?.scrollIntoView({ block: 'start' })`);
    await page.waitFor('document.querySelector("#customize-identity .identity-editor--studio #profile-username")', 'mobile identity editor');
    const mobileEditor = await page.evaluate(`(() => {
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom), width: Math.round(box.width), height: Math.round(box.height) } : null;
      };
      const fields = [...document.querySelectorAll('#customize-identity .identity-editor--studio .identity-editor__field')];
      const fieldGeometry = fields.map(field => ({
        label: field.querySelector(':scope > span')?.textContent?.trim() || '',
        box: rect(field),
        control: rect(field.querySelector('input, textarea, select'))
      }));
      const overlaps = fieldGeometry.flatMap((current, index) => fieldGeometry.slice(index + 1).filter(next => current.box && next.box && current.box.top < next.box.bottom - 1 && next.box.top < current.box.bottom - 1).map(next => [current.label, next.label]));
      const outOfBounds = fieldGeometry.filter(({ box, control }) => [box, control].some(item => item && (item.left < -1 || item.right > innerWidth + 1)));
      const shell = document.querySelector('.profile-dashboard-shell');
      const tabs = [...document.querySelectorAll('.profile-studio-header__tablist [role="tab"]')].map(rect);
      const actions = rect(document.querySelector('.profile-dashboard-actions'));
      return {
        viewport: innerWidth,
        mobileClass: shell?.classList.contains('profile-dashboard-shell--mobile'),
        fieldGeometry,
        overlaps,
        outOfBounds,
        tabs,
        actions,
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(mobileEditor.mobileClass && mobileEditor.fieldGeometry.length >= 6 && !mobileEditor.overlaps.length && !mobileEditor.outOfBounds.length && mobileEditor.tabs.length === 3 && mobileEditor.tabs.every(tab => tab && tab.left >= -1 && tab.right <= 415), `Mobile editor is still using desktop geometry at 414px: ${JSON.stringify(mobileEditor)}.`);
    assert(mobileEditor.pageContained && (mobileEditor.actions?.right || 0) <= 415, `Mobile editor or actions escape the 414px composition: ${JSON.stringify(mobileEditor)}.`);
    await capture('10-mobile-editor-414');

    const stickyTabs = await page.evaluate(`(() => {
      const tabbar = document.querySelector('.profile-studio-header__customize-tabs');
      const tabs = [...document.querySelectorAll('.profile-studio-header__tablist [role="tab"]')];
      const box = tabbar?.getBoundingClientRect();
      return {
        position: tabbar ? getComputedStyle(tabbar).position : '',
        top: box ? Math.round(box.top) : null,
        labels: tabs.map(tab => tab.textContent.trim())
      };
    })()`);
    assert(stickyTabs.position === 'sticky' && (stickyTabs.top || 0) >= 0 && stickyTabs.labels.join('|') === 'Appearance|Media|Layout', `Persistent mobile customize tabs are not reachable while scrolling: ${JSON.stringify(stickyTabs)}.`);

    const destinationWidths = [320, 600, 768];
    const destinations = ['overview', 'links', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'progression', 'account'];
    const destinationMeasurements = [];
    for (const width of destinationWidths) {
      await page.setViewport(width, 844);
      for (const destination of destinations) {
        await page.navigate(`${appUrl}/profile/settings#${destination}`, `${destination} at ${width}px`);
        await page.waitFor(`document.querySelector('.profile-dashboard-shell__nav button.active[data-section="${destination}"]') && document.querySelector('.profile-studio-workspace')`, `${destination} destination at ${width}px`, 30000);
        await delay(80);
        const state = await page.evaluate(`(() => {
          const visible = element => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
          };
          const sidebar = document.querySelector('.profile-dashboard-shell__sidebar');
          const inClosedSidebar = element => element.closest('.profile-dashboard-shell__sidebar') && (sidebar?.hasAttribute('inert') || sidebar?.getAttribute('aria-hidden') === 'true');
          const workspace = document.querySelector('.profile-studio-workspace');
          const box = workspace?.getBoundingClientRect();
          const overflow = [...document.querySelectorAll('.profile-studio-workspace, .profile-studio-workspace *')]
            .filter(element => visible(element) && !inClosedSidebar(element))
            .map(element => ({ element, box: element.getBoundingClientRect() }))
            .filter(({ box }) => box.left < -1 || box.right > innerWidth + 1)
            .slice(0, 8)
            .map(({ element, box }) => ({ selector: element.className || element.tagName, left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) }));
          return {
            viewport: innerWidth,
            pageWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1,
            workspace: box ? { left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width), height: Math.round(box.height) } : null,
            destination: workspace?.getAttribute('data-section-destination') || '',
            overflow
          };
        })()`);
        assert(state.contained && !state.overflow.length, `Dashboard destination overflows at ${width}px on ${destination}: ${JSON.stringify(state)}.`);
        assert((state.workspace?.width || 0) > 0 && (state.workspace?.right || 0) <= width + 1, `Dashboard destination is not bounded at ${width}px on ${destination}: ${JSON.stringify(state)}.`);
        destinationMeasurements.push({ width, destination, ...state });
      }
    }

    return { widths, measurements, drawer, tabletToggle, tabletPreview, phonePreview, destinationMeasurements };
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
    // Paint a high-frequency pattern on the page background itself so the
    // visual smoke test exercises the real backdrop-filter source boundary.
    await page.evaluate(`document.querySelector('.profile-shell-page')?.style.setProperty('background', 'repeating-linear-gradient(90deg, #ff5577 0 5px, #5577ff 5px 10px)')`);
    await delay(100);
    const state = await page.evaluate(`(() => {
      const pageElement = document.querySelector('.profile-shell-page');
      const card = document.querySelector('.profile-shell-page .identity-card');
      const surfaceBackdrop = document.querySelector('.profile-shell-page .profile-shell__surface-backdrop');
      const roll = document.querySelector('.profile-shell-page [data-profile-region="roll"]');
      const pageStyle = getComputedStyle(pageElement);
      const cardStyle = getComputedStyle(card);
      const surfaceBackdropStyle = surfaceBackdrop ? getComputedStyle(surfaceBackdrop) : null;
      const rollStyle = roll ? getComputedStyle(roll) : null;
      return {
        path: location.pathname,
        username: document.querySelector('.identity-card__handle')?.textContent?.trim() || '',
        canvas: Boolean(pageElement),
        card: Boolean(card),
        roll: Boolean(roll),
        cardBlur: cardStyle.getPropertyValue('--profile-surface-blur').trim(),
        cardBackdropFilter: cardStyle.backdropFilter || cardStyle.webkitBackdropFilter || '',
        surfaceBackdrop: Boolean(surfaceBackdrop),
        surfaceBackdropFilter: surfaceBackdropStyle?.backdropFilter || surfaceBackdropStyle?.webkitBackdropFilter || '',
        pageBlur: pageStyle.getPropertyValue('--profile-surface-blur').trim(),
        rollBlur: rollStyle?.getPropertyValue('--profile-surface-blur').trim() || '',
        pageBackground: pageStyle.backgroundImage || pageStyle.backgroundColor,
        pageMediaImage: Boolean(document.querySelector('.profile-shell__media-image'))
      };
    })()`);
    assert(state.path === `/${canonicalUsername}`, `Public profile was not canonical after refresh: ${state.path}.`);
    assert(state.canvas && state.card && state.surfaceBackdrop, 'Public profile did not render its canvas, card, and card backdrop.');
    const expectedCardBlur = smokeMode === 'preview' ? '20px' : '40px';
    assert(state.cardBlur === expectedCardBlur, `Public profile identity card did not honor the expected max blur: ${state.cardBlur} (expected ${expectedCardBlur}).`);
    assert(state.surfaceBackdropFilter.includes('blur('), 'Public profile card backdrop has no computed blur filter.');
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
