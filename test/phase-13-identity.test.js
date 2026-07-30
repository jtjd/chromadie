import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  countIdentityCharacters,
  normalizeIdentityField,
  normalizePublicIdentity
} from '../src/lib/profileIdentity.js';
import { mapProfileRecord } from '../src/lib/profileContract.js';
import { loadProfileContext } from '../src/lib/profileData.js';

test('identity validation is optional, trimmed, and character-aware', () => {
  assert.deepEqual(normalizePublicIdentity({
    displayName: '  Nova ✦  ',
    bio: '  A daily color record.  '
  }), {
    displayName: 'Nova ✦',
    bio: 'A daily color record.',
    fieldErrors: { displayName: '', bio: '' },
    errors: [],
    valid: true
  });
  assert.deepEqual(normalizePublicIdentity({ displayName: '   ', bio: '' }).displayName, null);
  assert.equal(countIdentityCharacters('😀'.repeat(DISPLAY_NAME_MAX_LENGTH)), DISPLAY_NAME_MAX_LENGTH);
  assert.equal(normalizeIdentityField('😀'.repeat(DISPLAY_NAME_MAX_LENGTH), {
    label: 'Display name', maxLength: DISPLAY_NAME_MAX_LENGTH
  }).error, '');
  assert.match(normalizeIdentityField('😀'.repeat(DISPLAY_NAME_MAX_LENGTH + 1), {
    label: 'Display name', maxLength: DISPLAY_NAME_MAX_LENGTH
  }).error, /40/);
  assert.equal(countIdentityCharacters('é'.repeat(BIO_MAX_LENGTH)), BIO_MAX_LENGTH);
  assert.match(normalizeIdentityField('a\u0001b', { label: 'Bio', maxLength: BIO_MAX_LENGTH }).error, /control/);
  assert.match(normalizeIdentityField('a\u0000b', { label: 'Bio', maxLength: BIO_MAX_LENGTH }).error, /control/);
  assert.match(normalizeIdentityField('x'.repeat(BIO_MAX_LENGTH + 1), {
    label: 'Bio', maxLength: BIO_MAX_LENGTH
  }).error, /160/);
});

test('identity values stay plain text in the public render contract', async () => {
  const identityCard = await readFile(new URL('../src/lib/IdentityCard.svelte', import.meta.url), 'utf8');
  const identityEditor = await readFile(new URL('../src/lib/IdentityEditor.svelte', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260725150000_profile_identity.sql', import.meta.url), 'utf8');
  const dangerous = '<strong>**not markup**</strong>';

  assert.equal(normalizePublicIdentity({ displayName: dangerous, bio: dangerous }).displayName, dangerous);
  assert.match(identityCard, /\{bio\}/);
  assert.doesNotMatch(identityCard, /innerHTML|{@html}|marked\(|new Function|eval\s*\(/);
  assert.match(identityEditor, /export let username = ''/);
  assert.doesNotMatch(identityEditor, /profile-display-name|draftDisplayName|Display name/);
  assert.match(identityEditor, /countIdentityCharacters\(draftBio\)/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /UPDATE public\.profiles/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.update_my_profile_identity\(text, text\) TO authenticated/);
  const projection = migration.match(/CREATE OR REPLACE FUNCTION public\.public_profile_identity_projection[\s\S]*?\$function\$/)?.[0] || '';
  assert.doesNotMatch(projection, /SELECT \*/);
  assert.doesNotMatch(projection, /ep_spent|reroll_shards|staff_test_ep/);
});

test('profile mapping includes only the bounded identity additions', () => {
  const mapped = mapProfileRecord({
    id: 'user-1',
    username: 'Nova',
    display_name: 'Nova Prime',
    bio: 'A short public bio.',
    ep_spent: 99,
    email: 'private@example.invalid'
  });

  assert.equal(mapped.display_name, 'Nova Prime');
  assert.equal(mapped.bio, 'A short public bio.');
  assert.equal(mapped.email, undefined);
  assert.equal(mapped.ep_spent, 99);
});

function createIdentitySupabase(profile) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'get_public_profile_identity') return { data: profile, error: null };
      if (name === 'get_public_profile_scores') return { data: [], error: null };
      if (name === 'get_public_profile_story') return { data: { timeline: [], collection: [] }, error: null };
      if (name === 'get_public_profile_configuration') return { data: null, error: null };
      return { data: null, error: null };
    },
    from(table) {
      const builder = {
        select() { calls.push({ name: 'select', table }); return builder; },
        eq() { return builder; },
        async maybeSingle() { return { data: null, error: null }; },
        then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); }
      };
      return builder;
    }
  };
}

test('visitor profile hydration uses the bounded identity RPC before any legacy fallback', async () => {
  const supabase = createIdentitySupabase({
    id: 'user-1',
    username: 'Nova',
    display_name: 'Nova Prime',
    bio: 'A short public bio.',
    total_rolls: 2,
    mood_color: '#112233'
  });
  const context = await loadProfileContext({
    supabaseClient: supabase,
    isAuthenticated: false,
    profileUsername: 'Nova'
  });

  assert.equal(context.targetProfile.display_name, 'Nova Prime');
  assert.equal(context.targetProfile.bio, 'A short public bio.');
  assert.equal(supabase.calls.some(call => call.name === 'select' && call.table === 'profiles'), false);
});
