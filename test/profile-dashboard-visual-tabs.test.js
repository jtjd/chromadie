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

test('Profile Studio responsive boundaries keep controls and preview drawers inside the viewport', async () => {
  const [shell, header, appearance, preview, identity, smoke] = await Promise.all([
    read('src/lib/ProfileDashboardShell.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('scripts/browser/profile-studio-smoke.mjs')
  ]);

  assert.doesNotMatch(header, /customize-tabs-actions/);
  assert.match(shell, /profile-dashboard-shell__mobile-preview/);
  assert.match(shell, /profile-dashboard-shell__mobile-actions/);
  assert.match(shell, /profile-dashboard-shell--dirty/);
  assert.match(shell, /with-preview \.profile-dashboard-shell__preview \{[^}]*box-sizing: border-box; margin: 0;/);
  assert.match(shell, /@media \(max-width: 90rem\) and \(min-width: 64\.01rem\)[\s\S]*with-preview \{ grid-template-columns: var\(--dashboard-sidebar-width\) minmax\(0, 1fr\) minmax\(19rem, 24rem\);/);
  assert.match(shell, /@media \(max-width: 64rem\)[\s\S]*sidebar \{ position: fixed;[^}]*visibility: hidden; pointer-events: none;/);
  assert.match(appearance, /\.appearance-editor \{[\s\S]*width: 100%;[\s\S]*min-width: 0;[\s\S]*box-sizing: border-box;/);
  assert.match(appearance, /\.appearance-editor__panel \{ width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;/);
  assert.match(appearance, /@media \(max-width: 72rem\)[\s\S]*appearance-editor__surface-grid \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(appearance, /@media \(max-width: 40rem\)[\s\S]*appearance-editor__color-grid, \.appearance-editor__surface-grid \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(identity, /@media \(max-width: 52rem\)[\s\S]*identity-editor__fields\) \{ display: grid; gap: \.8rem;[\s\S]*identity-editor__grid--behavior \.identity-editor__field:last-child\)/);
  assert.match(identity, /identity-editor__grid--meta \.identity-editor__field:first-child[\s\S]*grid-column: 1 \/ -1/);
  assert.match(preview, /container: profile-preview \/ inline-size;/);
  assert.match(preview, /@container profile-preview \(max-width: 31rem\)[\s\S]*identity-card__person/);
  assert.match(smoke, /responsive dashboard geometry fits phone, tablet, and narrow desktop widths/);
  assert.match(smoke, /const widths = \[320, 360, 390, 414, 480, 520, 524, 544, 576, 600, 768, 1024, 1100, 1280\]/);
  assert.match(smoke, /09-mobile-preview-414/);
  assert.match(smoke, /10-mobile-editor-414/);
  assert.match(smoke, /profile-dashboard-shell--mobile/);
  assert.match(smoke, /const destinations = \['overview', 'links', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'progression', 'account'\]/);
});

test('reference workspace composition stays explicit', async () => {
  const [settings, header, preview, draftModel, actions, appearance, appearanceColors, cosmetics, customize, mediaWorkspace, profileShell, editor, expression, shopPreview] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/profile-studio/draftModel.js'),
    read('src/lib/ProfileDashboardActions.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/profileAppearanceColors.js'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileMediaWorkspace.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ShopItemPreview.svelte')
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
  assert.match(preview, /profile-studio-preview__canvas :global\(\.profile-shell-page--preview\)[\s\S]*overflow: hidden; border: 1px[\s\S]*border-radius: 1rem/);
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
  assert.match(cosmetics, /<ShopItemPreview item=\{previewItems\[slot\]\} nameLoadout=\{getNamePreviewLoadoutForSlot\(previewLoadout, slot, previewItems\[slot\]\?\.css_value/);
  for (const role of ['Avatar effect', 'Profile border', 'Cursor trail', 'Profile atmosphere']) {
    assert.match(cosmetics, new RegExp(`aria-label="${role} preview"[\\s\\S]*<ShopItemPreview`));
  }
  assert.match(cosmetics, /height: 5\.5rem; min-height: 5\.5rem/);
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
  assert.match(mediaWorkspace, /data-media-workspace-layout="reference"/);
  assert.match(mediaWorkspace, /grid-column: 1;[\s\S]*grid-row: 1;[\s\S]*compact-card--background/);
  assert.match(mediaWorkspace, /profile-background-treatment[\s\S]*grid-column: 2 \/ -1/);
  assert.match(mediaWorkspace, /@media \(max-width: 52rem\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)/);
  assert.match(cosmetics, /profile-cosmetics-surface--compact\) \{[^}]*padding: 0; border: 0; border-radius: 0; background: transparent/);
  assert.match(cosmetics, /profile-cosmetics-name-preview[^\n]*overflow: visible/);
  assert.match(cosmetics, /profile-cosmetics-name-grid \.profile-cosmetics-slot select \{ height: 2\.5rem; min-height: 2\.5rem;/);
  assert.match(cosmetics, /profile-cosmetics-name-grid \.profile-cosmetics-slot label \{ margin-bottom: \.3rem; font-size: \.72rem/);
  assert.match(shopPreview, /shop-preview-area\[data-render-context="name-control"\][\s\S]*font-size: 1\.05rem; line-height: 1;/);
  assert.match(shopPreview, /export let nameLoadout = null/);
  assert.match(shopPreview, /nameLayerLoadout = isNamePreview \? nameLoadout : itemNameLayerLoadout/);
  assert.match(shopPreview, /previewAccent = isNamePreview \? displayColor/);
  assert.match(shopPreview, /nameRendererMode = resolvedRenderContext === PROFILE_RENDER_CONTEXTS\.NAME_CONTROL[\s\S]*item\?\.slot === 'name_motion' \? 'animated'/);
  assert.match(shopPreview, /previewSurface = resolvedRenderContext === PROFILE_RENDER_CONTEXTS\.CATALOG \? PREVIEW_SURFACE : 'transparent'/);
  assert.match(shopPreview, /<CursorTrailLayer[\s\S]*inputMode="demo"/);
  assert.doesNotMatch(shopPreview, /shop-cursor-preview__pixel-route|shop-cursor-preview__trail--near/);
  assert.match(shopPreview, /shop-atmosphere-preview \{[^}]*background:transparent/);
});
