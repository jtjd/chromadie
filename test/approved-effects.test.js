import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getNameFrameModel } from '../src/lib/name/nameRenderer.js';
import { getNameMotion } from '../src/lib/name/nameMotions.js';
import { drawComposableMotion } from '../src/lib/name/render/composableMotions.js';
import { createElasticFrameController, createElasticFramePaths } from '../src/lib/profile-border/elasticFrameRenderer.js';
import { getProfileBorderDefinition, getProfileBorderKey } from '../src/lib/profile-border/profileBorders.js';
import { createHaloOffsetController, createWavefrontController } from '../src/lib/profile-motion/profileMotionEffects.js';
import { getProfileMotionDefinition, getProfileMotionRendererKey } from '../src/lib/profile-motion/profileMotions.js';
import { getAtmosphereDefinition } from '../src/lib/profile-atmosphere/atmospheres.js';
import { getCursorTrailKey } from '../src/lib/cursor-trail/cursorTrails.js';
import { getAvatarEffectDefinition } from '../src/lib/avatar-effect/avatarEffects.js';
import { createAvatarOrbitController } from '../src/lib/avatar-effect/avatarOrbitRenderer.js';
import { buildProfileRenderSnapshot } from '../src/lib/profileRenderModel.js';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

class FakeEventTarget {
  constructor(rect = { left: 0, top: 0, width: 320, height: 180 }) {
    this.rect = rect;
    this.listeners = new Map();
    this.style = {};
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || new Set();
    handlers.add(handler);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  emit(type, event = {}) {
    for (const handler of [...(this.listeners.get(type) || [])]) handler(event);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0;
  }

  getBoundingClientRect() {
    return this.rect;
  }
}

function installBrowserFakes({ reduced = false } = {}) {
  const keys = ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IntersectionObserver'];
  const previous = new Map(keys.map(key => [key, {
    present: Object.prototype.hasOwnProperty.call(globalThis, key),
    value: globalThis[key]
  }]));
  const queue = [];
  const cancelled = new Set();
  let nextFrame = 1;
  const media = {
    matches: reduced,
    addEventListener() {},
    removeEventListener() {}
  };
  const fakeWindow = new FakeEventTarget();
  fakeWindow.devicePixelRatio = 1;
  fakeWindow.matchMedia = () => media;
  const fakeDocument = new FakeEventTarget();
  fakeDocument.visibilityState = 'visible';

  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  globalThis.requestAnimationFrame = callback => {
    const id = nextFrame++;
    queue.push({ id, callback });
    return id;
  };
  globalThis.cancelAnimationFrame = id => cancelled.add(id);
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
  };

  return {
    tick(timestamp) {
      const next = queue.shift();
      if (next && !cancelled.has(next.id)) next.callback(timestamp);
    },
    queued: () => queue.length,
    restore() {
      for (const [key, state] of previous) {
        if (state.present) globalThis[key] = state.value;
        else delete globalThis[key];
      }
    }
  };
}

function createRecordingContext() {
  const calls = [];
  const context = new Proxy({}, {
    get(target, property) {
      if (property === 'calls') return calls;
      if (property === 'createLinearGradient' || property === 'createRadialGradient') {
        return (...args) => {
          calls.push({ type: property, args });
          return { addColorStop() {} };
        };
      }
      if (!(property in target)) {
        target[property] = (...args) => calls.push({ type: property, args });
      }
      return target[property];
    }
  });
  return context;
}

function createCanvas(context, rect) {
  return {
    width: 1,
    height: 1,
    style: {},
    getBoundingClientRect: () => rect,
    getContext: () => context
  };
}

const APPROVED_CATALOG_ROWS = Object.freeze([
  ['name_motion_kinetic_echo', 'name_motion', 'kinetic-echo'],
  ['name_motion_magnetic_type', 'name_motion', 'magnetic-type'],
  ['name_motion_neon_particle', 'name_motion', 'neon-particle'],
  ['name_motion_raster_signal', 'name_motion', 'raster-signal'],
  ['border_elastic', 'profile_border', 'elastic'],
  ['profile_motion_halo_offset', 'profile_motion', 'halo-offset'],
  ['profile_motion_wavefront', 'profile_motion', 'wavefront'],
  ['profile_atmosphere_prism_dust', 'profile_atmosphere', 'prism-dust'],
  ['cursor_trail_plasma_swarm', 'cursor_trail', 'plasma-swarm'],
  ['avatar_effect_butterfly_orbit', 'avatar_effect', 'butterfly-orbit'],
  ['avatar_effect_bat_orbit', 'avatar_effect', 'bat-orbit']
]);

test('every approved effect resolves through its existing finite renderer registry', () => {
  for (const [itemKey, slot, rendererKey] of APPROVED_CATALOG_ROWS) {
    if (slot === 'name_motion') assert.equal(getNameMotion(rendererKey).key, rendererKey);
    if (slot === 'profile_border') assert.equal(getProfileBorderKey(itemKey), rendererKey);
    if (slot === 'profile_motion') assert.equal(getProfileMotionRendererKey(itemKey), rendererKey);
    if (slot === 'profile_atmosphere') assert.equal(getAtmosphereDefinition(itemKey)?.key, rendererKey);
    if (slot === 'cursor_trail') assert.equal(getCursorTrailKey(itemKey), rendererKey);
    if (slot === 'avatar_effect') assert.equal(getAvatarEffectDefinition(itemKey)?.key, rendererKey);
  }
  assert.equal(getProfileBorderDefinition('border_elastic')?.label, 'Elastic Frame');
  assert.equal(getProfileMotionDefinition('profile_motion_wavefront')?.name, 'Wavefront');
});

test('approved catalog rows preserve slot, renderer value, seed, and additive migration contracts', async () => {
  const [seed, migration] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260821090000_approved_cosmetic_effects.sql')
  ]);
  for (const [itemKey, slot, rendererKey] of APPROVED_CATALOG_ROWS) {
    const row = new RegExp(`\\('${itemKey}', '[^']+', '${slot}', \\d+, 'renderer', '${rendererKey}'`);
    assert.match(seed, row, itemKey);
    assert.match(migration, row, itemKey);
  }
  assert.match(migration, /ON CONFLICT \(item_key\) DO UPDATE/);
  assert.match(migration, /shop_version', '2026-08-21T09:00:00Z'/);
  assert.doesNotMatch(migration, /DELETE FROM public\.shop_items/);
});

test('all four approved name motions draw bounded deterministic frames, including pointer displacement', () => {
  for (const motionKey of ['kinetic-echo', 'magnetic-type', 'neon-particle', 'raster-signal']) {
    const model = getNameFrameModel({
      text: 'Chromadie',
      loadout: { motionKey },
      width: 280,
      height: 58,
      todayColor: '#D84B8E',
      recentColors: ['#45E8FF', '#9B7CFF'],
      time: 1220,
      pointer: motionKey === 'magnetic-type' ? { x: 246, y: 18 } : null
    });
    const context = createRecordingContext();
    assert.equal(drawComposableMotion(context, model, (target, nextModel) => {
      target.fillText?.(nextModel.displayText, nextModel.metrics.x, nextModel.metrics.y);
    }), true, motionKey);
    assert.ok(context.calls.length > 0, motionKey);
  }

  const neutral = getNameFrameModel({ text: 'Chromadie', loadout: { motionKey: 'magnetic-type' }, width: 280, height: 58, time: 1220 });
  const attracted = getNameFrameModel({ text: 'Chromadie', loadout: { motionKey: 'magnetic-type' }, width: 280, height: 58, time: 1220, pointer: { x: 246, y: 18 } });
  const neutralContext = createRecordingContext();
  const attractedContext = createRecordingContext();
  drawComposableMotion(neutralContext, neutral, () => {});
  drawComposableMotion(attractedContext, attracted, () => {});
  const neutralGlyphs = neutralContext.calls.filter(call => call.type === 'fillText');
  const attractedGlyphs = attractedContext.calls.filter(call => call.type === 'fillText');
  assert.equal(neutralGlyphs.length, attractedGlyphs.length);
  assert.notDeepEqual(attractedGlyphs.map(call => call.args.slice(1)), neutralGlyphs.map(call => call.args.slice(1)));
});

test('the three approved reference effects keep their authored visual primitives', async () => {
  const [motions, cursorTrail] = await Promise.all([
    read('src/lib/name/render/composableMotions.js'),
    read('src/lib/cursor-trail/CursorTrailLayer.svelte')
  ]);

  const neonStart = motions.indexOf('function drawNeonParticleName');
  const rasterStart = motions.indexOf('function drawRasterSignal');
  const rasterEnd = motions.indexOf('export function drawComposableMotion');
  const neon = motions.slice(neonStart, rasterStart);
  const raster = motions.slice(rasterStart, rasterEnd);

  assert.match(neon, /getReferenceTextMask\(ctx, model\)/);
  assert.match(neon, /createRadialGradient\(\s*fieldContext/);
  assert.match(neon, /const particleCount = Math\.min\(680/);
  assert.match(neon, /const edgeCount = Math\.min\(240/);
  assert.match(neon, /strokeText\(ctx, model, outline/);
  assert.doesNotMatch(neon, /drawBase\(ctx, model\);\s*\n\s*\n\s*const field/);

  assert.match(raster, /drawText\(ctx, model, MOTION_TEXT_LIGHT/);
  assert.match(raster, /globalCompositeOperation = 'destination-out'/);
  assert.match(raster, /const noiseCount = Math\.min\(320/);
  assert.match(raster, /const pixelCount = Math\.min\(140/);
  assert.doesNotMatch(raster, /#00EFFF|#6E5CFF|#FF4AD4/);

  assert.match(cursorTrail, /const color = particle\.hot \? '#7CFFFA' : '#7A4DFF'/);
  assert.match(cursorTrail, /createRadialGradient\(node\.x, node\.y/);
  assert.match(cursorTrail, /context\.quadraticCurveTo\(controlX, controlY, other\.x, other\.y\)/);
  assert.doesNotMatch(cursorTrail, /const colors = getColors\(\);\n\s*const time = staticFrame/);
});

test('Elastic Frame keeps the content box stable while bending only code-owned paths', () => {
  const neutral = createElasticFramePaths(320, 180);
  const bent = createElasticFramePaths(320, 180, { x: 286, y: 88 });
  assert.match(neutral.outer, /^M /);
  assert.match(neutral.inner, /Z$/);
  assert.notEqual(bent.outer, neutral.outer);
  assert.notEqual(bent.inner, neutral.inner);
  assert.equal(neutral.outer.includes('translate'), false);
});

test('new interaction controllers clean up local listeners, RAF work, and transforms', () => {
  const browser = installBrowserFakes();
  try {
    const elasticHost = new FakeEventTarget({ left: 40, top: 20, width: 320, height: 180 });
    let latestElasticPaths = null;
    const elastic = createElasticFrameController({
      host: elasticHost,
      setPaths: paths => { latestElasticPaths = paths; },
      enabled: true
    });
    const neutralElastic = latestElasticPaths.outer;
    elasticHost.emit('pointermove', { pointerType: 'mouse', clientX: 330, clientY: 72 });
    browser.tick(16);
    assert.notEqual(latestElasticPaths.outer, neutralElastic);
    elastic.destroy();
    assert.equal(elasticHost.listenerCount('pointermove'), 0);
    assert.equal(elasticHost.listenerCount('pointerleave'), 0);

    const haloHost = new FakeEventTarget({ left: 0, top: 0, width: 320, height: 180 });
    const shells = [new FakeEventTarget(), new FakeEventTarget(), new FakeEventTarget()];
    const halo = createHaloOffsetController({ host: haloHost, shells, enabled: true });
    haloHost.emit('pointermove', { pointerType: 'mouse', clientX: 304, clientY: 32 });
    browser.tick(32);
    assert.match(shells[0].style.transform, /translate3d\(/);
    halo.destroy();
    assert.equal(shells[0].style.transform, '');
    assert.equal(haloHost.listenerCount('pointermove'), 0);

    const waveHost = new FakeEventTarget({ left: 100, top: 50, width: 320, height: 180 });
    const piece = new FakeEventTarget({ left: 100 + 240, top: 50 + 70, width: 40, height: 40 });
    const motionElement = { querySelectorAll: () => [piece] };
    const ring = { style: {} };
    const wave = createWavefrontController({ host: waveHost, motionElement, ring, enabled: true });
    waveHost.emit('pointerdown', { pointerType: 'mouse', button: 0, clientX: 180, clientY: 120 });
    const started = performance.now();
    browser.tick(started + 720);
    assert.notEqual(piece.style.translate, undefined);
    browser.tick(started + 1100);
    assert.equal(piece.style.translate, '');
    assert.equal(ring.style.opacity, '0');
    wave.destroy();
    assert.equal(waveHost.listenerCount('pointerdown'), 0);
    assert.equal(waveHost.listenerCount('keydown'), 0);
  } finally {
    browser.restore();
  }
});

test('avatar orbit layers stay centered when the canvas overscans the real avatar host', () => {
  const browser = installBrowserFakes();
  try {
    const host = new FakeEventTarget({ left: 40, top: 20, width: 86, height: 86 });
    const back = createCanvas(createRecordingContext(), { left: 40, top: 20, width: 86, height: 134.15625 });
    const front = createCanvas(createRecordingContext(), { left: 40, top: 20, width: 86, height: 134.15625 });
    const controller = createAvatarOrbitController({ host, backCanvas: back, frontCanvas: front, effectKey: 'butterfly-orbit', enabled: false });
    const expectedWidth = 86 * 1.56;
    const expectedOffset = (86 - expectedWidth) / 2;
    const center = canvas => Number.parseFloat(canvas.style.left) + Number.parseFloat(canvas.style.width) / 2;

    assert.equal(Number.parseFloat(back.style.width), expectedWidth);
    assert.equal(Number.parseFloat(back.style.height), expectedWidth);
    assert.equal(Number.parseFloat(front.style.width), expectedWidth);
    assert.equal(Number.parseFloat(front.style.height), expectedWidth);
    assert.equal(Number.parseFloat(back.style.left), expectedOffset);
    assert.equal(Number.parseFloat(back.style.top), expectedOffset);
    assert.equal(center(back), 43);
    assert.equal(center(front), 43);
    controller.destroy();
  } finally {
    browser.restore();
  }
});

test('reduced motion blocks pointer displacement in the new controllers', () => {
  const browser = installBrowserFakes({ reduced: true });
  try {
    const haloHost = new FakeEventTarget();
    const shells = [new FakeEventTarget(), new FakeEventTarget(), new FakeEventTarget()];
    const halo = createHaloOffsetController({ host: haloHost, shells, enabled: true });
    haloHost.emit('pointermove', { pointerType: 'mouse', clientX: 300, clientY: 10 });
    assert.equal(shells[0].style.transform, 'translate3d(0.00px, 0.00px, 0)');
    halo.destroy();

    const waveHost = new FakeEventTarget();
    const ring = { style: {} };
    const wave = createWavefrontController({ host: waveHost, motionElement: { querySelectorAll: () => [] }, ring, enabled: true });
    waveHost.emit('pointerdown', { pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 });
    assert.equal(ring.style.opacity, undefined);
    wave.destroy();
  } finally {
    browser.restore();
  }
});

test('avatar orbit uses real DOM avatar occlusion with separate front/back canvases and no image copy', async () => {
  const [avatar, orbit, card, fullBleed, preview, shop, editor, shell] = await Promise.all([
    read('src/lib/avatar-effect/AvatarEffect.svelte'),
    read('src/lib/avatar-effect/avatarOrbitRenderer.js'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/profile-layout/ProfileFullBleedLayout.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ShopItemPreview.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileShell.svelte')
  ]);
  assert.match(avatar, /avatar-effect__orbit-canvas--back/);
  assert.match(avatar, /avatar-effect__slot/);
  assert.match(avatar, /avatar-effect__orbit-canvas--front/);
  assert.match(avatar, /avatar-effect__orbit-canvas \{[\s\S]*?max-width: none;/);
  assert.match(orbit, /context\.back/);
  assert.match(orbit, /context\.front/);
  assert.doesNotMatch(orbit, /drawImage/);
  assert.match(card, /profile-reference-card--avatar-orbit/);
  assert.match(fullBleed, /AvatarEffect/);
  assert.match(preview, /ProfileMotionEffect/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.match(shop, /<AvatarEffect/);
  assert.match(editor, /ShopItemPreview/);
  assert.match(shell, /ProfileMotionEffect/);
});

test('public and Studio render-models preserve every new cosmetic through refresh/publish boundaries', () => {
  const configuration = createDefaultProfileConfig('#123456');
  const cosmetics = {
    name_motion: 'name_motion_kinetic_echo',
    profile_border: 'border_elastic',
    profile_motion: 'profile_motion_wavefront',
    profile_atmosphere: 'profile_atmosphere_prism_dust',
    cursor_trail: 'cursor_trail_plasma_swarm',
    avatar_effect: 'avatar_effect_butterfly_orbit'
  };
  const profile = {
    id: 'approved-effects-profile',
    username: 'approved-effects',
    display_name: 'Approved Effects',
    equipped_cosmetics: cosmetics
  };
  const publicSnapshot = buildProfileRenderSnapshot({
    profile,
    profileConfig: { published: configuration },
    mode: 'public',
    previewMode: false
  });
  const studioSnapshot = buildProfileRenderSnapshot({
    profile,
    profileConfig: { draft: configuration, published: configuration },
    studioDraft: configuration,
    cosmeticPreviewLoadout: cosmetics,
    mode: 'studio',
    previewMode: true,
    previewDevice: 'mobile'
  });
  for (const snapshot of [publicSnapshot, studioSnapshot]) {
    assert.equal(snapshot.cosmetics.borderKey, 'border_elastic');
    assert.equal(snapshot.cosmetics.profileMotionKey, 'profile_motion_wavefront');
    assert.equal(snapshot.cosmetics.atmosphereKey, 'profile_atmosphere_prism_dust');
    assert.equal(snapshot.cosmetics.cursorTrailKey, 'plasma-swarm');
    assert.equal(snapshot.cosmetics.avatarEffectKey, 'avatar_effect_butterfly_orbit');
  }
  assert.equal(publicSnapshot.cosmetics.name.motionKey, 'name_motion_kinetic_echo');
  assert.equal(studioSnapshot.cosmetics.name.motionKey, 'name_motion_kinetic_echo');
});
