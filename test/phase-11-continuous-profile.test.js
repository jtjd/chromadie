import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('phase 11 profile composition uses one opening canvas and quiet supporting surfaces', async () => {
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const expression = await readFile(new URL('../src/lib/ProfileExpression.svelte', import.meta.url), 'utf8');
  const featured = await readFile(new URL('../src/lib/ProfileFeatured.svelte', import.meta.url), 'utf8');
  const roll = await readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8');
  const dailyRoll = await readFile(new URL('../src/lib/ProfileDailyRoll.svelte', import.meta.url), 'utf8');

  assert.match(shell, /profile-shell__opening/);
  assert.match(shell, /profile-shell__supporting/);
  assert.match(shell, /profile-shell__identity/);
  assert.match(shell, /<ProfileDailyRoll/);
  assert.doesNotMatch(shell, /More of the color story|Connect with this profile|Public boundary/);
  assert.doesNotMatch(featured, /Featured accomplishment/);
  assert.doesNotMatch(expression, /<Module/);
  assert.doesNotMatch(featured, /<Module/);
  assert.match(roll, /export let integrated = false/);
  assert.match(roll, /profile-roll--integrated/);
  assert.match(dailyRoll, /<ProfileRoll[\s\S]*integrated=\{true\}/);
});

test('phase 11 visual contract preserves secondary detail and owner boundaries', async () => {
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const registry = await readFile(new URL('../src/lib/profile-studio/sectionRegistry.js', import.meta.url), 'utf8');
  const roll = await readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8');

  assert.match(shell, /getProfileStoryVisible/);
  assert.doesNotMatch(shell, /<details class="profile-shell__details/);
  assert.match(registry, /ProfileEditor\.svelte/);
  assert.match(registry, /ProfileSocial\.svelte/);
  assert.match(shell, /<ProfileSocial[\s\S]*on:socialchange=\{handleSocialChange\}/);
  assert.match(shell, /profile-shell__social-section/);
  assert.match(shell, /Add to rivals/);
  assert.match(roll, /<details class="profile-roll__details"/);
  assert.match(roll, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(roll, /client.*score|calculate.*reward/i);
});
