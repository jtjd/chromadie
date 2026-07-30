import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { loadProfileContext } from '../src/lib/profileData.js';
import { parseRouteLocation } from '../src/lib/routes.js';

function createFakeSupabase({ profile, profileError = null, scores = [], achievements = [], unlocked = [] } = {}) {
  const calls = [];

  function responseFor(table) {
    if (table === 'profiles') return { data: profile, error: profileError };
    if (table === 'achievements') return { data: achievements, error: null };
    if (table === 'user_achievements') return { data: unlocked, error: null };
    return { data: null, error: null };
  }

  function from(table) {
    const builder = {
      select(fields) {
        calls.push({ type: 'select', table, fields });
        return builder;
      },
      ilike(field, value) {
        calls.push({ type: 'ilike', table, field, value });
        return builder;
      },
      eq(field, value) {
        calls.push({ type: 'eq', table, field, value });
        return builder;
      },
      async maybeSingle() {
        return responseFor(table);
      },
      then(resolve, reject) {
        return Promise.resolve(responseFor(table)).then(resolve, reject);
      }
    };
    return builder;
  }

  return {
    calls,
    from,
    async rpc(name, args) {
      calls.push({ type: 'rpc', name, args });
      if (name === 'get_my_profile') return { data: profile, error: profileError };
      if (name === 'get_public_profile_scores') return { data: scores, error: null };
      return { data: null, error: null };
    }
  };
}

const ownerProfile = {
  id: 'user-1',
  username: 'NeonUser',
  lifetime_ep: 12345,
  total_rolls: 8,
  equipped_cosmetics: { frame: 'frame-basic' },
  equipped_badges: ['ach_first_roll'],
  ep_spent: 999,
  email: 'private@example.com'
};

test('profile context keeps owner RPCs and private progress owner-only', async () => {
  const supabase = createFakeSupabase({
    profile: ownerProfile,
    scores: [{ hex_code: '#123456', score: 61196, rarity: 'Rare', roll_date: '2026-07-25', private_note: 'excluded' }],
    achievements: [{ id: 'ach_first_roll', name: 'First Steps', icon: '🎲' }],
    unlocked: [{ achievement_id: 'ach_first_roll', count: 2 }]
  });

  const context = await loadProfileContext({
    supabaseClient: supabase,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'neonuser'
  });

  assert.equal(context.viewingOwnProfile, true);
  assert.equal(context.targetProfile.email, undefined);
  assert.equal(context.targetScores[0].private_note, undefined);
  assert.deepEqual(context.unlockedAchievements, {
    ach_first_roll: { achievement_id: 'ach_first_roll', count: 2 }
  });
  assert.equal(supabase.calls.some(call => call.type === 'rpc' && call.name === 'get_my_profile'), true);
  assert.equal(supabase.calls.some(call => call.type === 'select' && call.table === 'profiles'), false);
  assert.equal(supabase.calls.some(call => call.type === 'select' && call.table === 'user_achievements'), true);
});

test('profile context keeps visitor data public and does not request unlock progress', async () => {
  const supabase = createFakeSupabase({
    profile: { ...ownerProfile, id: 'user-2', username: 'OtherUser' },
    scores: [{ hex_code: '#ABCDEF', score: 4000, rarity: 'Common', roll_date: '2026-07-24' }],
    achievements: [{ id: 'ach_first_roll', name: 'First Steps', icon: '🎲' }],
    unlocked: [{ achievement_id: 'ach_first_roll', count: 9 }]
  });

  const context = await loadProfileContext({
    supabaseClient: supabase,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'OtherUser'
  });

  assert.equal(context.viewingOwnProfile, false);
  assert.equal(context.targetProfile.id, 'user-2');
  assert.deepEqual(context.unlockedAchievements, {});
  assert.equal(supabase.calls.some(call => call.type === 'rpc' && call.name === 'get_my_profile'), false);
  assert.equal(supabase.calls.some(call => call.type === 'select' && call.table === 'profiles'), true);
  assert.equal(supabase.calls.some(call => call.type === 'select' && call.table === 'user_achievements'), false);
});

test('profile shell route parser preserves the public path and legacy controls escape hatch', () => {
  const publicRoute = parseRouteLocation('/u/OtherUser', '?legacy=1');
  assert.equal(publicRoute.view, 'profile');
  assert.equal(publicRoute.profileUsername, 'OtherUser');
  assert.equal(publicRoute.legacyProfile, true);

  const ownerRoute = parseRouteLocation('/profile', '?legacy=1');
  assert.equal(ownerRoute.view, 'profile');
  assert.equal(ownerRoute.profileId, null);
  assert.equal(ownerRoute.legacyProfile, true);
});

test('profile shell is live-data based and keeps roll authority in the owner-only module', async () => {
  const source = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  assert.match(source, /loadProfileContext/);
  assert.match(settings, /legacy=1/);
  assert.match(source, /profile-shell__identity/);
  assert.match(source, /data-profile-region="identity"/);
  assert.doesNotMatch(source, /Public boundary/);
  assert.match(source, /ProfileRoll/);
  assert.doesNotMatch(source, /calculate_roll_v2|roll_die\s*\(/);
});
