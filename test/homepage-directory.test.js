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
  assert.equal(getHomepageFixture('sleek-arcade').username, 'katt');
  assert.equal(getHomepageFixture('missing-fixture'), null);
  assert.equal(getHomepageFixture(), null);
});

test('the first homepage fixture is the authored Meilin profile example', () => {
  const fixture = HOMEPAGE_FIXTURES[0];
  assert.equal(fixture.username, 'meilin');
  assert.equal(fixture.displayName, 'meilin');
  assert.equal(fixture.bio, 'daydreamer · pixel artist · music lover');
  assert.equal(fixture.secondaryLine, 'somewhere between here and the horizon');
  assert.deepEqual(fixture.links.map(link => link.type), ['instagram', 'youtube', 'discord', 'tiktok']);
  assert.deepEqual(fixture.links.map(link => link.label), ['Instagram', 'YouTube', 'Discord', 'TikTok']);
  assert.equal(fixture.media.background, '/homepage/fixtures/meilin/background-dusk-v2.webp');
  assert.equal(fixture.media.avatar, '/homepage/fixtures/meilin/avatar.webp');
  assert.equal(fixture.heroLayout, 'immersive');
  assert.ok(HOMEPAGE_FIXTURES.slice(2).every(item => !item.heroLayout));
  const otherMedia = HOMEPAGE_FIXTURES.slice(1).flatMap(item => [item.media.background, item.media.avatar]);
  assert.ok(!otherMedia.includes(fixture.media.background));
  assert.ok(!otherMedia.includes(fixture.media.avatar));
});

test('the second homepage fixture demonstrates the Framed 3D Velocity profile', () => {
  const fixture = HOMEPAGE_FIXTURES[1];
  assert.equal(fixture.id, 'sleek-arcade');
  assert.equal(fixture.username, 'katt');
  assert.equal(fixture.displayName, 'katt');
  assert.equal(fixture.secondaryLine, 'Siberia · Russia');
  assert.equal(fixture.media.background, '/homepage/fixtures/p2/background-snowy-mountains.png');
  assert.equal(fixture.media.avatar, '/homepage/fixtures/p2/p2avatar.png');
  assert.equal(fixture.heroLayout, 'framed');
  assert.equal(fixture.profileMotion, 'profile_motion_perspective_tilt');
  assert.equal(fixture.avatarEffectKey, '3d-parallax');
  assert.equal(fixture.nameFontKey, 'velocity');
  assert.deepEqual(fixture.linkStyle, { size: 2, glow: 1 });
  assert.equal(fixture.atmosphereKey, 'snowfall');
  assert.equal(fixture.effects.nameFont, 'name_font_velocity');
  assert.equal(fixture.effects.atmosphere, 'profile_atmosphere_snowfall');
});

test('the direct homepage specimen uses the canonical first-example layout without mounting the profile shell', async () => {
  const [homePage, hero, demo, showcase, referenceCard] = await Promise.all([
    read('src/lib/HomePage.svelte'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/ProfileReferenceCard.svelte')
  ]);
  const source = `${homePage}\n${hero}\n${demo}\n${showcase}\n${referenceCard}`;
  assert.doesNotMatch(source, /ProfileShell|ProfileLayoutFrame|profileRenderModel|HomepageProfileRenderer|profile-shell/);
  assert.match(hero, /ProfileMotionEffect/);
  assert.match(source, /HomepageProfileDemo/);
  assert.match(hero, /inputSurface="viewport"/);
  assert.doesNotMatch(hero, /handleViewportPointerMove|animateTilt|requestAnimationFrame|PROFILE_TILT_|homepage-profile-wrap|perspective: 1150px/);
  assert.match(hero, /PREVIEW_ROLL_DELAYS = Object\.freeze\(\[76, 78, 82, 88, 100, 116, 136\]\)/);
  assert.match(hero, /rollPhase = 'spin'/);
  assert.match(hero, /rollPhase = 'land'/);
  assert.match(hero, /rollPhase = 'impact'/);
  assert.match(hero, /IMPACT_DURATION_MS = 1380/);
  assert.match(hero, /homepage-roll-particles::before/);
  assert.match(hero, /@keyframes homepage-roll-flash/);
  assert.match(hero, /@keyframes homepage-roll-ring/);
  assert.match(hero, /hasReducedMotion\(\)/);
  assert.match(hero, /clearTimeout\(previewRollTimer\)/);
  assert.match(hero, /setLocalPreviewRoll/);
  assert.match(hero, /dispatch\('accentpreview', \{ accent: finalRoll\.hex_code \}\)/);
  assert.doesNotMatch(hero, /setInterval/);
  assert.match(hero, /<HomepageProfileDemo fixture=\{fixture\} \{previewRoll\}/);
  assert.match(demo, /fixture\?\.media\?\.avatar/);
  assert.match(demo, /export let previewRoll = null/);
  assert.doesNotMatch(demo, /impactActive = false/);
  assert.match(demo, /previewRoll \|\| fixture\?\.scores\?\.\[0\]/);
  assert.match(demo, /ProfileFullBleedLayout/);
  assert.match(demo, /data-homepage-profile-layout/);
  assert.match(demo, /useRollAvatarEffect/);
  assert.match(demo, /useFramedLayout/);
  assert.match(demo, /avatarEffectKey=\{avatarEffectKey\}/);
  assert.match(demo, /nameLoadout=\{nameLoadout\}/);
  assert.match(demo, /linkStyle=\{fixture\.linkStyle \|\| null\}/);
  assert.match(demo, /layoutVariant=\{useFramedLayout \? 'framed' : ''\}/);
  assert.match(demo, /colorizeAvatarEffect=\{useRollAvatarEffect\}/);
  assert.doesNotMatch(demo, /homepage-profile-demo__head|Profile preview|@\{fixture\.username\}/);
  assert.match(demo, /ProfileReferenceCard/);
  assert.match(demo, /secondaryLine/);
  assert.match(homePage, /LazyAtmosphereLayer/);
  assert.match(homePage, /className="homepage-atmosphere"/);
  assert.match(homePage, /activeAtmosphereKey = nextFixture\.atmosphereKey/);
  assert.match(source, /getNameFontCssFamily/);
  assert.match(source, /--profile-reference-name-typeface/);
});

test('the live community surface remains isolated from homepage fixtures', async () => {
  const community = await read('src/lib/homepage/HomepageCommunity.svelte');
  assert.match(community, /get_public_discovery/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|homepage-fixture-/);
  assert.match(community, /getCanonicalProfilePath/);
});
