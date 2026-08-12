<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { restoreFocus, trapFocus } from './a11y.js';
  import { authUser, equippedItems, isAuthenticated, profile, profileEntitlements, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import ProfileDashboardShell from './ProfileDashboardShell.svelte';
  import ProfileStudioHeader from './ProfileStudioHeader.svelte';
  import ProfileStudioWorkspace from './ProfileStudioWorkspace.svelte';
  import ProfileStudioDirtyPrompt from './ProfileStudioDirtyPrompt.svelte';
  import {
    PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS,
    PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES,
    PROFILE_STUDIO_CUSTOMIZE_TAB_IDS,
    PROFILE_STUDIO_FALLBACK_COLOR,
    PROFILE_STUDIO_HASH_ALIASES,
    PROFILE_STUDIO_LINKS_SECTION_IDS,
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
  const CUSTOMIZE_SECTION_IDS = PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS;
  const LINKS_SECTION_IDS = PROFILE_STUDIO_LINKS_SECTION_IDS;
  const FALLBACK_PROFILE_COLOR = PROFILE_STUDIO_FALLBACK_COLOR;
  const CUSTOMIZE_TAB_IDS = PROFILE_STUDIO_CUSTOMIZE_TAB_IDS;
  const CUSTOMIZE_TAB_HASHES = PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES;
  const SETTINGS_SECTIONS = PROFILE_STUDIO_SECTIONS;
  const HASH_ALIASES = PROFILE_STUDIO_HASH_ALIASES;
  const CUSTOMIZE_TAB_LABELS = Object.freeze({ appearance: 'Appearance', media: 'Media', layout: 'Layout' });

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
  let PreviewComponent = null;
  let previewError = '';
  let previewDockError = '';
  let previewOpen = false;
  let previewDevice = 'desktop';
  let previewLoadPromise = null;
  let previewDockLoadPromise = null;
  /** @type {any} */
  let PreviewDockComponent = null;
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
  let DashboardActionsComponent = null;

  $: accountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: accountKey = $isAuthenticated && $session?.user?.id ? $session.user.id : '';
  $: if (accountKey) void loadSettings();
  $: profilePath = context?.targetProfile?.username ? getCanonicalProfilePath(context.targetProfile.username) : '/profile';
  $: featureFlags = resolveProfileFeatureFlags({
    userId: context?.profileId || $session?.user?.id,
    isStaff: Boolean(context?.targetProfile?.is_staff || $profile?.is_staff)
  });
  $: visibleSettingsSections = getVisibleProfileStudioSections(featureFlags, SETTINGS_SECTIONS);
  $: if (!visibleSettingsSections.some(section => section.id === activeSection)) activeSection = 'customize';
  $: activeLabel = visibleSettingsSections.find(section => section.id === activeSection)?.label || 'Customize';
  $: mobileStudioTitle = activeSection === 'customize' ? (CUSTOMIZE_TAB_LABELS[activeCustomizeTab] || activeLabel) : activeLabel;
  $: previewAvailable = activeSection === 'links';
  $: customizePreviewAvailable = activeSection === 'customize';
  $: showDashboardPreview = previewAvailable
    ? previewOpen
    : customizePreviewAvailable && (!isMobileViewport || previewOpen);
  $: editorProfileConfig = createEditorProfileConfig(context?.profileConfig);
  $: sidebarAvatarSrc = getProfileMediaUrl(editorProfileConfig?.draft?.avatar_path || editorProfileConfig?.published?.avatar_path);
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
  $: previewProfile = previewModel.profile;
  $: previewProfileConfig = previewModel.profileConfig;
  $: previewRenderSnapshot = previewModel.snapshot;

  onMount(() => {
    void loadDashboardActions();
    void loadPreviewDockComponent();
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
        if (nextSection === 'customize' && nextLocation.customizeTab) activeCustomizeTab = nextLocation.customizeTab;
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
    else if (sectionId === 'links') void loadLinksComponents();
    else void loadSectionComponent(sectionId);
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
    if (typeof window !== 'undefined') {
      const nextHash = CUSTOMIZE_TAB_HASHES[tabId];
      const url = `${window.location.pathname}${window.location.search}#${nextHash}`;
      if (push) window.history.pushState({ dashboardSection: 'customize', customizeTab: tabId }, '', url);
      else if (window.location.hash !== `#${nextHash}`) window.history.replaceState({ dashboardSection: 'customize', customizeTab: tabId }, '', url);
    }
    if (focus && typeof document !== 'undefined') requestAnimationFrame(() => document.getElementById(`profile-customize-tab-${tabId}`)?.focus());
  }

  function togglePreview() {
    if (!previewAvailable && !customizePreviewAvailable) return;
    previewOpen = !previewOpen;
    if (previewOpen) {
      void loadPreviewDockComponent();
      void loadPreviewComponent();
    }
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

  function handleViewProfile(event) {
    const originalEvent = event.detail?.event || event;
    originalEvent.preventDefault?.();
    if (dashboardDirty) {
      openDirtyPrompt({ type: 'route', value: profilePath });
      return;
    }
    window.location.assign(profilePath);
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

  async function loadDashboardActions() {
    if (DashboardActionsComponent) return;
    try {
      const module = await import('./ProfileDashboardActions.svelte');
      DashboardActionsComponent = module.default;
    } catch (loadError) {
      dashboardError = loadError instanceof Error ? loadError.message : 'The dashboard actions could not be loaded.';
    }
  }

  async function loadCustomizeComponents() {
    await Promise.all(CUSTOMIZE_SECTION_IDS.map(sectionId => loadSectionComponent(sectionId)));
  }

  async function loadLinksComponents() {
    await Promise.all(LINKS_SECTION_IDS.map(sectionId => loadSectionComponent(sectionId)));
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
    // acceptSaved lets mounted editors clear their local view-state caches.
    // Its scoped preview events cannot replace this complete server result.
    studioDraft = nextDraft;
    studioIdentityDraft = {
      bio: context?.targetProfile?.bio || '',
      identityPresentation: nextDraft.identityPresentation
    };
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

  async function loadSettings() {
    const nextRequestId = ++requestId;
    const previousContext = context;
    loading = !previousContext;
    error = '';
    dashboardStatus = '';
    dashboardError = '';
    const nextContext = await loadProfileContext({ supabaseClient: supabase, isAuthenticated: $isAuthenticated, sessionUserId: $session?.user?.id, currentUsername: accountUsername });
    if (nextRequestId !== requestId) return;
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

  function handleSocialChange() { void loadSettings(); }

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

  async function loadPreviewComponent() {
    if (PreviewComponent) return PreviewComponent;
    if (previewLoadPromise) return previewLoadPromise;
    previewError = '';
    previewLoadPromise = import('./ProfileShell.svelte')
      .then(module => {
        PreviewComponent = module.default;
        return PreviewComponent;
      })
      .catch(loadError => {
        previewError = loadError instanceof Error ? loadError.message : 'The live preview could not be loaded.';
        return null;
      })
      .finally(() => { previewLoadPromise = null; });
    return previewLoadPromise;
  }

  async function loadPreviewDockComponent() {
    if (PreviewDockComponent) return PreviewDockComponent;
    if (previewDockLoadPromise) return previewDockLoadPromise;
    previewDockError = '';
    previewDockLoadPromise = import('./ProfileStudioPreview.svelte')
      .then(module => {
        PreviewDockComponent = module.default;
        return PreviewDockComponent;
      })
      .catch(loadError => {
        previewDockError = loadError instanceof Error ? loadError.message : 'The live preview dock could not be loaded.';
        return null;
      })
      .finally(() => { previewDockLoadPromise = null; });
    return previewDockLoadPromise;
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

<ProfileDashboardShell
  sections={[...visibleSettingsSections]}
  {activeSection}
  ownerUsername={accountUsername}
  ownerProfilePath={profilePath}
  ownerAvatarSrc={sidebarAvatarSrc}
  mobileTitle={mobileStudioTitle}
  mobilePreviewAvailable={previewAvailable || customizePreviewAvailable}
  mobilePreviewOpen={showDashboardPreview}
  mobileDirty={dashboardDirty}
  mobileSaving={dashboardSaving}
  showPreview={showDashboardPreview}
  on:sectionchange={handleDashboardSectionChange}
  on:previewtoggle={togglePreview}
  on:publish={publishDashboard}
>
  <div slot="topbar">
    {#if context && !loading && (activeSection === 'customize' || activeSection === 'links') && DashboardActionsComponent}
      <svelte:component this={DashboardActionsComponent} dirty={dashboardDirty} saving={dashboardSaving} status={dashboardStatus} error={dashboardError} on:reset={resetDashboard} on:publish={publishDashboard} />
    {/if}
  </div>

  <div class="profile-settings-page" data-dashboard-adapter="profile-studio" aria-busy={loading}>
    {#if context?.dataWarning}<p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>{/if}
    {#if context && !loading && !error}
      <ProfileStudioHeader
        {activeSection}
        {activeCustomizeTab}
        {activeLabel}
        {profilePath}
        {previewAvailable}
        {previewOpen}
        on:tabchange={event => selectCustomizeTab(event.detail?.tabId, { focus: event.detail?.focus })}
        on:previewtoggle={togglePreview}
        on:viewprofile={handleViewProfile}
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
      on:premiumrequest={handleDashboardSectionChange}
      on:accountdeleted={handleAccountDeleted}
    />
  </div>

  <svelte:fragment slot="preview">
    {#if PreviewDockComponent}
      <svelte:component
        this={PreviewDockComponent}
        previewComponent={PreviewComponent}
        {previewError}
        {previewProfile}
        {previewProfileConfig}
        previewRenderSnapshot={previewRenderSnapshot}
        previewScores={context?.targetScores || []}
        previewTimelineEvents={context?.timelineEvents || []}
        previewCollectionItems={context?.collectionItems || []}
        previewAllAchievements={context?.allAchievements || []}
        {activeSection}
        {activeCustomizeTab}
        {previewDevice}
        {isMobileViewport}
        on:toggle={togglePreview}
        on:retry={loadPreviewComponent}
        on:devicechange={event => setPreviewDevice(event.detail)}
        on:premiumrequest={() => handleDashboardSectionChange({ detail: { sectionId: 'premium' } })}
      />
    {:else if previewDockError}
      <div class="profile-settings-page__preview-error" role="alert">{previewDockError}</div>
    {/if}
  </svelte:fragment>
</ProfileDashboardShell>

<ProfileStudioDirtyPrompt bind:this={dirtyPromptComponent} open={showDirtyPrompt} on:stay={stayOnPage} on:discard={discardAndContinue} />

<style>
  .profile-settings-page { width: 100%; min-width: 0; }
  .profile-settings-page__warning { margin: 0 0 1rem; padding: .65rem .75rem; border: 1px solid color-mix(in srgb, var(--ctp-peach, #fab387) 35%, transparent); border-radius: .35rem; color: var(--ctp-peach, #fab387); font-size: .8rem; }
  .profile-settings-page__preview-error { display: grid; min-height: 10rem; place-items: center; padding: 1rem; color: var(--studio-muted, #bac2de); font-size: .8rem; text-align: center; }
  @media (prefers-reduced-motion: reduce) { .profile-settings-page { scroll-behavior: auto; } }
</style>
