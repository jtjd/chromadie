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

const PRODUCTION_SURFACES = Object.freeze([
  'src/lib/Profile.svelte',
  'src/lib/ProfileShell.svelte',
  'src/lib/DiscoveryCard.svelte',
  'src/lib/ShopItemPreview.svelte',
  'src/lib/ShopStudioPreview.svelte'
]);

test('every production identity surface uses the shared Name renderer path', async () => {
  for (const path of PRODUCTION_SURFACES) {
    const source = await readProjectFile(path);
    assert.match(source, /NameEffectCanvas|nameRendererLoadout|nameRendererContext/, path);
  }

  const identity = await readProjectFile('src/lib/ProfileReferenceCard.svelte');
  const canvas = await readProjectFile('src/lib/name/NameEffectCanvas.svelte');
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(identity, /semanticClass="profile-reference-card__name"/);
  assert.match(canvas, /name-effect-canvas__semantic\.profile-reference-card__name/);
  assert.match(canvas, /getNameFont/);
  assert.match(canvas, /style=\{semanticStyle\}/);
  assert.match(canvas, /aria-hidden="true"/);
});

test('production components no longer apply removed cosmetic slots or legacy CSS bridges', async () => {
  const files = await findSvelteFiles('src/lib');
  const removed = /name_effect|profile_bg|orb_shape|roll_effect|lb_theme|frame_holo|ProfileAtmosphere|DecorationStudio|NameLegacyParity/;
  for (const path of files) {
    const source = await readProjectFile(path);
    assert.doesNotMatch(source, removed, path);
  }
});

test('shared renderer semantics and lifecycle hooks remain explicit', async () => {
  const canvas = await readProjectFile('src/lib/name/NameEffectCanvas.svelte');
  assert.match(canvas, /<svelte:element/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /resizeObserver\?\.disconnect\(\)/);
  assert.match(canvas, /renderer\?\.destroy\(\)/);
  assert.match(canvas, /registerNameAnimation/);
});
