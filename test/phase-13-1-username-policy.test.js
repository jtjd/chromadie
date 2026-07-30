import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  HARD_RESERVED_USERNAMES,
  MANUAL_RELEASE_USERNAMES,
  USERNAME_POLICY_SNAPSHOT,
  isProtectedUsername,
  isUsernameShapeValid
} from '../src/lib/usernamePolicy.js';
import {
  RESERVED_ROUTE_SEGMENTS,
  isReservedRouteSegment,
  normalizeUsernameSegment
} from '../src/lib/routeContract.js';
import { parseRouteLocation } from '../src/lib/routes.js';

test('username policy snapshot contains the complete exact-match sets', () => {
  assert.equal(USERNAME_POLICY_SNAPSHOT.length, HARD_RESERVED_USERNAMES.length + MANUAL_RELEASE_USERNAMES.length);
  assert.equal(new Set(USERNAME_POLICY_SNAPSHOT.map(entry => entry.username)).size, USERNAME_POLICY_SNAPSHOT.length);
  for (const username of [...HARD_RESERVED_USERNAMES, ...MANUAL_RELEASE_USERNAMES]) {
    assert.equal(isUsernameShapeValid(username), true, username);
    assert.equal(isProtectedUsername(`  ${username.toUpperCase()}  `), true, username);
  }
});

test('reservation is exact and does not overblock creative usernames', () => {
  for (const username of ['supporter', 'administratorx', 'myspotifylist', 'chromadiefan', 'color', 'blue', 'rose', 'void', 'angel', 'gamer', 'artist']) {
    assert.equal(isProtectedUsername(username), false, username);
  }
  assert.equal(isProtectedUsername('admin'), true);
  assert.equal(isProtectedUsername('Admin'), true);
  assert.equal(isProtectedUsername('admin_'), false);
  assert.equal(isProtectedUsername('admin-user'), false);
});

test('route and username policies remain separate for the grandfathered Admin profile', () => {
  assert.equal(isReservedRouteSegment('leaderboard'), true);
  assert.equal(normalizeUsernameSegment('leaderboard'), null);
  assert.equal(isReservedRouteSegment('admin'), false);
  assert.equal(normalizeUsernameSegment('Admin'), 'Admin');
  assert.equal(parseRouteLocation('/Admin').profileUsername, 'Admin');
  assert.equal(parseRouteLocation('/%6Ceaderboard').routeMode, 'not-found');
  assert.equal(parseRouteLocation('/Neon%252FUser').routeMode, 'not-found');
  assert.equal(RESERVED_ROUTE_SEGMENTS.includes('admin'), false);
});

test('username policy is shared by the client and database migration', async () => {
  const auth = await readFile(new URL('../src/lib/Auth.svelte', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260730100000_username_reservation_policy.sql', import.meta.url), 'utf8');
  const driftCheck = await readFile(new URL('../scripts/check-username-policy-drift.mjs', import.meta.url), 'utf8');

  assert.match(auth, /isProtectedUsername/);
  assert.doesNotMatch(auth, /new Set\(\['guest', 'anon', 'anonymous'\]\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.reserved_usernames/);
  assert.match(migration, /ALTER TABLE public\.reserved_usernames ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.is_username_reserved/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.enforce_username_policy/);
  assert.match(migration, /grandfathered_profile_id/);
  assert.match(migration, /profiles\.username_key = 'chromadie'/);
  assert.match(migration, /Approved ChromaDie remediation/);
  assert.match(migration, /profiles_username_policy/);
  assert.match(driftCheck, /--linked/);
});
