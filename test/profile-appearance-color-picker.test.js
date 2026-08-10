import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import {
  getProfileAppearanceColorField,
  getProfileAppearanceColorValue,
  getProfileAppearancePickerStyle,
  hexToHsv,
  hsvToHex,
  setProfileAppearanceColor
} from '../src/lib/profileAppearanceColors.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('selecting a matrix role resolves the active picker label, path, and value', () => {
  const appearance = createDefaultProfileConfig().appearance;
  const field = getProfileAppearanceColorField('description');

  assert.equal(field.label, 'Bio text');
  assert.deepEqual(field.path, ['colors', 'description']);
  assert.equal(getProfileAppearanceColorValue(appearance, 'description'), '#CBD1DC');

  const next = setProfileAppearanceColor(appearance, 'description', '#12abef');
  assert.equal(getProfileAppearanceColorValue(next, 'description'), '#12ABEF');
  assert.equal(getProfileAppearanceColorValue(appearance, 'description'), '#CBD1DC');
});

test('square and hue picker values update only the selected role', () => {
  const appearance = createDefaultProfileConfig().appearance;
  const original = appearance.colors.description;
  const hsv = hexToHsv(original);
  const squareValue = hsvToHex({ h: hsv.h, s: .35, v: .72 });
  const afterSquare = setProfileAppearanceColor(appearance, 'description', squareValue);
  const afterHue = setProfileAppearanceColor(afterSquare, 'description', hsvToHex({ h: hsv.h + 60, s: .35, v: .72 }));

  assert.equal(getProfileAppearanceColorValue(afterSquare, 'description'), squareValue);
  assert.equal(getProfileAppearanceColorValue(afterHue, 'description'), hsvToHex({ h: hsv.h + 60, s: .35, v: .72 }));
  assert.equal(afterHue.colors.accent, appearance.colors.accent);
  assert.equal(afterHue.colors.text, appearance.colors.text);
});

test('picker marker styles change when the active role value changes', () => {
  const initial = getProfileAppearancePickerStyle('#CDD2FF');
  const next = getProfileAppearancePickerStyle('#12ABEF');

  assert.notDeepEqual(next, initial);
  assert.equal(initial.x, '19.6078431372549%');
  assert.equal(initial.y, '0%');
  assert.equal(next.huePosition, '55.128205128205124%');
  assert.equal(next.hueColor, '#00B1FF');
});

test('appearance editor wires all picker controls through the selected role', async () => {
  const editor = await read('src/lib/ProfileAppearanceEditor.svelte');

  assert.match(editor, /activeColorField\.path/);
  assert.match(editor, /on:pointerdown=\{handleSquarePointerDown\}/);
  assert.match(editor, /on:pointerdown=\{handleHuePointerDown\}/);
  assert.match(editor, /on:click=\{\(\) => applyPalette\(value\)\}/);
  assert.match(editor, /on:input=\{event => updateHex\(key, event\)\}/);
  assert.match(editor, /data-color-role=\{key\}/);
  assert.match(editor, /fieldValue\(key, staged\)/);
  assert.match(editor, /activePickerStyle\.x/);
  assert.match(editor, /activePickerStyle\.huePosition/);
  assert.match(editor, /PROFILE_COLOR_MATRIX_FIELDS = PROFILE_APPEARANCE_COLOR_FIELDS\.filter\(field => field\.key !== 'surface'\)/);
  assert.match(editor, /appearance-surface-title[\s\S]*data-color-role="surface"[\s\S]*Opacity[\s\S]*Blur/);
});
