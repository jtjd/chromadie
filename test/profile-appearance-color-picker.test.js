import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import {
  getProfileAppearanceColorField,
  getProfileAppearanceColorValue,
  hexToHsv,
  hsvToHex,
  setProfileAppearanceColor
} from '../src/lib/profileAppearanceColors.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('selecting a matrix role resolves the active picker label, path, and value', () => {
  const appearance = createDefaultProfileConfig().appearance;
  const field = getProfileAppearanceColorField('surfaceTint');

  assert.equal(field.label, 'Surface tint');
  assert.deepEqual(field.path, ['colors', 'highlight']);
  assert.equal(getProfileAppearanceColorValue(appearance, 'surfaceTint'), '#FFFFFF');

  const next = setProfileAppearanceColor(appearance, 'surfaceTint', '#12abef');
  assert.equal(getProfileAppearanceColorValue(next, 'surfaceTint'), '#12ABEF');
  assert.equal(getProfileAppearanceColorValue(appearance, 'surfaceTint'), '#FFFFFF');
});

test('square and hue picker values update only the selected role', () => {
  const appearance = createDefaultProfileConfig().appearance;
  const original = appearance.colors.highlight;
  const hsv = hexToHsv(original);
  const squareValue = hsvToHex({ h: hsv.h, s: .35, v: .72 });
  const afterSquare = setProfileAppearanceColor(appearance, 'surfaceTint', squareValue);
  const afterHue = setProfileAppearanceColor(afterSquare, 'surfaceTint', hsvToHex({ h: hsv.h + 60, s: .35, v: .72 }));

  assert.equal(getProfileAppearanceColorValue(afterSquare, 'surfaceTint'), squareValue);
  assert.equal(getProfileAppearanceColorValue(afterHue, 'surfaceTint'), hsvToHex({ h: hsv.h + 60, s: .35, v: .72 }));
  assert.equal(afterHue.colors.accent, appearance.colors.accent);
  assert.equal(afterHue.colors.text, appearance.colors.text);
});

test('appearance editor wires all picker controls through the selected role', async () => {
  const editor = await read('src/lib/ProfileAppearanceEditor.svelte');

  assert.match(editor, /activeColorField\.path/);
  assert.match(editor, /on:pointerdown=\{handleSquarePointerDown\}/);
  assert.match(editor, /on:pointerdown=\{handleHuePointerDown\}/);
  assert.match(editor, /on:click=\{\(\) => applyPalette\(value\)\}/);
  assert.match(editor, /on:input=\{event => updateHex\(key, event\)\}/);
  assert.match(editor, /data-color-role=\{key\}/);
});
