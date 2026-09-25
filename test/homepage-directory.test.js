import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, topRollDiscovery, bestRoll, board, entry, routeContract] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/topRollDiscovery.js'),
  read('src/lib/homepage/HomepageBestRoll.svelte'),
  read('src/lib/homepage/HomepageDailyLeaderboard.svelte'),
  read('src/lib/LeaderboardEntry.svelte'),
  read('src/lib/routeContract.js')
]);

test('the homepage exposes profiles only through the bounded real-player board', () => {
  assert.doesNotMatch(home, /HomepageProfileDemo|homepageFixtures|HOMEPAGE_FIXTURES|ProfileReferenceCard/);
  assert.doesNotMatch(home, /HomepageCommunity/);
  assert.match(home, /loadHomepageTopRolls/);
  assert.match(topRollDiscovery, /get_public_discovery_spotlight/);
  assert.match(topRollDiscovery, /p_limit: DAILY_TOP_ROLL_LIMIT/);
  assert.match(topRollDiscovery, /normalizeDiscoveryResponse/);
  assert.doesNotMatch(topRollDiscovery, /homepageFixtures|HOMEPAGE_FIXTURES|getHomepageFixture/);
});

test('every rendered board row uses the shared safe profile route contract', () => {
  assert.match(topRollDiscovery, /getCanonicalProfilePath/);
  assert.match(bestRoll, /getPublicProfilePath/);
  assert.match(bestRoll, /href=\{profileHref\}/);
  assert.match(board, /LeaderboardEntry/);
  assert.match(board, /rows\.slice\(0, 5\)/);
  assert.match(board, /View full leaderboard/);
  assert.match(entry, /getPublicProfilePath/);
  assert.match(routeContract, /getCanonicalProfilePath/);
});

test('loading, error, and empty board states remain explicit', () => {
  assert.match(bestRoll, /loading && !bestRoll/);
  assert.match(bestRoll, /error && !bestRoll/);
  assert.match(topRollDiscovery, /Public profiles could not be loaded right now\./);
  assert.match(bestRoll, /role="alert"/);
  assert.match(bestRoll, />Retry<\/button>/);
  assert.match(bestRoll, /No public roll today\./);
  assert.match(bestRoll, /on:click=\{\(\) => dispatch\('retry'\)\}/);
  assert.match(board, /Loading today’s board/);
  assert.match(board, /role="alert"/);
  assert.match(board, /No public rolls are on today’s board yet\./);
});
