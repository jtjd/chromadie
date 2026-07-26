import test from 'node:test';
import assert from 'node:assert/strict';

import { isOwnProfileLookup, isOwnProfileTarget, mapProfileRecord, mapProfileScores } from '../src/lib/profileContract.js';
import { canInitiateRoll, createCanonicalRollData, getRollAccountMode, isRollReady, normalizeCanonicalRoll } from '../src/lib/rollState.js';
import { parseRouteLocation } from '../src/lib/routes.js';

const session = { user: { id: 'user-1' } };

test('profile ownership contracts distinguish owner, visitor, and guest lookups', () => {
  assert.equal(isOwnProfileLookup({ isAuthenticated: true, sessionUserId: 'user-1', currentUsername: 'NeonUser' }), true);
  assert.equal(isOwnProfileLookup({ isAuthenticated: true, sessionUserId: 'user-1', currentUsername: 'NeonUser', profileUsername: 'neonuser' }), true);
  assert.equal(isOwnProfileLookup({ isAuthenticated: true, sessionUserId: 'user-1', currentUsername: 'NeonUser', profileUsername: 'OtherUser' }), false);
  assert.equal(isOwnProfileLookup({ isAuthenticated: false, sessionUserId: 'user-1' }), false);
  assert.equal(isOwnProfileTarget({ isAuthenticated: true, sessionUserId: 'user-1', profileId: 'user-1' }), true);
  assert.equal(isOwnProfileTarget({ isAuthenticated: true, sessionUserId: 'user-1', profileId: 'user-2' }), false);
});

test('roll readiness contracts preserve guest and authenticated guards', () => {
  assert.equal(getRollAccountMode(null), 'guest');
  assert.equal(getRollAccountMode(session), 'authenticated');
  assert.equal(isRollReady(false), false);
  assert.equal(isRollReady(true), true);
  assert.equal(canInitiateRoll({ authInitialized: false }), false);
  assert.equal(canInitiateRoll({ authInitialized: true }), true);
  assert.equal(canInitiateRoll({ authInitialized: true, isReroll: true, userId: 'user-1', rerollShards: 1 }), true);
  assert.equal(canInitiateRoll({ authInitialized: true, isReroll: true, userId: null, rerollShards: 1 }), false);
  assert.equal(canInitiateRoll({ authInitialized: true, isReroll: true, userId: 'user-1', rerollShards: 1, rerollLocked: true }), false);
});

test('canonical roll contracts retain bounded server presentation fields', () => {
  const canonical = normalizeCanonicalRoll({
    hex_code: '#123456',
    score: 61196,
    rarity: 'Rare',
    badges: ['prime_sum', 'prime_sum', 'bad id!'],
    traits: Array.from({ length: 14 }, (_, index) => `trait-${index}`),
    contributors: Array.from({ length: 66 }, (_, index) => ({ id: `condition_${index}` })),
    identity: 'x'.repeat(140)
  });

  assert.equal(canonical.hex, '#123456');
  assert.equal(canonical.score, 61196);
  assert.equal(canonical.rarity, 'Rare');
  assert.deepEqual(canonical.badges, ['prime_sum']);
  assert.equal(canonical.traits.length, 12);
  assert.equal(canonical.contributors.length, 64);
  assert.equal(canonical.identity.length, 120);

  assert.deepEqual(createCanonicalRollData(canonical, '2026-07-25', ['prime_sum']), {
    date: '2026-07-25',
    hex: '#123456',
    score: 61196,
    rarity: 'Rare',
    badges: ['prime_sum'],
    traits: canonical.traits,
    contributors: canonical.contributors,
    identity: canonical.identity
  });
});

test('public route parsing preserves profile, challenge, and app route contracts', () => {
  assert.deepEqual(parseRouteLocation('/u/Neon%20User/'), {
    rawPath: '/u/Neon%20User',
    routeMode: 'app',
    view: 'profile',
    leaderboardTab: 'today',
    profileUsername: 'Neon User',
    legacyProfile: false,
    profileId: null,
    challengeId: null,
    challengeFrom: null
  });

  const leaderboard = parseRouteLocation('/leaderboard', '?tab=weekly&profile=user-2');
  assert.equal(leaderboard.routeMode, 'app');
  assert.equal(leaderboard.view, 'leaderboard');
  assert.equal(leaderboard.leaderboardTab, 'weekly');
  assert.equal(leaderboard.profileId, 'user-2');

  const challenge = parseRouteLocation('/c/challenge-1', '?from=NeonUser');
  assert.equal(challenge.view, 'game');
  assert.equal(challenge.challengeId, 'challenge-1');
  assert.equal(challenge.challengeFrom, 'NeonUser');
  assert.equal(parseRouteLocation('/missing').routeMode, 'not-found');
});

test('profile mapping keeps critical public fields and excludes private extras', () => {
  const mappedProfile = mapProfileRecord({
    id: 'user-1',
    username: 'NeonUser',
    lifetime_ep: 12345,
    total_rolls: 8,
    equipped_cosmetics: { frame: 'frame-basic' },
    email: 'private@example.com'
  });
  assert.deepEqual(mappedProfile, {
    id: 'user-1',
    username: 'NeonUser',
    lifetime_ep: 12345,
    total_rolls: 8,
    equipped_cosmetics: { frame: 'frame-basic' }
  });

  assert.deepEqual(mapProfileScores([{
    hex_code: '#123456',
    score: 61196,
    rarity: 'Rare',
    roll_date: '2026-07-25',
    condition_ids: ['prime_sum'],
    private_note: 'excluded'
  }]), [{
    hex_code: '#123456',
    score: 61196,
    rarity: 'Rare',
    roll_date: '2026-07-25',
    condition_ids: ['prime_sum']
  }]);
});
