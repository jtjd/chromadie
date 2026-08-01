import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the owner roll broadcasts its lifecycle into the profile presentation', async () => {
  const profileRoll = await readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8');
  const profileShell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const atmosphere = await readFile(new URL('../src/lib/ProfileAtmosphere.svelte', import.meta.url), 'utf8');
  const identityCard = await readFile(new URL('../src/lib/IdentityCard.svelte', import.meta.url), 'utf8');

  assert.match(profileRoll, /dispatch\('rollstart'/);
  assert.match(profileRoll, /dispatch\('rollcancel'/);
  assert.match(profileShell, /on:rollstart=\{handleRollStart\}/);
  assert.match(profileShell, /on:rollcancel=\{handleRollCancel\}/);
  assert.match(profileShell, /colorEffectsEnabled = effectiveProfileConfig\.colorEffectsEnabled === true/);
  assert.match(profileShell, /rollState=\{colorEffectsEnabled \? profileRollState : 'idle'\}/);
  assert.match(profileShell, /rollColor=\{colorEffectsEnabled \?/);
  assert.match(profileShell, /backgroundTint=\{colorEffectsEnabled\}/);
  assert.match(profileShell, /profileRollColor/);
  assert.match(profileShell, /profile-shell-page--roll-/);
  assert.match(atmosphere, /profile-atmosphere--rolling/);
  assert.match(atmosphere, /profile-atmosphere--settled/);
  assert.match(atmosphere, /prefers-reduced-motion/);
  assert.match(identityCard, /identity-card--roll-rolling/);
  assert.match(identityCard, /identity-card--roll-settled/);
  assert.match(identityCard, /prefers-reduced-motion/);
});
