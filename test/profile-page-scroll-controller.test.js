import test from 'node:test';
import assert from 'node:assert/strict';

import { attachProfilePageScrollController } from '../src/lib/profile-layout/profilePageScrollController.js';

function createPage(top, bottom) {
  return { getBoundingClientRect: () => ({ top, bottom }) };
}

function createContainer({ top = 0, bottom = 100, clientHeight = 100, pages = [] } = {}) {
  const listeners = new Map();
  const calls = { scrollBy: [], scrollTo: [] };
  return {
    clientHeight,
    scrollTop: 0,
    listeners,
    calls,
    addEventListener(type, handler, options) { listeners.set(type, { handler, options }); },
    removeEventListener(type, handler) {
      if (listeners.get(type)?.handler === handler) listeners.delete(type);
    },
    querySelectorAll() { return pages; },
    getBoundingClientRect() { return { top, bottom, height: bottom - top }; },
    scrollBy(options) { calls.scrollBy.push(options); },
    scrollTo(options) { calls.scrollTo.push(options); },
    emit(type, event = {}) { listeners.get(type)?.handler(event); }
  };
}

function createController(container, overrides = {}) {
  const state = { activePage: 0, enabled: true, reducedMotion: false, pageJumps: [] };
  let initialFrame = null;
  const cancelledFrames = [];
  const cleanup = attachProfilePageScrollController({
    container,
    isPageScrollEnabled: () => state.enabled,
    getReducedMotion: () => state.reducedMotion,
    getActiveProfilePage: () => state.activePage,
    onActiveProfilePageChange: index => { state.activePage = index; },
    scrollToProfilePage: index => { state.pageJumps.push(index); state.activePage = index; },
    now: () => 1000,
    requestFrame: callback => { initialFrame = callback; return 42; },
    cancelFrame: id => cancelledFrames.push(id),
    ...overrides
  });
  return { cleanup, state, get initialFrame() { return initialFrame; }, cancelledFrames };
}

test('scroll updates the active full-page section and cleans up listeners', () => {
  const container = createContainer({ pages: [createPage(0, 40), createPage(40, 140)] });
  const controller = createController(container);

  controller.initialFrame();
  assert.equal(controller.state.activePage, 1);
  controller.cleanup();
  assert.deepEqual(controller.cancelledFrames, [42]);
  assert.equal(container.listeners.size, 0);
});

test('vertical wheel scroll steps to progress and locks a continued gesture', () => {
  const container = createContainer({ pages: [createPage(0, 100), createPage(100, 200)] });
  const controller = createController(container);
  let prevented = 0;
  const event = { deltaY: 30, deltaX: 0, ctrlKey: false, preventDefault: () => { prevented += 1; } };

  container.emit('wheel', event);
  container.emit('wheel', event);

  assert.equal(prevented, 2);
  assert.deepEqual(controller.state.pageJumps, [1]);
  controller.cleanup();
});

test('horizontal and Ctrl gestures pass through; an overflowing progress page scrolls naturally', () => {
  const container = createContainer({ pages: [createPage(0, 100), createPage(100, 240)] });
  const controller = createController(container);
  let prevented = 0;
  const wheel = overrides => ({
    deltaY: 30,
    deltaX: 0,
    ctrlKey: false,
    preventDefault: () => { prevented += 1; },
    ...overrides
  });

  container.emit('wheel', wheel({ deltaY: 10, deltaX: 20 }));
  container.emit('wheel', wheel({ ctrlKey: true }));
  assert.equal(prevented, 0);

  controller.state.activePage = 1;
  controller.state.reducedMotion = true;
  container.emit('wheel', wheel({}));
  assert.equal(prevented, 1);
  assert.deepEqual(container.calls.scrollBy, [{ top: 80, behavior: 'auto' }]);
  assert.deepEqual(controller.state.pageJumps, []);
  controller.cleanup();
});

test('the last page leaves wheel input available for profile social controls', () => {
  const container = createContainer({ pages: [createPage(-100, 0), createPage(0, 100)] });
  const controller = createController(container);
  controller.state.activePage = 1;
  let prevented = false;

  container.emit('wheel', { deltaY: 25, deltaX: 0, ctrlKey: false, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.deepEqual(container.calls.scrollBy, []);
  controller.cleanup();
});

test('the controller is inert when the owner hides the progress page', () => {
  const container = createContainer({ pages: [createPage(0, 100), createPage(100, 200)] });
  const controller = createController(container);
  controller.state.enabled = false;
  let prevented = false;

  container.emit('wheel', { deltaY: 25, deltaX: 0, ctrlKey: false, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.deepEqual(controller.state.pageJumps, []);
  controller.cleanup();
});
