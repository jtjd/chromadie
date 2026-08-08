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

test('one- and two-character username shapes are valid while short routes stay reserved', () => {
  for (const username of ['a', 'Z', '7', '_', 'ab', 'A7', '_x']) {
    assert.equal(isUsernameShapeValid(username), true, username);
  }
  for (const username of ['', 'a-', 'é', 'a b', '123456789012345678901']) {
    assert.equal(isUsernameShapeValid(username), false, username);
  }
  for (const route of ['c', 'u', 'og']) {
    assert.equal(isReservedRouteSegment(route), true, route);
    assert.equal(isProtectedUsername(route), true, route);
    assert.equal(normalizeUsernameSegment(route), null, route);
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
  const homeClaim = await readFile(new URL('../src/lib/HomeUsernameClaim.svelte', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260808120000_short_usernames.sql', import.meta.url), 'utf8');
  const driftCheck = await readFile(new URL('../scripts/check-username-policy-drift.mjs', import.meta.url), 'utf8');

  assert.match(auth, /isProtectedUsername/);
  assert.match(auth, /minlength="1"/);
  assert.match(auth, /1-20 characters/);
  assert.match(homeClaim, /minlength="1"/);
  assert.match(homeClaim, /1–20 letters/);
  assert.doesNotMatch(auth, /new Set\(\['guest', 'anon', 'anonymous'\]\)/);
  assert.match(migration, /profiles_username_format_check/);
  assert.match(migration, /challenges_sender_username_check/);
  assert.match(migration, /reserved_usernames_key_check/);
  assert.match(migration, /'\^\[A-Za-z0-9_\]\{1,20\}\$'/);
  assert.match(migration, /\('c', 'route'/);
  assert.match(migration, /\('og', 'route'/);
  assert.match(migration, /\('u', 'route'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.is_username_reserved/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.enforce_username_policy/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.handle_new_user/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_my_profile/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_public_profile_identity/);
  assert.match(driftCheck, /\{1,20\}/);
  assert.match(driftCheck, /--linked/);
});
