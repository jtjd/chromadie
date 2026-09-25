import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { createPreviewPreparationHandler } from '../src/lib/profile-studio/previewPreparation.js';

const editorSource = await readFile(new URL('../src/lib/ProfileExpressionEditor.svelte', import.meta.url), 'utf8');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('prepared media completing after teardown does not allocate a preview URL', async () => {
  const prepared = deferred();
  let editorActive = true;
  const created = [];
  const previews = [];
  const handlePrepared = createPreviewPreparationHandler({
    isActive: () => editorActive,
    createObjectURL: blob => {
      const url = `blob:preview-${blob.id}`;
      created.push(url);
      return url;
    },
    onPreview: url => previews.push(url)
  });

  const processing = prepared.promise.then(handlePrepared);
  editorActive = false;
  prepared.resolve({ id: 'late' });
  await processing;

  assert.deepEqual(created, []);
  assert.deepEqual(previews, []);
});

test('prepared media while mounted creates and publishes one preview URL', () => {
  const previews = [];
  const handlePrepared = createPreviewPreparationHandler({
    isActive: () => true,
    createObjectURL: () => 'blob:preview-current',
    onPreview: url => previews.push(url)
  });

  assert.equal(handlePrepared({ id: 'current' }), true);
  assert.deepEqual(previews, ['blob:preview-current']);
});

test('image and audio preparation share the editor-liveness guard before teardown cleanup', () => {
  assert.equal((editorSource.match(/onPrepared: preparedPreviewHandler\(/g) || []).length, 2);
  assert.match(editorSource, /import \{ createPreviewPreparationHandler \} from '\.\/profile-studio\/previewPreparation\.js'/);
  assert.match(editorSource, /onDestroy\(\(\) => \{\s*editorActive = false;\s*(?:mediaActionGeneration \+= 1;\s*)?revokeAvatarPreview\(\);/);
});
