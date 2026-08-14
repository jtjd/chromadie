import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('profile settings uses a compact grouped dashboard', async () => {
  const [settings, contract, registry, header, workspace, preview] = await Promise.all([
    readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/profile-studio/dashboardContract.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/profile-studio/sectionRegistry.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileStudioHeader.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileStudioWorkspace.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileStudioPreview.svelte', import.meta.url), 'utf8')
  ]);
  const studio = [settings, contract, registry, header, workspace, preview].join('\n');
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');

  assert.match(header, /profile-studio-header__toolbar/);
  assert.match(studio, /ProfileCustomizePage/);
  assert.match(studio, /ProfilePremiumPage/);
  assert.match(studio, /id: 'links'/);
  assert.match(preview, /Live preview/);
  assert.match(settings, /previewOpen/);
  assert.match(settings, /togglePreview/);
  assert.match(settings, /showPreview=\{showDashboardPreview\}/);
  assert.match(settings, /customizePreviewAvailable && \(!isMobileViewport \|\| previewOpen\)/);
  assert.match(header, /role="tablist" aria-label="Customize profile"/);
  assert.doesNotMatch(settings, /preview-column/);
  assert.match(settings, /ProfileStudioShell/);
  assert.match(settings, /setActiveSection\(/);
  assert.doesNotMatch(settings, /Build the profile you keep\./);
  assert.doesNotMatch(settings, /profile-settings-page__profile-link/);
  assert.match(settings, /Customize/);
  assert.match(studio, /Overview/);
  assert.match(studio, /Privacy & social/);
  assert.match(studio, /Badges & progression/);

  for (const component of ['IdentityEditor', 'ProfileExpressionEditor', 'ProfileCosmeticsEditor', 'ProfileStudioOverview', 'ProfileProgression', 'ProfileEditor', 'ProfileSocial']) {
    assert.match(registry, new RegExp(component + '\\.svelte'));
  }
  assert.match(workspace, /<svelte:component/);
  assert.match(registry, /id: 'account',[\s\S]*ProfileAccountSettings\.svelte/);
  assert.match(settings, /createInitialSettingsContext/);
  assert.match(settings, /loading = !previousContext/);
  assert.match(siteStyles, /\.app-main--profile-settings/);
  assert.match(siteStyles, /--site-font: 'Inter'/);
  assert.match(siteStyles, /--font-display-stack: 'Clash Display'/);
  assert.match(siteStyles, /--font-body-stack: 'Inter'/);
  assert.match(siteStyles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Profile Studio scopes the approved dark reference palette without changing its layout contract', async () => {
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');
  assert.match(siteStyles, /\.app-main--profile-settings\s*\{/);
  assert.match(siteStyles, /--ctp-crust: \#050506;/);
  assert.match(siteStyles, /--ctp-mantle: \#0c0c0f;/);
  assert.match(siteStyles, /--ctp-text: \#f8f8f8;/);
  assert.match(siteStyles, /--ctp-mauve: \#00ffb3;/);
  assert.match(siteStyles, /--ctp-red: \#ff5578;/);
  assert.match(siteStyles, /--ctp-peach: \#f5c26f;/);
  assert.match(siteStyles, /--site-accent: var\(--ctp-mauve\)/);
  assert.match(siteStyles, /--site-raised: var\(--ctp-surface0\)/);
  assert.match(siteStyles, /--color-danger: var\(--ctp-red\)/);
  assert.match(siteStyles, /--surface-inset: var\(--ctp-mantle\)/);
  assert.match(siteStyles, /input\[type='checkbox'\], input\[type='radio'\], input\[type='range'\]/);
  assert.match(siteStyles, /background-color: var\(--ctp-mantle\)/);
});
