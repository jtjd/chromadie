import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio exposes aggregate Customize, Links, and Premium destinations', async () => {
  const [settings, contract, registry, workspace, header, preview, customize, premium, shell, dashboardIcon, editor, expression, richMedia, identity, appearance, appearanceColors, content, widgets, cosmetics] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfilePremiumPage.svelte'),
    read('src/lib/ProfileDashboardShell.svelte'),
    read('src/lib/ProfileDashboardIcon.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/profileAppearanceColors.js'),
    read('src/lib/ProfileContentEditor.svelte'),
    read('src/lib/ProfileWidgetEditor.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte')
  ]);
  const studio = [settings, contract, registry, workspace, header, preview].join('\n');

  for (const id of ['customize', 'links', 'premium']) assert.match(studio, new RegExp(`id: '${id}'`));
  assert.match(studio, /groupLabel: 'Account'/);
  assert.match(studio, /CUSTOMIZE_SECTION_IDS/);
  assert.match(studio, /LINKS_SECTION_IDS/);
  assert.match(studio, /LEGACY_HASH_ALIASES/);
  assert.match(studio, /PROFILE_STUDIO_SECTION_LOADERS/);
  assert.match(studio, /this=\{sectionComponents\.customize\}/);
  assert.match(settings, /on:identitysaved=\{updateIdentity\}/);
  assert.match(studio, /identityPresentation: nextPresentation/);
  assert.match(shell, /data-section=\{section\.id\}/);
  assert.match(shell, /ProfileDashboardIcon name=\{section\.id\}/);
  assert.match(shell, /profile-dashboard-shell__owner/);
  assert.match(shell, /View profile/);
  assert.doesNotMatch(shell, /Theme selector/i);
  assert.match(shell, /profile-dashboard-shell__mode-toggle/);
  assert.match(dashboardIcon, /viewBox="0 0 24 24"/);
  for (const icon of ['overview', 'customize', 'links', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'progression', 'account']) {
    assert.match(dashboardIcon, new RegExp(`name === '${icon}'`));
  }
  assert.match(shell, /--nav-accent/);
  assert.match(shell, /--dashboard-sidebar-width: 14rem/);
  assert.match(shell, /min-height: 2\.45rem/);
  assert.match(shell, /--ctp-sapphire/);
  assert.match(shell, /var\(--studio-canvas\)/);
  assert.match(shell, /padding: 1\.2rem \.75rem 2\.15rem/);
  assert.doesNotMatch(shell, /profile-dashboard-shell__sidebar\s*\{[^}]*border-right/);
  assert.doesNotMatch(shell, /gradient/);
  assert.match(shell, /\.profile-dashboard-shell__main \{[^}]*min-width: 0; background: transparent/);
  assert.match(shell, /profile-dashboard-shell__content \{ --surface-panel: var\(--studio-panel/);
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
  assert.match(customize, /profile-customize-page__control-grid--other/);
  assert.match(customize, /profile-content-editor__panel:first-of-type \.profile-content-editor__fields/);
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
  for (const section of ['media', 'identity', 'appearance', 'content', 'widgets', 'effects', 'layout']) {
    assert.match(customize, new RegExp(`data-editor-section="${section}"`));
  }
  assert.match(customize, /id="customize-widgets"[\s\S]*Provider Widgets/);
  assert.match(customize, /aria-label="Visual effects"[^>]*id="customize-effects"/);
  assert.match(cosmetics, /profile-cosmetics-surface--compact/);
  assert.match(customize, /id="customize-effects"[\s\S]*id="customize-layout"/);
  assert.match(customize, /Profile media/);
  assert.match(customize, /compact=\{true\}/);
  assert.doesNotMatch(customize, /Quick jump/);
  assert.doesNotMatch(customize, /01 \/ Assets uploader/);
  assert.doesNotMatch(customize, /Click an asset to upload/);
  assert.match(header, /activeSection !== 'customize'/);
  assert.match(settings, /previewAvailable = activeSection === 'links'/);
  assert.match(expression, /profile-expression-editor__compact-grid/);
  assert.match(expression, /profile-expression-editor__compact-upload-hint/);
  for (const action of ['Background', 'Profile audio', 'Avatar', 'Custom cursor']) assert.match(expression, new RegExp(action));
  assert.doesNotMatch(expression, /More media controls/);
  assert.match(expression, /profile-expression-editor__compact-audio-player/);
  assert.match(expression, /compact-preview--avatar \{ border-color: var\(--media-line\)/);
  assert.match(expression, /compact-preview[\s\S]*border: 1px solid var\(--media-line\)/);
  assert.match(cosmetics, /\.profile-cosmetics-controls__heading \{ display: none; \}/);
  assert.match(richMedia, /export let compact = false/);
  assert.match(richMedia, /compactKinds/);
  assert.match(richMedia, /rich-media-editor__compact-card/);
  assert.match(customize, /Chromadie Plus/);
  assert.match(studio, /role="tablist" aria-label="Customize profile"/);
  assert.match(studio, /Appearance[\s\S]*Media[\s\S]*Layout/);
  assert.doesNotMatch(studio, /\{ id: 'effects', label: 'Effects'/);
  assert.match(studio, /'customize-effects': 'appearance'/);
  assert.match(customize, /export let activeTab = 'appearance'/);
  assert.match(customize, /premiumrequest/);
  assert.match(customize, /ProfileAppearanceEditor/);
  assert.match(customize, /data-editor-section="general"/);
  assert.match(customize, /--customize-section-accent/);
  assert.match(customize, /--customize-section-surface/);
  assert.match(customize, /--customize-section-surface: var\(--studio-panel/);
  assert.match(customize, /--customize-section-input: var\(--customize-control-surface\)/);
  assert.match(customize, /--customize-primary-height: 2\.25rem/);
  assert.match(expression, /profile-expression-editor__compact-grid[\s\S]*grid-template-columns: minmax\(0, \.9fr\)[\s\S]*gap: \.65rem/);
  assert.doesNotMatch(customize, /gradient/);
  assert.match(customize, /min-height: 5\.6rem/);
  assert.match(customize, /font: 600 \.94rem\/1\.35/);
  assert.doesNotMatch(customize, /premium-arrow/);
  assert.match(expression, /profile-media-icon\) \{ width: 2\.35rem; height: 2\.35rem/);
  assert.match(expression, /min-height: 5\.7rem/);
  assert.match(expression, /font-size: \.92rem/);
  assert.match(richMedia, /async function removeCursor/);
  assert.match(richMedia, /saveSelection\(\{ cursor_id: null \}\)/);
  assert.match(richMedia, /rich-media-editor__compact-remove/);
  assert.match(richMedia, /rich-media-editor__compact-preview:hover:not\(:disabled\)/);
  assert.doesNotMatch(customize, /--customize-section-surface: var\(--customize-surface-alt\)/);
  assert.match(customize, /--customize-section-input/);
  assert.match(customize, /--customize-section-input-line/);
  assert.match(customize, /--ctp-base/);
  assert.match(customize, /--ctp-mantle/);
  assert.match(customize, /--customize-accent-add: var\(--ctp-peach/);
  assert.match(customize, /--customize-accent-save: var\(--ctp-green/);
  assert.match(customize, /--customize-focus: var\(--ctp-lavender/);
  assert.match(customize, /--customize-border-subtle:/);
  assert.match(identity, /--identity-save: var\(--customize-accent-save/);
  assert.match(expression, /--media-card-accent:/);
  assert.match(appearance, /--appearance-focus: var\(--customize-focus/);
  assert.match(content, /--content-add: var\(--customize-accent-add/);
  assert.match(widgets, /--widget-add: var\(--customize-accent-add/);
  assert.match(cosmetics, /--cosmetics-save: var\(--customize-accent-save/);
  assert.match(editor, /--editor-add: var\(--customize-accent-add/);
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
  assert.match(customize, /showLinks=\{false\}/);
  assert.match(premium, /\$7\.99 lifetime/);
  assert.match(premium, /Premium buys expression\. Gameplay earns prestige\./);
  assert.match(shell, /profile-dashboard-shell__brand/);
  assert.match(settings, /ownerUsername=\{accountUsername\}/);
  assert.match(settings, /ownerAvatarSrc=\{sidebarAvatarSrc\}/);
  assert.match(studio, /id: 'overview', label: 'Overview', groupKey: 'primary', groupLabel: 'Customize'/);
  assert.match(shell, /class:premium=\{section\.id === 'premium'\}/);
  assert.match(shell, /max-width: 90rem/);
  assert.match(editor, /export let showLayout = true/);
  assert.match(editor, /export let showLinks = true/);
  assert.match(editor, /\{#if showLayout\}/);
  assert.match(editor, /\{#if showLinks\}/);
  for (const anchor of ['profile-media-avatar', 'profile-media-background', 'profile-media-audio', 'profile-media-music']) {
    assert.match(expression, new RegExp(`id="${anchor}"`));
  }
  assert.match(expression, /id=\{compact \? 'profile-media-rich' : undefined\}/);
  assert.match(expression, /id=\{!compact \? 'profile-media-rich' : undefined\}/);
});
