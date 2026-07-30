import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile(new URL('../src/lib/HomePage.svelte', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');

test('the homepage explains the daily identity loop with a direct signup action', () => {
  assert.match(home, /Roll one color each day/);
  assert.match(home, /record of every return/);
  assert.match(home, /daily color identity/);
  assert.match(home, /Create your profile/);
  assert.match(home, /dispatch\('signup'\)/);
  assert.match(home, /Open your profile/);
  assert.match(home, /prefers-reduced-motion/);
});

test('the application mounts the homepage, signup flow, and global footer', () => {
  assert.match(app, /import HomePage from '.\/lib\/HomePage\.svelte'/);
  assert.match(app, /\{#if view === 'home'\}/);
  assert.match(app, /on:signup=\{\(\) => openAuthModal\('signup'\)\}/);
  assert.match(app, /<footer class="site-footer">/);
  assert.match(app, /\.site-footer \{\s*position: relative;\s*z-index: 1;/s);
  assert.match(app, /Privacy Policy/);
  assert.match(app, /How to Play/);
});
