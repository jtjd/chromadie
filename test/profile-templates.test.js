import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createDefaultProfileConfig, normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { createProfileLayoutPatch } from '../src/lib/profile-layout/profileLayoutPatch.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the active layout patch is finite, paired, and bounded', () => {
  const patch = createProfileLayoutPatch('full-bleed');
  assert.equal(patch.templateKey, 'full-bleed');
  assert.equal(patch.layoutVariant, 'full-bleed');
  assert.deepEqual(patch.modules.map(module => module.id), ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore']);
  assert.equal('appearance' in patch, false);
  assert.equal(createProfileLayoutPatch('not-real').layoutVariant, 'compact');
  assert.equal(createProfileLayoutPatch('immersive').layoutVariant, 'compact');
});

test('profile config carries the paired layout marker without changing safe defaults', () => {
  const defaults = createDefaultProfileConfig('#123456');
  assert.equal(defaults.templateKey, 'compact');
  assert.equal(normalizeProfileConfig({ ...defaults, ...createProfileLayoutPatch('full-bleed') }).templateKey, 'full-bleed');
  assert.equal(normalizeProfileConfig({ ...defaults, templateKey: 'unsafe-template' }).templateKey, 'compact');
  assert.equal(normalizeProfileConfig({ ...defaults, templateKey: 'custom', layoutVariant: 'modern' }).templateKey, 'compact');
});

test('the redesigned Customize surface has no template picker or obsolete editor layers', async () => {
  const [customize, registry, links, workspace, settings, cosmetics, preview, shell, migration] = await Promise.all([
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileLinksEditor.svelte'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('supabase/migrations/20260816090000_canonical_profile_layout_cleanup.sql')
  ]);

  assert.doesNotMatch(customize, /ProfileTemplatePicker|showLayout|showLinks/);
  assert.match(registry, /ProfileLinksEditor\.svelte/);
  assert.doesNotMatch(registry, /ProfileEditor\.svelte|ProfileContentEditor\.svelte|ProfileWidgetEditor\.svelte/);
  assert.match(links, /export function validateDraft/);
  assert.match(links, /PROFILE_LINK_DEFINITIONS/);
  assert.doesNotMatch(workspace, /profile-content|profile-widgets|contentEditor|widgetEditor/);
  assert.match(workspace, /identityDraft=\{studioIdentityDraft\}/);
  assert.match(customize, /stagedLoadout=\{cosmeticPreviewLoadout\}/);
  assert.match(settings, /cosmeticPreviewLoadout = null/);
  assert.match(settings, /function updateCosmeticPreview/);
  assert.match(cosmetics, /previewSourceKey/);
  assert.match(cosmetics, /stagedLoadout === null/);
  assert.match(preview, /\{#key layoutVariant\}/);
  assert.match(shell, /\{#key profilePresentationLayoutVariant\}/);
  assert.match(migration, /WHEN lower\(btrim\(coalesce\(equipped_cosmetics->>'profile_layout', ''\)\)\) IN \('immersive', 'profile_layout_immersive'\)/);
  assert.match(migration, /v_value IN \('compact', 'full-bleed'\)/);
  assert.match(migration, /normalize_profile_configuration_legacy_runtime/);
});
