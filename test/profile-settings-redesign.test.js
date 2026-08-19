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
  assert.match(preview, /Live public-profile preview/);
  assert.match(settings, /previewOpen/);
  assert.match(settings, /togglePreview/);
  assert.match(settings, /showPreview=\{showDashboardPreview\}/);
  assert.match(settings, /customizePreviewAvailable && \(!isMobileViewport \|\| previewOpen\)/);
  assert.match(header, /role="tablist" aria-label="Customize profile"/);
  assert.doesNotMatch(settings, /preview-column/);
  assert.match(settings, /ProfileStudioShell/);
  assert.match(settings, /showBrand=\{true\}/);
  assert.match(settings, /setActiveSection\(/);
  assert.doesNotMatch(settings, /Build the profile you keep\./);
  assert.doesNotMatch(settings, /profile-settings-page__profile-link/);
  assert.match(settings, /Customize/);
  assert.match(studio, /Overview/);
  assert.match(studio, /Privacy & social/);
  assert.match(studio, /Badges & progression/);

  for (const component of ['IdentityEditor', 'ProfileExpressionEditor', 'ProfileCosmeticsEditor', 'ProfileStudioOverview', 'ProfileProgression', 'ProfileLinksEditor', 'ProfileSocial']) {
    assert.match(registry, new RegExp(component + '\\.svelte'));
  }
  assert.match(workspace, /<svelte:component/);
  assert.match(registry, /id: 'account',[\s\S]*ProfileAccountSettings\.svelte/);
  assert.match(settings, /createInitialSettingsContext/);
  assert.match(settings, /loadProfileStudioContext/);
  assert.match(settings, /fullContextLoaded/);
  assert.match(siteStyles, /\.app-main--profile-settings/);
  assert.match(siteStyles, /--site-font: 'Inter'/);
  assert.match(siteStyles, /--font-display-stack: 'Manrope Variable'/);
  assert.match(siteStyles, /--font-body-stack: 'Inter'/);
  assert.match(siteStyles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Customize owns opaque dashboard chrome over editable profile backgrounds', async () => {
  const [app, shell, footer] = await Promise.all([
    readFile(new URL('../src/App.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileStudioShell.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/SiteFooter.svelte', import.meta.url), 'utf8')
  ]);

  assert.match(app, /!profileModeVisible && !homeModeVisible && !profileSettingsModeVisible/);
  assert.match(app, /!homeModeVisible && !profileSettingsModeVisible/);
  assert.match(shell, /import SiteFooter from ['"]\.\/SiteFooter\.svelte['"]/);
  assert.match(shell, /variant="studio"/);
  assert.match(shell, /site-footer--studio/);
  assert.match(shell, /background: var\(--bg, #0e0e10\)/);
  assert.match(shell, /src="\/brand\/am-mark-v1\.png"/);
  assert.match(footer, /export let variant = 'site'/);
  assert.match(footer, /class:site-footer--studio=\{variant === 'studio'\}/);
  assert.match(footer, /site-footer__brand-logo/);
});

test('Profile Studio scopes the homepage companion palette without legacy theme aliases', async () => {
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');
  assert.match(siteStyles, /\.app-main--profile-settings\s*\{/);
  assert.match(siteStyles, /--customize-surface: var\(--surface-2\)/);
  assert.match(siteStyles, /--customize-focus: var\(--white\)/);
  assert.match(siteStyles, /--site-accent: var\(--white\)/);
  assert.match(siteStyles, /--site-raised: var\(--surface-2\)/);
  assert.match(siteStyles, /--color-danger: #ff5578/);
  assert.match(siteStyles, /--surface-inset: var\(--surface\)/);
  assert.doesNotMatch(siteStyles, /--ctp-/);
  assert.match(siteStyles, /input\[type='checkbox'\], input\[type='radio'\], input\[type='range'\]/);
  assert.match(siteStyles, /background-color: var\(--customize-surface-deep\)/);
});
