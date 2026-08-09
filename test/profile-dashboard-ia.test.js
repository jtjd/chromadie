import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio exposes aggregate Customize, Links, and Premium destinations', async () => {
  const [settings, customize, premium, shell, editor] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfilePremiumPage.svelte'),
    read('src/lib/ProfileDashboardShell.svelte'),
    read('src/lib/ProfileEditor.svelte')
  ]);

  for (const id of ['customize', 'links', 'premium']) assert.match(settings, new RegExp(`id: '${id}'`));
  assert.match(settings, /groupLabel: 'Account'/);
  assert.match(settings, /CUSTOMIZE_SECTION_IDS/);
  assert.match(settings, /LINKS_SECTION_IDS/);
  assert.match(settings, /LEGACY_HASH_ALIASES/);
  assert.match(settings, /import\('\.\/ProfileCustomizePage\.svelte'\)/);
  assert.match(settings, /this=\{sectionComponents\.customize\}/);
  assert.match(settings, /import\('\.\/ProfilePremiumPage\.svelte'\)/);
  assert.match(customize, /Profile assets/);
  for (const category of ['Assets', 'Identity', 'Appearance', 'Effects', 'Content', 'Widgets', 'Layout']) {
    assert.match(customize, new RegExp(`label: '${category}'`));
  }
  for (const asset of ['Avatar', 'Background', 'Banner', 'Audio', 'Cursors']) {
    assert.match(customize, new RegExp(`label: '${asset}'`));
  }
  assert.match(customize, /role="tablist"/);
  assert.match(customize, /role="tabpanel"/);
  assert.match(customize, /hidden=\{activeCategory !== 'appearance'\}/);
  assert.match(customize, /hasChromadiePlus/);
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
});
