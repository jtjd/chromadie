import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FEATURE_FLAG_KEYS,
  isProfileFeatureEnabled,
  resolveProfileFeatureFlags,
  stableFeatureBucket
} from '../src/lib/profileFeatureFlags.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('M13 certification fixture covers free, media, and creator identities', async () => {
  const fixture = JSON.parse(await read('docs/certification/PROFILE_PARITY_CERTIFICATION.json'));
  assert.equal(fixture.version, 1);
  assert.deepEqual(fixture.profiles.map(profile => profile.id), [
    'polished-free-default',
    'premium-media-identity',
    'creator-provider'
  ]);
  assert.deepEqual(fixture.profiles.map(profile => profile.regions), [
    ['identity', 'roll', 'expression', 'featured'],
    ['identity', 'roll', 'expression', 'featured'],
    ['identity', 'roll', 'expression', 'featured']
  ]);
  assert.equal(fixture.profiles[0].capabilities.richMedia, false);
  assert.equal(fixture.profiles[1].capabilities.audioEntry, 'click-unlock');
  assert.deepEqual(fixture.profiles[2].capabilities.providerCards, ['github', 'twitch', 'lastfm', 'discord', 'spotify', 'youtube']);
  for (const profile of fixture.profiles) {
    for (const condition of ['slow-network', 'media-failure', 'reduced-motion', 'keyboard-only']) {
      assert.ok(profile.conditions.includes(condition), `${profile.id} should include ${condition}`);
    }
  }
});

test('M13 rollout flags are audience-scoped and independently reversible', () => {
  const base = { VITE_CHROMADIE_ROLLOUT_STAGE: 'staff' };
  assert.equal(resolveProfileFeatureFlags({ env: base, isStaff: true }).commerce, true);
  assert.equal(resolveProfileFeatureFlags({ env: base, isStaff: false }).commerce, false);

  const internal = resolveProfileFeatureFlags({
    env: {
      VITE_CHROMADIE_ROLLOUT_STAGE: 'internal',
      VITE_CHROMADIE_INTERNAL_IDS: ' Internal-User '
    },
    userId: 'internal-user'
  });
  assert.equal(internal.richMedia, true);
  assert.equal(internal.audience.internal, true);
  assert.equal(resolveProfileFeatureFlags({ env: { VITE_CHROMADIE_ROLLOUT_STAGE: 'internal' }, userId: 'other' }).richMedia, false);

  assert.equal(resolveProfileFeatureFlags({ env: { VITE_CHROMADIE_ROLLOUT_STAGE: 'cohort' }, userId: 'cohort-user', cohortPercent: 100 }).socialDepth, true);
  assert.equal(resolveProfileFeatureFlags({ env: { VITE_CHROMADIE_ROLLOUT_STAGE: 'cohort' }, userId: 'cohort-user', cohortPercent: 0 }).socialDepth, false);
  assert.ok(Number.isInteger(stableFeatureBucket('cohort-user')));
  assert.equal(stableFeatureBucket('cohort-user'), stableFeatureBucket('COHORT-USER'));

  const disabled = resolveProfileFeatureFlags({
    env: {
      VITE_CHROMADIE_ROLLOUT_STAGE: 'all',
      VITE_CHROMADIE_FLAG_COMMERCE: 'false',
      VITE_CHROMADIE_FLAG_SOCIAL_DEPTH: 'off'
    },
    userId: 'any-user'
  });
  assert.equal(disabled.commerce, false);
  assert.equal(disabled.socialDepth, false);
  assert.equal(disabled.richMedia, true);
  assert.equal(resolveProfileFeatureFlags({ env: { VITE_CHROMADIE_ROLLOUT_STAGE: 'off' }, isStaff: true }).expandedAnalytics, false);
  assert.equal(resolveProfileFeatureFlags({ env: { VITE_CHROMADIE_ROLLOUT_STAGE: 'unexpected' } }).commerce, true);
  assert.equal(isProfileFeatureEnabled('not-a-feature', { env: { VITE_CHROMADIE_ROLLOUT_STAGE: 'all' } }), false);
  assert.deepEqual(FEATURE_FLAG_KEYS, ['commerce', 'richMedia', 'profileConfigurationV2', 'expandedAnalytics', 'socialDepth']);
});

test('M13 client surfaces retain reversible gates and V1 fallbacks', async () => {
  const [pricing, expression, settings, contract, workspace, shell, renderModel, data, social, env, operations, milestone] = await Promise.all([
    read('src/lib/Pricing.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/profileData.js'),
    read('src/lib/ProfileSocial.svelte'),
    read('.env.example'),
    read('docs/operations/M13_ROLLOUT_DASHBOARD.md'),
    read('docs/milestones/COMPETITOR_PARITY_M13_CERTIFICATION_ROLLOUT.md')
  ]);
  assert.match(pricing, /isProfileFeatureEnabled\('commerce'/);
  assert.match(pricing, /Purchases temporarily paused/);
  assert.match(expression, /isProfileFeatureEnabled\('richMedia'/);
  assert.match(expression, /image-based profile remains available/);
  assert.match(contract, /SECTION_FLAGS/);
  assert.match(settings, /visibleSettingsSections/);
  assert.match(workspace, /socialDepthEnabled={featureFlags\.socialDepth}/);
  assert.match(shell, /isProfileFeatureEnabled\('expandedAnalytics'/);
  assert.match(renderModel, /featureFlags\.richMedia/);
  assert.match(shell, /resolvedPreviewProfile/);
  assert.match(shell, /socialDepthEnabled={socialDepthEnabled}/);
  assert.match(data, /isProfileFeatureEnabled\('profileConfigurationV2'/);
  assert.match(data, /normalizeProfileConfig\(configResponse\.data/);
  assert.match(social, /export let socialDepthEnabled = true/);
  assert.match(social, /depthEnabled/);
  for (const key of ['VITE_CHROMADIE_ROLLOUT_STAGE', 'VITE_CHROMADIE_FLAG_COMMERCE', 'VITE_CHROMADIE_FLAG_RICH_MEDIA', 'VITE_CHROMADIE_FLAG_PROFILE_CONFIGURATION_V2', 'VITE_CHROMADIE_FLAG_EXPANDED_ANALYTICS', 'VITE_CHROMADIE_FLAG_SOCIAL_DEPTH']) {
    assert.match(env, new RegExp(key));
  }
  for (const table of ['billing_webhook_events', 'profile_media_assets', 'profile_insight_daily', 'profile_reports']) {
    assert.match(operations, new RegExp(table));
  }
  assert.match(operations, /service role or an approved read-only/);
  assert.match(milestone, /staff → internal premium accounts → limited deterministic cohort →/);
});
