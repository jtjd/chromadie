import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeMyRivalsResponse } from '../src/lib/discoveryData.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('owner rival rows preserve removable placeholders and bounded public identity', () => {
  const response = normalizeMyRivalsResponse({
    success: true,
    items: [
      { userId: '10000000-0000-4000-8000-000000000001', inaccessible: true, username: 'hidden' },
      { userId: '10000000-0000-4000-8000-000000000002', username: 'colorfriend', displayName: 'Color Friend', currentStreak: 4, profileAccent: '#abc123', todayRoll: { hexCode: '#123abc', score: '9001', rarity: 'Rare', identity: 'Evening blue', rollDate: '2026-09-04' } }
    ]
  });
  assert.deepEqual(response[0], {
    userId: '10000000-0000-4000-8000-000000000001',
    inaccessible: true,
    username: '',
    displayName: 'Unavailable rival',
    currentStreak: 0,
    profileAccent: null,
    todayRoll: null
  });
  assert.equal(response[1].todayRoll.score, 9001);
  assert.equal(response[1].todayRoll.hexCode, '#123ABC');
  assert.equal(response[1].profileAccent, '#ABC123');
});

test('Rivals is an authenticated Leaderboard tab with a dedicated removable row', async () => {
  const [app, leaderboard, row] = await Promise.all([
    read('src/App.svelte'),
    read('src/lib/Leaderboard.svelte'),
    read('src/lib/RivalRow.svelte')
  ]);
  assert.match(app, /redirectSignedOutRivals/);
  assert.match(app, /\/login\?next=\$\{encodeURIComponent\(nextPath\)\}/);
  assert.match(leaderboard, /get_my_rivals/);
  assert.match(leaderboard, /<RivalRow/);
  assert.match(leaderboard, /toggleFollow/);
  assert.match(row, /Open profile/);
  assert.match(row, /'Remove'/);
});

test('owner rivals RPC is bounded, activity- and block-aware, and auth-only', async () => {
  const migration = await read('supabase/migrations/20260904110000_owner_rivals_surface.sql');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_my_rivals/);
  assert.match(migration, /JOIN public\.user_follows/);
  assert.match(migration, /LIMIT 5/);
  assert.match(migration, /public\.is_profile_blocked/);
  assert.match(migration, /activity_visible/);
  assert.match(migration, /s\.roll_date = public\.game_utc_date\(\)/);
  assert.match(migration, /WHEN blocked THEN NULL ELSE username/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_my_rivals\(\) TO authenticated/);
  assert.match(migration, /IF v_is_following THEN[\s\S]*DELETE FROM public\.user_follows[\s\S]*IF public\.is_profile_blocked/);
  assert.match(migration, /v_follow_count >= 5/);
});
