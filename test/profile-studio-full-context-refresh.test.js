import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { toEditorProfileConfig } from '../src/lib/profile-studio/draftModel.js';
import { PROFILE_STUDIO_FALLBACK_COLOR } from '../src/lib/profile-studio/dashboardContract.js';
import {
  isProfileConfigurationWritable,
  mergeProfileStudioContext
} from '../src/lib/profile-studio/authoringState.js';
import { resolveProfileStudioFullContextRefreshState } from '../src/lib/profile-studio/settingsLoadState.js';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
const loadSettings = source.slice(
  source.indexOf('  async function loadSettings('),
  source.indexOf('  function ensureFullContext(')
);
const ensureFullContext = source.slice(
  source.indexOf('  function ensureFullContext('),
  source.indexOf('  function updateConfiguration(')
);
const resolveRefresh = options => resolveProfileStudioFullContextRefreshState(
  options.nextContext,
  options.currentContext ?? null,
  options.studioDraft ?? null,
  options.studioIdentityDraft ?? null,
  options.preserveIdentityDraft ?? false,
  '#123456',
  mergeProfileStudioContext,
  toEditorProfileConfig
);

function createRefreshHarness({
  loadProfileContext,
  loadStateModule = { resolveProfileStudioFullContextRefreshState },
  context = { profileId: 'a', targetProfile: { id: 'a', bio: 'Current bio' } },
  studioDraft = { identityPresentation: { layout: 'centered' } },
  studioIdentityDraft = { bio: 'Current bio', identityPresentation: { layout: 'centered' } }
}) {
  const executable = ensureFullContext.replace(
    'loadSettingsStateModule()',
    'Promise.resolve(loadStateModule)'
  );
  const state = {
    context,
    studioDraft,
    studioIdentityDraft,
    cosmeticPreviewLoadout: { frame: 'frame-a' },
    fullContextLoaded: false,
    fullContextPromise: null,
    loading: true,
    requestId: 1,
    dirtySources: {},
    supabase: {},
    $profile: { id: 'a' },
    $isAuthenticated: true,
    $session: { user: { id: 'a' } },
    accountUsername: 'alice',
    FALLBACK_PROFILE_COLOR: PROFILE_STUDIO_FALLBACK_COLOR,
    PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE: 'Profile settings are temporarily unavailable.',
    Error,
    loadProfileContext,
    loadStateModule,
    mergeProfileStudioContext,
    toEditorProfileConfig
  };
  vm.createContext(state);
  vm.runInContext(executable, state);
  return state;
}

test('a refresh retains staged configuration and dirty identity drafts', () => {
  const currentContext = {
    profileId: 'a',
    targetProfile: { id: 'a', bio: 'Earlier bio' },
    profileConfig: { draft: { links: [] } }
  };
  const studioDraft = { identityPresentation: { layout: 'centered' }, links: [{ label: 'Staged link' }] };
  const studioIdentityDraft = { bio: 'Typed bio', identityPresentation: studioDraft.identityPresentation };
  const nextContext = {
    profileId: 'a',
    targetProfile: { id: 'a', bio: 'Refreshed bio' },
    profileConfig: { draft: { links: [{ label: 'Saved link' }] } }
  };

  const state = resolveRefresh({
    currentContext,
    nextContext,
    studioDraft,
    studioIdentityDraft,
    preserveIdentityDraft: true
  });

  assert.equal(state.context.targetProfile.bio, 'Refreshed bio');
  assert.equal(state.studioDraft, studioDraft);
  assert.equal(state.studioIdentityDraft.bio, 'Typed bio');
  assert.equal(state.studioIdentityDraft.identityPresentation, studioDraft.identityPresentation);
  assert.equal(state.fullContextLoaded, true);
});

test('a refresh updates a clean identity draft and initializes saved configuration', () => {
  const nextContext = {
    profileId: 'a',
    targetProfile: { id: 'a', bio: 'Saved bio' },
    profileConfig: { draft: { signatureColor: '#abcdef' } }
  };

  const state = resolveRefresh({
    currentContext: { profileId: 'a' },
    nextContext
  });

  assert.equal(state.context.profileConfig, nextContext.profileConfig);
  assert.deepEqual(state.studioDraft, toEditorProfileConfig(nextContext.profileConfig.draft, '#123456'));
  assert.deepEqual(state.studioIdentityDraft, {
    bio: 'Saved bio',
    identityPresentation: state.studioDraft.identityPresentation
  });
  assert.equal(state.fullContextLoaded, true);
});

test('an unavailable same-profile configuration stays visible and retryable', () => {
  const profileConfig = { draft: { links: [] } };
  const currentContext = {
    profileId: 'a',
    targetProfile: { id: 'a', bio: 'Earlier bio' },
    profileConfig
  };
  const studioDraft = { identityPresentation: { layout: 'stacked' }, links: [{ label: 'Unsaved' }] };
  const state = resolveRefresh({
    currentContext,
    nextContext: {
      profileId: 'a',
      targetProfile: { id: 'a', bio: 'Current bio' },
      profileConfig: null,
      configurationUnavailable: true
    },
    studioDraft,
    studioIdentityDraft: { bio: 'Staged bio' },
    preserveIdentityDraft: true
  });

  assert.equal(state.context.profileConfig, profileConfig);
  assert.equal(state.context.configurationUnavailable, true);
  assert.equal(state.studioDraft, studioDraft);
  assert.equal(state.studioIdentityDraft.bio, 'Staged bio');
  assert.equal(isProfileConfigurationWritable(state.context), false);
  assert.equal(state.fullContextLoaded, false);
});

test('a resolved profile read error preserves drafts and remains retryable', () => {
  const currentContext = { profileId: 'a', targetProfile: { id: 'a' } };
  const studioDraft = { identityPresentation: { layout: 'centered' } };
  const studioIdentityDraft = { bio: 'Typed bio', identityPresentation: studioDraft.identityPresentation };
  const state = resolveRefresh({
    currentContext,
    nextContext: { profileId: 'a', loadError: 'Profile details unavailable.' },
    studioDraft,
    studioIdentityDraft
  });

  assert.notEqual(state.context, currentContext);
  assert.equal(state.context.dataWarning, 'Profile details unavailable.');
  assert.equal(state.studioDraft, studioDraft);
  assert.equal(state.studioIdentityDraft, studioIdentityDraft);
  assert.equal(state.fullContextLoaded, false);
});

test('an empty successful response leaves the current projection intact', () => {
  const currentContext = { profileId: 'a', targetProfile: { id: 'a' } };
  const studioDraft = { identityPresentation: { layout: 'centered' } };
  const studioIdentityDraft = { bio: 'Typed bio', identityPresentation: studioDraft.identityPresentation };
  const state = resolveRefresh({
    currentContext,
    nextContext: { profileId: null },
    studioDraft,
    studioIdentityDraft
  });

  assert.equal(state.context, currentContext);
  assert.equal(state.studioDraft, studioDraft);
  assert.equal(state.studioIdentityDraft, studioIdentityDraft);
  assert.equal(state.fullContextLoaded, true);
});

test('a current full-context read completes an initial loading state', async () => {
  let resolveRead;
  const state = createRefreshHarness({
    loadProfileContext: () => new Promise(resolve => { resolveRead = resolve; })
  });

  const pending = vm.runInContext('ensureFullContext()', state);
  assert.equal(state.loading, true);
  resolveRead({
    profileId: 'a',
    targetProfile: { id: 'a', bio: 'Current bio' },
    profileConfig: { draft: { links: [] } }
  });
  await pending;

  assert.equal(state.fullContextLoaded, true);
  assert.equal(state.loading, false);
  assert.equal(state.fullContextPromise, null);
});

test('a thrown full-context read keeps a warning and remains retryable', async () => {
  const state = createRefreshHarness({
    loadProfileContext: async () => { throw new Error('Network unavailable.'); }
  });

  await vm.runInContext('ensureFullContext()', state);

  assert.equal(state.context.dataWarning, 'Network unavailable.');
  assert.equal(state.fullContextLoaded, false);
  assert.equal(state.loading, false);
  assert.equal(state.fullContextPromise, null);
});

test('a failed lazy projector import fails closed and remains retryable', async () => {
  const profileConfig = { draft: { links: [] } };
  const studioDraft = { identityPresentation: { layout: 'centered' }, links: [{ label: 'Staged' }] };
  const state = createRefreshHarness({
    loadProfileContext: async () => ({
      profileId: 'a',
      targetProfile: { id: 'a', bio: 'Current bio' },
      profileConfig: { draft: {} }
    }),
    loadStateModule: null,
    context: {
      profileId: 'a',
      targetProfile: { id: 'a', bio: 'Current bio' },
      profileConfig
    },
    studioDraft
  });

  await vm.runInContext('ensureFullContext()', state);

  assert.equal(state.context.configurationUnavailable, true);
  assert.equal(state.context.profileConfig, profileConfig);
  assert.equal(state.studioDraft, studioDraft);
  assert.equal(state.context.dataWarning, 'Profile settings are temporarily unavailable.');
  assert.equal(isProfileConfigurationWritable(state.context), false);
  assert.equal(state.fullContextLoaded, false);
  assert.equal(state.loading, false);
});

test('a failed lazy projector import cannot repopulate an account-reset context', async () => {
  const state = createRefreshHarness({
    loadProfileContext: async () => ({
      profileId: 'b',
      targetProfile: { id: 'b', bio: 'Other profile' },
      profileConfig: { draft: {} }
    }),
    loadStateModule: null,
    context: null,
    studioDraft: null,
    studioIdentityDraft: null
  });
  state.$session = { user: { id: 'b' } };

  await vm.runInContext('ensureFullContext()', state);

  assert.equal(state.context.profileId, undefined);
  assert.equal(state.context.profileConfig, undefined);
  assert.equal(state.context.dataWarning, 'Profile settings are temporarily unavailable.');
  assert.equal(state.studioDraft, null);
  assert.equal(state.studioIdentityDraft, null);
  assert.equal(isProfileConfigurationWritable(state.context), false);
});

test('a stale full-context response cannot clear a newer load or change its context', async () => {
  let resolveRead;
  const state = createRefreshHarness({
    loadProfileContext: () => new Promise(resolve => { resolveRead = resolve; })
  });
  const originalContext = state.context;
  const pending = vm.runInContext('ensureFullContext()', state);

  state.requestId += 1;
  state.loading = true;
  state.fullContextPromise = null;
  resolveRead({
    profileId: 'a',
    targetProfile: { id: 'a', bio: 'Stale response' },
    profileConfig: { draft: {} }
  });
  await pending;

  assert.equal(state.context, originalContext);
  assert.equal(state.loading, true);
  assert.equal(state.fullContextPromise, null);
});

test('ProfileSettings checks freshness before projection and keeps async lifecycle local', () => {
  const freshnessCheck = ensureFullContext.indexOf('if (nextRequestId !== requestId) return context;');
  const projection = ensureFullContext.indexOf('loadStateModule.resolveProfileStudioFullContextRefreshState(');
  const errorHandler = ensureFullContext.indexOf('.catch(loadError => {');
  const promiseCleanup = ensureFullContext.indexOf('.finally(() => {');

  assert.ok(freshnessCheck >= 0);
  assert.ok(projection > freshnessCheck);
  assert.ok(errorHandler > projection);
  assert.ok(promiseCleanup > errorHandler);
  assert.match(ensureFullContext, /if \(nextRequestId === requestId\) \{\s+fullContextPromise = null;\s+loading = false;/);
  assert.match(ensureFullContext, /if \(nextRequestId === requestId\) \{[\s\S]*loading = false/);
  assert.match(ensureFullContext, /fullContextLoaded = false/);
  assert.match(source, /on:click=\{\(\) => ensureFullContext\(\)\}/);
});
