import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from 'svelte/compiler';

const app = readFileSync(new URL('../src/App.svelte', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/lib/ProfileOwnerHeader.svelte', import.meta.url), 'utf8');

test('profile navigation only mounts for the owner after homepage transition', () => {
  assert.match(app, /\{#if profileModeOwner && !homepageHeaderTransitionPending\}\s*\{#await import\('\.\/lib\/ProfileOwnerHeader\.svelte'\) then headerModule\}/);
  assert.match(app, /profileModeUsername\.toLowerCase\(\) === currentAccountUsername\.toLowerCase\(\)/);
  assert.match(app, /!\$selectedUserId \|\| \$selectedUserId === \$session\?\.user\?\.id/);
});

test('owner header exposes canonical home and customize links with accessible controls', () => {
  assert.match(header, /<nav aria-label="Your profile navigation">/);
  assert.match(header, /href="\/">Home<\/a>/);
  assert.doesNotMatch(header, /[←→↗↓]/);
  assert.match(header, /href="\/profile\/settings">Customize profile<\/a>/);
  assert.match(header, /min-height: 44px/);
  assert.match(header, /:focus-visible/);
  const result = compile(header, { filename: 'ProfileOwnerHeader.svelte', generate: 'server' });
  assert.deepEqual(result.warnings, []);
});
