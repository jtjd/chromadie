import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createProfileShellPreviewState,
  resolveProfileShellPreviewContext
} from '../src/lib/profileShellPreview.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from '../src/lib/profileSocial.js';

test('preview context keys include identity data and exclude staged configuration', () => {
  const inputs = {
    previewProfile: { id: 'profile-1', username: 'bluehour' },
    previewScores: [{ score: 10 }],
    previewTimelineEvents: [{ id: 'joined' }],
    previewCollectionItems: [{ hex: '#123456' }],
    previewAllAchievements: [{ id: 'first-roll' }]
  };
  const key = resolveProfileShellPreviewContext(inputs).key;

  assert.equal(key, `profile-preview:${JSON.stringify({
    profile: inputs.previewProfile,
    scores: inputs.previewScores,
    timeline: inputs.previewTimelineEvents,
    collection: inputs.previewCollectionItems,
    achievements: inputs.previewAllAchievements
  })}`);
  assert.equal(resolveProfileShellPreviewContext({ ...inputs, previewProfileConfig: { version: 1 } }).key, key);

  for (const field of [
    'previewProfile',
    'previewScores',
    'previewTimelineEvents',
    'previewCollectionItems',
    'previewAllAchievements'
  ]) {
    assert.notEqual(resolveProfileShellPreviewContext({
      ...inputs,
      [field]: [...(Array.isArray(inputs[field]) ? inputs[field] : [inputs[field]]), 'changed']
    }).key, key);
  }
});

test('preview context prefers explicit profile/config and falls back to the supplied snapshot', () => {
  const snapshotProfile = { id: 'snapshot-profile', username: 'snapshot' };
  const explicitProfile = { id: 'explicit-profile', username: 'explicit' };
  const snapshotConfig = { published: { source: 'snapshot' } };
  const explicitConfig = { published: { source: 'explicit' } };
  const snapshotContext = resolveProfileShellPreviewContext({
    profileRenderSnapshot: { profile: snapshotProfile, configuration: snapshotConfig }
  });
  const explicitContext = resolveProfileShellPreviewContext({
    previewProfile: explicitProfile,
    previewProfileConfig: explicitConfig,
    profileRenderSnapshot: { profile: snapshotProfile, configuration: snapshotConfig }
  });

  assert.equal(snapshotContext.sourceProfile, snapshotProfile);
  assert.equal(snapshotContext.configuration, snapshotConfig);
  assert.equal(explicitContext.sourceProfile, explicitProfile);
  assert.equal(explicitContext.configuration, explicitConfig);
  assert.equal(resolveProfileShellPreviewContext({}).sourceProfile, null);
});

test('preview profile projection preserves fallback identity fields and normalizes values', () => {
  const sourceProfile = {
    id: '',
    username: '',
    current_streak: '4',
    longest_streak: 'invalid',
    lifetime_ep: '8500',
    total_rolls: 17,
    is_staff: 1,
    equipped_cosmetics: null,
    equipped_badges: 'not-an-array',
    mood_color: '#123456',
    best_roll_score: 0
  };
  const state = createProfileShellPreviewState({
    sourceProfile,
    previewScores: { invalid: true },
    previewTimelineEvents: null,
    previewCollectionItems: [{ id: 'collection-1' }],
    previewAllAchievements: undefined
  });

  assert.deepEqual(state.targetProfile, {
    ...sourceProfile,
    id: 'profile-studio-preview',
    username: 'Chromanaut',
    display_name: null,
    bio: null,
    current_streak: 4,
    longest_streak: 0,
    lifetime_ep: 8500,
    total_rolls: 17,
    is_staff: true,
    equipped_cosmetics: {},
    equipped_badges: [],
    best_roll_score: 0,
    best_roll_hex: null,
    best_roll_rarity: null
  });
  assert.deepEqual(state.targetScores, []);
  assert.deepEqual(state.timelineEvents, []);
  assert.deepEqual(state.collectionItems, [{ id: 'collection-1' }]);
  assert.deepEqual(state.progressionProof, { completedCount: 0, recentUnlocks: [] });
  assert.deepEqual(state.social, createEmptyProfileSocial());
  assert.deepEqual(state.socialSettings, createDefaultProfileSocialSettings());
  assert.deepEqual(state.allAchievements, []);
  assert.equal(state.loading, false);
  assert.equal(state.profileConfig.draft, null);
  assert.deepEqual(state.profileConfig.published, normalizeProfileConfig(createDefaultProfileConfig(), '#123456'));
});

test('preview projection uses the exact configuration fallback and preserves supplied arrays', () => {
  const scores = [{ score: 21 }];
  const timeline = [{ id: 'milestone' }];
  const collection = [{ id: 'color' }];
  const achievements = [{ id: 'achievement' }];
  const configuration = createDefaultProfileConfig('#B16BFF');
  const state = createProfileShellPreviewState({
    sourceProfile: { id: 'profile-2', mood_color: '#445566' },
    configuration,
    previewScores: scores,
    previewTimelineEvents: timeline,
    previewCollectionItems: collection,
    previewAllAchievements: achievements
  });

  assert.equal(state.targetScores, scores);
  assert.equal(state.timelineEvents, timeline);
  assert.equal(state.collectionItems, collection);
  assert.equal(state.allAchievements, achievements);
  assert.deepEqual(state.profileConfig, {
    draft: null,
    published: normalizeProfileConfig(configuration, '#445566')
  });
  assert.equal(createProfileShellPreviewState({ sourceProfile: null }), null);
});

test('ProfileShell keeps preview key invalidation and state assignment at its adapter boundary', async () => {
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  assert.match(shell, /resolveProfileShellPreviewContext/);
  assert.match(shell, /if \(previewContext\.key !== activeProfileKey\)/);
  assert.match(shell, /createProfileShellPreviewState\(/);
  assert.match(shell, /targetProfile = previewState\.targetProfile/);
});
