import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProfileStudioLazyComponents } from '../src/lib/profile-studio/lazyComponents.js';

const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');

function deferred() {
  let resolve;
  const promise = new Promise(fulfill => { resolve = fulfill; });
  return { promise, resolve };
}

test('concurrent section requests are deduplicated and loading spans all pending chunks', async () => {
  const content = deferred();
  const media = deferred();
  const changes = [];
  const lazy = createProfileStudioLazyComponents({
    sectionLoaders: {
      'profile-content': () => content.promise,
      'profile-media': () => media.promise
    },
    onChange: state => changes.push(state)
  });

  const contentRequest = lazy.loadSection('profile-content');
  const duplicateContentRequest = lazy.loadSection('profile-content');
  const mediaRequest = lazy.loadSection('profile-media');
  assert.equal(contentRequest, duplicateContentRequest);
  assert.equal(lazy.getState().sectionLoading, true);

  content.resolve({ default: 'LoadedContentSection' });
  await contentRequest;
  assert.equal(lazy.getState().sectionLoading, true);
  assert.equal(lazy.getState().sectionComponents['profile-content'], 'LoadedContentSection');

  media.resolve({ default: 'LoadedMediaSection' });
  await mediaRequest;
  assert.equal(lazy.getState().sectionLoading, false);
  assert.equal(lazy.getState().sectionComponents['profile-media'], 'LoadedMediaSection');
  assert.ok(changes.some(state => state.sectionLoading));
});

test('a failed lazy section load can be retried through the same loader', async () => {
  let attempts = 0;
  const lazy = createProfileStudioLazyComponents({
    sectionLoaders: {
      'profile-content': async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('temporary chunk failure');
        return { default: 'LoadedContentSection' };
      }
    },
  });

  await lazy.loadSection('profile-content');
  assert.equal(lazy.getState().sectionComponents['profile-content'], undefined);
  assert.equal(lazy.getState().sectionErrors['profile-content'], 'temporary chunk failure');
  assert.equal(lazy.getState().sectionLoading, false);

  await lazy.loadSection('profile-content', { force: true });
  assert.equal(lazy.getState().sectionComponents['profile-content'], 'LoadedContentSection');
  assert.equal(lazy.getState().sectionErrors['profile-content'], '');
  assert.equal(lazy.getState().sectionLoading, false);
  assert.equal(attempts, 2);
});

test('Customize tabs load the existing editor groups', async () => {
  const groups = {
    appearance: ['customize', 'profile-identity', 'profile-collection'],
    media: ['customize', 'profile-media'],
    content: ['customize', 'profile-content', 'profile-widgets'],
    links: ['customize', 'profile-layout', 'profile-aliases'],
    layout: ['customize']
  };

  for (const [tabId, expectedSections] of Object.entries(groups)) {
    const lazy = createProfileStudioLazyComponents({
      sectionLoaders: Object.fromEntries(expectedSections.map(sectionId => [
        sectionId,
        async () => ({ default: sectionId })
      ]))
    });
    await lazy.loadCustomize(tabId);
    assert.deepEqual(Object.keys(lazy.getState().sectionComponents).sort(), [...expectedSections].sort());
  }
});

test('preview requests deduplicate, report failures, retry, and cache success', async () => {
  let attempts = 0;
  const lazy = createProfileStudioLazyComponents({
    previewLoader: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('preview chunk unavailable');
      return { default: 'ProfileStudioPreview' };
    }
  });

  const failedPreview = lazy.loadPreview();
  assert.equal(lazy.loadPreview(), failedPreview);
  assert.equal(await failedPreview, null);
  assert.equal(lazy.getState().previewError, 'preview chunk unavailable');

  assert.equal(await lazy.loadPreview(), 'ProfileStudioPreview');
  assert.equal(lazy.getState().previewError, '');
  assert.equal(await lazy.loadPreview(), 'ProfileStudioPreview');
  assert.equal(attempts, 2);
});

test('disposing the loader prevents late requests from publishing into a removed Studio', async () => {
  const section = deferred();
  const changes = [];
  const lazy = createProfileStudioLazyComponents({
    sectionLoaders: { customize: () => section.promise },
    onChange: state => changes.push(state)
  });
  const request = lazy.loadSection('customize');
  const publishedCount = changes.length;
  lazy.dispose();
  section.resolve({ default: 'LateCustomize' });
  await request;

  assert.equal(changes.length, publishedCount);
  assert.equal(await lazy.loadSection('customize'), undefined);
});

test('ProfileSettings delegates lazy section and preview state to the controller', () => {
  assert.match(settings, /createProfileStudioLazyComponents/);
  assert.match(settings, /lazyComponents\.loadSection\(sectionId, \{ force \}\)/);
  assert.match(settings, /lazyComponents\.loadPreview\(\)/);
  assert.match(settings, /lazyComponents\.loadCustomize\(activeCustomizeTab\)/);
  assert.match(settings, /lazyComponents\.dispose\(\)/);
  assert.doesNotMatch(settings, /sectionLoadPromises|previewLoadPromise/);
});
