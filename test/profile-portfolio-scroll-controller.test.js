import test from 'node:test';
import assert from 'node:assert/strict';

import { attachProfilePortfolioScrollController } from '../src/lib/profile-layout/portfolioScrollController.js';

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
    addEventListener(type, handler, options) {
      listeners.set(type, { handler, options });
    },
    removeEventListener(type, handler) {
      if (listeners.get(type)?.handler === handler) listeners.delete(type);
    },
    querySelectorAll() {
      return pages;
    },
    getBoundingClientRect() {
      return { top, bottom, height: bottom - top };
    },
    scrollBy(options) {
      calls.scrollBy.push(options);
    },
    scrollTo(options) {
      calls.scrollTo.push(options);
    },
    emit(type, event = {}) {
      listeners.get(type)?.handler(event);
    }
  };
}

function createController(container, overrides = {}) {
  const state = { activePage: 0, moreActive: false, portfolio: true, reducedMotion: false, pageJumps: [] };
  let initialFrame = null;
  const cancelledFrames = [];
  const cleanup = attachProfilePortfolioScrollController({
    container,
    getMoreElement: () => ({ getBoundingClientRect: () => ({ top: 100 - container.scrollTop }) }),
    isPortfolioLayout: () => state.portfolio,
    getReducedMotion: () => state.reducedMotion,
    getActivePortfolioPage: () => state.activePage,
    onActivePortfolioPageChange: index => { state.activePage = index; },
    onMoreActiveChange: value => { state.moreActive = value; },
    scrollToPortfolioPage: index => { state.pageJumps.push(index); state.activePage = index; },
    now: () => 1000,
    requestFrame: callback => { initialFrame = callback; return 42; },
    cancelFrame: id => cancelledFrames.push(id),
    ...overrides
  });
  return { cleanup, state, get initialFrame() { return initialFrame; }, cancelledFrames };
}

test('scroll updates the nearest portfolio page and profile-more threshold', () => {
  const container = createContainer({
    top: 20,
    bottom: 120,
    pages: [createPage(20, 60), createPage(60, 160)]
  });
  const controller = createController(container);

  controller.initialFrame();
  assert.equal(controller.state.activePage, 1);
  assert.equal(controller.state.moreActive, false);

  container.scrollTop = 40;
  container.emit('scroll');
  assert.equal(controller.state.moreActive, true);

  controller.cleanup();
  assert.deepEqual(controller.cancelledFrames, [42]);
  assert.equal(container.listeners.size, 0);
});

test('vertical wheel steps between pages and locks a continued gesture', () => {
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

test('wheel ignores horizontal and Ctrl gestures, and overflow scrolling respects reduced motion', () => {
  const container = createContainer({ pages: [createPage(0, 140), createPage(140, 240)] });
  const controller = createController(container);
  let prevented = 0;
  const wheel = overrides => ({
    deltaY: 30,
    deltaX: 0,
    ctrlKey: false,
    preventDefault: () => { prevented += 1; },
    ...overrides
  });

  controller.state.portfolio = false;
  container.emit('wheel', wheel({}));
  assert.equal(prevented, 0);
  controller.state.portfolio = true;
  container.emit('wheel', wheel({ deltaY: 10, deltaX: 20 }));
  container.emit('wheel', wheel({ ctrlKey: true }));
  assert.equal(prevented, 0);
  assert.deepEqual(container.calls.scrollBy, []);

  controller.state.reducedMotion = true;
  container.emit('wheel', wheel({}));
  assert.equal(prevented, 1);
  assert.deepEqual(container.calls.scrollBy, [{ top: 80, behavior: 'auto' }]);
  assert.deepEqual(controller.state.pageJumps, []);
  controller.cleanup();
});
