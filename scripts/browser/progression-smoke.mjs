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
  terminateProcess
} from './cdp-harness.mjs';
import { createSupabaseHeaders, getSupabaseCredentials } from '../../functions/_supabaseApi.js';

const environment = await loadLocalEnvironment();
if (!environment.url || !environment.key) {
  throw new Error('Progression smoke requires local VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY credentials.');
}
const supabaseUrl = assertLocalSupabaseUrl(environment.url);
const execFileAsync = promisify(execFile);

const evidenceDir = await mkdtemp(join(tmpdir(), 'chromadie-progression-smoke-'));
const appPort = await findAvailablePort(defaultAppPort + 20);
const debugPort = await findAvailablePort(defaultDebugPort + 20);
const appUrl = `http://127.0.0.1:${appPort}`;
const accountSuffix = Date.now().toString(36).slice(-8);
const canonicalUsername = `prog${accountSuffix}`;
const accountEmail = `progression-${accountSuffix}@example.test`;
const accountPassword = `Progression-${accountSuffix}-Pass!`;
const results = { status: 'running', evidenceDir, steps: [], screenshots: [] };
let server;
let chromium;
let failure;
let localServiceRoleKey = '';
let disposableUserId = '';
const previousRolloutStage = process.env.VITE_CHROMADIE_ROLLOUT_STAGE;
const previousProgressionFlag = process.env.VITE_CHROMADIE_FLAG_PROGRESSION_JOURNEY;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function step(name, action) {
  const started = Date.now();
  try {
    const detail = await action();
    results.steps.push({ name, status: 'passed', durationMs: Date.now() - started, detail });
    console.log(`[progression-smoke] PASS ${name}`);
    return detail;
  } catch (error) {
    results.steps.push({ name, status: 'failed', durationMs: Date.now() - started, error: error.message });
    throw error;
  }
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
    localServiceRoleKey = String(stdout).match(/^SERVICE_ROLE_KEY=(.+)$/m)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '') || '';
  } catch {
    localServiceRoleKey = '';
  }
  return localServiceRoleKey;
}

async function serviceRest(path, { method = 'GET', body, headers = {} } = {}) {
  const serviceRoleKey = await getLocalServiceRoleKey();
  assert(serviceRoleKey, 'A local Supabase service role key is required for the reversible authenticated progression fixture.');
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

async function cleanupDisposableAccount() {
  if (!disposableUserId) return { status: 'skipped', reason: 'No authenticated fixture account was created.' };
  const serviceRoleKey = await getLocalServiceRoleKey();
  if (!serviceRoleKey) {
    return { status: 'blocked', userId: disposableUserId, reason: 'Local Supabase service role key was unavailable.' };
  }

  const headers = createSupabaseHeaders({
    apiKey: serviceRoleKey,
    projectKeyIsLegacy: !serviceRoleKey.startsWith('sb_secret_')
  });
  if (!headers.Authorization) headers.Authorization = 'Bearer ' + serviceRoleKey;
  const response = await fetch(supabaseUrl.origin + '/auth/v1/admin/users/' + encodeURIComponent(disposableUserId), {
    method: 'DELETE',
    headers
  });
  const text = await response.text();
  if (response.ok || response.status === 404) {
    return {
      status: response.status === 404 ? 'already_absent' : 'deleted',
      userId: disposableUserId
    };
  }
  return {
    status: 'failed',
    userId: disposableUserId,
    reason: 'Local Supabase auth admin deletion returned HTTP ' + response.status + ': ' + text.slice(0, 500)
  };
}

async function getBrowserSession() {
  const state = await chromium.page.evaluate(`(() => {
    const candidate = Object.values(localStorage)
      .map(value => { try { return JSON.parse(value); } catch { return null; } })
      .find(value => value?.access_token && value?.user?.id);
    return {
      accessToken: typeof candidate?.access_token === 'string' ? candidate.access_token : '',
      userId: typeof candidate?.user?.id === 'string' ? candidate.user.id : '',
      username: typeof candidate?.user?.user_metadata?.username === 'string' ? candidate.user.user_metadata.username : ''
    };
  })()`);
  assert(/^[0-9a-f-]{36}$/i.test(state?.userId || ''), `Could not resolve the disposable browser account: ${JSON.stringify({ userId: state?.userId || '', username: state?.username || '' })}.`);
  return state;
}

async function callAuthenticatedRpc(functionName, args = {}) {
  const result = await chromium.page.evaluate(`(async () => {
    const session = Object.values(localStorage)
      .map(value => { try { return JSON.parse(value); } catch { return null; } })
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

async function seedEstablishedAccountFixture(userId) {
  // Bootstrap the same owner configuration contract Profile Studio uses, then
  // publish only the story-visibility bit through the local service fixture so
  // the public profile can prove its bounded progression story without
  // granting any gameplay or reward authority in the browser.
  const ownerConfiguration = await callAuthenticatedRpc('get_my_profile_configuration');
  assert(ownerConfiguration?.success === true, 'Owner profile configuration bootstrap failed: ' + JSON.stringify(ownerConfiguration) + '.');
  const configurationRows = await serviceRest(`/rest/v1/profile_configurations?select=draft_config,published_config,draft_config_v2,published_config_v2&user_id=eq.${encodeURIComponent(userId)}`);
  assert(Array.isArray(configurationRows) && configurationRows[0], 'The authenticated profile configuration fixture was not persisted.');
  const markStoryVisible = value => {
    if (!value || typeof value !== 'object') return value;
    const next = { ...value, storyVisible: true };
    if (Array.isArray(value.modules)) {
      next.modules = value.modules.map(module => module?.id === 'explore' ? { ...module, visible: false } : module);
    }
    if (value.base && typeof value.base === 'object') next.base = markStoryVisible(value.base);
    return next;
  };
  await serviceRest(`/rest/v1/profile_configurations?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      draft_config: markStoryVisible(configurationRows[0].draft_config),
      published_config: markStoryVisible(configurationRows[0].published_config),
      draft_config_v2: markStoryVisible(configurationRows[0].draft_config_v2),
      published_config_v2: markStoryVisible(configurationRows[0].published_config_v2)
    }
  });

  const historicalEvents = Array.from({ length: 3 }, (_, index) => ({
    user_id: userId,
    event_key: `progression-smoke-history-${index + 1}`,
    event_type: 'roll',
    occurred_at: new Date(Date.now() - ((index + 2) * 86400000)).toISOString(),
    payload: {
      hex: ['#14253D', '#5A3B72', '#D06B52'][index],
      score: [1840, 7320, 16840][index],
      rarity: ['Common', 'Rare', 'Epic'][index]
    }
  }));

  // Only the local service role writes this deterministic owner fixture. The
  // browser subsequently reads the normal authenticated RPCs and public story
  // boundary; no browser code grants inventory, milestones, or premium access.
  await serviceRest(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      lifetime_ep: 2250000,
      total_rolls: 42,
      current_streak: 5,
      longest_streak: 9
    }
  });
  await serviceRest('/rest/v1/profile_events?on_conflict=user_id,event_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: historicalEvents
  });
  await serviceRest('/rest/v1/user_achievements?on_conflict=user_id,achievement_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [{
      user_id: userId,
      achievement_id: 'rarity_rare',
      unlocked_at: new Date(Date.now() - 3600000).toISOString(),
      count: 1
    }]
  });
  await serviceRest('/rest/v1/profile_entitlements?on_conflict=user_id,entitlement_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [
      { user_id: userId, entitlement_key: 'chromadie_plus', source: 'progression-browser-smoke' },
      { user_id: userId, entitlement_key: 'atelier_plus', source: 'progression-browser-smoke' }
    ]
  });
  await serviceRest('/rest/v1/billing_premium_access?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: userId, active: true }
  });
  await serviceRest('/rest/v1/profile_social_settings?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: userId, activity_visible: true }
  });
  // A first roll can legitimately discover Rare before this established
  // fixture is applied. Remove only that test account's prior ledger row so
  // the durable achievement is reconciled through the historical service
  // path, with no client-side provenance rewrite.
  await serviceRest(`/rest/v1/user_progression_milestones?user_id=eq.${encodeURIComponent(userId)}&milestone_id=eq.journey_rarity_rare`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' }
  });

  const reconciliation = await serviceRest('/rest/v1/rpc/reconcile_progression_account', {
    method: 'POST',
    body: { p_user_id: userId }
  });
  assert(reconciliation?.success === true, `Historical progression fixture reconciliation failed: ${JSON.stringify(reconciliation)}`);

  const ledger = await serviceRest(`/rest/v1/user_progression_milestones?select=milestone_id,unlock_source,presented_at,acknowledged_at&user_id=eq.${encodeURIComponent(userId)}&order=milestone_id.asc`);
  const completedIds = Array.isArray(ledger) ? ledger.map(row => row?.milestone_id).filter(Boolean) : [];
  assert(completedIds.includes('journey_first_roll') && completedIds.includes('journey_roll_10'), `Historical progression fixture did not produce expected completed milestones: ${JSON.stringify(ledger)}`);
  const rareLedger = Array.isArray(ledger) ? ledger.find(row => row?.milestone_id === 'journey_rarity_rare') : null;
  assert(rareLedger?.acknowledged_at && ['historical_backfill', 'live'].includes(rareLedger.unlock_source), `Rare discovery fixture did not preserve a server-owned acknowledged ledger row: ${JSON.stringify(rareLedger)}`);

  return {
    lifetimeEp: 2250000,
    totalRolls: 42,
    currentStreak: 5,
    longestStreak: 9,
    rareDiscovery: 'journey_rarity_rare',
    nextDayState: 'current_streak=5, longest_streak=9',
    historicalEvents: historicalEvents.length,
    entitlementKeys: ['chromadie_plus', 'atelier_plus'],
    publicActivityVisible: true,
    publicStoryVisible: true,
    rareLedger,
    reconciledMilestones: completedIds
  };
}

async function waitForService(path, predicate, description, attempts = 12) {
  let lastValue = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastValue = await serviceRest(path);
    if (predicate(lastValue)) return lastValue;
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${description}: ${JSON.stringify(lastValue)}`);
}

async function inspectAuthenticatedProgression(width, height, label) {
  await chromium.page.setViewport(width, height);
  await chromium.page.navigate(`${appUrl}/progression`, `${label} authenticated progression route`);
  await chromium.page.waitFor(
    `location.pathname === '/progression' && document.querySelector('.progression-page__account-bar') && document.querySelector('.profile-progression-surface--page')`,
    `${label} authenticated progression surface`,
    30000
  );
  await chromium.page.waitFor(
    `document.querySelector('#profile-progression-rank-title')?.textContent?.includes('Silver')`,
    `${label} established rank data`,
    30000
  );
  await chromium.page.waitFor(
    `document.querySelector('.progression-page__roll-status')`,
    `${label} server-owned daily roll status`,
    30000
  );
  const initialAccordion = await chromium.page.evaluate("[...document.querySelectorAll('.profile-progression-lane__toggle')].every(toggle => toggle.getAttribute('aria-expanded') === 'false')");
  assert(initialAccordion, `${label} did not start with collapsed progression paths.`);
  const ritualToggle = await chromium.page.evaluate("Boolean(document.querySelector('[aria-labelledby=\"profile-progression-lane-ritual\"] .profile-progression-lane__toggle'))");
  assert(ritualToggle, 'The Ritual lane did not expose its accordion control.');
  await chromium.page.click('[aria-labelledby="profile-progression-lane-ritual"] .profile-progression-lane__toggle', `${label} Ritual accordion`);
  const expandedRitual = await chromium.page.waitFor("document.querySelector('[aria-labelledby=\"profile-progression-lane-ritual\"] .profile-progression-lane__toggle[aria-expanded=\"true\"]')", 'expanded Ritual accordion', 5000);
  assert(expandedRitual, 'The Ritual lane did not expand after the click.');
  const futureButton = await chromium.page.evaluate("Boolean([...document.querySelectorAll('[aria-labelledby=\"profile-progression-lane-ritual\"] button')].find(element => element.textContent?.trim() === 'See later goals'))");
  assert(futureButton, 'The expanded Ritual lane did not expose its future goals control.');
  await chromium.page.evaluate("(() => { const lane = document.querySelector('[aria-labelledby=\"profile-progression-lane-ritual\"]'); const button = [...(lane?.querySelectorAll('button') || [])].find(element => element.textContent?.trim() === 'See later goals'); if (!button) return false; button.scrollIntoView({ block: 'center', inline: 'nearest' }); button.click(); return true; })()");
  const expandedRitualState = await chromium.page.waitFor("document.querySelector('[aria-labelledby=\"profile-progression-lane-ritual\"]')?.textContent?.includes('50 rolls')", 'expanded Ritual future goals', 5000);
  assert(expandedRitualState, 'The Ritual lane did not expose a working future goals control after the click.');
  await chromium.page.waitFor("document.querySelectorAll('.progression-reward-preview__thumbnail').length === 0 || document.querySelector('.progression-reward-preview__thumbnail .shop-preview-area')", 'canonical progression reward thumbnails', 30000);
  const state = await chromium.page.evaluate(`(() => {
    const root = document.documentElement;
    const stats = [...document.querySelectorAll('.profile-progression-stats > div')].map(item => item.textContent.trim().replace(/\\s+/g, ' '));
    const progressbars = [...document.querySelectorAll('[role="progressbar"]')].map(item => ({ label: item.getAttribute('aria-label') || '', value: item.getAttribute('aria-valuenow') || '' }));
    const recentUnlocks = document.querySelector('.profile-progression-unlocks');
    const recentPreview = recentUnlocks?.querySelector('.progression-reward-preview');
    const recentThumbnail = recentPreview?.querySelector('.progression-reward-preview__thumbnail');
    const recentSemantic = recentThumbnail?.querySelector('.name-effect-canvas__semantic');
    const recentThumbnailRect = recentThumbnail?.getBoundingClientRect();
    const recentSemanticRect = recentSemantic?.getBoundingClientRect();
    const rect = value => value ? { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height } : null;
    const text = document.querySelector('.progression-page')?.textContent?.trim().replace(/\\s+/g, ' ') || '';
    const todayRollDetail = document.querySelector('.progression-page__rail-detail[aria-labelledby="progression-today-roll-title"]');
    const rollSignalsDetail = document.querySelector('.progression-page__rail-detail--signals');
    const accountAction = document.querySelector('.progression-page__streak-strip .progression-page__account-actions');
    return {
      path: location.pathname,
      accountBar: Boolean(document.querySelector('.progression-page__account-bar')),
      profileProgression: Boolean(document.querySelector('.profile-progression-surface--page')),
      streakText: document.querySelector('.progression-page__streak-strip')?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      rollTodayButtonVisible: Boolean([...accountAction?.querySelectorAll('a') || []].find(element => /roll today|roll and explore/i.test(element.textContent || ''))),
      rollCompleteStatus: document.querySelector('.progression-page__roll-status')?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      dailyRollDetail: todayRollDetail?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      rollSignalsDetail: rollSignalsDetail?.textContent?.trim().replace(/\\s+/g, ' ') || '',
      rank: document.querySelector('#profile-progression-rank-title')?.textContent?.trim() || '',
      stats,
      streakStrip: Boolean(document.querySelector('.progression-page__streak-strip')),
      paths: text.includes('Your paths'),
      accordionExpanded: Boolean(document.querySelector('.profile-progression-lane__toggle[aria-expanded="true"]')),
      approachingRoll50: /42\\s*\\/\\s*50\\s+rolls/i.test(text),
      approachingGoalText: text.includes('50 rolls') ? text.slice(Math.max(0, text.indexOf('50 rolls') - 120), text.indexOf('50 rolls') + 180) : '',
      recentUnlocks: Boolean(document.querySelector('.profile-progression-unlocks')),
      recentPreviewWide: Boolean(recentPreview?.classList.contains('progression-reward-preview--wide')),
      recentPreviewFits: Boolean(recentSemanticRect && recentThumbnailRect && recentSemanticRect.left >= recentThumbnailRect.left - 1 && recentSemanticRect.right <= recentThumbnailRect.right + 1 && recentSemanticRect.top >= recentThumbnailRect.top - 1 && recentSemanticRect.bottom <= recentThumbnailRect.bottom + 1),
      recentPreviewRatio: recentThumbnailRect ? recentThumbnailRect.width / Math.max(1, recentThumbnailRect.height) : 0,
      recentThumbnailRect: rect(recentThumbnailRect),
      recentSemanticRect: rect(recentSemanticRect),
      recentUnlockColumns: recentUnlocks ? getComputedStyle(recentUnlocks.querySelector('ol')).gridTemplateColumns : '',
      rankRing: Boolean(document.querySelector('.profile-progression-rank__ring')),
      pathIconCount: document.querySelectorAll('.progression-path-icon').length,
      rewardThumbnailCount: document.querySelectorAll('.progression-reward-preview__thumbnail').length,
      canonicalThumbnailCount: document.querySelectorAll('.progression-reward-preview__thumbnail .shop-preview-area').length,
      placeholderRewardText: text.includes('Preview reward'),
      radialBackground: getComputedStyle(document.querySelector('.progression-page')).backgroundImage.includes('radial-gradient'),
      progressbars,
      horizontalOverflow: root.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  })()`);
  assert(state.path === '/progression', `${label} did not settle at /progression.`);
  assert(state.accountBar && state.profileProgression, `${label} did not render the authenticated progression surface: ${JSON.stringify(state)}.`);
  assert(/^Silver(?: rank)?$/.test(state.rank), `${label} did not render the established Silver rank: ${JSON.stringify(state)}.`);
  assert(state.stats.some(value => value.includes('42')), `${label} did not render the established 42-roll history: ${JSON.stringify(state)}.`);
  assert(state.stats.some(value => value.includes('9d')), `${label} did not render the established streak history: ${JSON.stringify(state)}.`);
  assert(state.streakStrip && state.paths && state.accordionExpanded && state.approachingRoll50, `${label} did not render the focused progression hierarchy: ${JSON.stringify(state)}.`);
  assert(!state.rollTodayButtonVisible && state.rollCompleteStatus === 'Rolled today', `${label} exposed a duplicate daily-roll action after the server recorded today's roll: ${JSON.stringify(state)}.`);
  assert(/#[0-9A-F]{6}/i.test(state.dailyRollDetail) && /pts/i.test(state.dailyRollDetail), `${label} did not render the recorded daily-roll details in the left rail: ${JSON.stringify(state)}.`);
  assert(state.rollSignalsDetail && !/scoring signals\s*$/i.test(state.rollSignalsDetail), `${label} did not render server-reported scoring signals in the left rail: ${JSON.stringify(state)}.`);
  assert(state.recentUnlocks, `${label} did not render historical progression rewards: ${JSON.stringify(state)}.`);
  assert(!state.recentUnlocks || (state.recentPreviewWide && state.recentPreviewFits && state.recentPreviewRatio >= 1.5), `${label} recent cosmetic preview is clipped or still using a square viewport: ${JSON.stringify(state)}.`);
  assert(state.rankRing, `${label} did not render the rank progress ring: ${JSON.stringify(state)}.`);
  assert(state.pathIconCount >= 3, `${label} did not render the three path glyphs: ${JSON.stringify(state)}.`);
  assert(state.rewardThumbnailCount === 0 || state.canonicalThumbnailCount >= 1, `${label} did not render a canonical cosmetic thumbnail: ${JSON.stringify(state)}.`);
  assert(!state.placeholderRewardText, `${label} still exposes placeholder reward copy: ${JSON.stringify(state)}.`);
  assert(state.radialBackground, `${label} progression page is missing its grayscale vignette: ${JSON.stringify(state)}.`);
  assert(!state.horizontalOverflow, `${label} progression surface overflows horizontally.`);
  assert(state.streakStrip && /5\s+of\s+14\s+days/i.test(state.streakText), 'Established progression did not render the persisted next-day current streak state: ' + JSON.stringify(state) + '.');
  return state;
}

async function inspectViewport(width, height, label) {
  await chromium.page.setViewport(width, height);
  await chromium.page.navigate(`${appUrl}/progression`, `${label} progression route`);
  await chromium.page.waitFor(
    `location.pathname === '/progression' && document.querySelector('.progression-page')`,
    `${label} progression surface`,
    30000
  );
  await chromium.page.waitFor(
    `Boolean(document.querySelector('.progression-page__state, .progression-page__account-bar'))`,
    `${label} progression state`,
    30000
  );
  const state = await chromium.page.evaluate(`(() => {
    const root = document.documentElement;
    return {
      path: location.pathname,
      headerCount: document.querySelectorAll('[data-site-chrome="header"]').length,
      title: document.querySelector('#progression-page-title')?.textContent?.trim() || '',
      stateVisible: Boolean(document.querySelector('.progression-page__state, .progression-page__account-bar')),
      horizontalOverflow: root.scrollWidth > window.innerWidth + 1,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  })()`);
  assert(state.path === '/progression', `${label} did not settle at /progression.`);
  assert(state.headerCount === 1, `${label} rendered ${state.headerCount} site headers.`);
  assert(state.title === 'Progression', `${label} progression title is missing.`);
  assert(state.stateVisible, `${label} progression state is missing.`);
  assert(!state.horizontalOverflow, `${label} progression surface overflows horizontally.`);
  return state;
}

try {
  // Keep the local evidence deterministic: public progression proof is a
  // rollout-gated surface, so this test-only server starts in the all bucket.
  process.env.VITE_CHROMADIE_ROLLOUT_STAGE = 'all';
  process.env.VITE_CHROMADIE_FLAG_PROGRESSION_JOURNEY = 'true';
  server = await startVite({ appPort, environment, evidenceDir });
  chromium = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 1000 });

  await step('direct desktop route and guest state', () => inspectViewport(1440, 1000, 'desktop'));
  await step('mobile route remains usable', () => inspectViewport(390, 844, 'mobile'));
  await step('reduced motion preference is honored by the route', async () => {
    await chromium.page.setReducedMotion(true);
    const state = await inspectViewport(390, 844, 'reduced-motion');
    assert(state.reducedMotion, 'Chromium did not apply prefers-reduced-motion.');
    return state;
  });
  await step('progression smoke does not enter unrelated upload or Turnstile flows', () => {
    const unrelated = chromium.page.requestLog.filter(entry => /turnstile|upload-intent|profile-media/i.test(entry.url));
    assert(unrelated.length === 0, `Unexpected unrelated setup requests: ${unrelated.map(entry => entry.url).join(', ')}`);
    return { requestCount: chromium.page.requestLog.length };
  });

  await step('new account first roll uses the real result and unlock queue', async () => {
    await chromium.page.setReducedMotion(false);
    await chromium.page.setViewport(1440, 1000);
    await chromium.page.navigate(appUrl + '/', 'homepage account creation');
    await chromium.page.waitFor("document.querySelector('.homepage-reference') && document.querySelector('.site-mode-header')", 'homepage account creation controls');
    await chromium.page.clickText('Sign up', { description: 'homepage signup control' });
    await chromium.page.waitFor("location.pathname === '/signup' && document.querySelector('.auth-page') && document.querySelector('#username-input') && !document.querySelector('.auth-modal-overlay')", 'standalone signup page');
    await chromium.page.setInputValue('#username-input', canonicalUsername, ['input', 'change']);
    await chromium.page.setInputValue('#email-input', accountEmail, ['input', 'change']);
    await chromium.page.setInputValue('#password-input', accountPassword, ['input', 'change']);
    await chromium.page.click('.auth-submit', 'signup submit control');
    await chromium.page.waitFor("location.pathname === " + JSON.stringify('/' + canonicalUsername) + " && document.querySelector('.profile-shell-page') && !document.querySelector('.auth-page')", 'authenticated session after signup', 30000);

    const sessionState = await getBrowserSession();
    disposableUserId = sessionState.userId;
    results.account = {
      username: canonicalUsername,
      email: accountEmail,
      userId: disposableUserId,
      canonicalPath: '/' + canonicalUsername,
      createdBy: 'local signup UI'
    };

    await chromium.page.navigate(appUrl + '/roll', 'first authenticated daily roll');
    await chromium.page.waitFor("document.querySelector('.game-container') && document.querySelector('.roll-stage--preroll .roll-action__button:not([disabled])')", 'first-roll action', 30000);
    await chromium.page.click('.roll-stage--preroll .roll-action__button', 'first-roll action');
    await chromium.page.waitFor("document.querySelector('.roll-stage--results') && document.querySelector('.roll-stage--results #roll-result-title')", 'server-confirmed first-roll result', 30000);
    await chromium.page.waitFor('document.querySelector(".progression-unlock-queue")', 'first-roll progression unlock queue', 30000);

    const resultState = await chromium.page.evaluate(`(() => {
      const card = document.querySelector('.roll-stage--results');
      const context = document.querySelector('.roll-page__context');
      const strip = context?.querySelector('.roll-page__proof');
      const queue = context?.querySelector('.progression-unlock-queue');
      const thumbnail = queue?.querySelector('.progression-reward-preview__thumbnail');
      const semantic = thumbnail?.querySelector('.name-effect-canvas__semantic');
      const cardRect = card?.getBoundingClientRect();
      const contextRect = context?.getBoundingClientRect();
      const stripRect = strip?.getBoundingClientRect();
      const queueRect = queue?.getBoundingClientRect();
      const thumbnailRect = thumbnail?.getBoundingClientRect();
      const semanticRect = semantic?.getBoundingClientRect();
      return {
        path: location.pathname,
        result: card?.querySelector('#roll-result-title')?.textContent?.trim() || '',
        score: card?.querySelector('.roll-score-total')?.textContent?.trim() || '',
        queue: Boolean(queue),
        compactQueue: queue?.classList.contains('progression-unlock-queue--compact') || false,
        queueTitle: queue?.querySelector('h3')?.textContent?.trim() || '',
        reward: queue?.querySelector('.progression-reward-preview__trigger strong')?.textContent?.trim() || '',
        canonicalThumbnail: Boolean(thumbnail?.querySelector('.shop-preview-area')),
        queueInLeftContext: Boolean(context?.contains(queue) && contextRect && queueRect && queueRect.left >= contextRect.left && queueRect.right <= contextRect.right),
        queueBelowRewardStrip: Boolean(stripRect && queueRect && queueRect.top >= stripRect.bottom),
        queueOutsideCard: Boolean(queue && card && !card.contains(queue)),
        queueLeftOfCard: Boolean(cardRect && queueRect && queueRect.right <= cardRect.left),
        wideThumbnail: Boolean(thumbnailRect && thumbnailRect.width >= thumbnailRect.height * 1.5),
        previewFits: Boolean(semanticRect && thumbnailRect && semanticRect.left >= thumbnailRect.left - 1 && semanticRect.right <= thumbnailRect.right + 1 && semanticRect.top >= thumbnailRect.top - 1 && semanticRect.bottom <= thumbnailRect.bottom + 1),
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1
      };
    })()`);
    assert(resultState.path === '/roll', 'First roll settled at ' + resultState.path + '.');
    assert(resultState.result && resultState.score, 'First roll result surface is incomplete: ' + JSON.stringify(resultState) + '.');
    assert(resultState.queue && resultState.queueTitle === 'Cosmetic earned', 'First roll did not render the progression unlock queue: ' + JSON.stringify(resultState) + '.');
    assert(resultState.reward, 'First roll unlock queue did not expose its reward preview trigger: ' + JSON.stringify(resultState) + '.');
    assert(resultState.compactQueue && resultState.queueInLeftContext && resultState.queueBelowRewardStrip && resultState.queueOutsideCard && resultState.queueLeftOfCard, 'First roll unlock queue is not beneath the left reward strip: ' + JSON.stringify(resultState) + '.');
    assert(resultState.wideThumbnail, 'First roll cosmetic preview is using the old square viewport: ' + JSON.stringify(resultState) + '.');
    assert(!resultState.horizontalOverflow, 'First roll result overflows horizontally: ' + JSON.stringify(resultState) + '.');

    await chromium.page.click('.progression-reward-preview__trigger', 'first-roll reward preview');
    await chromium.page.waitFor("document.querySelector('.progression-reward-preview__panel') && (document.querySelector('.progression-reward-preview__caption') || document.querySelector('.progression-reward-preview__state[role=\"alert\"]'))", 'first-roll canonical reward preview', 30000);
    const previewState = await chromium.page.evaluate("(() => ({ panel: Boolean(document.querySelector('.progression-reward-preview__panel')), canonicalRenderer: Boolean(document.querySelector('.progression-reward-preview__panel .shop-preview-area')), error: document.querySelector('.progression-reward-preview__state[role=\"alert\"]')?.textContent?.trim() || '' }))()");
    assert(previewState.panel && previewState.canonicalRenderer && !previewState.error, 'First-roll reward preview did not resolve the canonical renderer: ' + JSON.stringify(previewState) + '.');
    await chromium.page.click('.progression-reward-preview__trigger', 'close first-roll reward preview');
    await chromium.page.waitFor("!document.querySelector('.progression-reward-preview__panel') && document.querySelector('.progression-reward-preview__thumbnail .shop-preview-area')", 'settled inline reward preview', 30000);
    const inlinePreviewState = await chromium.page.evaluate("(() => { const thumbnail = document.querySelector('.progression-unlock-queue .progression-reward-preview__thumbnail'); const semantic = thumbnail?.querySelector('.name-effect-canvas__semantic'); const thumbnailRect = thumbnail?.getBoundingClientRect(); const semanticRect = semantic?.getBoundingClientRect(); const rect = value => value ? { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height } : null; return { canonicalRenderer: Boolean(thumbnail?.querySelector('.shop-preview-area')), thumbnailRect: rect(thumbnailRect), semanticRect: rect(semanticRect), previewFits: Boolean(semanticRect && thumbnailRect && semanticRect.left >= thumbnailRect.left - 1 && semanticRect.right <= thumbnailRect.right + 1 && semanticRect.top >= thumbnailRect.top - 1 && semanticRect.bottom <= thumbnailRect.bottom + 1) }; })()");
    assert(inlinePreviewState.canonicalRenderer && inlinePreviewState.previewFits, 'Settled inline cosmetic preview is clipped or unresolved: ' + JSON.stringify(inlinePreviewState) + '.');

    const unlockScreenshot = join(evidenceDir, 'authenticated-first-roll-unlock-visible.png');
    await chromium.page.screenshot(unlockScreenshot);
    results.screenshots.push(unlockScreenshot);

    await chromium.page.setViewport(390, 844);
    await chromium.page.evaluate("document.querySelector('.progression-unlock-queue')?.scrollIntoView({ block: 'center' })");
    const mobileUnlockState = await chromium.page.evaluate("(() => { const queue = document.querySelector('.progression-unlock-queue'); const thumbnail = queue?.querySelector('.progression-reward-preview__thumbnail'); const queueRect = queue?.getBoundingClientRect(); const thumbnailRect = thumbnail?.getBoundingClientRect(); return { queueVisible: Boolean(queueRect && queueRect.bottom > 0 && queueRect.top < innerHeight), queueInsideViewport: Boolean(queueRect && queueRect.left >= 0 && queueRect.right <= innerWidth), wideThumbnail: Boolean(thumbnailRect && thumbnailRect.width >= thumbnailRect.height * 1.5), horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1 }; })()");
    assert(mobileUnlockState.queueVisible && mobileUnlockState.queueInsideViewport && mobileUnlockState.wideThumbnail && !mobileUnlockState.horizontalOverflow, 'Mobile first-roll unlock formatting is not contained: ' + JSON.stringify(mobileUnlockState) + '.');
    const mobileUnlockScreenshot = join(evidenceDir, 'authenticated-first-roll-unlock-mobile.png');
    await chromium.page.screenshot(mobileUnlockScreenshot);
    results.screenshots.push(mobileUnlockScreenshot);
    await chromium.page.setViewport(1440, 1000);
    await chromium.page.evaluate("document.querySelector('.progression-unlock-queue')?.scrollIntoView({ block: 'center' })");

    const milestonePath = '/rest/v1/user_progression_milestones?select=milestone_id,unlock_source,presented_at,acknowledged_at&user_id=eq.' + encodeURIComponent(disposableUserId) + '&milestone_id=eq.journey_first_roll';
    const presentedLedger = await waitForService(milestonePath, rows => Array.isArray(rows) && rows[0]?.presented_at, 'server presentation of the first-roll unlock');
    assert(presentedLedger[0].unlock_source === 'live', 'First-roll unlock was not server-owned live provenance: ' + JSON.stringify(presentedLedger) + '.');

    const acknowledgedQueueRewards = [];
    for (let queueIndex = 0; queueIndex < 8; queueIndex += 1) {
      const queueState = await chromium.page.evaluate("(() => { const queue = document.querySelector('.progression-unlock-queue'); return { visible: Boolean(queue), reward: queue?.querySelector('.progression-reward-preview__trigger strong')?.textContent?.trim() || '' }; })()");
      if (!queueState.visible) break;
      acknowledgedQueueRewards.push(queueState.reward);
      await chromium.page.clickText('Acknowledge', { description: 'first-roll unlock acknowledgement ' + (queueIndex + 1) });
      await chromium.page.waitFor('!document.querySelector(".progression-unlock-queue") || document.querySelector(".progression-unlock-queue")?.getAttribute("aria-busy") === "false"', 'first-roll unlock transition ' + (queueIndex + 1), 30000);
    }
    await chromium.page.waitFor('!document.querySelector(".progression-unlock-queue")', 'first-roll unlock queue acknowledgement', 30000);
    const acknowledgedLedger = await waitForService(milestonePath, rows => Array.isArray(rows) && rows[0]?.acknowledged_at, 'server acknowledgement of the first-roll unlock');
    assert(acknowledgedLedger[0].presented_at && acknowledgedLedger[0].acknowledged_at, 'First-roll unlock acknowledgement did not persist both presentation states: ' + JSON.stringify(acknowledgedLedger) + '.');

    const ownerProgression = await callAuthenticatedRpc('get_my_progression');
    assert(ownerProgression?.success === true, 'Owner progression RPC was not available after the first roll: ' + JSON.stringify(ownerProgression) + '.');
    assert(Number(ownerProgression.total_rolls) >= 1, 'Owner progression did not record the first roll: ' + JSON.stringify(ownerProgression) + '.');
    assert(ownerProgression.milestones?.some(milestone => milestone.id === 'journey_first_roll' && milestone.unlocked === true && milestone.acknowledged_at), 'Owner progression did not expose the acknowledged first-roll milestone: ' + JSON.stringify(ownerProgression) + '.');
    const screenshot = join(evidenceDir, 'authenticated-first-roll-unlock.png');
    await chromium.page.screenshot(screenshot);
    results.screenshots.push(screenshot);
    return { result: resultState, preview: previewState, presented: presentedLedger[0], acknowledged: acknowledgedLedger[0], acknowledgedQueueRewards };
  });

  await step('established history and Premium fixture stay on server-owned boundaries', async () => {
    const fixture = await seedEstablishedAccountFixture(disposableUserId);
    results.fixture = fixture;
    const state = await inspectAuthenticatedProgression(1440, 1000, 'established');
    await chromium.page.evaluate("document.querySelector('.profile-progression-unlocks')?.scrollIntoView({ block: 'center', inline: 'nearest' })");
    const progressionUnlockScreenshot = join(evidenceDir, 'authenticated-progression-recent-unlock.png');
    await chromium.page.screenshot(progressionUnlockScreenshot);
    results.screenshots.push(progressionUnlockScreenshot);
    const establishedProgression = await callAuthenticatedRpc('get_my_progression');
    const rareDiscovery = establishedProgression?.milestones?.find(milestone => milestone.id === 'journey_rarity_rare');
    assert(rareDiscovery?.unlocked === true && ['historical_backfill', 'live'].includes(rareDiscovery.unlock_source) && rareDiscovery.acknowledged_at, 'Rare discovery fixture did not remain a server-owned acknowledged fact: ' + JSON.stringify(rareDiscovery) + '.');
    await chromium.page.navigate(appUrl + '/profile/settings#premium', 'Premium Profile Studio');
    await chromium.page.waitFor("document.querySelector('.profile-settings-page') && document.querySelector('.profile-premium-page')", 'Premium Profile Studio section', 30000);
    const premiumState = await chromium.page.evaluate("(() => ({\n      path: location.pathname,\n      premium: Boolean(document.querySelector('.profile-premium-page')),\n      active: Boolean(document.querySelector('.profile-premium-page__active')),\n      activeText: document.querySelector('.profile-premium-page__active')?.textContent?.trim() || '',\n      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1\n    }))()");
    assert(premiumState.premium && premiumState.active, 'Premium Profile Studio did not render the server-owned entitlement: ' + JSON.stringify(premiumState) + '.');
    assert(/Chromadie Plus is active/i.test(premiumState.activeText), 'Premium Profile Studio status is not active: ' + JSON.stringify(premiumState) + '.');
    assert(!premiumState.horizontalOverflow, 'Premium Profile Studio overflows horizontally: ' + JSON.stringify(premiumState) + '.');

    await chromium.page.navigate(appUrl + '/' + canonicalUsername, 'established public profile');
    await chromium.page.waitFor("location.pathname === " + JSON.stringify('/' + canonicalUsername) + " && document.querySelector('.profile-shell-page')", 'public profile shell', 30000);
    await chromium.page.waitFor("document.querySelector('.profile-shell-page[aria-busy=\"false\"]')", 'public profile shell hydration', 30000);
    let publicStoryRpc;
    try {
      const story = await callAuthenticatedRpc('get_public_profile_story', { p_user_id: disposableUserId });
      publicStoryRpc = {
        completedCount: story?.progression_proof?.completed_count ?? story?.progressionProof?.completedCount ?? null,
        recentUnlockCount: Array.isArray(story?.progression_proof?.recent_unlocks)
          ? story.progression_proof.recent_unlocks.length
          : Array.isArray(story?.progressionProof?.recentUnlocks) ? story.progressionProof.recentUnlocks.length : 0
      };
    } catch (error) {
      publicStoryRpc = { error: error.message };
    }
    const publicProofReady = await chromium.page.evaluate("(() => { const shell = document.querySelector('.profile-shell-page'); return { proof: Boolean(document.querySelector('.profile-shell__progression-proof')), busy: shell?.getAttribute('aria-busy') || '', text: shell?.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 500) || '' }; })()");
    publicProofReady.storyRpc = publicStoryRpc;
    assert(publicProofReady.proof, 'Public profile progression proof was not rendered after hydration: ' + JSON.stringify(publicProofReady) + '.');
    await chromium.page.waitFor("(() => { const result = document.querySelector('.profile-daily-roll .profile-roll__result'); const text = result?.textContent?.trim() || ''; const rarity = result?.querySelector('.profile-roll__rarity')?.textContent?.trim() || ''; return Boolean(result && /#[0-9a-f]{6}/i.test(text) && /\\d[\\d,]*\\s*EP\\b/i.test(text) && rarity); })()", 'integrated Profile Roll result surface', 30000);
    const publicState = await chromium.page.evaluate("(() => {\n      const root = document.documentElement;\n      const proofItems = document.querySelectorAll('.profile-shell__progression-proof-item').length;\n      const text = document.querySelector('.profile-shell-page')?.textContent?.trim().replace(/\\s+/g, ' ') || '';\n      return {\n        path: location.pathname,\n        proof: Boolean(document.querySelector('.profile-shell__progression-proof')),\n        proofItems,\n        proofStats: document.querySelector('.profile-shell__progression-proof-stats')?.textContent?.trim().replace(/\\s+/g, ' ') || '',\n        rollResult: Boolean(document.querySelector('.profile-daily-roll .profile-roll__result')),\n        rollIdentity: document.querySelector('.profile-daily-roll .profile-roll__identity-row')?.textContent?.trim() || '',\n        historicalStory: text.includes('42') && text.includes('Total rolls'),\n        horizontalOverflow: root.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1\n      };\n    })()");
    const publicRoll = await chromium.page.evaluate("(() => { const result = document.querySelector('.profile-daily-roll .profile-roll__result'); return { hex: result?.querySelector('.profile-roll__hex')?.textContent?.trim() || '', rarity: result?.querySelector('.profile-roll__rarity')?.textContent?.trim() || '', score: result?.querySelector('.profile-roll__score-row')?.textContent?.trim().replace(/\\s+/g, ' ') || '' }; })()");
    Object.assign(publicState, { rollHex: publicRoll.hex, rollRarity: publicRoll.rarity, rollScore: publicRoll.score });
    assert(publicState.proof && publicState.proofItems >= 1 && publicState.proofItems <= 2, 'Public profile progression proof is not bounded to recent unlocks: ' + JSON.stringify(publicState) + '.');
    assert(publicState.rollResult && publicState.rollHex && publicState.rollRarity && /\d[\d,]*\s*EP\b/i.test(publicState.rollScore), 'Public profile did not render the canonical integrated Profile Roll result content: ' + JSON.stringify(publicState) + '.');
    assert(publicState.historicalStory, 'Public profile did not render established historical totals: ' + JSON.stringify(publicState) + '.');
    assert(!publicState.horizontalOverflow, 'Public profile overflows horizontally: ' + JSON.stringify(publicState) + '.');
    const screenshot = join(evidenceDir, 'established-public-profile.png');
    await chromium.page.screenshot(screenshot);
    results.screenshots.push(screenshot);
    return { fixture, progression: state, rareDiscovery, premium: premiumState, publicProfile: publicState };
  });

  await step('authenticated mobile and reduced-motion progression remain usable', async () => {
    await chromium.page.setReducedMotion(true);
    const state = await inspectAuthenticatedProgression(390, 844, 'authenticated mobile reduced-motion');
    assert(state.reducedMotion, 'Chromium did not apply reduced motion to the authenticated progression surface.');
    assert(!state.horizontalOverflow, 'Authenticated mobile progression overflows horizontally.');
    const focusState = await chromium.page.evaluate("(() => {\n      const focusable = [...document.querySelectorAll('a, button')].filter(element => !element.disabled && element.getClientRects().length);\n      const progressionLink = focusable.find(element => element.getAttribute('href') === '/roll');\n      progressionLink?.focus();\n      return {\n        focusedRollLink: document.activeElement === progressionLink,\n        width: innerWidth,\n        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches\n      };\n    })()");
    assert(focusState.focusedRollLink && focusState.reducedMotion, 'Authenticated mobile keyboard/reduced-motion evidence is incomplete: ' + JSON.stringify(focusState) + '.');
    const screenshot = join(evidenceDir, 'authenticated-progression-mobile-reduced-motion.png');
    await chromium.page.screenshot(screenshot);
    results.screenshots.push(screenshot);
    return { state, focus: focusState };
  });

  results.notAutomated = [
    {
      journey: 'Logged-out visitor, next-day return',
      reason: 'The guest route and daily countdown are covered without an account. Advancing server UTC time is not automated because it would change shared local state; the authenticated fixture instead verifies a persisted current_streak=5 / longest_streak=9 return state.'
    },
    {
      journey: 'Rare discovery / anomaly roll',
      reason: 'The rare/anomaly roll itself remains server-random and server-scored, so forcing it would bypass production eligibility. Rare-discovery presentation is verified with a service-seeded rarity_rare achievement reconciled through the production progression service, including historical_backfill provenance and acknowledgement.'
    }
  ];

  results.status = 'passed';
} catch (error) {
  failure = error;
  results.status = 'failed';
  results.failure = { message: error.message };
  console.error(`[progression-smoke] FAIL ${error.message}`);
} finally {
  try {
    results.cleanup = await cleanupDisposableAccount();
    if (results.cleanup.status === 'failed' || results.cleanup.status === 'blocked') {
      console.warn('[progression-smoke] cleanup ' + results.cleanup.status + ': ' + results.cleanup.reason);
    }
  } catch (error) {
    results.cleanup = { status: 'failed', userId: disposableUserId || undefined, reason: error.message };
    console.warn('[progression-smoke] cleanup failed: ' + error.message);
  }
  if (chromium?.page) await chromium.page.close();
  await terminateProcess(chromium?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite progression smoke server');
  results.browserConsole = chromium?.page?.consoleLog || [];
  if (previousRolloutStage === undefined) delete process.env.VITE_CHROMADIE_ROLLOUT_STAGE;
  else process.env.VITE_CHROMADIE_ROLLOUT_STAGE = previousRolloutStage;
  if (previousProgressionFlag === undefined) delete process.env.VITE_CHROMADIE_FLAG_PROGRESSION_JOURNEY;
  else process.env.VITE_CHROMADIE_FLAG_PROGRESSION_JOURNEY = previousProgressionFlag;
  await writeFile(join(evidenceDir, 'evidence.json'), JSON.stringify(results, null, 2) + '\n');
}

if (failure) process.exit(1);
console.log(`[progression-smoke] evidence: ${evidenceDir}`);
