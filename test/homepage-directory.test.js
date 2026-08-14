import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  HOMEPAGE_FIXTURES,
  HOMEPAGE_SHOWCASE_FIXTURE_IDS,
  getHomepageFixture,
  getHomepageShowcaseFixtures
} from '../src/lib/homepage/homepageFixtures.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage fixture carousel has one deterministic real renderer model per supported showcase', () => {
  assert.deepEqual(HOMEPAGE_FIXTURES.map(fixture => fixture.id), [
    'compact-tjz',
    'sleek-arcade',
    'minimal-mono',
    'portfolio-void'
  ]);
  assert.deepEqual(getHomepageShowcaseFixtures().map(fixture => fixture.id), HOMEPAGE_SHOWCASE_FIXTURE_IDS);

  for (const fixture of HOMEPAGE_FIXTURES) {
    assert.match(fixture.profile.id, /^homepage-fixture-/);
    assert.equal(fixture.profile.username, fixture.username);
    assert.ok(fixture.profileConfig.layoutVariant);
    assert.ok(fixture.profileConfig.media_references.background.preview_url.startsWith('/homepage/fixtures/'));
    assert.ok(fixture.profileConfig.media_references.avatar.preview_url.startsWith('/homepage/fixtures/'));
    assert.equal(fixture.collectionItems.length, 0);
    assert.equal(fixture.allAchievements.length, 0);
    assert.ok(fixture.scores.length > 0);
    assert.equal(fixture.timelineEvents.length, fixture.scores.length);
  }
});

test('fixture lookup is bounded and never falls back to live profile data', () => {
  assert.equal(getHomepageFixture('sleek-arcade').username, 'Arcade');
  assert.equal(getHomepageFixture('missing-fixture'), null);
  assert.equal(getHomepageFixture(), null);
});

test('the live community surface remains isolated from homepage fixtures', async () => {
  const community = await read('src/lib/homepage/HomepageCommunity.svelte');
  assert.match(community, /get_public_discovery/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|homepage-fixture-/);
  assert.match(community, /getCanonicalProfilePath/);
});
