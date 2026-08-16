import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createDefaultProfileConfig,
  getProfileStoryVisible,
  getVisibleProfileLinks,
  getVisibleProfileModules,
  getProfileRollVisible,
  setProfileRollVisible,
  normalizeProfileConfig,
  setProfileStoryVisible
} from '../src/lib/profileConfig.js';
import { loadProfileContext } from '../src/lib/profileData.js';

function createConfigSupabase({ profile, draft, published, v2Draft = null, v2Published = null, publicV2 = null }) {
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
      if (name === 'get_my_profile_configuration_v2' && v2Draft) {
        return { data: { success: true, version: 2, draft: v2Draft, published: v2Published || v2Draft }, error: null };
      }
      if (name === 'get_public_profile_configuration') return { data: published, error: null };
      if (name === 'get_public_profile_configuration_v2' && publicV2) return { data: publicV2, error: null };
      return { data: null, error: null };
    }
  };
}

test('profile configuration has a complete safe default and keeps the roll module visible', () => {
  const config = createDefaultProfileConfig('#123abc');

  assert.equal(config.version, 1);
  assert.equal(config.signatureColor, '#123ABC');
  assert.equal(config.colorEffectsEnabled, false);
  assert.equal(config.modules.length, 8);
  assert.equal(config.modules.find(module => module.id === 'roll').visible, true);
  assert.deepEqual(config.links, []);
  assert.equal(getProfileStoryVisible(config), false);
});

test('color story visibility has an off-by-default compatibility path and an explicit opt-in', () => {
  const config = createDefaultProfileConfig('#123456');
  const visible = setProfileStoryVisible(config, true);

  assert.equal(getProfileStoryVisible(visible), true);
  assert.equal(visible.storyVisible, true);
  assert.equal(visible.modules.find(module => module.id === 'explore').visible, false);
  assert.equal(getProfileStoryVisible(normalizeProfileConfig({ ...visible, storyVisible: undefined })), true);
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
  assert.equal(normalized.signatureColor, '#CDD2FF');
  assert.equal(normalized.modules.find(module => module.id === 'stats').visible, false);
  assert.deepEqual(getVisibleProfileLinks(normalized), [
    { type: 'github', label: 'Code', url: 'https://github.com/example', visible: true, order: 0 }
  ]);
  assert.equal(normalizeProfileConfig({ ...config, colorEffectsEnabled: true }).colorEffectsEnabled, true);
  assert.equal(getVisibleProfileModules(normalized, false).some(module => module.id === 'roll'), false);
  assert.equal(getVisibleProfileModules(normalized, true).some(module => module.id === 'roll'), true);
  const hiddenRoll = setProfileRollVisible(normalized, false);
  assert.equal(getProfileRollVisible(hiddenRoll), false);
  assert.equal(getVisibleProfileModules(hiddenRoll, false).some(module => module.id === 'roll'), false);
});

test('profile context separates owner drafts from the published visitor projection', async () => {
  const draft = createDefaultProfileConfig('#112233');
  draft.layoutVariant = 'compact';
  const published = createDefaultProfileConfig('#445566');
  published.layoutVariant = 'full-bleed';

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

  assert.equal(owner.profileConfig.draft.layoutVariant, 'compact');
  assert.equal(owner.profileConfig.published.layoutVariant, 'full-bleed');
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
  assert.equal(visitor.profileConfig.published.layoutVariant, 'full-bleed');
  assert.equal(visitorSupabase.calls.some(call => call.type === 'rpc' && call.name === 'get_my_profile_configuration'), false);
  assert.deepEqual(
    visitorSupabase.calls.find(call => call.type === 'rpc' && call.name === 'get_public_profile_configuration').args,
    { p_user_id: 'user-2' }
  );
  assert.equal(visitor.targetProfile.email, undefined);
});

test('profile context uses the media-aware V2 read contract for owner and public previews', async () => {
  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const draft = { ...createDefaultProfileConfig('#112233'), avatar_path: avatarPath };
  const v2 = {
    version: 2,
    base: draft,
    links: draft.links,
    identity: {},
    content: draft.content,
    widgets: draft.widgets
  };
  const ownerSupabase = createConfigSupabase({
    profile: { id: 'user-1', username: 'NeonUser', mood_color: '#778899', total_rolls: 3 },
    draft,
    published: draft,
    v2Draft: v2,
    v2Published: v2
  });
  const owner = await loadProfileContext({
    supabaseClient: ownerSupabase,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'neonuser'
  });

  assert.equal(owner.profileConfig.draft.base.avatar_path, avatarPath);
  assert.equal(ownerSupabase.calls.some(call => call.name === 'get_my_profile_configuration_v2'), true);

  const visitorSupabase = createConfigSupabase({
    profile: { id: 'user-2', username: 'OtherUser', mood_color: '#778899', total_rolls: 3 },
    draft,
    published: draft,
    publicV2: v2
  });
  const visitor = await loadProfileContext({
    supabaseClient: visitorSupabase,
    isAuthenticated: false,
    profileUsername: 'OtherUser'
  });

  assert.equal(visitor.profileConfig.published.base.avatar_path, avatarPath);
  assert.equal(visitorSupabase.calls.some(call => call.name === 'get_public_profile_configuration_v2'), true);
});

test('profile context accepts a structurally valid V2 envelope without an avatar', async () => {
  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const legacyConfig = { ...createDefaultProfileConfig('#112233'), avatar_path: avatarPath };
  const baseWithoutAvatar = Object.fromEntries(
    Object.entries(legacyConfig).filter(([key]) => key !== 'avatar_path')
  );
  const v2WithoutExpression = {
    version: 2,
    base: baseWithoutAvatar,
    links: legacyConfig.links,
    identity: {},
    content: legacyConfig.content,
    widgets: legacyConfig.widgets
  };
  const supabaseClient = createConfigSupabase({
    profile: { id: 'user-1', username: 'NeonUser', mood_color: '#778899', total_rolls: 3 },
    draft: legacyConfig,
    published: legacyConfig,
    v2Draft: v2WithoutExpression,
    v2Published: v2WithoutExpression
  });

  const owner = await loadProfileContext({
    supabaseClient,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'neonuser'
  });

  assert.equal(owner.profileConfig.draft.avatar_path ?? null, null);
  assert.equal(owner.profileConfig.version, 2);
  assert.equal(supabaseClient.calls.some(call => call.name === 'get_my_profile_configuration'), false);
});

test('public profile context does not switch contracts based on missing expression media', async () => {
  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const published = { ...createDefaultProfileConfig('#112233'), avatar_path: avatarPath };
  const v2WithoutExpression = {
    version: 2,
    base: Object.fromEntries(Object.entries(published).filter(([key]) => key !== 'avatar_path')),
    links: published.links,
    identity: {},
    content: published.content,
    widgets: published.widgets
  };
  const supabaseClient = createConfigSupabase({
    profile: { id: 'user-2', username: 'OtherUser', mood_color: '#778899', total_rolls: 3 },
    draft: published,
    published,
    publicV2: v2WithoutExpression
  });

  const visitor = await loadProfileContext({
    supabaseClient,
    isAuthenticated: false,
    profileUsername: 'OtherUser'
  });

  assert.equal(visitor.profileConfig.published.avatar_path ?? null, null);
  assert.equal(supabaseClient.calls.some(call => call.name === 'get_public_profile_configuration_v2'), true);
  assert.equal(supabaseClient.calls.some(call => call.name === 'get_public_profile_configuration'), false);
});

test('profile configuration editor and renderer retain safe draft/publish boundaries', async () => {
  const editor = await readFile(new URL('../src/lib/ProfileEditor.svelte', import.meta.url), 'utf8');
  const profileData = await readFile(new URL('../src/lib/profileData.js', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const renderModel = await readFile(new URL('../src/lib/profileRenderModel.js', import.meta.url), 'utf8');

  assert.doesNotMatch(editor, /save_profile_configuration_section|publish_profile_configuration_section/);
  assert.doesNotMatch(editor, /export function getDraftConfig/);
  assert.match(editor, /export function validateDraft/);
  assert.match(editor, /configpreview/);
  assert.doesNotMatch(editor, /colorEffectsEnabled/);
  assert.doesNotMatch(editor, /Signature color|Ambient color/);
  assert.match(editor, /https/);
  assert.doesNotMatch(editor, /innerHTML|new Function|eval\s*\(/);
  assert.match(profileData, /get_my_profile_configuration/);
  assert.match(profileData, /get_public_profile_configuration/);
  assert.match(settings, /save_profile_configuration_v2/);
  assert.match(settings, /publish_profile_studio_v2/);
  assert.match(settings, /loadProfileStudioContext/);
  assert.match(renderModel, /getProfileComposition/);
  assert.match(renderModel, /getVisibleProfileLinks/);
  assert.match(shell, /profile-shell-page--/);
});

test('ambient color preference is persisted as a validated configuration field', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260801140000_profile_color_effects.sql', import.meta.url), 'utf8');

  assert.match(migration, /'colorEffectsEnabled', false/);
  assert.match(migration, /v_color_effects_enabled boolean/);
  assert.match(migration, /jsonb_typeof\(p_input->'colorEffectsEnabled'\) <> 'boolean'/);
  assert.match(migration, /'colorEffectsEnabled', v_color_effects_enabled/);
});
