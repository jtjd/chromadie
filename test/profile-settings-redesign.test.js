import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('profile settings uses a compact grouped dashboard', async () => {
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');

  assert.match(settings, /profile-settings-page__toolbar/);
  assert.match(settings, /ProfileCustomizePage/);
  assert.match(settings, /import\('\.\/ProfilePremiumPage\.svelte'\)/);
  assert.match(settings, /id: 'links'/);
  assert.match(settings, /Live preview/);
  assert.match(settings, /previewOpen/);
  assert.match(settings, /togglePreview/);
  assert.match(settings, /showPreview=\{previewOpen && previewAvailable\}/);
  assert.doesNotMatch(settings, /preview-column/);
  assert.match(settings, /ProfileDashboardShell/);
  assert.match(settings, /setActiveSection\(/);
  assert.doesNotMatch(settings, /Build the profile you keep\./);
  assert.doesNotMatch(settings, /profile-settings-page__profile-link/);
  assert.match(settings, /Customize/);
  assert.match(settings, /Overview/);
  assert.match(settings, /Privacy & social/);
  assert.match(settings, /Badges & progression/);

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

test('Profile Studio scopes the Catppuccin Mocha palette without changing its layout contract', async () => {
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');
  const palette = {
    crust: '#11111b',
    mantle: '#181825',
    base: '#1e1e2e',
    surface0: '#313244',
    surface1: '#45475a',
    surface2: '#585b70',
    overlay0: '#6c7086',
    overlay1: '#7f849c',
    overlay2: '#9399b2',
    subtext0: '#a6adc8',
    subtext1: '#bac2de',
    text: '#cdd6f4',
    rosewater: '#f5e0e6',
    flamingo: '#f2cdcd',
    pink: '#f5c2e7',
    mauve: '#cba6f7',
    red: '#f38ba8',
    maroon: '#eba0ac',
    peach: '#fab387',
    yellow: '#f9e2af',
    green: '#a6e3a1',
    teal: '#94e2d5',
    sky: '#89dceb',
    sapphire: '#74c7ec',
    blue: '#89b4fa',
    lavender: '#b4befe'
  };

  assert.match(siteStyles, /\.app-main--profile-settings\s*\{/);
  for (const [name, value] of Object.entries(palette)) {
    assert.match(siteStyles, new RegExp(`--ctp-${name}: ${value.replace('#', '\\#')};`));
  }
  assert.match(siteStyles, /--site-accent: var\(--ctp-mauve\)/);
  assert.match(siteStyles, /--site-raised: var\(--ctp-surface0\)/);
  assert.match(siteStyles, /--color-danger: var\(--ctp-red\)/);
  assert.match(siteStyles, /--surface-inset: var\(--ctp-mantle\)/);
  assert.match(siteStyles, /input\[type='checkbox'\], input\[type='radio'\], input\[type='range'\]/);
  assert.match(siteStyles, /background-color: var\(--ctp-mantle\)/);
});
