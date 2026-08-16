import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_LAYOUT_DEFINITIONS,
  PROFILE_LAYOUT_KEYS,
  getProfileLayoutMotionTarget,
  normalizeProfileLayoutKey
} from '../src/lib/profile-layout/profileLayouts.js';
import {
  createDefaultProfileConfig,
  getProfileLayoutLinkPartitions,
  normalizeProfileConfig
} from '../src/lib/profileConfig.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Immersive is an active structural layout with cardless centered identity semantics', () => {
  assert(PROFILE_LAYOUT_KEYS.includes('full-bleed'));
  assert.equal(normalizeProfileLayoutKey('profile_layout_full_bleed'), 'full-bleed');
  assert.deepEqual(PROFILE_LAYOUT_DEFINITIONS['full-bleed'].structure, {
    identity: 'centered',
    roll: 'below-fold',
    surface: 'cardless'
  });
  assert.equal(getProfileLayoutMotionTarget('full-bleed'), 'full-bleed-identity');

  const config = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    templateKey: 'full-bleed',
    layoutVariant: 'full-bleed',
    links: [
      { key: 'website', type: 'website', label: 'Website', url: 'https://example.com', visible: true, order: 0 },
      { key: 'spotify', type: 'spotify', label: 'Spotify', url: 'https://open.spotify.com/artist/example', visible: true, order: 1 },
      { key: 'discord', type: 'discord', label: 'Discord', url: 'https://discord.com/users/example', visible: true, order: 2 },
      { key: 'archive', type: 'other', label: 'Archive', url: 'https://example.com/archive', visible: true, order: 3 }
    ]
  });
  assert.equal(config.layoutVariant, 'full-bleed');
  assert.equal(config.templateKey, 'full-bleed');
  const partitions = getProfileLayoutLinkPartitions(config, 'full-bleed');
  assert.equal(partitions.continuation.length, 0);
  assert.deepEqual(partitions.opening.map(link => link.label), ['Website', 'Spotify', 'Discord', 'Archive']);
});

test('Immersive uses one purpose-built identity composition in public and Studio render paths', async () => {
  const [layout, shell, studio, renderModel, editor, migration] = await Promise.all([
    read('src/lib/profile-layout/ProfileFullBleedLayout.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/ProfileReferenceLayoutEditor.svelte'),
    read('supabase/migrations/20260815130000_profile_compact_immersive_reset.sql')
  ]);

  assert.match(layout, /data-profile-layout-content="full-bleed"/);
  assert.match(layout, /profile-full-bleed__avatar/);
  assert.match(layout, /profile-full-bleed__bio/);
  assert.match(layout, /profile-full-bleed__links/);
  assert.match(layout, /\/link-icons\//);
  assert.doesNotMatch(layout, /ProfileLayoutFrame|ProfileReferenceCard|profile-preview/);

  assert.match(shell, /import ProfileFullBleedLayout/);
  assert.match(shell, /profilePresentationLayoutVariant === 'full-bleed'/);
  assert.match(shell, /inputSurface=\{previewMode \? 'container' : 'viewport'\}/);
  assert.match(shell, /\{#if profilePresentationLayoutVariant === 'full-bleed'\}/);
  assert.match(renderModel, /layoutVariant === 'full-bleed'/);

  assert.match(studio, /import ProfileFullBleedLayout/);
  assert.match(studio, /layoutVariant === 'full-bleed'/);
  assert.match(studio, /inputSurface="container"/);
  assert.match(editor, /data-layout='full-bleed'/);
  assert.match(migration, /profile_layout_full_bleed/);
  assert.match(migration, /css_value IN \('compact', 'full-bleed'\)/);
});

test('Immersive matches the reference identity scale and compact horizontal link spacing', async () => {
  const layout = await read('src/lib/profile-layout/ProfileFullBleedLayout.svelte');

  assert.match(layout, /margin: 0 auto clamp\(\.7rem, 1\.5vw, 1rem\);/);
  assert.match(layout, /font: 600 clamp\(1\.55rem, 1\.6vw, 2\.05rem\) \/ 1 'Clash Display'/);
  assert.match(layout, /margin: \.5rem auto 0;/);
  assert.match(layout, /font: 500 clamp\(\.78rem, 1vw, 1rem\) \/ 1\.45 'Inter'/);
  assert.match(layout, /column-gap: \.25rem;/);
  assert.match(layout, /row-gap: \.35rem;/);
  assert.match(layout, /margin: 1\.15rem auto 0;/);
  assert.match(layout, /width: 2rem;\n\s{4}height: 2rem;/);
  assert.match(layout, /width: 1\.8rem;\n\s{4}height: 1\.8rem;\n\s{4}object-fit: contain;/);
  assert.match(layout, /column-gap: \.2rem;/);
  assert.match(layout, /margin-bottom: \.55rem;/);
  assert.match(layout, /font-size: clamp\(1\.45rem, 7vw, 1\.9rem\)/);
  assert.match(layout, /font-size: clamp\(\.76rem, 4vw, 1rem\)/);
});
