<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { restoreFocus, trapFocus } from './a11y.js';
  import { authUser, equippedItems, isAuthenticated, profile, profileEntitlements, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext, loadProfileStudioContext } from './profileData.js';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import ProfileStudioShell from './ProfileStudioShell.svelte';
  import ProfileStudioHeader from './ProfileStudioHeader.svelte';
  import ProfileStudioWorkspace from './ProfileStudioWorkspace.svelte';
  import ProfileStudioDirtyPrompt from './ProfileStudioDirtyPrompt.svelte';
  import {
    PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES,
    PROFILE_STUDIO_CUSTOMIZE_TAB_IDS,
    PROFILE_STUDIO_FALLBACK_COLOR,
    PROFILE_STUDIO_HASH_ALIASES,
    PROFILE_STUDIO_SECTIONS,
    getProfileStudioHash,
    getVisibleProfileStudioSections,
    resolveProfileStudioLocation
  } from './profile-studio/dashboardContract.js';
  import { PROFILE_STUDIO_SECTION_LOADERS } from './profile-studio/sectionRegistry.js';
  import {
    asConfigurationV2 as asConfigurationV2Model,
    applyProfileStudioDraftPatch,
    applyProfileStudioIdentityPatch,
    buildConfigurationV2 as buildConfigurationV2Model,
    createEditorProfileConfig,
    createEmptyEditorProfileConfig,
    createProfileStudioPreviewModel,
    hasServerDraftChanges,
    preserveExpressionFields,
    toEditorProfileConfig
  } from './profile-studio/draftModel.js';
  import {
    clearDirtySourcesForSection,
    dirtySourceForEvent,
    hasDirtySources,
    updateDirtySource
  } from './profile-studio/dirtyState.js';

  const SECTION_LOADERS = PROFILE_STUDIO_SECTION_LOADERS;

  // Shared contracts keep old #profile-* destinations alive while this file
  // remains only the authenticated route/state adapter.
  const FALLBACK_PROFILE_COLOR = PROFILE_STUDIO_FALLBACK_COLOR;
  const CUSTOMIZE_TAB_IDS = PROFILE_STUDIO_CUSTOMIZE_TAB_IDS;
  const CUSTOMIZE_TAB_HASHES = PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES;
  const SETTINGS_SECTIONS = PROFILE_STUDIO_SECTIONS;
  const HASH_ALIASES = PROFILE_STUDIO_HASH_ALIASES;
  const CUSTOMIZE_TAB_LABELS = Object.freeze({ appearance: 'Appearance', media: 'Media', links: 'Links', layout: 'Layout' });

  const dispatch = createEventDispatcher();

  function createInitialSettingsContext() {
    const currentProfile = { ...($profile || {}) };
    return {
      profileId: currentProfile.id || $session?.user?.id || null,
      viewingOwnProfile: true,
      targetProfile: currentProfile,
      targetScores: [],
      timelineEvents: [],
      collectionItems: [],
      profileConfig: createEmptyEditorProfileConfig(),
      social: createEmptyProfileSocial(),
      socialSettings: createDefaultProfileSocialSettings(),
      allAchievements: [],
      unlockedAchievements: {},
      progression: { currentEp: Number(currentProfile.lifetime_ep) || 0, currentRank: null, nextRank: null, nextReward: null, milestones: [], recentUnlocks: [] },
      totalRolls: Number(currentProfile.total_rolls) || 0,
      loadError: '',
      dataWarning: ''
    };
  }

  /** @type {any} */
  let context = createInitialSettingsContext();
  let loading = false;
  let error = '';
  let requestId = 0;
  let activeSection = 'customize';
  let activeCustomizeTab = 'appearance';
  let isMobileViewport = false;
  let previewMediaQuery = null;
  let studioDraft = null;
  let studioIdentityDraft = null;
  let cosmeticPreviewLoadout = null;
  let previewOpen = false;
  let previewDevice = 'desktop';
  let sectionComponents = {};
  let sectionLoading = false;
  const sectionLoadPromises = new SvelteMap();
  let dirtySources = {};
  let pendingNavigation = null;
  let showDirtyPrompt = false;
  let dirtyPromptComponent = null;
  let dirtyPromptReturnFocus = null;
  let workspace = null;
  let dashboardSaving = false;
  let dashboardStatus = '';
  let dashboardError = '';
  let ProfilePreviewComponent = null;
  let previewLoadPromise = null;
  let previewError = '';
  let fullContextLoaded = false;
  let fullContextPromise = null;
  const settingsLoadAccounts = new SvelteSet();

  $: accountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: accountKey = $isAuthenticated && $session?.user?.id ? $session.user.id : '';
  $: if (!accountKey) resetSettingsLoadState();
  $: if (accountKey) ensureSettingsLoaded(accountKey);
  $: profilePath = context?.targetProfile?.username ? getCanonicalProfilePath(context.targetProfile.username) : '/profile';
  $: featureFlags = resolveProfileFeatureFlags({
    userId: context?.profileId || $session?.user?.id,
    isStaff: Boolean(context?.targetProfile?.is_staff || $profile?.is_staff)
  });
  $: visibleSettingsSections = getVisibleProfileStudioSections(featureFlags, SETTINGS_SECTIONS);
  $: if (!visibleSettingsSections.some(section => section.id === activeSection)) activeSection = 'customize';
  $: activeLabel = visibleSettingsSections.find(section => section.id === activeSection)?.label || 'Customize';
  $: mobileStudioTitle = activeSection === 'customize' ? (CUSTOMIZE_TAB_LABELS[activeCustomizeTab] || activeLabel) : activeLabel;
  // Links is part of Customize now, so every Customize tab shares the same
  // live preview contract.
  $: customizePreviewAvailable = activeSection === 'customize';
  $: showDashboardPreview = customizePreviewAvailable && (!isMobileViewport || previewOpen);
  function createStudioEditorProfileConfig(value) {
    const base = createEditorProfileConfig(value);
    return base && studioDraft ? { ...base, draft: studioDraft } : base;
  }

  $: editorProfileConfig = createStudioEditorProfileConfig(context?.profileConfig);
  $: dashboardDirty = hasDirtySources(dirtySources) || hasServerDraftChanges(context?.profileConfig);
  $: previewModel = createProfileStudioPreviewModel({
    targetProfile: context?.targetProfile,
    profileConfig: context?.profileConfig,
    equippedCosmetics: $equippedItems,
    studioDraft,
    studioIdentityDraft,
    cosmeticPreviewLoadout,
    fallbackColor: FALLBACK_PROFILE_COLOR,
    previewDevice,
    featureFlags,
    previewScores: context?.targetScores || [],
    previewTimelineEvents: context?.timelineEvents || [],
    previewCollectionItems: context?.collectionItems || [],
    previewAllAchievements: context?.allAchievements || [],
    dev: import.meta.env.DEV
  });
  $: previewRenderSnapshot = previewModel.snapshot;

  function resetSettingsLoadState() {
    if (!settingsLoadAccounts.size) return;
    settingsLoadAccounts.clear();
    requestId += 1;
  }

  function ensureSettingsLoaded(nextAccountKey) {
    if (settingsLoadAccounts.has(nextAccountKey)) return;
    settingsLoadAccounts.add(nextAccountKey);
    void loadSettings(nextAccountKey);
  }

  onMount(() => {
    previewMediaQuery = window.matchMedia('(max-width: 64rem)');
    const updatePreviewViewport = () => {
      isMobileViewport = previewMediaQuery.matches;
      if (!isMobileViewport && activeSection === 'customize') {
        previewOpen = true;
        void loadPreviewComponent();
      }
    };
    updatePreviewViewport();
    previewMediaQuery.addEventListener?.('change', updatePreviewViewport);

    const getLocationState = () => resolveProfileStudioLocation(window.location.hash, visibleSettingsSections);
    const restoreLocation = () => {
      const nextLocation = getLocationState();
      const nextSection = nextLocation.sectionId;
      if (nextSection === activeSection) {
        if (nextSection === 'customize' && nextLocation.customizeTab && nextLocation.customizeTab !== activeCustomizeTab) {
          activeCustomizeTab = nextLocation.customizeTab;
          void loadCustomizeComponents();
        }
        return;
      }
      if (dashboardDirty) {
        const currentHash = getProfileStudioHash(activeSection, activeCustomizeTab);
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${currentHash}`);
        openDirtyPrompt({ type: 'section', value: nextSection, customizeTab: nextLocation.customizeTab });
        return;
      }
      setActiveSection(nextSection, {
        push: false,
        customizeTab: nextLocation.customizeTab,
        hash: nextLocation.rawHash && (HASH_ALIASES[nextLocation.rawHash] || visibleSettingsSections.some(section => section.id === nextLocation.rawHash))
          ? nextLocation.rawHash
          : null
      });
    };
    const initialLocation = getLocationState();
    setActiveSection(initialLocation.sectionId, {
      push: false,
      customizeTab: initialLocation.customizeTab,
      hash: initialLocation.rawHash && (HASH_ALIASES[initialLocation.rawHash] || visibleSettingsSections.some(section => section.id === initialLocation.rawHash))
        ? initialLocation.rawHash
        : null
    });
    window.addEventListener('hashchange', restoreLocation);
    window.addEventListener('popstate', restoreLocation);
    const beforeUnload = event => {
      if (!dashboardDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const navigationGuard = event => {
      if (!dashboardDirty) return;
      event.preventDefault();
      openDirtyPrompt(event.detail?.navigation
        ? { type: 'navigate', value: event.detail.navigation }
        : { type: 'path', value: event.detail?.nextPath || window.location.pathname });
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('chromadie:navigation-request', navigationGuard);
    return () => {
      window.removeEventListener('hashchange', restoreLocation);
      window.removeEventListener('popstate', restoreLocation);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('chromadie:navigation-request', navigationGuard);
      previewMediaQuery?.removeEventListener?.('change', updatePreviewViewport);
    };
  });

  function setActiveSection(sectionId, { push = true, customizeTab = null, hash = null } = {}) {
    if (!visibleSettingsSections.some(section => section.id === sectionId)) return;
    if (sectionId === 'customize' && CUSTOMIZE_TAB_IDS.includes(customizeTab)) activeCustomizeTab = customizeTab;
    activeSection = sectionId;
    if (sectionId === 'customize') {
      if (!isMobileViewport) {
        previewOpen = true;
        void loadPreviewComponent();
      }
    } else previewOpen = false;
    if (sectionId === 'customize') void loadCustomizeComponents();
    else void loadSectionComponent(sectionId);
    if (sectionId !== 'customize' && sectionId !== 'premium') {
      void ensureFullContext();
    }
    if (typeof window !== 'undefined') {
      const nextHash = hash || getProfileStudioHash(sectionId, customizeTab || activeCustomizeTab);
      const url = `${window.location.pathname}${window.location.search}#${nextHash}`;
      if (push) window.history.pushState({ dashboardSection: sectionId }, '', url);
      else if (window.location.hash !== `#${nextHash}`) window.history.replaceState({ dashboardSection: sectionId }, '', url);
    }
  }

  function handleDashboardSectionChange(event) {
    const sectionId = event.detail?.sectionId;
    if (!sectionId || sectionId === activeSection) return;
    if (dashboardDirty) {
      openDirtyPrompt({ type: 'section', value: sectionId });
      return;
    }
    setActiveSection(sectionId);
  }

  function selectCustomizeTab(tabId, { push = true, focus = false } = {}) {
    if (!CUSTOMIZE_TAB_IDS.includes(tabId)) return;
    activeCustomizeTab = tabId;
    void loadCustomizeComponents();
    if (typeof window !== 'undefined') {
      const nextHash = CUSTOMIZE_TAB_HASHES[tabId];
      const url = `${window.location.pathname}${window.location.search}#${nextHash}`;
      if (push) window.history.pushState({ dashboardSection: 'customize', customizeTab: tabId }, '', url);
      else if (window.location.hash !== `#${nextHash}`) window.history.replaceState({ dashboardSection: 'customize', customizeTab: tabId }, '', url);
    }
    if (focus && typeof document !== 'undefined') requestAnimationFrame(() => document.getElementById(`profile-customize-tab-${tabId}`)?.focus());
  }

  function togglePreview() {
    if (!customizePreviewAvailable) return;
    previewOpen = !previewOpen;
    if (previewOpen) void loadPreviewComponent();
  }

  function setPreviewDevice(device) {
    if (device === 'desktop' || device === 'mobile') previewDevice = device;
  }

  function handleSectionDirty(event) {
    const isDirty = event.detail?.dirty === true;
    const source = dirtySourceForEvent(event.detail, activeSection);
    dirtySources = updateDirtySource(dirtySources, source, isDirty);
    if (isDirty) {
      dashboardError = '';
      dashboardStatus = '';
    }
  }

  function resetActiveEditor() {
    workspace?.resetChanges?.(activeSection);
    dirtySources = clearDirtySourcesForSection(dirtySources, activeSection);
  }

  function openDirtyPrompt(next) {
    pendingNavigation = next;
    if (!dirtyPromptReturnFocus && typeof document !== 'undefined') dirtyPromptReturnFocus = document.activeElement;
    showDirtyPrompt = true;
    requestAnimationFrame(() => dirtyPromptComponent?.focusPrimary?.());
  }

  function closeDirtyPrompt() {
    const previous = dirtyPromptReturnFocus;
    dirtyPromptReturnFocus = null;
    showDirtyPrompt = false;
    requestAnimationFrame(() => restoreFocus(previous));
  }

  function stayOnPage() {
    pendingNavigation = null;
    closeDirtyPrompt();
  }

  function discardAndContinue() {
    const next = pendingNavigation;
    resetActiveEditor();
    pendingNavigation = null;
    closeDirtyPrompt();
    if (!next) return;
    if (next.type === 'section') setActiveSection(next.value, { customizeTab: next.customizeTab || null });
    else if (next.type === 'route') window.location.assign(next.value);
    else if (next.type === 'navigate') dispatch('navigate', next.value);
    else if (next.type === 'path') {
      window.history.pushState({}, '', next.value);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  function loadSectionComponent(sectionId) {
    const loader = SECTION_LOADERS[sectionId];
    if (!loader || sectionComponents[sectionId]) return Promise.resolve();
    if (sectionLoadPromises.has(sectionId)) return sectionLoadPromises.get(sectionId);
    sectionLoading = true;
    const promise = loader()
      .then(module => { sectionComponents = { ...sectionComponents, [sectionId]: module.default }; })
      .catch(loadError => { error = loadError instanceof Error ? loadError.message : 'The dashboard section could not be loaded.'; })
      .finally(() => { sectionLoadPromises.delete(sectionId); sectionLoading = sectionLoadPromises.size > 0; });
    sectionLoadPromises.set(sectionId, promise);
    return promise;
  }

  async function loadPreviewComponent() {
    if (ProfilePreviewComponent) return ProfilePreviewComponent;
    if (previewLoadPromise) return previewLoadPromise;
    previewError = '';
    previewLoadPromise = import('./ProfileStudioPreview.svelte')
      .then(module => {
        ProfilePreviewComponent = module.default;
        return ProfilePreviewComponent;
      })
      .catch(loadError => {
        previewError = loadError instanceof Error ? loadError.message : 'The live preview could not be loaded.';
        return null;
      })
      .finally(() => { previewLoadPromise = null; });
    return previewLoadPromise;
  }

  async function loadCustomizeComponents() {
    const sectionIds = activeCustomizeTab === 'appearance'
      ? ['customize', 'profile-identity', 'profile-collection']
      : activeCustomizeTab === 'media'
        ? ['customize', 'profile-media']
        : activeCustomizeTab === 'links'
          ? ['customize', 'profile-layout', 'profile-aliases']
          : ['customize'];
    await Promise.all(sectionIds.map(sectionId => loadSectionComponent(sectionId)));
  }

  function buildConfigurationV2(editorConfig, reference = context?.profileConfig?.v2Draft) {
    return buildConfigurationV2Model(editorConfig, reference, FALLBACK_PROFILE_COLOR);
  }

  function asConfigurationV2(value, fallback) {
    return asConfigurationV2Model(value, fallback, FALLBACK_PROFILE_COLOR);
  }

  function getDashboardEditor() {
    return workspace;
  }

  function getDashboardDraft() {
    return normalizeProfileConfig(
      studioDraft || toEditorProfileConfig(context?.profileConfig?.draft),
      FALLBACK_PROFILE_COLOR
    );
  }

  function getDashboardIdentity() {
    return studioIdentityDraft || getDashboardEditor()?.getDraftIdentity?.() || null;
  }

  function applyDashboardConfiguration({ draft, published, updatedAt, publishedAt }) {
    const nextDraftV2 = asConfigurationV2(draft, context?.profileConfig?.v2Draft);
    const nextPublishedV2 = asConfigurationV2(published, context?.profileConfig?.v2Published || nextDraftV2);
    const nextDraft = toEditorProfileConfig(nextDraftV2);
    context = {
      ...context,
      profileConfig: {
        ...(context.profileConfig || {}),
        version: 2,
        draft: nextDraftV2,
        published: nextPublishedV2,
        v2Draft: nextDraftV2,
        v2Published: nextPublishedV2,
        updatedAt: updatedAt || context.profileConfig?.updatedAt || null,
        publishedAt: publishedAt || context.profileConfig?.publishedAt || null
      }
    };
    studioDraft = nextDraft;
    studioIdentityDraft = {
      bio: context?.targetProfile?.bio || '',
      identityPresentation: nextDraft.identityPresentation
    };
    workspace?.acceptSaved?.({
      ...nextDraft,
      bio: context?.targetProfile?.bio || ''
    });
    cosmeticPreviewLoadout = null;
    dirtySources = {};
  }

  function responseError(response, fallback) {
    return response?.error?.message || response?.data?.error || fallback;
  }

  function isFailedResponse(response) {
    return Boolean(response?.error || response?.data?.success === false || response?.data?.code === 'conflict');
  }

  async function publishDashboard() {
    if (dashboardSaving) return;
    const editor = getDashboardEditor();
    if (editor?.validateDraft && !editor.validateDraft()) {
      dashboardError = 'Finish the highlighted fields before publishing.';
      dashboardStatus = '';
      return;
    }
    dashboardSaving = true;
    dashboardError = '';
    dashboardStatus = 'Publishing profile…';
    const editorDraft = getDashboardDraft();
    const identityDraft = getDashboardIdentity();
    const v2Draft = buildConfigurationV2(editorDraft);
    const publishResponse = await supabase.rpc('publish_profile_studio_v2', {
      p_draft: v2Draft,
      p_display_name: accountUsername || null,
      p_bio: identityDraft?.bio ?? context?.targetProfile?.bio ?? null,
      p_expected_updated_at: context.profileConfig?.updatedAt || null
    });
    if (isFailedResponse(publishResponse)) {
      dashboardSaving = false;
      dashboardStatus = '';
      dashboardError = responseError(publishResponse, 'The profile could not be published.');
      return;
    }
    const nextBio = publishResponse.data?.identity?.bio ?? identityDraft?.bio ?? context?.targetProfile?.bio ?? null;
    // Settings remounts hydrate from the authenticated account store. Keep it
    // aligned with the successful publish so leaving for the public profile
    // and returning cannot restore the pre-publish bio.
    profile.update(currentProfile => currentProfile && currentProfile.id === context.profileId
      ? { ...currentProfile, bio: nextBio }
      : currentProfile);
    context = { ...context, targetProfile: { ...context.targetProfile, bio: nextBio } };
    applyDashboardConfiguration({
      draft: publishResponse.data?.draft || v2Draft,
      published: publishResponse.data?.published || v2Draft,
      updatedAt: publishResponse.data?.updated_at || context.profileConfig?.updatedAt,
      publishedAt: publishResponse.data?.published_at || context.profileConfig?.publishedAt
    });
    dashboardSaving = false;
    dashboardStatus = 'Profile published.';
    dashboardError = '';
  }

  async function resetDashboard() {
    if (dashboardSaving || !dashboardDirty) return;
    dashboardSaving = true;
    dashboardError = '';
    dashboardStatus = 'Resetting profile changes…';
    const publishedConfig = toEditorProfileConfig(context?.profileConfig?.published);
    const v2Draft = buildConfigurationV2(publishedConfig, context?.profileConfig?.v2Published);
    const response = await supabase.rpc('save_profile_configuration_v2', {
      p_draft: v2Draft,
      p_expected_updated_at: context.profileConfig?.updatedAt || null
    });
    if (isFailedResponse(response)) {
      dashboardSaving = false;
      dashboardStatus = '';
      dashboardError = responseError(response, 'The profile changes could not be reset.');
      return;
    }
    applyDashboardConfiguration({
      draft: response.data?.draft || v2Draft,
      published: response.data?.published || context.profileConfig?.v2Published || v2Draft,
      updatedAt: response.data?.updated_at || context.profileConfig?.updatedAt,
      publishedAt: context.profileConfig?.publishedAt
    });
    dashboardSaving = false;
    dashboardStatus = 'Profile changes reset.';
  }

  async function loadSettings(expectedAccountKey = '') {
    const nextRequestId = ++requestId;
    const previousContext = context;
    loading = !previousContext?.targetProfile || !previousContext?.profileConfig;
    error = '';
    dashboardStatus = '';
    dashboardError = '';
    fullContextLoaded = false;
    fullContextPromise = null;
    const nextContext = await loadProfileStudioContext({
      supabaseClient: supabase,
      profileRecord: $profile,
      sessionUserId: $session?.user?.id
    });
    if (nextRequestId !== requestId) return;
    if (expectedAccountKey && expectedAccountKey !== $session?.user?.id) return;
    if (nextContext.loadError && previousContext) {
      context = { ...previousContext, dataWarning: nextContext.loadError };
      loading = false;
      return;
    }
    context = nextContext;
    studioDraft = toEditorProfileConfig(nextContext.profileConfig?.draft, FALLBACK_PROFILE_COLOR);
    studioIdentityDraft = {
      bio: nextContext.targetProfile?.bio || '',
      identityPresentation: studioDraft.identityPresentation
    };
    cosmeticPreviewLoadout = null;
    loading = false;
    if (nextContext.loadError) error = nextContext.loadError;
    else if (!nextContext.viewingOwnProfile) error = 'Profile settings are available only for your own profile.';
  }

  async function ensureFullContext({ force = false } = {}) {
    if (fullContextLoaded && !force) return context;
    if (fullContextPromise && !force) return fullContextPromise;
    const nextRequestId = ++requestId;
    fullContextPromise = loadProfileContext({
      supabaseClient: supabase,
      isAuthenticated: $isAuthenticated,
      sessionUserId: $session?.user?.id,
      currentUsername: accountUsername
    }).then(nextContext => {
      if (nextRequestId !== requestId) return context;
      if (nextContext.targetProfile || nextContext.profileConfig) {
        context = {
          ...context,
          ...nextContext,
          targetProfile: nextContext.targetProfile || context.targetProfile,
          profileConfig: nextContext.profileConfig || context.profileConfig
        };
        studioDraft = toEditorProfileConfig(context.profileConfig?.draft, FALLBACK_PROFILE_COLOR);
        studioIdentityDraft = {
          bio: context.targetProfile?.bio || '',
          identityPresentation: studioDraft?.identityPresentation
        };
      }
      fullContextLoaded = true;
      return context;
    }).catch(loadError => {
      context = { ...context, dataWarning: loadError instanceof Error ? loadError.message : 'Additional profile details are temporarily unavailable.' };
      return context;
    }).finally(() => {
      fullContextPromise = null;
    });
    return fullContextPromise;
  }

  function updateConfiguration(event) {
    const currentDraft = toEditorProfileConfig(context?.profileConfig?.draft);
    const currentPublished = toEditorProfileConfig(context?.profileConfig?.published);
    const nextDraft = normalizeProfileConfig(preserveExpressionFields(event.detail?.draft, currentDraft), FALLBACK_PROFILE_COLOR);
    const nextPublished = normalizeProfileConfig(preserveExpressionFields(event.detail?.published, currentPublished), FALLBACK_PROFILE_COLOR);
    if (context.profileConfig?.version === 2 || context.profileConfig?.v2Draft) {
      const nextDraftV2 = buildConfigurationV2(nextDraft, context.profileConfig?.v2Draft);
      const nextPublishedV2 = buildConfigurationV2(nextPublished, context.profileConfig?.v2Published);
      context = {
        ...context,
        profileConfig: {
          ...(context.profileConfig || {}),
          version: 2,
          draft: nextDraftV2,
          published: nextPublishedV2,
          v2Draft: nextDraftV2,
          v2Published: nextPublishedV2,
          updatedAt: event.detail?.updatedAt || context.profileConfig?.updatedAt,
          publishedAt: event.detail?.publishedAt || context.profileConfig?.publishedAt
        }
      };
    } else {
      context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: nextDraft, published: nextPublished, updatedAt: event.detail?.updatedAt || context.profileConfig?.updatedAt, publishedAt: event.detail?.publishedAt || context.profileConfig?.publishedAt } };
    }
    studioDraft = nextDraft;
    studioIdentityDraft = {
      ...(studioIdentityDraft || {}),
      identityPresentation: nextDraft.identityPresentation
    };
  }

  function updateExpression(event) {
    const fields = event.detail || {};
    const updatedAt = fields.updatedAt || fields.updated_at || context.profileConfig?.updatedAt || null;
    const nextDraft = normalizeProfileConfig({ ...toEditorProfileConfig(context.profileConfig?.draft), ...fields }, FALLBACK_PROFILE_COLOR);
    const nextPublished = normalizeProfileConfig({ ...toEditorProfileConfig(context.profileConfig?.published), ...fields }, FALLBACK_PROFILE_COLOR);
    // Media edits are saved through the expression RPC before they reach this
    // adapter. Project only those returned fields into the one Studio draft so
    // a persisted upload is visible without waiting for a full reload.
    studioDraft = applyProfileStudioDraftPatch(
      studioDraft || nextDraft,
      { scope: 'media', detail: fields },
      FALLBACK_PROFILE_COLOR
    );
    if (context.profileConfig?.version === 2 || context.profileConfig?.v2Draft) {
      const nextDraftV2 = buildConfigurationV2(nextDraft, context.profileConfig?.v2Draft);
      const nextPublishedV2 = buildConfigurationV2(nextPublished, context.profileConfig?.v2Published);
      context = { ...context, profileConfig: { ...(context.profileConfig || {}), version: 2, draft: nextDraftV2, published: nextPublishedV2, v2Draft: nextDraftV2, v2Published: nextPublishedV2, updatedAt } };
    } else {
      context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: nextDraft, published: nextPublished, updatedAt } };
    }
  }

  function updateAppearance(event) {
    studioDraft = applyProfileStudioDraftPatch(
      studioDraft || context.profileConfig?.draft,
      { scope: 'appearance', detail: event.detail || {} },
      FALLBACK_PROFILE_COLOR
    );
  }

  function handleAppearanceSaved(event) {
    updateConfiguration({ detail: event.detail });
  }

  function handleConfigurationReloaded(event) {
    updateConfiguration({ detail: event.detail });
  }

  function applyStudioPatch(event) {
    const patch = event.detail || {};
    const scope = patch.scope;
    const detail = patch.detail || {};
    if (!scope) return;
    if (scope === 'media') {
      updateExpression({ detail });
      return;
    }
    if (scope === 'appearance') {
      updateAppearance({ detail });
      return;
    }
    if (scope === 'appearance-background') {
      studioDraft = applyProfileStudioDraftPatch(
        studioDraft || context.profileConfig?.draft,
        { scope, detail },
        FALLBACK_PROFILE_COLOR
      );
      return;
    }
    if (scope === 'identity') {
      studioIdentityDraft = applyProfileStudioIdentityPatch(studioIdentityDraft, detail);
      if (Object.prototype.hasOwnProperty.call(detail, 'identityPresentation')) {
        studioDraft = normalizeProfileConfig({
          ...(studioDraft || toEditorProfileConfig(context.profileConfig?.draft)),
          identityPresentation: detail.identityPresentation
        }, FALLBACK_PROFILE_COLOR);
      }
      return;
    }
    studioDraft = applyProfileStudioDraftPatch(
      studioDraft || context.profileConfig?.draft,
      { scope, detail },
      FALLBACK_PROFILE_COLOR
    );
  }

  function updateCosmeticPreview(event) {
    cosmeticPreviewLoadout = event.detail?.loadout || null;
  }

  function handleSocialChange() { void ensureFullContext({ force: true }); }

  function updateIdentity(event) {
    const nextPresentation = event.detail?.identityPresentation;
    const currentConfig = context.profileConfig || {};
    if (!nextPresentation) {
      context = { ...context, targetProfile: { ...context.targetProfile, bio: event.detail?.bio ?? null }, profileConfig: currentConfig };
      studioIdentityDraft = applyProfileStudioIdentityPatch(studioIdentityDraft, event.detail || {});
      return;
    }
    const nextDraft = normalizeProfileConfig({ ...toEditorProfileConfig(currentConfig.draft), identityPresentation: nextPresentation }, FALLBACK_PROFILE_COLOR);
    const nextPublished = normalizeProfileConfig({ ...toEditorProfileConfig(currentConfig.published), identityPresentation: nextPresentation }, FALLBACK_PROFILE_COLOR);
    const nextProfileConfig = currentConfig.version === 2 || currentConfig.v2Draft
      ? (() => {
          const nextDraftV2 = buildConfigurationV2(nextDraft, currentConfig.v2Draft);
          const nextPublishedV2 = buildConfigurationV2(nextPublished, currentConfig.v2Published);
          return { ...currentConfig, version: 2, draft: nextDraftV2, published: nextPublishedV2, v2Draft: nextDraftV2, v2Published: nextPublishedV2 };
        })()
      : { ...currentConfig, draft: nextDraft, published: nextPublished };
    context = {
      ...context,
      targetProfile: { ...context.targetProfile, bio: event.detail?.bio ?? null },
      profileConfig: nextProfileConfig
    };
    // The server response is authoritative for the persisted identity fields,
    // but it must not replace unrelated staged Studio fields. Project only the
    // identity slice into the canonical draft used by the renderer.
    studioDraft = normalizeProfileConfig({
      ...(studioDraft || toEditorProfileConfig(currentConfig.draft)),
      identityPresentation: nextPresentation
    }, FALLBACK_PROFILE_COLOR);
    studioIdentityDraft = applyProfileStudioIdentityPatch(studioIdentityDraft, event.detail || {});
  }

  function handleDirtyPromptKeydown(event) {
    if (!showDirtyPrompt) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      stayOnPage();
      return;
    }
    trapFocus(event, dirtyPromptComponent?.getDialog?.());
  }

  function handleAccountDeleted(event) { dispatch('accountdeleted', event.detail); }
</script>

<svelte:window on:keydown={handleDirtyPromptKeydown} />

<ProfileStudioShell
  sections={[...visibleSettingsSections]}
  {activeSection}
  ownerProfilePath={profilePath}
  mobileTitle={mobileStudioTitle}
  mobilePreviewAvailable={customizePreviewAvailable}
  mobilePreviewOpen={showDashboardPreview}
  mobileDirty={dashboardDirty}
  mobileSaving={dashboardSaving}
  dirty={dashboardDirty}
  previewRenderSnapshot={previewRenderSnapshot}
  showPreview={showDashboardPreview}
  showBrand={true}
  on:sectionchange={handleDashboardSectionChange}
  on:previewtoggle={togglePreview}
  on:reset={resetDashboard}
  on:publish={publishDashboard}
>
  <div class="profile-settings-page" data-dashboard-adapter="profile-studio" aria-busy={loading}>
    {#if context?.dataWarning}<p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>{/if}
    {#if context && !loading && !error}
      <ProfileStudioHeader
        {activeSection}
        {activeCustomizeTab}
        {activeLabel}
        previewAvailable={customizePreviewAvailable}
        {previewOpen}
        dirty={dashboardDirty}
        saving={dashboardSaving}
        status={dashboardStatus}
        error={dashboardError}
        on:tabchange={event => selectCustomizeTab(event.detail?.tabId, { focus: event.detail?.focus })}
        on:previewtoggle={togglePreview}
      />
    {/if}
    <ProfileStudioWorkspace
      bind:this={workspace}
      {activeSection}
      {activeCustomizeTab}
      {context}
      {editorProfileConfig}
      {sectionComponents}
      {sectionLoading}
      {loading}
      {error}
      {profilePath}
      {accountUsername}
      {studioIdentityDraft}
      cosmeticPreviewLoadout={cosmeticPreviewLoadout}
      entitlements={$profileEntitlements}
      staff={Boolean(context?.targetProfile?.is_staff)}
      isAuthenticated={$isAuthenticated}
      {featureFlags}
      on:studiopatch={applyStudioPatch}
      on:cosmeticpreview={updateCosmeticPreview}
      on:dirty={handleSectionDirty}
      on:identitysaved={updateIdentity}
      on:configsaved={handleAppearanceSaved}
      on:configpublished={updateConfiguration}
      on:configreloaded={handleConfigurationReloaded}
      on:socialchange={handleSocialChange}
      on:accountdeleted={handleAccountDeleted}
    />
  </div>

  <svelte:fragment slot="preview">
    {#if ProfilePreviewComponent}
      <svelte:component
        this={ProfilePreviewComponent}
        previewRenderSnapshot={previewRenderSnapshot}
        {activeSection}
        {activeCustomizeTab}
        {previewDevice}
        {isMobileViewport}
        on:toggle={togglePreview}
        on:devicechange={event => setPreviewDevice(event.detail)}
      />
    {:else if previewError}
      <div class="profile-settings-page__preview-state" role="alert">{previewError}</div>
    {:else}
      <div class="profile-settings-page__preview-state" role="status">Preparing live preview…</div>
    {/if}
  </svelte:fragment>
</ProfileStudioShell>

<ProfileStudioDirtyPrompt bind:this={dirtyPromptComponent} open={showDirtyPrompt} on:stay={stayOnPage} on:discard={discardAndContinue} />

<style>
  .profile-settings-page { width: 100%; min-width: 0; }
  .profile-settings-page__warning { margin: 0 0 1rem; padding: .65rem .75rem; border: 1px solid color-mix(in srgb, var(--studio-warning, #f5c26f) 35%, transparent); border-radius: .35rem; color: var(--studio-warning, #f5c26f); font-size: .8rem; }
  .profile-settings-page__preview-state { display: grid; min-height: 22rem; place-items: center; padding: 1rem; color: var(--studio-muted, #8f9099); font: 400 .8rem/1.45 'Inter', sans-serif; text-align: center; }
  .profile-settings-page__preview-state[role="alert"] { color: #ff5578; }
  @media (prefers-reduced-motion: reduce) { .profile-settings-page { scroll-behavior: auto; } }
</style>
