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

test('homepage fixtures share one direct specimen composition', () => {
  assert.deepEqual(HOMEPAGE_FIXTURES.map(fixture => fixture.id), [
    'compact-tjz',
    'sleek-arcade',
    'minimal-mono',
    'portfolio-void'
  ]);
  assert.deepEqual(getHomepageShowcaseFixtures().map(fixture => fixture.id), HOMEPAGE_SHOWCASE_FIXTURE_IDS);

  for (const fixture of HOMEPAGE_FIXTURES) {
    assert.ok(fixture.username);
    assert.ok(fixture.displayName);
    assert.ok(fixture.bio);
    assert.match(fixture.media.background, /^\/homepage\/fixtures\/.*\.png$/);
    assert.match(fixture.media.avatar, /^\/homepage\/fixtures\/.*\.png$/);
    assert.equal(fixture.links.length, 4);
    assert.ok(fixture.links.every(link => /^https:\/\//.test(link.url)));
    assert.ok(fixture.effects.profileBorder);
    assert.ok(fixture.effects.avatar);
    assert.ok(fixture.effects.atmosphere);
    assert.ok(fixture.scores.length > 0);
    assert.ok(fixture.scores.every(score => score.hex_code && Number.isFinite(score.score) && score.rarity && score.condition_ids.length > 0));
    assert.equal(fixture.timelineEvents.length, fixture.scores.length);
    assert.equal(fixture.timelineEvents[0].payload.conditionIds.length, fixture.scores[0].condition_ids.length);
  }
});

test('fixture lookup is bounded and never falls back to live profile data', () => {
  assert.equal(getHomepageFixture('sleek-arcade').username, 'Arcade');
  assert.equal(getHomepageFixture('missing-fixture'), null);
  assert.equal(getHomepageFixture(), null);
});

test('the direct homepage specimen and carousel contain no production profile renderer seam', async () => {
  const [hero, demo, showcase] = await Promise.all([
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte')
  ]);
  const source = `${hero}\n${demo}\n${showcase}`;
  assert.doesNotMatch(source, /ProfileShell|ProfileLayoutFrame|profileRenderModel|HomepageProfileRenderer|profile-shell/);
  assert.match(source, /HomepageProfileDemo/);
});

test('the live community surface remains isolated from homepage fixtures', async () => {
  const community = await read('src/lib/homepage/HomepageCommunity.svelte');
  assert.match(community, /get_public_discovery/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|homepage-fixture-/);
  assert.match(community, /getCanonicalProfilePath/);
});
