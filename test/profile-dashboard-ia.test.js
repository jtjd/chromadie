import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio exposes aggregate Customize, Links, and Premium destinations', async () => {
  const [settings, customize, premium, shell, editor, expression, richMedia] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfilePremiumPage.svelte'),
    read('src/lib/ProfileDashboardShell.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte')
  ]);

  for (const id of ['customize', 'links', 'premium']) assert.match(settings, new RegExp(`id: '${id}'`));
  assert.match(settings, /groupLabel: 'Account'/);
  assert.match(settings, /CUSTOMIZE_SECTION_IDS/);
  assert.match(settings, /LINKS_SECTION_IDS/);
  assert.match(settings, /LEGACY_HASH_ALIASES/);
  assert.match(settings, /import\('\.\/ProfileCustomizePage\.svelte'\)/);
  assert.match(settings, /this=\{sectionComponents\.customize\}/);
  assert.match(settings, /import\('\.\/ProfilePremiumPage\.svelte'\)/);
  for (const section of ['media', 'identity', 'appearance', 'content', 'widgets', 'effects', 'layout']) {
    assert.match(customize, new RegExp(`data-editor-section="${section}"`));
  }
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
  assert.match(richMedia, /export let compact = false/);
  assert.match(richMedia, /compactKinds/);
  assert.match(richMedia, /rich-media-editor__compact-card/);
  assert.match(customize, /Chromadie Plus/);
  assert.doesNotMatch(customize, /role="tablist"/);
  assert.doesNotMatch(customize, /activeCategory/);
  assert.match(customize, /premiumrequest/);
  assert.match(customize, /ProfileAppearanceEditor/);
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
