import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseRouteLocation } from '../src/lib/routes.js';
import { canInitiateRoll, normalizeCanonicalRoll } from '../src/lib/rollState.js';

const [redirects, app, header, privacy, game, profileShell, profileRoll, profileFunction, migrations, rollback] = await Promise.all([
  readFile(new URL('../public/_redirects', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/SiteModeHeader.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/PrivacyPolicy.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../functions/u/[[username]].js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/MIGRATIONS.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/ROLLBACK_AND_RECOVERY.md', import.meta.url), 'utf8')
]);

test('browser audit keeps direct refresh, route parsing, and metadata boundaries explicit', () => {
  assert.match(redirects, /^\/\*\s+\/index\.html\s+200/m);

  const profileRoute = parseRouteLocation('/u/NeonUser', '?legacy=1');
  assert.equal(profileRoute.routeMode, 'app');
  assert.equal(profileRoute.view, 'profile');
  assert.equal(profileRoute.profileUsername, 'NeonUser');
  assert.equal(profileRoute.legacyProfile, true);

  const privacyRoute = parseRouteLocation('/privacy');
  assert.equal(privacyRoute.routeMode, 'privacy');
  assert.equal(privacyRoute.view, 'home');

  assert.match(profileFunction, /status: 307/);
  assert.match(profileFunction, /legacyProfile/);
  assert.match(profileFunction, /getProfileCacheControl/);
});

test('browser audit keeps keyboard, reduced-motion, and consent controls on the existing shell', () => {
  assert.match(app, /class="skip-link" href="#main-content"/);
  assert.match(app, /id="main-content"/);
  assert.match(header, /aria-expanded=/);
  assert.match(header, /aria-hidden=/);
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(privacy, /AnalyticsPreferences/);
  assert.match(privacy, /Privacy/);
});

test('browser audit preserves guest/authenticated roll and owner/visitor profile seams', () => {
  assert.match(game, /getRollAccountMode/);
  assert.match(game, /localStorage\.setItem\('chromadie-roll'/);
  assert.match(game, /requestRoll/);
  assert.match(profileRoll, /requestRoll/);
  assert.match(profileRoll, /normalizeCanonicalRoll/);
  assert.match(profileShell, /isOwnProfileTarget/);
  assert.match(profileShell, /isOwnProfile/);
  assert.match(profileShell, /<ProfileRoll/);

  assert.equal(canInitiateRoll({ authInitialized: false }), false);
  assert.equal(canInitiateRoll({ authInitialized: true }), true);
  assert.equal(canInitiateRoll({ authInitialized: true, isReroll: true, userId: 'user', rerollShards: 1 }), true);
  assert.deepEqual(normalizeCanonicalRoll({ hex_code: '#123456', score: 42, rarity: 'rare' }), {
    hex: '#123456',
    score: 42,
    rarity: 'rare',
    badges: [],
    traits: [],
    contributors: [],
    identity: ''
  });
});

test('browser audit documents migration stop conditions and recoverable deployment boundaries', () => {
  assert.match(migrations, /supabase migration list --linked/);
  assert.match(migrations, /stop if that migration is not marked remote-applied/);
  assert.match(rollback, /Do not run `supabase db reset` against a remote project/);
  assert.match(rollback, /Do not run `supabase db push` until the migration list/);
  assert.match(rollback, /Cloudflare Pages/);
  assert.match(rollback, /point-in-time recovery/i);
});
