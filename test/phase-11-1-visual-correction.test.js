import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('phase 11.1 records measured scale and composition targets before correction', async () => {
  const audit = await read('docs/PHASE_11_1_VISUAL_AUDIT.md');
  const capture = await read('scripts/capture-phase-10-2.mjs');

  assert.match(audit, /Side-by-side measurements at 1920×1080/);
  assert.match(audit, /browser zoom: 100%/);
  assert.match(audit, /deviceScaleFactor`: 1/);
  assert.match(audit, /getBoundingClientRect/);
  assert.match(audit, /getComputedStyle/);
  assert.match(capture, /--force-device-scale-factor=1/);
  assert.match(capture, /Emulation\.setPageScaleFactor/);
  assert.match(capture, /devicePixelRatio/);
});

test('phase 11.1 production composition uses a full atmosphere and intentional anchors', async () => {
  const shell = await read('src/lib/ProfileShell.svelte');
  const atmosphere = await read('src/lib/ProfileAtmosphere.svelte');
  const identity = await read('src/lib/IdentityCard.svelte');
  const today = await read('src/lib/TodayColor.svelte');
  const collection = await read('src/lib/FeaturedCollection.svelte');
  const music = await read('src/lib/ProfileMusic.svelte');
  const roll = await read('src/lib/ProfileRoll.svelte');

  assert.match(shell, /PROFILE_MUSIC_ENABLED/);
  assert.match(shell, /showExpression/);
  assert.match(shell, /grid-template-rows: minmax\(0, 1fr\) auto/);
  assert.match(shell, /grid-row: 2/);
  assert.match(atmosphere, /position: fixed/);
  assert.match(atmosphere, /width: 100vw/);
  assert.match(atmosphere, /height: 100dvh/);
  assert.match(atmosphere, /color-mix\(in srgb, var\(--atmosphere-accent\) 17%/);
  assert.match(identity, /font-size: 0\.875rem/);
  assert.match(identity, /font: 600 0\.75rem/);
  assert.match(identity, /if bio/);
  assert.match(identity, /link-icons/);
  assert.match(today, /font: 600 clamp\(1\.25rem/);
  assert.match(today, /getOrbShape/);
  assert.match(today, /getRollEffect/);
  assert.match(collection, /Color archive/);
  assert.match(music, /showVisualFixture/);
  assert.doesNotMatch(music, /Music off/);
  assert.match(roll, /color-mix\(in srgb, var\(--profile-accent\) 48%, white\)/);
});

test('phase 11.1 optional expression is hidden without a real or explicit fixture', async () => {
  const shell = await read('src/lib/ProfileShell.svelte');
  const music = await read('src/lib/ProfileMusic.svelte');

  assert.match(shell, /if !previewMode && showExpression/);
  assert.match(music, /!PROFILE_MUSIC_ENABLED && import\.meta\.env\.DEV && visualFixture === 'music'/);
  assert.doesNotMatch(music, /Music off/);
  assert.doesNotMatch(music, /safeColor\}<\/strong>/);
});
