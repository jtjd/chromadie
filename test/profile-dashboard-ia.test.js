import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio exposes aggregate destinations through the reference shell', async () => {
  const [settings, contract, registry, workspace, header, preview, customize, premium, shell, editor, expression, richMedia, identity, appearance, appearanceColors, cosmetics, referenceLayout, mediaWorkspace] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfilePremiumPage.svelte'),
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/lib/ProfileLinksEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/profileAppearanceColors.js'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileReferenceLayoutEditor.svelte'),
    read('src/lib/ProfileMediaWorkspace.svelte')
  ]);
  const studio = [settings, contract, registry, workspace, header, preview].join('\n');

  for (const id of ['customize', 'premium']) assert.match(studio, new RegExp(`id: '${id}'`));
  assert.match(contract, /\{ id: 'links', label: 'Links'/);
  assert.match(studio, /groupLabel: 'Account'/);
  assert.match(studio, /CUSTOMIZE_SECTION_IDS/);
  assert.match(studio, /LINKS_SECTION_IDS/);
  assert.match(studio, /LEGACY_HASH_ALIASES/);
  assert.match(studio, /PROFILE_STUDIO_SECTION_LOADERS/);
  assert.match(studio, /this=\{sectionComponents\.customize\}/);
  assert.match(settings, /on:identitysaved=\{updateIdentity\}/);
  assert.match(studio, /identityPresentation: nextPresentation/);
  assert.match(shell, /data-section=\{section\.id\}/);
  assert.doesNotMatch(shell, /profile-studio-shell__primary-nav/);
  assert.match(shell, /profile-studio-shell__menu-trigger/);
  assert.match(shell, /profile-studio-shell__more-menu/);
  assert.match(shell, /View profile/);
  assert.doesNotMatch(shell, /sidebar|ProfileDashboardIcon|colorMode|gradient/i);
  assert.match(shell, /grid-template-columns: minmax\(540px, 640px\) minmax\(400px, 1fr\)/);
  assert.match(shell, /width: min\(calc\(100% - 48px\), 1440px\)/);
  assert.match(shell, /slot name="preview"/);
  assert.match(identity, /baselineBio/);
  assert.match(identity, /incomingKey/);
  assert.match(identity, /identity-editor__grid--meta/);
  assert.match(identity, /identity-editor__grid--behavior/);
  assert.match(identity, /identity-editor--studio/);
  assert.match(identity, /identity-editor__fields\) \{ display: contents; \}/);
  assert.match(identity, /identity-editor__field--username/);
  assert.match(identity, /identity-editor__field\[for="profile-bio"\]\) \{ grid-column: 1 \/ span 2; grid-row: 2 \/ span 2;/);
  assert.match(identity, /identity-editor__options\) \{ display: flex; grid-column: 1 \/ span 2; grid-row: 4;/);
  assert.match(identity, /identity-editor__grid--meta \.identity-editor__field:first-child/);
  assert.match(identity, /identity-editor__grid--behavior \.identity-editor__field:first-child/);
  assert.doesNotMatch(customize, /id="customize-other"|id="customize-content"|id="customize-widgets"|contentComponent|widgetComponent/);
  for (const label of ['Profile text', 'Handle & metadata', 'Username', 'Bio text', 'Page background', 'Profile surface', 'Accent']) {
    assert.match(appearanceColors, new RegExp(label.replace(/[&]/g, '\\$&')));
  }
  assert.doesNotMatch(appearanceColors, /Surface tint|label: 'Border'/);
  assert.doesNotMatch(appearance, /Celestial Border|Plain surface|Glass surface/);
  assert.doesNotMatch(editor, /Content width|Profile navigation|Mobile layout/);
  assert.doesNotMatch(cosmetics, /Atmosphere strength|Restart animations/);
  assert.doesNotMatch(identity, /Unsaved identity draft/);
  assert.doesNotMatch(appearance, /6 colors|Card depth|Colors update the profile preview/);
  assert.match(appearance, /appearance-surface-title[\s\S]*Profile surface[\s\S]*Opacity[\s\S]*Blur/);
  assert.match(appearance, /Profile colors/);
  assert.doesNotMatch(appearance, /\['surface', 'Profile Surface'\]/);
  assert.match(studio, /ProfilePremiumPage\.svelte/);
  for (const section of ['media', 'identity', 'appearance', 'effects', 'links', 'layout']) {
    assert.match(customize, new RegExp(`id="customize-${section === 'identity' || section === 'effects' ? section : section}"`));
  }
  assert.doesNotMatch(customize, /data-editor-section=|hidden=|class:is-tab-hidden/);
  assert.match(cosmetics, /profile-cosmetics-surface--compact/);
  assert.match(customize, /id="customize-effects"[\s\S]*id="customize-layout"/);
  assert.match(customize, /Profile media/);
  assert.match(customize, /compact=\{true\}/);
  assert.doesNotMatch(customize, /Quick jump/);
  assert.doesNotMatch(customize, /01 \/ Assets uploader/);
  assert.doesNotMatch(customize, /Click an asset to upload/);
  assert.match(header, /activeSection !== 'customize'/);
  assert.doesNotMatch(settings, /previewAvailable = false/);
  assert.match(expression, /profile-expression-editor__compact-grid/);
  assert.match(expression, /JPEG, PNG, or WebP · processed and stored as WebP/);
  for (const action of ['Background', 'Profile audio', 'Avatar', 'Custom cursor']) assert.match(expression, new RegExp(action));
  assert.doesNotMatch(expression, /More media controls/);
  assert.match(expression, /profile-expression-editor__compact-audio-player/);
  assert.match(expression, /compact-preview--avatar \{ border-color: var\(--media-line\)/);
  assert.match(expression, /compact-preview[\s\S]*border: 1px solid var\(--media-line\)/);
  assert.match(cosmetics, /\.profile-cosmetics-controls__heading \{ display: none; \}/);
  assert.match(richMedia, /export let compact = false/);
  assert.match(richMedia, /compactKinds/);
  assert.match(richMedia, /rich-media-editor__compact-card/);
  assert.match(studio, /role="tablist" aria-label="Customize profile"/);
  assert.match(studio, /Appearance[\s\S]*Media[\s\S]*Links[\s\S]*Layout/);
  assert.doesNotMatch(studio, /\{ id: 'effects', label: 'Effects'/);
  assert.match(studio, /'customize-effects': 'appearance'/);
  assert.match(customize, /export let activeTab = 'appearance'/);
  assert.match(customize, /ProfileAppearanceEditor/);
  assert.match(customize, /id="customize-identity"/);
  assert.match(customize, /--studio-panel: rgba\(12, 12, 15, \.78\)/);
  assert.match(customize, /--studio-control: rgba\(255, 255, 255, \.035\)/);
  assert.match(expression, /profile-expression-editor__compact-grid[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)[\s\S]*gap: 10px/);
  assert.doesNotMatch(customize, /gradient/);
  assert.doesNotMatch(customize, /premium-banner|premiumrequest|Chromadie Plus/);
  assert.match(expression, /profile-media-icon\) \{ width: 2\.35rem; height: 2\.35rem/);
  assert.match(mediaWorkspace, /rich-media-editor__compact-card[\s\S]*grid-template-rows: 115px auto/);
  assert.match(mediaWorkspace, /rich-media-editor__compact-copy strong[\s\S]*font: 600 \.73rem\/1\.2 /);
  assert.doesNotMatch(expression, /compact-grid :global\(\.rich-media-editor__compact-card\)/);
  assert.match(richMedia, /async function removeCursor/);
  assert.match(richMedia, /await removeAsset\(activeCursor\)/);
  assert.match(richMedia, /rich-media-editor__compact-remove/);
  assert.match(richMedia, /rich-media-editor__compact-preview:hover:not\(:disabled\)/);
  assert.doesNotMatch(customize, /--customize-section-surface: var\(--customize-surface-alt\)/);
  assert.match(customize, /--studio-border:/);
  assert.match(customize, /--studio-accent: #00ffb3/);
  assert.doesNotMatch(customize, /profile-customize-page__surface-note/);
  assert.doesNotMatch(customize, /Shape the profile canvas|Set your bio and choose|Preview your palette here|Preview owned expression layers|Choose the profile structure|Tell more of your story|Use official HTTPS provider URLs/);
  assert.doesNotMatch(expression, /Unlock richer expression/);
  assert.doesNotMatch(richMedia, /Unlock richer expression/);
  assert.match(expression, /Chromadie Plus/);
  assert.match(richMedia, /Chromadie Plus/);
  assert.match(cosmetics, /\.profile-cosmetics-apply \{ grid-column: 1 \/ -1; \}/);
  assert.match(customize, /profile-identity/);
  assert.match(customize, /profile-media/);
  assert.match(customize, /profile-collection/);
  assert.match(customize, /ProfileReferenceLayoutEditor/);
  assert.doesNotMatch(customize, /showLinks=\{false\}|ProfileTemplatePicker/);
  assert.match(customize, /linksComponent|presentation="customize"/);
  assert.match(referenceLayout, /data-layout-editor="reference-first"/);
  assert.match(referenceLayout, /PROFILE_LAYOUT_DEFINITIONS/);
  assert.match(referenceLayout, /PROFILE_LAYOUT_KEYS/);
  for (const layout of ['compact', 'full-bleed', 'framed']) {
    assert.match(referenceLayout, new RegExp(`data-layout=\\{key\\}|['"]${layout}['"]`));
  }
  assert.match(premium, /\$7\.99 lifetime/);
  assert.match(premium, /Premium buys expression\. Gameplay earns prestige\./);
  assert.match(shell, /profile-studio-shell__brand/);
  assert.match(studio, /id: 'overview', label: 'Overview', groupKey: 'primary', groupLabel: 'Customize'/);
  assert.match(contract, /PROFILE_STUDIO_PRIMARY_SECTION_IDS/);
  assert.match(shell, /getProfileStudioNavigation/);
  assert.match(shell, /profile-studio-shell__more-menu/);
  assert.match(editor, /export function validateDraft/);
  assert.match(editor, /PROFILE_LINK_DEFINITIONS/);
  assert.doesNotMatch(editor, /showLayout|showLinks|ProfileTemplatePicker/);
  for (const anchor of ['profile-media-avatar', 'profile-media-background', 'profile-media-audio', 'profile-media-music']) {
    assert.match(expression, new RegExp(`id="${anchor}"`));
  }
  assert.match(expression, /id=\{compact \? 'profile-media-rich' : undefined\}/);
  assert.match(expression, /id=\{!compact \? 'profile-media-rich' : undefined\}/);
});
