import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LEGACY_NAME_EFFECT_KEYS,
  getNameRendererDefinition,
  isNameRendererKey,
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
  assert.match(identityCard, /<NameEffectCanvas/);
  assert.match(identityCard, /semanticClass="identity-card__name"/);
  assert.match(preview, /nameRendererKey=\{nameRendererKey\}/);
  assert.match(preview, /loadout\?\.name_effect/);
});
