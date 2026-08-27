import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, community, board, entry, routeContract] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/HomepageCommunity.svelte'),
  read('src/lib/homepage/HomepageDailyLeaderboard.svelte'),
  read('src/lib/LeaderboardEntry.svelte'),
  read('src/lib/routeContract.js')
]);

test('the homepage exposes profiles only through the bounded real-player board', () => {
  assert.doesNotMatch(home, /HomepageProfileDemo|homepageFixtures|HOMEPAGE_FIXTURES|ProfileReferenceCard/);
  assert.match(home, /<HomepageCommunity/);
  assert.equal((home.match(/<HomepageCommunity\b/g) || []).length, 1);
  assert.match(community, /get_public_discovery/);
  assert.match(community, /p_surface: 'today'/);
  assert.match(community, /p_limit: DAILY_LEADERBOARD_LIMIT/);
  assert.match(community, /normalizeDiscoveryResponse/);
  assert.doesNotMatch(community, /homepageFixtures|HOMEPAGE_FIXTURES|getHomepageFixture/);
});

test('every rendered board row uses the shared safe profile route contract', () => {
  assert.match(community, /getCanonicalProfilePath/);
  assert.match(board, /LeaderboardEntry/);
  assert.match(board, /rows\.slice\(0, 5\)/);
  assert.match(board, /View full leaderboard/);
  assert.match(entry, /getPublicProfilePath/);
  assert.match(routeContract, /getCanonicalProfilePath/);
});

test('loading, error, and empty board states remain explicit', () => {
  assert.match(community, /loading = true/);
  assert.match(community, /Public profiles could not be loaded right now\./);
  assert.match(board, /Loading today’s board/);
  assert.match(board, /role="alert"/);
  assert.match(board, /No public rolls are on today’s board yet\./);
});
