import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LEGACY_NAME_EFFECT_KEYS,
  NAME_COMPOSABLE_COUNTS,
  NAME_COMPOSABLE_MATERIAL_KEYS,
  NAME_COMPOSABLE_MOTION_KEYS,
  NAME_FONTS,
  NAME_MATERIALS,
  NAME_MOTIONS,
  NAME_PAID_MATERIAL_KEYS,
  NAME_PAID_MOTION_KEYS,
  getComposableNameDefinition,
  getNameRendererDefinition,
  isNameRendererKey,
  resolveNameLoadout,
  resolveNameRendererKey
} from '../src/lib/name/nameCatalog.js';
import {
  NAME_MAX_RENDER_LENGTH,
  createNameCanvasRenderer,
  drawNameFrame,
  getNameFrameModel,
  getNameFrameSignature,
  normalizeHexColor,
  normalizeNameText,
  shouldAnimateNameFrame
} from '../src/lib/name/nameRenderer.js';
import { createNameAnimationClock } from '../src/lib/name/nameAnimationClock.js';
import { LEGACY_NAME_PARITY, getLegacyNameParity } from '../src/lib/name/nameLegacyParity.js';
import {
  getCodeOwnedNameRenderers,
  loadCodeOwnedNameRenderers
} from '../src/lib/name/nameComposableRenderer.js';
import { drawComposableMaterial } from '../src/lib/name/render/composableMaterials.js';
import { drawComposableMotion } from '../src/lib/name/render/composableMotions.js';

await loadCodeOwnedNameRenderers();

const LEGACY_KEYS_FROM_PHASE_A_MAPPING = Object.freeze([
  'name_prism_atelier',
  'name_drop_shadow',
  'name_italic',
  'name_glow_blue',
  'name_glow_green',
  'name_smallcaps',
  'name_glow_purple',
  'name_glow_red',
  'name_glow_pink_neon',
  'name_glow_gold',
  'name_gradient_purple',
  'name_gradient_fire',
  'name_ice',
  'name_toxic',
  'name_slow_pulse',
  'name_signal',
  'name_flicker_neon',
  'name_matrix_rain',
  'name_rainbow',
  'name_diamond_shimmer',
  'name_holographic',
  'name_pulsing_glow',
  'name_shining_gold',
  'name_glitch_effect',
  'name_ocean_wave',
  'name_inferno',
  'name_sunset_blur',
  'name_void',
  'name_chroma'
]);

test('the code-owned renderer resolves every legacy name_effect key', () => {
  assert.equal(LEGACY_KEYS_FROM_PHASE_A_MAPPING.length, 29);
  assert.deepEqual([...LEGACY_NAME_EFFECT_KEYS], [...LEGACY_KEYS_FROM_PHASE_A_MAPPING]);

  LEGACY_KEYS_FROM_PHASE_A_MAPPING.forEach(itemKey => {
    assert.equal(isNameRendererKey(itemKey), true, itemKey);
    const definition = getNameRendererDefinition(itemKey);
    assert.equal(definition.key, itemKey);
    assert.equal(definition.kind, 'legacy');
    assert.ok(definition.fontDefinition);
    assert.ok(definition.materialDefinition);
    assert.ok(definition.motionDefinition);
  });
});

test('the internal parity fixture covers every legacy key with an honest classification', () => {
  assert.equal(LEGACY_NAME_PARITY.length, 29);
  const classifications = new Set(['strong parity', 'acceptable reinterpretation', 'needs refinement']);

  LEGACY_KEYS_FROM_PHASE_A_MAPPING.forEach(itemKey => {
    const parity = getLegacyNameParity(itemKey);
    assert.ok(parity, itemKey);
    assert.equal(parity.key, itemKey);
    assert.ok(parity.className || parity.style, itemKey);
    assert.equal(classifications.has(parity.classification), true, itemKey);
    assert.ok(parity.note, itemKey);
  });
});

test('unknown renderer keys fail safely to the plain code-owned renderer', () => {
  assert.equal(resolveNameRendererKey('name_does_not_exist'), 'plain');
  assert.equal(resolveNameRendererKey(null), 'plain');
  assert.equal(getNameRendererDefinition('name_does_not_exist').key, 'plain');
  assert.equal(getNameRendererDefinition('name_does_not_exist').kind, 'default');
});

test('frame models are deterministic for the same input and vary only with animation time', () => {
  const input = {
    text: 'Chromadie',
    rendererKey: 'name_chroma',
    width: 320,
    height: 72,
    context: 'profile',
    todayColor: '#8b7cf6',
    recentColors: ['#101820', '#F7FBFF'],
    time: 240
  };
  const first = getNameFrameModel(input);
  const second = getNameFrameModel(input);
  assert.deepEqual(first, second);
  assert.equal(getNameFrameSignature(first), getNameFrameSignature(second));
  assert.notEqual(getNameFrameSignature(first), getNameFrameSignature(getNameFrameModel({ ...input, time: 980 })));
});

test('card and profile contexts fit their supported sizes', () => {
  const card = getNameFrameModel({ text: 'A compact name', rendererKey: 'name_void', context: 'card', width: 180, height: 42 });
  const profile = getNameFrameModel({ text: 'A profile name', rendererKey: 'name_void', context: 'profile', width: 360, height: 72 });

  assert.equal(card.context, 'card');
  assert.equal(card.compact, true);
  assert.equal(card.width, 180);
  assert.ok(card.metrics.width <= card.metrics.availableWidth);
  assert.equal(profile.context, 'profile');
  assert.equal(profile.compact, false);
  assert.equal(profile.width, 360);
  assert.ok(profile.metrics.width <= profile.metrics.availableWidth);
});

test('short names and the project maximum render length are preserved safely', () => {
  const shortName = normalizeNameText('Li');
  const longName = normalizeNameText('x'.repeat(NAME_MAX_RENDER_LENGTH + 12));
  assert.equal(shortName, 'Li');
  assert.equal(longName.length, NAME_MAX_RENDER_LENGTH);
  assert.equal(NAME_MAX_RENDER_LENGTH, 40);
  const longFrame = getNameFrameModel({ text: longName, rendererKey: 'name_smallcaps', width: 260, height: 48 });
  assert.equal(longFrame.text.length, 40);
  assert.ok(longFrame.metrics.width <= longFrame.metrics.availableWidth);
  assert.ok(longFrame.metrics.scaleX <= 1);
});

test('light and dark daily colors remain explicit, validated renderer inputs', () => {
  const light = getNameFrameModel({ text: 'Light', rendererKey: 'name_pulsing_glow', todayColor: '#ABC', recentColors: ['#111111'] });
  const dark = getNameFrameModel({ text: 'Dark', rendererKey: 'name_pulsing_glow', todayColor: '#101820', recentColors: ['#f7fbff'] });
  assert.equal(normalizeHexColor('#ABC'), '#AABBCC');
  assert.equal(light.todayColor, '#AABBCC');
  assert.equal(dark.todayColor, '#101820');
  assert.deepEqual(dark.recentColors, ['#F7FBFF']);
});

test('reduced-motion, static-signature, and paused modes produce stable frames', () => {
  const reducedAtStart = getNameFrameModel({ text: 'Still', rendererKey: 'name_rainbow', mode: 'reduced-motion', time: 0 });
  const reducedLater = getNameFrameModel({ text: 'Still', rendererKey: 'name_rainbow', mode: 'reduced-motion', time: 5000 });
  const staticFrame = getNameFrameModel({ text: 'Still', rendererKey: 'name_rainbow', mode: 'static-signature', time: 50 });
  const pausedAtSamePoint = getNameFrameModel({ text: 'Still', rendererKey: 'name_rainbow', mode: 'paused', pauseAt: 0.3, time: 5000 });
  const pausedAgain = getNameFrameModel({ text: 'Still', rendererKey: 'name_rainbow', mode: 'paused', pauseAt: 0.3, time: 12000 });

  assert.equal(reducedAtStart.staticFrame, true);
  assert.deepEqual(reducedAtStart, reducedLater);
  assert.equal(staticFrame.staticFrame, true);
  assert.deepEqual(pausedAtSamePoint, pausedAgain);
  assert.equal(shouldAnimateNameFrame({ visible: true, mode: 'reduced-motion' }), false);
});

test('offscreen renderers do not animate and visible renderers do', () => {
  assert.equal(shouldAnimateNameFrame({ visible: false, mode: 'animated' }), false);
  assert.equal(shouldAnimateNameFrame({ visible: true, mode: 'animated' }), true);
  assert.equal(shouldAnimateNameFrame({ visible: true, mode: 'paused' }), false);
});

test('the Canvas renderer draws every legacy preset and caps device pixel ratio', () => {
  const context = {
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {},
    fillText() {},
    strokeText() {},
    fillRect() {},
    translate() {},
    scale() {},
    transform() {},
    createLinearGradient() { return { addColorStop() {} }; }
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 280, height: 54 })
  };
  const renderer = createNameCanvasRenderer(canvas, { text: 'Chromadie', width: 280, height: 54, context: 'card' });

  LEGACY_KEYS_FROM_PHASE_A_MAPPING.forEach(rendererKey => {
    renderer.setOptions({ rendererKey });
    assert.equal(renderer.draw(1234).rendererKey, rendererKey);
  });
  assert.equal(canvas.width, 280);
  assert.equal(canvas.height, 54);
  renderer.destroy();
  assert.equal(renderer.getLastFrameModel(), null);
});

test('the shared animation clock schedules once and cleans every registration', () => {
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
  assert.equal(pending.size, 1);
  const firstHandle = [...pending.keys()][0];
  const firstCallback = pending.get(firstHandle);
  pending.delete(firstHandle);
  firstCallback(16);
  assert.equal(frames, 2);
  assert.equal(clock.stats().frameCount, 1);
  assert.equal(pending.size, 1);

  stopFirst();
  stopSecond();
  assert.equal(clock.stats().activeCount, 0);
  assert.equal(clock.stats().isScheduled, false);
  assert.deepEqual(cancelled, [2]);
  clock.destroy();
  assert.equal(clock.stats().destroyed, true);
});

test('the canvas component keeps semantic text and cleans observers and renderer state', async () => {
  const canvasComponent = await readFile(new URL('../src/lib/name/NameEffectCanvas.svelte', import.meta.url), 'utf8');
  const identityCard = await readFile(new URL('../src/lib/IdentityCard.svelte', import.meta.url), 'utf8');
  const preview = await readFile(new URL('../src/lib/ProfileSettingsPreview.svelte', import.meta.url), 'utf8');

  assert.match(canvasComponent, /<svelte:element/);
  assert.match(canvasComponent, /<canvas[\s\S]*aria-hidden="true"/);
  assert.match(canvasComponent, /intersectionObserver\?\.disconnect\(\)/);
  assert.match(canvasComponent, /resizeObserver\?\.disconnect\(\)/);
  assert.match(canvasComponent, /renderer\?\.destroy\(\)/);
  assert.match(canvasComponent, /loadCodeOwnedNameRenderers/);
  assert.match(identityCard, /<NameEffectCanvas/);
  assert.match(identityCard, /semanticClass="identity-card__name"/);
  assert.match(preview, /nameRendererKey=\{nameRendererKey\}/);
  assert.match(preview, /loadout\?\.name_effect/);
});

test('the composable registries match the reference layer counts and IDs', async () => {
  const catalog = JSON.parse(await readFile(new URL('../chromadie_name_catalog_64_effects.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(NAME_FONTS), catalog.fonts.map(item => item.id));
  assert.deepEqual(NAME_COMPOSABLE_MATERIAL_KEYS, catalog.materials.map(item => item.id));
  assert.deepEqual(NAME_COMPOSABLE_MOTION_KEYS, catalog.motions.map(item => item.id));
  assert.equal(NAME_COMPOSABLE_COUNTS.fonts, 18);
  assert.equal(NAME_COMPOSABLE_COUNTS.materials, 23);
  assert.equal(NAME_COMPOSABLE_COUNTS.motions, 25);
  assert.equal(NAME_COMPOSABLE_COUNTS.paidMaterials, 22);
  assert.equal(NAME_COMPOSABLE_COUNTS.paidMotions, 24);
  assert.equal(NAME_COMPOSABLE_COUNTS.paidTotal, 64);
  assert.equal(new Set(Object.keys(NAME_FONTS)).size, 18);
  assert.equal(new Set(Object.keys(NAME_MATERIALS)).size, Object.keys(NAME_MATERIALS).length);
  assert.equal(new Set(Object.keys(NAME_MOTIONS)).size, Object.keys(NAME_MOTIONS).length);
  catalog.fonts.forEach(item => {
    assert.equal(NAME_FONTS[item.id].label, item.name, item.id);
    assert.equal(NAME_FONTS[item.id].collection, item.collection, item.id);
    assert.equal(NAME_FONTS[item.id].rarity, item.rarity, item.id);
  });
  catalog.materials.forEach(item => {
    assert.equal(NAME_MATERIALS[item.id].label, item.name, item.id);
    assert.equal(NAME_MATERIALS[item.id].collection, item.collection, item.id);
    assert.equal(NAME_MATERIALS[item.id].rarity, item.rarity, item.id);
  });
  catalog.motions.forEach(item => {
    assert.equal(NAME_MOTIONS[item.id].label, item.name, item.id);
    assert.equal(NAME_MOTIONS[item.id].collection, item.collection, item.id);
    assert.equal(NAME_MOTIONS[item.id].rarity, item.rarity, item.id);
    assert.equal(NAME_MOTIONS[item.id].description, item.note, item.id);
  });
});

test('composable definitions accept canonical and future namespaced layer keys', () => {
  const definition = getComposableNameDefinition({
    fontKey: 'editorial-serif',
    materialKey: 'name_material_liquid_mercury',
    motionKey: 'name_motion_ghost_offset'
  });
  assert.equal(definition.kind, 'composable');
  assert.equal(definition.font, 'editorial-serif');
  assert.equal(definition.material, 'liquid-mercury');
  assert.equal(definition.motion, 'ghost-offset');
  assert.equal(definition.key, 'composable:editorial-serif:liquid-mercury:ghost-offset');
});

test('composable draw branches load once through the shared renderer seam', async () => {
  const firstLoad = loadCodeOwnedNameRenderers();
  const secondLoad = loadCodeOwnedNameRenderers();
  assert.equal(firstLoad, secondLoad);
  const renderers = await firstLoad;
  assert.equal(renderers.material, drawComposableMaterial);
  assert.equal(renderers.motion, drawComposableMotion);
  assert.equal(getCodeOwnedNameRenderers().material, drawComposableMaterial);
  assert.equal(getCodeOwnedNameRenderers().motion, drawComposableMotion);
});

test('invalid composable layers fall back independently and cannot inject renderer values', () => {
  const definition = resolveNameLoadout({
    fontKey: 'font; draw evil code',
    materialKey: 'https://example.invalid/style.css',
    motionKey: '<script>alert(1)</script>'
  });
  assert.equal(definition.kind, 'composable');
  assert.equal(definition.font, 'soft-grotesk');
  assert.equal(definition.material, 'plain');
  assert.equal(definition.motion, 'none');
  assert.equal(getComposableNameDefinition({ materialKey: 'drop-shadow' }).material, 'plain');
  assert.equal(getComposableNameDefinition({ motionKey: 'shimmer' }).motion, 'none');
  assert.equal(resolveNameLoadout({ rendererKey: 'name_chroma' }).key, 'name_chroma');
  assert.equal(resolveNameLoadout({ rendererKey: 'name_chroma', fontKey: 'bad' }).kind, 'composable');
});

test('composable frame models preserve daily color and recent history inputs', () => {
  const frame = getNameFrameModel({
    text: 'Chromadie',
    fontKey: 'soft-grotesk',
    materialKey: 'chroma-glass',
    motionKey: 'color-memory',
    todayColor: '#abc',
    recentColors: ['#111111', '#ABC', '#111111'],
    width: 320,
    height: 72,
    time: 440
  });
  assert.equal(frame.composable, true);
  assert.deepEqual(frame.layerKeys, { font: 'soft-grotesk', material: 'chroma-glass', motion: 'color-memory' });
  assert.equal(frame.todayColor, '#AABBCC');
  assert.deepEqual(frame.recentColors, ['#111111', '#AABBCC']);
  assert.equal(frame.context, 'profile');
});

function createTraceCanvas(width = 300, height = 64) {
  const operations = [];
  const gradient = () => ({ addColorStop: (...args) => operations.push(['addColorStop', ...args]) });
  const context = {
    save: () => operations.push(['save']),
    restore: () => operations.push(['restore']),
    setTransform: (...args) => operations.push(['setTransform', ...args]),
    clearRect: (...args) => operations.push(['clearRect', ...args]),
    fillText: (...args) => operations.push(['fillText', ...args]),
    strokeText: (...args) => operations.push(['strokeText', ...args]),
    fillRect: (...args) => operations.push(['fillRect', ...args]),
    translate: (...args) => operations.push(['translate', ...args]),
    scale: (...args) => operations.push(['scale', ...args]),
    transform: (...args) => operations.push(['transform', ...args]),
    beginPath: () => operations.push(['beginPath']),
    moveTo: (...args) => operations.push(['moveTo', ...args]),
    lineTo: (...args) => operations.push(['lineTo', ...args]),
    closePath: () => operations.push(['closePath']),
    rect: (...args) => operations.push(['rect', ...args]),
    clip: () => operations.push(['clip']),
    stroke: () => operations.push(['stroke']),
    fill: () => operations.push(['fill']),
    arc: (...args) => operations.push(['arc', ...args]),
    createLinearGradient: (...args) => { operations.push(['linearGradient', ...args]); return gradient(); },
    createRadialGradient: (...args) => { operations.push(['radialGradient', ...args]); return gradient(); }
  };
  ['globalAlpha', 'globalCompositeOperation', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline', 'lineJoin', 'lineCap'].forEach(property => {
    let value;
    Object.defineProperty(context, property, {
      configurable: true,
      get: () => value,
      set: nextValue => {
        value = nextValue;
        operations.push([property, nextValue]);
      }
    });
  });
  return {
    canvas: { width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => ({ width, height }) },
    operations,
    context
  };
}

test('every composable material produces bounded Canvas output in card and profile contexts', () => {
  NAME_COMPOSABLE_MATERIAL_KEYS.forEach(materialKey => {
    for (const context of ['card', 'profile']) {
      const trace = createTraceCanvas(context === 'card' ? 180 : 360, context === 'card' ? 44 : 72);
      const renderer = createNameCanvasRenderer(trace.canvas, {
        text: 'Chromadie',
        fontKey: 'soft-grotesk',
        materialKey,
        motionKey: 'none',
        context,
        compact: context === 'card'
      });
      assert.ok(renderer.draw(0), `${materialKey} ${context}`);
      assert.ok(trace.operations.some(operation => operation[0] === 'fillText' || operation[0] === 'strokeText'), `${materialKey} ${context}`);
      renderer.destroy();
    }
  });
});

test('every paid composable motion changes at intentional progress points and Still remains stable', () => {
  NAME_PAID_MOTION_KEYS.forEach(motionKey => {
    const trace = createTraceCanvas();
    const renderer = createNameCanvasRenderer(trace.canvas, {
      text: 'Chromadie',
      fontKey: 'soft-grotesk',
      materialKey: 'plain',
      motionKey,
      mode: 'paused',
      pauseAt: 0.11
    });
    const signatures = [0.11, 0.37, 0.67].map(pauseAt => {
      trace.operations.length = 0;
      renderer.setOptions({ pauseAt });
      renderer.draw(0);
      return JSON.stringify(trace.operations);
    });
    assert.ok(new Set(signatures).size > 1, motionKey);
    renderer.destroy();
  });

  const stillTrace = createTraceCanvas();
  const still = createNameCanvasRenderer(stillTrace.canvas, {
    text: 'Chromadie',
    fontKey: 'soft-grotesk',
    materialKey: 'plain',
    motionKey: 'none',
    mode: 'paused',
    pauseAt: 0.17
  });
  stillTrace.operations.length = 0;
  still.draw(0);
  const firstStill = JSON.stringify(stillTrace.operations);
  stillTrace.operations.length = 0;
  still.setOptions({ pauseAt: 0.67 });
  still.draw(0);
  assert.equal(JSON.stringify(stillTrace.operations), firstStill);
  assert.equal(stillTrace.operations.filter(operation => operation[0] === 'fillText').length, 1);
  still.destroy();
});

test('seeded composable frames are deterministic and vary intentionally with seed inputs', () => {
  const input = {
    text: 'Signal',
    fontKey: 'mono-compact',
    materialKey: 'plain',
    motionKey: 'particle-drift',
    width: 260,
    height: 54,
    mode: 'paused',
    pauseAt: 0.42,
    todayColor: '#101820',
    recentColors: ['#101820', '#F7FBFF']
  };
  const first = getNameFrameModel(input);
  const second = getNameFrameModel(input);
  const different = getNameFrameModel({ ...input, text: 'Different' });
  assert.deepEqual(first, second);
  assert.notEqual(first.seed, different.seed);
  assert.equal(getNameFrameSignature(first), getNameFrameSignature(second));
});

test('the internal composable gallery stays unrouted and exposes all layer groups', async () => {
  const gallery = await readFile(new URL('../src/lib/name/NameComposableCatalogHarness.svelte', import.meta.url), 'utf8');
  assert.match(gallery, /Internal D1 review surface/);
  assert.match(gallery, /Object\.values\(NAME_FONTS\)/);
  assert.match(gallery, /Object\.values\(NAME_MATERIALS\)/);
  assert.match(gallery, /Object\.values\(NAME_MOTIONS\)/);
  assert.match(gallery, /fontKey=\{selectedFont\}/);
  assert.match(gallery, /materialKey=\{selectedMaterial\}/);
  assert.match(gallery, /motionKey=\{selectedMotion\}/);
  const sourceFiles = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
  assert.doesNotMatch(sourceFiles, /NameComposableCatalogHarness/);
});
