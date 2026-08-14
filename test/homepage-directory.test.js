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
  assert.match(hero, /window\.addEventListener\('pointermove', handleViewportPointerMove/);
  assert.doesNotMatch(hero, /on:pointermove=\{handleHeroPointerMove\}|on:pointerleave=\{resetProfileTilt\}/);
  assert.match(hero, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/);
  assert.match(hero, /prefers-reduced-motion/);
  assert.match(hero, /event\.pointerType === 'touch'/);
  assert.match(hero, /event\.clientX \/ viewportWidth - 0\.5/);
  assert.match(hero, /event\.clientY \/ viewportHeight - 0\.5/);
  assert.match(hero, /PROFILE_TILT_MAX_Y = 14/);
  assert.match(hero, /PROFILE_TILT_MAX_X = 8/);
  assert.match(hero, /perspective: 1150px/);
  assert.match(hero, /transform: rotateY\(var\(--profile-tilt-y, -8deg\)\) rotateX\(var\(--profile-tilt-x, 4deg\)\)/);
  assert.match(hero, /requestAnimationFrame\(animateTilt\)/);
  assert.match(hero, /will-change: transform/);
  assert.match(hero, /homepage-profile-wrap--returning/);
  assert.doesNotMatch(hero, /transition: transform 0\.3s/);
  assert.match(hero, /PREVIEW_ROLL_DELAYS = Object\.freeze\(\[76, 78, 82, 88, 100, 116, 136\]\)/);
  assert.match(hero, /rollPhase = 'spin'/);
  assert.match(hero, /rollPhase = 'land'/);
  assert.match(hero, /rollPhase = 'impact'/);
  assert.match(hero, /IMPACT_DURATION_MS = 1120/);
  assert.match(hero, /if \(prefersReducedMotion\)/);
  assert.match(hero, /clearTimeout\(previewRollTimer\)/);
  assert.match(hero, /setLocalPreviewRoll/);
  assert.match(hero, /dispatch\('accentpreview', \{ accent: finalRoll\.hex_code \}\)/);
  assert.doesNotMatch(hero, /setInterval/);
  assert.match(hero, /<HomepageProfileDemo fixture=\{fixture\} \{previewRoll\}/);
  assert.match(demo, /fixture\?\.media\?\.avatar/);
  assert.match(demo, /export let previewRoll = null/);
  assert.match(demo, /impactActive = false/);
  assert.match(demo, /previewRoll \|\| fixture\?\.scores\?\.\[0\]/);
  assert.doesNotMatch(demo, /homepage-profile-demo__head|Profile preview|@\{fixture\.username\}/);
  assert.match(demo, /homepage-profile-demo__secondary/);
});

test('the live community surface remains isolated from homepage fixtures', async () => {
  const community = await read('src/lib/homepage/HomepageCommunity.svelte');
  assert.match(community, /get_public_discovery/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|homepage-fixture-/);
  assert.match(community, /getCanonicalProfilePath/);
});
