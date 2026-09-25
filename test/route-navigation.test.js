import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteNavigationController } from '../src/lib/routeNavigation.js';

class FakeElement {
  constructor(anchor = null) {
    this.anchor = anchor;
  }

  closest(selector) {
    assert.equal(selector, 'a[href]');
    return this.anchor;
  }
}

class FakeAnchor extends FakeElement {
  constructor(href, { target = '', download = false } = {}) {
    super();
    this.href = href;
    this.target = target;
    this.download = download;
  }

  hasAttribute(name) {
    return name === 'download' && this.download;
  }
}

class FakeCustomEvent {
  constructor(type, { detail, cancelable = false } = {}) {
    this.type = type;
    this.detail = detail;
    this.cancelable = cancelable;
    this.defaultPrevented = false;
  }

  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }
}

function createWindow(href = 'https://chromadie.test/') {
  const calls = [];
  const listeners = new Map();
  const removed = [];
  const windowRef = {
    Element: FakeElement,
    HTMLAnchorElement: FakeAnchor,
    CustomEvent: FakeCustomEvent,
    location: new URL(href, 'https://chromadie.test'),
    history: {
      pushState: (...args) => calls.push(['pushState', ...args]),
      replaceState: (...args) => calls.push(['replaceState', ...args])
    },
    dispatchEvent(event) {
      calls.push(['guard', event]);
      return !event.defaultPrevented;
    },
    addEventListener(type, handler) {
      calls.push(['addListener', type]);
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      calls.push(['removeListener', type]);
      removed.push([type, handler]);
    }
  };
  return { windowRef, calls, listeners, removed };
}

function createClickEvent(windowRef, href, options = {}) {
  const anchor = new FakeAnchor(new URL(href, windowRef.location.href).href, options);
  const event = {
    defaultPrevented: options.defaultPrevented || false,
    button: options.button ?? 0,
    metaKey: options.metaKey || false,
    ctrlKey: options.ctrlKey || false,
    shiftKey: options.shiftKey || false,
    altKey: options.altKey || false,
    target: new FakeElement(anchor),
    prevented: false,
    preventDefault() { this.prevented = true; }
  };
  return event;
}

function createController(windowRef, calls, overrides = {}) {
  const getRouteMode = overrides.getRouteMode || (() => 'app');
  const getView = overrides.getView || (() => 'home');
  const isChallengeActive = overrides.isChallengeActive || (() => false);
  return createRouteNavigationController(
    windowRef,
    pathname => getRouteMode() === 'app' && getView() === 'game' && isChallengeActive() && !pathname.startsWith('/c/'),
    overrides.parseRoute || (() => calls.push(['parse'])),
    overrides.focusRouteContent || (() => calls.push(['focus'])),
    overrides.clearChallengeState || (() => calls.push(['clearChallenge']))
  );
}

test('guarded navigation preserves the guard, challenge cleanup, history, route, and focus order', () => {
  const { windowRef, calls } = createWindow('https://chromadie.test/c/challenge-1');
  const controller = createController(windowRef, calls, {
    getView: () => 'game',
    isChallengeActive: () => true
  });

  controller.navigateToPath('/profile/settings?tab=customize#appearance', {
    view: 'profile-settings'
  });

  assert.deepEqual(calls.map(([name]) => name), ['guard', 'clearChallenge', 'pushState', 'parse', 'focus']);
  const guard = calls[0][1];
  assert.equal(guard.type, 'chromadie:navigation-request');
  assert.equal(guard.detail.nextPath, '/profile/settings?tab=customize#appearance');
  assert.deepEqual(guard.detail.navigation, { view: 'profile-settings' });
  assert.deepEqual(calls[2].slice(1), [{}, '', '/profile/settings?tab=customize#appearance']);
});

test('guard cancellation blocks challenge cleanup and every later navigation effect', () => {
  const { windowRef, calls } = createWindow('/c/challenge-1');
  windowRef.dispatchEvent = event => {
    calls.push(['guard', event]);
    event.preventDefault();
    return false;
  };
  const controller = createController(windowRef, calls, {
    getView: () => 'game',
    isChallengeActive: () => true
  });

  controller.navigateToPath('/profile/settings');

  assert.deepEqual(calls.map(([name]) => name), ['guard']);
});

test('navigating to another challenge path keeps the active challenge state', () => {
  const { windowRef, calls } = createWindow('/c/challenge-1');
  const controller = createController(windowRef, calls, {
    getView: () => 'game',
    isChallengeActive: () => true
  });

  controller.navigateToPath('/c/challenge-2');

  assert.deepEqual(calls.map(([name]) => name), ['guard', 'pushState', 'parse', 'focus']);
});

test('internal-link interception leaves native and non-SPA navigations alone', () => {
  const { windowRef, calls, listeners } = createWindow('https://chromadie.test/profile/settings?keep=1');
  const controller = createController(windowRef, calls);
  controller.start();
  const handleClick = listeners.get('click');
  calls.length = 0;
  const cases = [
    ['/profile/settings', { defaultPrevented: true }],
    ['/profile/settings', { metaKey: true }],
    ['/profile/settings', { ctrlKey: true }],
    ['/profile/settings', { shiftKey: true }],
    ['/profile/settings', { altKey: true }],
    ['/profile/settings', { button: 1 }],
    ['/outside-site', { target: '_blank' }],
    ['/download', { download: true }],
    ['/profile/settings?keep=1', {}],
    ['/not-a-spa-route', {}],
    ['https://elsewhere.test/profile/settings', {}]
  ];

  for (const [href, options] of cases) {
    const event = createClickEvent(windowRef, href, options);
    handleClick(event);
    assert.equal(event.prevented, false, href);
  }
  assert.deepEqual(calls, []);
});

test('same-origin app, auth, and information links use SPA navigation', () => {
  for (const [href, options] of [
    ['/profile/settings', {}],
    ['/signup?next=%2Fprofile', {}],
    ['/privacy', {}],
    ['/terms', {}],
    ['/how-to-play', {}],
    ['/privacy?target=self', { target: '_self' }]
  ]) {
    const { windowRef, calls, listeners } = createWindow();
    const controller = createController(windowRef, calls);
    controller.start();
    const handleClick = listeners.get('click');
    calls.length = 0;
    const event = createClickEvent(windowRef, href, options);

    handleClick(event);

    assert.equal(event.prevented, true, href);
    assert.deepEqual(calls.map(([name]) => name), ['guard', 'pushState', 'parse', 'focus']);
    const nextUrl = new URL(href, windowRef.location.href);
    assert.deepEqual(calls[1].slice(1), [{}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`]);
  }
});

test('same-page fragment links retain native hash navigation for page controllers', () => {
  const { windowRef, calls, listeners } = createWindow('https://chromadie.test/profile/settings#overview');
  const controller = createController(windowRef, calls);
  controller.start();
  calls.length = 0;
  const event = createClickEvent(windowRef, '/profile/settings#profile-links');

  listeners.get('click')(event);

  assert.equal(event.prevented, false);
  assert.deepEqual(calls, []);
});

test('popstate restores route focus and listener ownership is idempotent', () => {
  const { windowRef, calls, listeners, removed } = createWindow();
  const controller = createController(windowRef, calls);

  controller.start();
  assert.deepEqual(calls, [['addListener', 'popstate'], ['addListener', 'click']]);
  const clickHandler = listeners.get('click');
  const popstateHandler = listeners.get('popstate');
  calls.length = 0;

  listeners.get('popstate')();
  assert.deepEqual(calls.map(([name]) => name), ['parse', 'focus']);
  calls.length = 0;

  controller.start();
  controller.start();
  assert.deepEqual(calls, []);
  controller.stop();
  controller.stop();
  assert.deepEqual(removed, [['popstate', popstateHandler], ['click', clickHandler]]);
  assert.deepEqual(calls, [['removeListener', 'popstate'], ['removeListener', 'click']]);
});
