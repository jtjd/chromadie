import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [game, dialog, imageCopy] = await Promise.all([
  readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/RollShareImageDialog.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/rollImageCopy.js', import.meta.url), 'utf8')
]);

test('Game delegates image preview behavior to the focused dialog component', () => {
  assert.match(game, /await import\('\.\/RollShareImageDialog\.svelte'\)/);
  assert.match(game, /this=\{RollShareImageDialogComponent\}/);
  assert.match(game, /await shareImageDialog\?\.open\(requestId, \(\) => requestId === rollRequestId\)/);
  assert.match(game, /void shareImageDialog\?\.close\(false\)/);
  assert.match(game, /const requestId = rollRequestId;[\s\S]*if \(requestId !== rollRequestId\) return;/);
  assert.doesNotMatch(game, /showImageModal|imagePreviewUrl|imageCopied|handleImageModalKeydown|trapFocus\(/);
  assert.doesNotMatch(game, /image-modal-overlay|image-modal-content|document\.body\.style\.overflow/);
});

test('the dialog uses only confirmed result values and ignores stale request work', () => {
  assert.match(dialog, /const result = \{ score, rarity, color \}/);
  assert.match(dialog, /export async function open\(expectedVersion, isCurrent/);
  assert.match(dialog, /const requestIsCurrent = \(\) => isCurrent\(expectedVersion\)/);
  assert.match(dialog, /if \(!exportCanvas \|\| !requestIsCurrent\(\)\) return/);
  assert.match(dialog, /await runRollImageCopy\(\{/);
  assert.match(imageCopy, /if \(!isCurrent\(\)\) return \{ status: 'stale' \}/);
  assert.match(imageCopy, /const blob = await canvasToBlob\(canvas\)/);
  assert.doesNotMatch(dialog, /username|email|profile|session/);
});

test('the image dialog preserves keyboard focus and page scroll behavior', () => {
  assert.match(dialog, /role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(dialog, /focusFirstElement\(imageDialog\)/);
  assert.match(dialog, /restoreFocus\(imageOpener\)/);
  assert.match(dialog, /event\.key === 'Escape'[\s\S]*close\(\)/);
  assert.match(dialog, /trapFocus\(event, imageDialog\)/);
  assert.match(dialog, /document\.body\.style\.overflow = showImageModal \? 'hidden' : ''/);
});
