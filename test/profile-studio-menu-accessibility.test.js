import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/lib/ProfileStudioShell.svelte', import.meta.url), 'utf8');
const handlers = source.slice(source.indexOf('  function navigate('), source.indexOf('  onMount('));

function menuHarness() {
  const focused = [];
  const items = [0, 1, 2].map(index => ({ focus: () => focused.push(index) }));
  const context = vm.createContext({
    moreOpen: true,
    moreTrigger: { focus: () => focused.push('trigger'), contains: () => false },
    moreMenu: {
      contains: target => items.includes(target),
      querySelectorAll: selector => {
        assert.equal(selector, '[role="menuitem"]:not(:disabled)');
        return items;
      }
    },
    requestAnimationFrame: callback => callback(),
    dispatch: () => {}
  });
  vm.runInContext(handlers, context);
  return { context, items, focused };
}

test('More keyboard navigation wraps, skips disabled actions, and supports boundaries', () => {
  const { context, items, focused } = menuHarness();
  for (const [key, index] of [['ArrowDown', 2], ['ArrowUp', 0], ['Home', 1], ['End', 0]]) {
    context.handleMenuKeydown({ key, currentTarget: items[index], preventDefault() {} });
  }
  assert.deepEqual(focused, [0, 2, 0, 2]);
});

test('More trigger opens at either end and Escape restores focus', () => {
  const { context, focused } = menuHarness();
  for (const key of ['ArrowDown', 'ArrowUp']) context.handleTriggerKeydown({ key, preventDefault() {} });
  context.handleWindowKeydown({ key: 'Escape', preventDefault() {} });
  assert.deepEqual(focused, [0, 2, 'trigger']);
  assert.equal(context.moreOpen, false);
});

test('Moving focus outside dismisses More; selecting a destination preserves focus', () => {
  const { context, items, focused } = menuHarness();
  context.handleDocumentFocusin({ target: items[0] });
  assert.equal(context.moreOpen, true);
  context.handleDocumentFocusin({ target: {} });
  assert.equal(context.moreOpen, false);
  context.moreOpen = true;
  context.navigate('account');
  assert.deepEqual(focused, ['trigger']);
});
