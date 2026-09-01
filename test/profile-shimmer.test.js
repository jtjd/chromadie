import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_SHIMMER_OFFSETS,
  PROFILE_SHIMMER_SPEED,
  createProfileShimmerController,
  getProfileShimmerGeometry,
  getProfileShimmerPoint
} from '../src/lib/profile-border/profileShimmerRenderer.js';
import { getProfileBorderDefinition, PROFILE_BORDER_KEYS } from '../src/lib/profile-border/profileBorders.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the rounded edge light track keeps the inspected offsets and speed', () => {
  assert.deepEqual(PROFILE_SHIMMER_OFFSETS, [0, 8, 17, 29, 44, 62, 84, 110, 140, 174]);
  assert.equal(PROFILE_SHIMMER_SPEED, 210);
  assert.equal(PROFILE_BORDER_KEYS.includes('shimmer-track'), true);
  assert.equal(getProfileBorderDefinition('border_shimmer_track')?.label, 'Shimmer Track');
});

test('shimmer geometry follows one clockwise rounded rectangle perimeter', () => {
  const geometry = getProfileShimmerGeometry({ width: 300, height: 200, radius: 30, borderWidth: 2 });
  const start = getProfileShimmerPoint(geometry, 0);
  const end = getProfileShimmerPoint(geometry, geometry.perimeter);
  const topRight = getProfileShimmerPoint(geometry, 240);
  assert.deepEqual(start, { x: 30, y: 1 });
  assert.ok(Math.abs(end.x - start.x) < 0.000001);
  assert.ok(Math.abs(end.y - start.y) < 0.000001);
  assert.equal(topRight.x, 270);
  assert.equal(topRight.y, 1);
  assert.ok(geometry.perimeter > 0);
});

test('the shimmer controller writes ten CSS points and pauses when disabled', () => {
  const writes = new Map();
  const callbacks = new Map();
  const host = { clientWidth: 300, clientHeight: 200 };
  const layer = { style: { setProperty(name, value) { writes.set(name, value); } } };
  const document = {
    hidden: false,
    addEventListener() {},
    removeEventListener() {}
  };
  let nextFrame = 0;
  const controller = createProfileShimmerController({
    host,
    layer,
    document,
    getComputedStyle: () => ({ getPropertyValue: property => property === '--profile-border-radius' ? '30px' : '2px' }),
    requestAnimationFrame: callback => {
      const id = ++nextFrame;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame: id => callbacks.delete(id),
    ResizeObserver: undefined,
    IntersectionObserver: undefined
  });

  assert.equal(writes.size, 20);
  assert.match(writes.get('--profile-shimmer-x-0'), /px$/);
  assert.match(writes.get('--profile-shimmer-y-9'), /px$/);
  assert.equal(callbacks.size, 1);

  const firstEntry = callbacks.entries().next().value;
  callbacks.delete(firstEntry[0]);
  firstEntry[1](1000);
  const secondEntry = callbacks.entries().next().value;
  callbacks.delete(secondEntry[0]);
  secondEntry[1](1100);
  assert.equal(callbacks.size, 1);
  const movedX = writes.get('--profile-shimmer-x-0');
  controller.update({ enabled: false });
  assert.equal(callbacks.size, 0);
  assert.equal(writes.get('--profile-shimmer-x-0'), movedX);
  controller.destroy();
});

test('the rendered shimmer layer preserves the source mask, trails, pulse, and motion fallback', async () => {
  const source = await read('src/lib/profile-border/ProfileShimmerFrameEffect.svelte');
  assert.match(source, /-webkit-mask: linear-gradient\(#fff 0 0\) content-box/);
  assert.match(source, /radial-gradient\(circle at var\(--profile-shimmer-x-0/);
  assert.match(source, /var\(--profile-shimmer-x-9/);
  assert.match(source, /profile-shimmer-frame-pulse 4\.8s ease-in-out infinite/);
  assert.match(source, /opacity: \.58/);
  assert.match(source, /opacity: 1/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /animation: none/);
});
