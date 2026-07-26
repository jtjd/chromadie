import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createDefaultProfileConfig,
  getVisibleProfileLinks,
  getVisibleProfileModules,
  normalizeProfileConfig
} from '../src/lib/profileConfig.js';
import { loadProfileContext } from '../src/lib/profileData.js';

function createConfigSupabase({ profile, draft, published }) {
  const calls = [];

  function from(table) {
    const builder = {
      select(fields) {
        calls.push({ type: 'select', table, fields });
        return builder;
      },
      ilike(field, value) {
        calls.push({ type: 'ilike', table, field, value });
        return builder;
      },
      eq(field, value) {
        calls.push({ type: 'eq', table, field, value });
        return builder;
      },
      async maybeSingle() {
        return { data: profile, error: null };
      },
      then(resolve, reject) {
        return Promise.resolve({ data: table === 'achievements' ? [] : [], error: null }).then(resolve, reject);
      }
    };
    return builder;
  }

  return {
    calls,
    from,
    async rpc(name, args) {
      calls.push({ type: 'rpc', name, args });
      if (name === 'get_my_profile') return { data: profile, error: null };
      if (name === 'get_public_profile_scores') return { data: [], error: null };
      if (name === 'get_my_profile_configuration') {
        return { data: { success: true, version: 1, draft, published }, error: null };
      }
      if (name === 'get_public_profile_configuration') return { data: published, error: null };
      return { data: null, error: null };
    }
  };
}

test('profile configuration has a complete safe default and keeps the roll module visible', () => {
  const config = createDefaultProfileConfig('#123abc');

  assert.equal(config.version, 1);
  assert.equal(config.signatureColor, '#123ABC');
  assert.equal(config.modules.length, 8);
  assert.equal(config.modules.find(module => module.id === 'roll').visible, true);
  assert.deepEqual(config.links, []);
});

test('profile configuration normalization rejects incomplete structure and drops unsafe links', () => {
  const fallback = createDefaultProfileConfig('#ABCDEF');
  assert.deepEqual(normalizeProfileConfig({ version: 1, modules: [] }, '#ABCDEF'), fallback);

  const config = createDefaultProfileConfig('#102030');
  config.modules = config.modules.map(module => module.id === 'stats' ? { ...module, visible: false } : module);
  config.links = [
    { type: 'github', label: 'Code', url: 'https://github.com/example', visible: true, order: 0 },
    { type: 'website', label: 'Unsafe', url: 'javascript:alert(1)', visible: true, order: 1 },
    { type: 'website', label: 'Hidden', url: 'https://example.com/hidden', visible: false, order: 2 }
  ];

  const normalized = normalizeProfileConfig(config);
  assert.equal(normalized.signatureColor, '#102030');
  assert.equal(normalized.modules.find(module => module.id === 'stats').visible, false);
  assert.deepEqual(getVisibleProfileLinks(normalized), [
    { type: 'github', label: 'Code', url: 'https://github.com/example', visible: true, order: 0 }
  ]);
  assert.equal(getVisibleProfileModules(normalized, false).some(module => module.id === 'roll'), false);
  assert.equal(getVisibleProfileModules(normalized, true).some(module => module.id === 'roll'), true);
});

test('profile context separates owner drafts from the published visitor projection', async () => {
  const draft = createDefaultProfileConfig('#112233');
  draft.layoutVariant = 'focus';
  const published = createDefaultProfileConfig('#445566');
  published.layoutVariant = 'editorial';

  const ownerSupabase = createConfigSupabase({
    profile: { id: 'user-1', username: 'NeonUser', mood_color: '#778899', total_rolls: 3 },
    draft,
    published
  });
  const owner = await loadProfileContext({
    supabaseClient: ownerSupabase,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'neonuser'
  });

  assert.equal(owner.profileConfig.draft.layoutVariant, 'focus');
  assert.equal(owner.profileConfig.published.layoutVariant, 'editorial');
  assert.equal(ownerSupabase.calls.some(call => call.type === 'rpc' && call.name === 'get_my_profile_configuration'), true);
  assert.equal(ownerSupabase.calls.some(call => call.type === 'rpc' && call.name === 'get_public_profile_configuration'), false);

  const visitorSupabase = createConfigSupabase({
    profile: { id: 'user-2', username: 'OtherUser', mood_color: '#778899', total_rolls: 3, email: 'private@example.com' },
    draft,
    published
  });
  const visitor = await loadProfileContext({
    supabaseClient: visitorSupabase,
    isAuthenticated: false,
    profileUsername: 'OtherUser'
  });

  assert.equal(visitor.profileConfig.draft, null);
  assert.equal(visitor.profileConfig.published.layoutVariant, 'editorial');
  assert.equal(visitorSupabase.calls.some(call => call.type === 'rpc' && call.name === 'get_my_profile_configuration'), false);
  assert.deepEqual(
    visitorSupabase.calls.find(call => call.type === 'rpc' && call.name === 'get_public_profile_configuration').args,
    { p_user_id: 'user-2' }
  );
  assert.equal(visitor.targetProfile.email, undefined);
});

test('profile configuration editor and renderer retain safe draft/publish boundaries', async () => {
  const editor = await readFile(new URL('../src/lib/ProfileEditor.svelte', import.meta.url), 'utf8');
  const profileData = await readFile(new URL('../src/lib/profileData.js', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');

  assert.match(editor, /save_profile_configuration/);
  assert.match(editor, /publish_profile_configuration/);
  assert.match(editor, /Preview on profile/);
  assert.match(editor, /https/);
  assert.doesNotMatch(editor, /innerHTML|new Function|eval\s*\(/);
  assert.match(profileData, /get_my_profile_configuration/);
  assert.match(profileData, /get_public_profile_configuration/);
  assert.match(shell, /getVisibleProfileModules/);
  assert.match(shell, /getVisibleProfileLinks/);
  assert.match(shell, /profile-shell-page--/);
});
