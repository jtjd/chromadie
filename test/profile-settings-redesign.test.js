import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('profile settings uses a focused section workspace', async () => {
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');

  assert.match(settings, /profile-settings-page__workspace/);
  assert.match(settings, /profile-settings-page__rail/);
  assert.match(settings, /profile-settings-page__editor/);
  assert.match(settings, /profile-settings-page__preview-column/);
  assert.match(settings, /setActiveSection\(/);
  assert.doesNotMatch(settings, /profile-settings-page__topbar/);
  assert.doesNotMatch(settings, /profile-settings-page__editor-heading/);
  assert.match(settings, /Build the profile you keep\./);
  assert.doesNotMatch(settings, /profile-settings-page__profile-link/);
  assert.doesNotMatch(settings, /Make it unmistakably yours/);
  assert.match(settings, /Identity/);
  assert.match(settings, /Overview/);
  assert.match(settings, /Expression/);
  assert.match(settings, /Collection/);
  assert.match(settings, /Layout & links/);
  assert.match(settings, /Privacy & social/);
  assert.match(settings, /Progression/);

  assert.match(settings, /<IdentityEditor/);
  assert.match(settings, /<ProfileExpressionEditor/);
  assert.match(settings, /<ProfileCosmeticsEditor/);
  assert.match(settings, /<ProfileStudioOverview/);
  assert.match(settings, /<ProfileProgression/);
  assert.match(settings, /<ProfileEditor/);
  assert.match(settings, /<ProfileSocial/);
  assert.match(settings, /profile-settings-page__editor-footer/);
  assert.match(settings, /createInitialSettingsContext/);
  assert.match(settings, /loading = !previousContext/);
  assert.match(siteStyles, /\.profile-settings-page__workspace/);
  assert.match(siteStyles, /@media \(prefers-reduced-motion: reduce\)/);
});
