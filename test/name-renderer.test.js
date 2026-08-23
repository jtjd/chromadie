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
import { drawComposableMotion, getReadableMotionColor } from '../src/lib/name/render/composableMotions.js';
import { requestNameFontLoad } from '../src/lib/name/nameFonts.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the curated renderer registries contain the approved active layers and free baselines', async () => {
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
    fonts: 11,
    materials: 8,
    motions: 15,
    paidFonts: 10,
    paidMaterials: 7,
    paidMotions: 14,
    paidTotal: 31
  });
  assert.equal(NAME_MATERIALS.plain.composable, true);
  assert.equal(NAME_MOTIONS.none.composable, true);
  assert.equal(new Set(Object.keys(NAME_FONTS)).size, 10);
  assert.equal(new Set(Object.keys(NAME_MATERIALS)).size, 8);
  assert.equal(new Set(Object.keys(NAME_MOTIONS)).size, 15);
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

test('name font readiness waits for the requested face to pass the browser font check', async () => {
  const previousDocument = globalThis.document;
  const calls = [];
  globalThis.document = {
    fonts: {
      load: async (descriptor, text) => { calls.push({ type: 'load', descriptor, text }); },
      check: (descriptor, text) => {
        calls.push({ type: 'check', descriptor, text });
        return true;
      }
    }
  };

  try {
    assert.equal(await requestNameFontLoad('soft-grotesk', 28, 'Chromadie'), true);
    assert.equal(calls.filter(call => call.type === 'load').length, 1);
    assert.equal(calls.filter(call => call.type === 'check').length, 1);
    assert.match(calls[0].descriptor, /Instrument Sans Variable/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('composable loadouts produce deterministic bounded card and profile frames', () => {
  const loadout = {
    fontKey: 'editorial-serif',
    materialKey: 'glass-emboss',
    motionKey: 'haunt-fuzzy'
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

test('inline canvas names honor the semantic font size instead of shrinking short names', () => {
  const frame = getNameFrameModel({
    text: 'Tjz',
    context: 'profile',
    width: 35,
    height: 29,
    fontSize: 29.64,
    inline: true
  });

  assert.equal(frame.metrics.fontSize, 29.64);
  assert.ok(frame.metrics.width <= frame.metrics.availableWidth);
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

test('Typefall keeps motion text readable on dark daily colors', () => {
  const dark = getReadableMotionColor('#101820');
  const light = getReadableMotionColor('#F7FBFF');
  assert.notEqual(dark, '#101820');
  assert.match(dark, /^#[0-9A-F]{6}$/);
  assert.match(light, /^#[0-9A-F]{6}$/);
});

test('reduced-motion, static-signature, and offscreen modes are stable', () => {
  const reducedAtStart = getNameFrameModel({ text: 'Still', loadout: { motionKey: 'haunt-flash' }, mode: 'reduced-motion', time: 0 });
  const reducedLater = getNameFrameModel({ text: 'Still', loadout: { motionKey: 'haunt-flash' }, mode: 'reduced-motion', time: 5000 });
  const staticFrame = getNameFrameModel({ text: 'Still', loadout: { motionKey: 'haunt-flash' }, mode: 'static-signature', time: 50 });
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

test('every curated motion renderer draws safely through the bounded Canvas API', () => {
  const context = new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (property === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (property === 'measureText') return text => ({ width: String(text).length * 12 });
      if (!(property in target)) target[property] = () => {};
      return target[property];
    }
  });
  for (const motionKey of NAME_PAID_MOTION_KEYS) {
    const frame = getNameFrameModel({
      text: 'Chromadie',
      loadout: { motionKey },
      todayColor: '#D84B8E',
      recentColors: ['#45E8FF', '#9B7CFF', '#FFD166'],
      time: 1375
    });
    assert.doesNotThrow(() => drawComposableMotion(context, frame, () => {}), motionKey);
  }
});

function createMotionRecordingContext() {
  const calls = [];
  const context = new Proxy({}, {
    get(target, property) {
      if (property === 'globalCompositeOperation') return target.globalCompositeOperation || 'source-over';
      if (property === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
      if (property === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      if (property === 'measureText') {
        return text => ({ width: String(text).length * 12 });
      }
      if (property === 'fillText') {
        return (...args) => calls.push({ type: 'fillText', args, composite: context.globalCompositeOperation });
      }
      if (property === 'fillRect') {
        return (...args) => calls.push({ type: 'fillRect', args, composite: context.globalCompositeOperation });
      }
      if (property === 'arc') {
        return (...args) => calls.push({ type: 'arc', args });
      }
      if (property === 'stroke') {
        return (...args) => calls.push({ type: 'stroke', args });
      }
      if (!(property in target)) target[property] = () => {};
      return target[property];
    }
  });
  return { calls, context };
}

test('Type In reveals from the left edge and keeps its cursor after the visible text', () => {
  const frame = getNameFrameModel({
    text: 'Chromadie',
    loadout: { motionKey: 'typewriter-name' },
    time: 500
  });
  const { calls, context } = createMotionRecordingContext();
  let drawnModel = null;
  drawComposableMotion(context, frame, (target, model) => {
    drawnModel = model;
    target.fillText(model.displayText, model.metrics.x, model.metrics.y);
  });

  const textCall = calls.find(call => call.type === 'fillText');
  const cursorCall = calls.find(call => call.type === 'fillRect');
  assert.ok(drawnModel.displayText.length > 0);
  assert.ok(drawnModel.metrics.x < frame.metrics.x);
  assert.ok(cursorCall);
  assert.equal(cursorCall.args[0], drawnModel.metrics.x + drawnModel.metrics.width / 2 + 3);
  assert.equal(cursorCall.args[1], frame.metrics.y - frame.metrics.fontSize * 0.45);
  assert.equal(textCall.args[1], drawnModel.metrics.x);
});

test('Fuzzy keeps its signal line inside the text mask instead of drawing a frame', () => {
  const frame = getNameFrameModel({
    text: 'Chromadie',
    loadout: { motionKey: 'haunt-fuzzy' },
    time: 1375
  });
  const { calls, context } = createMotionRecordingContext();
  drawComposableMotion(context, frame, () => {});
  const scanline = calls.find(call => call.type === 'fillRect' && call.args[3] === 1);
  assert.ok(scanline);
  assert.equal(scanline.composite, 'source-atop');
});

test('the curated motion set retains distinct authored gestures', () => {
  const render = motionKey => {
    const frame = getNameFrameModel({ text: 'Chromadie', loadout: { motionKey }, time: 1375 });
    const recording = createMotionRecordingContext();
    let baseCalls = 0;
    drawComposableMotion(recording.context, frame, () => { baseCalls += 1; });
    return { calls: recording.calls, baseCalls };
  };
  const rainbow = render('haunt-rainbow');
  const gradient = render('haunt-gradient');
  const particles = render('haunt-particles');
  const flash = render('haunt-flash');
  assert.ok(rainbow.calls.filter(call => call.type === 'fillText').length >= 7);
  assert.ok(gradient.calls.filter(call => call.type === 'fillText').length <= 1);
  assert.ok(particles.calls.filter(call => call.type === 'arc').length >= 12);
  assert.ok(flash.baseCalls >= 4);
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
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ShopItemPreview.svelte'),
    read('src/lib/Profile.svelte')
  ]);
  assert.match(canvas, /<svelte:element/);
  assert.match(canvas, /<canvas[\s\S]*aria-hidden="true"/);
  assert.match(canvas, /renderer\?\.destroy\(\)/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /CANVAS_BLEED_X/);
  assert.match(canvas, /CANVAS_BLEED_Y/);
  assert.match(canvas, /inset: -12px -18px/);
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(identity, /semanticClass="profile-reference-card__name"/);
  assert.match(canvas, /name-effect-canvas__semantic\.profile-reference-card__name/);
  assert.match(preview, /NameEffectCanvas/);
  assert.match(preview, /text=\{PREVIEW_NAME\}/);
  assert.match(preview, /const PREVIEW_NAME = 'CHM'/);
  assert.match(profile, /ProfileBorderEffect/);
  assert.doesNotMatch(canvas, /arbitrary CSS|innerHTML|eval\s*\(/i);
});
