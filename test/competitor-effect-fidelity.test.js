import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  GUNS_FUZZY_BASE_INTENSITY,
  GUNS_FUZZY_ROW_JITTER,
  GUNS_SHUFFLE_DURATION_MS,
  GUNS_SHUFFLE_STAGGER_MS,
  getGunsFuzzyRowOffset,
  getGunsShuffleCycleDuration,
  getGunsShuffleTracks,
  getGunsShuffleTrackOffset
} from '../src/lib/competitor-effects/gunsEffectAlgorithms.js';
import {
  GUNS_FAIRY_DUST_GRAVITY,
  GUNS_FAIRY_DUST_LIFE_MAX,
  GUNS_FAIRY_DUST_LIFE_MIN,
  GUNS_TRAILING_CURSOR_PARTICLES,
  GUNS_TRAILING_CURSOR_RATE,
  advanceGunsFairyDustParticle,
  advanceGunsTrailingCursorNodes,
  createGunsFairyDustParticle,
  createGunsTrailingCursorNodes
} from '../src/lib/competitor-effects/gunsCursorAlgorithms.js';
import { getGunsParallaxRotation } from '../src/lib/competitor-effects/gunsParallax.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Guns Fuzzy keeps the observed canvas row-displacement contract', () => {
  assert.equal(GUNS_FUZZY_BASE_INTENSITY, 0.15);
  assert.equal(GUNS_FUZZY_ROW_JITTER, 30);
  assert.equal(getGunsFuzzyRowOffset(0, GUNS_FUZZY_BASE_INTENSITY), -3);
  assert.equal(getGunsFuzzyRowOffset(0.5, GUNS_FUZZY_BASE_INTENSITY), 0);
  assert.equal(getGunsFuzzyRowOffset(0.999, GUNS_FUZZY_BASE_INTENSITY), 2);
  assert.equal(getGunsFuzzyRowOffset(0, 0), 0);
  assert.ok(getGunsFuzzyRowOffset(0, GUNS_FUZZY_BASE_INTENSITY) >= -5);
  assert.ok(getGunsFuzzyRowOffset(1, GUNS_FUZZY_BASE_INTENSITY) <= 5);
});

test('Guns Shuffle preserves measured glyph timing, overlap, and rightward entry', () => {
  assert.equal(GUNS_SHUFFLE_DURATION_MS, 350);
  assert.equal(GUNS_SHUFFLE_STAGGER_MS, 30);

  const tracks = getGunsShuffleTracks(8);
  assert.equal(tracks.length, 8);
  assert.deepEqual(tracks[1], { index: 1, group: 'odd', startMs: 0, endMs: 350 });
  assert.deepEqual(tracks[3], { index: 3, group: 'odd', startMs: 30, endMs: 380 });
  assert.deepEqual(tracks[0], { index: 0, group: 'even', startMs: 308, endMs: 658 });
  assert.equal(getGunsShuffleCycleDuration(8), 748);
  assert.equal(getGunsShuffleCycleDuration(0), GUNS_SHUFFLE_DURATION_MS);

  assert.equal(getGunsShuffleTrackOffset(0, -1, 20, 8), -40);
  assert.equal(getGunsShuffleTrackOffset(1, 350, 20, 8), 0);
  assert.equal(getGunsShuffleTrackOffset(0, 658, 20, 8), 0);
  assert.ok(getGunsShuffleTrackOffset(0, 483, 20, 8) < 0);
});

test('Guns cursor algorithms keep the shipped trailing and fairy-dust constants', () => {
  assert.equal(GUNS_TRAILING_CURSOR_PARTICLES, 15);
  assert.equal(GUNS_TRAILING_CURSOR_RATE, 0.6);
  assert.equal(GUNS_FAIRY_DUST_LIFE_MIN, 60);
  assert.equal(GUNS_FAIRY_DUST_LIFE_MAX, 90);
  assert.equal(GUNS_FAIRY_DUST_GRAVITY, 0.02);

  const nodes = createGunsTrailingCursorNodes({ x: 10, y: 20 });
  assert.equal(nodes.length, 15);
  assert.deepEqual(nodes[0], { x: 10, y: 20 });
  assert.deepEqual(nodes[14], { x: 10, y: 20 });
  nodes[1] = { x: 30, y: 20 };
  advanceGunsTrailingCursorNodes(nodes, { x: 10, y: 20 }, GUNS_TRAILING_CURSOR_RATE);
  assert.equal(nodes[0].x, 10);
  assert.equal(nodes[1].x, 22);

  const randomValues = [0.25, 0.2, 0.8, 0.4];
  const particle = createGunsFairyDustParticle(4, 5, () => randomValues.shift());
  assert.equal(particle.initialLifeSpan, 67);
  assert.equal(particle.lifeSpan, 67);
  assert.equal(particle.velocity.x, -0.4);
  assert.equal(particle.velocity.y, 1.18);
  advanceGunsFairyDustParticle(particle);
  assert.equal(particle.x, 3.6);
  assert.equal(particle.y, 6.18);
  assert.equal(particle.velocity.y, 1.2);
  assert.ok(particle.scale < 1);
});

test('Guns parallax uses the observed ten-degree pointer envelope', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  assert.deepEqual(getGunsParallaxRotation(rect, { clientX: 100, clientY: 50 }), {
    rotateX: 10,
    rotateY: -10
  });
  assert.deepEqual(getGunsParallaxRotation(rect, { clientX: 200, clientY: 100 }), {
    rotateX: 0,
    rotateY: 0
  });
  assert.deepEqual(getGunsParallaxRotation(rect, { clientX: 300, clientY: 150 }), {
    rotateX: -10,
    rotateY: 10
  });
  assert.equal(getGunsParallaxRotation(null, { clientX: 1, clientY: 1 }), null);
});

test('the live-source ports remain explicit in the renderers and font registry', async () => {
  const [motions, cursor, avatar, fonts] = await Promise.all([
    read('src/lib/name/render/composableMotions.js'),
    read('src/lib/cursor-trail/CursorTrailLayer.svelte'),
    read('src/lib/avatar-effect/AvatarEffect.svelte'),
    read('src/lib/name/nameFonts.js')
  ]);

  assert.match(motions, /getGunsFuzzyRowOffset/);
  assert.match(motions, /getGunsShuffleTrackOffset/);
  assert.match(motions, /actualBoundingBoxLeft/);
  assert.match(motions, /actualBoundingBoxAscent/);
  assert.match(cursor, /advanceGunsTrailingCursorNodes/);
  assert.match(cursor, /advanceGunsFairyDustParticle/);
  assert.match(cursor, /GUNS_TRAILING_CURSOR_PARTICLES/);
  assert.match(avatar, /getGunsParallaxRotation/);
  assert.match(avatar, /transition: transform 700ms/);
  assert.match(fonts, /'chillax'/);
});
