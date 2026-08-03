import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  NAME_COMPOSABLE_COUNTS,
  NAME_COMPOSABLE_MATERIAL_KEYS,
  NAME_COMPOSABLE_MOTION_KEYS,
  NAME_PAID_MATERIAL_KEYS,
  NAME_PAID_MOTION_KEYS,
  NAME_FONTS,
  NAME_MATERIALS,
  NAME_MOTIONS,
  getComposableNameDefinition,
  getNameRendererDefinition,
  resolveNameLoadout,
  resolveNameRendererKey
} from '../src/lib/name/nameCatalog.js';
import {
  NAME_MAX_RENDER_LENGTH,
  createNameCanvasRenderer,
  getNameFrameModel,
  getNameFrameSignature,
  normalizeHexColor,
  normalizeNameText,
  shouldAnimateNameFrame
} from '../src/lib/name/nameRenderer.js';
import { createNameAnimationClock } from '../src/lib/name/nameAnimationClock.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the lean renderer registries contain the 64 paid layers and free baselines', async () => {
  const seed = await read('supabase/seed.sql');
  const seedRendererRows = [...seed.matchAll(
    /^\s*\('name_(font|material|motion)_[^']+',\s*'[^']+',\s*'(name_font|name_material|name_motion)',\s*\d+,\s*'renderer',\s*'([^']+)'/gm
  )].map(([, , slot, rendererKey]) => ({ slot, rendererKey }));
  const seedKeys = slot => seedRendererRows
    .filter(row => row.slot === slot)
    .map(row => row.rendererKey);

  assert.deepEqual(Object.keys(NAME_FONTS), seedKeys('name_font'));
  assert.deepEqual(NAME_PAID_MATERIAL_KEYS, seedKeys('name_material'));
  assert.deepEqual(NAME_PAID_MOTION_KEYS, seedKeys('name_motion'));
  assert.deepEqual(NAME_COMPOSABLE_COUNTS, {
    fonts: 18,
    materials: 23,
    motions: 25,
    paidFonts: 18,
    paidMaterials: 22,
    paidMotions: 24,
    paidTotal: 64
  });
  assert.equal(NAME_MATERIALS.plain.composable, true);
  assert.equal(NAME_MOTIONS.none.composable, true);
  assert.equal(new Set(Object.keys(NAME_FONTS)).size, 18);
  assert.equal(new Set(Object.keys(NAME_MATERIALS)).size, 23);
  assert.equal(new Set(Object.keys(NAME_MOTIONS)).size, 25);
});

test('all supported combinations resolve through finite code-owned registries', () => {
  for (const fontKey of Object.keys(NAME_FONTS)) {
    for (const materialKey of NAME_COMPOSABLE_MATERIAL_KEYS) {
      for (const motionKey of NAME_COMPOSABLE_MOTION_KEYS) {
        const definition = getComposableNameDefinition({ fontKey, materialKey, motionKey });
        assert.equal(definition.kind, 'composable');
        assert.equal(definition.font, fontKey);
        assert.equal(definition.material, materialKey);
        assert.equal(definition.motion, motionKey);
      }
    }
  }
});

test('invalid inputs fall back independently and cannot inject renderer values', () => {
  const definition = resolveNameLoadout({
    fontKey: 'font; draw evil code',
    materialKey: 'https://example.invalid/style.css',
    motionKey: '<script>alert(1)</script>'
  });
  assert.equal(definition.kind, 'composable');
  assert.equal(definition.font, 'soft-grotesk');
  assert.equal(definition.material, 'plain');
  assert.equal(definition.motion, 'none');
  assert.equal(resolveNameRendererKey('unknown'), 'plain');
  assert.equal(getNameRendererDefinition('unknown').key, 'plain');
});

test('composable loadouts produce deterministic bounded card and profile frames', () => {
  const loadout = {
    fontKey: 'editorial-serif',
    materialKey: 'liquid-mercury',
    motionKey: 'ghost-offset'
  };
  const input = {
    text: 'A long Chromadie identity 123',
    loadout,
    todayColor: '#8b7cf6',
    recentColors: ['#101820', '#F7FBFF'],
    time: 240
  };
  const first = getNameFrameModel({ ...input, context: 'card', width: 180, height: 42 });
  const second = getNameFrameModel({ ...input, context: 'card', width: 180, height: 42 });
  const profile = getNameFrameModel({ ...input, context: 'profile', width: 360, height: 72 });
  assert.deepEqual(first, second);
  assert.equal(first.context, 'card');
  assert.equal(first.compact, true);
  assert.equal(profile.context, 'profile');
  assert.equal(profile.compact, false);
  assert.ok(first.metrics.width <= first.metrics.availableWidth);
  assert.ok(profile.metrics.width <= profile.metrics.availableWidth);
  assert.notEqual(getNameFrameSignature(first), getNameFrameSignature(getNameFrameModel({ ...input, time: 980 })));
});

test('short, long, light, and dark names remain safe and deterministic', () => {
  assert.equal(normalizeNameText('Li'), 'Li');
  const longName = normalizeNameText('x'.repeat(NAME_MAX_RENDER_LENGTH + 12));
  assert.equal(longName.length, NAME_MAX_RENDER_LENGTH);
  assert.equal(normalizeHexColor('#ABC'), '#AABBCC');
  assert.equal(getNameFrameModel({ text: 'Light', todayColor: '#ABC' }).todayColor, '#AABBCC');
  assert.equal(getNameFrameModel({ text: 'Dark', todayColor: '#101820' }).todayColor, '#101820');
  assert.ok(getNameFrameModel({ text: longName, context: 'card', width: 220, height: 44 }).metrics.scaleX <= 1);
});

test('reduced-motion, static-signature, and offscreen modes are stable', () => {
  const reducedAtStart = getNameFrameModel({ text: 'Still', loadout: { motionKey: 'daily-pulse' }, mode: 'reduced-motion', time: 0 });
  const reducedLater = getNameFrameModel({ text: 'Still', loadout: { motionKey: 'daily-pulse' }, mode: 'reduced-motion', time: 5000 });
  const staticFrame = getNameFrameModel({ text: 'Still', loadout: { motionKey: 'daily-pulse' }, mode: 'static-signature', time: 50 });
  assert.deepEqual(reducedAtStart, reducedLater);
  assert.equal(staticFrame.staticFrame, true);
  assert.equal(shouldAnimateNameFrame({ visible: false, mode: 'animated' }), false);
  assert.equal(shouldAnimateNameFrame({ visible: true, mode: 'reduced-motion' }), false);
  assert.equal(shouldAnimateNameFrame({ visible: true, mode: 'animated' }), true);
});

test('every paid motion changes at intentional progress points and Still remains stable', () => {
  for (const motionKey of NAME_COMPOSABLE_MOTION_KEYS) {
    const first = getNameFrameModel({ text: 'Chromadie', loadout: { motionKey }, time: 250 });
    const second = getNameFrameModel({ text: 'Chromadie', loadout: { motionKey }, time: 1750 });
    if (motionKey === 'none') assert.equal(getNameFrameSignature(first), getNameFrameSignature(second));
    else assert.notEqual(getNameFrameSignature(first), getNameFrameSignature(second), motionKey);
  }
});

test('the native Canvas path caps DPR and safely falls back without a 2D context', () => {
  const unsupported = createNameCanvasRenderer({ getContext: () => null });
  assert.equal(unsupported.supported, false);

  const context = new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (property === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (property === 'measureText') return text => ({ width: String(text).length * 12 });
      if (!(property in target)) target[property] = () => {};
      return target[property];
    }
  });
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 280, height: 54 })
  };
  const renderer = createNameCanvasRenderer(canvas, { text: 'Chromadie', loadout: { materialKey: 'plain' }, context: 'card' });
  assert.equal(renderer.draw(1234).context, 'card');
  assert.equal(canvas.width, 280);
  assert.equal(canvas.height, 54);
  renderer.destroy();
  assert.equal(renderer.getLastFrameModel(), null);
});

test('the shared animation clock has one scheduled loop and cleans registrations', () => {
  const pending = new Map();
  const cancelled = [];
  let nextHandle = 1;
  const clock = createNameAnimationClock({
    requestAnimationFrame(callback) {
      const handle = nextHandle++;
      pending.set(handle, callback);
      return handle;
    },
    cancelAnimationFrame(handle) {
      cancelled.push(handle);
      pending.delete(handle);
    }
  });
  let frames = 0;
  const stopFirst = clock.register(() => { frames += 1; });
  const stopSecond = clock.register(() => { frames += 1; });
  assert.equal(clock.stats().activeCount, 2);
  const handle = [...pending.keys()][0];
  const callback = pending.get(handle);
  pending.delete(handle);
  callback(16);
  assert.equal(frames, 2);
  stopFirst();
  stopSecond();
  assert.equal(clock.stats().activeCount, 0);
  assert.deepEqual(cancelled, [2]);
  clock.destroy();
  assert.equal(clock.stats().destroyed, true);
});

test('production Name surfaces preserve semantic text while the Canvas is visual-only', async () => {
  const [canvas, identity, preview, profile] = await Promise.all([
    read('src/lib/name/NameEffectCanvas.svelte'),
    read('src/lib/IdentityCard.svelte'),
    read('src/lib/ShopItemPreview.svelte'),
    read('src/lib/Profile.svelte')
  ]);
  assert.match(canvas, /<svelte:element/);
  assert.match(canvas, /<canvas[\s\S]*aria-hidden="true"/);
  assert.match(canvas, /renderer\?\.destroy\(\)/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(identity, /semanticClass="identity-card__name"/);
  assert.match(preview, /NameEffectCanvas/);
  assert.match(profile, /ProfileBorderEffect/);
  assert.doesNotMatch(canvas, /arbitrary CSS|innerHTML|eval\s*\(/i);
});
