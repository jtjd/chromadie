import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  clearDirtySourcesForSection,
  hasDirtySources,
  updateDirtySource
} from '../src/lib/profile-studio/dirtyState.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('source-aware dirty state keeps sibling editor drafts independent', () => {
  let sources = updateDirtySource({}, 'customize:identity', true);
  sources = updateDirtySource(sources, 'customize:appearance', true);
  sources = updateDirtySource(sources, 'customize:appearance', false);

  assert.deepEqual(sources, { 'customize:identity': true });
  assert.equal(hasDirtySources(sources), true);
  assert.deepEqual(clearDirtySourcesForSection(sources, 'customize'), {});
  assert.equal(hasDirtySources(clearDirtySourcesForSection(sources, 'customize')), false);
});

test('Profile Studio publishes identity and configuration through one server boundary', async () => {
  const [settings, customize, workspace, appearance, identity, cosmetics, media, migration, security, ci] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileMediaWorkspace.svelte'),
    read('supabase/migrations/20260811100000_profile_studio_publish_atomic.sql'),
    read('supabase/tests/launch_security.sql'),
    read('.github/workflows/ci.yml')
  ]);

  assert.match(settings, /publish_profile_studio_v2/);
  assert.doesNotMatch(settings, /update_my_profile_identity/);
  assert.match(settings, /dirtySourceForEvent/);
  assert.match(customize, /customize:identity/);
  assert.match(customize, /customize:appearance/);
  assert.match(workspace, /forwardDirty\('links'/);
  assert.match(appearance, /emitAppearanceChange\(JSON\.stringify\(staged\) !== JSON\.stringify\(saved\)\)/);
  assert.match(appearance, /appearance-editor__picker-toggle/);
  assert.match(appearance, /Accessible color controls/);
  assert.match(identity, /\{#if !studio\}[\s\S]*identity-editor__save/);
  assert.doesNotMatch(identity, /identity-editor--studio \.identity-editor__save/);
  assert.match(cosmetics, /Update equipped effects/);
  assert.match(media, /profile-expression-editor__compact-remove/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.publish_profile_studio_v2/);
  assert.match(migration, /update_my_profile_identity\(p_display_name, p_bio\)/);
  assert.match(migration, /EXCEPTION WHEN OTHERS/);
  assert.match(security, /profile_studio_atomic_failure/);
  assert.match(security, /publish_profile_studio_v2\(jsonb,text,text,timestamptz\)/);
  assert.match(ci, /npm run check:performance/);
  assert.match(ci, /npm run test:browser:production/);
});
