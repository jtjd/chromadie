import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { PROFILE_CANVAS_FIXTURE } from '../src/lib/profileFixture.js';
import { parseRouteLocation } from '../src/lib/routes.js';

const tokens = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const foundations = await readFile(new URL('../src/styles/foundations.css', import.meta.url), 'utf8');
const motion = await readFile(new URL('../src/styles/motion.css', import.meta.url), 'utf8');
const prototypeSource = await readFile(new URL('../src/lib/ProfileCanvasPrototype.svelte', import.meta.url), 'utf8');

test('profile canvas fixture is public-safe, structured, and immutable', () => {
  assert.equal(Object.isFrozen(PROFILE_CANVAS_FIXTURE), true);
  assert.equal(PROFILE_CANVAS_FIXTURE.mode, 'fixture');
  assert.match(PROFILE_CANVAS_FIXTURE.signatureColor, /^#[0-9A-F]{6}$/);
  assert.ok(PROFILE_CANVAS_FIXTURE.identity.username);
  assert.ok(PROFILE_CANVAS_FIXTURE.roll.hex);
  assert.ok(PROFILE_CANVAS_FIXTURE.achievements.length > 0);
  assert.equal(Object.hasOwn(PROFILE_CANVAS_FIXTURE, 'email'), false);
  assert.equal(Object.hasOwn(PROFILE_CANVAS_FIXTURE, 'userId'), false);
});

test('foundation layers define shared tokens, primitives, and reduced-motion equivalents', () => {
  for (const token of ['--color-canvas', '--type-h1', '--space-4', '--radius-lg', '--content-profile', '--motion-base']) {
    assert.match(tokens, new RegExp(`${token.replaceAll('-', '\\-')}\\s*:`));
  }
  assert.match(foundations, /\.foundation-page/);
  assert.match(foundations, /\.foundation-visually-hidden/);
  assert.match(motion, /\.motion-rise/);
  assert.match(motion, /\.motion-ambient/);
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /animation:\s*none/);
  assert.match(prototypeSource, /PROFILE_CANVAS_FIXTURE/);
  assert.match(prototypeSource, /<Surface/);
  assert.doesNotMatch(prototypeSource, /supabase|\.rpc\(/);
});

test('prototype route remains additive, direct-refreshable, and noindex', () => {
  const route = parseRouteLocation('/prototype/profile');
  assert.equal(route.routeMode, 'app');
  assert.equal(route.view, 'prototype');
  assert.equal(route.profileUsername, null);
  assert.equal(parseRouteLocation('/').view, 'game');
});
