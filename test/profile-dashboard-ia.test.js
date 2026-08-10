import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio exposes aggregate Customize, Links, and Premium destinations', async () => {
  const [settings, customize, premium, shell, editor, expression, richMedia, identity, appearance] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfilePremiumPage.svelte'),
    read('src/lib/ProfileDashboardShell.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte')
  ]);

  for (const id of ['customize', 'links', 'premium']) assert.match(settings, new RegExp(`id: '${id}'`));
  assert.match(settings, /groupLabel: 'Account'/);
  assert.match(settings, /CUSTOMIZE_SECTION_IDS/);
  assert.match(settings, /LINKS_SECTION_IDS/);
  assert.match(settings, /LEGACY_HASH_ALIASES/);
  assert.match(settings, /import\('\.\/ProfileCustomizePage\.svelte'\)/);
  assert.match(settings, /this=\{sectionComponents\.customize\}/);
  assert.match(settings, /on:identitysaved=\{updateIdentity\}/);
  assert.match(settings, /identityPresentation: nextPresentation/);
  assert.match(shell, /data-section=\{section\.id\}/);
  assert.match(shell, /--nav-accent/);
  assert.match(shell, /--ctp-sapphire/);
  assert.match(shell, /background: var\(--ctp-crust/);
  assert.match(identity, /baselineBio/);
  assert.match(identity, /incomingKey/);
  assert.match(identity, /identity-editor__grid--meta/);
  assert.match(identity, /identity-editor__grid--behavior/);
  assert.match(customize, /identity-editor__fields\) \{ display: contents; \}/);
  assert.match(customize, /identity-editor__field\[for="profile-bio"\]\) \{ grid-column: 1 \/ span 2; grid-row: 1 \/ span 2;/);
  assert.match(customize, /identity-editor__options\) \{ display: flex; grid-column: 1 \/ span 2; grid-row: 3;/);
  assert.match(customize, /identity-editor__grid--meta \.identity-editor__field:first-child/);
  assert.match(customize, /identity-editor__grid--behavior \.identity-editor__field:first-child/);
  assert.match(customize, /profile-customize-page__control-grid--other/);
  assert.match(customize, /profile-content-editor__panel:first-of-type \.profile-content-editor__fields/);
  for (const label of ['Profile Text', 'Handle & Metadata', 'Username', 'Bio Text', 'Page Background', 'Profile Surface', 'Accent']) {
    assert.match(appearance, new RegExp(label.replace(/[&]/g, '\\$&')));
  }
  assert.match(appearance, /<span>6 colors<\/span>/);
  assert.match(appearance, /appearance-surface-title[\s\S]*Profile Surface[\s\S]*Opacity[\s\S]*Blur/);
  assert.doesNotMatch(appearance, /\['surface', 'Profile Surface'\]/);
  assert.match(settings, /import\('\.\/ProfilePremiumPage\.svelte'\)/);
  for (const section of ['media', 'identity', 'appearance', 'content', 'widgets', 'effects', 'layout']) {
    assert.match(customize, new RegExp(`data-editor-section="${section}"`));
  }
  assert.match(customize, /id="customize-widgets"[\s\S]*Provider Widgets/);
  assert.match(customize, /id="customize-effects"[\s\S]*Effects Customization/);
  assert.match(customize, /profile-cosmetics-controls\) \{ display: grid; grid-template-columns: repeat\(4/);
  assert.match(customize, /id="customize-effects"[\s\S]*id="customize-layout"/);
  assert.match(customize, /Profile media/);
  assert.match(customize, /compact=\{true\}/);
  assert.doesNotMatch(customize, /Quick jump/);
  assert.doesNotMatch(customize, /01 \/ Assets uploader/);
  assert.doesNotMatch(customize, /Click an asset to upload/);
  assert.match(settings, /activeSection !== 'customize'/);
  assert.match(settings, /previewAvailable = activeSection === 'links'/);
  assert.match(expression, /profile-expression-editor__compact-grid/);
  assert.match(expression, /profile-expression-editor__compact-upload-hint/);
  for (const action of ['Background', 'Audio', 'Profile avatar', 'Custom cursor']) assert.match(expression, new RegExp(action));
  assert.doesNotMatch(expression, /More media controls/);
  assert.match(expression, /profile-expression-editor__compact-audio-player/);
  assert.match(expression, /compact-preview--avatar \{ border-color: transparent/);
  assert.match(richMedia, /export let compact = false/);
  assert.match(richMedia, /compactKinds/);
  assert.match(richMedia, /rich-media-editor__compact-card/);
  assert.match(customize, /Chromadie Plus/);
  assert.doesNotMatch(customize, /role="tablist"/);
  assert.doesNotMatch(customize, /activeCategory/);
  assert.match(customize, /premiumrequest/);
  assert.match(customize, /ProfileAppearanceEditor/);
  assert.match(customize, /data-editor-section="general"/);
  assert.match(customize, /--customize-section-accent/);
  assert.match(customize, /--customize-section-surface/);
  assert.match(customize, /--customize-section-input/);
  assert.match(customize, /--customize-section-input-line/);
  assert.match(customize, /--ctp-base/);
  assert.match(customize, /--ctp-mantle/);
  assert.match(customize, /--customize-accent-add: var\(--ctp-peach/);
  assert.match(customize, /--customize-accent-save: var\(--ctp-green/);
  assert.match(customize, /--customize-focus: var\(--ctp-lavender/);
  assert.match(customize, /profile-customize-page__surface-note/);
  assert.match(customize, /projects need a title and HTTPS URL/);
  assert.match(customize, /profile-customize-page :global\(\.profile-cosmetics-apply\) \{ min-height: var\(--customize-primary-height/);
  assert.match(customize, /profile-identity/);
  assert.match(customize, /profile-media/);
  assert.match(customize, /profile-collection/);
  assert.match(customize, /showLinks=\{false\}/);
  assert.match(premium, /\$7\.99 lifetime/);
  assert.match(premium, /Premium buys expression\. Gameplay earns prestige\./);
  assert.match(shell, /profile-dashboard-shell__brand/);
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
