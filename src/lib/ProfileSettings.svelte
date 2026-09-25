<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
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
    PROFILE_STUDIO_SECTIONS,
    getProfileStudioHash,
    getVisibleProfileStudioSections,
    normalizeDashboardHash
  } from './profile-studio/dashboardContract.js';
  import { createProfileStudioNavigationController } from './profile-studio/profileStudioNavigation.js';
  import { PROFILE_STUDIO_SECTION_LOADERS } from './profile-studio/sectionRegistry.js';
  import { createProfileStudioLazyComponents } from './profile-studio/lazyComponents.js';
  import {
    asConfigurationV2 as asConfigurationV2Model,
    applyProfileStudioDraftPatch,
    applyProfileStudioIdentityPatch,
    buildConfigurationV2 as buildConfigurationV2Model,
    createEditorProfileConfig,
    createProfileStudioPreviewModel,
    getPersistedProfileStudioState,
    hasServerDraftChanges,
    preserveExpressionFields,
    toEditorProfileConfig
  } from './profile-studio/draftModel.js';
  import {
    dirtySourceForEvent,
    hasDirtySources,
    updateDirtySource
  } from './profile-studio/dirtyState.js';
  import {
    isProfileConfigurationWritable,
    mergeProfileStudioContext,
    PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE
  } from './profile-studio/authoringState.js';

  const SECTION_LOADERS = PROFILE_STUDIO_SECTION_LOADERS;

  // Shared contracts keep old #profile-* destinations alive while this file
  // remains only the authenticated route/state adapter.
  const FALLBACK_PROFILE_COLOR = PROFILE_STUDIO_FALLBACK_COLOR;
  const CUSTOMIZE_TAB_IDS = PROFILE_STUDIO_CUSTOMIZE_TAB_IDS;
  const CUSTOMIZE_TAB_HASHES = PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES;
  const SETTINGS_SECTIONS = PROFILE_STUDIO_SECTIONS;
  const CUSTOMIZE_TAB_LABELS = Object.freeze({ appearance: 'Appearance', media: 'Media', content: 'Content', links: 'Links', layout: 'Layout' });

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
      profileConfig: null,
      configurationUnavailable: false,
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
  // Do not expose the bootstrap context as an editable draft while the
  // authenticated profile projection is still loading. The bootstrap object
  // is intentionally shape-compatible with the real context, so checking for
  // object presence alone would let a fast click race the first load.
  let loading = true;
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
  let sectionComponents = {};
  let sectionErrors = {};
  let sectionLoading = false;
  let dirtySources = {};
  let pendingNavigation = null;
  let showDirtyPrompt = false;
  let dirtyPromptComponent = null;
  let dirtyPromptReturnFocus = null;
  let workspace = null;
  let dashboardSaving = false;
  let dashboardMutationToken = 0;
  let dashboardStatus = '';
  let dashboardError = '';
  let ProfilePreviewComponent = null;
  let previewError = '';
  let fullContextLoaded = false;
  let fullContextPromise = null;
  const settingsLoadAccounts = new SvelteSet();
  const lazyComponents = createProfileStudioLazyComponents({
    sectionLoaders: SECTION_LOADERS,
    previewLoader: () => import('./ProfileStudioPreview.svelte'),
    onChange(state) {
      sectionComponents = state.sectionComponents;
      sectionErrors = state.sectionErrors;
      sectionLoading = state.sectionLoading;
      ProfilePreviewComponent = state.preview;
      previewError = state.previewError;
    }
  });

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
  function createStudioEditorProfileConfig(value, stagedDraft = studioDraft) {
    const base = createEditorProfileConfig(value);
    return base && stagedDraft ? { ...base, draft: stagedDraft } : base;
  }

  // Keep remounted Customize editors on the same staged draft that drives the
  // live preview. The explicit argument is intentional: Svelte's legacy
  // reactive dependency analysis does not inspect variables read only inside
  // a helper function.
  $: editorProfileConfig = createStudioEditorProfileConfig(context?.profileConfig, studioDraft);
  let preferenceDirty = false;
  $: navigationDirty = dashboardDirty || preferenceDirty;
  $: profileDraftDirty = hasDirtySources(dirtySources) || hasServerDraftChanges(context?.profileConfig);
  $: cosmeticPreviewDirty = cosmeticPreviewLoadout !== null && [...new Set([...Object.keys($equippedItems || {}), ...Object.keys(cosmeticPreviewLoadout || {})])]
    .some(slot => (cosmeticPreviewLoadout?.[slot] || '') !== ($equippedItems?.[slot] || ''));
  $: dashboardDirty = profileDraftDirty || cosmeticPreviewDirty;
  $: configurationWriteAvailable = isProfileConfigurationWritable(context);
  $: previewModel = createProfileStudioPreviewModel({
    targetProfile: context?.targetProfile,
    profileConfig: context?.profileConfig,
    equippedCosmetics: $equippedItems,
    studioDraft,
    studioIdentityDraft,
    cosmeticPreviewLoadout,
    fallbackColor: FALLBACK_PROFILE_COLOR,
    featureFlags,
    previewScores: context?.targetScores || [],
    previewTimelineEvents: context?.timelineEvents || [],
    previewCollectionItems: context?.collectionItems || [],
    previewAllAchievements: context?.allAchievements || [],
    dev: import.meta.env.DEV
  });
  $: previewRenderSnapshot = previewModel.snapshot;

  function resetAccountScopedState() {
    context = studioDraft = studioIdentityDraft = cosmeticPreviewLoadout = pendingNavigation = dirtyPromptReturnFocus = null;
    dirtySources = {};
    preferenceDirty = showDirtyPrompt = false;
    dashboardSaving = false;
  }

  function resetSettingsLoadState() {
    if (!settingsLoadAccounts.size) return;
    settingsLoadAccounts.clear();
    requestId += 1;
    dashboardMutationToken += 1;
    resetAccountScopedState();
  }

  function ensureSettingsLoaded(nextAccountKey) {
    if (settingsLoadAccounts.has(nextAccountKey)) return;
    // A -> B -> A must hydrate A again, not reuse B's authoring state.
    settingsLoadAccounts.clear();
    settingsLoadAccounts.add(nextAccountKey);
    if (context?.profileId !== nextAccountKey) {
      resetAccountScopedState();
      dashboardMutationToken += 1;
    }
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

    // Progression used to live behind a Studio hash. Keep old bookmarks
    // useful while making the dedicated route the only full renderer.
    if (normalizeDashboardHash(window.location.hash) === 'progression') {
      window.location.replace('/progression');
      return () => {
        lazyComponents.dispose();
        previewMediaQuery?.removeEventListener?.('change', updatePreviewViewport);
      };
    }

    const navigationController = createProfileStudioNavigationController({
      windowRef: window,
      getVisibleSections: () => visibleSettingsSections,
      getActiveSection: () => activeSection,
      getActiveCustomizeTab: () => activeCustomizeTab,
      isNavigationDirty: () => navigationDirty,
      setActiveSection,
      onCustomizeTabChange(tabId) {
        activeCustomizeTab = tabId;
      },
      loadCustomizeComponents: () => loadCustomizeComponents(),
      openDirtyPrompt
    });
    navigationController.start();
    return () => {
      requestId += 1;
      lazyComponents.dispose();
      navigationController.stop();
      previewMediaQuery?.removeEventListener?.('change', updatePreviewViewport);
    };
  });

  function setActiveSection(sectionId, { push = true, customizeTab = null, hash = null } = {}) {
    if (!visibleSettingsSections.some(section => section.id === sectionId)) return;
    if (sectionId === 'customize' && CUSTOMIZE_TAB_IDS.includes(customizeTab)) activeCustomizeTab = customizeTab;
    preferenceDirty = false;
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
    if (navigationDirty) {
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

  function handleSectionDirty(event) {
    const isDirty = event.detail?.dirty === true;
    const source = dirtySourceForEvent(event.detail, activeSection);
    dirtySources = updateDirtySource(dirtySources, source, isDirty);
    if (isDirty) {
      dashboardError = '';
      dashboardStatus = '';
    }
  }

  async function discardAllStagedChanges() {
    // Reset child-owned input first, then replace every parent-owned staged
    // slice from the latest server-backed draft and equipped cosmetics. The
    // second pass runs after Svelte propagates those props to remounted
    // editors, so no hidden tab can keep an abandoned value alive.
    workspace?.resetChanges?.(activeSection);
    const persistedState = getPersistedProfileStudioState(
      context?.profileConfig,
      context?.targetProfile,
      FALLBACK_PROFILE_COLOR
    );
    studioDraft = persistedState.studioDraft;
    studioIdentityDraft = persistedState.studioIdentityDraft;
    cosmeticPreviewLoadout = persistedState.cosmeticPreviewLoadout;
    dirtySources = {};
    preferenceDirty = false;
    dashboardStatus = '';
    dashboardError = '';
    await tick();
    workspace?.resetChanges?.('customize');
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

  async function discardAndContinue() {
    const next = pendingNavigation;
    await discardAllStagedChanges();
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

  function loadSectionComponent(sectionId, { force = false } = {}) {
    return lazyComponents.loadSection(sectionId, { force });
  }

  function loadPreviewComponent() {
    return lazyComponents.loadPreview();
  }

  function loadCustomizeComponents() {
    return lazyComponents.loadCustomize(activeCustomizeTab);
  }

  function retrySectionComponent(sectionId) {
    if (!sectionId) return;
    void loadSectionComponent(sectionId, { force: true });
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
    const editorIdentity = getDashboardEditor()?.getDraftIdentity?.();
    if (!studioIdentityDraft && !editorIdentity) return null;
    // The mounted identity editor has the freshest keystroke-level value. The
    // parent draft remains the source when the editor is remounted between
    // Customize tabs, so publish always sees the latest bio in either state.
    return { ...(studioIdentityDraft || {}), ...(editorIdentity || {}) };
  }

  function applyDashboardConfiguration({ draft, published, updatedAt, publishedAt }) {
    const nextDraftV2 = asConfigurationV2(draft, context?.profileConfig?.v2Draft);
    const nextPublishedV2 = asConfigurationV2(published, context?.profileConfig?.v2Published || nextDraftV2);
    const nextDraft = toEditorProfileConfig(nextDraftV2);
    context = {
      ...context,
      configurationUnavailable: false,
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
    dirtySources = {};
  }

  function loadConfigurationWriteService() {
    return import('./profile-studio/configurationWrites.js');
  }

  /** @param {'publish' | 'reset'} action */
  async function writeDashboardConfiguration(action) {
    if (dashboardSaving || !profileDraftDirty) return;
    if (!configurationWriteAvailable) {
      dashboardError = PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE;
      dashboardStatus = '';
      return;
    }
    const publishing = action === 'publish';
    const fallbackError = publishing
      ? 'The profile could not be published.'
      : 'The profile changes could not be reset.';
    if (publishing) {
      const editor = getDashboardEditor();
      if (editor?.validateDraft && !editor.validateDraft()) {
        dashboardError = 'Finish the highlighted fields before publishing.';
        dashboardStatus = '';
        return;
      }
    }

    const mutationToken = ++dashboardMutationToken;
    dashboardSaving = true;
    dashboardError = '';
    dashboardStatus = publishing ? 'Publishing profile…' : 'Resetting profile changes…';
    const identityDraft = publishing ? getDashboardIdentity() : null;
    const v2Draft = publishing
      ? buildConfigurationV2(getDashboardDraft())
      : buildConfigurationV2(
          toEditorProfileConfig(context?.profileConfig?.published),
          context?.profileConfig?.v2Published
        );
    const mutationRequestId = requestId;
    const mutationAccountId = $session?.user?.id;
    const isCurrent = () => mutationToken === dashboardMutationToken
      && mutationRequestId === requestId
      && mutationAccountId === $session?.user?.id;
    try {
      const { writeProfileStudioConfiguration } = await loadConfigurationWriteService();
      if (!isCurrent()) return;
      const write = await writeProfileStudioConfiguration(
        supabase,
        action,
        v2Draft,
        publishing ? accountUsername || null : null,
        publishing ? identityDraft?.bio ?? context?.targetProfile?.bio ?? null : null,
        context.profileConfig?.updatedAt || null,
        fallbackError
      );
      if (!isCurrent()) return;
      if (write.error) {
        dashboardStatus = '';
        dashboardError = write.error;
        return;
      }
      const responseData = write.response.data || {};
      if (publishing) {
        const nextBio = responseData.identity?.bio ?? identityDraft?.bio ?? context?.targetProfile?.bio ?? null;
        // Settings remounts hydrate from the authenticated account store. Keep
        // it aligned with the successful publish so returning cannot restore
        // the pre-publish bio.
        profile.update(currentProfile => currentProfile && currentProfile.id === context.profileId
          ? { ...currentProfile, bio: nextBio }
          : currentProfile);
        context = { ...context, targetProfile: { ...context.targetProfile, bio: nextBio } };
        applyDashboardConfiguration({
          draft: responseData.draft || v2Draft,
          published: responseData.published || v2Draft,
          updatedAt: responseData.updated_at || context.profileConfig?.updatedAt,
          publishedAt: responseData.published_at || context.profileConfig?.publishedAt
        });
        dashboardStatus = 'Profile published.';
      } else {
        applyDashboardConfiguration({
          draft: responseData.draft || v2Draft,
          published: responseData.published || context.profileConfig?.v2Published || v2Draft,
          updatedAt: responseData.updated_at || context.profileConfig?.updatedAt,
          publishedAt: context.profileConfig?.publishedAt
        });
        dashboardStatus = 'Profile changes reset.';
      }
      dashboardError = '';
    } catch (mutationError) {
      if (isCurrent()) {
        dashboardStatus = '';
        dashboardError = mutationError?.message || fallbackError;
      }
    } finally {
      // A stale response must not strand its own lock or release a newer one.
      if (mutationToken === dashboardMutationToken) {
        dashboardSaving = false;
        if (mutationRequestId !== requestId || mutationAccountId !== $session?.user?.id) dashboardStatus = '';
      }
    }
  }

  async function publishDashboard() {
    await writeDashboardConfiguration('publish');
  }

  async function resetDashboard() {
    await writeDashboardConfiguration('reset');
  }

  function loadSettingsStateModule() {
    return import('./profile-studio/settingsLoadState.js').catch(() => null);
  }

  async function loadSettings(expectedAccountKey = '') {
    const nextRequestId = ++requestId;
    const previousContext = context;
    loading = true;
    error = '';
    dashboardStatus = '';
    dashboardError = '';
    sectionErrors = {};
    fullContextLoaded = false;
    fullContextPromise = null;
    const [nextContext, loadStateModule] = await Promise.all([
      loadProfileStudioContext({
        supabaseClient: supabase,
        profileRecord: $profile,
        sessionUserId: $session?.user?.id
      }).catch(() => /** @type {{ configurationUnavailable: true, profileId: null }} */ ({ configurationUnavailable: true })),
      loadSettingsStateModule()
    ]);
    if (nextRequestId !== requestId || (expectedAccountKey && expectedAccountKey !== $session?.user?.id)) return;
    if (!loadStateModule) {
      context = {
        ...nextContext,
        configurationUnavailable: true,
        dataWarning: PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE
      };
      if (!nextContext.profileId || nextContext.profileId !== previousContext?.profileId) {
        studioDraft = studioIdentityDraft = cosmeticPreviewLoadout = null;
      }
      loading = false;
      return;
    }
    const loadedState = loadStateModule.resolveProfileStudioSettingsLoadState({
      previousContext,
      nextContext,
      studioDraft,
      fallbackColor: FALLBACK_PROFILE_COLOR,
      mergeProfileStudioContext,
      toEditorProfileConfig
    });
    context = loadedState.context;
    if (!loadedState.preserveDrafts) {
      studioDraft = loadedState.studioDraft;
      studioIdentityDraft = loadedState.studioIdentityDraft;
      cosmeticPreviewLoadout = loadedState.cosmeticPreviewLoadout;
    }
    loading = false;
    if (loadedState.error) error = loadedState.error;
  }

  function ensureFullContext({ force = false } = {}) {
    if (fullContextLoaded && !force) return context;
    if (fullContextPromise && !force) return fullContextPromise;
    const nextRequestId = ++requestId;
    fullContextPromise = Promise.all([
      loadProfileContext({
        supabaseClient: supabase,
        profileRecord: force ? null : $profile,
        isAuthenticated: $isAuthenticated,
        sessionUserId: $session?.user?.id,
        currentUsername: accountUsername
      }),
      loadSettingsStateModule()
    ]).then(([nextContext, loadStateModule]) => {
      if (nextRequestId !== requestId) return context;

      if (!loadStateModule) {
        context = { ...context, configurationUnavailable: true, dataWarning: PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE };
        fullContextLoaded = false;
        return context;
      }

      const refreshedState = loadStateModule.resolveProfileStudioFullContextRefreshState(
        nextContext,
        context,
        studioDraft,
        studioIdentityDraft,
        dirtySources['customize:identity'],
        FALLBACK_PROFILE_COLOR,
        mergeProfileStudioContext,
        toEditorProfileConfig
      );
      ({ context, studioDraft, studioIdentityDraft, fullContextLoaded } = refreshedState);
      return context;
    }).catch(loadError => {
      if (nextRequestId !== requestId) return context;
      fullContextLoaded = false;
      context = { ...context, dataWarning: loadError?.message || PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE };
      return context;
    }).finally(() => {
      if (nextRequestId === requestId) {
        fullContextPromise = null;
        loading = false;
      }
    });
    return fullContextPromise;
  }

  function updateConfiguration(event) {
    if (!configurationWriteAvailable) return;
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
    if (!configurationWriteAvailable) return;
    const fields = event.detail || {};
    const mediaReferences = fields.media_references;
    const nextAvatarReference = mediaReferences && typeof mediaReferences === 'object'
      && Object.prototype.hasOwnProperty.call(mediaReferences, 'avatar')
      ? mediaReferences.avatar || null
      : undefined;
    if (nextAvatarReference !== undefined) {
      profile.update(currentProfile => currentProfile && currentProfile.id === context.profileId
        ? { ...currentProfile, avatar_reference: nextAvatarReference }
        : currentProfile);
    }
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
    if (!configurationWriteAvailable) return;
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
    if (!configurationWriteAvailable) return;
    const patch = event.detail || {};
    const scope = patch.scope;
    // Dynamic Customize tabs can forward one additional event envelope when
    // an editor is remounted. Unwrap that presentation-only envelope here so
    // the canonical staged draft remains the single source for the preview.
    const detail = patch.detail?.detail && typeof patch.detail.detail === 'object' && !patch.detail.config
      ? patch.detail.detail
      : patch.detail || {};
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
    const nextLoadout = event.detail?.loadout;
    cosmeticPreviewLoadout = nextLoadout ? { ...nextLoadout } : null;
    if (nextLoadout) {
      dashboardError = '';
      dashboardStatus = '';
    }
  }

  function handleSocialChange() { void ensureFullContext({ force: true }); }

  function updateIdentity(event) {
    if (!configurationWriteAvailable) return;
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
  mobileDirty={profileDraftDirty}
  mobileSaving={dashboardSaving}
  dirty={profileDraftDirty}
  configurationReady={configurationWriteAvailable}
  previewRenderSnapshot={previewRenderSnapshot}
  showPreview={showDashboardPreview}
  showBrand={true}
  on:sectionchange={handleDashboardSectionChange}
  on:previewtoggle={togglePreview}
  on:reset={resetDashboard}
  on:publish={publishDashboard}
>
  <div class="profile-settings-page" data-dashboard-adapter="profile-studio" aria-busy={loading}>
    {#if context?.dataWarning}
      <div class="profile-settings-page__warning" role="status">
        <span>{context.dataWarning}</span>
        <button type="button" on:click={() => ensureFullContext()} disabled={loading || fullContextPromise}>Retry</button>
      </div>
    {/if}
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
      {sectionErrors}
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
      configurationUnavailable={context?.configurationUnavailable === true}
      on:tabrequest={event => selectCustomizeTab(event.detail?.tabId, { focus: true })}
      on:studiopatch={applyStudioPatch}
      on:cosmeticpreview={updateCosmeticPreview}
      on:preferencedirty={event => { preferenceDirty = event.detail?.dirty === true; }}
      on:dirty={handleSectionDirty}
      on:identitysaved={updateIdentity}
      on:configsaved={handleAppearanceSaved}
      on:configpublished={updateConfiguration}
      on:configreloaded={handleConfigurationReloaded}
      on:socialchange={handleSocialChange}
      on:accountdeleted={handleAccountDeleted}
      on:configurationretry={() => loadSettings(accountKey)}
      on:sectionretry={event => retrySectionComponent(event.detail?.sectionId)}
    />
  </div>

  <svelte:fragment slot="preview">
    {#if ProfilePreviewComponent}
      <svelte:component
        this={ProfilePreviewComponent}
        previewRenderSnapshot={previewRenderSnapshot}
        {activeSection}
        {activeCustomizeTab}
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
  .profile-settings-page__warning { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin: 0 0 1rem; padding: .65rem .75rem; border: 1px solid color-mix(in srgb, var(--studio-warning, #f5c26f) 35%, transparent); border-radius: .35rem; color: var(--studio-warning, #f5c26f); font-size: .8rem; }
  .profile-settings-page__warning button { min-height: 2rem; padding: .35rem .65rem; border: 1px solid color-mix(in srgb, var(--studio-warning, #f5c26f) 55%, transparent); border-radius: .3rem; background: transparent; color: inherit; font: inherit; font-weight: 650; cursor: pointer; }
  .profile-settings-page__warning button:hover, .profile-settings-page__warning button:focus-visible { border-color: currentColor; }
  .profile-settings-page__preview-state { display: grid; min-height: 22rem; place-items: center; padding: 1rem; color: var(--studio-muted, #8f9099); font: 400 .8rem/1.45 'Inter', sans-serif; text-align: center; }
  .profile-settings-page__preview-state[role="alert"] { color: #ff5578; }
  @media (prefers-reduced-motion: reduce) { .profile-settings-page { scroll-behavior: auto; } }
</style>
