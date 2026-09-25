import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileStudioNavigationController } from '../src/lib/profile-studio/profileStudioNavigation.js';

const visibleSections = [
  { id: 'overview' },
  { id: 'customize' },
  { id: 'premium' },
  { id: 'profile-social' },
  { id: 'profile-insights' },
  { id: 'profile-notifications' },
  { id: 'account' }
];

function createFakeWindow(initialHash = '#customize-appearance') {
  const listeners = new Map();
  const calls = [];
  const location = {
    pathname: '/profile/settings',
    search: '?from=studio',
    hash: initialHash,
    replace(url) {
      calls.push({ type: 'location-replace', url });
    }
  };
  const updateLocation = url => {
    const next = new URL(url, 'https://chromadie.test');
    location.pathname = next.pathname;
    location.search = next.search;
    location.hash = next.hash;
  };
  const history = {
    state: { entry: 'preserve-me' },
    replaceState(state, title, url) {
      calls.push({ type: 'replaceState', state, title, url });
      this.state = state;
      updateLocation(url);
    },
    pushState(state, title, url) {
      calls.push({ type: 'pushState', state, title, url });
      this.state = state;
      updateLocation(url);
    }
  };
  const windowRef = {
    location,
    history,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type, detail = undefined) {
      const event = {
        type,
        detail,
        defaultPrevented: false,
        returnValue: undefined,
        preventDefault() {
          this.defaultPrevented = true;
        }
      };
      for (const listener of [...(listeners.get(type) || [])]) listener(event);
      return event;
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    }
  };
  return { windowRef, calls, location, history };
}

function createHarness({ hash, dirty = false } = {}) {
  const fake = createFakeWindow(hash);
  let activeSection = 'customize';
  let activeCustomizeTab = 'appearance';
  let navigationDirty = dirty;
  const sectionCalls = [];
  const tabChanges = [];
  const prompts = [];
  let customizeLoads = 0;
  const controller = createProfileStudioNavigationController({
    windowRef: fake.windowRef,
    getVisibleSections: () => visibleSections,
    getActiveSection: () => activeSection,
    getActiveCustomizeTab: () => activeCustomizeTab,
    isNavigationDirty: () => navigationDirty,
    setActiveSection(sectionId, options) {
      sectionCalls.push({ sectionId, ...options });
      activeSection = sectionId;
      if (sectionId === 'customize' && options?.customizeTab) activeCustomizeTab = options.customizeTab;
    },
    onCustomizeTabChange(tabId) {
      activeCustomizeTab = tabId;
      tabChanges.push(tabId);
    },
    loadCustomizeComponents() {
      customizeLoads += 1;
    },
    openDirtyPrompt(navigation) {
      prompts.push(navigation);
    }
  });
  return {
    ...fake,
    controller,
    sectionCalls,
    tabChanges,
    prompts,
    get customizeLoads() { return customizeLoads; },
    get activeSection() { return activeSection; },
    get activeCustomizeTab() { return activeCustomizeTab; },
    set navigationDirty(value) { navigationDirty = value; }
  };
}

test('initial location applies section, Customize tab, and recognized legacy hash', () => {
  const harness = createHarness({ hash: '#profile-aliases' });

  harness.controller.start();

  assert.deepEqual(harness.sectionCalls, [{
    sectionId: 'customize',
    push: false,
    customizeTab: 'links',
    hash: 'profile-aliases'
  }]);
  assert.equal(harness.activeCustomizeTab, 'links');
  assert.equal(harness.windowRef.listenerCount('hashchange'), 1);
});

test('start is idempotent while the controller is active', () => {
  const harness = createHarness();

  harness.controller.start();
  harness.controller.start();

  assert.equal(harness.sectionCalls.length, 1);
  for (const type of ['hashchange', 'popstate', 'beforeunload', 'chromadie:navigation-request']) {
    assert.equal(harness.windowRef.listenerCount(type), 1);
  }
});

test('clean history navigation applies a section without pushing and keeps recognized raw hashes', () => {
  const harness = createHarness();
  harness.controller.start();
  harness.sectionCalls.length = 0;
  harness.location.hash = '#profile-social';

  harness.windowRef.emit('popstate');

  assert.deepEqual(harness.sectionCalls, [{
    sectionId: 'profile-social',
    push: false,
    customizeTab: null,
    hash: 'profile-social'
  }]);
});

test('dirty cross-section history navigation restores current URL then prompts', () => {
  const harness = createHarness({ hash: '#customize-media', dirty: true });
  harness.controller.start();
  harness.sectionCalls.length = 0;
  const currentState = harness.history.state;
  harness.location.hash = '#profile-social';

  harness.windowRef.emit('hashchange');

  assert.equal(harness.activeSection, 'customize');
  assert.equal(harness.location.pathname, '/profile/settings');
  assert.equal(harness.location.search, '?from=studio');
  assert.equal(harness.location.hash, '#customize-media');
  assert.equal(harness.calls.at(-1).type, 'replaceState');
  assert.equal(harness.calls.at(-1).state, currentState);
  assert.deepEqual(harness.prompts, [{ type: 'section', value: 'profile-social', customizeTab: null }]);
  assert.deepEqual(harness.sectionCalls, []);
});

test('same-section Customize tab history changes apply immediately while dirty', () => {
  const harness = createHarness({ dirty: true });
  harness.controller.start();
  harness.sectionCalls.length = 0;
  harness.location.hash = '#customize-content';

  harness.windowRef.emit('hashchange');

  assert.equal(harness.activeCustomizeTab, 'content');
  assert.deepEqual(harness.tabChanges, ['content']);
  assert.equal(harness.customizeLoads, 1);
  assert.deepEqual(harness.prompts, []);
  assert.deepEqual(harness.sectionCalls, []);
});

test('unknown history hashes normalize to the default Customize tab', () => {
  const harness = createHarness({ hash: '#profile-social' });
  harness.controller.start();
  harness.sectionCalls.length = 0;
  harness.location.hash = '#not-a-section';

  harness.windowRef.emit('hashchange');

  assert.deepEqual(harness.prompts, []);
  assert.deepEqual(harness.sectionCalls.at(-1), {
    sectionId: 'customize',
    push: false,
    customizeTab: null,
    hash: null
  });
});

test('beforeunload and app navigation events consult live dirty state and retain target types', () => {
  const harness = createHarness();
  harness.controller.start();

  const cleanUnload = harness.windowRef.emit('beforeunload');
  const cleanNavigation = harness.windowRef.emit('chromadie:navigation-request', { nextPath: '/collection' });
  assert.equal(cleanUnload.defaultPrevented, false);
  assert.equal(cleanNavigation.defaultPrevented, false);

  harness.navigationDirty = true;
  const dirtyUnload = harness.windowRef.emit('beforeunload');
  const routeNavigation = harness.windowRef.emit('chromadie:navigation-request', { navigation: { to: '/progression' } });
  const pathNavigation = harness.windowRef.emit('chromadie:navigation-request', { nextPath: '/collection' });
  const fallbackPathNavigation = harness.windowRef.emit('chromadie:navigation-request');

  assert.equal(dirtyUnload.defaultPrevented, true);
  assert.equal(dirtyUnload.returnValue, '');
  assert.equal(routeNavigation.defaultPrevented, true);
  assert.equal(pathNavigation.defaultPrevented, true);
  assert.equal(fallbackPathNavigation.defaultPrevented, true);
  assert.deepEqual(harness.prompts, [
    { type: 'navigate', value: { to: '/progression' } },
    { type: 'path', value: '/collection' },
    { type: 'path', value: '/profile/settings' }
  ]);
});

test('stop removes all browser listeners and prevents later navigation callbacks', () => {
  const harness = createHarness({ dirty: true });
  harness.controller.start();
  harness.controller.stop();

  for (const type of ['hashchange', 'popstate', 'beforeunload', 'chromadie:navigation-request']) {
    assert.equal(harness.windowRef.listenerCount(type), 0);
  }
  harness.windowRef.emit('chromadie:navigation-request', { nextPath: '/collection' });
  assert.deepEqual(harness.prompts, []);
});
