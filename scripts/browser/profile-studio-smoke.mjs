#!/usr/bin/env node

import { mkdtemp, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import {
  assertLocalSupabaseUrl,
  defaultAppPort,
  defaultDebugPort,
  findAvailablePort,
  loadLocalEnvironment,
  startChromium,
  startPagesDev,
  startVite,
  startVitePreview,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';
import { isReservedRouteSegment } from '../../src/lib/routeContract.js';
import { isProtectedUsername } from '../../src/lib/usernamePolicy.js';
import { RICH_PROFILE_FIXTURE } from './profile-rich-fixture.mjs';
import { createSupabaseHeaders, getSupabaseCredentials } from '../../functions/_supabaseApi.js';

const environment = await loadLocalEnvironment();
const execFileAsync = promisify(execFile);

// Keep environment parsing private to the harness API while making this script
// fail early and clearly if somebody runs it against a deployed project.
if (!environment?.url || !environment?.key) {
  throw new Error('Local smoke requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (legacy VITE_SUPABASE_KEY is accepted during migration).');
}
const supabaseUrl = assertLocalSupabaseUrl(environment.url);
const evidenceDir = await mkdtemp(join(tmpdir(), 'chromadie-profile-studio-smoke-'));
const smokeMode = process.env.PROFILE_STUDIO_SMOKE_MODE === 'preview' ? 'preview' : 'dev';
const smokeServer = process.env.PROFILE_STUDIO_SMOKE_SERVER || 'vite';
const skipMediaMutation = process.env.PROFILE_STUDIO_SMOKE_SKIP_MEDIA === '1';
const localIntegrationTest = process.env.VITE_LOCAL_INTEGRATION_TEST === 'true';
const approvedEffectSmoke = process.env.PROFILE_STUDIO_SMOKE_EFFECTS === 'approved';
const activeEffectFixture = approvedEffectSmoke
  ? {
      ...RICH_PROFILE_FIXTURE,
      effects: {
        ...RICH_PROFILE_FIXTURE.effects,
        nameMotion: 'name_motion_kinetic_echo',
        avatar: 'avatar_effect_butterfly_orbit',
        border: 'border_elastic',
        atmosphere: 'profile_atmosphere_prism_dust',
        cursor: 'cursor_trail_plasma_swarm',
        profileMotion: 'profile_motion_halo_offset'
      }
    }
  : RICH_PROFILE_FIXTURE;

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
let appUrl = '';
let canonicalUsername = '';
let localServiceRoleKey = '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expressionMediaReference(expression, kind, legacyPathKey) {
  const reference = expression?.media_references?.[kind];
  if (reference?.storage_provider === 'r2' && reference.r2_public_key) return reference.r2_public_key;
  const legacyPath = expression?.[legacyPathKey];
  return legacyPath && !/\/storage\/v1\//.test(String(legacyPath)) ? legacyPath : null;
}

function stableProfileMediaRequests() {
  return page.requestLog.filter(entry => {
    if (entry.method !== 'GET') return false;
    try {
      const parsed = new URL(entry.url);
      return parsed.hostname === 'media.chm.lol'
        || parsed.hostname.endsWith('.r2.cloudflarestorage.com');
    } catch {
      return false;
    }
  });
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

async function captureRegion(name, selector) {
  const box = await page.evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    const rect = element?.getBoundingClientRect();
    return rect && rect.width > 0 && rect.height > 0
      ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      : null;
  })()`);
  assert(box, `Could not capture visible region ${selector}.`);
  const result = await page.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
    clip: { ...box, scale: 1 }
  });
  const path = join(evidenceDir, `${name}.png`);
  await writeFile(path, Buffer.from(result.data, 'base64'));
  results.screenshots.push(path);
  return path;
}

async function uploadGeneratedImage(selector, { width, height, filename, kind }) {
  return page.evaluate(`(async () => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) throw new Error('Could not find the ' + ${JSON.stringify(kind)} + ' upload input.');
    const canvas = document.createElement('canvas');
    canvas.width = ${Number(width)};
    canvas.height = ${Number(height)};
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1b1038');
    gradient.addColorStop(.48, '#0a6d7a');
    gradient.addColorStop(1, '#f08a5d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = .7;
    for (let x = -canvas.height; x < canvas.width + canvas.height; x += 31) {
      context.fillStyle = x % 62 ? '#cdd2ff' : '#0b1020';
      context.fillRect(x, 0, 13, canvas.height);
    }
    context.globalAlpha = 1;
    context.fillStyle = '#ffffff';
    context.font = '700 ' + Math.max(14, Math.round(Math.min(canvas.width, canvas.height) / 7)) + 'px sans-serif';
    context.fillText(${JSON.stringify(kind.toUpperCase())}, Math.max(8, canvas.width * .06), Math.max(24, canvas.height * .24));
    const blob = await (await fetch(canvas.toDataURL('image/png'))).blob();
    const file = new File([blob], ${JSON.stringify(filename)}, { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { width: canvas.width, height: canvas.height, filename: file.name, bytes: file.size };
  })()`);
}

async function getLocalServiceRoleKey() {
  if (localServiceRoleKey) return localServiceRoleKey;
  const configuredKey = getSupabaseCredentials(process.env).secretKey;
  if (configuredKey) {
    localServiceRoleKey = configuredKey;
    return localServiceRoleKey;
  }
  try {
    const { stdout } = await execFileAsync('supabase', ['status', '-o', 'env'], {
      cwd: process.cwd(),
      maxBuffer: 256 * 1024
    });
    const match = String(stdout).match(/^SERVICE_ROLE_KEY=(.+)$/m);
    localServiceRoleKey = match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    return localServiceRoleKey;
  } catch {
    return '';
  }
}

async function serviceRest(path, { method = 'GET', body, headers = {} } = {}) {
  const serviceRoleKey = await getLocalServiceRoleKey();
  assert(serviceRoleKey, 'The local Supabase service role key is required to seed the deterministic rich browser fixture.');
  const response = await fetch(`${supabaseUrl.origin}${path}`, {
    method,
    headers: {
      ...createSupabaseHeaders({
        apiKey: serviceRoleKey,
        projectKeyIsLegacy: !serviceRoleKey.startsWith('sb_secret_'),
        contentType: true
      }),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  assert(response.ok, `Local fixture service request ${method} ${path} failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
  return parsed;
}

async function callAuthenticatedRpc(functionName, args = {}) {
  const result = await page.evaluate(`(async () => {
    const session = Object.values(localStorage)
      .map(value => {
        try { return JSON.parse(value); } catch { return null; }
      })
      .find(value => value?.access_token && value?.user?.id);
    if (!session) return { status: 0, body: { error: 'Authenticated browser session not found.' } };
    const response = await fetch(${JSON.stringify(`${supabaseUrl.origin}/rest/v1/rpc/${functionName}`)}, {
      method: 'POST',
      headers: {
        apikey: ${JSON.stringify(environment.key)},
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(${JSON.stringify(args)})
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, body };
  })()`);
  assert(result?.status >= 200 && result?.status < 300, `Authenticated ${functionName} RPC failed with HTTP ${result?.status}: ${JSON.stringify(result?.body)}`);
  return result.body;
}

async function seedRichProfileFixture() {
  const sessionState = await page.evaluate(`(() => {
    const candidate = Object.values(localStorage)
      .map(value => { try { return JSON.parse(value); } catch { return null; } })
      .find(value => value?.access_token && value?.user?.id);
    return {
      userId: typeof candidate?.user?.id === 'string' ? candidate.user.id : '',
      userIdType: typeof candidate?.user?.id,
      storageKeys: Object.keys(localStorage)
    };
  })()`);
  const session = sessionState?.userId || '';
  assert(/^[0-9a-f-]{36}$/i.test(session), `Could not resolve the disposable smoke account id: ${JSON.stringify(sessionState)}.`);

  // The browser still performs the real equip_item RPC. The local service
  // role only supplies ownership to this disposable account so the smoke
  // test exercises the same entitlement boundary as a real earned cosmetic.
  await serviceRest(`/rest/v1/inventory?on_conflict=user_id,item_key`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [...new Set([
      ...Object.values(RICH_PROFILE_FIXTURE.effects),
      ...Object.values(activeEffectFixture.effects),
      'profile_atmosphere_silk_folds'
    ])]
      .filter(Boolean)
      .map(itemKey => ({ user_id: session, item_key: itemKey, quantity: 1 }))
  });

  if (smokeMode === 'preview') {
    for (const itemKey of Object.values(activeEffectFixture.effects).filter(Boolean)) {
      const equipped = await callAuthenticatedRpc('equip_item', { p_item_key: itemKey });
      assert(equipped?.success === true, `Production preview fixture could not equip ${itemKey}: ${JSON.stringify(equipped)}`);
    }
  }

  const achievements = await serviceRest('/rest/v1/achievements?select=id&limit=3');
  const badgeIds = (Array.isArray(achievements) ? achievements : [])
    .map(row => row?.id)
    .filter(Boolean);
  if (badgeIds.length) {
    await serviceRest('/rest/v1/user_achievements?on_conflict=user_id,achievement_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: badgeIds.map(achievementId => ({ user_id: session, achievement_id: achievementId, count: 1 }))
    });
    await serviceRest(`/rest/v1/profiles?id=eq.${encodeURIComponent(session)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { equipped_badges: badgeIds }
    });
  }

  // Expression media is saved through the authenticated production RPC, so
  // uploaded-path validation and the current timestamp contract remain in the
  // test. The structured links and identity metadata follow the V2 save path.
  let configuration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
  const currentDraft = configuration?.draft || configuration?.configuration_v2?.draft;
  const currentBase = currentDraft?.base || currentDraft || {};
  const expression = await callAuthenticatedRpc('update_my_profile_expression', {
    p_avatar_path: currentBase.avatar_path || null,
    p_background_path: currentBase.background_path || null,
    p_spotify_url: RICH_PROFILE_FIXTURE.musicUrl
  });
  assert(expression?.success !== false, `Rich fixture music did not save: ${JSON.stringify(expression)}`);
  configuration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
  const draft = configuration?.draft || configuration?.configuration_v2?.draft;
  assert(draft && Number(draft.version) === 2, `Rich fixture did not receive a V2 draft: ${JSON.stringify(configuration)}`);
  const links = RICH_PROFILE_FIXTURE.links.map((link, order) => ({ ...link, key: `qa-rich-${order + 1}`, order, visible: true }));
  const nextDraft = {
    ...draft,
    base: {
      ...(draft.base || {}),
      links: links.slice(0, 6),
      // Rich fixture assertions exercise the canonical centered card. The
      // separate layout step above already covers switching to Immersive.
      templateKey: 'compact',
      layoutVariant: 'compact'
    },
    links,
    identity: {
      ...(draft.identity || {}),
      location: RICH_PROFILE_FIXTURE.location,
      timezone: RICH_PROFILE_FIXTURE.timezone
    }
  };
  const saved = await callAuthenticatedRpc('save_profile_configuration_v2', {
    p_draft: nextDraft,
    p_expected_updated_at: configuration.updated_at || null
  });
  assert(saved?.success !== false, `Rich fixture links did not save: ${JSON.stringify(saved)}`);
  return {
    userId: session,
    badgeIds,
    links: links.length,
    expression,
    updatedAt: saved?.updated_at || null
  };
}

async function publishRichProfileDraft() {
  const links = RICH_PROFILE_FIXTURE.links.map((link, order) => ({ ...link, key: `qa-rich-${order + 1}`, order, visible: true }));
  let configuration;
  let published;
  let expectedUpdatedAt = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    configuration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
    const draft = configuration?.draft || configuration?.configuration_v2?.draft;
    assert(draft && Number(draft.version) === 2, `Rich fixture publish did not receive a V2 draft: ${JSON.stringify(configuration)}`);
    expectedUpdatedAt = configuration.updated_at || null;
    published = await callAuthenticatedRpc('publish_profile_studio_v2', {
      p_draft: {
        ...draft,
        base: { ...(draft.base || {}), links: links.slice(0, 6), content: RICH_PROFILE_FIXTURE.content },
        links,
        content: RICH_PROFILE_FIXTURE.content,
        identity: {
          ...(draft.identity || {}),
          location: RICH_PROFILE_FIXTURE.location,
          timezone: RICH_PROFILE_FIXTURE.timezone
        }
      },
      p_display_name: canonicalUsername,
      p_bio: RICH_PROFILE_FIXTURE.bio,
      p_expected_updated_at: expectedUpdatedAt
    });
    if (published?.success !== false) break;
    if (published?.code !== 'conflict' || attempt === 1) {
      const afterConflict = await callAuthenticatedRpc('get_my_profile_configuration_v2');
      throw new Error(`Rich fixture publish failed: ${JSON.stringify({ response: published, expectedUpdatedAt, currentUpdatedAt: afterConflict?.updated_at || null })}`);
    }
    // A preceding Studio reset can still be completing its server write when
    // the preview route is ready. Re-read the optimistic token once rather
    // than weakening the publication check or using a null token.
    await delay(750);
  }
  const publishedExpression = published?.published?.base || published?.published || {};
  if (!skipMediaMutation) {
    assert(expressionMediaReference(publishedExpression, 'avatar', 'avatar_path') && expressionMediaReference(publishedExpression, 'background', 'background_path'), `Publish response omitted persisted avatar/background expression fields: ${JSON.stringify(published)}`);
  }
  assert(Array.isArray(published?.published?.links) && published.published.links.length >= links.length, `Publish response omitted the complete V2 link projection: ${JSON.stringify(published)}`);
  return { links: links.length, updatedAt: published?.updated_at || expectedUpdatedAt };
}

async function assertPublishedExpressionVisible(description) {
  if (skipMediaMutation) {
    const configuration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
    const published = configuration?.published || configuration?.configuration_v2?.published;
    const expression = published?.base || published || {};
    return {
      state: { avatar: null, background: null, video: null },
      expression: {
        avatar: expressionMediaReference(expression, 'avatar', 'avatar_path'),
        background: expressionMediaReference(expression, 'background', 'background_path'),
        video: expressionMediaReference(expression, 'background_video', 'background_video_path'),
        audio: expressionMediaReference(expression, 'audio', 'audio_path'),
        cursor: expressionMediaReference(expression, 'cursor', 'cursor_path')
      }
    };
  }
  await page.waitFor(`(() => {
    const avatar = document.querySelector('.profile-studio-preview .profile-reference-card__avatar, .profile-studio-preview .profile-full-bleed__avatar');
    const background = document.querySelector('.profile-environment--studio .profile-environment__image');
    return Boolean(avatar?.complete && avatar.naturalWidth > 0 && background?.complete && background.naturalWidth > 0);
  })()`, `${description} media load`, 15000);
  const state = await page.evaluate(`(() => {
    const avatar = document.querySelector('.profile-studio-preview .profile-reference-card__avatar, .profile-studio-preview .profile-full-bleed__avatar');
    const background = document.querySelector('.profile-environment--studio .profile-environment__image');
    const video = document.querySelector('.profile-environment--studio .profile-environment__video');
    return {
      avatar: avatar ? { complete: avatar.complete, naturalWidth: avatar.naturalWidth, src: avatar.currentSrc || avatar.src } : null,
      background: background ? { complete: background.complete, naturalWidth: background.naturalWidth, src: background.currentSrc || background.src } : null,
      video: video ? { readyState: video.readyState, src: video.currentSrc || video.src } : null
    };
  })()`);
  const configuration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
  const published = configuration?.published || configuration?.configuration_v2?.published;
  const expression = published?.base || published || {};
  const avatarReference = expressionMediaReference(expression, 'avatar', 'avatar_path');
  const backgroundReference = expressionMediaReference(expression, 'background', 'background_path');
  assert(state.avatar?.complete && state.avatar.naturalWidth > 0 && state.background?.complete && state.background.naturalWidth > 0, `${description} lost avatar/background in the live preview: ${JSON.stringify({ state, expression })}`);
  assert(avatarReference && backgroundReference, `${description} response/read projection lost avatar/background references: ${JSON.stringify({ state, expression })}`);
  return { state, expression: { avatar: avatarReference, background: backgroundReference, video: expressionMediaReference(expression, 'background_video', 'background_video_path'), audio: expressionMediaReference(expression, 'audio', 'audio_path'), cursor: expressionMediaReference(expression, 'cursor', 'cursor_path') } };
}

async function waitForStudioReferenceCard(description) {
  const referenceCard = `document.querySelector('.profile-layout-editor[data-layout-editor="reference-first"]') && document.querySelector('.profile-studio-preview .profile-reference-card')`;
  try {
    await page.waitFor(referenceCard, description);
  } catch {
    // A direct route navigation can finish before the authenticated settings
    // request has completed on a local GoTrue/Vite run. Retry the document
    // once, but keep the reference-card assertion strict after the retry.
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`);
    await page.waitFor(referenceCard, `${description} retry`);
  }
}

async function waitForStudioLayoutEditor(description, expectedLayout = '') {
  const editor = `document.querySelector('.profile-layout-editor[data-layout-editor="reference-first"]') && document.querySelector('.profile-studio-preview')`;
  const hydrated = `document.querySelector('.profile-settings-page[aria-busy="false"]') && ${editor}`;
  try {
    await page.waitFor(hydrated, description);
    if (expectedLayout) {
      await page.waitFor(`document.querySelector('.profile-studio-preview')?.getAttribute('data-preview-layout') === ${JSON.stringify(expectedLayout)} && document.querySelector('.profile-layout-editor__card.active')?.getAttribute('data-layout') === ${JSON.stringify(expectedLayout)}`, `${description} hydrated ${expectedLayout} layout`);
    }
  } catch {
    // A lazy Studio navigation can resolve its document before the editor
    // chunk has mounted. Refresh the same canonical route once, preserving
    // the authenticated session and hash-selected tab.
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`, 30000);
    await page.waitFor(hydrated, `${description} retry`, 30000);
    if (expectedLayout) {
      await page.waitFor(`document.querySelector('.profile-studio-preview')?.getAttribute('data-preview-layout') === ${JSON.stringify(expectedLayout)} && document.querySelector('.profile-layout-editor__card.active')?.getAttribute('data-layout') === ${JSON.stringify(expectedLayout)}`, `${description} retry hydrated ${expectedLayout} layout`, 30000);
    }
  }
}

async function waitForStudioDashboard(description) {
  const dashboard = `document.querySelector('.profile-settings-page') && document.querySelector('.studio-customize') && document.querySelector('.profile-studio-shell__brand') && !document.querySelector('.site-mode-header')`;
  try {
    await page.waitFor(dashboard, description, 30000);
  } catch {
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`, 30000);
    await page.waitFor(dashboard, `${description} retry`, 30000);
  }
}

async function waitForHydratedHomepage(description) {
  const homepage = `Boolean(document.querySelector('.homepage-reference') && document.querySelector('.homepage-reference .roll-page') && document.querySelector('.roll-stage--preroll, .roll-stage--results'))`;
  try {
    await page.waitFor(homepage, description, 30000);
  } catch {
    // Chromium can lose an initial Vite module request while the local
    // network namespace is settling. Re-request the same loopback document
    // once before treating the homepage as a real hydration failure.
    await page.command('Page.navigate', { url: appUrl });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`, 30000);
    await page.waitFor(homepage, `${description} retry`, 30000);
  }
}

async function waitForCanonicalProfileNavigation(url, expectedPath, description) {
  const profile = `location.pathname === ${JSON.stringify(expectedPath)} && document.querySelector('.profile-shell-page [data-profile-reference-card], .profile-shell-page [data-profile-layout-content]')`;
  try {
    await page.waitFor(profile, description, 30000);
  } catch {
    await page.command('Page.navigate', { url });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`, 30000);
    await page.waitFor(profile, `${description} retry`, 30000);
  }
}

async function waitForReferenceCardLinks(description) {
  const selector = '.profile-studio-preview .profile-reference-card__links a';
  const expected = RICH_PROFILE_FIXTURE.links.length;
  const condition = `document.querySelectorAll(${JSON.stringify(selector)}).length === ${expected}`;
  try {
    await page.waitFor(condition, description);
  } catch {
    // The authenticated Studio route can first paint its empty bootstrap
    // context before the V2 owner projection arrives. Retry the same route
    // once rather than allowing a transient empty draft to be published.
    const state = await page.evaluate(`({ links: document.querySelectorAll(${JSON.stringify(selector)}).length, card: Boolean(document.querySelector('.profile-studio-preview .profile-reference-card')) })`).catch(() => null);
    if (state?.links === expected) return;
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`);
    await waitForStudioReferenceCard(`${description} retry reference card`);
    await page.waitFor(condition, `${description} retry`);
  }
}

async function capturePublishedLayouts() {
  await page.setViewport(1440, 900);
  await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'reference-card Studio evidence');
  await waitForStudioReferenceCard('reference-card Studio preview');
  await waitForReferenceCardLinks('reference-card Studio links');
  const studioState = await page.evaluate(`(() => {
    const canvas = document.querySelector('.profile-studio-preview__canvas');
    const viewport = document.querySelector('.profile-studio-preview__viewport');
    const stage = document.querySelector('.profile-studio-preview__stage');
    const card = document.querySelector('.profile-studio-preview .profile-reference-card');
    const boundary = card?.closest('.profile-border-effect');
    const rect = element => {
      const box = element?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
    };
    const cardBox = card?.getBoundingClientRect();
    const boundaryBox = boundary?.getBoundingClientRect();
    const boundaryCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
    const cardCenter = cardBox ? (cardBox.left + cardBox.right) / 2 : 0;
    const frameDelta = boundaryBox && cardBox ? boundaryBox.width - cardBox.width : null;
    return {
      canvas: rect(canvas),
      viewport: rect(viewport),
      stage: rect(stage),
      card: rect(card),
      boundary: rect(boundary),
      frame: {
        fit: Boolean(boundaryBox && cardBox && frameDelta >= -1 && frameDelta <= 12 && Math.abs(boundaryCenter - cardCenter) <= 2),
        delta: frameDelta,
        centerOffset: boundaryBox && cardBox ? boundaryCenter - cardCenter : null
      },
      cardCount: document.querySelectorAll('.profile-studio-preview .profile-reference-card').length,
      avatar: Boolean(card?.querySelector('.profile-reference-card__avatar, .profile-reference-card__avatar-fallback')),
      name: Boolean(card?.querySelector('.profile-reference-card__name')),
      links: card?.querySelectorAll('.profile-reference-card__links a').length || 0,
      roll: Boolean(card?.querySelector('.profile-reference-card__roll')),
      rollWidgetCount: card?.querySelectorAll('[data-profile-widget="roll"]').length || 0,
      rollWidget: Boolean(card?.querySelector('[data-profile-widget="roll"]')),
      rollSummary: Boolean(card?.querySelector('[data-profile-widget="roll"][data-profile-widget-mode="summary"]')),
      interactiveRoll: Boolean(card?.querySelector('.profile-daily-roll, .profile-roll, .today-color, .profile-roll__reveal-button, .profile-roll__result-actions')),
      linkTargets: [...(card?.querySelectorAll('.profile-reference-card__links a') || [])].map(link => ({ href: link.href, target: link.target })),
      motion: Boolean(document.querySelector('.profile-studio-preview .profile-motion-effect')),
      oldRenderer: Boolean(document.querySelector('.profile-studio-preview .profile-shell-page, .profile-studio-preview .profile-template-picker')),
      scrollable: Boolean(stage && stage.scrollHeight > stage.clientHeight + 4)
    };
  })()`);
  assert(studioState.cardCount === 1 && studioState.avatar && studioState.name && studioState.links === RICH_PROFILE_FIXTURE.links.length && studioState.roll && studioState.rollWidgetCount === 1 && studioState.rollWidget && studioState.rollSummary && !studioState.interactiveRoll, `Studio reference card anatomy is incomplete: ${JSON.stringify(studioState)}.`);
  assert(studioState.linkTargets.every(link => link.target === '_blank' && link.href.startsWith('https://')), `Studio reference card links do not preserve safe external targets: ${JSON.stringify(studioState)}.`);
  assert(studioState.card && studioState.frame?.fit && studioState.card.width >= 300 && studioState.card.left >= (studioState.viewport?.left || 0) - 1 && studioState.card.right <= (studioState.viewport?.right || 0) + 1, `Studio reference card or border is not bounded by its preview rail: ${JSON.stringify(studioState)}.`);
  assert(studioState.motion && !studioState.oldRenderer && !studioState.scrollable, `Studio still mounts an obsolete or scrollable profile renderer: ${JSON.stringify(studioState)}.`);
  await captureRegion('studio-reference-card-desktop', '.profile-studio-preview__viewport');
  const mediaSourcesBeforeDraftChange = await page.evaluate(`(() => [...document.querySelectorAll('.profile-studio-preview img, .profile-studio-preview audio, .profile-studio-preview video')].map(element => element.currentSrc || element.src || '').filter(Boolean))()`);
  await page.click('#profile-customize-tab-appearance', 'reference-card Appearance tab');
  await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true'`, 'reference-card Appearance editor');
  await delay(180);
  const mediaSourcesAfterDraftChange = await page.evaluate(`(() => [...document.querySelectorAll('.profile-studio-preview img, .profile-studio-preview audio, .profile-studio-preview video')].map(element => element.currentSrc || element.src || '').filter(Boolean))()`);
  assert(JSON.stringify(mediaSourcesAfterDraftChange) === JSON.stringify(mediaSourcesBeforeDraftChange), `Studio appearance navigation changed media identity: ${JSON.stringify({ before: mediaSourcesBeforeDraftChange, after: mediaSourcesAfterDraftChange })}.`);
  await page.setViewport(390, 844);
  await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'reference-card mobile Studio evidence');
  await page.waitFor(`document.querySelector('.profile-settings-page') && document.querySelector('.studio-customize')`, 'mobile Studio document');
  if (!(await page.evaluate(`Boolean(document.querySelector('.profile-studio-preview'))`))) {
    await page.clickText('Preview', { description: 'open mobile reference preview' });
  }
  await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card')`, 'mobile reference card');
  await page.click('.profile-studio-preview__devices button:nth-child(2)', 'mobile reference-card device');
  await page.waitFor(`document.querySelector('.profile-studio-preview__canvas--mobile .profile-reference-card')`, 'mobile reference-card canvas');
  const mobileState = await page.evaluate(`(() => {
    const preview = document.querySelector('.profile-studio-preview');
    const card = preview?.querySelector('.profile-reference-card');
    const box = card?.getBoundingClientRect();
    return {
      preview: Boolean(preview),
      card: box ? { left: box.left, right: box.right, width: box.width } : null,
      links: card?.querySelectorAll('.profile-reference-card__links a').length || 0,
      rollWidgetCount: card?.querySelectorAll('[data-profile-widget="roll"]').length || 0,
      rollWidget: Boolean(card?.querySelector('[data-profile-widget="roll"]')),
      rollSummary: Boolean(card?.querySelector('[data-profile-widget="roll"][data-profile-widget-mode="summary"]')),
      interactiveRoll: Boolean(card?.querySelector('.profile-daily-roll, .profile-roll, .today-color, .profile-roll__reveal-button, .profile-roll__result-actions')),
      viewport: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
      oldRenderer: Boolean(preview?.querySelector('.profile-shell-page, .profile-template-picker'))
    };
  })()`);
  assert(mobileState.card && mobileState.card.left >= -1 && mobileState.card.right <= mobileState.viewport + 1 && mobileState.links === RICH_PROFILE_FIXTURE.links.length && mobileState.rollWidgetCount === 1 && mobileState.rollWidget && mobileState.rollSummary && !mobileState.interactiveRoll && !mobileState.overflow && !mobileState.oldRenderer, `Mobile reference card is not contained: ${JSON.stringify(mobileState)}.`);
  await captureRegion('studio-reference-card-mobile', '.profile-studio-preview__viewport');
  await page.setViewport(1440, 900);
  await page.navigate(`${appUrl}/${canonicalUsername}`, 'published reference profile evidence');
  await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] [data-profile-reference-card], .profile-shell-page[aria-busy="false"] [data-profile-layout-content="full-bleed"]')`, 'published profile evidence');
  if (approvedEffectSmoke) {
    await page.waitFor(`(() => {
      const shell = document.querySelector('.profile-shell-page[aria-busy="false"]');
      return Boolean(
        shell?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')
          && shell?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')
          && shell?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--back')
          && shell?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--front')
          && shell?.querySelector('[data-atmosphere="prism-dust"] canvas')
          && shell?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')
          && shell?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three')
      );
    })()`, 'approved effects on public profile');
  }
  const publicState = await page.evaluate(`(() => {
    const shell = document.querySelector('.profile-shell-page');
    const image = shell?.querySelector('.profile-environment__image');
    const content = shell?.querySelector('[data-profile-reference-card], [data-profile-layout-content="full-bleed"]');
    const boundary = content?.closest('.profile-border-effect');
    const halo = shell?.querySelector('.profile-motion-effect__halo-shell--one');
    const box = shell?.getBoundingClientRect();
    const contentBox = content?.getBoundingClientRect();
    const boundaryBox = boundary?.getBoundingClientRect();
    const haloBox = halo?.getBoundingClientRect();
    const boundaryCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
    const contentCenter = contentBox ? (contentBox.left + contentBox.right) / 2 : 0;
    const frameDelta = boundaryBox && contentBox ? boundaryBox.width - contentBox.width : null;
    const haloCenter = haloBox ? (haloBox.left + haloBox.right) / 2 : 0;
    const haloContentCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
    return {
      shell: box ? { width: box.width, height: box.height } : null,
      background: Boolean(image?.complete && image.naturalWidth > 0),
      card: Boolean(shell?.querySelector('[data-profile-reference-card], [data-profile-layout-content="full-bleed"]')),
      boundary: boundaryBox ? { left: boundaryBox.left, right: boundaryBox.right, width: boundaryBox.width, height: boundaryBox.height } : null,
      frame: {
        fit: Boolean(boundaryBox && contentBox && frameDelta >= -1 && frameDelta <= 12 && Math.abs(boundaryCenter - contentCenter) <= 2),
        delta: frameDelta,
        centerOffset: boundaryBox && contentBox ? boundaryCenter - contentCenter : null
      },
      motionFrame: {
        fit: !halo || Boolean(boundaryBox && haloBox && Math.abs(haloBox.width - boundaryBox.width) <= 2 && Math.abs(haloBox.height - boundaryBox.height) <= 2 && Math.abs(haloCenter - haloContentCenter) <= 2),
        delta: haloBox && boundaryBox ? haloBox.width - boundaryBox.width : null,
        centerOffset: haloBox && boundaryBox ? haloCenter - haloContentCenter : null
      },
      links: shell?.querySelectorAll('.profile-reference-card__links a, .profile-full-bleed__links a').length || 0,
      rollWidgetCount: shell?.querySelectorAll('[data-profile-widget="roll"]').length || 0,
      rollWidget: Boolean(shell?.querySelector('[data-profile-widget="roll"]')),
      rollSummary: Boolean(shell?.querySelector('[data-profile-widget="roll"][data-profile-widget-mode="summary"]')),
      interactiveRoll: Boolean(shell?.querySelector('[data-profile-reference-card] .profile-daily-roll, [data-profile-reference-card] .profile-roll, [data-profile-reference-card] .today-color, [data-profile-reference-card] .profile-roll__reveal-button, [data-profile-reference-card] .profile-roll__result-actions')),
      motion: Boolean(shell?.querySelector('.profile-motion-effect'))
    };
  })()`);
  assert(publicState.card && publicState.frame?.fit && publicState.motionFrame?.fit && publicState.shell && publicState.shell.width >= 1439 && publicState.shell.height >= 899 && publicState.links === RICH_PROFILE_FIXTURE.links.length && publicState.rollWidgetCount === 1 && publicState.rollWidget && publicState.rollSummary && !publicState.interactiveRoll, `Published profile evidence did not render the complete compact profile surface or fitting expression layers: ${JSON.stringify(publicState)}.`);
  await capture('public-reference-profile-desktop');

  // Rotate the published fixture through every real renderer. This is kept in
  // the browser smoke path because a selector-level unit test cannot prove
  // that a saved layout, its six links, and its roll widget survive a public
  // navigation at both desktop and mobile widths.
  const layoutEvidence = { compact: { desktop: publicState } };
  const layoutKeys = ['full-bleed', 'sleek', 'framed', 'portfolio'];
  let persistedLayout = 'compact';
  for (const layoutKey of layoutKeys) {
    const layoutSelector = `[data-profile-layout-content="${layoutKey}"]`;
    await page.setViewport(1440, 900);
    await page.navigate(`${appUrl}/profile/settings#customize-layout`, `${layoutKey} Studio layout evidence`);
    await waitForStudioLayoutEditor(`${layoutKey} Studio editor`, persistedLayout);
    await page.click(`.profile-layout-editor__card[data-layout="${layoutKey}"]`, `stage ${layoutKey} layout`);
    try {
      await page.waitFor(`document.querySelector('.profile-studio-preview')?.getAttribute('data-preview-layout') === ${JSON.stringify(layoutKey)} && document.querySelector('.profile-layout-editor__card.active')?.getAttribute('data-layout') === ${JSON.stringify(layoutKey)} && document.querySelector('.profile-studio-preview ${layoutSelector}')`, `${layoutKey} live preview`);
    } catch (error) {
      const previewLayouts = await page.evaluate(`(() => [...document.querySelectorAll('.profile-studio-preview [data-profile-layout-content]')].map(node => ({
        layout: node.getAttribute('data-profile-layout-content'),
        className: node.className
      })))()`).catch(() => []);
      throw new Error(`${error.message} Preview layouts: ${JSON.stringify(previewLayouts)}`, { cause: error });
    }
    // The preview component can mount one tick before the parent Studio shell
    // receives its dirty-state event. Wait for the real publish transition so
    // a fast browser cannot navigate to the public route with the old layout.
    await page.waitFor(`Boolean([...document.querySelectorAll('.profile-studio-shell__publish')].find(button => !button.disabled))`, `${layoutKey} staged publish`, 30000);
    await page.click('.profile-studio-shell__publish', `publish ${layoutKey} layout`);
    await page.waitFor(`document.querySelector('.profile-studio-header__message')?.textContent?.trim() === 'Profile published.'`, `published ${layoutKey} layout`, 30000);
    persistedLayout = layoutKey;

    await page.navigate(`${appUrl}/${canonicalUsername}`, `published ${layoutKey} layout evidence`);
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] ${layoutSelector}')`, `published ${layoutKey} profile`);
    const desktop = await page.evaluate(`(() => {
      const shell = document.querySelector('.profile-shell-page[aria-busy="false"]');
      const content = shell?.querySelector(${JSON.stringify(layoutSelector)});
      const boundary = content?.closest('.profile-border-effect');
      const halo = shell?.querySelector('.profile-motion-effect__halo-shell--one');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
      };
      const contentBox = content?.getBoundingClientRect();
      const boundaryBox = boundary?.getBoundingClientRect();
      const haloBox = halo?.getBoundingClientRect();
      const boundaryCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
      const contentCenter = contentBox ? (contentBox.left + contentBox.right) / 2 : 0;
      const frameDelta = boundaryBox && contentBox ? boundaryBox.width - contentBox.width : null;
      const haloCenter = haloBox ? (haloBox.left + haloBox.right) / 2 : 0;
      const haloBoundaryCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
      const links = [...(content?.querySelectorAll('.profile-reference-card__links a, .profile-full-bleed__links a, .profile-portfolio__links a') || [])];
      return {
        layout: content?.getAttribute('data-profile-layout-content') || '',
        content: rect(content),
        boundary: rect(boundary),
        frame: {
          fit: Boolean(boundaryBox && contentBox && frameDelta >= -1 && frameDelta <= 12 && Math.abs(boundaryCenter - contentCenter) <= 2),
          delta: frameDelta,
          centerOffset: boundaryBox && contentBox ? boundaryCenter - contentCenter : null
        },
        motionFrame: {
          fit: !halo || Boolean(boundaryBox && haloBox && Math.abs(haloBox.width - boundaryBox.width) <= 2 && Math.abs(haloBox.height - boundaryBox.height) <= 2 && Math.abs(haloCenter - haloBoundaryCenter) <= 2),
          delta: haloBox && boundaryBox ? haloBox.width - boundaryBox.width : null,
          centerOffset: haloBox && boundaryBox ? haloCenter - haloBoundaryCenter : null
        },
        shell: rect(shell),
        avatar: Boolean(content?.querySelector('[class*="__avatar"]')),
        name: Boolean(content?.querySelector('[class*="__name"]')),
        links: links.length,
        linkTargets: links.map(link => ({ href: link.href, target: link.target })),
        rollWidgetCount: content?.querySelectorAll('[data-profile-widget="roll"]').length || 0,
        rollWidget: Boolean(content?.querySelector('[data-profile-widget="roll"]')),
        rollSummary: Boolean(content?.querySelector('[data-profile-widget="roll"][data-profile-widget-mode="summary"]')),
        interactiveRoll: Boolean(content?.querySelector('.profile-daily-roll, .profile-roll, .today-color, .profile-roll__reveal-button, .profile-roll__result-actions')),
        contained: Boolean(content && content.getBoundingClientRect().left >= -1 && content.getBoundingClientRect().right <= innerWidth + 1),
        overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1
      };
    })()`);
    assert(desktop.layout === layoutKey && desktop.content?.width > 0 && desktop.content?.height > 0 && desktop.frame?.fit && desktop.motionFrame?.fit && desktop.avatar && desktop.name && desktop.links === RICH_PROFILE_FIXTURE.links.length && desktop.rollWidgetCount === 1 && desktop.rollWidget && desktop.rollSummary && !desktop.interactiveRoll && desktop.contained && !desktop.overflow, `Published ${layoutKey} desktop layout is incomplete, expression-misaligned, or escaping its viewport: ${JSON.stringify(desktop)}.`);
    assert(desktop.linkTargets.every(link => link.target === '_blank' && link.href.startsWith('https://')), `Published ${layoutKey} links do not preserve safe external targets: ${JSON.stringify(desktop)}.`);
    await capture(`public-${layoutKey}-desktop`);

    await page.setViewport(390, 844);
    await page.navigate(`${appUrl}/${canonicalUsername}`, `published ${layoutKey} mobile evidence`);
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] ${layoutSelector}')`, `published ${layoutKey} mobile profile`);
    const mobile = await page.evaluate(`(() => {
      const shell = document.querySelector('.profile-shell-page[aria-busy="false"]');
      const content = shell?.querySelector(${JSON.stringify(layoutSelector)});
      const boundary = content?.closest('.profile-border-effect');
      const halo = shell?.querySelector('.profile-motion-effect__halo-shell--one');
      const box = content?.getBoundingClientRect();
      const boundaryBox = boundary?.getBoundingClientRect();
      const haloBox = halo?.getBoundingClientRect();
      const boundaryCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
      const contentCenter = box ? (box.left + box.right) / 2 : 0;
      const frameDelta = boundaryBox && box ? boundaryBox.width - box.width : null;
      const haloCenter = haloBox ? (haloBox.left + haloBox.right) / 2 : 0;
      const haloBoundaryCenter = boundaryBox ? (boundaryBox.left + boundaryBox.right) / 2 : 0;
      const links = content?.querySelectorAll('.profile-reference-card__links a, .profile-full-bleed__links a, .profile-portfolio__links a').length || 0;
      return {
        layout: content?.getAttribute('data-profile-layout-content') || '',
        content: box ? { left: box.left, right: box.right, width: box.width, height: box.height } : null,
        boundary: boundaryBox ? { left: boundaryBox.left, right: boundaryBox.right, width: boundaryBox.width, height: boundaryBox.height } : null,
        frame: {
          fit: Boolean(boundaryBox && box && frameDelta >= -1 && frameDelta <= 12 && Math.abs(boundaryCenter - contentCenter) <= 2),
          delta: frameDelta,
          centerOffset: boundaryBox && box ? boundaryCenter - contentCenter : null
        },
        motionFrame: {
          fit: !halo || Boolean(boundaryBox && haloBox && Math.abs(haloBox.width - boundaryBox.width) <= 2 && Math.abs(haloBox.height - boundaryBox.height) <= 2 && Math.abs(haloCenter - haloBoundaryCenter) <= 2),
          delta: haloBox && boundaryBox ? haloBox.width - boundaryBox.width : null,
          centerOffset: haloBox && boundaryBox ? haloCenter - haloBoundaryCenter : null
        },
        links,
        rollWidgetCount: content?.querySelectorAll('[data-profile-widget="roll"]').length || 0,
        rollSummary: Boolean(content?.querySelector('[data-profile-widget="roll"][data-profile-widget-mode="summary"]')),
        interactiveRoll: Boolean(content?.querySelector('.profile-daily-roll, .profile-roll, .today-color, .profile-roll__reveal-button, .profile-roll__result-actions')),
        contained: Boolean(box && box.left >= -1 && box.right <= innerWidth + 1),
        overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1
      };
    })()`);
    assert(mobile.layout === layoutKey && mobile.content?.width > 0 && mobile.content?.height > 0 && mobile.frame?.fit && mobile.motionFrame?.fit && mobile.links === RICH_PROFILE_FIXTURE.links.length && mobile.rollWidgetCount === 1 && mobile.rollSummary && !mobile.interactiveRoll && mobile.contained && !mobile.overflow, `Published ${layoutKey} mobile layout is incomplete, expression-misaligned, or escaping its viewport: ${JSON.stringify(mobile)}.`);
    await capture(`public-${layoutKey}-mobile`);
    layoutEvidence[layoutKey] = { desktop, mobile };
  }

  // Verify that the existing module visibility contract is now an actual
  // Studio control, survives a layout change, and reaches the public profile.
  await page.setViewport(1440, 900);
  await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'audit hidden daily-roll widget');
  await waitForStudioLayoutEditor('daily-roll widget visibility editor');
  await page.waitFor(`document.querySelector('[data-roll-widget-toggle] input')?.checked === true`, 'visible daily-roll widget control');
  await page.click('[data-roll-widget-toggle]', 'hide daily-roll widget');
  await page.waitFor(`document.querySelector('[data-roll-widget-toggle] input')?.checked === false && document.querySelector('.profile-studio-preview')?.dataset.previewRollWidget === 'hidden' && !document.querySelector('.profile-studio-preview [data-profile-widget="roll"]')`, 'hidden daily-roll widget preview');
  await page.click('.profile-layout-editor__card[data-layout="sleek"]', 'change layout with hidden daily-roll widget');
  await page.waitFor(`document.querySelector('.profile-studio-preview [data-profile-layout-content="sleek"]') && document.querySelector('[data-roll-widget-toggle] input')?.checked === false && !document.querySelector('.profile-studio-preview [data-profile-widget="roll"]')`, 'hidden daily-roll widget after layout change');
  await page.click('.profile-studio-shell__publish', 'publish hidden daily-roll widget');
  await page.waitFor(`document.querySelector('.profile-studio-shell__publish')?.disabled === true`, 'publish hidden daily-roll widget');
  await page.navigate(`${appUrl}/${canonicalUsername}`, 'public profile with hidden daily-roll widget');
  await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"] [data-profile-layout-content="sleek"]')`, 'public Sleek profile with hidden daily-roll widget');
  const hiddenRoll = await page.evaluate(`(() => {
    const content = document.querySelector('.profile-shell-page[aria-busy="false"] [data-profile-layout-content="sleek"]');
    const box = content?.getBoundingClientRect();
    return {
      layout: content?.getAttribute('data-profile-layout-content') || '',
      rollWidgetCount: content?.querySelectorAll('[data-profile-widget="roll"]').length || 0,
      links: content?.querySelectorAll('.profile-full-bleed__links a').length || 0,
      contained: Boolean(box && box.left >= -1 && box.right <= innerWidth + 1),
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1
    };
  })()`);
  assert(hiddenRoll.layout === 'sleek' && hiddenRoll.rollWidgetCount === 0 && hiddenRoll.links === RICH_PROFILE_FIXTURE.links.length && hiddenRoll.contained && !hiddenRoll.overflow, `Hidden daily-roll widget did not survive publish cleanly: ${JSON.stringify(hiddenRoll)}.`);
  await capture('public-sleek-hidden-roll-desktop');

  // Leave the disposable smoke account in the ordinary default state for the
  // following navigation and for any local inspection of the captured proof.
  await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'restore Compact after roll visibility evidence');
  await waitForStudioLayoutEditor('restore Compact layout editor');
  await page.waitFor(`document.querySelector('[data-roll-widget-toggle] input')?.checked === false`, 'hidden daily-roll widget control after refresh');
  await page.click('[data-roll-widget-toggle]', 'restore daily-roll widget');
  await page.click('.profile-layout-editor__card[data-layout="compact"]', 'restore Compact layout after layout evidence');
  await page.waitFor(`document.querySelector('.profile-studio-preview [data-profile-layout-content="compact"]') && document.querySelector('[data-roll-widget-toggle] input')?.checked === true && document.querySelectorAll('.profile-studio-preview [data-profile-widget="roll"]').length === 1`, 'restore Compact live preview after layout evidence');
  const compactPublishPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-studio-shell__publish')].find(button => !button.disabled))`);
  if (compactPublishPending) {
    await page.click('.profile-studio-shell__publish', 'publish restored Compact layout');
    await page.waitFor(`document.querySelector('.profile-studio-shell__publish')?.disabled === true`, 'publish restored Compact layout');
  }
  await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'restore reference-card Studio');
  await waitForStudioReferenceCard('restore reference-card Studio');
  return { studio: studioState, mobile: mobileState, public: publicState, layouts: layoutEvidence, hiddenRoll };
}

try {
  const authResponse = await waitForHttp(`${supabaseUrl.origin}/auth/v1/settings`, 5000).catch(error => {
    throw new Error(`Local Supabase is not reachable at ${supabaseUrl.origin}. Start local Supabase first. ${error.message}`);
  });
  assert(authResponse.ok, `Local Supabase auth endpoint returned HTTP ${authResponse.status}.`);

  const appPort = smokeServer === 'pages'
    ? await findAvailablePort(Number(process.env.PROFILE_STUDIO_SMOKE_PORT || 5173))
    : await findAvailablePort(defaultAppPort);
  const debugPort = await findAvailablePort(defaultDebugPort);
  results.ports = { appPort, debugPort };
  appUrl = smokeServer === 'pages'
    ? `http://localhost:${appPort}`
    : `http://127.0.0.1:${appPort}`;
  do {
    canonicalUsername = `${RICH_PROFILE_FIXTURE.usernamePrefix}${Date.now().toString(36).slice(-8)}`;
  } while (isProtectedUsername(canonicalUsername) || isReservedRouteSegment(canonicalUsername));
  const email = `smoke-${Date.now().toString(36)}-${canonicalUsername}@example.test`;
  const password = `Smoke-${Date.now().toString(36)}-Pass!`;

  const startAppServer = smokeServer === 'pages'
    ? startPagesDev
    : (smokeMode === 'preview' ? startVitePreview : startVite);
  vite = await startAppServer({ appPort, environment: { url: supabaseUrl.origin, key: environment.key }, evidenceDir });
  chromium = await startChromium({ appUrl, debugPort, evidenceDir, ignoreCertificateErrors: smokeMode === 'preview' });
  page = chromium.page;
  if (smokeServer === 'pages') {
    await page.command('Page.setBypassCSP', { enabled: true });
    // Pages Functions attach the production CSP before the browser connects.
    // Reload after enabling the loopback-only test bypass so the proxy-backed
    // local Supabase origin is available to the first auth request as well.
    await page.command('Page.navigate', { url: appUrl });
  }

  await step('open local homepage', async () => {
    await waitForHydratedHomepage('hydrated homepage');
    assert(['127.0.0.1', 'localhost'].includes(await page.evaluate('location.hostname')), 'Homepage did not load on loopback.');
    await capture('01-homepage');
  });

  await step('compiled homepage keeps its phone layout', async () => {
    await page.setViewport(402, 874);
    await page.waitFor(`document.querySelector('.roll-page__game') && document.querySelector('.roll-action__button')`, 'homepage phone layout');
    const state = await page.evaluate(`(() => {
      const select = selector => document.querySelector(selector);
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
      };
      const grid = select('.roll-page__game');
      const action = select('.roll-action__button');
      const gridStyle = getComputedStyle(grid);
      const gridBox = rect(grid);
      const actionBox = rect(action);
      return {
        headerCount: document.querySelectorAll('.site-mode-header').length,
        rollColumns: gridStyle.gridTemplateColumns,
        grid: gridBox,
        action: actionBox,
        contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(state.headerCount === 1, `Homepage header ownership is not singular: ${JSON.stringify(state)}.`);
    assert(state.rollColumns.trim().split(' ').length === 1, `Production homepage retained multi-column phone geometry: ${JSON.stringify(state)}.`);
    assert(state.grid && state.grid.left >= 0 && state.grid.right <= 402 && state.action && state.action.left >= 0 && state.action.right <= 402 && state.contained, `Production homepage phone layout is not contained: ${JSON.stringify(state)}.`);
    await capture('01-homepage-mobile');
    await page.setViewport(1440, 1000);
    return state;
  });

  await step('create a unique account through the signup UI', async () => {
    await page.clickText('Sign up', { description: 'homepage account creation navigation' });
    await page.waitFor(`location.pathname === '/signup' && document.querySelector('.auth-page') && document.querySelector('.auth-page .site-mode-header--home') && document.querySelector('.auth-container') && document.querySelector('#username-input') && !document.querySelector('.auth-modal-overlay')`, 'standalone signup page');
    await capture('02-auth-signup');
    await page.click('.auth-container .tabs a[href^="/login"]', 'auth route switch to sign in');
    await page.waitFor(`location.pathname === '/login' && document.querySelector('.auth-page') && document.querySelector('#email-input')`, 'standalone login page');
    await capture('03-auth-login');
    await page.click('.auth-container .tabs a[href^="/signup"]', 'auth route switch to create account');
    await page.waitFor(`location.pathname === '/signup' && document.querySelector('.auth-page') && document.querySelector('#username-input')`, 'signup route after auth switch');
    if (smokeMode === 'preview' && !localIntegrationTest) {
      await page.waitFor(`(() => {
        const response = document.querySelector('[name="cf-turnstile-response"]');
        return Boolean(response?.value);
      })()`, 'production Turnstile test token', 30000);
    }
    await page.setInputValue('#username-input', canonicalUsername, ['input', 'change']);
    await page.setInputValue('#email-input', email, ['input', 'change']);
    await page.setInputValue('#password-input', password, ['input', 'change']);
    await page.click('.auth-submit', 'signup submit control');
    await page.waitFor(`location.pathname === '/' && document.querySelector('.homepage-reference .roll-page') && !document.querySelector('.auth-page')`, 'authenticated session after signup', 30000);
    const accountPath = await page.evaluate('location.pathname');
    assert(accountPath === '/', `Authenticated signup returned to ${JSON.stringify(accountPath)}, expected the playable homepage.`);
    const initialRoll = await callAuthenticatedRpc('roll_die', { p_is_reroll: false });
    assert(initialRoll?.success === true, `Disposable smoke account could not receive its server-authoritative daily roll: ${JSON.stringify(initialRoll)}`);
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
    await page.waitFor('document.querySelector(".profile-settings-page") && document.querySelector(".profile-studio-shell__brand") && !document.querySelector(".site-mode-header")', 'authenticated Profile Studio shell owns its dashboard header', 30000);
    const state = await page.evaluate(`(() => ({ path: location.pathname, settings: Boolean(document.querySelector('.profile-settings-page')), authPage: Boolean(document.querySelector('.auth-page')), overlay: Boolean(document.querySelector('.auth-modal-overlay')) }))()`);
    assert(state.path === '/profile/settings', `Safe auth redirect landed on ${state.path}.`);
    assert(state.settings && !state.authPage && !state.overlay, 'Authenticated auth route left an auth page or overlay mounted.');
    return state;
  });

  await step('direct-refresh authenticated Profile Studio', async () => {
    await page.navigate(`${appUrl}/profile/settings`, 'authenticated Profile Studio');
    await waitForStudioDashboard('Profile Studio dashboard shell');
    const state = await page.evaluate(`({ path: location.pathname, section: document.querySelector('.profile-studio-workspace')?.getAttribute('data-section-destination') || '', studioBrand: Boolean(document.querySelector('.profile-studio-shell__brand')), sharedSiteHeader: Boolean(document.querySelector('.site-mode-header')) })`);
    assert(state.path === '/profile/settings', `Expected /profile/settings after refresh, got ${state.path}.`);
    assert(state.studioBrand, 'Profile Studio dashboard brand is missing after refresh.');
    assert(!state.sharedSiteHeader, 'Profile Studio still mounts the photo-overlaid site header.');
    await capture('04-profile-studio');
    return state;
  });

  await step('Profile Studio ignores stale per-editor session drafts after refresh', async () => {
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card')`, 'initial Studio reference card before stale-session test');
    const baselineSurface = await page.evaluate(`(() => {
      const surface = document.querySelector('.profile-studio-preview .profile-reference-card');
      const style = surface ? getComputedStyle(surface) : null;
      return style ? {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        borderRadius: style.borderRadius,
        width: style.width
      } : null;
    })()`);
    assert(baselineSurface, 'Could not read the saved Studio profile surface before stale-session test.');
    const injected = await page.evaluate(`(() => {
      const session = Object.values(localStorage)
        .map(value => { try { return JSON.parse(value); } catch { return null; } })
        .find(value => value?.access_token && value?.user?.id);
      const scope = session?.user?.id || '';
      if (!scope) return { scope: '', keys: [] };
      const prefix = 'chromadie-view-state:';
      const staleDraft = JSON.stringify({
        draft: {
          layoutVariant: 'full-bleed',
          appearance: { surface: { color: '#111111', opacity: 12, blur: 40 } }
        }
      });
      const staleIdentity = JSON.stringify({ bio: 'stale session identity', presentation: { avatarPosition: 'side' } });
      const staleWidgets = JSON.stringify({ widgets: [{ provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', visible: true, order: 0 }] });
      const entries = [
        ['profile-editor', staleDraft],
        ['profile-content-editor', staleDraft],
        ['profile-widget-editor', staleWidgets],
        ['profile-identity-editor', staleIdentity]
      ];
      entries.forEach(([namespace, value]) => sessionStorage.setItem(prefix + namespace + ':' + scope, value));
      return { scope, keys: entries.map(([namespace]) => prefix + namespace + ':' + scope) };
    })()`);
    assert(injected.scope && injected.keys.length === 4, `Could not seed stale Studio session state: ${JSON.stringify(injected)}.`);

    // Use the harness navigation path for a real same-origin document refresh.
    // It preserves sessionStorage (so the stale drafts remain present) while
    // avoiding the lower-level CDP reload path, which can intermittently lose
    // the localhost connection while lazy route chunks are being fetched.
    await page.navigate(`${appUrl}/profile/settings`, 'stale-session Studio refresh');
    await page.waitFor(`document.querySelector('.profile-settings-page') && document.querySelector('.studio-customize') && document.querySelector('.profile-studio-preview .profile-reference-card') && document.querySelector('.profile-studio-shell__publish')`, 'stale-session Studio hydration');
    await delay(300);
    const state = await page.evaluate(`(() => {
      const card = document.querySelector('.profile-studio-preview .profile-reference-card');
      const actions = document.querySelector('.profile-studio-shell__publish');
      const published = document.querySelector('.profile-studio-header__published');
      return {
        card: Boolean(card),
        dirty: Boolean(actions && !actions.disabled),
        saved: published?.textContent?.trim() || '',
        hiddenLegacyEditors: document.querySelectorAll('.profile-content-editor, .profile-widget-editor').length,
        surface: (() => {
          const referenceCard = document.querySelector('.profile-studio-preview .profile-reference-card');
          const style = referenceCard ? getComputedStyle(referenceCard) : null;
          return style ? {
            backgroundColor: style.backgroundColor,
            backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
            borderRadius: style.borderRadius,
            width: style.width
          } : null;
        })(),
        preview: Boolean(card),
        oldRenderer: Boolean(document.querySelector('.profile-studio-preview .profile-shell-page, .profile-studio-preview .profile-template-picker'))
      };
    })()`);
    assert(state.preview && !state.oldRenderer, `Stale editor session state changed the Studio reference surface: ${JSON.stringify(state)}.`);
    assert(!state.dirty && state.saved === 'Published', `Stale editor session state changed dirty status: ${JSON.stringify(state)}.`);
    assert(state.hiddenLegacyEditors === 0, `Hidden legacy editors still mounted in Customize: ${JSON.stringify(state)}.`);
    assert(JSON.stringify(state.surface) === JSON.stringify(baselineSurface), `Stale editor session state changed the saved surface: ${JSON.stringify({ baseline: baselineSurface, afterRefresh: state.surface })}.`);
    await page.evaluate(`(() => ${JSON.stringify(injected.keys)}.forEach(key => sessionStorage.removeItem(key)))()`);
    return state;
  });

  await step('create an alias and resolve its direct-refresh path', async () => {
    const alias = `alias_${Date.now().toString(36).slice(-10)}`;
    await page.navigate(`${appUrl}/profile/settings#profile-aliases`, 'Profile aliases');
    await page.waitFor(`document.querySelector('.aliases-editor') && document.querySelector('#profile-alias')`, 'Profile aliases editor');
    await page.setInputValue('#profile-alias', alias, ['input', 'change']);
    await page.click('.aliases-editor__save', 'add alias control');
    await page.waitFor(`document.querySelector('.aliases-editor__row a')?.getAttribute('href') === ${JSON.stringify(`/a/${alias}`)}`, 'created profile alias');
    const aliasPath = await page.evaluate('document.querySelector(".aliases-editor__row a")?.getAttribute("href") || ""');
    assert(aliasPath === `/a/${alias}`, `Alias path was ${aliasPath}, expected /a/${alias}.`);
    await page.command('Page.navigate', { url: `${appUrl}${aliasPath}` });
    await waitForCanonicalProfileNavigation(`${appUrl}${aliasPath}`, `/${canonicalUsername}`, 'canonical profile after alias resolution');
    const state = await page.evaluate(`({ path: location.pathname, aliasPath: ${JSON.stringify(aliasPath)}, canonical: Boolean(document.querySelector('.profile-shell-page [data-profile-reference-card], .profile-shell-page [data-profile-layout-content="full-bleed"]')) })`);
    assert(state.path === `/${canonicalUsername}`, `Alias resolved to ${state.path} instead of canonical profile.`);
    assert(state.canonical, 'Canonical profile did not render after alias resolution.');
    await page.navigate(`${appUrl}/profile/settings`, 'Profile Studio after alias resolution');
    await page.waitFor('document.querySelector(".profile-settings-page")', 'Profile Studio after alias resolution');
    return state;
  });

  await step('Customize Links tab keeps the live preview connected', async () => {
    await page.navigate(`${appUrl}/profile/settings#customize-links`, 'Customize Links tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-links')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-links') && document.querySelector('.profile-studio-preview')`, 'integrated Links tab and preview');
    await page.waitFor(`(() => {
      const preview = document.querySelector('.profile-studio-preview');
      const canvas = document.querySelector('.profile-studio-preview .profile-reference-card');
      return Boolean(preview && canvas && !preview.closest('.auth-modal-overlay'));
    })()`, 'integrated Links live preview');
    const state = await page.evaluate(`(() => ({
      open: Boolean(document.querySelector('.profile-studio-preview')),
      tab: document.querySelector('#profile-customize-tab-links')?.getAttribute('aria-selected') === 'true',
      panel: Boolean(document.querySelector('#customize-links')),
      previewCanvas: Boolean(document.querySelector('.profile-studio-preview .profile-reference-card')),
      authOverlay: Boolean(document.querySelector('.profile-studio-preview')?.closest('.auth-modal-overlay')),
      linkRows: [...document.querySelectorAll('#customize-links .profile-links-editor__link-row')].map(row => {
        const rowBox = row.getBoundingClientRect();
        const remove = row.querySelector('.profile-links-editor__remove')?.getBoundingClientRect();
        return remove ? { rowLeft: Math.round(rowBox.left), rowRight: Math.round(rowBox.right), removeLeft: Math.round(remove.left), removeRight: Math.round(remove.right) } : null;
      }).filter(Boolean)
    }))()`);
    assert(state.open && state.tab && state.panel, `Customize Links did not mount the integrated editor: ${JSON.stringify(state)}.`);
    assert(state.linkRows.every(row => row.removeLeft >= row.rowLeft - 1 && row.removeRight <= row.rowRight + 1), `Links row action controls escape their containing row: ${JSON.stringify(state.linkRows)}.`);

    const rowSelector = '#customize-links .profile-links-editor__link-row';
    const previewLinkSelector = '.profile-studio-preview .profile-reference-card__links a';
    const expectedLinks = RICH_PROFILE_FIXTURE.links.length;
    await page.click('#customize-links .profile-links-editor__text-button', 'add staged link');
    await page.waitFor(`document.querySelectorAll(${JSON.stringify(rowSelector)}).length === 1`, 'blank staged link row');
    const blankRow = await page.evaluate(`(() => ({
      rows: document.querySelectorAll(${JSON.stringify(rowSelector)}).length,
      previewLinks: document.querySelectorAll(${JSON.stringify(previewLinkSelector)}).length,
      addDisabled: Boolean(document.querySelector('#customize-links .profile-links-editor__text-button')?.disabled),
      label: document.querySelector(${JSON.stringify(rowSelector + ':last-child input[aria-label="Link label"]')})?.value || '',
      url: document.querySelector(${JSON.stringify(rowSelector + ':last-child input[aria-label="Secure link URL"]')})?.value || ''
    }))()`);
    assert(blankRow.rows === 1 && blankRow.previewLinks === 0 && !blankRow.addDisabled && blankRow.label === '' && blankRow.url === '', `Adding a link did not retain an editable blank row without leaking an incomplete preview link: ${JSON.stringify(blankRow)}.`);
    for (let index = 0; index < expectedLinks; index += 1) {
      if (index > 0) {
        await page.click('#customize-links .profile-links-editor__text-button', `add staged link ${index + 1}`);
        await page.waitFor(`document.querySelectorAll(${JSON.stringify(rowSelector)}).length === ${index + 1}`, `staged link row ${index + 1}`);
      }
      await page.setInputValue(`${rowSelector}:nth-child(${index + 1}) input[aria-label="Link label"]`, `Profile link ${index + 1}`, ['input', 'change']);
      await page.setInputValue(`${rowSelector}:nth-child(${index + 1}) input[aria-label="Secure link URL"]`, `https://example.com/profile-link-${index + 1}`, ['input', 'change']);
    }
    await page.waitFor(`document.querySelectorAll(${JSON.stringify(previewLinkSelector)}).length === ${expectedLinks} && [...document.querySelectorAll(${JSON.stringify(previewLinkSelector)})].some(link => link.href === 'https://example.com/profile-link-6')`, 'completed staged links reach preview');
    const completed = await page.evaluate(`(() => ({
      rows: document.querySelectorAll(${JSON.stringify(rowSelector)}).length,
      previewLinks: document.querySelectorAll(${JSON.stringify(previewLinkSelector)}).length,
      addDisabled: Boolean(document.querySelector('#customize-links .profile-links-editor__text-button')?.disabled)
    }))()`);
    assert(completed.rows === expectedLinks && completed.previewLinks === expectedLinks && completed.addDisabled, `The editor did not enforce the six-link ceiling after live preview updates: ${JSON.stringify(completed)}.`);
    await page.waitFor('document.querySelector(\'.profile-studio-shell__publish\')?.disabled === false', 'publish control after staged links');
    await page.click('.profile-studio-shell__publish', 'publish staged links');
    await page.waitFor(`document.querySelector('.profile-studio-header__message')?.textContent?.trim() === 'Profile published.'`, 'published staged links');
    const persisted = await callAuthenticatedRpc('get_my_profile_configuration_v2');
    const publishedLinks = persisted?.published?.links || persisted?.published?.base?.links || persisted?.configuration_v2?.published?.links || [];
    assert(Array.isArray(publishedLinks) && publishedLinks.length === expectedLinks && publishedLinks.some(link => link.url === 'https://example.com/profile-link-6'), `Published staged links did not survive the V2 save path: ${JSON.stringify({ publishedLinks, persisted })}.`);
    return { ...state, stagedAdd: blankRow, completedPreviewLinks: completed.previewLinks, addDisabledAtSix: completed.addDisabled, publishedLinks: publishedLinks.length };
  });

  await step('Customize controls publish the configured surface depth', async () => {
    await page.navigate(`${appUrl}/profile/settings#customize-effects`, 'legacy Effects destination');
    await page.waitFor(`document.querySelector('[role="tablist"][aria-label="Customize profile"]') && document.querySelector('.profile-studio-preview .profile-reference-card')`, 'Customize tab workspace and persistent preview');
    await page.waitFor(`document.querySelector('.profile-studio-shell__publish')`, 'Studio publish control');
    const customizeTabs = await page.evaluate(`[...document.querySelectorAll('[role="tablist"][aria-label="Customize profile"] [role="tab"]')].map(tab => tab.textContent.trim())`);
    assert(JSON.stringify(customizeTabs) === JSON.stringify(['Appearance', 'Media', 'Links', 'Layout']), `Customize tabs did not expose the integrated Links tab in order: ${JSON.stringify(customizeTabs)}.`);
    await page.waitFor(`document.querySelector('#customize-effects')`, 'visual effects inside Appearance');
    await page.click('#profile-customize-tab-media', 'Media customize tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-media')`, 'visible Media editor');
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
    assert(Math.abs(background.top - avatar.top) <= 2 && audio.top > background.top && Math.abs(audio.top - cursor.top) <= 2, `Media cards are not arranged as the reference two-by-two grid: ${JSON.stringify(mediaRail)}.`);
    assert(background.left < avatar.left && audio.left < cursor.left, `Media cards do not preserve the reference column order: ${JSON.stringify(mediaRail)}.`);
    assert(mediaRail.options.top >= audio.bottom - 2, `Background options does not follow the media card grid: ${JSON.stringify(mediaRail)}.`);
    let backgroundUpload = null;
    let avatarUpload = null;
    let mediaPublishRegression = null;
    if (!skipMediaMutation) {
      backgroundUpload = await uploadGeneratedImage('input[aria-label="Choose background image"]', { ...RICH_PROFILE_FIXTURE.background, kind: 'background' });
      await page.waitFor(`([...document.querySelectorAll('.profile-expression-editor__message[role="status"]')]).some(node => node.textContent.includes('Background saved'))`, 'persisted uploaded background');
      try {
        await page.waitFor(`(() => { const image = document.querySelector('.profile-environment--studio .profile-environment__image'); return Boolean(image?.complete && image.naturalWidth > 0); })()`, 'uploaded background in live preview');
      } catch (error) {
        const previewState = await page.evaluate(`(() => ({
          images: [...document.querySelectorAll('.profile-studio-preview img')].map(image => ({ className: image.className, src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
          editorImages: [...document.querySelectorAll('.profile-expression-editor img')].map(image => ({ className: image.className, src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
          previewCard: document.querySelector('.profile-studio-preview .profile-reference-card')?.className || '',
          previewEnvironment: document.querySelector('.profile-environment--studio')?.getAttribute('style') || '',
          messages: [...document.querySelectorAll('.profile-expression-editor__message[role="status"]')].map(node => node.textContent.trim())
        }))()`);
        throw new Error(`${error.message} State: ${JSON.stringify(previewState)}`, { cause: error });
      }
      avatarUpload = await uploadGeneratedImage('input[aria-label="Choose avatar image"]', { ...RICH_PROFILE_FIXTURE.avatar, kind: 'avatar' });
      await page.waitFor(`([...document.querySelectorAll('.profile-expression-editor__message[role="status"]')]).some(node => node.textContent.includes('Avatar saved'))`, 'persisted uploaded avatar');
      await page.waitFor(`(() => { const image = document.querySelector('.profile-studio-preview .profile-reference-card__avatar'); return Boolean(image?.complete && image.naturalWidth > 0); })()`, 'uploaded avatar in live preview');
      const mediaRequestsBeforeDraftChange = stableProfileMediaRequests();
    const mediaSourcesBeforeDraftChange = await page.evaluate(`(() => [...document.querySelectorAll('.profile-studio-preview img, .profile-studio-preview audio, .profile-studio-preview video')]
      .map(element => element.currentSrc || element.src || '')
      .filter(Boolean))()`);
    // Exercise the real immediate-media -> staged-layout -> publish boundary
    // before any later fixture RPC can refresh the concurrency token for us.
    await page.click('#profile-customize-tab-layout', 'layout tab after media mutation');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-layout')`, 'layout editor after media mutation');
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card')`, 'reference card staged after media mutation');
    await delay(250);
    const mediaRequestsAfterDraftChange = stableProfileMediaRequests();
    const mediaSourcesAfterDraftChange = await page.evaluate(`(() => [...document.querySelectorAll('.profile-studio-preview img, .profile-studio-preview audio, .profile-studio-preview video')]
      .map(element => element.currentSrc || element.src || '')
      .filter(Boolean))()`);
    assert(mediaRequestsAfterDraftChange.length === mediaRequestsBeforeDraftChange.length,
      `Changing layout remounted unchanged Studio media: ${JSON.stringify({ before: mediaRequestsBeforeDraftChange, after: mediaRequestsAfterDraftChange })}.`);
    assert(mediaSourcesAfterDraftChange.filter(source => /media\.chm\.lol|r2\.cloudflarestorage\.com/.test(source)).every(source => !new URL(source).search),
      `Studio preview media source acquired a cache-busting query: ${JSON.stringify(mediaSourcesAfterDraftChange)}.`);
    assert(JSON.stringify(mediaSourcesAfterDraftChange.filter(source => /media\.chm\.lol|r2\.cloudflarestorage\.com/.test(source)))
      === JSON.stringify(mediaSourcesBeforeDraftChange.filter(source => /media\.chm\.lol|r2\.cloudflarestorage\.com/.test(source))),
    `Studio draft changed media identity: ${JSON.stringify({ before: mediaSourcesBeforeDraftChange, after: mediaSourcesAfterDraftChange })}.`);
    const layoutChange = await page.evaluate(`(() => {
      const editor = document.querySelector('[data-layout-editor="reference-first"]');
      return [...(editor?.querySelectorAll('.profile-layout-editor__card') || [])]
        .find(button => button.getAttribute('aria-pressed') !== 'true')
        ?.getAttribute('data-layout') || '';
    })()`);
    assert(layoutChange, 'Could not find a disposable layout change for the immediate-media publish regression.');
    await page.click(`.profile-layout-editor__card[data-layout="${layoutChange}"]`, 'stage layout change after immediate media mutation');
    await page.waitFor(`document.querySelector('.profile-studio-shell__publish')?.disabled === false`, 'publish control after immediate media mutation');
    await page.clickText('Publish profile', { description: 'publish after immediate media mutation' });
    await page.waitFor(`document.querySelector('.profile-studio-header__message')?.textContent?.trim() === 'Profile published.'`, 'publish after immediate media mutation');
      const mediaPublishExpression = await assertPublishedExpressionVisible('media mutation publish');
      const mediaPublishConfiguration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
      assert(mediaPublishConfiguration?.updated_at && mediaPublishExpression.expression.avatar && mediaPublishExpression.expression.background, `Media mutation publish did not preserve the current token and expression: ${JSON.stringify({ mediaPublishExpression, mediaPublishConfiguration })}`);
      mediaPublishRegression = { upload: { background: backgroundUpload, avatar: avatarUpload }, expression: mediaPublishExpression.expression, updatedAt: mediaPublishConfiguration.updated_at };
      const musicInputAvailable = await page.evaluate(`Boolean(document.querySelector('#profile-media-music input[type="url"]'))`);
      if (musicInputAvailable) {
        await page.setInputValue('#profile-media-music input[type="url"]', RICH_PROFILE_FIXTURE.musicUrl, ['input', 'change']);
        await page.clickText('Save Spotify', { description: 'save rich profile music' });
        await page.waitFor(`([...document.querySelectorAll('.profile-expression-editor__message[role="status"]')]).some(node => node.textContent.includes('Spotify saved'))`, 'persisted profile music');
      }
    }
    const richFixture = await seedRichProfileFixture();
    // Rehydrate the editor after the fixture's authenticated V2 writes. This
    // keeps the screenshots and the later publish path on the same draft that
    // the public route will read after refresh.
    // Profile Studio canonicalizes incidental query strings on hydration. Use
    // its stable route here so the refresh assertion follows the public URL
    // contract instead of requiring a disposable QA parameter to survive.
    await page.navigate(`${appUrl}/profile/settings`, 'rehydrated rich Profile Studio document');
    await page.waitFor(`location.pathname === '/profile/settings' && document.querySelector('.profile-settings-page')`, 'rehydrated rich Profile Studio document');
    await page.navigate(`${appUrl}/profile/settings#customize-appearance`, 'rehydrated rich Profile Studio appearance');
    await page.waitFor(`location.pathname === '/profile/settings' && document.querySelector('#customize-appearance') && document.querySelector('.profile-studio-preview .profile-reference-card')`, 'rehydrated rich Profile Studio appearance');
    await delay(180);
    await page.setInputValue('#profile-bio', RICH_PROFILE_FIXTURE.bio, ['input']);
    await page.setInputValue('#profile-location', RICH_PROFILE_FIXTURE.location, ['input']);
    await page.setInputValue('#profile-timezone', RICH_PROFILE_FIXTURE.timezone, ['input']);
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card__bio')?.textContent?.trim() === ${JSON.stringify(RICH_PROFILE_FIXTURE.bio)}`, 'rich identity draft in live preview');
    await page.click('#profile-customize-tab-media', 'Media tab for rich fixture evidence');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-media')`, 'rehydrated rich Profile Studio media');
    await page.evaluate(`document.querySelector('#customize-media')?.scrollIntoView({ block: 'start' })`);
    await capture('04-media-workspace');
    await page.click('#profile-customize-tab-layout', 'Layout customize tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-layout')`, 'visible Layout editor');
    const layoutState = await page.evaluate(`(() => {
      const editor = document.querySelector('#customize-layout');
      const workspace = document.querySelector('.profile-studio-workspace');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { width: Math.round(box.width), height: Math.round(box.height), top: Math.round(box.top), bottom: Math.round(box.bottom) } : null;
      };
      return { editor: rect(editor), workspace: rect(workspace), viewport: { width: innerWidth, height: innerHeight } };
    })()`);
    assert((layoutState.editor?.width || 0) > 0 && (layoutState.editor?.height || 0) > 0, `Layout editor has no visible geometry: ${JSON.stringify(layoutState)}.`);
    assert((layoutState.workspace?.width || 0) > 0 && (layoutState.workspace?.width || 0) <= layoutState.viewport.width + 2, `Layout workspace escapes the viewport horizontally: ${JSON.stringify(layoutState)}.`);
    await page.evaluate(`document.querySelector('#customize-layout')?.scrollIntoView({ block: 'start' })`);
    await capture('04-layout-workspace');
  await step('reference card layout replaces legacy template selection', async () => {
    const state = await page.evaluate(`(() => {
      const editor = document.querySelector('[data-layout-editor="reference-first"]');
      const card = document.querySelector('.profile-studio-preview .profile-reference-card');
      const viewport = document.querySelector('.profile-studio-preview__viewport');
      const cardBox = card?.getBoundingClientRect();
      const viewportBox = viewport?.getBoundingClientRect();
      return {
        editor: Boolean(editor),
        active: editor?.querySelector('.profile-layout-editor__card.active strong')?.textContent?.trim() || '',
        card: cardBox ? { width: cardBox.width, left: cardBox.left, right: cardBox.right } : null,
        viewport: viewportBox ? { left: viewportBox.left, right: viewportBox.right, width: viewportBox.width } : null,
        oldPicker: Boolean(document.querySelector('.profile-template-picker, .profile-template-picker__card')),
        oldPreview: Boolean(document.querySelector('.profile-studio-preview .profile-shell-page, .profile-studio-preview .profile-template-picker')),
        scrollCue: Boolean(document.querySelector('.profile-studio-preview__scroll-cue'))
      };
    })()`);
    assert(state.editor && state.active, `Reference layout editor is not active: ${JSON.stringify(state)}.`);
    assert(state.card && state.viewport && state.card.left >= state.viewport.left - 1 && state.card.right <= state.viewport.right + 1, `Reference preview card escaped its bounded rail: ${JSON.stringify(state)}.`);
    assert(!state.oldPicker && !state.oldPreview && !state.scrollCue, `Obsolete Studio presentation still mounted: ${JSON.stringify(state)}.`);

    await page.click('.profile-layout-editor__card[data-layout="full-bleed"]', 'stage Immersive layout');
    await page.waitFor(`document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]') && !document.querySelector('.profile-studio-preview .profile-reference-card')`, 'Immersive live preview');
    const immersive = await page.evaluate(`(() => ({
      active: document.querySelector('.profile-layout-editor__card.active')?.getAttribute('data-layout') || '',
      fullBleed: Boolean(document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]')),
      compact: Boolean(document.querySelector('.profile-studio-preview .profile-reference-card'))
    }))()`);
    assert(immersive.active === 'full-bleed' && immersive.fullBleed && !immersive.compact, `Immersive selection did not replace the Compact preview: ${JSON.stringify(immersive)}.`);
    await page.click('.profile-layout-editor__card[data-layout="compact"]', 'restore Compact layout');
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card') && !document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]')`, 'Compact live preview after Immersive');
    return { ...state, immersive };
  });

    if (smokeMode === 'preview') {
      // The deterministic fixture was seeded through the local Supabase
      // service role and equipped through the authenticated RPC above. The
      // built editor therefore receives the same public cosmetic projection
      // without importing source modules that do not exist in a production
      // bundle.
      const publishPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-studio-shell__publish')].find(button => !button.disabled))`);
      if (publishPending) {
        await page.click('.profile-studio-shell__publish', 'publish layout smoke draft');
        await page.waitFor(`document.querySelector('.profile-studio-shell__publish')?.disabled === true`, 'publish layout smoke draft');
        await assertPublishedExpressionVisible('layout smoke publish');
      }

      await publishRichProfileDraft();
      const publicEvidence = await capturePublishedLayouts();
      return { layoutState, mediaRail, backgroundUpload, avatarUpload, richFixture, publicEvidence, productionPreview: true };
    }
    if (!approvedEffectSmoke) {
    await page.click('#profile-customize-tab-appearance', 'Appearance customize tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-appearance')`, 'visible Appearance editor');
    // Keep Immersive mounted while changing the font. This catches the
    // regression where a layout remount was the only thing that retriggered
    // the lazy font loader.
    await page.click('#profile-customize-tab-layout', 'Immersive font setup tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-layout')`, 'Immersive font setup editor');
    await page.click('.profile-layout-editor__card[data-layout="full-bleed"]', 'stage Immersive for same-layout font update');
    await page.waitFor(`document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]') && !document.querySelector('.profile-studio-preview .profile-reference-card')`, 'Immersive mounted for same-layout font update');
    await page.click('#profile-customize-tab-appearance', 'Appearance for same-layout font update');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-appearance') && document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]')`, 'Appearance with Immersive still mounted');
    await page.evaluate(`(async () => {
      const { userInventory } = await import('/src/lib/stores.js');
      userInventory.update(items => [...new Set([...(Array.isArray(items) ? items : []), 'name_font_marker_tag', 'name_material_blueprint_ink', 'name_motion_typewriter_name', 'avatar_effect_cyber_hud', 'border_celestial', 'cursor_trail_pixel_wake', 'profile_atmosphere_rain_window', 'profile_atmosphere_silk_folds'])]);
    })()`);
    try {
      await page.waitFor(`document.querySelector('#cosmetic-studio-name_font option[value="name_font_marker_tag"]') && document.querySelector('#cosmetic-studio-name_material option[value="name_material_blueprint_ink"]') && document.querySelector('#cosmetic-studio-name_motion option[value="name_motion_typewriter_name"]') && document.querySelector('#cosmetic-studio-avatar_effect option[value="avatar_effect_cyber_hud"]') && document.querySelector('#cosmetic-studio-profile_border option[value="border_celestial"]') && document.querySelector('#cosmetic-studio-cursor_trail option[value="cursor_trail_pixel_wake"]') && document.querySelector('#cosmetic-studio-profile_atmosphere option[value="profile_atmosphere_rain_window"]') && document.querySelector('#cosmetic-studio-profile_atmosphere option[value="profile_atmosphere_silk_folds"]')`, 'owned cosmetic preview fixtures');
    } catch (error) {
      const fixtureState = await page.evaluate(`(() => Object.fromEntries([
        'cosmetic-studio-name_font',
        'cosmetic-studio-name_material',
        'cosmetic-studio-name_motion',
        'cosmetic-studio-avatar_effect',
        'cosmetic-studio-profile_border',
        'cosmetic-studio-cursor_trail',
        'cosmetic-studio-profile_atmosphere'
      ].map(id => [id, [...(document.getElementById(id)?.options || [])].map(option => option.value)])))()`);
      throw new Error(`${error.message} State: ${JSON.stringify(fixtureState)}`, { cause: error });
    }
    await page.waitFor(`document.querySelectorAll('.profile-cosmetics-studio-card').length === 8`, 'composed live effect grid');
    const defaultNamePreviewState = await page.evaluate(`(() => ({
      slots: document.querySelectorAll('.profile-cosmetics-studio-card').length,
      legacyPreviews: document.querySelectorAll('.profile-cosmetics-name-preview, .profile-cosmetics-visual-preview').length,
      liveRenderer: Boolean(document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"] .name-effect-canvas'))
    }))()`);
    assert(defaultNamePreviewState.slots === 8 && defaultNamePreviewState.legacyPreviews === 0, `Studio effect controls did not mount the current live effect grid contract: ${JSON.stringify(defaultNamePreviewState)}.`);
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-studio-name_font');
      select.value = 'name_font_marker_tag';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`(() => {
      const liveName = document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"] .name-effect-canvas__semantic');
      const canvas = liveName?.closest('.name-effect-canvas');
      return liveName?.getAttribute('style')?.includes('Permanent Marker') && canvas?.getAttribute('data-name-font-ready') === 'true';
    })()`, 'font renderer in same-layout Immersive preview');
    const fontCardState = await page.evaluate(`(() => ({
      preview: Boolean(document.querySelector('.profile-cosmetics-studio-card[data-cosmetic-slot="name_font"]')),
      renderer: Boolean(document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"] .name-effect-canvas')),
      selected: document.querySelector('#cosmetic-studio-name_font')?.value || ''
    }))()`);
    assert(fontCardState.preview && fontCardState.renderer && fontCardState.selected === 'name_font_marker_tag', `Font control did not mount the production renderer: ${JSON.stringify(fontCardState)}.`);
    await page.click('#profile-customize-tab-layout', 'Immersive font verification tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-layout')`, 'Immersive font layout editor');
    try {
      await page.waitFor(`(() => {
        const canvas = document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"] .name-effect-canvas');
        return Boolean(canvas && canvas.getAttribute('data-name-font') === 'marker-tag' && canvas.getAttribute('data-name-font-ready') === 'true');
      })()`, 'selected font remains ready in Immersive preview');
    } catch (error) {
      const fontState = await page.evaluate(`(() => ({
        canvases: [...document.querySelectorAll('.profile-studio-preview .name-effect-canvas')].map(node => ({
          font: node.getAttribute('data-name-font') || '',
          ready: node.getAttribute('data-name-font-ready') || '',
          renderer: node.getAttribute('data-name-renderer') || '',
          text: node.querySelector('.name-effect-canvas__semantic')?.textContent?.trim() || ''
        })),
        fullBleed: Boolean(document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]')),
        layout: document.querySelector('.profile-studio-preview')?.getAttribute('data-preview-layout') || '',
        activeLoadout: (() => {
          const root = document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]');
          return root?.querySelector('.name-effect-canvas')?.getAttribute('data-name-font') || '';
        })()
      }))()`);
      throw new Error(`${error.message} State: ${JSON.stringify(fontState)}`, { cause: error });
    }
    await page.click('.profile-layout-editor__card[data-layout="compact"]', 'restore Compact after font verification');
    try {
      await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card') && !document.querySelector('.profile-studio-preview [data-profile-layout-content="full-bleed"]')`, 'Compact preview after font verification');
    } catch (error) {
      const layoutState = await page.evaluate(`(() => ({
        active: document.querySelector('.profile-layout-editor__card.active')?.getAttribute('data-layout') || '',
        studioDraft: document.querySelector('.profile-settings-page')?.getAttribute('data-studio-draft-layout') || '',
        previewLayout: document.querySelector('.profile-studio-preview')?.getAttribute('data-preview-layout') || '',
        contents: [...document.querySelectorAll('.profile-studio-preview [data-profile-layout-content]')].map(node => node.getAttribute('data-profile-layout-content')),
        cards: document.querySelectorAll('.profile-studio-preview .profile-reference-card').length,
        fullBleed: document.querySelectorAll('.profile-studio-preview [data-profile-layout-content="full-bleed"]').length
      }))()`);
      throw new Error(`${error.message} State: ${JSON.stringify(layoutState)}`, { cause: error });
    }
    await page.click('#profile-customize-tab-appearance', 'Appearance after font verification');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-appearance')`, 'Appearance after Immersive font verification');
    await page.waitFor(`document.querySelectorAll('.profile-cosmetics-studio-card').length === 8 && document.querySelector('#cosmetic-studio-name_material') && document.querySelector('#cosmetic-studio-profile_atmosphere')`, 'Profile effects after Immersive font verification');
    await page.evaluate(`(() => {
      for (const [slot, value] of [
        ['name_material', 'name_material_blueprint_ink'],
        ['name_motion', 'name_motion_typewriter_name'],
        ['avatar_effect', 'avatar_effect_cyber_hud'],
        ['profile_border', 'border_celestial'],
        ['cursor_trail', 'cursor_trail_pixel_wake'],
        ['profile_atmosphere', 'profile_atmosphere_rain_window']
      ]) {
        const select = document.getElementById('cosmetic-studio-' + slot);
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    try {
      await page.waitFor(`document.querySelector('#cosmetic-studio-name_material')?.value === 'name_material_blueprint_ink' && document.querySelector('#cosmetic-studio-name_motion')?.value === 'name_motion_typewriter_name' && document.querySelector('#cosmetic-studio-avatar_effect')?.value === 'avatar_effect_cyber_hud' && document.querySelector('#cosmetic-studio-profile_border')?.value === 'border_celestial' && document.querySelector('#cosmetic-studio-cursor_trail')?.value === 'cursor_trail_pixel_wake' && document.querySelector('#cosmetic-studio-profile_atmosphere')?.value === 'profile_atmosphere_rain_window' && (() => { const root = document.querySelector('.profile-studio-preview [data-profile-layout-content]'); const name = root?.querySelector('.name-effect-canvas'); return Boolean(name?.getAttribute('data-name-font') === 'marker-tag' && name?.getAttribute('data-name-material') === 'name_material_blueprint_ink' && name?.getAttribute('data-name-motion') === 'name_motion_typewriter_name' && root.querySelector('[data-avatar-effect="cyber-hud"]') && document.querySelector('.profile-studio-preview [data-profile-border="celestial"]') && document.querySelector('.profile-environment--studio .cursor-trail-layer[data-trail-key="pixel-wake"]') && document.querySelector('.profile-environment--studio [data-atmosphere="rain-window"]')); })()`, 'all cosmetic renderers in live preview');
    } catch (error) {
      const rendererState = await page.evaluate(`(() => {
        const root = document.querySelector('.profile-studio-preview [data-profile-layout-content]');
        const name = root?.querySelector('.name-effect-canvas');
        return {
          selected: Object.fromEntries(['name_material', 'name_motion', 'avatar_effect', 'profile_border', 'cursor_trail', 'profile_atmosphere'].map(slot => [slot, document.querySelector('#cosmetic-studio-' + slot)?.value || ''])),
          root: root?.getAttribute('data-profile-layout-content') || '',
          name: name ? Object.fromEntries(['data-name-font', 'data-name-material', 'data-name-motion'].map(attr => [attr, name.getAttribute(attr) || ''])) : null,
          avatar: [...(root?.querySelectorAll('[data-avatar-effect]') || [])].map(node => node.getAttribute('data-avatar-effect')),
          borders: [...document.querySelectorAll('.profile-studio-preview [data-profile-border]')].map(node => node.getAttribute('data-profile-border')),
          cursors: [...document.querySelectorAll('.profile-environment--studio [data-trail-key]')].map(node => node.getAttribute('data-trail-key')),
          atmospheres: [...document.querySelectorAll('.profile-environment--studio [data-atmosphere]')].map(node => node.getAttribute('data-atmosphere'))
        };
      })()`).catch(() => null);
      throw new Error(`${error.message} State: ${JSON.stringify(rendererState)}`, { cause: error });
    }
    const progressiveNameState = await page.evaluate(`(() => {
      const node = document.querySelector('.profile-studio-preview [data-profile-layout-content] .name-effect-canvas');
      return {
        font: node?.getAttribute('data-name-font') || '',
        material: node?.getAttribute('data-name-material') || '',
        motion: node?.getAttribute('data-name-motion') || '',
        renderer: node?.getAttribute('data-name-renderer') || ''
      };
    })()`);
    assert(progressiveNameState.font === 'marker-tag' && progressiveNameState.material === 'name_material_blueprint_ink' && progressiveNameState.motion === 'name_motion_typewriter_name', `Name controls did not compose in the live preview: ${JSON.stringify(progressiveNameState)}.`);
    const nameEffectsLayout = await page.evaluate(`(() => {
      const grid = document.querySelector('.profile-cosmetics-studio-grid');
      const rect = element => {
        const box = element?.getBoundingClientRect();
        return box ? { width: Math.round(box.width), height: Math.round(box.height), top: Math.round(box.top), bottom: Math.round(box.bottom) } : null;
      };
      return {
        labels: [...(grid?.querySelectorAll('.profile-cosmetics-studio-card strong') || [])].map(label => label.textContent?.trim() || ''),
        controls: [...(grid?.querySelectorAll('select') || [])].map(select => rect(select)?.height || 0),
        grid: rect(grid),
        legacyPreviews: grid?.querySelectorAll('.profile-cosmetics-name-preview, .profile-cosmetics-visual-preview').length || 0
      };
    })()`);
    assert(JSON.stringify(nameEffectsLayout.labels) === JSON.stringify(['Font', 'Material', 'Motion', 'Avatar effect', 'Profile border', 'Cursor trail', 'Profile atmosphere', 'Profile motion']), `Studio effect labels do not match the current slot contract: ${JSON.stringify(nameEffectsLayout)}.`);
    assert(nameEffectsLayout.controls.length === 8 && nameEffectsLayout.controls.every(height => height >= 32 && height <= 44), `Studio effect controls are outside the readable compact range: ${JSON.stringify(nameEffectsLayout)}.`);
    assert((nameEffectsLayout.grid?.height || 0) > 0 && nameEffectsLayout.legacyPreviews === 0, `Studio effect grid is missing or still mounts legacy previews: ${JSON.stringify(nameEffectsLayout)}.`);
    const visualPreviewState = await page.evaluate(`(() => {
      const root = document.querySelector('.profile-studio-preview [data-profile-layout-content]');
      return {
        avatar: Boolean(root?.querySelector('[data-avatar-effect="cyber-hud"]')),
        border: Boolean(document.querySelector('.profile-studio-preview [data-profile-border="celestial"]')),
        cursor: Boolean(document.querySelector('.profile-environment--studio .cursor-trail-layer[data-trail-key="pixel-wake"]')),
        atmosphere: Boolean(document.querySelector('.profile-environment--studio [data-atmosphere="rain-window"]'))
      };
    })()`);
    assert(visualPreviewState.avatar && visualPreviewState.border && visualPreviewState.cursor && visualPreviewState.atmosphere, `Live effect renderers are incomplete: ${JSON.stringify(visualPreviewState)}.`);
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-studio-profile_border');
      select.value = 'border_celestial';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`document.querySelector('.profile-studio-preview [data-profile-border="celestial"]')`, 'border renderer in live preview');
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-studio-profile_atmosphere');
      select.value = 'profile_atmosphere_rain_window';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`document.querySelector('.profile-environment--studio [data-atmosphere="rain-window"]')`, 'atmosphere renderer in full-page preview');
    await page.evaluate(`(() => {
      const select = document.querySelector('#cosmetic-studio-profile_atmosphere');
      select.value = 'profile_atmosphere_silk_folds';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor(`document.querySelector('.profile-environment--studio [data-atmosphere="silk-folds"]') && [...document.querySelectorAll('.profile-environment--studio [data-atmosphere="silk-folds"] video')].every(video => video.currentSrc.includes('/atmospheres/silk-folds/'))`, 'atmosphere renderer changes in full-page preview');
    const beforeTabSwitch = await page.evaluate(`(() => {
      const cursorCanvas = document.querySelector('.profile-environment--studio .cursor-trail-layer[data-trail-key="pixel-wake"] canvas');
      const atmosphere = document.querySelector('.profile-environment--studio [data-atmosphere="silk-folds"]');
      const video = atmosphere?.querySelector('video');
      return {
        cursorFrame: cursorCanvas?.toDataURL() || '',
        atmosphereState: atmosphere?.getAttribute('data-atmosphere-state') || '',
        videoTime: video?.currentTime || 0,
        videoPaused: video?.paused ?? true
      };
    })()`);
    await page.click('#profile-customize-tab-media', 'Media tab before animation resume check');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-media')`, 'visible Media during animation resume check');
    await page.click('#profile-customize-tab-layout', 'Layout tab before animation resume check');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-layout')`, 'visible Layout during animation resume check');
    await page.click('#profile-customize-tab-appearance', 'Appearance tab after animation resume check');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-effects')`, 'effects after tab switching');
    await page.evaluate(`document.querySelector('#customize-effects')?.scrollIntoView({ block: 'start' })`);
    try {
      await page.waitFor(`document.querySelector('.profile-environment--studio .cursor-trail-layer[data-input-mode="demo"][data-trail-key="pixel-wake"]') && document.querySelector('.profile-environment--studio [data-atmosphere="silk-folds"][data-atmosphere-state="animated"]')`, 'cosmetic animations resumed after tab switching');
    } catch (error) {
      const animationState = await page.evaluate(`(() => {
        const cursor = document.querySelector('.profile-environment--studio .cursor-trail-layer[data-trail-key="pixel-wake"]');
        const atmospheres = [...document.querySelectorAll('.profile-environment--studio [data-atmosphere="silk-folds"]')].map(node => ({
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
      const cursorCanvas = document.querySelector('.profile-environment--studio .cursor-trail-layer[data-trail-key="pixel-wake"] canvas');
      const atmosphere = document.querySelector('.profile-environment--studio [data-atmosphere="silk-folds"]');
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
    } else {
      await page.click('#profile-customize-tab-appearance', 'approved effects Appearance tab');
      await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-appearance')`, 'approved effects Appearance editor');
      const approvedSelections = {
        name_font: activeEffectFixture.effects.nameFont,
        name_material: activeEffectFixture.effects.nameMaterial,
        name_motion: activeEffectFixture.effects.nameMotion,
        avatar_effect: activeEffectFixture.effects.avatar,
        profile_border: activeEffectFixture.effects.border,
        cursor_trail: activeEffectFixture.effects.cursor,
        profile_atmosphere: activeEffectFixture.effects.atmosphere,
        profile_motion: activeEffectFixture.effects.profileMotion
      };
      await page.waitFor(`(() => {
        const selections = ${JSON.stringify(approvedSelections)};
        return Object.entries(selections).every(([slot, itemKey]) => document.querySelector('#cosmetic-studio-' + slot + ' option[value="' + itemKey + '"]'));
      })()`, 'approved cosmetic controls');
      await page.evaluate(`(() => {
        const selections = ${JSON.stringify(approvedSelections)};
        for (const [slot, value] of Object.entries(selections)) {
          const select = document.getElementById('cosmetic-studio-' + slot);
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`);
      await page.waitFor(`(() => {
        const selections = ${JSON.stringify(approvedSelections)};
        return Object.entries(selections).every(([slot, itemKey]) => document.getElementById('cosmetic-studio-' + slot)?.value === itemKey);
      })()`, 'approved cosmetic controls staged');
      try {
        await page.waitFor(`(() => {
          const preview = document.querySelector('.profile-studio-preview');
          const environment = document.querySelector('.profile-environment--studio');
          return Boolean(
            preview?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')
              && preview?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')
              && preview?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--back')
              && preview?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--front')
              && environment?.querySelector('[data-atmosphere="prism-dust"] canvas')
              && environment?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')
              && preview?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three')
              && document.querySelectorAll('.profile-environment').length === 1
          );
        })()`, 'approved effects in Customize live preview');
      } catch (error) {
        const approvedPreviewState = await page.evaluate(`(() => {
          const preview = document.querySelector('.profile-studio-preview');
          const environment = document.querySelector('.profile-environment--studio');
          const selectors = {
            preview: Boolean(preview),
            environment: Boolean(environment),
            environmentCount: document.querySelectorAll('.profile-environment').length,
            name: Boolean(preview?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')),
            border: Boolean(preview?.querySelector('[data-profile-border="elastic"]')),
            borderPath: Boolean(preview?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')),
            avatar: preview?.querySelectorAll('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas').length || 0,
            atmosphere: Boolean(environment?.querySelector('[data-atmosphere="prism-dust"]')),
            atmosphereCanvas: Boolean(environment?.querySelector('[data-atmosphere="prism-dust"] canvas')),
            cursor: Boolean(environment?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"]')),
            cursorCanvas: Boolean(environment?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')),
            motion: Boolean(preview?.querySelector('[data-profile-motion="halo-offset"]')),
            motionShell: Boolean(preview?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three')),
            staged: Object.fromEntries([...document.querySelectorAll('[id^="cosmetic-studio-"]')].map(select => [select.id, select.value]))
          };
          return selectors;
        })()`);
        throw new Error(`${error.message} State: ${JSON.stringify(approvedPreviewState)}`, { cause: error });
      }
      await capture('05-approved-effects-live-preview');
    }
    await page.clickText('Update equipped effects', { description: 'apply rich cosmetic fixture' });
    await page.waitFor(`document.querySelector('.profile-cosmetics-apply')?.disabled === true`, 'rich cosmetic fixture applied');
    let persistedCosmetics = await callAuthenticatedRpc('get_my_profile');
    // Svelte batches several fitting-room select events while the first RPC
    // is in flight. Complete any remaining selected slots through the same
    // authenticated equip boundary so the canonical fixture is deterministic
    // without weakening the production entitlement check.
    const expectedEquipped = {
      name_font: RICH_PROFILE_FIXTURE.effects.nameFont,
      name_material: RICH_PROFILE_FIXTURE.effects.nameMaterial,
      name_motion: activeEffectFixture.effects.nameMotion,
      avatar_effect: activeEffectFixture.effects.avatar,
      profile_border: activeEffectFixture.effects.border,
      profile_atmosphere: activeEffectFixture.effects.atmosphere,
      cursor_trail: activeEffectFixture.effects.cursor,
      profile_motion: activeEffectFixture.effects.profileMotion
    };
    for (const [slot, itemKey] of Object.entries(expectedEquipped)) {
      if (persistedCosmetics?.equipped_cosmetics?.[slot] === itemKey) continue;
      const equipped = await callAuthenticatedRpc('equip_item', { p_item_key: itemKey });
      assert(equipped?.success === true, `The real cosmetic equip path rejected ${slot}: ${JSON.stringify(equipped)}`);
    }
    persistedCosmetics = await callAuthenticatedRpc('get_my_profile');
    assert(Object.entries(expectedEquipped).every(([slot, itemKey]) => persistedCosmetics?.equipped_cosmetics?.[slot] === itemKey), `The real cosmetic equip path did not persist the rich fixture: ${JSON.stringify(persistedCosmetics?.equipped_cosmetics || {})}.`);
    // The fallback equips above only fills slots when a batched fitting-room
    // event races the editor's refresh. Rehydrate the actual Studio route
    // before measuring the live renderer so this assertion exercises the same
    // persisted-loadout path users get after a refresh.
    await page.command('Page.navigate', { url: `${appUrl}/profile/settings?qa=effects-${Date.now()}#customize-appearance` });
    await page.waitFor(`document.readyState === 'complete' && location.pathname === '/profile/settings' && document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-appearance')`, 'rehydrated active cosmetic Studio preview');
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card, .profile-studio-preview [data-profile-layout-content="full-bleed"]')`, 'rehydrated active Studio reference card');
    let approvedStudioEffects = null;
    if (approvedEffectSmoke) {
      await page.waitFor(`(() => {
        const preview = document.querySelector('.profile-studio-preview');
        const environment = document.querySelector('.profile-environment--studio');
        return Boolean(
          preview?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')
            && preview?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')
            && preview?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--back')
            && preview?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--front')
            && environment?.querySelector('[data-atmosphere="prism-dust"] canvas')
            && environment?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')
            && preview?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three')
            && document.querySelectorAll('.profile-environment').length === 1
        );
      })()`, 'approved effects in live Studio preview');
      approvedStudioEffects = await page.evaluate(`(() => {
        const preview = document.querySelector('.profile-studio-preview');
        const environment = document.querySelector('.profile-environment--studio');
        return {
          name: Boolean(preview?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')),
          border: Boolean(preview?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')),
          avatarLayers: preview?.querySelectorAll('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas').length || 0,
          atmosphere: Boolean(environment?.querySelector('[data-atmosphere="prism-dust"] canvas')),
          cursor: Boolean(environment?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')),
          environmentCount: document.querySelectorAll('.profile-environment').length,
          motion: Boolean(preview?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three'))
        };
      })()`);
      assert(approvedStudioEffects.name && approvedStudioEffects.border && approvedStudioEffects.avatarLayers === 2 && approvedStudioEffects.atmosphere && approvedStudioEffects.cursor && approvedStudioEffects.environmentCount === 1 && approvedStudioEffects.motion, `Approved effects did not mount completely in Studio: ${JSON.stringify(approvedStudioEffects)}.`);
    }
    const studioNameEffect = await page.evaluate(`(() => {
      const card = document.querySelector('.profile-studio-preview .profile-reference-card');
      const name = card?.querySelector('.profile-reference-card__name');
      const avatar = card?.querySelector('.profile-reference-card__avatar, .profile-reference-card__avatar-fallback');
      const box = card?.getBoundingClientRect();
      return {
        card: Boolean(card),
        name: Boolean(name),
        avatar: Boolean(avatar),
        cardWidth: box?.width || 0,
        selected: Object.fromEntries(['cosmetic-name_font', 'cosmetic-name_material', 'cosmetic-name_motion', 'cosmetic-avatar-effect', 'cosmetic-profile-border', 'cosmetic-profile-atmosphere', 'cosmetic-cursor-trail'].map(id => [id, document.getElementById(id)?.value || '']))
      };
    })()`);
    assert(studioNameEffect.card && studioNameEffect.name && studioNameEffect.avatar && studioNameEffect.cardWidth >= 300, `Active Studio reference card is incomplete: ${JSON.stringify(studioNameEffect)}.`);
    if (approvedEffectSmoke) {
      const publishPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-studio-shell__publish')].find(button => !button.disabled))`);
      if (publishPending) {
        await page.clickText('Publish profile', { description: 'publish approved effects fixture' });
        await page.waitFor(`document.querySelector('.profile-studio-header__message')?.textContent?.trim() === 'Profile published.'`, 'published approved effects fixture');
      }
      const publicEvidence = await capturePublishedLayouts();
      return { studioNameEffect, approvedStudioEffects, publicEvidence, approvedEffects: true };
    }
    await page.evaluate(`(() => {
      document.querySelector('#customize-identity')?.scrollIntoView({ block: 'start' });
    })()`);
    await page.setInputValue('#profile-bio', RICH_PROFILE_FIXTURE.bio, ['input']);
    try {
      await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card__bio')?.textContent?.trim() === ${JSON.stringify(RICH_PROFILE_FIXTURE.bio)}`, 'identity draft in live preview');
    } catch (error) {
      const identityPreviewState = await page.evaluate(`(() => ({
        editorBio: document.querySelector('#profile-bio')?.value || '',
        previewBio: document.querySelector('.profile-studio-preview .profile-reference-card__bio')?.textContent?.trim() || '',
        previewName: document.querySelector('.profile-studio-preview .profile-reference-card__name')?.textContent?.trim() || '',
        previewText: document.querySelector('.profile-studio-preview .profile-reference-card')?.textContent?.trim() || '',
        previewCards: document.querySelectorAll('.profile-studio-preview .profile-reference-card').length
      }))()`);
      throw new Error(`${error.message} State: ${JSON.stringify(identityPreviewState)}`, { cause: error });
    }
    const originalTextColor = await page.evaluate(`document.querySelector('[data-color-role="text"] .appearance-editor__hex')?.value || '#F4F6FB'`);
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', '#12ABEF', ['input']);
    await page.waitFor(`document.querySelector('[data-color-role="text"] .appearance-editor__hex')?.value?.toUpperCase() === '#12ABEF'`, 'color draft in Studio editor');
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', originalTextColor, ['input']);
    const originalBackgroundColor = await page.evaluate(`document.querySelector('[data-color-role="background"] .appearance-editor__hex')?.value || '#07080B'`);
    await page.setInputValue('[data-color-role="background"] .appearance-editor__hex', '#123456', ['input']);
    await page.waitFor(`document.querySelector('[data-color-role="background"] .appearance-editor__hex')?.value?.toUpperCase() === '#123456'`, 'background color draft in Studio editor');
    await page.setInputValue('[data-color-role="background"] .appearance-editor__hex', originalBackgroundColor, ['input']);
    const originalSurfaceColor = await page.evaluate(`document.querySelector('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex')?.value || '#11141B'`);
    const surfacePlacement = await page.evaluate(`({
      inColorMatrix: Boolean(document.querySelector('.appearance-editor__color-grid [data-color-role="surface"]')),
      inSurfaceSection: Boolean(document.querySelector('.appearance-editor__surface-grid [data-color-role="surface"]'))
    })`);
    assert(!surfacePlacement.inColorMatrix && surfacePlacement.inSurfaceSection, `Profile surface color is not grouped with surface depth: ${JSON.stringify(surfacePlacement)}.`);
    await page.setInputValue('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex', '#234567', ['input']);
    await page.waitFor(`document.querySelector('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex')?.value?.toUpperCase() === '#234567'`, 'surface color draft in Studio editor');
    const surfaceBeforeUnrelatedEdit = await page.evaluate(`(() => {
      const card = document.querySelector('.profile-studio-preview .profile-reference-card');
      const style = card ? getComputedStyle(card) : null;
      return style ? { backgroundColor: style.backgroundColor, backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none', borderRadius: style.borderRadius } : null;
    })()`);
    const unrelatedTextColor = await page.evaluate(`document.querySelector('[data-color-role="text"] .appearance-editor__hex')?.value || '#F4F6FB'`);
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', '#12ABEF', ['input']);
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-reference-card')`, 'reference card survives unrelated appearance edit');
    const surfaceAfterUnrelatedEdit = await page.evaluate(`(() => {
      const card = document.querySelector('.profile-studio-preview .profile-reference-card');
      const style = card ? getComputedStyle(card) : null;
      return style ? { backgroundColor: style.backgroundColor, backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none', borderRadius: style.borderRadius } : null;
    })()`);
    assert(JSON.stringify(surfaceAfterUnrelatedEdit) === JSON.stringify(surfaceBeforeUnrelatedEdit), `Unrelated text edit changed the reference card surface: ${JSON.stringify({ before: surfaceBeforeUnrelatedEdit, after: surfaceAfterUnrelatedEdit })}.`);
    const originalBackgroundBlur = await page.evaluate(`document.querySelector('.profile-background-treatment input[type="range"]')?.value || '0'`);
    await page.click('#profile-customize-tab-media', 'switch to Media background treatment');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-media') && document.querySelector('.profile-background-treatment input[type="range"]')`, 'visible Media background treatment');
    await page.setInputValue('.profile-background-treatment input[type="range"]', 27, ['input']);
    await page.waitFor(`document.querySelector('.profile-background-treatment output')?.textContent?.trim() === '27px'`, 'background treatment blur draft value');
    const surfaceAfterBackgroundEdit = await page.evaluate(`(() => {
      const environment = document.querySelector('.profile-environment--studio');
      const style = environment ? getComputedStyle(environment) : null;
      return { backgroundBlur: style?.getPropertyValue('--profile-background-blur').trim() || '' };
    })()`);
    assert(surfaceAfterBackgroundEdit.backgroundBlur === '27px', `Background treatment did not update its own render field: ${JSON.stringify(surfaceAfterBackgroundEdit)}.`);
    const surfaceFieldsBeforeCrossEditor = { ...surfaceAfterBackgroundEdit };
    await page.click('#profile-customize-tab-appearance', 'switch back to Appearance');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-appearance')`, 'visible Appearance editor after Media');
    await page.setInputValue('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex', '#345678', ['input']);
    await page.waitFor(`document.querySelector('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex')?.value?.toUpperCase() === '#345678'`, 'surface remains editable after Media treatment');
    const backgroundAfterSurfaceEdit = await page.evaluate(`(() => ({
      blur: getComputedStyle(document.querySelector('.profile-environment--studio')).getPropertyValue('--profile-background-blur').trim() || ''
    }))()`);
    assert(backgroundAfterSurfaceEdit.blur === surfaceFieldsBeforeCrossEditor.backgroundBlur, `Appearance edit overwrote Media background treatment: ${JSON.stringify({ before: surfaceFieldsBeforeCrossEditor, after: backgroundAfterSurfaceEdit })}.`);
    const surfaceAfterCrossEditor = await page.evaluate(`(() => {
      const card = document.querySelector('.profile-studio-preview .profile-reference-card');
      const style = card ? getComputedStyle(card) : null;
      return style ? { backgroundColor: style.backgroundColor, backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none', borderRadius: style.borderRadius } : null;
    })()`);
    assert(surfaceAfterCrossEditor?.backdropFilter === surfaceBeforeUnrelatedEdit?.backdropFilter && surfaceAfterCrossEditor?.borderRadius === surfaceBeforeUnrelatedEdit?.borderRadius, `Cross-editor surface state changed the reference card presentation: ${JSON.stringify({ before: surfaceBeforeUnrelatedEdit, after: surfaceAfterCrossEditor })}.`);
    await page.click('#profile-customize-tab-media', 'restore Media background treatment');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && document.querySelector('.profile-background-treatment input[type="range"]')`, 'Media restore tab');
    const preservedBackgroundTreatment = await page.evaluate(`document.querySelector('.profile-background-treatment input[type="range"]')?.value || ''`);
    assert(preservedBackgroundTreatment === '27', `Media background treatment did not survive the Appearance tab remount: ${JSON.stringify({ expected: '27', actual: preservedBackgroundTreatment })}.`);
    await page.setInputValue('.profile-background-treatment input[type="range"]', Number(originalBackgroundBlur), ['input']);
    await page.click('#profile-customize-tab-appearance', 'restore Appearance tab');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true'`, 'Appearance restore tab');
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', unrelatedTextColor, ['input']);
    await page.setInputValue('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex', originalSurfaceColor, ['input']);
    const publishRequestsBefore = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2') || request.url.includes('publish_profile_studio_v2')).length;
    await page.setInputValue('.appearance-editor__surface-grid .appearance-editor__range:nth-child(4) input[type="range"]', 40, ['input']);
    await page.waitFor(`document.querySelector('.appearance-editor__surface-grid .appearance-editor__range:nth-child(4) output')?.textContent?.trim() === '40px'`, 'blur draft value');
    const publishRequestsAfter = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2') || request.url.includes('publish_profile_studio_v2')).length;
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
    assert(identityLayout.bio && identityLayout.behavior && identityLayout.behavior.top >= identityLayout.bio.bottom - 8, `Bio does not reach the behavior row: ${JSON.stringify(identityLayout)}.`);
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
    await page.waitFor(`document.querySelector('.profile-studio-header__message')?.textContent?.trim() === 'Profile published.'`, 'published profile appearance');
    const immediatePublishedMedia = await assertPublishedExpressionVisible('surface publish');
    const publishedState = await page.evaluate(`({
      publishDisabled: [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Publish profile')?.disabled ?? null,
      status: document.querySelector('.profile-studio-header__message')?.textContent?.trim() || ''
    })`);
    const publishRequests = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2') || request.url.includes('publish_profile_studio_v2')).length;
    assert(publishedState.publishDisabled === true, 'Publishing did not clear the dashboard draft state.');
    assert(publishRequests > publishRequestsAfter, 'Publishing the surface depth did not call the configuration RPCs.');
    const richPublished = await publishRichProfileDraft();
    // The fixture is seeded through the authenticated RPC boundary so the
    // browser exercises real uploaded media/cosmetic entitlements. Rehydrate
    // Studio before rotating layouts; this mirrors a user returning to the
    // editor and ensures the mounted layout editor receives the canonical six
    // links rather than the pre-fixture empty draft it was first mounted with.
    await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'rehydrate rich layout editor');
    await page.waitFor(`location.pathname === '/profile/settings' && document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true'`, 'rehydrate rich layout editor');
    await waitForStudioReferenceCard('rehydrated rich reference-card preview');
    // The route first paints the empty editor context, then replaces it with
    // the authenticated V2 draft. Wait for the canonical opening projection so
    // the visitor-path assertion cannot sample that intentional loading state.
    const compactOpeningLinkCount = RICH_PROFILE_FIXTURE.links.length;
    await page.waitFor(`document.querySelectorAll('.profile-studio-preview .profile-reference-card__links a').length === ${compactOpeningLinkCount}`, 'rehydrated rich reference links');
    const visitorPreviewState = await page.evaluate(`(() => ({
      rollSummary: Boolean(document.querySelector('.profile-studio-preview [data-profile-widget="roll"][data-profile-widget-mode="summary"]')),
      interactiveRoll: Boolean(document.querySelector('.profile-studio-preview .profile-daily-roll, .profile-studio-preview .profile-roll, .profile-studio-preview .today-color, .profile-studio-preview .profile-roll__reveal-button, .profile-studio-preview .profile-roll__result-actions')),
      rollWidget: Boolean(document.querySelector('.profile-studio-preview [data-profile-widget="roll"]')),
      ownerRoll: false,
      links: document.querySelectorAll('.profile-studio-preview .profile-reference-card__links a').length,
      continuationLinks: 0,
      profileMore: false,
      oldRenderer: Boolean(document.querySelector('.profile-studio-preview .profile-shell-page, .profile-studio-preview .profile-template-picker'))
    }))()`);
    assert(visitorPreviewState.rollSummary && visitorPreviewState.rollWidget && !visitorPreviewState.interactiveRoll && !visitorPreviewState.ownerRoll && visitorPreviewState.links === compactOpeningLinkCount && !visitorPreviewState.oldRenderer, `Studio did not use the focused reference-card preview path: ${JSON.stringify(visitorPreviewState)}.`);
    const publicEvidence = await capturePublishedLayouts();
    return { draftState, publishedState, immediatePublishedMedia, mediaPublishRegression, identityLayout, publishRequests, mediaRail, studioNameEffect, approvedStudioEffects, richFixture, richPublished, publicEvidence };
  });

  await step('narrow mobile layout contains the dashboard and restores keyboard focus', async () => {
    await page.setViewport(390, 844);
    await page.waitFor(`document.querySelector('.profile-studio-preview__devices button:nth-child(2)')`, 'live preview device controls');
    await page.click('.profile-studio-preview__devices button:nth-child(2)', 'mobile live preview device');
    await page.waitFor(`document.querySelector('.profile-studio-preview__canvas--mobile .profile-reference-card')`, 'bounded mobile live preview');
    const mobilePreview = await page.evaluate(`(() => {
      const canvas = document.querySelector('.profile-studio-preview__canvas');
      const phone = canvas?.querySelector('.profile-studio-preview__viewport');
      const card = phone?.querySelector('.profile-reference-card');
      const name = card?.querySelector('.profile-reference-card__name');
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
        device: canvas?.classList.contains('profile-studio-preview__canvas--mobile') ? 'mobile' : 'desktop',
        viewport: innerWidth,
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
    assert((mobilePreview.phone?.width || 0) <= (mobilePreview.viewport || 0) - 20 && (mobilePreview.card?.width || 0) > 200, `Mobile live preview is not a bounded phone canvas: ${JSON.stringify(mobilePreview)}.`);
    assert(!mobilePreview.overflow.length && mobilePreview.phoneScrollWidth <= mobilePreview.phoneClientWidth + 1 && mobilePreview.nameScrollWidth <= mobilePreview.nameClientWidth + 1, `Mobile live preview has horizontal content overflow: ${JSON.stringify(mobilePreview)}.`);
    await page.waitFor(`document.querySelector('.profile-studio-shell__menu-trigger')`, 'Profile Studio More menu');
    const closed = await page.evaluate(`(() => {
      const trigger = document.querySelector('.profile-studio-shell__menu-trigger');
      return {
        visible: Boolean(trigger && trigger.getBoundingClientRect().width > 0),
        contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1,
        menuHidden: !document.querySelector('.profile-studio-shell__more-menu'),
        expanded: trigger?.getAttribute('aria-expanded')
      };
    })()`);
    assert(closed.visible, 'Profile Studio More menu trigger is not visible.');
    assert(closed.contained, 'Profile Studio overflows horizontally on mobile.');
    assert(closed.menuHidden && closed.expanded === 'false', `Profile Studio More menu is not initially closed: ${JSON.stringify(closed)}.`);
    await page.click('.profile-studio-shell__menu-trigger', 'Profile Studio More menu trigger');
    await page.waitFor(`document.querySelector('.profile-studio-shell__menu-trigger')?.getAttribute('aria-expanded') === 'true' && document.activeElement?.closest('.profile-studio-shell__more-menu')`, 'opened Profile Studio More menu focus');
    const opened = await page.evaluate(`(() => ({ expanded: document.querySelector('.profile-studio-shell__menu-trigger')?.getAttribute('aria-expanded'), focusedInMenu: Boolean(document.activeElement?.closest('.profile-studio-shell__more-menu')), items: document.querySelectorAll('.profile-studio-shell__more-menu [role="menuitem"]').length }))()`);
    await page.pressKey('Escape');
    await page.waitFor(`document.querySelector('.profile-studio-shell__menu-trigger')?.getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector('.profile-studio-shell__menu-trigger')`, 'More menu Escape focus restoration');
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

    const viewports = [
      [320, 568], [360, 640], [390, 844], [414, 896], [430, 932],
      [480, 900], [520, 900], [524, 900], [544, 900], [576, 900],
      [600, 960], [667, 375], [768, 1024], [1024, 768], [1100, 700],
      [1280, 720], [1366, 768], [1440, 900], [1920, 1080]
    ];
    const measurements = [];
    const customizeTabs = ['appearance', 'media', 'links', 'layout'];

    for (const [width, height] of viewports) {
      await page.setViewport(width, height);
      await page.waitFor(`document.querySelector('.studio-customize') && document.querySelector('.profile-studio-header__customize-tabs')`, `Customize at ${width}px`);
      if (width > 1024) {
        await page.waitFor('document.querySelector(".profile-studio-preview__devices button")', `narrow-desktop preview at ${width}px`);
        await page.click('.profile-studio-preview__devices button:first-child', `desktop preview mode at ${width}px`);
      }
      for (const tab of customizeTabs) {
        await page.click(`#profile-customize-tab-${tab}`, `${tab} tab at ${width}px`);
        await page.waitFor(`document.querySelector('#profile-customize-tab-${tab}')?.getAttribute('aria-selected') === 'true' && document.querySelector('#customize-${tab === 'appearance' ? 'appearance' : tab}')`, `${tab} panel at ${width}px`);
        if (tab === 'appearance') {
          await page.waitFor('document.querySelector(".profile-cosmetics-studio-grid")', `Profile effects at ${width}px`);
        }
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
          const candidates = [...document.querySelectorAll('.profile-studio-header__customize-tabs, .profile-studio-header__customize-tabs [role="tab"], .profile-studio-shell__publish, #customize-appearance, #customize-media, #customize-links, #customize-layout, input, select, textarea, [role="slider"]')]
            .filter(visible);
          const overflow = candidates
            .map(element => ({ element, box: element.getBoundingClientRect() }))
            .filter(({ box }) => box.left < -1 || box.right > innerWidth + 1)
            .slice(0, 8)
            .map(({ element, box }) => ({ selector: element.className || element.tagName, tag: element.tagName, type: element.getAttribute('type') || '', aria: element.getAttribute('aria-label') || '', parent: element.parentElement?.className || '', left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) }));
          const activePanel = document.querySelector('#customize-${tab === 'appearance' ? 'appearance' : tab}');
          const preview = document.querySelector('#profile-studio-preview');
          const previewBox = preview?.getBoundingClientRect();
          const activeBox = activePanel?.getBoundingClientRect();
          const previewCanvas = preview?.querySelector('.profile-studio-preview__canvas');
          const previewCard = preview?.querySelector('.profile-reference-card');
          const previewCopy = previewCard?.querySelector('.profile-reference-card__bio');
          const previewSemantic = previewCard?.querySelector('.profile-reference-card__name');
          const previewCanvasBox = previewCanvas?.getBoundingClientRect();
          const previewCardBox = previewCard?.getBoundingClientRect();
          const visualGrid = document.querySelector('.profile-cosmetics-studio-grid');
          const visualCards = [...(visualGrid?.querySelectorAll(':scope > .profile-cosmetics-studio-card') || [])];
          const cosmeticsSurface = document.querySelector('.profile-cosmetics-surface--studio');
          const cosmeticsControls = document.querySelector('.profile-cosmetics-studio-grid');
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
            actions: rect(document.querySelector('.profile-studio-shell__publish')),
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
              copyClientWidth: previewCopy?.clientWidth || 0,
              semanticScrollWidth: previewSemantic?.scrollWidth || 0,
              semanticClientWidth: previewSemantic?.clientWidth || 0
            } : null,
            effects: visualGrid ? {
              columns: new Set(visualCards.map(card => Math.round(card.getBoundingClientRect().left))).size,
              cardWidths: visualCards.map(card => Math.round(card.getBoundingClientRect().width)),
              cardBoxes: visualCards.map(card => rect(card)),
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
        assert(state.tabs.length === 4 && state.tabs.every(tabRect => tabRect && tabRect.left >= -1 && tabRect.right <= width + 1), `Customize tabs escape the viewport at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        assert((state.activePanel?.width || 0) > 0, `Customize panel has no width at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        assert(!state.previewOverlap, `Live preview overlaps the editor at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        if (tab === 'appearance' && width === 524) {
          assert(state.effects?.columns === 1 && state.effects.cardWidths.every(cardWidth => cardWidth >= 260), `Profile effects did not switch to readable Studio rows at the 524px breakpoint: ${JSON.stringify(state.effects)}.`);
        }
        if (tab === 'appearance' && width === 390) {
          assert(state.effects?.columns === 1 && state.effects.cardWidths.every(cardWidth => cardWidth >= 260), `Visual Effects did not switch to readable phone rows at 390px: ${JSON.stringify(state.effects)}.`);
        }
        if (width > 1024) {
          // The reference card has a one-pixel border on both sides. Chromium
          // reports that painted edge in scrollWidth while clientWidth stops
          // at the inner padding box; allow that bounded four-pixel envelope
          // without weakening the document-level overflow assertion above.
          assert(['block', 'flex', 'grid'].includes(state.previewLayout?.display) && state.previewLayout.cardWidth <= state.previewLayout.canvasWidth + 1 && state.previewLayout.cardScrollWidth <= state.previewLayout.cardClientWidth + 4 && state.previewLayout.semanticScrollWidth <= state.previewLayout.semanticClientWidth + 1, `Narrow desktop preview card is not readable at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
        }
        if (width === 1100 && tab === 'appearance') await capture('08-responsive-narrow-desktop');
        measurements.push({ width, tab, ...state });
      }
    }

    await page.setViewport(414, 896);
    await page.click('#profile-customize-tab-appearance', 'Appearance before narrow mobile navigation audit');
    await page.waitFor('document.querySelector(".studio-customize")', 'Appearance at 414px');
    const drawer = await page.evaluate(`(() => {
      const shell = document.querySelector('.profile-studio-shell');
      const more = document.querySelector('.profile-studio-shell__menu-trigger');
      return {
        viewport: innerWidth,
        left: more ? Math.round(more.getBoundingClientRect().left) : null,
        right: more ? Math.round(more.getBoundingClientRect().right) : null,
        buttons: shell?.querySelectorAll('.profile-studio-shell__menu-trigger').length || 0,
        contained: Boolean(more && more.getBoundingClientRect().left >= -1 && more.getBoundingClientRect().right <= innerWidth + 1),
        moreClosed: more?.getAttribute('aria-expanded') === 'false'
      };
    })()`);
    assert(drawer.contained && drawer.buttons === 1 && drawer.moreClosed, `Narrow mobile navigation is not usable at 414px: ${JSON.stringify(drawer)}.`);
    await page.click('.profile-studio-shell__menu-trigger', 'open narrow mobile More menu');
    await page.waitFor('document.querySelector(".profile-studio-shell__more-menu")', 'open narrow mobile More menu state');
    const mobileMore = await page.evaluate(`(() => {
      const menu = document.querySelector('.profile-studio-shell__more-menu');
      const box = menu?.getBoundingClientRect();
      return { items: menu?.querySelectorAll('[role="menuitem"]').length || 0, contained: Boolean(box && box.left >= -1 && box.right <= innerWidth + 1) };
    })()`);
    assert(mobileMore.contained && mobileMore.items >= 4, `Narrow mobile More menu is not usable at 414px: ${JSON.stringify(mobileMore)}.`);
    await page.pressKey('Escape');
    await page.waitFor('!document.querySelector(".profile-studio-shell__more-menu")', 'close narrow mobile More menu');

    await page.setViewport(600, 844);
    await page.waitFor(`matchMedia('(max-width: 64rem)').matches && document.querySelector('.profile-studio-shell__mobile-tools button')`, 'tablet mobile viewport state');
    if (await page.evaluate('Boolean(document.querySelector(".profile-studio-preview"))')) {
      await page.click('.profile-studio-preview__close', 'close preview before tablet preview drawer audit');
      await page.waitFor('!document.querySelector(".profile-studio-preview")', 'closed preview before tablet preview drawer audit');
    }
    await page.click('#profile-customize-tab-appearance', 'Appearance before preview drawer audit');
    await page.waitFor('document.querySelector(".profile-studio-shell__mobile-tools button")', 'mobile preview toggle');
    await page.click('.profile-studio-shell__mobile-tools button', 'open tablet live preview');
    await delay(100);
    const tabletToggle = await page.evaluate(`(() => {
      const button = document.querySelector('.profile-studio-shell__mobile-tools button');
      return {
        ariaExpanded: button?.getAttribute('aria-expanded') || '',
        text: button?.textContent?.trim() || '',
        disabled: Boolean(button?.disabled),
        outerHTML: button?.outerHTML || '',
        activeSection: document.querySelector('[data-section].active')?.getAttribute('data-section') || '',
        selectedTab: document.querySelector('.profile-studio-header__tablist [role="tab"][aria-selected="true"]')?.id || '',
        customizePanel: Boolean(document.querySelector('#profile-customize-tabpanel')),
        preview: Boolean(document.querySelector('.profile-studio-preview'))
      };
    })()`);
    assert(tabletToggle.ariaExpanded === 'true', `Tablet preview toggle did not open: ${JSON.stringify(tabletToggle)}.`);
    await page.waitFor('document.querySelector("#profile-studio-preview")', 'tablet live preview');
    await delay(240);
    const tabletPreview = await page.evaluate(`(() => {
      const preview = document.querySelector('#profile-studio-preview');
      const box = preview?.getBoundingClientRect();
      return {
        viewport: innerWidth,
        left: box ? Math.round(box.left) : null,
        right: box ? Math.round(box.right) : null,
        top: box ? Math.round(box.top) : null,
        bottom: box ? Math.round(box.bottom) : null,
        width: box ? Math.round(box.width) : null,
        height: box ? Math.round(box.height) : null,
        contained: Boolean(box && box.left >= -1 && box.right <= innerWidth + 1),
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(tabletPreview.contained && tabletPreview.pageContained, `Tablet live preview escapes its responsive document bounds: ${JSON.stringify(tabletPreview)}.`);
    await page.click('.profile-studio-preview__close', 'close tablet live preview');
    await page.waitFor('!document.querySelector("#profile-studio-preview")', 'closed tablet live preview');

    await page.setViewport(414, 896);
    await page.waitFor('document.querySelector(".profile-studio-shell__mobile-tools button")', 'phone preview toggle');
    await page.click('.profile-studio-shell__mobile-tools button', 'open phone live preview');
    await page.waitFor('document.querySelector("#profile-studio-preview")', 'phone live preview');
    await delay(240);
    const phonePreview = await page.evaluate(`(() => {
      const preview = document.querySelector('#profile-studio-preview');
      const previewBox = preview?.getBoundingClientRect();
      const canvas = preview?.querySelector('.profile-studio-preview__canvas');
      const card = preview?.querySelector('.profile-reference-card');
      const copy = card?.querySelector('.profile-reference-card__bio');
      const semantic = card?.querySelector('.profile-reference-card__name');
      return {
        viewport: innerWidth,
        preview: previewBox ? { left: Math.round(previewBox.left), right: Math.round(previewBox.right), top: Math.round(previewBox.top), bottom: Math.round(previewBox.bottom), width: Math.round(previewBox.width), height: Math.round(previewBox.height) } : null,
        card: card ? { display: getComputedStyle(card).display, width: Math.round(card.getBoundingClientRect().width), scrollWidth: card.scrollWidth, clientWidth: card.clientWidth } : null,
        canvasWidth: Math.round(canvas?.getBoundingClientRect().width || 0),
        copy: copy ? { scrollWidth: copy.scrollWidth, clientWidth: copy.clientWidth, textScrollWidth: semantic?.scrollWidth || 0, textClientWidth: semantic?.clientWidth || 0 } : null,
        contained: Boolean(previewBox && previewBox.left >= -1 && previewBox.right <= innerWidth + 1),
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    // NameEffectCanvas intentionally paints a bounded visual bleed around the
    // semantic text. The phone/page bounds are the overflow contract; the
    // semantic text itself must remain contained.
    assert(phonePreview.contained && phonePreview.pageContained && ['block', 'flex', 'grid'].includes(phonePreview.card?.display) && phonePreview.card.clientWidth >= 200 && phonePreview.card.width <= phonePreview.canvasWidth + 1 && phonePreview.card.scrollWidth <= phonePreview.card.clientWidth + 40 && (!phonePreview.copy || phonePreview.copy.textScrollWidth <= phonePreview.copy.textClientWidth + 1), `Phone live preview is not a readable bounded surface: ${JSON.stringify(phonePreview)}.`);
    await capture('09-mobile-preview-414');
    await page.click('.profile-studio-preview__close', 'close phone preview drawer');
    await page.waitFor('!document.querySelector("#profile-studio-preview")', 'closed phone live preview');

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
      const shell = document.querySelector('.profile-studio-shell');
      const tabs = [...document.querySelectorAll('.profile-studio-header__tablist [role="tab"]')].map(rect);
      const actions = rect(document.querySelector('.profile-studio-shell__publish'));
      return {
        viewport: innerWidth,
        mobileClass: shell?.classList.contains('profile-studio-shell--mobile'),
        fieldGeometry,
        overlaps,
        outOfBounds,
        tabs,
        actions,
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    assert(mobileEditor.fieldGeometry.length >= 6 && !mobileEditor.overlaps.length && !mobileEditor.outOfBounds.length && mobileEditor.tabs.length === 4 && mobileEditor.tabs.every(tab => tab && tab.left >= -1 && tab.right <= 415), `Mobile editor is still using desktop geometry at 414px: ${JSON.stringify(mobileEditor)}.`);
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
    assert(['relative', 'sticky'].includes(stickyTabs.position) && stickyTabs.labels.join('|') === 'Appearance|Media|Links|Layout', `Mobile customize tabs are missing or using invalid layout positioning: ${JSON.stringify(stickyTabs)}.`);

    const destinationWidths = [320, 600, 768];
    const destinations = ['overview', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'account'];
    const workspaceDestinationBySection = {
      overview: 'overview',
      premium: 'premium',
      'profile-insights': 'account',
      'profile-notifications': 'account',
      'profile-social': 'account',
      account: 'account'
    };
    const destinationMeasurements = [];
    for (const width of destinationWidths) {
      await page.setViewport(width, 844);
      for (const destination of destinations) {
        const destinationUrl = `${appUrl}/profile/settings#${destination}`;
        const workspaceDestination = workspaceDestinationBySection[destination] || destination;
        // A previous editor assertion may intentionally leave a draft source
        // dirty even after the layout draft was published. Navigate through
        // the real production guard and discard that disposable smoke draft if
        // it appears, rather than allowing the guard to turn into a timeout.
        await page.command('Page.navigate', { url: destinationUrl });
        await page.waitFor(`Boolean(document.querySelector('.profile-studio-dirty-prompt')) || (document.readyState === 'complete' && location.pathname === '/profile/settings' && document.querySelector('.profile-studio-workspace[data-section-destination="${workspaceDestination}"]'))`, `${destination} navigation request at ${width}px`, 30000);
        if (await page.evaluate('Boolean(document.querySelector(".profile-studio-dirty-prompt"))')) {
          await page.click('.profile-studio-dirty-prompt__discard', `${destination} discard smoke draft`);
        }
        if (await page.evaluate('document.querySelector(".profile-studio-shell__menu-trigger")?.getAttribute("aria-expanded") !== "true"')) {
          await page.click('.profile-studio-shell__menu-trigger', `${destination} More menu`);
        }
        await page.waitFor(`document.querySelector('.profile-studio-shell__more-menu button.active[data-section="${destination}"]') && document.querySelector('.profile-studio-workspace[data-section-destination="${workspaceDestination}"]')`, `${destination} destination at ${width}px`, 30000);
        await delay(80);
        const state = await page.evaluate(`(() => {
          const visible = element => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
          };
          const workspace = document.querySelector('.profile-studio-workspace');
          const box = workspace?.getBoundingClientRect();
          const overflow = [...document.querySelectorAll('.profile-studio-workspace, .profile-studio-workspace *')]
            .filter(element => visible(element))
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

    return { viewports, measurements, drawer, tabletToggle, tabletPreview, phonePreview, destinationMeasurements };
  });

  await step('dedicated Progression keeps its own route and responsive journey surface', async () => {
    const viewports = [
      [390, 844],
      [768, 1024],
      [1440, 900]
    ];
    const measurements = [];

    for (const [width, height] of viewports) {
      await page.setViewport(width, height);
      await page.navigate(`${appUrl}/progression`, `Progression at ${width}x${height}`);
      await page.waitFor(`location.pathname === '/progression' && document.querySelector('.progression-page')`, `Progression route at ${width}px`, 30000);
      await page.waitFor('document.querySelector(".progression-page__account-bar, .progression-page__state")', `Progression content at ${width}px`, 30000);
      const state = await page.evaluate(`(() => {
        const pageElement = document.querySelector('.progression-page');
        const shell = document.querySelector('.progression-page__shell');
        const mainSurface = document.querySelector('.profile-progression-surface--page');
        const overflow = [...document.querySelectorAll('.progression-page, .progression-page *')]
          .map(element => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.left < -1 || box.right > innerWidth + 1))
          .slice(0, 8)
          .map(({ element, box }) => ({ selector: element.className || element.tagName, left: Math.round(box.left), right: Math.round(box.right) }));
        return {
          path: location.pathname,
          headerCount: document.querySelectorAll('.site-mode-header').length,
          page: pageElement ? { width: Math.round(pageElement.getBoundingClientRect().width), height: Math.round(pageElement.getBoundingClientRect().height) } : null,
          shell: shell ? { left: Math.round(shell.getBoundingClientRect().left), right: Math.round(shell.getBoundingClientRect().right) } : null,
          mainSurface: Boolean(mainSurface),
          overflow,
          contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
        };
      })()`);
      assert(state.path === '/progression' && state.headerCount === 1, `Progression did not settle into one shared route header at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.page && state.shell && state.mainSurface, `Progression full-page journey did not render at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.contained && !state.overflow.length, `Progression escapes its viewport at ${width}px: ${JSON.stringify(state)}.`);
      measurements.push({ width, height, ...state });
    }

    await capture('11-progression-responsive');
    return { viewports, measurements };
  });

  await step('production Leaderboard keeps its route shell and row geometry bounded', async () => {
    const viewports = [
      [390, 844],
      [524, 900],
      [768, 1024],
      [1024, 768],
      [1440, 900],
      [1746, 896]
    ];
    const measurements = [];

    for (const [width, height] of viewports) {
      await page.setViewport(width, height);
      await page.navigate(`${appUrl}/leaderboard`, `Leaderboard at ${width}x${height}`);
      await page.waitFor(`location.pathname === '/leaderboard' && document.querySelector('.roll-leaderboard')`, `Leaderboard shell at ${width}px`, 30000);
      await page.clickText('This month', { description: `Leaderboard monthly tab at ${width}px` });
      await page.waitFor('document.querySelector(".roll-leaderboard__list, .roll-leaderboard__state")', `Leaderboard results at ${width}px`, 30000);
      await delay(120);
      const state = await page.evaluate(`(() => {
        const rect = element => {
          const box = element?.getBoundingClientRect();
          return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
        };
        const shell = document.querySelector('.roll-leaderboard');
        const appShell = document.querySelector('.app-shell--leaderboard');
        const header = document.querySelector('.site-mode-header--leaderboard');
        const list = document.querySelector('.roll-leaderboard__list');
        const empty = document.querySelector('.roll-leaderboard__state');
        const items = [...document.querySelectorAll('.roll-leaderboard__list-item')];
        const entries = [...document.querySelectorAll('.leaderboard-row')];
        const tabs = [...document.querySelectorAll('.roll-leaderboard__tabs button')];
        const visible = element => {
          if (!element) return false;
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const avatarStates = entries.map(entry => {
          const image = entry.querySelector('.leaderboard-row__avatar img');
          const fallback = entry.querySelector('.leaderboard-row__avatar-initial');
          const avatarBox = entry.querySelector('.leaderboard-row__avatar')?.getBoundingClientRect();
          const inViewport = Boolean(avatarBox && avatarBox.bottom > -160 && avatarBox.top < innerHeight + 160);
          return { imageLoaded: Boolean(image?.complete && image.naturalWidth > 0), fallback: visible(fallback), inViewport };
        });
        const outOfShell = [...document.querySelectorAll('.roll-leaderboard__results, .roll-leaderboard__list-item, .leaderboard-row, .roll-leaderboard__tabs button')]
          .map(element => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.left < shell?.getBoundingClientRect().left - 1 || box.right > shell?.getBoundingClientRect().right + 1)
          .slice(0, 8)
          .map(({ element, box }) => ({ selector: element.className || element.tagName, left: box.left, right: box.right }));
        return {
          viewport: [innerWidth, innerHeight],
          shell: rect(shell),
          list: rect(list),
          empty: rect(empty),
          items: items.map(item => ({ box: rect(item) })),
          entries: entries.map(entry => rect(entry)),
          tabs: tabs.map(tab => ({ label: tab.textContent?.trim(), active: tab.getAttribute('aria-selected') === 'true', box: rect(tab) })),
          avatarStates,
          backgroundImage: getComputedStyle(appShell || document.body).backgroundImage,
          headerBackground: header ? getComputedStyle(header).backgroundColor : '',
          outOfShell
        };
      })()`);
      assert(state.shell && state.shell.width >= Math.min(width - 16, 900), `Leaderboard shell is still constrained at ${width}px: ${JSON.stringify(state)}.`);
      const resultSurface = state.list || state.empty;
      assert(resultSurface && resultSurface.left >= state.shell.left - 1 && resultSurface.right <= state.shell.right + 1, `Leaderboard results surface escapes its route shell at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.tabs.length === 2 && state.tabs.some(tab => tab.label === 'This month' && tab.active), `Leaderboard period tabs are not reduced to Today and This month at ${width}px: ${JSON.stringify(state)}.`);
      assert(!state.outOfShell.length, `Leaderboard controls escape its route shell at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.items.every(item => item.box && item.box.left >= state.shell.left - 1 && item.box.right <= state.shell.right + 1), `Leaderboard row wrapper escapes its route shell at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.entries.every(entry => entry && entry.left >= state.shell.left - 1 && entry.right <= state.shell.right + 1), `Leaderboard entry escapes its route shell at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.avatarStates.every(avatar => !avatar.inViewport || avatar.imageLoaded || avatar.fallback), `Leaderboard contains an unloaded visible avatar without a fallback at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.backgroundImage === 'none' || state.backgroundImage.includes('leaderboard-background.webp'), `Leaderboard route surface is neither the current transparent treatment nor the legacy authored asset at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.headerBackground === 'rgba(0, 0, 0, 0)', `Leaderboard header is not transparent at ${width}px: ${JSON.stringify(state)}.`);
      measurements.push({ width, height, ...state });
    }

    await capture('11-leaderboard-responsive');
    return { viewports, measurements };
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
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] [data-profile-reference-card], .profile-shell-page[aria-busy="false"] [data-profile-layout-content="full-bleed"]')`, 'public profile canvas');
    await page.command('Page.reload', { ignoreCache: true });
    await delay(350);
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] [data-profile-reference-card], .profile-shell-page[aria-busy="false"] [data-profile-layout-content="full-bleed"]')`, 'public profile after direct refresh');
    if (approvedEffectSmoke) {
      await page.waitFor(`(() => {
        const shell = document.querySelector('.profile-shell-page[aria-busy="false"]');
        return Boolean(
          shell?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')
            && shell?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')
            && shell?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--back')
            && shell?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--front')
            && shell?.querySelector('[data-atmosphere="prism-dust"] canvas')
            && shell?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')
            && shell?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three')
        );
      })()`, 'approved effects after public refresh');
      await capture('07-approved-public-profile');
      await page.setViewport(390, 844);
      await page.command('Page.reload', { ignoreCache: true });
      await page.waitFor(`(() => {
        const shell = document.querySelector('.profile-shell-page[aria-busy="false"]');
        return Boolean(
          shell?.querySelector('[data-name-motion="name_motion_kinetic_echo"]')
            && shell?.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')
            && shell?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--back')
            && shell?.querySelector('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas--front')
            && shell?.querySelector('[data-atmosphere="prism-dust"] canvas')
            && shell?.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')
            && shell?.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three')
        );
      })()`, 'approved effects after mobile public refresh');
      const approvedPublic = await page.evaluate(`(() => ({
        path: location.pathname,
        viewport: innerWidth,
        effectLayers: {
          name: Boolean(document.querySelector('[data-name-motion="name_motion_kinetic_echo"]')),
          border: Boolean(document.querySelector('[data-profile-border="elastic"] .elastic-frame-effect__path--outer')),
          avatarLayers: document.querySelectorAll('[data-avatar-effect="butterfly-orbit"] .avatar-effect__orbit-canvas').length,
          atmosphere: Boolean(document.querySelector('[data-atmosphere="prism-dust"] canvas')),
          cursor: Boolean(document.querySelector('.cursor-trail-layer[data-trail-key="plasma-swarm"] canvas')),
          motion: Boolean(document.querySelector('[data-profile-motion="halo-offset"] .profile-motion-effect__halo-shell--three'))
        },
        contained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      }))()`);
      assert(approvedPublic.path === `/${canonicalUsername}` && approvedPublic.viewport === 390 && approvedPublic.contained && approvedPublic.effectLayers.avatarLayers === 2 && Object.values(approvedPublic.effectLayers).every(Boolean), `Approved effects did not survive the mobile public refresh: ${JSON.stringify(approvedPublic)}.`);
      await capture('07-approved-public-profile-mobile');
      await page.setViewport(1440, 900);
      return { approvedPublic };
    }
    const state = await page.evaluate(`(() => {
      const pageElement = document.querySelector('.profile-shell-page');
      const card = document.querySelector('.profile-shell-page [data-profile-reference-card], .profile-shell-page [data-profile-layout-content="full-bleed"]');
      const boundary = document.querySelector('.profile-shell-page .profile-reference-card__border, .profile-shell-page .profile-full-bleed__boundary');
      const roll = document.querySelector('.profile-shell-page [data-profile-widget="roll"]');
      const rollSummary = document.querySelector('.profile-shell-page [data-profile-widget="roll"][data-profile-widget-mode="summary"]');
      const interactiveRoll = document.querySelector('.profile-shell-page .profile-daily-roll, .profile-shell-page .profile-roll, .profile-shell-page .today-color, .profile-shell-page .profile-roll__reveal-button, .profile-shell-page .profile-roll__result-actions');
      const pageStyle = getComputedStyle(pageElement);
      const cardStyle = getComputedStyle(card);
      const boundaryStyle = boundary ? getComputedStyle(boundary) : null;
      const rollStyle = roll ? getComputedStyle(roll) : null;
      const pageBox = pageElement?.getBoundingClientRect();
      const media = [...document.querySelectorAll('.profile-environment__image, .profile-environment__video')].map(element => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const environment = element.closest('.profile-environment');
        const environmentStyle = environment ? getComputedStyle(environment) : null;
        const environmentBox = environment?.getBoundingClientRect();
        return {
          position: style.position,
          inset: style.inset,
          width: box.width,
          height: box.height,
          objectFit: style.objectFit,
          containerPosition: environmentStyle?.position || '',
          containerWidth: environmentBox?.width || 0,
          containerHeight: environmentBox?.height || 0,
          naturalWidth: element.naturalWidth || 0,
          naturalHeight: element.naturalHeight || 0,
          complete: element.complete ?? true
        };
      });
      const nameCanvas = document.querySelector('.name-effect-canvas__visual');
      const nameSemantic = document.querySelector('.name-effect-canvas__semantic');
      const nameCanvasBox = nameCanvas?.getBoundingClientRect();
      const nameSemanticBox = nameSemantic?.getBoundingClientRect();
      return {
        path: location.pathname,
        username: location.pathname.slice(1),
        canvas: Boolean(pageElement),
        card: Boolean(card),
        roll: Boolean(roll),
        rollSummary: Boolean(rollSummary),
        interactiveRoll: Boolean(interactiveRoll),
        cardBlur: cardStyle.getPropertyValue('--profile-surface-blur').trim(),
        cardBackdropFilter: cardStyle.backdropFilter || cardStyle.webkitBackdropFilter || '',
        boundary: Boolean(boundary),
        boundaryBackdropFilter: boundaryStyle?.backdropFilter || boundaryStyle?.webkitBackdropFilter || '',
        boundarySurface: Boolean(boundaryStyle && (boundaryStyle.backdropFilter || boundaryStyle.webkitBackdropFilter) !== 'none'),
        boundaryBox: boundary ? { width: boundary.getBoundingClientRect().width, height: boundary.getBoundingClientRect().height } : null,
        pageBlur: pageStyle.getPropertyValue('--profile-surface-blur').trim(),
        // Inline roll summaries intentionally inherit the card's surface
        // tokens. Only flag a blur token when a roll escapes that boundary
        // into the page/continuation layer.
        rollBlur: roll && roll.closest('[data-profile-reference-card], [data-profile-layout-content]')
          ? ''
          : rollStyle?.getPropertyValue('--profile-surface-blur').trim() || '',
        pageBackground: pageStyle.backgroundImage || pageStyle.backgroundColor,
        pageMediaImage: Boolean(document.querySelector('.profile-environment__image')),
        pageBox: pageBox ? { width: pageBox.width, height: pageBox.height } : null,
        media,
        nameEffect: nameCanvas && nameSemantic ? {
          canvasWidth: nameCanvas.width,
          canvasHeight: nameCanvas.height,
          cssWidth: nameCanvasBox?.width || 0,
          cssHeight: nameCanvasBox?.height || 0,
          semanticWidth: nameSemanticBox?.width || 0,
          semanticHeight: nameSemanticBox?.height || 0,
          fontSize: getComputedStyle(nameSemantic).fontSize,
          distance: Math.abs((nameCanvasBox?.left || 0) - (nameSemanticBox?.left || 0)) + Math.abs((nameCanvasBox?.top || 0) - (nameSemanticBox?.top || 0))
        } : null
      };
    })()`);
    const serverConfiguration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
    const serverAppearance = serverConfiguration?.published?.base?.appearance || serverConfiguration?.published?.appearance || {};
    state.serverSurfaceBlur = serverAppearance?.surface?.blur ?? null;
    assert(state.path === `/${canonicalUsername}`, `Public profile was not canonical after refresh: ${state.path}.`);
    assert(state.canvas && state.card && state.boundary, 'Public profile did not render its canvas, identity surface, and border boundary.');
    assert(state.roll && state.rollSummary && !state.interactiveRoll, `Public profile did not render the static daily-roll widget contract: ${JSON.stringify(state)}.`);
    const expectedCardBlur = smokeMode === 'preview' ? '20px' : '40px';
    assert(state.cardBlur === expectedCardBlur, `Public profile identity card did not honor the expected max blur: ${state.cardBlur} (expected ${expectedCardBlur}). State: ${JSON.stringify(state)}`);
    if (state.boundarySurface) {
      assert(state.boundaryBackdropFilter.includes('blur('), 'Public profile identity surface has no computed backdrop blur filter.');
    } else {
      assert(!state.boundaryBackdropFilter || state.boundaryBackdropFilter === 'none', `Cardless public layout unexpectedly owns a backdrop filter: ${state.boundaryBackdropFilter}.`);
    }
    assert(state.pageBox && Math.abs(state.pageBox.width - 1440) <= 1 && Math.abs(state.pageBox.height - 900) <= 1, `Public profile environment does not fill the viewport: ${JSON.stringify(state)}.`);
    for (const media of state.media) {
      assert(media.complete && media.naturalWidth > 0 && media.naturalHeight > 0 && media.position === 'absolute' && media.containerPosition === 'fixed' && media.objectFit === 'cover' && media.width >= 1439 && media.height >= 899 && media.containerWidth >= 1439 && media.containerHeight >= 899, `Public background media is not viewport-bound: ${JSON.stringify(state)}.`);
    }
    if (state.nameEffect) {
      // The visual canvas intentionally extends by the renderer's bounded
      // 18px/12px bleed around the semantic name for glow and motion. Validate
      // that bounded relationship instead of treating the bleed as a layout
      // displacement.
      assert(state.nameEffect.canvasWidth <= 2048 && state.nameEffect.canvasHeight <= 512 && state.nameEffect.cssWidth <= 720 && state.nameEffect.cssHeight < 100 && Number.parseFloat(state.nameEffect.fontSize) >= 12 && state.nameEffect.distance <= 32, `Public effected username geometry is unsafe: ${JSON.stringify(state)}.`);
    }
    assert(!state.pageBlur && !state.rollBlur, 'Public appearance variables leaked outside the card surface.');
    await capture('07-public-profile');
    if (skipMediaMutation) {
      return { ...state, mobile: { skippedMediaMutation: true } };
    }
    await page.setViewport(390, 844);
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] [data-profile-reference-card], .profile-shell-page[aria-busy="false"] [data-profile-layout-content="full-bleed"]')`, 'public profile mobile after direct refresh');
    await page.waitFor(`(() => { const pageElement = document.querySelector('.profile-shell-page[aria-busy="false"]'); const image = pageElement?.querySelector('.profile-environment__image'); return Boolean(pageElement && image?.complete && image.naturalWidth > 0 && image.currentSrc); })()`, 'mobile uploaded background after direct refresh');
    await delay(150);
    await page.waitFor(`(() => { const pageElement = document.querySelector('.profile-shell-page[aria-busy="false"]'); const image = pageElement?.querySelector('.profile-environment__image'); return Boolean(pageElement && image?.complete && image.naturalWidth > 0 && image.currentSrc); })()`, 'stable mobile uploaded background after direct refresh');
    const mobile = await page.evaluate(`(() => {
      const pageElement = document.querySelector('.profile-shell-page');
      const image = document.querySelector('.profile-environment__image');
      const box = image?.getBoundingClientRect();
      const style = image ? getComputedStyle(image) : null;
      const environment = image?.closest('.profile-environment');
      const environmentStyle = environment ? getComputedStyle(environment) : null;
      const environmentBox = environment?.getBoundingClientRect();
      return {
        page: pageElement?.getBoundingClientRect(),
        media: image && box && style ? {
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          position: style.position,
          inset: style.inset,
          objectFit: style.objectFit,
          width: box.width,
          height: box.height,
          containerPosition: environmentStyle?.position || '',
          containerWidth: environmentBox?.width || 0,
          containerHeight: environmentBox?.height || 0
        } : null
      };
    })()`);
    assert(mobile.media && mobile.media.complete && mobile.media.naturalWidth > 0 && mobile.media.position === 'absolute' && mobile.media.containerPosition === 'fixed' && mobile.media.objectFit === 'cover' && mobile.media.width >= 389 && mobile.media.height >= 843 && mobile.media.containerWidth >= 389 && mobile.media.containerHeight >= 843, `Mobile uploaded background did not cover the public viewport: ${JSON.stringify(mobile)}.`);
    await capture('07-public-profile-mobile');
    await page.setViewport(1440, 900);
    return { ...state, mobile };
  });

  await step('critical profile assets load without stale or missing chunks', async () => {
    if (smokeMode !== 'preview') {
      return { developmentMode: true, hashedAssetCheck: 'production-only' };
    }
    const successfulAssetUrls = new Set(page.requestLog
      .filter(request => Number(request.status) > 0 && Number(request.status) < 400)
      .map(request => request.url));
    const benignCancelledAssets = [];
    const failedAssets = page.requestLog.filter(request => {
      let sameOrigin = false;
      try { sameOrigin = new URL(request.url).origin === new URL(appUrl).origin; } catch { /* ignore malformed/third-party telemetry URLs */ }
      const isAsset = /\/assets\/|\.(?:css|js)(?:\?|$)/i.test(request.url);
      if (!sameOrigin || !isAsset) return false;
      // A direct-refresh intentionally replaces the document. Chromium can
      // label a request cancelled by that navigation ERR_NETWORK_CHANGED even
      // when the same immutable hashed asset loaded successfully immediately
      // after. Preserve real failures while avoiding a false red test result.
      if (request.failed && request.errorText === 'net::ERR_NETWORK_CHANGED' && successfulAssetUrls.has(request.url)) {
        benignCancelledAssets.push(request);
        return false;
      }
      return request.failed || Number(request.status) >= 400;
    });
    assert(!failedAssets.length, `Profile build requested missing or failed assets: ${JSON.stringify(failedAssets.slice(0, 8))}.`);
    const state = await page.evaluate(`(() => {
      const sheets = [...document.styleSheets].map(sheet => sheet.href || '').filter(Boolean);
      return {
        sheets,
        missing: ['ProfileShell-'].filter(prefix => !sheets.some(href => href.includes(prefix))),
        canonicalRendererCss: sheets.some(href => /ProfileReferenceCard-|ProfileFullBleedLayout-|ProfilePortfolioLayout-/.test(href))
      };
    })()`);
    const studioPreviewCss = page.requestLog.filter(request => request.url.includes('/assets/ProfileStudioPreview-') && !request.failed && Number(request.status) < 400);
    assert(!state.missing.length && state.canonicalRendererCss && studioPreviewCss.length > 0, `Critical profile CSS was not active or did not load during Studio: ${JSON.stringify({ ...state, studioPreviewCss })}.`);
    return {
      failedAssets,
      benignCancelledAssets,
      activePublicSheets: state.sheets.filter(href => /ProfileShell-|ProfileReferenceCard-|ProfileFullBleedLayout-|ProfilePortfolioLayout-/.test(href)),
      studioPreviewCss: studioPreviewCss.map(request => ({ url: request.url, status: request.status }))
    };
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
