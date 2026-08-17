import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_LAYOUT_DEFINITIONS,
  normalizeProfileLayoutKey
} from '../src/lib/profile-layout/profileLayouts.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { createProfileLayoutPatch } from '../src/lib/profile-layout/profileLayoutPatch.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Framed keeps the avatar and identity in one bounded left-aligned card', async () => {
  const [card, shell, preview, editor, migration, seed] = await Promise.all([
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileReferenceLayoutEditor.svelte'),
    read('supabase/migrations/20260817100000_profile_framed_layout.sql'),
    read('supabase/seed.sql')
  ]);

  assert.equal(normalizeProfileLayoutKey('profile_layout_framed'), 'framed');
  assert.equal(PROFILE_LAYOUT_DEFINITIONS.framed.structure.identity, 'left');
  assert.equal(normalizeProfileConfig({ ...createDefaultProfileConfig(), ...createProfileLayoutPatch('framed') }).layoutVariant, 'framed');
  assert.match(card, /profile-reference-card--framed/);
  assert.match(card, /data-profile-layout-content=\{framedLayout \? 'framed'/);
  assert.match(card, /getProfileLinkDefinition/);
  assert.match(card, /\/link-icons\/\$\{link\.definition\.icon\}\.svg/);
  assert.match(card, /profile-reference-card__link-label/);
  assert.match(card, /overflow: visible/);
  assert.match(card, /text-align: left/);
  assert.match(card, /profile-reference-card--framed \.profile-reference-card__avatar-shell \{[\s\S]*?padding: 0;[\s\S]*?border: 0;[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/);
  assert.match(card, /profile-reference-card--framed :global\(\.name-effect-canvas\) \{[\s\S]*?display: inline-block;[\s\S]*?width: fit-content;/);
  assert.match(card, /profile-reference-card--framed :global\(\.name-effect-canvas__semantic\.profile-reference-card__name\) \{[\s\S]*?width: auto;[\s\S]*?text-align: left;/);
  assert.match(shell, /layoutVariant=\{profilePresentationLayoutVariant\}/);
  assert.match(shell, /profileHasBelowFoldRoll = profilePresentationLayoutVariant === 'full-bleed' \|\| profilePresentationLayoutVariant === 'framed'/);
  assert.match(preview, /roll=\{layoutVariant === 'framed' \? null : latestRoll\}/);
  assert.match(editor, /data-layout='framed'/);
  assert.match(migration, /profile_layout_framed/);
  assert.match(migration, /css_value IN \('compact', 'full-bleed', 'framed'\)/);
  assert.match(migration, /Expected 3 active Profile Layout rows/);
  assert.match(seed, /'profile_layout_framed', 'Framed', 'profile_layout'/);
});
