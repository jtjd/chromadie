import { NEW_NAME_MOTION_KEYS } from '../src/lib/name/nameMotionCollection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CURATED_NAME_MOTION_KEYS, isCuratedNameMotion, resolveNameMotionKey } from '../src/lib/name/nameMotions.js';
import { getScrambleCharacter, getParticleEnvelope, SCRAMBLE_CYCLE_MS } from '../src/lib/name/render/motionTiming.js';

test('Studio curates twenty-five motions while historical saved keys still resolve', async () => {
  assert.deepEqual(CURATED_NAME_MOTION_KEYS, ['raster-signal', 'haunt-fuzzy', 'kinetic-echo', 'neon-particle', 'letter-shuffle', 'star-companions', 'heart-pop', 'ion-sweep', 'phase-fracture', 'letterpress', ...NEW_NAME_MOTION_KEYS]);
  assert.equal(isCuratedNameMotion('name_motion_raster_signal'), true);
  assert.equal(isCuratedNameMotion('haunt-flash'), false);
  assert.equal(isCuratedNameMotion('unknown'), false);
  assert.equal(resolveNameMotionKey('haunt-flash'), 'haunt-flash');
  const editor = await readFile(new URL('../src/lib/ProfileCosmeticsEditor.svelte', import.meta.url), 'utf8');
  assert.match(editor, /isCuratedNameMotion\(item.css_value\)/);
  assert.match(editor, /item.item_key === \$equippedItems\['name_motion'\]/);
});

test('Scramble changes actual glyphs, holds the full name, and resolves in reading order', () => {
  const text = Array.from('Chromadie');
  const frame = time => text.map((character, index) => getScrambleCharacter(character, index, text.length, time, 42)).join('');
  for (const time of [0, 1700, 2600, 3800, 4799, SCRAMBLE_CYCLE_MS]) assert.equal(frame(time), 'Chromadie');
  assert.notEqual(frame(3000), 'Chromadie');
  assert.equal(frame(3450).slice(0, 3), 'Chr');
  assert.equal(frame(3000), frame(3000 + SCRAMBLE_CYCLE_MS));
  assert.notEqual(frame(3000), frame(3140));
  for (const character of [' ', 'e\u0301', '👩‍💻', '-']) {
    assert.equal(getScrambleCharacter(character, 0, 1, 3000, 42), character);
  }
});

test('Neon particle and glint lifetimes fade continuously at both ends', () => {
  assert.equal(getParticleEnvelope(0), 0);
  assert.equal(getParticleEnvelope(1), 0);
  assert.ok(getParticleEnvelope(0.25) > 0.9);
  assert.ok(getParticleEnvelope(0.0001) < 0.00001);
  assert.ok(getParticleEnvelope(0.9999) < 0.00001);
  for (let i = 0; i <= 100; i++) assert.ok(getParticleEnvelope(i / 100) >= 0 && getParticleEnvelope(i / 100) <= 1);
});
