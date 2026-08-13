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
  startVite,
  startVitePreview,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';
import { isReservedRouteSegment } from '../../src/lib/routeContract.js';
import { isProtectedUsername } from '../../src/lib/usernamePolicy.js';
import { isProfileSocialLink } from '../../src/lib/profileLinkTypes.js';
import { RICH_PROFILE_FIXTURE } from './profile-rich-fixture.mjs';

const environment = await loadLocalEnvironment();
const execFileAsync = promisify(execFile);

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
let appUrl = '';
let canonicalUsername = '';
let localServiceRoleKey = '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedLayoutLinks(layout) {
  const openingSocial = RICH_PROFILE_FIXTURE.links.filter(link => isProfileSocialLink(link.type)).slice(0, 6);
  const customOpeningLimit = layout === 'minimal' ? 2 : 0;
  const customOpening = RICH_PROFILE_FIXTURE.links
    .filter(link => !isProfileSocialLink(link.type))
    .slice(0, Math.min(customOpeningLimit, 6 - openingSocial.length));
  const opening = [...openingSocial, ...customOpening];
  const openingSet = new Set(opening);
  return {
    opening: RICH_PROFILE_FIXTURE.links.filter(link => openingSet.has(link)),
    continuation: RICH_PROFILE_FIXTURE.links.filter(link => !openingSet.has(link))
  };
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
  const configuredKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
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
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
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

async function latestRpcPayload(functionName) {
  const request = [...(page?.requestLog || [])]
    .reverse()
    .find(entry => entry.method === 'POST' && entry.url.endsWith(`/rpc/${functionName}`));
  if (!request?.requestId) return null;
  try {
    const result = await page.command('Network.getRequestPostData', { requestId: request.requestId });
    const payload = JSON.parse(result.postData || '{}');
    const draft = payload?.p_draft;
    return draft && typeof draft === 'object'
      ? {
          version: draft.version,
          layout: draft.base?.layoutVariant || draft.layoutVariant || null,
          links: Array.isArray(draft.links) ? draft.links.length : null,
          baseLinks: Array.isArray(draft.base?.links) ? draft.base.links.length : null,
          surfaceBlur: draft.base?.appearance?.surface?.blur ?? draft.appearance?.surface?.blur ?? null
        }
      : null;
  } catch {
    return null;
  }
}

function summarizeV2Draft(value) {
  return {
    layout: value?.base?.layoutVariant || null,
    links: Array.isArray(value?.links) ? value.links.length : null,
    surfaceBlur: value?.base?.appearance?.surface?.blur ?? value?.appearance?.surface?.blur ?? null
  };
}

async function readRenderParityState(selector) {
  return page.evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    const opening = root?.querySelector('.profile-shell__opening');
    const identity = root?.querySelector('.identity-card');
    const avatar = identity?.querySelector('.identity-card__avatar-media');
    const background = root?.querySelector('.profile-shell__media-image');
    const boundary = root?.querySelector('[data-profile-surface="true"]');
    const surface = boundary ? getComputedStyle(boundary) : null;
    const path = value => {
      try { return value ? new URL(value, location.href).pathname : ''; } catch { return value || ''; }
    };
    return {
      model: root?.dataset.profileRenderModel || '',
      mode: root?.dataset.profileRenderMode || '',
      layout: root?.dataset.profileLayout || '',
      avatar: path(avatar?.currentSrc || avatar?.src),
      background: path(background?.currentSrc || background?.src),
      surface: surface ? {
        fill: surface.getPropertyValue('--profile-surface-fill').trim(),
        opacity: surface.getPropertyValue('--profile-surface-opacity').trim(),
        blur: surface.getPropertyValue('--profile-surface-blur').trim(),
        radius: surface.getPropertyValue('--profile-border-radius').trim(),
        borderColor: surface.getPropertyValue('--profile-border-color').trim(),
        backgroundColor: surface.backgroundColor,
        backdropFilter: surface.backdropFilter || surface.webkitBackdropFilter || 'none'
      } : null,
      nameRenderer: identity?.querySelector('.name-effect-canvas')?.getAttribute('data-name-renderer') || '',
      avatarEffect: [...(identity?.querySelector('.avatar-effect')?.classList || [])].find(value => value.startsWith('avatar-effect--')) || '',
      border: root?.querySelector('[data-profile-border]')?.getAttribute('data-profile-border') || '',
      atmosphere: root?.querySelector('[data-atmosphere]')?.getAttribute('data-atmosphere') || '',
      opening: (() => {
        const box = opening?.getBoundingClientRect();
        return box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null;
      })()
    };
  })()`);
}

function parityFields(state) {
  return {
    model: state?.model || '',
    layout: state?.layout || '',
    avatar: state?.avatar || '',
    background: state?.background || '',
    surface: state?.surface || null,
    nameRenderer: state?.nameRenderer || '',
    avatarEffect: state?.avatarEffect || '',
    border: state?.border || '',
    atmosphere: state?.atmosphere || ''
  };
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
    body: Object.values(RICH_PROFILE_FIXTURE.effects)
      .filter(Boolean)
      .map(itemKey => ({ user_id: session, item_key: itemKey, quantity: 1 }))
  });

  if (smokeMode === 'preview') {
    for (const itemKey of Object.values(RICH_PROFILE_FIXTURE.effects).filter(Boolean)) {
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
      links: links.slice(0, 6)
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
  assert(publishedExpression.avatar_path && publishedExpression.background_path, `Publish response omitted persisted avatar/background expression fields: ${JSON.stringify(published)}`);
  assert(Array.isArray(published?.published?.links) && published.published.links.length >= links.length, `Publish response omitted the complete V2 link projection: ${JSON.stringify(published)}`);
  return { links: links.length, updatedAt: published?.updated_at || expectedUpdatedAt };
}

async function assertPublishedExpressionVisible(description) {
  await page.waitFor(`(() => {
    const avatar = document.querySelector('.profile-studio-preview .identity-card__avatar-media');
    const background = document.querySelector('.profile-studio-preview .profile-shell__media-image');
    return Boolean(avatar?.complete && avatar.naturalWidth > 0 && background?.complete && background.naturalWidth > 0);
  })()`, `${description} media load`, 15000);
  const state = await page.evaluate(`(() => {
    const avatar = document.querySelector('.profile-studio-preview .identity-card__avatar-media');
    const background = document.querySelector('.profile-studio-preview .profile-shell__media-image');
    const video = document.querySelector('.profile-studio-preview .profile-shell__media-video');
    return {
      avatar: avatar ? { complete: avatar.complete, naturalWidth: avatar.naturalWidth, src: avatar.currentSrc || avatar.src } : null,
      background: background ? { complete: background.complete, naturalWidth: background.naturalWidth, src: background.currentSrc || background.src } : null,
      video: video ? { readyState: video.readyState, src: video.currentSrc || video.src } : null
    };
  })()`);
  const configuration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
  const published = configuration?.published || configuration?.configuration_v2?.published;
  const expression = published?.base || published || {};
  assert(state.avatar?.complete && state.avatar.naturalWidth > 0 && state.background?.complete && state.background.naturalWidth > 0, `${description} lost avatar/background in the live preview: ${JSON.stringify({ state, expression })}`);
  assert(expression.avatar_path && expression.background_path, `${description} response/read projection lost avatar/background paths: ${JSON.stringify({ state, expression })}`);
  return { state, expression: { avatar: expression.avatar_path, background: expression.background_path, video: expression.background_video_path || null, audio: expression.audio_path || null, cursor: expression.cursor_path || null } };
}

async function waitForPublicLayout(layout, description) {
  const selector = `.profile-shell-page[aria-busy="false"] .identity-card--layout-${layout}`;
  try {
    await page.waitFor(`document.querySelector(${JSON.stringify(selector)})`, description);
  } catch (error) {
    // Local GoTrue/Vite can transiently lose one hydration or module request
    // while the smoke rotates through five authenticated publish/navigation
    // cycles. Retry one clean document load, but keep the layout assertion
    // itself strict so a real wrong-layout render still fails.
    const state = await page.evaluate(`({
      path: location.pathname,
      unavailable: Boolean([...document.querySelectorAll('h1, h2, p')].find(node => node.textContent?.includes('Account unavailable'))),
      shell: Boolean(document.querySelector('.profile-shell-page[aria-busy="false"]'))
    })`).catch(() => null);
    if (state?.shell) throw error;
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`);
    await page.waitFor(`document.querySelector(${JSON.stringify(selector)})`, `${description} retry`);
  }
}

async function waitForStudioLayoutPicker(description) {
  const picker = `document.querySelector('[data-editor-section="layout"]') && document.querySelector('.profile-template-picker__card')`;
  try {
    await page.waitFor(picker, description);
  } catch {
    // A direct route navigation can finish before the authenticated settings
    // request has completed on a local GoTrue/Vite run. Retry the document
    // once, but keep the picker assertion strict after the retry.
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`);
    await page.waitFor(picker, `${description} retry`);
  }
}

async function waitForRichStudioOpeningLinks(description) {
  const selector = '.profile-studio-preview .identity-card__links a';
  const minimum = RICH_PROFILE_FIXTURE.links.filter(link => isProfileSocialLink(link.type)).length;
  const condition = `document.querySelectorAll(${JSON.stringify(selector)}).length >= ${minimum}`;
  try {
    await page.waitFor(condition, description);
  } catch {
    // The authenticated Studio route can first paint its empty bootstrap
    // context before the V2 owner projection arrives. Retry the same route
    // once rather than allowing a transient empty draft to be published.
    const state = await page.evaluate(`({ openingLinks: document.querySelectorAll(${JSON.stringify(selector)}).length, picker: Boolean(document.querySelector('.profile-template-picker__card')), shell: Boolean(document.querySelector('.profile-studio-preview .profile-shell-page--preview')) })`).catch(() => null);
    if (state?.openingLinks >= minimum) return;
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.readyState === 'complete'`, `${description} retry document load`);
    await waitForStudioLayoutPicker(`${description} retry picker`);
    await page.waitFor(condition, `${description} retry`);
  }
}

async function capturePublishedLayouts() {
  const publicLayouts = ['compact', 'sleek', 'minimal', 'modern', 'portfolio'];
  const evidence = [];
  for (const layout of publicLayouts) {
    await page.setViewport(1440, 900);
    await page.navigate(`${appUrl}/profile/settings#customize-layout`, `${layout} public evidence Studio`);
    await waitForStudioLayoutPicker(`${layout} public evidence picker`);
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview[aria-busy="false"]')`, `${layout} stable Studio preview`);
    await waitForRichStudioOpeningLinks(`${layout} hydrated opening links`);
    let studioParityState;
    const serverConfigBefore = await callAuthenticatedRpc('get_my_profile_configuration_v2');
    const serverBeforeDraft = serverConfigBefore?.draft || serverConfigBefore?.configuration_v2?.draft;
    const serverBeforeSummary = summarizeV2Draft(serverBeforeDraft);
    await page.evaluate(`(() => {
      const wanted = ${JSON.stringify(layout)};
      const card = [...document.querySelectorAll('.profile-template-picker__card')].find(node => node.querySelector('strong')?.textContent.trim().toLowerCase() === wanted);
      card?.click();
    })()`);
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card--layout-${layout}')`, `${layout} public evidence preview`);
    const layoutPublishPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-dashboard-actions__publish')].find(button => !button.disabled))`);
    let serverAfterDraft = serverBeforeDraft;
    let publishPayload = null;
    if (layoutPublishPending) {
      await page.click('.profile-dashboard-actions__publish', `${layout} public evidence publish`);
      await page.waitFor(`document.querySelector('.profile-dashboard-actions__publish')?.disabled === true`, `${layout} public evidence published`);
      await assertPublishedExpressionVisible(`${layout} Studio publish`);
      publishPayload = await latestRpcPayload('publish_profile_studio_v2');
      const serverConfigAfter = await callAuthenticatedRpc('get_my_profile_configuration_v2');
      serverAfterDraft = serverConfigAfter?.draft || serverConfigAfter?.configuration_v2?.draft;
    }
    studioParityState = await readRenderParityState('.profile-studio-preview .profile-shell-page--preview');
    await delay(180);
    const settledStudioParityState = await readRenderParityState('.profile-studio-preview .profile-shell-page--preview');
    assert(JSON.stringify(parityFields(settledStudioParityState)) === JSON.stringify(parityFields(studioParityState)), `${layout} Studio render snapshot changed after the preview settled: ${JSON.stringify({ before: studioParityState, after: settledStudioParityState })}.`);
    assert(studioParityState.model === 'v1' && studioParityState.layout === layout && studioParityState.mode === 'studio', `${layout} Studio did not expose the canonical render snapshot boundary: ${JSON.stringify(studioParityState)}.`);
    const serverAfterSummary = summarizeV2Draft(serverAfterDraft);
    await page.navigate(`${appUrl}/${canonicalUsername}`, `${layout} public evidence desktop`);
    await waitForPublicLayout(layout, `${layout} public desktop profile`);
    if (studioParityState.atmosphere) {
      await page.waitFor(
        `document.querySelector(${JSON.stringify(`.profile-shell-page [data-atmosphere="${studioParityState.atmosphere}"]`)})`,
        `${layout} public settled atmosphere`
      );
    }
    if (smokeMode === 'dev') {
      await page.waitFor(`document.querySelector('.profile-shell-page [data-atmosphere="rain-window"]')`, `${layout} public atmosphere renderer`);
    }
    if (layout === 'compact') {
      await page.waitFor(`document.querySelector('.profile-shell__opening .profile-roll__result .final-color-display') || document.querySelector('.profile-shell__opening .profile-roll__reveal-button:not(:disabled)')`, 'owner Daily Color state', 15000);
      const canRevealOwnerColor = await page.evaluate(`Boolean(document.querySelector('.profile-shell__opening .profile-roll__reveal-button:not(:disabled)'))`);
      if (canRevealOwnerColor) {
        await page.click('.profile-shell__opening .profile-roll__reveal-button', 'reveal owner Daily Color');
        await page.waitFor(`document.querySelector('.profile-shell__opening .profile-roll__result .final-color-display')`, 'owner Daily Color result');
      }
    }
    const publicGeometry = await page.evaluate(`(() => {
      const shell = document.querySelector('.profile-shell-page');
      const image = document.querySelector('.profile-shell__media-image');
      const canvas = document.querySelector('.name-effect-canvas__visual');
      const semantic = document.querySelector('.name-effect-canvas__semantic, .identity-card__name');
      const shellBox = shell?.getBoundingClientRect();
      const imageBox = image?.getBoundingClientRect();
      const imageStyle = image ? getComputedStyle(image) : null;
      const canvasBox = canvas?.getBoundingClientRect();
      const semanticBox = semantic?.getBoundingClientRect();
      const ownerColor = document.querySelector('.profile-shell__opening .profile-roll .final-color-display, .profile-shell__more .profile-roll .final-color-display');
      const ownerColorBox = ownerColor?.getBoundingClientRect();
      const avatar = document.querySelector('.profile-shell__opening .identity-card__avatar');
      const avatarBox = avatar?.getBoundingClientRect();
      const socialGlyph = document.querySelector('.profile-shell__opening .identity-card__link-glyph');
      const socialGlyphBox = socialGlyph?.getBoundingClientRect();
      const continuationColumn = document.querySelector('.profile-shell__continuation-column');
      const continuationColumnBox = continuationColumn?.getBoundingClientRect();
      const continuationModules = [...document.querySelectorAll('.profile-shell__continuation-column > *')].map(node => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      });
      return {
        viewport: [innerWidth, innerHeight],
        shell: shellBox ? { width: shellBox.width, height: shellBox.height } : null,
        background: image ? { complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, position: imageStyle.position, objectFit: imageStyle.objectFit, box: imageBox ? { left: imageBox.left, top: imageBox.top, width: imageBox.width, height: imageBox.height } : null } : null,
        name: canvas && semantic ? { canvas: { width: canvas.width, height: canvas.height, cssWidth: canvasBox?.width || 0, cssHeight: canvasBox?.height || 0 }, semantic: { left: semanticBox?.left || 0, top: semanticBox?.top || 0, width: semanticBox?.width || 0, height: semanticBox?.height || 0 }, fontSize: getComputedStyle(semantic).fontSize } : null,
        ownerColor: ownerColorBox ? { width: ownerColorBox.width, height: ownerColorBox.height } : null,
        avatar: avatarBox ? { width: avatarBox.width, height: avatarBox.height } : null,
        socialGlyph: socialGlyphBox ? { width: socialGlyphBox.width, height: socialGlyphBox.height } : null,
        continuationColumn: continuationColumnBox ? { left: continuationColumnBox.left, right: continuationColumnBox.right, width: continuationColumnBox.width } : null,
        continuationModules,
        northeastArrow: Boolean(document.querySelector('.profile-shell-page')?.innerHTML.includes('↗')),
        openingLinks: [...document.querySelectorAll('.profile-shell__opening .identity-card__links a')].map(link => link.href),
        continuationLinks: [...document.querySelectorAll('.profile-shell__continuation-links a')].map(link => link.href),
        openingSocialLinks: [...document.querySelectorAll('.profile-shell__opening .identity-card__links--social a')].map(link => link.href),
        openingNavigationLinks: [...document.querySelectorAll('.profile-shell__opening .identity-card__links--labeled a')].map(link => link.href),
        continuationSocialLinks: [...document.querySelectorAll('.profile-shell__continuation-links .profile-shell__links--social a')].map(link => link.href),
        continuationNavigationLinks: [...document.querySelectorAll('.profile-shell__continuation-links .profile-shell__links--navigation a')].map(link => link.href),
        continuationAbout: document.querySelector('.profile-content__about')?.textContent?.trim() || '',
        continuationProjects: [...document.querySelectorAll('.profile-content__project')].map(project => project.textContent.trim()),
        continuationCue: Boolean(document.querySelector('.profile-shell__more-cue')),
        subtleContinuationCue: Boolean(document.querySelector('.profile-shell__more-cue--continuation')),
        ownerRoll: Boolean(document.querySelector('.profile-shell-page .profile-roll')),
        atmosphere: document.querySelector('[data-atmosphere]')?.getAttribute('data-atmosphere') || '',
        avatarEffect: [...(document.querySelector('.profile-shell__opening .avatar-effect')?.classList || [])].find(value => value.startsWith('avatar-effect--')) || '',
        border: document.querySelector('.profile-shell__opening [data-profile-border]')?.getAttribute('data-profile-border') || ''
        ,serverBefore: ${JSON.stringify(serverBeforeSummary)}
        ,serverAfter: ${JSON.stringify(serverAfterSummary)}
        ,publishPayload: ${JSON.stringify(publishPayload)}
      };
    })()`);
    const publicParityState = await readRenderParityState('.profile-shell-page');
    assert(JSON.stringify(parityFields(publicParityState)) === JSON.stringify(parityFields(studioParityState)), `${layout} public render diverged from the Studio snapshot: ${JSON.stringify({ studio: studioParityState, public: publicParityState })}.`);
    assert(publicParityState.mode === 'public' && publicParityState.model === 'v1', `${layout} public profile did not use the canonical render snapshot boundary: ${JSON.stringify(publicParityState)}.`);
    assert(publicGeometry.shell && Math.abs(publicGeometry.shell.width - 1440) <= 1 && Math.abs(publicGeometry.shell.height - 900) <= 1, `${layout} public profile does not fill the desktop viewport: ${JSON.stringify(publicGeometry)}.`);
    if (publicGeometry.background) {
      assert(publicGeometry.background.complete && publicGeometry.background.naturalWidth > 0 && publicGeometry.background.position === 'fixed' && publicGeometry.background.objectFit === 'cover' && (publicGeometry.background.box?.width || 0) >= 1439 && (publicGeometry.background.box?.height || 0) >= 899, `${layout} public uploaded background is not viewport-bound: ${JSON.stringify(publicGeometry)}.`);
    }
    if (publicGeometry.name) {
      assert(publicGeometry.name.canvas.width <= 2048 && publicGeometry.name.canvas.height <= 512 && publicGeometry.name.canvas.cssWidth < 360 && publicGeometry.name.canvas.cssHeight < 100 && Number.parseFloat(publicGeometry.name.fontSize) >= 12, `${layout} effected username canvas is not sane: ${JSON.stringify(publicGeometry)}.`);
    }
    if (publicGeometry.ownerColor) {
      assert(publicGeometry.ownerColor.width <= 48 && publicGeometry.ownerColor.height <= 48, `${layout} owner Daily Color escaped its compact presentation: ${JSON.stringify(publicGeometry)}.`);
    }
    if (layout === 'compact') {
      assert(publicGeometry.ownerColor, `Compact owner Daily Color did not reach a revealed result state: ${JSON.stringify(publicGeometry)}.`);
    }
    const minimumAvatar = layout === 'compact' ? 60 : layout === 'sleek' || layout === 'modern' ? 56 : 76;
    assert((publicGeometry.avatar?.width || 0) >= minimumAvatar && (publicGeometry.avatar?.height || 0) >= minimumAvatar, `${layout} avatar did not reach the readable compact size: ${JSON.stringify(publicGeometry)}.`);
    if (publicGeometry.openingSocialLinks.length) {
      assert((publicGeometry.socialGlyph?.width || 0) >= 18 && (publicGeometry.socialGlyph?.height || 0) >= 18, `${layout} social glyph is visually too small: ${JSON.stringify(publicGeometry)}.`);
    }
    assert(!publicGeometry.northeastArrow, `${layout} profile renderer still contains a decorative northeast arrow glyph.`);
    assert(publicGeometry.continuationAbout.includes('About me') && publicGeometry.continuationAbout.includes(RICH_PROFILE_FIXTURE.content.about.body) && publicGeometry.continuationProjects.length === RICH_PROFILE_FIXTURE.content.projects.length, `${layout} rich continuation content did not render through the public profile path: ${JSON.stringify(publicGeometry)}.`);
    if (publicGeometry.continuationColumn) {
      assert(publicGeometry.continuationColumn.width <= 850 && publicGeometry.continuationModules.every(module => module.left >= publicGeometry.continuationColumn.left - 1 && module.right <= publicGeometry.continuationColumn.right + 1), `${layout} continuation modules escaped the shared centered column: ${JSON.stringify(publicGeometry)}.`);
    }
    const expectedLinks = expectedLayoutLinks(layout);
    assert(JSON.stringify(publicGeometry.openingLinks) === JSON.stringify(expectedLinks.opening.map(link => link.url)) && JSON.stringify(publicGeometry.continuationLinks) === JSON.stringify(expectedLinks.continuation.map(link => link.url)) && new Set([...publicGeometry.openingLinks, ...publicGeometry.continuationLinks]).size === RICH_PROFILE_FIXTURE.links.length, `${layout} public opening/continuation links are duplicated or reordered: ${JSON.stringify(publicGeometry)}.`);
    if (expectedLinks.continuation.length) {
      assert(publicGeometry.continuationCue && (layout === 'portfolio' || publicGeometry.subtleContinuationCue), `${layout} lower links have no continuation affordance: ${JSON.stringify(publicGeometry)}.`);
    }
    assert(publicGeometry.openingSocialLinks.length === expectedLinks.opening.filter(link => isProfileSocialLink(link.type)).length && publicGeometry.continuationSocialLinks.length === expectedLinks.continuation.filter(link => isProfileSocialLink(link.type)).length && publicGeometry.openingNavigationLinks.length === expectedLinks.opening.filter(link => !isProfileSocialLink(link.type)).length && publicGeometry.continuationNavigationLinks.length === expectedLinks.continuation.filter(link => !isProfileSocialLink(link.type)).length, `${layout} social/custom link treatments are not partitioned by layout: ${JSON.stringify(publicGeometry)}.`);
    assert(publicGeometry.ownerRoll, `${layout} owner public profile did not mount the interactive shared roll path: ${JSON.stringify(publicGeometry)}.`);
    if (smokeMode === 'dev') {
      assert(publicGeometry.name, `${layout} public profile did not mount the active NameEffectCanvas after publish and refresh.`);
      assert(publicGeometry.atmosphere === 'rain-window' && publicGeometry.avatarEffect === 'avatar-effect--ghost-double' && publicGeometry.border === 'celestial', `${layout} public cosmetic boundary fixture did not survive publish: ${JSON.stringify(publicGeometry)}.`);
    }
    await capture(`public-${layout}-desktop`);
    if (layout === 'compact') {
      await captureRegion('compact-owner-daily-color', '.profile-shell__opening .profile-roll');
      await page.evaluate(`(() => { const shell = document.querySelector('.profile-shell-page'); shell?.scrollTo({ top: shell.scrollHeight, behavior: 'instant' }); })()`);
      await delay(120);
      await capture('compact-continuation-desktop');
      await page.evaluate(`(() => { const shell = document.querySelector('.profile-shell-page'); shell?.scrollTo({ top: 0, behavior: 'instant' }); })()`);
    }
    await page.setViewport(390, 844);
    // Navigate to a cache-busted public URL for per-layout evidence. The
    // dedicated direct-refresh step below still exercises Page.reload; using a
    // fresh navigation here avoids measuring the previous layout's DOM while a
    // browser reload is replacing it.
    const mobileUrl = `${appUrl}/${canonicalUsername}?qa=${layout}-mobile-${Date.now()}`;
    await page.command('Page.navigate', { url: mobileUrl });
    await page.waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify('/' + canonicalUsername)}`, `${layout} public evidence mobile`);
    await waitForPublicLayout(layout, `${layout} public mobile profile`);
    await delay(180);
    const mobileGeometry = await page.evaluate(`(() => {
      const shell = document.querySelector('.profile-shell-page');
      const image = document.querySelector('.profile-shell__media-image');
      const box = element => element?.getBoundingClientRect();
      const shellBox = box(shell);
      const imageBox = box(image);
      const style = image ? getComputedStyle(image) : null;
      return { shell: shellBox ? { width: shellBox.width, height: shellBox.height } : null, background: imageBox && style ? { width: imageBox.width, height: imageBox.height, position: style.position, objectFit: style.objectFit, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight } : null };
    })()`);
    assert(mobileGeometry.shell && Math.abs(mobileGeometry.shell.width - 390) <= 1 && mobileGeometry.background && mobileGeometry.background.position === 'fixed' && mobileGeometry.background.objectFit === 'cover' && mobileGeometry.background.width >= 389 && mobileGeometry.background.height >= 843, `${layout} public mobile environment is not covered: ${JSON.stringify(mobileGeometry)}.`);
    await capture(`public-${layout}-mobile`);
    evidence.push({ layout, studioParityState, publicParityState, desktop: publicGeometry, mobile: mobileGeometry });
  }
  await page.setViewport(1440, 900);
  await page.navigate(`${appUrl}/profile/settings#customize-layout`, 'restore Compact after public evidence');
  await waitForStudioLayoutPicker('restore Compact picker');
  await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview[aria-busy="false"]')`, 'restore Compact stable Studio preview');
  await waitForRichStudioOpeningLinks('restore Compact hydrated opening links');
  await page.evaluate(`(() => {
    const card = [...document.querySelectorAll('.profile-template-picker__card')].find(node => node.querySelector('strong')?.textContent.trim() === 'Compact');
    card?.click();
  })()`);
  await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card--layout-compact')`, 'restore Compact public evidence preview');
  const restorePublishPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-dashboard-actions__publish')].find(button => !button.disabled))`);
  let restorePayload = null;
  if (restorePublishPending) {
    await page.click('.profile-dashboard-actions__publish', 'restore Compact publish');
    await page.waitFor(`document.querySelector('.profile-dashboard-actions__publish')?.disabled === true`, 'restore Compact published');
    restorePayload = await latestRpcPayload('publish_profile_studio_v2');
  }
  const restoredConfiguration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
  return {
    layouts: evidence,
    restore: {
      pending: restorePublishPending,
      payload: restorePayload,
      draft: summarizeV2Draft(restoredConfiguration?.draft || restoredConfiguration?.configuration_v2?.draft),
      published: summarizeV2Draft(restoredConfiguration?.published || restoredConfiguration?.configuration_v2?.published)
    }
  };
}

try {
  const authResponse = await waitForHttp(`${supabaseUrl.origin}/auth/v1/settings`, 5000).catch(error => {
    throw new Error(`Local Supabase is not reachable at ${supabaseUrl.origin}. Start local Supabase first. ${error.message}`);
  });
  assert(authResponse.ok, `Local Supabase auth endpoint returned HTTP ${authResponse.status}.`);

  const appPort = await findAvailablePort(defaultAppPort);
  const debugPort = await findAvailablePort(defaultDebugPort);
  results.ports = { appPort, debugPort };
  appUrl = `http://127.0.0.1:${appPort}`;
  do {
    canonicalUsername = `${RICH_PROFILE_FIXTURE.usernamePrefix}${Date.now().toString(36).slice(-8)}`;
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
    const accountPath = await page.evaluate('document.querySelector(".identity-card")?.getAttribute("data-profile-path") || ""');
    assert(accountPath === `/${canonicalUsername}`, `Authenticated profile resolved to ${JSON.stringify(accountPath)}, expected /${canonicalUsername}.`);
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
    const alias = `alias_${Date.now().toString(36).slice(-10)}`;
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
    const backgroundUpload = await uploadGeneratedImage('input[aria-label="Choose background image"]', { ...RICH_PROFILE_FIXTURE.background, kind: 'background' });
    await page.waitFor(`([...document.querySelectorAll('.profile-expression-editor__message[role="status"]')]).some(node => node.textContent.includes('Background saved'))`, 'persisted uploaded background');
    try {
      await page.waitFor(`(() => { const image = document.querySelector('.profile-studio-preview .profile-shell__media-image'); return Boolean(image?.complete && image.naturalWidth > 0); })()`, 'uploaded background in live preview');
    } catch (error) {
      const previewState = await page.evaluate(`(() => ({
        images: [...document.querySelectorAll('.profile-studio-preview img')].map(image => ({ className: image.className, src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
        editorImages: [...document.querySelectorAll('.profile-expression-editor img')].map(image => ({ className: image.className, src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
        previewShell: document.querySelector('.profile-studio-preview .profile-shell-page')?.className || '',
        previewBackgroundPath: document.querySelector('.profile-studio-preview .profile-shell-page')?.getAttribute('data-profile-preview-background') || '',
        previewConfig: document.querySelector('.profile-studio-preview .profile-shell-page')?.getAttribute('style') || '',
        messages: [...document.querySelectorAll('.profile-expression-editor__message[role="status"]')].map(node => node.textContent.trim())
      }))()`);
      throw new Error(`${error.message} State: ${JSON.stringify(previewState)}`, { cause: error });
    }
    const avatarUpload = await uploadGeneratedImage('input[aria-label="Choose avatar image"]', { ...RICH_PROFILE_FIXTURE.avatar, kind: 'avatar' });
    await page.waitFor(`([...document.querySelectorAll('.profile-expression-editor__message[role="status"]')]).some(node => node.textContent.includes('Avatar saved'))`, 'persisted uploaded avatar');
    await page.waitFor(`(() => { const image = document.querySelector('.profile-studio-preview .identity-card__avatar-media'); return Boolean(image?.complete && image.naturalWidth > 0); })()`, 'uploaded avatar in live preview');
    // Exercise the real immediate-media -> staged-layout -> publish boundary
    // before any later fixture RPC can refresh the concurrency token for us.
    await page.click('#profile-customize-tab-layout', 'layout tab after media mutation');
    await page.waitFor(`document.querySelector('#profile-customize-tab-layout')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="layout"]')?.hidden`, 'layout editor after media mutation');
    await page.evaluate(`(() => {
      const card = [...document.querySelectorAll('.profile-template-picker__card')].find(node => node.querySelector('strong')?.textContent.trim() === 'Sleek');
      card?.click();
    })()`);
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card--layout-sleek')`, 'layout staged after media mutation');
    await page.clickText('Publish profile', { description: 'publish after immediate media mutation' });
    await page.waitFor(`document.querySelector('.profile-dashboard-actions__message')?.textContent?.trim() === 'Profile published.'`, 'publish after immediate media mutation');
    const mediaPublishExpression = await assertPublishedExpressionVisible('media mutation publish');
    const mediaPublishConfiguration = await callAuthenticatedRpc('get_my_profile_configuration_v2');
    assert(mediaPublishConfiguration?.updated_at && mediaPublishExpression.expression.avatar && mediaPublishExpression.expression.background, `Media mutation publish did not preserve the current token and expression: ${JSON.stringify({ mediaPublishExpression, mediaPublishConfiguration })}`);
    const mediaPublishRegression = { upload: { background: backgroundUpload, avatar: avatarUpload }, expression: mediaPublishExpression.expression, updatedAt: mediaPublishConfiguration.updated_at };
    const musicInputAvailable = await page.evaluate(`Boolean(document.querySelector('#profile-media-music input[type="url"]'))`);
    if (musicInputAvailable) {
      await page.setInputValue('#profile-media-music input[type="url"]', RICH_PROFILE_FIXTURE.musicUrl, ['input', 'change']);
      await page.clickText('Save Spotify', { description: 'save rich profile music' });
      await page.waitFor(`([...document.querySelectorAll('.profile-expression-editor__message[role="status"]')]).some(node => node.textContent.includes('Spotify saved'))`, 'persisted profile music');
    }
    const richFixture = await seedRichProfileFixture();
    // Rehydrate the editor after the fixture's authenticated V2 writes. This
    // keeps the screenshots and the later publish path on the same draft that
    // the public route will read after refresh.
    await page.command('Page.navigate', { url: `${appUrl}/profile/settings?qa=rich-${Date.now()}` });
    await page.waitFor(`document.readyState === 'complete' && location.pathname === '/profile/settings' && document.querySelector('.profile-settings-page')`, 'rehydrated rich Profile Studio document');
    await page.command('Page.navigate', { url: `${appUrl}/profile/settings#customize-layout` });
    await page.waitFor(`location.pathname === '/profile/settings' && document.querySelector('[data-editor-section="layout"]') && document.querySelector('.profile-studio-preview .profile-shell-page--preview')`, 'rehydrated rich Profile Studio layout');
    await delay(180);
    await page.setInputValue('#profile-bio', RICH_PROFILE_FIXTURE.bio, ['input']);
    await page.setInputValue('#profile-location', RICH_PROFILE_FIXTURE.location, ['input']);
    await page.setInputValue('#profile-timezone', RICH_PROFILE_FIXTURE.timezone, ['input']);
    await page.waitFor(`document.querySelector('.profile-studio-preview .identity-card__bio')?.textContent?.trim() === ${JSON.stringify(RICH_PROFILE_FIXTURE.bio)}`, 'rich identity draft in live preview');
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
    await step('all five profile layouts use distinct structural renderers', async () => {
      const layouts = ['compact', 'sleek', 'minimal', 'modern', 'portfolio'];
      const pickerLabels = await page.evaluate(`([...document.querySelectorAll('.profile-template-picker__card strong')]).map(node => node.textContent.trim())`);
      assert(JSON.stringify(pickerLabels) === JSON.stringify(['Compact', 'Sleek', 'Minimal', 'Modern', 'Portfolio']), `Profile Studio layout catalog is not the five-layout set: ${JSON.stringify(pickerLabels)}.`);

      const measurements = [];
      for (const layout of layouts) {
        const clicked = await page.evaluate(`(() => {
          const wanted = ${JSON.stringify(layout)};
          const card = [...document.querySelectorAll('.profile-template-picker__card')].find(node => node.querySelector('strong')?.textContent.trim().toLowerCase() === wanted);
          if (!card) return false;
          card.scrollIntoView({ block: 'center', inline: 'nearest' });
          card.click();
          return true;
        })()`);
        assert(clicked, `Could not select ${layout} in Profile Studio.`);
        await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card--layout-${layout}')`, `${layout} live preview layout`);
        await page.waitFor(`(() => {
          const layout = ${JSON.stringify(layout)};
          const boundary = document.querySelector('.profile-studio-preview .profile-shell__identity-boundary');
          const style = boundary ? getComputedStyle(boundary) : null;
          if (!style) return false;
          const cardless = style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent';
          const backdrop = style.backdropFilter || style.webkitBackdropFilter || 'none';
          return layout === 'minimal' || layout === 'portfolio'
            ? cardless && backdrop === 'none'
            : style.borderTopWidth !== '0px';
        })()`, `${layout} preview surface CSS`).catch(async error => {
          const state = await page.evaluate(`(() => {
            const boundary = document.querySelector('.profile-studio-preview .profile-shell__identity-boundary');
            const style = boundary ? getComputedStyle(boundary) : null;
            return {
              className: boundary?.className || '',
              backgroundColor: style?.backgroundColor || '',
              backdropFilter: style?.backdropFilter || '',
              webkitBackdropFilter: style?.webkitBackdropFilter || '',
              borderTopWidth: style?.borderTopWidth || '',
              borderTopColor: style?.borderTopColor || '',
              stylesheetCount: document.styleSheets.length,
              hrefs: [...document.styleSheets].map(sheet => sheet.href).filter(Boolean).slice(-12)
            };
          })()`);
          throw new Error(`${error.message} State: ${JSON.stringify(state)}`);
        });
        const state = await page.evaluate(`(() => {
          const canvas = document.querySelector('.profile-studio-preview__canvas');
          const shell = canvas?.querySelector('.profile-shell-page--preview');
          const viewport = canvas?.querySelector('.profile-studio-preview__viewport');
          const stage = canvas?.querySelector('.profile-studio-preview__stage');
          const frame = shell?.querySelector('.profile-layout-frame');
          const opening = shell?.querySelector('.profile-shell__approved-opening');
          const identityRegion = frame?.querySelector('.profile-shell__layout-identity');
          const boundary = shell?.querySelector('.profile-shell__identity-boundary');
          const card = shell?.querySelector('.identity-card');
          const avatar = card?.querySelector('.identity-card__avatar');
          const name = card?.querySelector('.identity-card__name');
          const copy = card?.querySelector('.identity-card__copy');
          const rect = element => {
            const box = element?.getBoundingClientRect();
            return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
          };
          const shellBox = rect(shell);
          const viewportBox = rect(viewport);
          const cardBox = rect(card);
          const frameBox = rect(frame);
          const openingBox = rect(opening);
          const identityBox = rect(identityRegion);
          const stageBox = rect(stage);
          const boundaryBox = rect(boundary);
          const avatarBox = rect(avatar);
          const nameBox = rect(name);
          const copyBox = rect(copy);
          const overflow = [...(shell?.querySelectorAll('*') || [])]
            .map(element => ({ element, box: element.getBoundingClientRect() }))
            .filter(({ box }) => box.width > 0 && box.height > 0 && shellBox && (box.left < shellBox.left - 1 || box.right > shellBox.right + 1))
            .slice(0, 4)
            .map(({ element, box }) => ({ tag: element.tagName, className: element.className, left: Math.round(box.left), right: Math.round(box.right) }));
          const avatarNameOverlap = Boolean(avatarBox && nameBox && avatarBox.left < nameBox.right - 1 && nameBox.left < avatarBox.right - 1 && avatarBox.top < nameBox.bottom - 1 && nameBox.top < avatarBox.bottom - 1);
          const avatarCopyCenterDelta = avatarBox && copyBox
            ? Math.abs((avatarBox.top + avatarBox.height / 2) - (copyBox.top + copyBox.height / 2))
            : null;
          const backgroundBounds = [...(shell?.querySelectorAll('.profile-shell__media-image, .profile-shell__media-overlay, .profile-shell__media-video, .profile-shell__page-atmosphere-layer, .profile-shell__page-cursor-layer') || [])]
            .map(element => ({ selector: element.className?.baseVal || element.className || element.tagName, box: rect(element) }))
            .filter(item => item.box);
          const shellStyle = shell ? getComputedStyle(shell) : null;
          const boundaryStyle = boundary ? getComputedStyle(boundary) : null;
          const cardStyle = card ? getComputedStyle(card) : null;
          const nameStyle = name ? getComputedStyle(name) : null;
          const nameCanvas = card?.querySelector('.name-effect-canvas__visual');
          const mediaStyles = [...(shell?.querySelectorAll('.profile-shell__media-image, .profile-shell__media-video') || [])].map(element => {
            const style = getComputedStyle(element);
            return { position: style.position, width: style.width, height: style.height, objectFit: style.objectFit };
          });
          const contentOverflow = Boolean(shell && shell.scrollHeight > shell.clientHeight + 4);
          const openingFits = Boolean(stage && openingBox && openingBox.height <= stage.clientHeight + 4);
          const frameCenterX = frameBox ? frameBox.left + frameBox.width / 2 : null;
          const frameCenterY = frameBox ? frameBox.top + frameBox.height / 2 : null;
          const stageCenterX = stageBox ? stageBox.left + stageBox.width / 2 : null;
          const stageCenterY = stageBox ? stageBox.top + stageBox.height / 2 : null;
          return {
            shell: shellBox,
            shellScrollHeight: shell?.scrollHeight || 0,
            viewport: viewportBox,
            stage: stageBox,
            frame: frameBox,
            opening: openingBox,
            identityRegion: identityBox,
            boundary: boundaryBox,
            card: cardBox,
            cardClass: card?.className || '',
            avatar: avatarBox,
            name: nameBox,
            copy: copyBox,
            avatarNameOverlap,
            avatarCopyCenterDelta,
            avatarBeforeName: Boolean(avatarBox && nameBox && avatarBox.left < nameBox.left),
            hasDailyRoll: Boolean(shell?.querySelector('.profile-daily-roll')),
            frameVariant: ['compact', 'sleek', 'minimal', 'modern', 'portfolio'].find(layoutKey => shell?.classList.contains('profile-shell-page--' + layoutKey)) || '',
            presenceStrip: Boolean(frame?.querySelector('[data-profile-layout-strip="presence"]')),
            musicStrip: Boolean(frame?.querySelector('.profile-layout-frame__strip .profile-music')),
            todayStrip: Boolean(frame?.querySelector('.profile-daily-roll--sleek')),
            modernRegion: Boolean(frame?.querySelector('.profile-daily-roll--modern')),
            secondary: Boolean(frame?.querySelector('.profile-daily-roll--modern')),
            tabs: Boolean(frame?.querySelector('[role="tab"], [role="tablist"], [data-profile-layout-tabs]')),
            // Cardless layouts still allow an equipped border cosmetic to
            // surround the content. Cardless means no surface fill/backdrop;
            // it does not mean removing the user's purchased perimeter.
            cardless: Boolean(boundaryStyle
              && (boundaryStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || boundaryStyle.backgroundColor === 'transparent')
              && (boundaryStyle.backdropFilter || boundaryStyle.webkitBackdropFilter || 'none') === 'none'),
            avatarRadius: avatar ? getComputedStyle(avatar).borderRadius : '',
            shellBackground: shellStyle?.backgroundColor || '',
            previewDevice: shell?.classList.contains('profile-shell-page--preview-mobile') ? 'mobile' : (shell?.classList.contains('profile-shell-page--preview') ? 'desktop' : ''),
            shellTransform: shellStyle?.transform || 'none',
            previewScrollable: stage?.getAttribute('data-preview-scrollable') === 'true',
            contentOverflow,
            openingFits,
            openingOverflow: Boolean(stage && openingBox && openingBox.height > stage.clientHeight + 4),
            frameCenterDeltaX: frameCenterX !== null && stageCenterX !== null ? Math.abs(frameCenterX - stageCenterX) : null,
            frameCenterDeltaY: frameCenterY !== null && stageCenterY !== null ? Math.abs(frameCenterY - stageCenterY) : null,
            scrollCue: Boolean(canvas?.querySelector('.profile-studio-preview__scroll-cue')),
            nameFontSize: Number.parseFloat(nameStyle?.fontSize || '0'),
            nameWidth: nameBox?.width || 0,
            nameTextLength: name?.textContent?.trim().length || 0,
            nameCanvas: nameCanvas ? { width: nameCanvas.width, height: nameCanvas.height } : null,
            mediaStyles,
            backgroundBounds,
            iconCount: card?.querySelectorAll('.identity-card__link-glyph img').length || 0,
            hasRedundantHandle: Boolean(card?.querySelector('.identity-card__handle, .identity-card__handle-row')),
            overflow
          };
        })()`);
        assert(state.frameVariant === layout, `${layout} preview mounted the wrong frame variant: ${JSON.stringify(state)}.`);
        assert(state.previewDevice === 'desktop' && state.shell && state.stage && Math.abs(state.shell.left - state.stage.left) <= 3 && Math.abs(state.shell.top - state.stage.top) <= 3 && Math.abs(state.shell.width - state.stage.width) <= 3 && Math.abs(state.shell.height - state.stage.height) <= 3, `${layout} desktop preview page does not fill its physical environment: ${JSON.stringify(state)}.`);
        assert(state.shellTransform === 'none' && state.card?.width >= 220 && state.card.width <= 360, `${layout} profile surface is microscopic or no longer compact: ${JSON.stringify(state)}.`);
        assert((state.viewport?.height || 0) >= 360 && (!state.previewScrollable || state.scrollCue), `${layout} desktop preview is too short or hides its continuation affordance: ${JSON.stringify(state)}.`);
        assert(state.card?.top >= (state.shell?.top || 0) - 1 && state.shellScrollHeight >= (state.card?.bottom || 0) - (state.shell?.top || 0) - 1, `${layout} desktop preview vertically clips the readable profile surface: ${JSON.stringify(state)}.`);
        if (state.openingFits && layout !== 'minimal') {
          assert((state.frameCenterDeltaX ?? 99) <= 4 && (state.frameCenterDeltaY ?? 99) <= 6, `${layout} fitting desktop preview frame is not centered in its environment: ${JSON.stringify(state)}.`);
        }
        if (!state.openingFits && layout !== 'minimal') {
          assert((state.frame?.top || 0) >= (state.shell?.top || 0) - 1, `${layout} oversized preview opening is not top-accessible: ${JSON.stringify(state)}.`);
        }
        const minimumNameWidth = Math.max(8, Math.min(20, state.nameTextLength * 6));
        assert(state.nameFontSize >= 12 && state.nameWidth >= minimumNameWidth && (!state.nameCanvas || (state.nameCanvas.width <= 2048 && state.nameCanvas.height <= 512)), `${layout} username geometry is not legible or sane: ${JSON.stringify(state)}.`);
        assert(state.card?.right <= (state.shell?.right || 0) + 1 && state.card?.left >= (state.shell?.left || 0) - 1, `${layout} profile surface escapes the preview shell: ${JSON.stringify(state)}.`);
        assert(!state.avatarNameOverlap && !state.overflow.length, `${layout} preview has identity collision or clipping: ${JSON.stringify(state)}.`);
        assert(state.hasDailyRoll || layout === 'portfolio', `${layout} preview lost the shared daily-roll presentation.`);
        assert(!state.hasRedundantHandle, `${layout} preview still renders a redundant @username handle.`);
        for (const media of state.backgroundBounds) {
          assert(Math.abs(media.box.left - state.shell.left) <= 1 && Math.abs(media.box.top - state.shell.top) <= 1 && Math.abs(media.box.width - state.shell.width) <= 1 && Math.abs(media.box.height - state.shell.height) <= 1, `${layout} page-level media/effects do not bound to the profile viewport: ${JSON.stringify(state)}.`);
        }
        for (const media of state.mediaStyles) {
          assert(media.position === 'absolute' && media.objectFit === 'cover' && media.width !== 'auto' && media.height !== 'auto', `${layout} preview background media is not stage-bound: ${JSON.stringify(state)}.`);
        }
        if (layout === 'compact') {
          assert(state.avatarBeforeName && (state.avatarCopyCenterDelta ?? 99) <= Math.max(10, (state.avatar?.height || 0) * .28), `Compact is not a horizontal identity head: ${JSON.stringify(state)}.`);
        } else if (layout === 'sleek') {
          assert(!state.presenceStrip && state.todayStrip && state.avatarRadius !== '50%', `Sleek is rendering fake presence or missing its detached Today strip/rounded-square avatar: ${JSON.stringify(state)}.`);
        } else if (layout === 'minimal') {
          assert(state.cardless && state.identityRegion?.left < state.shell.left + state.shell.width / 2 - 10, `Minimal is not a cardless offset identity: ${JSON.stringify(state)}.`);
        } else if (layout === 'modern') {
          assert(state.modernRegion && state.secondary && !state.tabs, `Modern is missing its valid secondary region: ${JSON.stringify(state)}.`);
        } else if (layout === 'portfolio') {
          assert(state.cardless && !state.hasDailyRoll, `Portfolio still presents the hero as a card or keeps Today in the opening: ${JSON.stringify(state)}.`);
        }
        await captureRegion(`${layout}-desktop`, '.profile-studio-preview__viewport');
        measurements.push({ layout, ...state });
      }

      for (const layout of layouts) {
        const clicked = await page.evaluate(`(() => {
          const wanted = ${JSON.stringify(layout)};
          const card = [...document.querySelectorAll('.profile-template-picker__card')].find(node => node.querySelector('strong')?.textContent.trim().toLowerCase() === wanted);
          card?.click();
          return Boolean(card);
        })()`);
        assert(clicked, `Could not restore ${layout} for the mobile evidence capture.`);
        await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card--layout-${layout}')`, `${layout} mobile evidence layout`);
        await page.click('.profile-studio-preview__devices button:nth-child(2)', `${layout} mobile preview control`);
        await page.waitFor(`document.querySelector('.profile-studio-preview__canvas--mobile') && document.querySelector('.profile-studio-preview__canvas--mobile .profile-shell-page--preview')`, `${layout} mobile preview canvas`);
        const mobileBounds = await page.evaluate(`(() => {
          const viewport = document.querySelector('.profile-studio-preview__canvas--mobile .profile-studio-preview__viewport')?.getBoundingClientRect();
          const stage = document.querySelector('.profile-studio-preview__canvas--mobile .profile-studio-preview__stage')?.getBoundingClientRect();
          const shell = document.querySelector('.profile-studio-preview__canvas--mobile .profile-shell-page--preview')?.getBoundingClientRect();
          const card = document.querySelector('.profile-studio-preview__canvas--mobile .identity-card');
          const name = card?.querySelector('.identity-card__name');
          const cardStyle = card ? getComputedStyle(card) : null;
          const personStyle = card?.querySelector('.identity-card__person') ? getComputedStyle(card.querySelector('.identity-card__person')) : null;
          const box = element => {
            const rect = element?.getBoundingClientRect();
            return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
          };
          return viewport && stage && shell ? { viewport: box({ getBoundingClientRect: () => viewport }), stage: box({ getBoundingClientRect: () => stage }), shell: box({ getBoundingClientRect: () => shell }), card: box(card), name: box(name), nameTextLength: name?.textContent?.trim().length || 0, nameFontSize: Number.parseFloat(name ? getComputedStyle(name).fontSize : '0') || 0, mobileClass: card?.classList.contains('identity-card--preview-mobile'), display: cardStyle?.display || '', personDirection: personStyle?.flexDirection || '' } : null;
        })()`);
        const minimumMobileNameWidth = Math.max(8, Math.min(20, (mobileBounds?.nameTextLength || 1) * 6));
        assert(mobileBounds && Math.abs(mobileBounds.shell.left - mobileBounds.stage.left) <= 3 && Math.abs(mobileBounds.shell.top - mobileBounds.stage.top) <= 3 && Math.abs(mobileBounds.shell.width - mobileBounds.stage.width) <= 3 && mobileBounds.mobileClass && mobileBounds.personDirection === 'column' && mobileBounds.card.width >= 200 && mobileBounds.name.width >= minimumMobileNameWidth && mobileBounds.name.height >= 14 && mobileBounds.nameFontSize >= 12, `${layout} mobile preview is not an intentional readable mobile composition: ${JSON.stringify(mobileBounds)}.`);
        await captureRegion(`${layout}-mobile`, '.profile-studio-preview__viewport');
        await page.click('.profile-studio-preview__devices button:nth-child(1)', `${layout} desktop preview control`);
        await page.waitFor(`!document.querySelector('.profile-studio-preview__canvas--mobile')`, `${layout} desktop preview canvas`);
      }

      await page.evaluate(`(() => {
        const card = [...document.querySelectorAll('.profile-template-picker__card')].find(node => node.querySelector('strong')?.textContent.trim() === 'Compact');
        card?.click();
      })()`);
      await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card--layout-compact')`, 'restore Compact preview layout');
      // Layout selection is intentionally a real draft update. Reset it before
      // the later route/viewport checks so navigation is testing geometry rather
      // than being intercepted by the unsaved-changes guard.
      const layoutResetPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-dashboard-actions button')].find(button => button.textContent.trim() === 'Reset' && !button.disabled))`);
      if (layoutResetPending) {
        await page.click('.profile-dashboard-actions button:not(.profile-dashboard-actions__publish)', 'reset layout smoke draft');
        await page.waitFor(`([...document.querySelectorAll('.profile-dashboard-actions button')].find(button => button.textContent.trim() === 'Reset'))?.disabled === true`, 'reset layout smoke draft');
      }
      return { pickerLabels, measurements };
    });
    if (smokeMode === 'preview') {
      // The deterministic fixture was seeded through the local Supabase
      // service role and equipped through the authenticated RPC above. The
      // built editor therefore receives the same public cosmetic projection
      // without importing source modules that do not exist in a production
      // bundle.
      const publishPending = await page.evaluate(`Boolean([...document.querySelectorAll('.profile-dashboard-actions__publish')].find(button => !button.disabled))`);
      if (publishPending) {
        await page.click('.profile-dashboard-actions__publish', 'publish layout smoke draft');
        await page.waitFor(`document.querySelector('.profile-dashboard-actions__publish')?.disabled === true`, 'publish layout smoke draft');
        await assertPublishedExpressionVisible('layout smoke publish');
      }

      await publishRichProfileDraft();
      const publicEvidence = await capturePublishedLayouts();
      return { layoutState, mediaRail, backgroundUpload, avatarUpload, richFixture, publicEvidence, productionPreview: true };
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
      name_motion: RICH_PROFILE_FIXTURE.effects.nameMotion,
      avatar_effect: RICH_PROFILE_FIXTURE.effects.avatar,
      profile_border: RICH_PROFILE_FIXTURE.effects.border,
      profile_atmosphere: RICH_PROFILE_FIXTURE.effects.atmosphere,
      cursor_trail: RICH_PROFILE_FIXTURE.effects.cursor
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
    await page.waitFor(`document.readyState === 'complete' && location.pathname === '/profile/settings' && document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="appearance"]')?.hidden`, 'rehydrated active cosmetic Studio preview');
    await page.waitFor(`document.querySelector('.profile-studio-preview .name-effect-canvas__visual') && document.querySelector('.profile-studio-preview .name-effect-canvas__semantic')`, 'rehydrated active Studio NameEffectCanvas');
    const studioNameEffect = await page.evaluate(`(() => {
      const canvas = document.querySelector('.profile-studio-preview .name-effect-canvas__visual');
      const semantic = document.querySelector('.profile-studio-preview .name-effect-canvas__semantic');
      const canvasBox = canvas?.getBoundingClientRect();
      const semanticBox = semantic?.getBoundingClientRect();
      const previewShell = document.querySelector('.profile-studio-preview .profile-shell-page');
      const previewIdentity = document.querySelector('.profile-studio-preview .identity-card');
      return {
        canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: canvasBox?.width || 0, cssHeight: canvasBox?.height || 0 } : null,
        semantic: semantic ? { width: semanticBox?.width || 0, height: semanticBox?.height || 0, fontSize: getComputedStyle(semantic).fontSize } : null,
        distance: canvasBox && semanticBox ? Math.abs(canvasBox.left - semanticBox.left) + Math.abs(canvasBox.top - semanticBox.top) : null,
        previewShell: previewShell ? { className: previewShell.className, text: previewIdentity?.textContent?.trim().slice(0, 180) || '' } : null,
        previewIdentity: previewIdentity ? { className: previewIdentity.className, nameRenderer: previewIdentity.querySelector('.identity-card__name')?.className || '', nameAttributes: Object.fromEntries([...previewIdentity.querySelectorAll('.name-effect-canvas')].slice(0, 2).map(node => ['renderer', node.getAttribute('data-name-renderer') || ''])) } : null,
        selected: Object.fromEntries(['cosmetic-name_font', 'cosmetic-name_material', 'cosmetic-name_motion', 'cosmetic-avatar-effect', 'cosmetic-profile-border', 'cosmetic-profile-atmosphere', 'cosmetic-cursor-trail'].map(id => [id, document.getElementById(id)?.value || '']))
      };
    })()`);
    assert(studioNameEffect.canvas && studioNameEffect.semantic && studioNameEffect.canvas.width <= 2048 && studioNameEffect.canvas.height <= 512 && studioNameEffect.canvas.cssWidth <= studioNameEffect.semantic.width + 40 && studioNameEffect.canvas.cssHeight <= studioNameEffect.semantic.height + 28 && Number.parseFloat(studioNameEffect.semantic.fontSize) >= 12 && (studioNameEffect.distance ?? 999) <= 40, `Active Studio name effect has unsafe geometry: ${JSON.stringify(studioNameEffect)}.`);
    await page.evaluate(`(() => {
      document.querySelector('[data-editor-section="general"]')?.scrollIntoView({ block: 'start' });
    })()`);
    await page.setInputValue('#profile-bio', RICH_PROFILE_FIXTURE.bio, ['input']);
    try {
      await page.waitFor(`document.querySelector('.profile-studio-preview .identity-card__bio')?.textContent?.trim() === ${JSON.stringify(RICH_PROFILE_FIXTURE.bio)}`, 'identity draft in live preview');
    } catch (error) {
      const identityPreviewState = await page.evaluate(`(() => ({
        editorBio: document.querySelector('#profile-bio')?.value || '',
        previewBio: document.querySelector('.profile-studio-preview .identity-card__bio')?.textContent?.trim() || '',
        previewName: document.querySelector('.profile-studio-preview .identity-card__name')?.textContent?.trim() || '',
        previewText: document.querySelector('.profile-studio-preview .identity-card')?.textContent?.trim() || '',
        previewShell: document.querySelector('.profile-studio-preview .profile-shell-page')?.className || '',
        previewCards: document.querySelectorAll('.profile-studio-preview .identity-card').length
      }))()`);
      throw new Error(`${error.message} State: ${JSON.stringify(identityPreviewState)}`, { cause: error });
    }
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
    await page.waitFor(`(() => {
      const boundary = document.querySelector('.profile-studio-preview [data-profile-surface="true"]');
      const style = boundary ? getComputedStyle(boundary) : null;
      return style?.getPropertyValue('--profile-surface').trim().toUpperCase() === '#234567'
        && /35,\\s*69,\\s*103/.test(style?.backgroundColor || '')
        && (style?.backdropFilter || style?.webkitBackdropFilter || '').includes('blur(');
    })()`, 'surface color, opacity, and blur in the actual profile boundary');
    const surfaceBeforeUnrelatedEdit = await page.evaluate(`(() => {
      const surface = document.querySelector('.profile-studio-preview [data-profile-surface="true"]');
      const style = surface ? getComputedStyle(surface) : null;
      return style ? {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        fill: style.getPropertyValue('--profile-surface-fill').trim(),
        opacity: style.getPropertyValue('--profile-surface-opacity').trim(),
        blur: style.getPropertyValue('--profile-surface-blur').trim()
      } : null;
    })()`);
    const unrelatedTextColor = await page.evaluate(`document.querySelector('[data-color-role="text"] .appearance-editor__hex')?.value || '#F4F6FB'`);
    await page.setInputValue('[data-color-role="text"] .appearance-editor__hex', '#12ABEF', ['input']);
    await page.waitFor(`(() => {
      const surface = document.querySelector('.profile-studio-preview [data-profile-surface="true"]');
      const style = surface ? getComputedStyle(surface) : null;
      return style?.getPropertyValue('--profile-surface').trim().toUpperCase() === '#234567';
    })()`, 'surface survives unrelated appearance edit');
    const surfaceAfterUnrelatedEdit = await page.evaluate(`(() => {
      const surface = document.querySelector('.profile-studio-preview [data-profile-surface="true"]');
      const style = surface ? getComputedStyle(surface) : null;
      return style ? {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        fill: style.getPropertyValue('--profile-surface-fill').trim(),
        opacity: style.getPropertyValue('--profile-surface-opacity').trim(),
        blur: style.getPropertyValue('--profile-surface-blur').trim()
      } : null;
    })()`);
    assert(JSON.stringify(surfaceAfterUnrelatedEdit) === JSON.stringify(surfaceBeforeUnrelatedEdit), `Unrelated text edit changed the rendered profile surface: ${JSON.stringify({ before: surfaceBeforeUnrelatedEdit, after: surfaceAfterUnrelatedEdit })}.`);
    const originalBackgroundBlur = await page.evaluate(`document.querySelector('.profile-background-treatment input[type="range"]')?.value || '0'`);
    await page.click('#profile-customize-tab-media', 'switch to Media background treatment');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="media"]')?.hidden`, 'visible Media background treatment');
    await page.setInputValue('.profile-background-treatment input[type="range"]', 27, ['input']);
    await page.waitFor(`document.querySelector('.profile-background-treatment output')?.textContent?.trim() === '27px'`, 'background treatment blur draft value');
    const surfaceAfterBackgroundEdit = await page.evaluate(`(() => {
      const surface = document.querySelector('.profile-studio-preview [data-profile-surface="true"]');
      const style = surface ? getComputedStyle(surface) : null;
      const pageStyle = document.querySelector('.profile-studio-preview .profile-shell-page--preview') ? getComputedStyle(document.querySelector('.profile-studio-preview .profile-shell-page--preview')) : null;
      return style ? {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        fill: style.getPropertyValue('--profile-surface-fill').trim(),
        opacity: style.getPropertyValue('--profile-surface-opacity').trim(),
        blur: style.getPropertyValue('--profile-surface-blur').trim(),
        backgroundBlur: pageStyle?.getPropertyValue('--profile-background-blur').trim() || ''
      } : null;
    })()`);
    assert(surfaceAfterBackgroundEdit.backgroundBlur === '27px', `Background treatment did not update its own render field: ${JSON.stringify(surfaceAfterBackgroundEdit)}.`);
    assert(
      ['backgroundColor', 'backdropFilter', 'fill', 'opacity', 'blur'].every(field => surfaceAfterBackgroundEdit[field] === surfaceBeforeUnrelatedEdit[field]),
      `Background treatment changed the card surface fields it does not own: ${JSON.stringify({ before: surfaceBeforeUnrelatedEdit, after: surfaceAfterBackgroundEdit })}.`
    );
    const surfaceFieldsBeforeCrossEditor = { ...surfaceAfterBackgroundEdit };
    await page.click('#profile-customize-tab-appearance', 'switch back to Appearance');
    await page.waitFor(`document.querySelector('#profile-customize-tab-appearance')?.getAttribute('aria-selected') === 'true' && !document.querySelector('[data-editor-section="appearance"]')?.hidden`, 'visible Appearance editor after Media');
    await page.setInputValue('.appearance-editor__surface-grid [data-color-role="surface"] .appearance-editor__hex', '#345678', ['input']);
    await page.waitFor(`getComputedStyle(document.querySelector('.profile-studio-preview [data-profile-surface="true"]')).getPropertyValue('--profile-surface').trim().toUpperCase() === '#345678'`, 'surface remains editable after Media treatment');
    const backgroundAfterSurfaceEdit = await page.evaluate(`(() => {
      const pageStyle = document.querySelector('.profile-studio-preview .profile-shell-page--preview') ? getComputedStyle(document.querySelector('.profile-studio-preview .profile-shell-page--preview')) : null;
      const treatment = document.querySelector('.profile-background-treatment input[type="range"]');
      return { blur: pageStyle?.getPropertyValue('--profile-background-blur').trim() || '', input: treatment?.value || '' };
    })()`);
    assert(backgroundAfterSurfaceEdit.blur === surfaceFieldsBeforeCrossEditor.backgroundBlur && backgroundAfterSurfaceEdit.input === '27', `Appearance edit overwrote Media background treatment: ${JSON.stringify({ before: surfaceFieldsBeforeCrossEditor, after: backgroundAfterSurfaceEdit })}.`);
    const surfaceAfterCrossEditor = await page.evaluate(`(() => {
      const surface = document.querySelector('.profile-studio-preview [data-profile-surface="true"]');
      const style = surface ? getComputedStyle(surface) : null;
      return style ? {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        fill: style.getPropertyValue('--profile-surface-fill').trim(),
        opacity: style.getPropertyValue('--profile-surface-opacity').trim(),
        blur: style.getPropertyValue('--profile-surface-blur').trim()
      } : null;
    })()`);
    assert(
      surfaceAfterCrossEditor.backgroundColor !== surfaceBeforeUnrelatedEdit.backgroundColor
        && surfaceAfterCrossEditor.backdropFilter === surfaceBeforeUnrelatedEdit.backdropFilter
        && surfaceAfterCrossEditor.opacity === surfaceBeforeUnrelatedEdit.opacity
        && surfaceAfterCrossEditor.blur === surfaceBeforeUnrelatedEdit.blur,
      `Cross-editor surface state was not isolated: ${JSON.stringify({ before: surfaceBeforeUnrelatedEdit, after: surfaceAfterCrossEditor })}.`
    );
    await page.click('#profile-customize-tab-media', 'restore Media background treatment');
    await page.waitFor(`document.querySelector('#profile-customize-tab-media')?.getAttribute('aria-selected') === 'true'`, 'Media restore tab');
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
    const immediatePublishedMedia = await assertPublishedExpressionVisible('surface publish');
    const publishedState = await page.evaluate(`({
      publishDisabled: [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Publish profile')?.disabled ?? null,
      status: document.querySelector('.profile-dashboard-actions__message')?.textContent?.trim() || ''
    })`);
    const publishRequests = page.requestLog.filter(request => request.url.includes('save_profile_configuration_v2') || request.url.includes('publish_profile_configuration_v2') || request.url.includes('publish_profile_studio_v2')).length;
    assert(publishedState.publishDisabled === true, 'Publishing did not clear the dashboard draft state.');
    assert(publishRequests > publishRequestsAfter, 'Publishing the surface depth did not call the configuration RPCs.');
    const richPublished = await publishRichProfileDraft();
    // The fixture is seeded through the authenticated RPC boundary so the
    // browser exercises real uploaded media/cosmetic entitlements. Rehydrate
    // Studio before rotating layouts; this mirrors a user returning to the
    // editor and ensures the mounted layout editor receives the canonical ten
    // links rather than the pre-fixture empty draft it was first mounted with.
    await page.command('Page.navigate', { url: `${appUrl}/profile/settings?qa=rich-layout-${Date.now()}#customize-layout` });
    await page.waitFor(`document.readyState === 'complete' && location.pathname === '/profile/settings'`, 'rehydrate rich layout editor');
    await waitForStudioLayoutPicker('rehydrated rich layout picker');
    await page.waitFor(`document.querySelector('.profile-studio-preview .profile-shell-page--preview .identity-card')`, 'rehydrated rich layout preview');
    // The route first paints the empty editor context, then replaces it with
    // the authenticated V2 draft. Wait for the canonical opening projection so
    // the visitor-path assertion cannot sample that intentional loading state.
    const compactOpeningLinkCount = expectedLayoutLinks('compact').opening.length;
    await page.waitFor(`document.querySelectorAll('.profile-studio-preview .identity-card__links a').length === ${compactOpeningLinkCount}`, 'rehydrated rich opening links');
    const compactContinuationLinkCount = expectedLayoutLinks('compact').continuation.length;
    await page.waitFor(`document.querySelectorAll('.profile-studio-preview .profile-shell__continuation-links a').length === ${compactContinuationLinkCount}`, 'rehydrated rich continuation links');
    const visitorPreviewState = await page.evaluate(`(() => ({
      todayColor: Boolean(document.querySelector('.profile-studio-preview .profile-daily-roll .today-color')),
      ownerRoll: Boolean(document.querySelector('.profile-studio-preview .profile-daily-roll .profile-roll')),
      links: document.querySelectorAll('.profile-studio-preview .identity-card__links a').length,
      continuationLinks: document.querySelectorAll('.profile-studio-preview .profile-shell__continuation-links a').length,
      profileMore: Boolean(document.querySelector('.profile-studio-preview #profile-more'))
    }))()`);
    assert(visitorPreviewState.todayColor && !visitorPreviewState.ownerRoll && visitorPreviewState.links === compactOpeningLinkCount && visitorPreviewState.continuationLinks === compactContinuationLinkCount && visitorPreviewState.profileMore, `Visitor preview did not use the lightweight roll/link opening path: ${JSON.stringify(visitorPreviewState)}.`);
    const publicEvidence = await capturePublishedLayouts();
    return { draftState, publishedState, immediatePublishedMedia, mediaPublishRegression, identityLayout, publishRequests, mediaRail, studioNameEffect, richFixture, richPublished, publicEvidence };
  });

  await step('narrow mobile layout contains the dashboard and restores keyboard focus', async () => {
    await page.setViewport(390, 844);
    await page.waitFor(`document.querySelector('.profile-studio-preview__devices button:nth-child(2)')`, 'live preview device controls');
    await page.click('.profile-studio-preview__devices button:nth-child(2)', 'mobile live preview device');
    await page.waitFor(`document.querySelector('.profile-studio-preview__canvas--mobile .profile-shell-page--preview-mobile')`, 'bounded mobile live preview');
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
        device: phone?.classList.contains('profile-shell-page--preview-mobile') ? 'mobile' : (phone?.classList.contains('profile-shell-page--preview') ? 'desktop' : ''),
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

    const viewports = [
      [320, 568], [360, 640], [390, 844], [414, 896], [430, 932],
      [480, 900], [520, 900], [524, 900], [544, 900], [576, 900],
      [600, 960], [667, 375], [768, 1024], [1024, 768], [1100, 700],
      [1280, 720], [1366, 768], [1440, 900], [1920, 1080]
    ];
    const measurements = [];
    const customizeTabs = ['appearance', 'media', 'layout'];

    for (const [width, height] of viewports) {
      await page.setViewport(width, height);
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
          const previewSemantic = previewCard?.querySelector('.name-effect-canvas__semantic, .identity-card__name');
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
              copyClientWidth: previewCopy?.clientWidth || 0,
              semanticScrollWidth: previewSemantic?.scrollWidth || 0,
              semanticClientWidth: previewSemantic?.clientWidth || 0
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
          assert(['block', 'flex', 'grid'].includes(state.previewLayout?.display) && state.previewLayout.cardWidth <= state.previewLayout.canvasWidth + 1 && state.previewLayout.cardScrollWidth <= state.previewLayout.cardClientWidth + 1 && state.previewLayout.semanticScrollWidth <= state.previewLayout.semanticClientWidth + 1, `Narrow desktop preview card is not readable at ${width}px on ${tab}: ${JSON.stringify(state)}.`);
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
      const semantic = card?.querySelector('.name-effect-canvas__semantic, .identity-card__name');
      const sidebar = document.querySelector('.profile-dashboard-shell__sidebar');
      return {
        viewport: innerWidth,
        preview: previewBox ? { left: Math.round(previewBox.left), right: Math.round(previewBox.right), top: Math.round(previewBox.top), bottom: Math.round(previewBox.bottom), width: Math.round(previewBox.width), height: Math.round(previewBox.height) } : null,
        card: card ? { display: getComputedStyle(card).display, width: Math.round(card.getBoundingClientRect().width), scrollWidth: card.scrollWidth, clientWidth: card.clientWidth } : null,
        canvasWidth: Math.round(canvas?.getBoundingClientRect().width || 0),
        copy: copy ? { scrollWidth: copy.scrollWidth, clientWidth: copy.clientWidth, textScrollWidth: semantic?.scrollWidth || 0, textClientWidth: semantic?.clientWidth || 0 } : null,
        sidebarHidden: sidebar?.getAttribute('aria-hidden') === 'true' && sidebar?.hasAttribute('inert'),
        contained: Boolean(previewBox && previewBox.left >= -1 && previewBox.right <= innerWidth + 1 && previewBox.top >= -1 && previewBox.bottom <= innerHeight + 1),
        pageContained: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1
      };
    })()`);
    // NameEffectCanvas intentionally paints a bounded visual bleed around the
    // semantic text. The phone/page bounds are the overflow contract; the
    // semantic text itself must remain contained.
    assert(phonePreview.contained && phonePreview.pageContained && phonePreview.sidebarHidden && ['block', 'flex', 'grid'].includes(phonePreview.card?.display) && phonePreview.card.clientWidth >= 200 && phonePreview.card.width <= phonePreview.canvasWidth + 1 && phonePreview.card.scrollWidth <= phonePreview.card.clientWidth + 40 && phonePreview.copy?.textScrollWidth <= phonePreview.copy.textClientWidth + 1, `Phone live preview is not a readable bounded drawer: ${JSON.stringify(phonePreview)}.`);
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
        const destinationUrl = `${appUrl}/profile/settings#${destination}`;
        // A previous editor assertion may intentionally leave a draft source
        // dirty even after the layout draft was published. Navigate through
        // the real production guard and discard that disposable smoke draft if
        // it appears, rather than allowing the guard to turn into a timeout.
        await page.command('Page.navigate', { url: destinationUrl });
        await page.waitFor(`Boolean(document.querySelector('.profile-studio-dirty-prompt')) || (document.readyState === 'complete' && location.pathname === '/profile/settings' && document.querySelector('.profile-dashboard-shell__nav button.active[data-section="${destination}"]'))`, `${destination} navigation request at ${width}px`, 30000);
        if (await page.evaluate('Boolean(document.querySelector(".profile-studio-dirty-prompt"))')) {
          await page.click('.profile-studio-dirty-prompt__discard', `${destination} discard smoke draft`);
        }
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

    return { viewports, measurements, drawer, tabletToggle, tabletPreview, phonePreview, destinationMeasurements };
  });

  await step('production Discovery keeps its route shell and card geometry bounded', async () => {
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
      await page.navigate(`${appUrl}/leaderboard`, `Discovery at ${width}x${height}`);
      await page.waitFor(`location.pathname === '/leaderboard' && document.querySelector('.discovery-hub')`, `Discovery shell at ${width}px`, 30000);
      await page.clickText('New', { description: `Discovery New profiles tab at ${width}px` });
      await page.waitFor('document.querySelector(".discovery-card, .discovery-empty")', `Discovery results at ${width}px`, 30000);
      await delay(120);
      const state = await page.evaluate(`(() => {
        const rect = element => {
          const box = element?.getBoundingClientRect();
          return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
        };
        const intersects = (left, right) => Boolean(left && right && left.left < right.right - 1 && right.left < left.right - 1 && left.top < right.bottom - 1 && right.top < left.bottom - 1);
        const shell = document.querySelector('.discovery-hub');
        const grid = document.querySelector('.discovery-grid');
        const items = [...document.querySelectorAll('.discovery-grid__item')];
        const cards = [...document.querySelectorAll('.discovery-card')];
        const heading = document.querySelector('.discovery-heading');
        const headingCopy = heading?.firstElementChild;
        const filters = document.querySelector('.discovery-filters');
        const visible = element => {
          if (!element) return false;
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const avatarStates = cards.map(card => {
          const image = card.querySelector('.discovery-card__avatar img');
          const fallback = card.querySelector('.discovery-card__avatar-initial');
          return { imageLoaded: Boolean(image?.complete && image.naturalWidth > 0), fallback: visible(fallback) };
        });
        const outOfShell = [...document.querySelectorAll('.discovery-grid__item, .discovery-card__avatar, .discovery-card__cta, .discovery-filters input, .discovery-filters select, .discovery-filter-button')]
          .map(element => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.left < shell?.getBoundingClientRect().left - 1 || box.right > shell?.getBoundingClientRect().right + 1)
          .slice(0, 8)
          .map(({ element, box }) => ({ selector: element.className || element.tagName, left: box.left, right: box.right }));
        return {
          viewport: [innerWidth, innerHeight],
          shell: rect(shell),
          grid: rect(grid),
          gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean).length : 0,
          items: items.map(item => ({ box: rect(item), columnStart: getComputedStyle(item).gridColumnStart, columnEnd: getComputedStyle(item).gridColumnEnd, featured: item.classList.contains('discovery-grid__item--featured') })),
          cards: cards.map(card => rect(card)),
          heading: rect(heading),
          filters: rect(filters),
          headingFiltersOverlap: visible(filters) && intersects(headingCopy?.getBoundingClientRect(), filters?.getBoundingClientRect()),
          avatarStates,
          outOfShell
        };
      })()`);
      assert(state.shell && state.shell.width >= Math.min(width - 16, 900), `Discovery shell is still constrained at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.grid && state.gridColumns === 1, `Discovery grid has competing column ownership at ${width}px: ${JSON.stringify(state)}.`);
      assert(!state.outOfShell.length && !state.headingFiltersOverlap, `Discovery controls escape or overlap at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.items.every(item => item.box && item.box.left >= state.shell.left - 1 && item.box.right <= state.shell.right + 1), `Discovery card wrapper escapes its route shell at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.items.every(item => !item.featured || (item.columnStart === '1' && (item.columnEnd === '-1' || item.columnEnd === '2'))), `Featured Discovery wrapper does not own its grid placement at ${width}px: ${JSON.stringify(state)}.`);
      assert(state.avatarStates.every(avatar => avatar.imageLoaded || avatar.fallback), `Discovery contains an unloaded avatar without a fallback at ${width}px: ${JSON.stringify(state)}.`);
      measurements.push({ width, height, ...state });
    }

    await capture('11-discovery-responsive');
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
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] .identity-card')`, 'public profile canvas');
    await page.command('Page.reload', { ignoreCache: true });
    await delay(350);
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] .identity-card')`, 'public profile after direct refresh');
    const state = await page.evaluate(`(() => {
      const pageElement = document.querySelector('.profile-shell-page');
      const card = document.querySelector('.profile-shell-page .identity-card');
      const boundary = document.querySelector('.profile-shell-page .profile-shell__identity-boundary');
      const roll = document.querySelector('.profile-shell-page [data-profile-region="roll"]');
      const pageStyle = getComputedStyle(pageElement);
      const cardStyle = getComputedStyle(card);
      const boundaryStyle = boundary ? getComputedStyle(boundary) : null;
      const rollStyle = roll ? getComputedStyle(roll) : null;
      const pageBox = pageElement?.getBoundingClientRect();
      const media = [...document.querySelectorAll('.profile-shell__media-image, .profile-shell__media-video')].map(element => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return { position: style.position, inset: style.inset, width: box.width, height: box.height, objectFit: style.objectFit, naturalWidth: element.naturalWidth || 0, naturalHeight: element.naturalHeight || 0, complete: element.complete ?? true };
      });
      const nameCanvas = document.querySelector('.name-effect-canvas__visual');
      const nameSemantic = document.querySelector('.name-effect-canvas__semantic');
      const nameCanvasBox = nameCanvas?.getBoundingClientRect();
      const nameSemanticBox = nameSemantic?.getBoundingClientRect();
      return {
        path: location.pathname,
        username: document.querySelector('.identity-card')?.getAttribute('data-profile-path')?.slice(1) || '',
        canvas: Boolean(pageElement),
        card: Boolean(card),
        roll: Boolean(roll),
        cardBlur: cardStyle.getPropertyValue('--profile-surface-blur').trim(),
        cardBackdropFilter: cardStyle.backdropFilter || cardStyle.webkitBackdropFilter || '',
        boundary: Boolean(boundary),
        boundaryBackdropFilter: boundaryStyle?.backdropFilter || boundaryStyle?.webkitBackdropFilter || '',
        boundarySurface: Boolean(boundaryStyle && (boundaryStyle.backdropFilter || boundaryStyle.webkitBackdropFilter) !== 'none'),
        boundaryBox: boundary ? { width: boundary.getBoundingClientRect().width, height: boundary.getBoundingClientRect().height } : null,
        pageBlur: pageStyle.getPropertyValue('--profile-surface-blur').trim(),
        rollBlur: rollStyle?.getPropertyValue('--profile-surface-blur').trim() || '',
        pageBackground: pageStyle.backgroundImage || pageStyle.backgroundColor,
        pageMediaImage: Boolean(document.querySelector('.profile-shell__media-image')),
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
    const expectedCardBlur = smokeMode === 'preview' ? '20px' : '40px';
    assert(state.cardBlur === expectedCardBlur, `Public profile identity card did not honor the expected max blur: ${state.cardBlur} (expected ${expectedCardBlur}). State: ${JSON.stringify(state)}`);
    if (state.boundarySurface) {
      assert(state.boundaryBackdropFilter.includes('blur('), 'Public profile identity surface has no computed backdrop blur filter.');
    } else {
      assert(!state.boundaryBackdropFilter || state.boundaryBackdropFilter === 'none', `Cardless public layout unexpectedly owns a backdrop filter: ${state.boundaryBackdropFilter}.`);
    }
    assert(state.pageBox && Math.abs(state.pageBox.width - 1440) <= 1 && Math.abs(state.pageBox.height - 900) <= 1, `Public profile environment does not fill the viewport: ${JSON.stringify(state)}.`);
    for (const media of state.media) {
      assert(media.complete && media.naturalWidth > 0 && media.naturalHeight > 0 && media.position === 'fixed' && media.objectFit === 'cover' && media.width >= 1439 && media.height >= 899, `Public background media is not viewport-bound: ${JSON.stringify(state)}.`);
    }
    if (state.nameEffect) {
      // The visual canvas intentionally extends by the renderer's bounded
      // 18px/12px bleed around the semantic name for glow and motion. Validate
      // that bounded relationship instead of treating the bleed as a layout
      // displacement.
      assert(state.nameEffect.canvasWidth <= 2048 && state.nameEffect.canvasHeight <= 512 && state.nameEffect.cssWidth < 360 && state.nameEffect.cssHeight < 100 && Number.parseFloat(state.nameEffect.fontSize) >= 12 && state.nameEffect.distance <= 32, `Public effected username geometry is unsafe: ${JSON.stringify(state)}.`);
    }
    assert(!state.pageBlur && !state.rollBlur, 'Public appearance variables leaked outside the card surface.');
    await capture('07-public-profile');
    await page.setViewport(390, 844);
    await page.command('Page.reload', { ignoreCache: true });
    await page.waitFor(`document.querySelector('.profile-shell-page[aria-busy="false"]') && document.querySelector('.profile-shell-page[aria-busy="false"] .identity-card')`, 'public profile mobile after direct refresh');
    await page.waitFor(`(() => { const pageElement = document.querySelector('.profile-shell-page[aria-busy="false"]'); const image = pageElement?.querySelector('.profile-shell__media-image'); return Boolean(pageElement && image?.complete && image.naturalWidth > 0 && image.currentSrc); })()`, 'mobile uploaded background after direct refresh');
    await delay(150);
    await page.waitFor(`(() => { const pageElement = document.querySelector('.profile-shell-page[aria-busy="false"]'); const image = pageElement?.querySelector('.profile-shell__media-image'); return Boolean(pageElement && image?.complete && image.naturalWidth > 0 && image.currentSrc); })()`, 'stable mobile uploaded background after direct refresh');
    const mobile = await page.evaluate(`(() => {
      const pageElement = document.querySelector('.profile-shell-page');
      const image = document.querySelector('.profile-shell__media-image');
      const box = image?.getBoundingClientRect();
      const style = image ? getComputedStyle(image) : null;
      return { page: pageElement?.getBoundingClientRect(), media: image && box && style ? { complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, position: style.position, inset: style.inset, objectFit: style.objectFit, width: box.width, height: box.height } : null };
    })()`);
    assert(mobile.media && mobile.media.complete && mobile.media.naturalWidth > 0 && mobile.media.position === 'fixed' && mobile.media.objectFit === 'cover' && mobile.media.width >= 389 && mobile.media.height >= 843, `Mobile uploaded background did not cover the public viewport: ${JSON.stringify(mobile)}.`);
    await capture('07-public-profile-mobile');
    await page.setViewport(1440, 900);
    return { ...state, mobile };
  });

  await step('critical profile assets load without stale or missing chunks', async () => {
    if (smokeMode !== 'preview') {
      return { developmentMode: true, hashedAssetCheck: 'production-only' };
    }
    const failedAssets = page.requestLog.filter(request => {
      const isAsset = /\/assets\/|\.(?:css|js)(?:\?|$)/i.test(request.url);
      return isAsset && (request.failed || Number(request.status) >= 400);
    });
    assert(!failedAssets.length, `Profile build requested missing or failed assets: ${JSON.stringify(failedAssets.slice(0, 8))}.`);
    const state = await page.evaluate(`(() => {
      const sheets = [...document.styleSheets].map(sheet => sheet.href || '').filter(Boolean);
      return { sheets, missing: ['ProfileShell-', 'NameEffectCanvas-'].filter(prefix => !sheets.some(href => href.includes(prefix))) };
    })()`);
    const studioPreviewCss = page.requestLog.filter(request => request.url.includes('/assets/ProfileStudioPreview-') && !request.failed && Number(request.status) < 400);
    assert(!state.missing.length && studioPreviewCss.length > 0, `Critical profile CSS was not active or did not load during Studio: ${JSON.stringify({ ...state, studioPreviewCss })}.`);
    return {
      failedAssets,
      activePublicSheets: state.sheets.filter(href => /ProfileShell-|NameEffectCanvas-/.test(href)),
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
