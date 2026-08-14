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
    'meilin-horizon',
    'sleek-arcade',
    'minimal-mono',
    'portfolio-void'
  ]);
  assert.deepEqual(getHomepageShowcaseFixtures().map(fixture => fixture.id), HOMEPAGE_SHOWCASE_FIXTURE_IDS);

  for (const fixture of HOMEPAGE_FIXTURES) {
    assert.ok(fixture.username);
    assert.ok(fixture.displayName);
    assert.ok(fixture.bio);
    assert.match(fixture.media.background, /^\/homepage\/fixtures\/.*\.(?:png|webp)$/);
    assert.match(fixture.media.avatar, /^\/homepage\/fixtures\/.*\.(?:png|webp)$/);
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

test('the first homepage fixture is the authored Meilin profile example', () => {
  const fixture = HOMEPAGE_FIXTURES[0];
  assert.equal(fixture.username, 'meilin');
  assert.equal(fixture.displayName, 'meilin');
  assert.equal(fixture.bio, 'daydreamer · pixel artist · music lover');
  assert.equal(fixture.secondaryLine, 'somewhere between here and the horizon');
  assert.deepEqual(fixture.links.map(link => link.label), ['Website', 'Spotify', 'Discord', 'Archive']);
  assert.equal(fixture.media.background, '/homepage/fixtures/meilin/background.webp');
  assert.equal(fixture.media.avatar, '/homepage/fixtures/meilin/avatar.webp');
  const otherMedia = HOMEPAGE_FIXTURES.slice(1).flatMap(item => [item.media.background, item.media.avatar]);
  assert.ok(!otherMedia.includes(fixture.media.background));
  assert.ok(!otherMedia.includes(fixture.media.avatar));
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
  assert.match(hero, /on:pointermove=\{handleProfilePointerMove\}/);
  assert.match(hero, /on:pointerleave=\{resetProfileTilt\}/);
  assert.match(hero, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/);
  assert.match(hero, /prefers-reduced-motion/);
  assert.match(hero, /event\.pointerType === 'touch'/);
  assert.match(hero, /event\.clientX - bounds\.left/);
  assert.match(hero, /event\.clientY - bounds\.top/);
  assert.match(hero, /PROFILE_TILT_MAX_Y = 6/);
  assert.match(hero, /PROFILE_TILT_MAX_X = 4/);
  assert.match(hero, /\(pointerX - 0\.5\) \* PROFILE_TILT_MAX_Y \* 2/);
  assert.match(hero, /\(0\.5 - pointerY\) \* PROFILE_TILT_MAX_X \* 2/);
  assert.match(hero, /perspective:\s*1400px/);
  assert.match(hero, /transform:\s*rotateY\(-4deg\) rotateX\(2deg\)/);
  assert.match(hero, /transform-style:\s*preserve-3d/);
  assert.match(hero, /transition: transform 0\.3s cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(demo, /fixture\?\.media\?\.avatar/);
  assert.match(demo, /homepage-profile-demo__secondary/);
});

test('the live community surface remains isolated from homepage fixtures', async () => {
  const community = await read('src/lib/homepage/HomepageCommunity.svelte');
  assert.match(community, /get_public_discovery/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|homepage-fixture-/);
  assert.match(community, /getCanonicalProfilePath/);
});
