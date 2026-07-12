import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCosmeticClass, sanitizeCosmeticStyle } from '../src/lib/cosmeticSafety.js';
import { getSafeNextUrl } from '../src/lib/authUrls.js';

test('cosmetic values reject network-capable CSS and invalid classes', () => {
  assert.equal(sanitizeCosmeticClass('lb-chroma-theme'), 'lb-chroma-theme');
  assert.equal(sanitizeCosmeticClass('safe bad<script>'), '');
  assert.equal(sanitizeCosmeticStyle('color: #fff; text-shadow: 0 0 4px #fff;'), 'color: #fff; text-shadow: 0 0 4px #fff;');
  assert.equal(sanitizeCosmeticStyle('background: url(https://attacker.invalid/x)'), '');
  assert.equal(sanitizeCosmeticStyle('background-image: image-set("https://attacker.invalid/x" 1x)'), '');
  assert.equal(sanitizeCosmeticStyle('@import "https://attacker.invalid/x";'), '');
  assert.equal(sanitizeCosmeticStyle('position: fixed; inset: 0;'), '');
});

test('authentication next URLs remain on the application origin', () => {
  assert.equal(getSafeNextUrl('/shop'), 'http://localhost:5173/shop');
  assert.equal(getSafeNextUrl('//attacker.invalid'), 'http://localhost:5173');
  assert.equal(getSafeNextUrl('/\\attacker.invalid'), 'http://localhost:5173');
  assert.equal(getSafeNextUrl('https://attacker.invalid'), 'http://localhost:5173');
  assert.equal(getSafeNextUrl('javascript:alert(1)'), 'http://localhost:5173');
});
