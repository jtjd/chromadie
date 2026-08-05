import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('profile settings uses a compact grouped dashboard', async () => {
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');

  assert.match(settings, /profile-settings-page__toolbar/);
  assert.match(settings, /ProfileAppearanceEditor/);
  assert.match(settings, /Live preview/);
  assert.doesNotMatch(settings, /preview-column/);
  assert.match(settings, /ProfileDashboardShell/);
  assert.match(settings, /setActiveSection\(/);
  assert.doesNotMatch(settings, /Build the profile you keep\./);
  assert.doesNotMatch(settings, /profile-settings-page__profile-link/);
  assert.doesNotMatch(settings, /Make it unmistakably yours/);
  assert.match(settings, /Identity/);
  assert.match(settings, /Overview/);
  assert.match(settings, /Media/);
  assert.match(settings, /Collection/);
  assert.match(settings, /Layout & links/);
  assert.match(settings, /Privacy & social/);
  assert.match(settings, /Progression/);

  assert.match(settings, /import\('\.\/IdentityEditor\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileExpressionEditor\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileCosmeticsEditor\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileStudioOverview\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileProgression\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileEditor\.svelte'\)/);
  assert.match(settings, /import\('\.\/ProfileSocial\.svelte'\)/);
  assert.match(settings, /<svelte:component/);
  assert.match(settings, /ProfileAccountSettings/);
  assert.match(settings, /createInitialSettingsContext/);
  assert.match(settings, /loading = !previousContext/);
  assert.match(siteStyles, /\.app-main--profile-settings/);
  assert.match(siteStyles, /@media \(prefers-reduced-motion: reduce\)/);
});
