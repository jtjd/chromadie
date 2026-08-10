import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Customize tabs preserve mounted editors while switching visible groups', async () => {
  const [customize, settings, contract] = await Promise.all([
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js')
  ]);

  assert.match(customize, /export let activeTab = 'appearance'/);
  assert.match(customize, /selectedTab = \['appearance', 'media', 'layout'\]/);
  assert.match(customize, /hidden=\{selectedTab !== 'media'\}/);
  assert.match(customize, /hidden=\{selectedTab !== 'appearance'\}/);
  assert.match(customize, /class:is-tab-hidden=\{selectedTab !== 'appearance'\}[^>]*id="customize-effects"/);
  assert.match(customize, /data-editor-section="effects"/);
  assert.match(customize, /hidden=\{selectedTab !== 'layout'\}/);
  assert.match(customize, /profile-collection/);
  assert.match(customize, /profile-widgets/);
  assert.match(customize, /profile-layout/);
  const studio = [settings, contract].join('\n');
  assert.match(studio, /content: 'media'/);
  assert.match(studio, /widgets: 'appearance'/);
  assert.match(studio, /'customize-effects': 'appearance'/);
  assert.doesNotMatch(studio, /\{ id: 'effects', label: 'Effects'/);
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
  const [settings, header, preview, draftModel, actions, appearance, appearanceColors, cosmetics, customize, profileShell, editor, expression] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/profile-studio/draftModel.js'),
    read('src/lib/ProfileDashboardActions.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/profileAppearanceColors.js'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte')
  ]);
  const studio = [settings, header, preview, draftModel].join('\n');

  assert.match(actions, /Customize profile/);
  assert.match(actions, /All changes saved/);
  assert.match(actions, /profile-dashboard-actions__publish/);
  assert.match(actions, /margin-inline: \.75rem/);
  assert.match(settings, /slot="topbar"/);
  assert.match(header, /profile-studio-header__customize-tabs \{[^}]*margin: 0 \.75rem \.45rem/);
  assert.match(preview, /profile-studio-preview__devices/);
  assert.match(preview, /Unlock more with Chromadie Plus/);
  assert.match(preview, /profile-studio-preview__canvas--appearance/);
  assert.match(preview, /profile-studio-preview__canvas :global\(\.profile-shell-page--preview\)[\s\S]*border: 0; border-radius: 0/);
  assert.doesNotMatch(preview, /!important/);
  assert.match(appearance, /appearance-editor__picker-surface/);
  assert.match(appearance, /appearance-editor__palette/);
  for (const label of ['Profile text', 'Handle & metadata', 'Profile surface', 'Bio text', 'Page background']) {
    assert.match(appearanceColors, new RegExp(label));
  }
  assert.doesNotMatch(appearanceColors, /Surface tint|label: 'Border'/);
  assert.doesNotMatch(customize, /profile-customize-page__appearance-effects|Overlay color|Atmosphere strength|Restart animations/);
  assert.match(customize, /--customize-control-surface: var\(--ctp-crust/);
  assert.match(customize, /background: var\(--customize-control-surface\) !important/);
  assert.match(editor, /profile-editor--studio[\s\S]*profile-template-picker__premium\) \{ display: none; \}/);
  assert.match(cosmetics, /Name effects/);
  assert.match(cosmetics, /name_font: 'Font'/);
  assert.match(cosmetics, /name_material: 'Material'/);
  assert.match(cosmetics, /name_motion: 'Motion'/);
  assert.match(cosmetics, /Visual effects/);
  assert.match(cosmetics, /import ShopItemPreview from '\.\/ShopItemPreview\.svelte'/);
  assert.match(cosmetics, /profile-cosmetics-name-preview[\s\S]*<ShopItemPreview/);
  for (const role of ['Avatar effect', 'Profile border', 'Cursor trail', 'Profile atmosphere']) {
    assert.match(cosmetics, new RegExp(`aria-label="${role} preview"[\\s\\S]*<ShopItemPreview`));
  }
  assert.match(cosmetics, /height: 4\.25rem; min-height: 4\.25rem/);
  assert.match(cosmetics, /renderContext=\{PROFILE_RENDER_CONTEXTS\.EFFECT_CARD\}/);
  assert.doesNotMatch(cosmetics, /Preview only\. Apply the change when the look feels right/);
  assert.doesNotMatch(cosmetics, /let status = ''/);
  assert.doesNotMatch(cosmetics, /profile-cosmetics-visual-preview--(?:avatar|border|cursor|atmosphere)/);
  assert.match(cosmetics, /dispatch\('cosmeticpreview'/);
  for (const slot of ['avatar_effect', 'profile_border', 'cursor_trail', 'profile_atmosphere']) {
    assert.match(cosmetics, new RegExp(`previewSlot\\('${slot}'`));
  }
  assert.match(cosmetics, /NAME_COMPOSABLE_SLOTS[\s\S]*previewSlot\(slot/);
  assert.match(customize, /dispatch\('customizepreview'/);
  assert.match(customize, /on:cosmeticpreview=\{forward\}/);
  assert.match(settings, /on:identitypreview=\{updateIdentityPreview\}/);
  assert.match(settings, /on:cosmeticpreview=\{updateCosmeticPreview\}/);
  assert.match(settings, /on:customizepreview=\{updateConfigurationPreview\}/);
  assert.match(draftModel, /equipped_cosmetics: cosmeticPreviewLoadout \|\| equippedCosmetics/);
  assert.match(profileShell, /getNameRendererLoadout\(cosmetics\)/);
  assert.match(profileShell, /avatarEffectKey=\{cosmetics\?\.avatar_effect\}/);
  assert.match(profileShell, /<ProfileBorderEffect borderKey=\{cosmetics\?\.profile_border\}/);
  assert.match(expression, /\.profile-expression-editor__compact-grid \{[\s\S]*grid-template-columns: minmax\(0, \.9fr\) minmax\(0, \.9fr\) minmax\(0, 1\.5fr\)/);
  assert.match(cosmetics, /profile-cosmetics-name-grid \.profile-cosmetics-slot select \{ height: 1\.65rem; min-height: 1\.65rem;/);
  assert.match(cosmetics, /profile-cosmetics-name-grid \.profile-cosmetics-slot label \{ margin-bottom: \.15rem; font-size: \.6rem/);
});
