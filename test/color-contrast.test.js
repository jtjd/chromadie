import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getReadableTextColor } from '../src/lib/colorContrast.js';

test('dynamic colors select readable ink with the existing luminance threshold', () => {
  assert.equal(getReadableTextColor('#000000'), '#FFFFFF');
  assert.equal(getReadableTextColor('#FFFFFF'), '#0E0E10');
  assert.equal(getReadableTextColor('#757575'), '#FFFFFF');
  assert.equal(getReadableTextColor('#767676'), '#0E0E10');
});

test('invalid colors retain the white fallback and both screens share the helper', async () => {
  assert.equal(getReadableTextColor('not-a-color'), '#0E0E10');

  const [game, progression] = await Promise.all([
    readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProgressionPage.svelte', import.meta.url), 'utf8')
  ]);
  const sharedImport = /import \{ getReadableTextColor \} from '\.\/colorContrast\.js'/;
  assert.match(game, sharedImport);
  assert.match(progression, sharedImport);
  assert.match(game, /getReadableTextColor\(displayColor\)/);
  assert.match(progression, /getReadableTextColor\(accentVivid\)/);
});
