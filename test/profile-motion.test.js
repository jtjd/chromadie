import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_MOTION_DEFINITIONS,
  getProfileMotionDefinition,
  getProfileMotionRendererKey,
  isProfileMotionKey
} from '../src/lib/profile-motion/profileMotions.js';
import {
  PROFILE_MOTION_RESTING_TRANSFORM,
  createProfileMotionController
} from '../src/lib/profile-motion/profileMotionController.js';
import {
  getShopContextForSlot,
  tryOnShopItem
} from '../src/lib/shopCatalog.js';
import {
  PROFILE_LAYOUT_KEYS,
  getProfileLayoutMotionTarget
} from '../src/lib/profile-layout/profileLayouts.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

class FakeEventTarget {
  constructor(rect = null) {
    this.listeners = new Map();
    this.style = {};
    this.parentElement = null;
    this.rect = rect;
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

  getBoundingClientRect() {
    return this.rect || { left: 0, top: 0, width: 0, height: 0 };
  }
}

function installMotionWindow({ fine = true, reduced = false, width = 1440, height = 900 } = {}) {
  const previousWindow = globalThis.window;
  const fakeWindow = new FakeEventTarget();
  fakeWindow.innerWidth = width;
  fakeWindow.innerHeight = height;
  fakeWindow.matchMedia = query => {
    const matches = query.includes('prefers-reduced-motion')
      ? reduced
      : query.includes('hover') || query.includes('pointer')
        ? fine
        : width > 930;
    return { matches, addEventListener() {}, removeEventListener() {} };
  };
  globalThis.window = fakeWindow;
  return () => { globalThis.window = previousWindow; };
}

test('the profile motion catalog exposes one free perspective tilt renderer', async () => {
  const [seed, migration, editor] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260814050000_profile_motion_perspective_tilt.sql'),
    read('src/lib/ProfileCosmeticsEditor.svelte')
  ]);
  const definition = getProfileMotionDefinition('profile_motion_perspective_tilt');

  assert.deepEqual(definition, {
    itemKey: 'profile_motion_perspective_tilt',
    slot: 'profile_motion',
    key: 'perspective-tilt',
    name: '3D Tilt'
  });
  assert.equal(PROFILE_MOTION_DEFINITIONS.profile_motion_perspective_tilt.slot, 'profile_motion');
  assert.equal(getProfileMotionRendererKey('perspective-tilt'), 'perspective-tilt');
  assert.equal(isProfileMotionKey('not-a-motion'), false);
  assert.match(seed, /'profile_motion_perspective_tilt', '3D Tilt', 'profile_motion', 0, 'renderer', 'perspective-tilt'/);
  assert.match(migration, /slot = 'profile_motion' AND css_value IN \('perspective-tilt'\)/);
  assert.match(editor, /id="cosmetic-profile-motion"/);
  assert.match(editor, /<option value="">No motion<\/option>/);
});

test('profile motion equipment is a normal one-slot loadout operation', () => {
  const item = {
    item_key: 'profile_motion_perspective_tilt',
    slot: 'profile_motion',
    catalog_status: 'active',
    access_tier: 'free'
  };
  const next = tryOnShopItem({
    profile_motion: 'profile_motion_old',
    profile_border: 'border_signal'
  }, item);

  assert.equal(getShopContextForSlot('profile_motion'), 'profile');
  assert.equal(next.profile_motion, item.item_key);
  assert.equal(next.profile_border, 'border_signal');
  assert.equal(Object.keys(next).filter(key => key === 'profile_motion').length, 1);
});

test('layout metadata identifies the bounded content target instead of the page', () => {
  assert.deepEqual(
    PROFILE_LAYOUT_KEYS.map(getProfileLayoutMotionTarget),
    ['layout-frame', 'layout-frame', 'layout-frame', 'layout-frame', 'identity-frame', 'full-bleed-identity']
  );
});

test('homepage, public profiles, and Studio consume one motion renderer with separate surfaces', async () => {
  const [motion, homepage, shell, studio, demo, stores] = await Promise.all([
    read('src/lib/profile-motion/ProfileMotionEffect.svelte'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/stores.js')
  ]);

  assert.match(homepage, /import ProfileMotionEffect from '\.\.\/profile-motion\/ProfileMotionEffect\.svelte'/);
  assert.match(homepage, /<ProfileMotionEffect[\s\S]*inputSurface="viewport"/);
  assert.match(shell, /import ProfileMotionEffect from '\.\/profile-motion\/ProfileMotionEffect\.svelte'/);
  assert.match(shell, /motionKey=\{profileMotionTarget === 'none' \? '' : profileMotionKey\}/);
  assert.match(shell, /inputSurface=\{previewMode \? 'container' : 'viewport'\}/);
  assert.match(studio, /surfaceElement=\{previewStage\}/);
  assert.match(studio, /inputSurface="container"/);
  assert.match(stores, /'profile_motion'\]\)/);
  assert.match(stores, /isProfileMotionKey/);
  assert.match(motion, /\{#if motionEnabled\}/);
  assert.match(motion, /\{:else\}[\s\S]*<slot><\/slot>/);
  assert.match(motion, /if \(!motionEnabled \|\| !motionElement\) \{/);
  assert.doesNotMatch(demo, /ProfileMotionEffect|ProfileShell|ProfileLayoutFrame/);
});

test('the canonical controller applies the supplied viewport and container formulas', () => {
  const restoreWindow = installMotionWindow();
  try {
    const motionElement = new FakeEventTarget();
    const controller = createProfileMotionController({ motionElement, inputSurface: 'viewport' });
    assert.equal(motionElement.style.transform, PROFILE_MOTION_RESTING_TRANSFORM);

    window.emit('pointermove', { clientX: 0, clientY: 0, pointerType: 'mouse' });
    assert.equal(motionElement.style.transform, 'rotateY(12deg) rotateX(-7.5deg)');
    window.emit('pointerout', { relatedTarget: null });
    assert.equal(motionElement.style.transform, PROFILE_MOTION_RESTING_TRANSFORM);

    controller.destroy();
    assert.equal(motionElement.style.transform, 'none');

    const container = new FakeEventTarget({ left: 100, top: 50, width: 400, height: 200 });
    const containerMotion = new FakeEventTarget();
    const containerController = createProfileMotionController({
      motionElement: containerMotion,
      surfaceElement: container,
      inputSurface: 'container'
    });
    container.emit('pointermove', { clientX: 100, clientY: 50, pointerType: 'mouse' });
    assert.equal(containerMotion.style.transform, 'rotateY(3.3333333333333335deg) rotateX(-1.6666666666666667deg)');
    containerController.destroy();
  } finally {
    restoreWindow();
  }
});

test('coarse pointers and reduced motion disable tilt, and destroy removes listeners', () => {
  for (const options of [{ fine: false }, { reduced: true }]) {
    const restoreWindow = installMotionWindow(options);
    try {
      const motionElement = new FakeEventTarget();
      const controller = createProfileMotionController({ motionElement });
      assert.equal(window.listeners.get('pointermove')?.size || 0, 0);
      assert.equal(motionElement.style.transform, 'none');
      controller.destroy();
    } finally {
      restoreWindow();
    }
  }

  const restoreWindow = installMotionWindow();
  try {
    const motionElement = new FakeEventTarget();
    const controller = createProfileMotionController({ motionElement });
    assert.equal(window.listeners.get('pointermove')?.size, 1);
    assert.equal(window.listeners.get('blur')?.size, 1);
    controller.destroy();
    assert.equal(window.listeners.get('pointermove')?.size, 0);
    assert.equal(window.listeners.get('pointerout')?.size, 0);
    assert.equal(window.listeners.get('blur')?.size, 0);
  } finally {
    restoreWindow();
  }
});

test('motion owns rotation while the inner card owns roll scale, with no bundled visual chrome', async () => {
  const [motion, homepage, shell] = await Promise.all([
    read('src/lib/profile-motion/ProfileMotionEffect.svelte'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/ProfileShell.svelte')
  ]);

  assert.match(motion, /perspective: 1200px/);
  assert.match(motion, /transform: rotateY\(-4deg\) rotateX\(2deg\)/);
  assert.match(motion, /transition: transform 0\.2s cubic-bezier\(\.23, 1, \.32, 1\)/);
  assert.match(motion, /will-change: transform/);
  assert.doesNotMatch(motion, /requestAnimationFrame|lerp|spring|radial-gradient|box-shadow|glare|halo|avatar/);
  assert.match(homepage, /<ProfileMotionEffect[\s\S]*<div class="homepage-profile-pop"/);
  assert.match(shell, /<ProfileMotionEffect[\s\S]*<div class="profile-shell__card-scale"/);
  assert.match(homepage, /homepage-profile-pop--active=\{profileImpactActive\}/);
  assert.match(shell, /profile-shell__card-scale \{\n\s+animation: profile-shell-roll-settle/);
  assert.doesNotMatch(homepage, /handleViewportPointerMove|animateTilt|profileTilt/);
});
