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
  assert.match(shell, /profile-dashboard-shell__topbar/);
  assert.match(shell, /grid-template-rows: auto minmax\(0, 1fr\)/);
  assert.match(shell, /profile-dashboard-shell__mode-copy/);
});

test('reference workspace composition stays explicit', async () => {
  const [settings, actions, appearance, appearanceColors, cosmetics, customize] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileDashboardActions.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/profileAppearanceColors.js'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileCustomizePage.svelte')
  ]);

  assert.match(actions, /Customize profile/);
  assert.match(actions, /All changes saved/);
  assert.match(actions, /profile-dashboard-actions__publish/);
  assert.match(actions, /margin-inline: \.75rem/);
  assert.match(settings, /slot="topbar"/);
  assert.match(settings, /profile-settings-page__customize-tabs \{[^}]*margin: 0 \.75rem \.45rem/);
  assert.match(settings, /profile-settings-preview__devices/);
  assert.match(settings, /Unlock more with Chromadie Plus/);
  assert.match(settings, /profile-settings-preview__canvas\.profile-settings-preview__canvas--appearance/);
  assert.match(appearance, /appearance-editor__picker-surface/);
  assert.match(appearance, /appearance-editor__palette/);
  for (const label of ['Profile text', 'Handle & metadata', 'Profile surface', 'Surface tint', 'Border', 'Page background']) {
    assert.match(appearanceColors, new RegExp(label));
  }
  assert.match(customize, /profile-customize-page__appearance-effects/);
  assert.match(customize, /--customize-control-surface: var\(--ctp-crust/);
  assert.match(customize, /background: var\(--customize-control-surface\) !important/);
  assert.match(customize, /profile-editor \.profile-template-picker__premium\) \{ display: none !important; \}/);
  assert.match(cosmetics, /Name effects/);
  assert.match(cosmetics, /Visual effects/);
  assert.match(customize, /profile-expression-editor__compact-grid\) \{ grid-template-columns: minmax\(0, \.9fr\)/);
});
