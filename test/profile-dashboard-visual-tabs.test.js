import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Customize tabs preserve mounted editors while switching visible groups', async () => {
  const [customize, settings] = await Promise.all([
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileSettings.svelte')
  ]);

  assert.match(customize, /export let activeTab = 'appearance'/);
  assert.match(customize, /selectedTab = \['appearance', 'media', 'effects', 'layout'\]/);
  assert.match(customize, /hidden=\{selectedTab !== 'media'\}/);
  assert.match(customize, /hidden=\{selectedTab !== 'appearance'\}/);
  assert.match(customize, /hidden=\{selectedTab !== 'effects'\}/);
  assert.match(customize, /hidden=\{selectedTab !== 'layout'\}/);
  assert.match(customize, /profile-collection/);
  assert.match(customize, /profile-widgets/);
  assert.match(customize, /profile-layout/);
  assert.match(settings, /content: 'media'/);
  assert.match(settings, /widgets: 'effects'/);
});

test('Profile Studio mode control is keyboard-labelled and stays gradient-free', async () => {
  const [shell, settings] = await Promise.all([
    read('src/lib/ProfileDashboardShell.svelte'),
    read('src/lib/ProfileSettings.svelte')
  ]);

  assert.match(shell, /profile-dashboard-shell__mode-toggle/);
  assert.match(shell, /aria-label=\{colorMode === 'dark' \? 'Use light mode' : 'Use dark mode'\}/);
  assert.match(shell, /aria-pressed=\{colorMode === 'light'\}/);
  assert.match(shell, /profile-dashboard-shell--light/);
  assert.doesNotMatch(shell, /gradient/i);
  assert.doesNotMatch(settings, /gradient/i);
});
