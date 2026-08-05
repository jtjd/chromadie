import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { CURSOR_TRAIL_KEYS, getCursorTrailKey } from '../src/lib/cursor-trail/cursorTrails.js';
import { AVATAR_EFFECT_KEYS, AVATAR_EFFECT_DEFINITIONS, isAvatarEffectKey } from '../src/lib/avatar-effect/avatarEffects.js';
import {
  FREE_PROFILE_LAYOUTS,
  PAID_PROFILE_LAYOUT_KEYS,
  getProfileLayoutLabel,
  resolveProfileLayoutVariant
} from '../src/lib/profile-layout/profileLayouts.js';
import { filterShopItems, SHOP_SECTIONS, tryOnShopItem } from '../src/lib/shopCatalog.js';
import { PROFILE_ATMOSPHERE_KEYS, getAtmosphereDefinition } from '../src/lib/profile-atmosphere/atmospheres.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('launch renderer registries contain exactly the requested finite keys', () => {
  assert.equal(CURSOR_TRAIL_KEYS.length, 16);
  assert.equal(AVATAR_EFFECT_KEYS.length, 18);
  assert.equal(PAID_PROFILE_LAYOUT_KEYS.length, 5);
  assert.equal(PROFILE_ATMOSPHERE_KEYS.length, 12);
  assert.equal(new Set(CURSOR_TRAIL_KEYS).size, 16);
  assert.equal(new Set(AVATAR_EFFECT_KEYS).size, 18);
  assert.equal(new Set(PAID_PROFILE_LAYOUT_KEYS).size, 5);
  assert.deepEqual(FREE_PROFILE_LAYOUTS, ['immersive', 'editorial', 'focus']);
  assert.equal(getCursorTrailKey('cursor_trail_void_lensing'), 'void-lensing');
  assert.equal(isAvatarEffectKey('avatar_effect_color_archive'), true);
  assert.equal(getProfileLayoutLabel('profile_layout_story_stack'), 'Story Stack');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_color_memory'), null);
  assert.equal(getAtmosphereDefinition('profile_atmosphere_signal_garden'), null);
  assert.equal(getAtmosphereDefinition('profile_atmosphere_droplets_glass')?.key, 'droplets-glass');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_dust_light')?.key, 'dust-light');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_ink_bloom')?.key, 'ink-bloom');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_snowfall')?.key, 'snowfall');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_silk_folds')?.key, 'silk-folds');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_glass_caustics')?.key, 'glass-caustics');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_cinder_drift')?.key, 'cinder-drift');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_night_pollen')?.key, 'night-pollen');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_paper_shadow')?.key, 'paper-shadow');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_smoke_spiral')?.key, 'smoke-spiral');
  assert.equal(getAtmosphereDefinition('profile_atmosphere_lumen_flare')?.key, 'lumen-flare');
});

test('authored avatar anchors resolve raster plates and the shared texture atlas', async () => {
  const anchors = ['prism-orbit', 'ember-crown', 'ghost-double'];

  for (const key of anchors) {
    const definition = AVATAR_EFFECT_DEFINITIONS[key];
    assert.ok(definition, key);
    assert.match(definition.authoredOverlay, /^\/avatar-effects\/.+\.png$/);
    const asset = await readFile(new URL(`../public${definition.authoredOverlay}`, import.meta.url));
    assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }

  const atlas = await readFile(new URL('../public/avatar-effects/particle-atlas.png', import.meta.url));
  assert.deepEqual([...atlas.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  assert.equal(AVATAR_EFFECT_DEFINITIONS['prism-orbit'].particles, true);
  assert.equal(AVATAR_EFFECT_DEFINITIONS['ember-crown'].particles, true);
  assert.equal(AVATAR_EFFECT_DEFINITIONS['ghost-double'].imageAware, true);
});

test('atmosphere scenes are finite, authored, and safe to mount repeatedly', async () => {
  const atmosphereSource = await read('src/lib/profile-atmosphere/AtmosphereLayer.svelte');
  for (const key of PROFILE_ATMOSPHERE_KEYS) {
    assert.equal(getAtmosphereDefinition(key)?.key, key);
  }
  assert.match(atmosphereSource, /pointer-events: none/);
  assert.match(atmosphereSource, /prefers-reduced-motion/);
  assert.match(atmosphereSource, /visibilitychange/);
  assert.match(atmosphereSource, /data-atmosphere=\{definition\.key\}/);
  assert.match(atmosphereSource, /mode === 'card' \|\| mode === 'compact'/);
  assert.match(atmosphereSource, /background: transparent/);
  assert.match(atmosphereSource, /rain-window-loop-v2\.webm/);
  assert.match(atmosphereSource, /rain-window-loop-v2-poster\.png/);
  assert.match(atmosphereSource, /droplets-on-glass-loop-v3\.webm/);
  assert.match(atmosphereSource, /dust-light-loop-v1\.webm/);
  assert.match(atmosphereSource, /ink-bloom-loop-v1\.webm/);
  assert.match(atmosphereSource, /snowfall-loop-v1\.webm/);
  assert.match(atmosphereSource, /silk-folds-loop-v1\.webm/);
  assert.match(atmosphereSource, /glass-caustics-loop-v1\.webm/);
  assert.match(atmosphereSource, /cinder-drift-loop-v1\.webm/);
  assert.match(atmosphereSource, /night-pollen-loop-v2\.webm/);
  assert.match(atmosphereSource, /paper-shadow-loop-v2\.webm/);
  assert.match(atmosphereSource, /smoke-spiral-loop-v1\.webm/);
  assert.match(atmosphereSource, /lumen-flare-loop-v1\.webm/);
  assert.match(atmosphereSource, /autoplay muted loop playsinline/);
  assert.match(atmosphereSource, /mix-blend-mode: screen/);
  assert.doesNotMatch(atmosphereSource, /mix-blend-mode:soft-light/);

  const rainVideo = await readFile(new URL('../public/atmospheres/rain-window/rain-window-loop-v2.webm', import.meta.url));
  const rainFallback = await readFile(new URL('../public/atmospheres/rain-window/rain-window-loop-v2.mp4', import.meta.url));
  const rainPoster = await readFile(new URL('../public/atmospheres/rain-window/rain-window-loop-v2-poster.png', import.meta.url));
  const dropletsVideo = await readFile(new URL('../public/atmospheres/droplets-on-glass/droplets-on-glass-loop-v3.webm', import.meta.url));
  const dropletsFallback = await readFile(new URL('../public/atmospheres/droplets-on-glass/droplets-on-glass-loop-v3.mp4', import.meta.url));
  const dropletsPoster = await readFile(new URL('../public/atmospheres/droplets-on-glass/droplets-on-glass-loop-v3-poster.png', import.meta.url));
  const authoredMediaVersions = Object.freeze({
    'dust-light': 'v1',
    'ink-bloom': 'v1',
    snowfall: 'v1',
    'silk-folds': 'v1',
    'glass-caustics': 'v1',
    'cinder-drift': 'v1',
    'night-pollen': 'v2',
    'paper-shadow': 'v2',
    'smoke-spiral': 'v1',
    'lumen-flare': 'v1'
  });
  const authoredMedia = await Promise.all(Object.keys(authoredMediaVersions).map(async key => ({
    video: await readFile(new URL(`../public/atmospheres/${key}/${key}-loop-${authoredMediaVersions[key]}.webm`, import.meta.url)),
    fallback: await readFile(new URL(`../public/atmospheres/${key}/${key}-loop-${authoredMediaVersions[key]}.mp4`, import.meta.url)),
    poster: await readFile(new URL(`../public/atmospheres/${key}/${key}-loop-${authoredMediaVersions[key]}-poster.png`, import.meta.url))
  })));
  assert.deepEqual([...rainVideo.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3]);
  assert.equal(rainFallback.subarray(4, 8).toString('ascii'), 'ftyp');
  assert.deepEqual([...rainPoster.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...dropletsVideo.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3]);
  assert.equal(dropletsFallback.subarray(4, 8).toString('ascii'), 'ftyp');
  assert.deepEqual([...dropletsPoster.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  for (const { video, fallback, poster } of authoredMedia) {
    assert.deepEqual([...video.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3]);
    assert.equal(fallback.subarray(4, 8).toString('ascii'), 'ftyp');
    assert.deepEqual([...poster.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  assert.doesNotMatch(atmosphereSource, /RAIN_WINDOW_TEXTURE/);
});

test('paid layout resolution preserves the free fallback and supports temporary previews', () => {
  assert.equal(resolveProfileLayoutVariant({}, { layoutVariant: 'editorial' }), 'editorial');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_split_signal' }, { layoutVariant: 'editorial' }), 'split-signal');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_split_signal' }, { layoutVariant: 'editorial', layoutOverride: 'focus' }), 'focus');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'not-real' }, { layoutVariant: 'not-real' }), 'immersive');
});

test('profile layouts stay on the identity card and cannot recompose the roll page', async () => {
  const [shell, card] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte')
  ]);
  assert.match(card, /identity-card--layout-split-signal/);
  assert.match(card, /identity-card--layout-editorial/);
  assert.match(card, /identity-card--layout-focus/);
  assert.match(card, /identity-card--layout-story-stack/);
  assert.match(shell, /layoutVariant=\{layoutVariant\}/);
  assert.doesNotMatch(shell, /profile-shell-page--(?:split-signal|archive-index|prism-mosaic|night-terminal|story-stack)[^\n]*profile-shell__more/);
  assert.doesNotMatch(shell, /profile-shell-page--(?:split-signal|archive-index|prism-mosaic|night-terminal|story-stack)[^\n]*profile-shell__approved-(?:game|featured|supporting)/);
});

test('new catalog slots filter independently and fitting-room selection preserves other slots', () => {
  const items = [
    { item_key: 'cursor_trail_signal_trace', slot: 'cursor_trail', cost: 160000, rarity: 'Rare', collection: 'Signal', catalog_status: 'active' },
    { item_key: 'avatar_effect_signal_ring', slot: 'avatar_effect', cost: 180000, rarity: 'Rare', collection: 'Signal', catalog_status: 'active' },
    { item_key: 'profile_atmosphere_rain_window', slot: 'profile_atmosphere', cost: 260000, rarity: 'Rare', collection: 'Nocturne', catalog_status: 'active' },
    { item_key: 'profile_layout_split_signal', slot: 'profile_layout', cost: 320000, rarity: 'Rare', collection: 'Signal', catalog_status: 'active' }
  ];
  for (const section of ['avatar', 'atmosphere', 'cursor', 'layouts']) {
    assert.equal(SHOP_SECTIONS.some(entry => entry.id === section), true);
    assert.equal(filterShopItems(items, { section }).length, 1);
  }
  const next = tryOnShopItem({ name_font: 'name_font_editorial_serif', profile_border: 'border_signal' }, items[0]);
  assert.equal(next.cursor_trail, 'cursor_trail_signal_trace');
  assert.equal(next.name_font, 'name_font_editorial_serif');
  assert.equal(next.profile_border, 'border_signal');
});

test('seed and migrations contain the launch products and version bumps', async () => {
  const [seed, migration] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260804120000_launch_cosmetic_expansion.sql')
  ]);
  assert.equal((seed.match(/'cursor_trail_[a-z0-9_]+'/g) || []).length, 16);
  assert.equal((seed.match(/'avatar_effect_[a-z0-9_]+'/g) || []).length, 18);
  assert.equal((seed.match(/'profile_layout_[a-z0-9_]+'/g) || []).length, 5);
  assert.equal((seed.match(/'profile_atmosphere_[a-z0-9_]+'/g) || []).length, 12);
  const atmosphereMigration = await read('supabase/migrations/20260804160000_profile_atmosphere_catalog.sql');
  const dropletsMigration = await read('supabase/migrations/20260804183000_droplets_on_glass_atmosphere.sql');
  const atmosphereExpansionMigration = await read('supabase/migrations/20260804210000_atmosphere_expansion.sql');
  const atmosphereCurationMigration = await read('supabase/migrations/20260804223000_curate_atmosphere_catalog.sql');
  const atmosphereReplacementMigration = await read('supabase/migrations/20260804230000_authored_atmosphere_replacements.sql');
  const atmosphereQualityMigration = await read('supabase/migrations/20260805000000_replace_weak_atmosphere_plates.sql');
  assert.match(atmosphereMigration, /Expected 122 active catalog rows/);
  assert.match(dropletsMigration, /Expected 123 active catalog rows/);
  assert.match(atmosphereExpansionMigration, /Expected 126 active catalog rows/);
  assert.match(atmosphereExpansionMigration, /Expected 12 active Profile Atmosphere rows/);
  assert.match(atmosphereExpansionMigration, /dust-light/);
  assert.match(atmosphereExpansionMigration, /ink-bloom/);
  assert.match(atmosphereExpansionMigration, /snowfall/);
  assert.match(dropletsMigration, /droplets-glass/);
  assert.match(migration, /VALUES \('shop_version', '2026-08-04T12:00:00Z'\)/);
  assert.match(migration, /Expected 114 active catalog rows/);
  assert.match(atmosphereMigration, /profile_atmosphere.*signal-garden/s);
  assert.match(atmosphereCurationMigration, /Expected 119 active catalog rows/);
  assert.match(atmosphereCurationMigration, /Expected 5 active Profile Atmosphere rows/);
  assert.match(atmosphereCurationMigration, /DELETE FROM public\.shop_items/);
  assert.match(atmosphereReplacementMigration, /silk-folds/);
  assert.match(atmosphereReplacementMigration, /glass-caustics/);
  assert.match(atmosphereReplacementMigration, /cinder-drift/);
  assert.match(atmosphereReplacementMigration, /night-pollen/);
  assert.match(atmosphereReplacementMigration, /paper-shadow/);
  assert.match(atmosphereReplacementMigration, /smoke-spiral/);
  assert.match(atmosphereReplacementMigration, /lumen-flare/);
  assert.match(atmosphereReplacementMigration, /Expected 126 active catalog rows/);
  assert.match(atmosphereReplacementMigration, /Expected 12 active Profile Atmosphere rows/);
  assert.match(atmosphereQualityMigration, /Starlight Tunnel/);
  assert.match(atmosphereQualityMigration, /Chromatic Tangle/);
  assert.match(atmosphereQualityMigration, /Expected 126 active catalog rows/);
  assert.match(atmosphereQualityMigration, /Expected 12 active Profile Atmosphere rows/);
});
