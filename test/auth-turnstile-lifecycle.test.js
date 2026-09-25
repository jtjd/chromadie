import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurnstileLifecycle } from '../src/lib/auth/turnstileLifecycle.js';

function createHarness({ siteKey = 'test-site-key', hasContainer = true } = {}) {
  const calls = { rendered: [], reset: [], removed: [], reload: 0 };
  const states = [];
  const errors = [];
  const intervals = new Map();
  let nextIntervalId = 1;
  let containerVisible = hasContainer;

  const windowRef = {
    turnstile: null,
    location: {
      reload() {
        calls.reload += 1;
      }
    }
  };
  const documentRef = {
    getElementById(id) {
      return id === 'turnstile-container' && containerVisible ? {} : null;
    }
  };
  const controller = createTurnstileLifecycle({
    windowRef,
    documentRef,
    siteKey,
    onState: state => states.push(state),
    onError: message => errors.push(message),
    setIntervalFn(callback, delay) {
      const id = nextIntervalId++;
      intervals.set(id, { callback, delay });
      return id;
    },
    clearIntervalFn(id) {
      intervals.delete(id);
    }
  });

  return {
    calls,
    states,
    errors,
    intervals,
    windowRef,
    controller,
    setContainerVisible(value) {
      containerVisible = value;
    },
    installApi() {
      windowRef.turnstile = {
        render(selector, options) {
          const id = `widget-${calls.rendered.length + 1}`;
          calls.rendered.push({ id, selector, options });
          return id;
        },
        reset(id) {
          calls.reset.push(id);
        },
        remove(id) {
          calls.removed.push(id);
        }
      };
    },
    tick(count = 1) {
      for (let tick = 0; tick < count; tick += 1) {
        for (const { callback } of [...intervals.values()]) callback();
      }
    }
  };
}

test('polls for the API and renders once when the visible form has a container', () => {
  const harness = createHarness();
  harness.controller.start();
  assert.equal([...harness.intervals.values()][0].delay, 200);
  assert.equal(harness.calls.rendered.length, 0);

  harness.installApi();
  harness.tick();
  harness.controller.render();

  assert.equal(harness.intervals.size, 0);
  assert.equal(harness.calls.rendered.length, 1);
  assert.equal(harness.calls.rendered[0].selector, '#turnstile-container');
  assert.equal(harness.calls.rendered[0].options.sitekey, 'test-site-key');
  assert.deepEqual(harness.states, ['ready', 'ready']);
});

test('waits for the stepped signup form to expose the widget container', () => {
  const harness = createHarness({ hasContainer: false });
  harness.controller.start();
  harness.installApi();
  harness.tick();

  assert.equal(harness.calls.rendered.length, 0);
  harness.setContainerVisible(true);
  harness.controller.render();
  assert.equal(harness.calls.rendered.length, 1);
});

test('tracks token, expiry, and widget error callbacks', () => {
  const harness = createHarness();
  harness.installApi();
  harness.controller.start();
  harness.tick();
  const callbacks = harness.calls.rendered[0].options;

  callbacks.callback('captcha-token');
  assert.equal(harness.controller.getToken(), 'captcha-token');
  callbacks['expired-callback']();
  assert.equal(harness.controller.getToken(), null);
  callbacks.callback('new-token');
  callbacks['error-callback']();

  assert.equal(harness.controller.getToken(), null);
  assert.equal(harness.states.at(-1), 'error');
  assert.deepEqual(harness.errors, ['The security check failed to load. Please retry.']);
});

test('reset and remove clear the token and use the current widget id', () => {
  const harness = createHarness();
  harness.installApi();
  harness.controller.start();
  harness.tick();
  const firstWidget = harness.calls.rendered[0];
  firstWidget.options.callback('captcha-token');

  harness.controller.reset();
  assert.deepEqual(harness.calls.reset, ['widget-1']);
  assert.equal(harness.controller.getToken(), null);

  firstWidget.options.callback('another-token');
  harness.controller.remove();
  assert.deepEqual(harness.calls.removed, ['widget-1']);
  assert.equal(harness.controller.getToken(), null);
  harness.controller.render();
  assert.equal(harness.calls.rendered.length, 2);
});

test('retry reloads without the API and replaces the current widget when ready', () => {
  const harness = createHarness();
  harness.controller.retry();
  assert.equal(harness.calls.reload, 1);
  assert.equal(harness.states[0], 'loading');

  harness.installApi();
  harness.controller.start();
  harness.tick();
  harness.controller.retry();

  assert.deepEqual(harness.calls.removed, ['widget-1']);
  assert.equal(harness.calls.rendered.length, 2);
  assert.equal(harness.states.at(-1), 'ready');
});

test('reports the same timeout after 50 polls and stops polling', () => {
  const harness = createHarness();
  harness.controller.start();
  harness.tick(49);
  assert.equal(harness.states.includes('error'), false);

  harness.tick();
  assert.equal(harness.intervals.size, 0);
  assert.equal(harness.states.at(-1), 'error');
  assert.deepEqual(harness.errors, [
    'The security check could not load. Check your connection or content blocker, then retry.'
  ]);
});

test('teardown clears polling, removes the widget, and ignores late callbacks', () => {
  const harness = createHarness();
  harness.installApi();
  harness.controller.start();
  harness.tick();
  const callback = harness.calls.rendered[0].options.callback;

  harness.controller.stop();
  callback('late-token');

  assert.equal(harness.intervals.size, 0);
  assert.deepEqual(harness.calls.removed, ['widget-1']);
  assert.equal(harness.controller.getToken(), null);
});
