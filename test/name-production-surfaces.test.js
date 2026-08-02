import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, ROOT), 'utf8');
}

async function findSvelteFiles(directory) {
  const entries = await readdir(new URL(directory, ROOT), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await findSvelteFiles(child));
    else if (entry.isFile() && entry.name.endsWith('.svelte')) files.push(child);
  }
  return files;
}

const EXPECTED_SHARED_SURFACES = Object.freeze([
  ['src/lib/ProfileShell.svelte', 'nameRendererKey={nameRendererKey}'],
  ['src/lib/Profile.svelte', '<NameEffectCanvas'],
  ['src/lib/ProfileSettingsPreview.svelte', '<IdentityCard'],
  ['src/lib/DiscoveryCard.svelte', '<NameEffectCanvas'],
  ['src/lib/HomeLeaderboard.svelte', '<NameEffectCanvas'],
  ['src/lib/HomepageProfilePreview.svelte', 'nameRendererKey={nameRendererKey}'],
  ['src/lib/HomeExampleProfile.svelte', 'nameRendererKey={profile.nameRendererKey}'],
  ['src/lib/HomeRollShowcase.svelte', 'nameRendererKey={previewLoadout.name_effect}'],
  ['src/lib/ShopItemPreview.svelte', '<NameEffectCanvas'],
  ['src/lib/ShopStudioPreview.svelte', '<NameEffectCanvas']
]);

const LEGACY_CLASS_TOKENS = Object.freeze([
  'name_drop_shadow',
  'name_holographic',
  'name_void',
  'rainbow-text-anim',
  'matrix-rain-anim',
  'glitch-anim',
  'ocean-wave-anim',
  'inferno-name-anim',
  'sunset-blur-anim',
  'chroma-name-anim',
  'diamond-shimmer-anim',
  'pulsing-glow-anim',
  'shining-gold-anim',
  'slow-pulse-name-anim',
  'flicker-neon-anim',
  'name-signal-anim'
]);

test('every production Name surface is wired to the shared renderer path', async () => {
  for (const [path, marker] of EXPECTED_SHARED_SURFACES) {
    const source = await readProjectFile(path);
    assert.match(source, /NameEffectCanvas|nameRendererKey/, path);
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${path} missing ${marker}`);
  }

  const identity = await readProjectFile('src/lib/IdentityCard.svelte');
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(identity, /semanticClass="identity-card__name"/);
});

test('production components no longer apply legacy Name CSS classes or the old bridge', async () => {
  const files = await findSvelteFiles('src/lib');
  for (const path of files) {
    if (path === 'src/lib/name/NameLegacyParityHarness.svelte') continue;
    const source = await readProjectFile(path);
    assert.doesNotMatch(source, /getNameEffect|\bnameClass\s*=|\bnameStyle\s*=/, path);
    for (const token of LEGACY_CLASS_TOKENS) {
      assert.doesNotMatch(source, new RegExp(`(?:class|className)\\s*=[^\\n]*\\b${token}\\b`), `${path} directly applies ${token}`);
    }
  }

  const cosmetics = await readProjectFile('src/lib/cosmetics.js');
  assert.doesNotMatch(cosmetics, /getNameEffect/);
});

test('shared Name semantics and deliberate repeated-list modes remain explicit', async () => {
  const canvas = await readProjectFile('src/lib/name/NameEffectCanvas.svelte');
  assert.match(canvas, /<svelte:element/);
  assert.match(canvas, /<canvas[\s\S]*aria-hidden="true"/);
  assert.match(canvas, /semanticOnClick/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /registerNameAnimation/);

  const compactSources = await Promise.all([
    readProjectFile('src/lib/DiscoveryCard.svelte'),
    readProjectFile('src/lib/HomeLeaderboard.svelte'),
    readProjectFile('src/lib/Profile.svelte'),
    readProjectFile('src/lib/ShopStudioPreview.svelte')
  ]);
  compactSources.forEach(source => assert.match(source, /static-signature/));

  const cardPreview = await readProjectFile('src/lib/ShopItemPreview.svelte');
  assert.match(cardPreview, /context="card"/);
  assert.match(cardPreview, /mode="animated"/);

  const profile = await readProjectFile('src/lib/ProfileShell.svelte');
  assert.match(profile, /nameRendererRecentColors/);
  assert.match(profile, /nameRendererMode="animated"/);
});

test('the parity harness is internal-only and compares legacy, shared, and reduced-motion samples', async () => {
  const harness = await readProjectFile('src/lib/name/NameLegacyParityHarness.svelte');
  assert.match(harness, /Legacy CSS/);
  assert.match(harness, /Shared renderer/);
  assert.match(harness, /mode="reduced-motion"/);
  assert.match(harness, /LEGACY_NAME_PARITY/);

  const sourceFiles = await findSvelteFiles('src/lib');
  for (const path of sourceFiles) {
    if (path === 'src/lib/name/NameLegacyParityHarness.svelte') continue;
    const source = await readProjectFile(path);
    assert.doesNotMatch(source, /NameLegacyParityHarness/);
  }
});
