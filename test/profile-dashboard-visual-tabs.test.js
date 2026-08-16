import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS } from '../src/lib/profile-studio/dashboardContract.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Customize tabs mount only the supported visible editor groups', async () => {
  const [customize, settings, contract] = await Promise.all([
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js')
  ]);

  assert.match(customize, /export let activeTab = 'appearance'/);
  assert.match(customize, /selectedTab = \['appearance', 'media', 'layout'\]/);
  assert.match(customize, /\{#if selectedTab === 'appearance'\}/);
  assert.match(customize, /\{:else if selectedTab === 'media'\}/);
  assert.match(customize, /id="customize-appearance"/);
  assert.match(customize, /id="customize-media"/);
  assert.match(customize, /id="customize-layout"/);
  assert.match(customize, /id="customize-identity"/);
  assert.match(customize, /id="customize-effects"/);
  assert.doesNotMatch(customize, /hidden=|class:is-tab-hidden|data-editor-section=/);
  assert.match(customize, /profile-collection/);
  assert.doesNotMatch(customize, /contentComponent|widgetComponent|id="customize-content"|id="customize-widgets"/);
  assert.match(customize, /ProfileReferenceLayoutEditor/);
  assert.doesNotMatch(customize, /ProfileTemplatePicker|showLinks=\{false\}/);
  const studio = [settings, contract].join('\n');
  assert.match(studio, /content: 'media'/);
  assert.match(studio, /widgets: 'appearance'/);
  assert.deepEqual(PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS, ['customize', 'profile-identity', 'profile-media', 'profile-collection', 'profile-layout']);
  assert.match(studio, /'customize-effects': 'appearance'/);
  assert.doesNotMatch(studio, /\{ id: 'effects', label: 'Effects'/);
});

test('Profile Studio mode control is keyboard-labelled and stays gradient-free', async () => {
  const [shell, settings] = await Promise.all([
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/lib/ProfileSettings.svelte')
  ]);

  assert.doesNotMatch(shell, /profile-studio-shell__primary-nav/);
  assert.match(shell, /profile-studio-shell__menu-trigger/);
  assert.match(shell, /profile-studio-shell__more-menu/);
  assert.match(shell, /aria-haspopup="menu"/);
  assert.doesNotMatch(shell, /colorMode|mode-toggle|profile-dashboard-shell--light/);
  assert.doesNotMatch(shell, /gradient/i);
  assert.doesNotMatch(settings, /gradient/i);
  assert.match(shell, /profile-studio-shell__header/);
  assert.match(shell, /grid-template-columns: minmax\(540px, 640px\) minmax\(400px, 1fr\)/);
});

test('Profile Studio responsive boundaries keep controls and preview drawers inside the viewport', async () => {
  const [shell, header, appearance, preview, identity, smoke] = await Promise.all([
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('scripts/browser/profile-studio-smoke.mjs')
  ]);

  assert.doesNotMatch(header, /customize-tabs-actions/);
  assert.match(shell, /profile-studio-shell__mobile-tools/);
  assert.match(shell, /profile-studio-shell__mobile-actions/);
  assert.match(shell, /profile-studio-shell--dirty/);
  assert.match(shell, /\.profile-studio-shell__preview \{ position: sticky/);
  assert.match(shell, /profile-studio-shell--with-preview \.profile-studio-shell__workspace/);
  assert.match(shell, /@media \(max-width: 1100px\)[\s\S]*grid-template-columns: minmax\(0, 640px\)/);
  assert.match(shell, /width: min\(calc\(100% - 48px\), 640px\)/);
  assert.match(shell, /@media \(max-width: 700px\)/);
  assert.doesNotMatch(shell, /sidebar|drawer|profile-dashboard-shell/i);
  assert.match(appearance, /\.appearance-editor \{[\s\S]*width: 100%;[\s\S]*min-width: 0;[\s\S]*box-sizing: border-box;/);
  assert.match(appearance, /\.appearance-editor__panel \{ width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;/);
  assert.match(appearance, /\.appearance-editor__surface-color \{[\s\S]*grid-template-columns: minmax\(0, 1fr\);[\s\S]*align-items: start/);
  assert.match(appearance, /\.appearance-editor__surface-color > span \{[\s\S]*text-transform: uppercase/);
  assert.match(await read('src/lib/ProfileCustomizePage.svelte'), /appearance-editor__surface-color\) \{ align-self: end; grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(appearance, /@media \(max-width: 72rem\)[\s\S]*appearance-editor__surface-grid \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(appearance, /@media \(max-width: 40rem\)[\s\S]*appearance-editor__color-grid, \.appearance-editor__surface-grid \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(identity, /@media \(max-width: 52rem\)[\s\S]*identity-editor__fields\) \{ display: grid; gap: \.8rem;[\s\S]*identity-editor__grid--behavior \.identity-editor__field:last-child\)/);
  assert.match(identity, /identity-editor__grid--meta \.identity-editor__field:first-child[\s\S]*grid-column: 1 \/ -1/);
  assert.match(preview, /profile-studio-preview__stage/);
  assert.doesNotMatch(preview, /logical-canvas|1440|previewScale|transform: scale/);
  assert.doesNotMatch(preview, /@container profile-preview \(max-width: 31rem\)[\s\S]*identity-card__person/);
  assert.match(smoke, /responsive dashboard geometry fits phone, tablet, and narrow desktop widths/);
  assert.match(smoke, /const viewports = \[[\s\S]*\[320, 568\][\s\S]*\[667, 375\][\s\S]*\[1920, 1080\]/);
  assert.match(smoke, /09-mobile-preview-414/);
  assert.match(smoke, /10-mobile-editor-414/);
  assert.match(smoke, /profile-studio-shell__mobile-tools/);
  assert.match(smoke, /const destinations = \['overview', 'links', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'progression', 'account'\]/);
});

test('reference workspace composition stays explicit', async () => {
  const [settings, shell, header, preview, draftModel, appearance, appearanceColors, cosmetics, customize, mediaWorkspace, profileShell, expression, shopPreview, renderModel] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/profile-studio/draftModel.js'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/profileAppearanceColors.js'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileMediaWorkspace.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ShopItemPreview.svelte'),
    read('src/lib/profileRenderModel.js')
  ]);
  assert.match(shell, /profile-studio-shell__publish/);
  assert.match(shell, /Publish profile/);
  assert.doesNotMatch(shell, /slot name="topbar"|profile-studio-actions/);
  assert.match(settings, /loadProfileStudioContext/);
  assert.match(settings, /loadCustomizeComponents/);
  assert.match(header, /profile-studio-header__customize-tabs/);
  assert.match(preview, /profile-studio-preview__devices/);
  assert.doesNotMatch(preview, /Unlock more with Chromadie Plus/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.match(preview, /inputSurface="container"/);
  assert.match(preview, /profile-studio-preview__viewport[\s\S]*overflow: visible/);
  assert.doesNotMatch(preview, /!important/);
  assert.match(appearance, /appearance-editor__picker-surface/);
  assert.match(appearance, /appearance-editor__palette/);
  for (const label of ['Profile text', 'Handle & metadata', 'Profile surface', 'Bio text', 'Page background']) {
    assert.match(appearanceColors, new RegExp(label));
  }
  assert.doesNotMatch(appearanceColors, /Surface tint|label: 'Border'/);
  assert.doesNotMatch(customize, /profile-customize-page__appearance-effects|Overlay color|Atmosphere strength|Restart animations/);
  assert.match(customize, /--studio-control: rgba\(255, 255, 255, \.035\)/);
  assert.match(customize, /background: var\(--studio-control\)/);
  assert.match(customize, /ProfileReferenceLayoutEditor/);
  assert.match(customize, /presentation="studio"/);
  assert.match(cosmetics, /STUDIO_EFFECT_DEFINITIONS/);
  assert.match(cosmetics, /data-presentation="reference-effect-grid"/);
  assert.match(cosmetics, /profile-cosmetics-studio-card/);
  assert.doesNotMatch(customize, /ProfileTemplatePicker|showLinks=\{false\}/);
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
  assert.match(customize, /dispatch\('studiopatch'/);
  assert.match(customize, /on:cosmeticpreview=/);
  assert.match(settings, /on:cosmeticpreview=\{updateCosmeticPreview\}/);
  assert.match(settings, /on:studiopatch=\{applyStudioPatch\}/);
  assert.doesNotMatch(settings, /configurationPreview|identityPreview|customizepreview|updateConfigurationPreview/);
  assert.match(draftModel, /equipped_cosmetics: cosmeticPreviewLoadout \|\| equippedCosmetics/);
  assert.match(renderModel, /getNameRendererLoadout\(cosmetics\)/);
  assert.match(profileShell, /avatarEffectKey=\{cosmetics\?\.avatar_effect\}/);
  assert.match(profileShell, /profileBorderKey=\{cosmetics\?\.profile_border\}/);
  assert.match(expression, /\.profile-expression-editor__compact-grid \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(expression, /profile-expression-editor__compact-spotify/);
  assert.match(expression, /JPEG, PNG, or WebP · processed and stored as WebP/);
  assert.match(mediaWorkspace, /data-media-workspace-layout="reference"/);
  assert.match(mediaWorkspace, /compact-card--background\) \{ order: 1; \}/);
  assert.match(mediaWorkspace, /compact-library\),[\s\S]*grid-column: 1 \/ -1/);
  assert.match(mediaWorkspace, /profile-background-treatment\)[\s\S]*grid-column: 1 \/ -1/);
  assert.match(mediaWorkspace, /@media \(max-width: 34rem\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
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
