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
  assert.match(settings, /Identity/);
  assert.match(settings, /Expression/);
  assert.match(settings, /Appearance/);
  assert.match(settings, /Layout & links/);
  assert.match(settings, /Privacy & social/);
  assert.match(settings, /Account/);

  assert.match(settings, /<IdentityEditor/);
  assert.match(settings, /<ProfileExpressionEditor/);
  assert.match(settings, /<ProfileCosmeticsEditor/);
  assert.match(settings, /<ProfileEditor/);
  assert.match(settings, /<ProfileSocial/);
  assert.match(settings, /profile-settings-page__editor-footer/);
  assert.match(siteStyles, /\.profile-settings-page__workspace/);
  assert.match(siteStyles, /@media \(prefers-reduced-motion: reduce\)/);
});
