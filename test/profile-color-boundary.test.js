import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile color effects stay inside card data and the roll module', async () => {
  const [shell, identity] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte')
  ]);

  assert.match(shell, /const PROFILE_SURFACE_ACCENT/);
  assert.match(shell, /const PROFILE_SURFACE_SECONDARY/);
  assert.match(shell, /--profile-accent: '\s*\+ signatureColor/);
  assert.match(shell, /--profile-surface-accent: '\s*\+ PROFILE_SURFACE_ACCENT/);
  assert.match(shell, /<ProfileAtmosphere accent=\{PROFILE_SURFACE_ACCENT\} secondaryAccent=\{PROFILE_SURFACE_SECONDARY\}/);
  assert.doesNotMatch(shell, /<ProfileAtmosphere[^>]*(rollState|rollColor)=/);
  assert.doesNotMatch(shell, /dailyAccentColor|profileRollColor|canonicalDailyColor/);
  assert.match(shell, /<IdentityCard[\s\S]*accentColor=\{signatureColor\}/);
  assert.match(identity, /--identity-avatar-accent: #5D6A73/);
  assert.match(identity, /\.identity-card__links a:hover[\s\S]*var\(--identity-accent\)/);
  const avatarStyles = identity.slice(identity.indexOf('  .identity-card__avatar {'), identity.indexOf('  .identity-card__copy {'));
  assert.doesNotMatch(avatarStyles, /var\(--identity-accent\)/);
});
