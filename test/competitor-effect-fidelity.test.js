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
  GUNS_BUBBLE_BASE_DIMENSION,
  GUNS_BUBBLE_LIFE_MIN,
  GUNS_BUBBLE_LIFE_SPAN,
  GUNS_CHARACTER_LIFE_MIN,
  GUNS_CHARACTER_LIFE_SPAN,
  GUNS_EMOJI_GRAVITY,
  GUNS_EMOJI_LIFE_MIN,
  GUNS_EMOJI_LIFE_SPAN,
  GUNS_FOLLOWING_DOT_LAG,
  GUNS_FOLLOWING_DOT_RADIUS,
  GUNS_SPRINGY_EMOJI_NODES,
  GUNS_SPRINGY_EMOJI_SEPARATION,
  GUNS_TEXT_FLAG_GAP,
  GUNS_TEXT_FLAG_LAG,
  GUNS_FAIRY_DUST_GRAVITY,
  GUNS_FAIRY_DUST_LIFE_MAX,
  GUNS_FAIRY_DUST_LIFE_MIN,
  GUNS_TRAILING_CURSOR_PARTICLES,
  GUNS_TRAILING_CURSOR_RATE,
  advanceGunsBubbleParticle,
  advanceGunsCharacterParticle,
  advanceGunsEmojiParticle,
  advanceGunsFairyDustParticle,
  advanceGunsFollowingDot,
  advanceGunsSpringyEmojiNodes,
  advanceGunsTextFlag,
  advanceGunsTrailingCursorNodes,
  applyGunsSpringyEmojiConstraint,
  createGunsBubbleParticle,
  createGunsCharacterParticle,
  createGunsEmojiParticle,
  createGunsFairyDustParticle,
  createGunsFollowingDot,
  createGunsSpringyEmojiNodes,
  createGunsTextFlagNodes,
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

test('the additional cursor ports preserve the shipped particle and follower math', () => {
  assert.equal(GUNS_BUBBLE_LIFE_MIN, 60);
  assert.equal(GUNS_BUBBLE_LIFE_SPAN, 60);
  assert.equal(GUNS_BUBBLE_BASE_DIMENSION, 4);
  const bubbleRandom = [0.25, 0.2, 0.8, 0.4];
  const bubble = createGunsBubbleParticle(4, 5, () => bubbleRandom.shift());
  assert.equal(bubble.initialLifeSpan, 75);
  assert.ok(Math.abs(bubble.velocity.x - (-0.08)) < 1e-12);
  assert.ok(Math.abs(bubble.velocity.y - (-0.8)) < 1e-12);
  const bubbleUpdateRandom = [0.25, 0.5];
  advanceGunsBubbleParticle(bubble, 1, () => bubbleUpdateRandom.shift());
  assert.ok(Math.abs(bubble.x - 3.92) < 1e-12);
  assert.ok(Math.abs(bubble.y - 4.2) < 1e-12);
  assert.ok(Math.abs(bubble.velocity.x - (-0.10666666666666667)) < 1e-12);
  assert.ok(Math.abs(bubble.velocity.y - (-0.8008333333333333)) < 1e-12);
  assert.ok(Math.abs(bubble.scale - 0.21333333333333337) < 1e-12);

  assert.equal(GUNS_CHARACTER_LIFE_MIN, 80);
  assert.equal(GUNS_CHARACTER_LIFE_SPAN, 60);
  const characterRandom = [0.25, 0.2, 0.8, 0.4, 0.2, 0.6];
  const character = createGunsCharacterParticle(10, 20, () => characterRandom.shift(), 'h');
  assert.equal(character.initialLifeSpan, 95);
  assert.equal(character.rotationSign, -1);
  assert.ok(Math.abs(character.velocity.x - 2) < 1e-12);
  assert.ok(Math.abs(character.velocity.y - (-3)) < 1e-12);
  const characterUpdateRandom = [0.8, 0.2];
  advanceGunsCharacterParticle(character, 1, () => characterUpdateRandom.shift());
  assert.ok(Math.abs(character.x - 12) < 1e-12);
  assert.ok(Math.abs(character.y - 17) < 1e-12);
  assert.ok(Math.abs(character.velocity.x - 2.033333333333333) < 1e-12);
  assert.ok(Math.abs(character.velocity.y - (-3.066666666666667)) < 1e-12);
  assert.ok(Math.abs(character.scale - 1.9789473684210526) < 1e-12);

  assert.equal(GUNS_EMOJI_LIFE_MIN, 80);
  assert.equal(GUNS_EMOJI_LIFE_SPAN, 60);
  assert.equal(GUNS_EMOJI_GRAVITY, 0.05);
  const emojiRandom = [0.25, 0.2, 0.8, 0.5];
  const emoji = createGunsEmojiParticle(2, 3, () => emojiRandom.shift(), '😀');
  assert.equal(emoji.initialLifeSpan, 95);
  assert.ok(Math.abs(emoji.velocity.x - (-0.4)) < 1e-12);
  assert.ok(Math.abs(emoji.velocity.y - 1) < 1e-12);
  advanceGunsEmojiParticle(emoji);
  assert.ok(Math.abs(emoji.x - 1.6) < 1e-12);
  assert.ok(Math.abs(emoji.y - 4) < 1e-12);
  assert.ok(Math.abs(emoji.velocity.y - 1.05) < 1e-12);

  assert.equal(GUNS_FOLLOWING_DOT_RADIUS, 10);
  assert.equal(GUNS_FOLLOWING_DOT_LAG, 10);
  const dot = createGunsFollowingDot({ x: 0, y: 0 });
  advanceGunsFollowingDot(dot, { x: 100, y: 50 });
  assert.deepEqual(dot, { x: 10, y: 5 });

  assert.equal(GUNS_TEXT_FLAG_GAP, 14);
  assert.equal(GUNS_TEXT_FLAG_LAG, 5);
  const flag = createGunsTextFlagNodes(' ABC', { x: 0, y: 0 });
  const phase = advanceGunsTextFlag(flag, { x: 100, y: 50 });
  assert.equal(phase, 0.15);
  assert.ok(Math.abs(flag[0].x - 23.977542155872083) < 1e-12);
  assert.ok(Math.abs(flag[0].y - 10.747190662367997) < 1e-12);
  assert.equal(flag[1].x, 14);
  assert.equal(flag[3].x, 14);

  assert.equal(GUNS_SPRINGY_EMOJI_NODES, 7);
  assert.equal(GUNS_SPRINGY_EMOJI_SEPARATION, 10);
  const force = { x: 0, y: 0 };
  applyGunsSpringyEmojiConstraint({ x: 20, y: 0 }, { x: 0, y: 0 }, force);
  assert.deepEqual(force, { x: 100, y: 0 });
  const spring = createGunsSpringyEmojiNodes({ x: 0, y: 0 });
  advanceGunsSpringyEmojiNodes(spring, { x: 20, y: 0 }, 100, 100);
  assert.equal(spring.length, 7);
  assert.deepEqual(spring[0], { x: 20, y: 0, velocityX: 0, velocityY: 0 });
  assert.equal(spring[1].velocityX, 1);
  assert.equal(spring[1].x, 1);
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
  assert.match(cursor, /advanceGunsBubbleParticle/);
  assert.match(cursor, /advanceGunsCharacterParticle/);
  assert.match(cursor, /advanceGunsEmojiParticle/);
  assert.match(cursor, /advanceGunsFollowingDot/);
  assert.match(cursor, /advanceGunsSpringyEmojiNodes/);
  assert.match(cursor, /advanceGunsTextFlag/);
  assert.match(avatar, /getGunsParallaxRotation/);
  assert.match(avatar, /transition: transform 700ms/);
  assert.match(fonts, /'chillax'/);
  assert.match(fonts, /'kode-mono'/);
  assert.match(fonts, /@fontsource\/kode-mono\/latin-400\.css/);
});
