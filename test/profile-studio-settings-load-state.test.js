import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { toEditorProfileConfig } from '../src/lib/profile-studio/draftModel.js';
import { mergeProfileStudioContext } from '../src/lib/profile-studio/authoringState.js';
import { resolveProfileStudioSettingsLoadState } from '../src/lib/profile-studio/settingsLoadState.js';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
const loadSettings = source.slice(
  source.indexOf('  async function loadSettings('),
  source.indexOf('  function ensureFullContext(')
);
const resolveLoadState = options => resolveProfileStudioSettingsLoadState({
  mergeProfileStudioContext,
  toEditorProfileConfig,
  ...options
});

test('a failed refresh keeps the visible context and both current drafts', () => {
  const previousContext = { profileId: 'a', profileConfig: { draft: {} } };
  const currentDraft = { links: [{ label: 'Keep this draft' }] };
  const state = resolveLoadState({
    previousContext,
    nextContext: { loadError: 'Network unavailable' },
    studioDraft: currentDraft
  });

  assert.notEqual(state.context, previousContext);
  assert.equal(state.context.dataWarning, 'Network unavailable');
  assert.equal(state.preserveDrafts, true);
  assert.equal(Object.hasOwn(state, 'studioDraft'), false);
  assert.equal(Object.hasOwn(state, 'studioIdentityDraft'), false);
});

test('an unavailable same-account configuration stays visible but cannot become a fresh draft', () => {
  const profileConfig = { version: 2, draft: { links: [] }, published: { links: [] } };
  const previousContext = { profileId: 'a', targetProfile: { id: 'a' }, profileConfig };
  const identityPresentation = { layout: 'centered' };
  const currentDraft = { identityPresentation, links: [{ label: 'Unpublished' }] };
  const state = resolveLoadState({
    previousContext,
    nextContext: {
      profileId: 'a',
      targetProfile: { id: 'a', bio: 'Current bio' },
      profileConfig: null,
      configurationUnavailable: true
    },
    studioDraft: currentDraft
  });

  assert.equal(state.context.profileConfig, profileConfig);
  assert.equal(state.context.configurationUnavailable, true);
  assert.equal(state.studioDraft, currentDraft);
  assert.deepEqual(state.studioIdentityDraft, { bio: 'Current bio', identityPresentation });
  assert.equal(state.cosmeticPreviewLoadout, null);
  assert.equal(state.error, '');
});

test('an unavailable new-account read cannot reuse the previous account draft', () => {
  const state = resolveLoadState({
    previousContext: { profileId: 'a', profileConfig: { draft: {} } },
    nextContext: {
      profileId: 'b',
      targetProfile: { id: 'b', bio: 'New account' },
      profileConfig: null,
      configurationUnavailable: true
    },
    studioDraft: { bio: 'Old account draft' }
  });

  assert.equal(state.context.profileId, 'b');
  assert.equal(state.context.profileConfig, null);
  assert.equal(state.studioDraft, null);
  assert.equal(state.studioIdentityDraft, null);
});

test('a fresh context creates its editor projection and keeps non-owner errors', () => {
  const nextContext = {
    profileId: 'a',
    viewingOwnProfile: false,
    targetProfile: { id: 'a', bio: 'Visitor profile' },
    profileConfig: { version: 1, draft: { signatureColor: '#123456' } }
  };
  const state = resolveLoadState({ nextContext });

  assert.equal(state.context, nextContext);
  assert.ok(state.studioDraft);
  assert.deepEqual(state.studioIdentityDraft, {
    bio: 'Visitor profile',
    identityPresentation: state.studioDraft.identityPresentation
  });
  assert.equal(state.cosmeticPreviewLoadout, null);
  assert.equal(state.error, 'Profile settings are available only for your own profile.');
});

test('ProfileSettings keeps request and account checks before state reconciliation', () => {
  const importStart = loadSettings.indexOf('loadSettingsStateModule()');
  const requestCheck = loadSettings.lastIndexOf('if (nextRequestId !== requestId || (expectedAccountKey');
  const reconcile = loadSettings.indexOf('resolveProfileStudioSettingsLoadState({');

  assert.ok(importStart >= 0);
  assert.ok(requestCheck >= 0);
  assert.ok(reconcile > requestCheck);
  assert.doesNotMatch(loadSettings, /mergeProfileStudioContext\(previousContext/);
  assert.match(source, /loadProfileStudioContext\([\s\S]*loadSettingsStateModule\(\)/);
  assert.match(source, /settingsLoadState\.js'\)\.catch\(\(\) => null\)/);
  assert.match(loadSettings, /if \(!loadStateModule\)[\s\S]*configurationUnavailable: true/);
});

test('a rejected Studio context normalizer releases loading into its retryable unavailable state', async () => {
  const state = {
    requestId: 0,
    context: { profileId: 'a' },
    studioDraft: null,
    studioIdentityDraft: null,
    cosmeticPreviewLoadout: null,
    loading: false,
    error: '',
    dashboardStatus: 'Saved',
    dashboardError: '',
    sectionErrors: {},
    fullContextLoaded: true,
    fullContextPromise: Promise.resolve(),
    $profile: { id: 'a' },
    $session: { user: { id: 'a' } },
    supabase: {},
    toEditorProfileConfig: value => value,
    FALLBACK_PROFILE_COLOR: '#CDD2FF',
    mergeProfileStudioContext: (previous, next) => ({ ...previous, ...next }),
    loadProfileStudioContext: async () => { throw new Error('normalizer chunk unavailable'); },
    loadSettingsStateModule: async () => ({ resolveProfileStudioSettingsLoadState }),
    createInitialSettingsContext: () => ({ profileId: 'a' })
  };
  vm.createContext(state);
  vm.runInContext(loadSettings, state);

  await vm.runInContext("loadSettings('a')", state);

  assert.equal(state.loading, false);
  assert.equal(state.context.configurationUnavailable, true);
  assert.equal(state.context.profileId, 'a');
});
