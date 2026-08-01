import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile color effects stay inside card data unless ambient effects are opted in', async () => {
  const [shell, identity] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte')
  ]);

  assert.equal(createDefaultProfileConfig().colorEffectsEnabled, false);
  assert.match(shell, /const PROFILE_SURFACE_ACCENT/);
  assert.match(shell, /const PROFILE_SURFACE_SECONDARY/);
  assert.match(shell, /--profile-accent: '\s*\+ signatureColor/);
  assert.match(shell, /colorEffectsEnabled = effectiveProfileConfig\.colorEffectsEnabled === true/);
  assert.match(shell, /--profile-surface-accent: '\s*\+ profileSurfaceAccent/);
  assert.match(shell, /--profile-control-accent: '\s*\+ profileControlAccent/);
  assert.match(shell, /<ProfileAtmosphere[^>]*backgroundTint=\{colorEffectsEnabled\}/);
  assert.match(shell, /rollState=\{colorEffectsEnabled \? profileRollState : 'idle'\}/);
  assert.match(shell, /rollColor=\{colorEffectsEnabled \?/);
  assert.match(shell, /profile-shell__more-cue[\s\S]*var\(--profile-control-accent\)/);
  assert.match(shell, /profile-shell__more-back[\s\S]*var\(--profile-control-accent\)/);
  assert.match(shell, /<IdentityCard[\s\S]*accentColor=\{signatureColor\}/);
  assert.match(identity, /--identity-avatar-accent: #5D6A73/);
  assert.match(identity, /\.identity-card__links a:hover[\s\S]*var\(--identity-accent\)/);
  const avatarStyles = identity.slice(identity.indexOf('  .identity-card__avatar {'), identity.indexOf('  .identity-card__copy {'));
  assert.doesNotMatch(avatarStyles, /var\(--identity-accent\)/);
});
