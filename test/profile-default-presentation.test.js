import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { createProfileTemplatePatch } from '../src/lib/profileTemplates.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('new profile defaults use the focused identity-first composition', () => {
  const defaults = createDefaultProfileConfig();
  assert.equal(defaults.templateKey, 'signal');
  assert.equal(defaults.layoutVariant, 'focus');
  assert.equal(normalizeProfileConfig(defaults).layoutVariant, 'focus');
  assert.equal(createProfileTemplatePatch('signal').layoutVariant, 'focus');
});

test('default profile presentation keeps the blue starfield and footer links bounded', async () => {
  const [shell, card] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte')
  ]);

  assert.match(shell, /defaultProfilePresentation/);
  assert.match(shell, /profilePresentationLayoutVariant/);
  assert.match(shell, /hasDefaultSignalModules/);
  assert.match(shell, /defaultPresentation=\{defaultProfilePresentation\}/);
  assert.match(shell, /profile-shell-page--default/);
  assert.match(shell, /\.profile-shell-page\.profile-shell-page--default\.profile-shell-page--preview\s*\{\s*background: transparent;/);
  assert.match(shell, /#07152c/);
  assert.match(shell, /borderKey=\{defaultProfilePresentation \? '' : cosmetics\?\.profile_border\}/);
  assert.match(card, /identity-card--default/);
  assert.match(card, /#08172e/);
  assert.match(card, /starfield-blue\.webp/);
  assert.match(card, /identity-card--default \.identity-card__handle-row/);
  assert.match(card, /identity-card--default \.identity-card__links/);
  assert.match(card, /identity-card--default \.identity-card__metadata/);
});
