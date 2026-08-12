import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { createProfileTemplatePatch } from '../src/lib/profileTemplates.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('new profile defaults use the compact background-first composition', () => {
  const defaults = createDefaultProfileConfig();
  assert.equal(defaults.templateKey, 'compact');
  assert.equal(defaults.layoutVariant, 'compact');
  assert.equal(normalizeProfileConfig(defaults).layoutVariant, 'compact');
  assert.equal(createProfileTemplatePatch('compact').layoutVariant, 'compact');
});

test('default profile presentation does not inject a theme or redundant handle', async () => {
  const [shell, card] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte')
  ]);

  assert.doesNotMatch(shell, /defaultProfilePresentation/);
  assert.match(shell, /profilePresentationLayoutVariant/);
  assert.match(shell, /borderKey=\{cosmetics\?\.profile_border\}/);
  assert.match(card, /background-image: none/);
  assert.doesNotMatch(card, /identity-card__handle-row|identity-card__handle/);
  assert.doesNotMatch(card, /starfield-blue\.webp/);
});
