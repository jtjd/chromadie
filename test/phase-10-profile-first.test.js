import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { PROFILE_PRIMARY_REGIONS, getProfileComposition } from '../src/lib/profileComposition.js';
import { parseRouteLocation } from '../src/lib/routes.js';

test('profile-first projection reserves four primary regions and demotes legacy modules', () => {
  const composition = getProfileComposition(createDefaultProfileConfig('#123456'), {
    isOwner: false,
    hasLinks: true,
    hasPinnedAchievements: true,
    hasCollection: true,
    hasTimeline: true
  });

  assert.deepEqual(PROFILE_PRIMARY_REGIONS, ['identity', 'roll', 'expression', 'featured']);
  assert.equal(composition.expressionId, 'links');
  assert.equal(composition.featuredId, 'achievements');
  assert.equal(composition.activeModules.some(module => module.id === 'boundary'), false);
  assert.equal(composition.activeModules.some(module => module.id === 'explore'), false);
  assert.equal(composition.secondaryModules.some(module => module.id === 'boundary'), false);
  assert.equal(composition.secondaryModules.some(module => module.id === 'explore'), false);
  // Visitors keep the public latest-result region even though the owner-only
  // roll module itself remains hidden by the existing configuration contract.
  assert.equal(composition.activeModules.some(module => module.id === 'roll'), false);
});

test('the landing route stays separate from explicit roll and profile routes', () => {
  assert.equal(parseRouteLocation('/').view, 'home');
  assert.equal(parseRouteLocation('/', '?view=game').view, 'game');
  assert.equal(parseRouteLocation('/u/OtherUser').view, 'profile');
  assert.equal(parseRouteLocation('/profile/settings').view, 'profile-settings');
});

test('profile settings keeps secondary features available away from the public canvas', async () => {
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const roll = await readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');

  assert.match(shell, /data-profile-region="identity"/);
  assert.match(shell, /profile-shell__identity-boundary/);
  assert.match(shell, /data-profile-region="roll"/);
  assert.match(shell, /data-profile-region="expression"/);
  assert.match(shell, /data-profile-region="featured"/);
  assert.match(shell, /getProfileStoryVisible/);
  assert.doesNotMatch(shell, /<details class="profile-shell__details/);
  assert.match(settings, /import\('\.\/ProfileEditor\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileSocial\.svelte'\)/);
  assert.match(shell, /TodayColor result=\{latestRoll\}[^\n]*accentColor=\{signatureColor\}/);
  assert.doesNotMatch(shell, /<ProfileSocial/);
  assert.match(shell, /Add to rivals/);
  assert.match(shell, /getProfileStoryVisible\(effectiveProfileConfig\)/);
  assert.match(shell, /showRoll = getProfileRollVisible/);
  assert.match(shell, /visibilitychange/);
  assert.match(settings, /Profile settings/);
  assert.match(shell, /A founding color identity/);
  assert.doesNotMatch(shell, /Public boundary|What visitors can see/);
  assert.match(roll, /<details class="profile-roll__details"/);
  assert.doesNotMatch(roll, /Style in shop|View leaderboard/);
  assert.match(app, /view === 'home'/);
  assert.match(app, /staticComponent: HomePage/);
  assert.doesNotMatch(app, /shouldUseAuthenticatedProfileHome/);
});
