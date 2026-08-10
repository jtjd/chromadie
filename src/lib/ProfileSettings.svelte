<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { restoreFocus, trapFocus } from './a11y.js';
  import { authUser, equippedItems, isAuthenticated, profile, profileEntitlements, refreshProfileState, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
  import { normalizeRichMediaConfig } from './profileRichMedia.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import ProfileAccountSettings from './ProfileAccountSettings.svelte';
  import ProfileDashboardShell from './ProfileDashboardShell.svelte';

  const SECTION_LOADERS = Object.freeze({
    customize: () => import('./ProfileCustomizePage.svelte'),
    overview: () => import('./ProfileStudioOverview.svelte'),
    'profile-identity': () => import('./IdentityEditor.svelte'),
    'profile-aliases': () => import('./ProfileAliasesEditor.svelte'),
    'profile-media': () => import('./ProfileExpressionEditor.svelte'),
    'profile-content': () => import('./ProfileContentEditor.svelte'),
    'profile-widgets': () => import('./ProfileWidgetEditor.svelte'),
    'profile-collection': () => import('./ProfileCosmeticsEditor.svelte'),
    'profile-layout': () => import('./ProfileEditor.svelte'),
    links: () => import('./ProfileEditor.svelte'),
    premium: () => import('./ProfilePremiumPage.svelte'),
    'profile-social': () => import('./ProfileSocial.svelte'),
    'profile-insights': () => import('./ProfileInsights.svelte'),
    'profile-notifications': () => import('./ProfileNotifications.svelte'),
    progression: () => import('./ProfileProgression.svelte')
  });

  const CUSTOMIZE_SECTION_IDS = Object.freeze([
    'customize', 'profile-identity', 'profile-media', 'profile-content', 'profile-widgets', 'profile-collection', 'profile-layout'
  ]);
  const LINKS_SECTION_IDS = Object.freeze(['profile-layout', 'profile-aliases']);

  // Customize keeps one canonical destination while exposing the four editing
  // surfaces people use to shape their profile. The tab ids deliberately stay
  // independent from the legacy section ids so old links can keep resolving.
  const CUSTOMIZE_TABS = Object.freeze([
    { id: 'appearance', label: 'Appearance', description: 'Color, identity, and presence' },
    { id: 'media', label: 'Media', description: 'Avatar, background, music, and uploads' },
    { id: 'effects', label: 'Effects', description: 'Atmosphere, collection, and widgets' },
    { id: 'layout', label: 'Layout', description: 'Templates and profile structure' }
  ]);
  const CUSTOMIZE_TAB_IDS = Object.freeze(CUSTOMIZE_TABS.map(tab => tab.id));
  const CUSTOMIZE_TAB_HASHES = Object.freeze({
    appearance: 'customize-appearance',
    media: 'customize-media',
    effects: 'customize-effects',
    layout: 'customize-layout'
  });
  const CUSTOMIZE_TAB_ALIASES = Object.freeze({
    customize: 'appearance',
    appearance: 'appearance',
    'customize-appearance': 'appearance',
    identity: 'appearance',
    'profile-identity': 'appearance',
    media: 'media',
    expression: 'media',
    'customize-media': 'media',
    'profile-media': 'media',
    effects: 'effects',
    'customize-effects': 'effects',
    collection: 'effects',
    'profile-collection': 'effects',
    content: 'media',
    widgets: 'effects',
    'customize-content': 'media',
    'customize-widgets': 'effects',
    layout: 'layout',
    templates: 'layout',
    'customize-layout': 'layout'
  });

  const SETTINGS_SECTIONS = Object.freeze([
    { id: 'overview', label: 'Overview', groupKey: 'primary', groupLabel: 'Customize', icon: 'overview' },
    { id: 'customize', label: 'Customize', groupKey: 'primary', icon: 'customize' },
    { id: 'links', label: 'Links', groupKey: 'primary', icon: 'links' },
    { id: 'premium', label: 'Premium', groupKey: 'primary', icon: 'premium' },
    { id: 'profile-insights', label: 'Analytics', groupKey: 'account', groupLabel: 'Account', icon: 'profile-insights' },
    { id: 'profile-notifications', label: 'Notifications', groupKey: 'account', icon: 'profile-notifications' },
    { id: 'profile-social', label: 'Privacy & social', groupKey: 'account', icon: 'profile-social' },
    { id: 'progression', label: 'Badges & progression', groupKey: 'account', icon: 'progression' },
    { id: 'account', label: 'Settings', groupKey: 'account', icon: 'account' }
  ]);

  // These route records keep old dashboard hashes working while the visible IA stays aggregate.
  const LEGACY_SECTION_ROUTES = Object.freeze([
    { id: 'profile-identity', redirect: 'customize' },
    { id: 'profile-aliases', redirect: 'links' },
    { id: 'profile-media', redirect: 'customize' },
    { id: 'profile-content', redirect: 'customize' },
    { id: 'profile-widgets', redirect: 'customize' },
    { id: 'profile-layout', redirect: 'links' },
    { id: 'profile-collection', redirect: 'customize' }
  ]);
  const LEGACY_HASH_ALIASES = Object.freeze(Object.fromEntries(LEGACY_SECTION_ROUTES.map(route => [route.id, route.redirect])));
  const HASH_ALIASES = Object.freeze({
    customize: 'customize',
    appearance: 'customize',
    effects: 'customize',
    'customize-appearance': 'customize',
    'customize-media': 'customize',
    'customize-effects': 'customize',
    'customize-layout': 'customize',
    templates: 'customize',
    ...LEGACY_HASH_ALIASES,
    'profile-social': 'profile-social',
    'profile-insights': 'profile-insights',
    'profile-notifications': 'profile-notifications',
    identity: 'customize',
    aliases: 'links',
    expression: 'customize',
    media: 'customize',
    content: 'customize',
    widgets: 'customize',
    layout: 'links',
    social: 'profile-social',
    insights: 'profile-insights',
    notifications: 'profile-notifications',
    collection: 'customize',
    progression: 'progression',
    account: 'account'
  });

  const SECTION_FLAGS = Object.freeze({
    'profile-insights': 'expandedAnalytics',
    'profile-notifications': 'socialDepth'
  });

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
      profileConfig: { version: 1, draft: createDefaultProfileConfig(), published: createDefaultProfileConfig() },
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
  let configurationPreview = null;
  let PreviewComponent = null;
  let previewError = '';
  let previewOpen = false;
  let previewDevice = 'desktop';
  let previewLoadPromise = null;
  let sectionComponents = {};
  let sectionLoading = false;
  const sectionLoadPromises = new SvelteMap();
  let activeDirtySection = '';
  let pendingNavigation = null;
  let showDirtyPrompt = false;
  let dirtyPrompt = null;
  let dirtyPromptPrimary = null;
  let dirtyPromptReturnFocus = null;
  let customizePage = null;
  let layoutEditor = null;
  let contentEditor = null;
  let widgetEditor = null;
  let dashboardSaving = false;
  let dashboardStatus = '';
  let dashboardError = '';
  let DashboardActionsComponent = null;

  function getEquippedLayout(value) {
    return value && typeof value === 'object' && typeof value.profile_layout === 'string' ? value.profile_layout : '';
  }
  $: currentEquippedLayout = getEquippedLayout($equippedItems);
  $: accountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: accountKey = $isAuthenticated && $session?.user?.id ? $session.user.id : '';
  $: if (accountKey) void loadSettings();
  $: profilePath = context?.targetProfile?.username ? getCanonicalProfilePath(context.targetProfile.username) : '/profile';
  $: featureFlags = resolveProfileFeatureFlags({
    userId: context?.profileId || $session?.user?.id,
    isStaff: Boolean(context?.targetProfile?.is_staff || $profile?.is_staff)
  });
  $: visibleSettingsSections = SETTINGS_SECTIONS.filter(section => {
    const flag = SECTION_FLAGS[section.id];
    return !flag || featureFlags[flag];
  });
  $: if (!visibleSettingsSections.some(section => section.id === activeSection)) activeSection = 'customize';
  $: activeLabel = visibleSettingsSections.find(section => section.id === activeSection)?.label || 'Customize';
  $: previewAvailable = activeSection === 'links';
  $: customizePreviewAvailable = activeSection === 'customize';
  $: showDashboardPreview = previewAvailable
    ? previewOpen
    : customizePreviewAvailable && (!isMobileViewport || previewOpen);
  $: editorProfileConfig = createEditorProfileConfig(context?.profileConfig);
  $: sidebarAvatarSrc = getProfileMediaUrl(editorProfileConfig?.draft?.avatar_path || editorProfileConfig?.published?.avatar_path);
  $: dashboardDirty = Boolean(activeDirtySection) || hasServerDraftChanges(context?.profileConfig);
  $: previewProfileConfig = configurationPreview || context?.profileConfig?.draft;
  $: previewProfile = context?.targetProfile
    ? { ...context.targetProfile, equipped_cosmetics: $equippedItems || context.targetProfile.equipped_cosmetics || {} }
    : null;
  onMount(() => {
    void loadDashboardActions();
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

    const getLocationState = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      const sectionId = HASH_ALIASES[rawHash] || rawHash;
      const validSection = visibleSettingsSections.some(section => section.id === sectionId);
      return {
        rawHash,
        sectionId: validSection ? sectionId : 'customize',
        customizeTab: CUSTOMIZE_TAB_ALIASES[rawHash] || null
      };
    };
    const restoreLocation = () => {
      const nextLocation = getLocationState();
      const nextSection = nextLocation.sectionId;
      if (nextSection === activeSection) {
        if (nextSection === 'customize' && nextLocation.customizeTab) activeCustomizeTab = nextLocation.customizeTab;
        return;
      }
      if (activeDirtySection) {
        const currentHash = activeSection === 'customize' ? CUSTOMIZE_TAB_HASHES[activeCustomizeTab] : activeSection;
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
      if (!activeDirtySection) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const navigationGuard = event => {
      if (!activeDirtySection) return;
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
      const nextHash = hash || (sectionId === 'customize' && customizeTab ? CUSTOMIZE_TAB_HASHES[activeCustomizeTab] : sectionId);
      const url = `${window.location.pathname}${window.location.search}#${nextHash}`;
      if (push) window.history.pushState({ dashboardSection: sectionId }, '', url);
      else if (window.location.hash !== `#${nextHash}`) window.history.replaceState({ dashboardSection: sectionId }, '', url);
    }
  }

  function handleDashboardSectionChange(event) {
    const sectionId = event.detail?.sectionId;
    if (!sectionId || sectionId === activeSection) return;
    if (activeDirtySection) {
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

  function handleCustomizeTabKeydown(event) {
    const currentIndex = CUSTOMIZE_TAB_IDS.indexOf(activeCustomizeTab);
    if (currentIndex < 0) return;
    let nextIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % CUSTOMIZE_TAB_IDS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + CUSTOMIZE_TAB_IDS.length) % CUSTOMIZE_TAB_IDS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = CUSTOMIZE_TAB_IDS.length - 1;
    else return;
    event.preventDefault();
    selectCustomizeTab(CUSTOMIZE_TAB_IDS[nextIndex], { focus: true });
  }

  function togglePreview() {
    if (!previewAvailable && !customizePreviewAvailable) return;
    previewOpen = !previewOpen;
    if (previewOpen) void loadPreviewComponent();
  }

  function setPreviewDevice(device) {
    if (device === 'desktop' || device === 'mobile') previewDevice = device;
  }

  function handleSectionDirty(event) {
    const isDirty = event.detail?.dirty === true;
    if (isDirty) {
      activeDirtySection = activeSection;
      dashboardError = '';
      dashboardStatus = '';
      return;
    }
    if (activeDirtySection !== activeSection) return;
    const localDraft = getDashboardEditor()?.getDraftConfig?.();
    const serverDraft = editorProfileConfig?.draft;
    activeDirtySection = localDraft && serverDraft && JSON.stringify(normalizeProfileConfig(localDraft, FALLBACK_PROFILE_COLOR)) !== JSON.stringify(serverDraft)
      ? activeSection
      : '';
  }

  function resetActiveEditor() {
    if (activeDirtySection === 'customize') customizePage?.resetChanges?.();
    if (activeDirtySection === 'links') layoutEditor?.resetChanges?.();
    if (activeDirtySection === 'profile-layout') layoutEditor?.resetChanges?.();
    if (activeDirtySection === 'profile-content') contentEditor?.resetChanges?.();
    if (activeDirtySection === 'profile-widgets') widgetEditor?.resetChanges?.();
    activeDirtySection = '';
  }

  function openDirtyPrompt(next) {
    pendingNavigation = next;
    if (!dirtyPromptReturnFocus && typeof document !== 'undefined') dirtyPromptReturnFocus = document.activeElement;
    showDirtyPrompt = true;
    requestAnimationFrame(() => dirtyPromptPrimary?.focus());
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
    event.preventDefault();
    if (activeDirtySection) {
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

  function preserveExpressionFields(nextConfig, currentConfig) {
    const next = nextConfig || {};
    const current = currentConfig || {};
    const nextRich = normalizeRichMediaConfig(next);
    const currentRich = normalizeRichMediaConfig(current);
    return {
      ...next,
      avatar_path: current.avatar_path ?? next.avatar_path ?? null,
      background_path: current.background_path ?? next.background_path ?? null,
      audio_path: current.audio_path ?? next.audio_path ?? null,
      spotify_type: current.spotify_type ?? next.spotify_type ?? null,
      spotify_id: current.spotify_id ?? next.spotify_id ?? null,
      background_video_path: Object.prototype.hasOwnProperty.call(next, 'background_video_path') ? nextRich.background_video_path : currentRich.background_video_path,
      banner_path: Object.prototype.hasOwnProperty.call(next, 'banner_path') ? nextRich.banner_path : currentRich.banner_path,
      cursor_path: Object.prototype.hasOwnProperty.call(next, 'cursor_path') ? nextRich.cursor_path : currentRich.cursor_path,
      pointer_cursor_path: Object.prototype.hasOwnProperty.call(next, 'pointer_cursor_path') ? nextRich.pointer_cursor_path : currentRich.pointer_cursor_path,
      audio_playlist: Object.prototype.hasOwnProperty.call(next, 'audio_playlist') ? nextRich.audio_playlist : currentRich.audio_playlist
    };
  }

  const FALLBACK_PROFILE_COLOR = '#CDD2FF';

  function toEditorProfileConfig(value) {
    const source = value && typeof value === 'object' ? value : {};
    if (Number(source.version) === 2) {
      const base = source.base && typeof source.base === 'object' ? source.base : source;
      return normalizeProfileConfig({
        ...base,
        version: 1,
        configurationVersion: 2,
        links: source.links || base.links,
        content: source.content || base.content,
        widgets: source.widgets || base.widgets,
        identityPresentation: source.identity || base.identityPresentation,
        metadata: source.metadata || base.metadata,
        linkStyle: source.linkStyle || base.linkStyle
      }, FALLBACK_PROFILE_COLOR);
    }
    return normalizeProfileConfig(source, FALLBACK_PROFILE_COLOR);
  }

  function createEditorProfileConfig(value) {
    if (!value) return null;
    return {
      ...value,
      draft: toEditorProfileConfig(value.draft),
      published: toEditorProfileConfig(value.published)
    };
  }

  function hasServerDraftChanges(value) {
    if (!value?.draft || !value?.published) return false;
    return JSON.stringify(toEditorProfileConfig(value.draft)) !== JSON.stringify(toEditorProfileConfig(value.published));
  }

  function buildConfigurationV2(editorConfig, reference = context?.profileConfig?.v2Draft) {
    const base = toEditorProfileConfig(editorConfig);
    const source = reference && Number(reference.version) === 2 ? reference : {};
    return {
      version: 2,
      base,
      links: base.links,
      identity: base.identityPresentation || source.identity,
      content: base.content,
      widgets: base.widgets,
      metadata: base.metadata || source.metadata,
      sharing: source.sharing || { qrEnabled: true, previewEnabled: true }
    };
  }

  function asConfigurationV2(value, fallback) {
    if (value && Number(value.version) === 2) return value;
    if (fallback && Number(fallback.version) === 2) return fallback;
    return buildConfigurationV2(value || context?.profileConfig?.draft);
  }

  function getDashboardEditor() {
    if (activeSection === 'customize') return customizePage;
    if (activeSection === 'links') return layoutEditor;
    return null;
  }

  function getDashboardDraft() {
    const base = toEditorProfileConfig(context?.profileConfig?.draft);
    const localDraft = getDashboardEditor()?.getDraftConfig?.();
    return normalizeProfileConfig({ ...base, ...(localDraft || {}) }, FALLBACK_PROFILE_COLOR);
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
    customizePage?.acceptSaved?.(nextDraft);
    layoutEditor?.acceptSaved?.(nextDraft);
    contentEditor?.acceptSaved?.(nextDraft);
    widgetEditor?.acceptSaved?.(nextDraft);
    configurationPreview = null;
    activeDirtySection = '';
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
    dashboardStatus = 'Saving profile changes…';
    const editorDraft = getDashboardDraft();
    const v2Draft = buildConfigurationV2(editorDraft);
    const saveResponse = await supabase.rpc('save_profile_configuration_v2', {
      p_draft: v2Draft,
      p_expected_updated_at: context.profileConfig?.updatedAt || null
    });
    if (isFailedResponse(saveResponse)) {
      dashboardSaving = false;
      dashboardStatus = '';
      dashboardError = responseError(saveResponse, 'The profile changes could not be saved.');
      return;
    }
    if (saveResponse.data?.updated_at) {
      context = { ...context, profileConfig: { ...(context.profileConfig || {}), updatedAt: saveResponse.data.updated_at } };
    }
    dashboardStatus = 'Publishing profile…';
    const publishResponse = await supabase.rpc('publish_profile_configuration_v2', {
      p_expected_updated_at: saveResponse.data?.updated_at || context.profileConfig?.updatedAt || null
    });
    if (isFailedResponse(publishResponse)) {
      dashboardSaving = false;
      dashboardStatus = '';
      dashboardError = responseError(publishResponse, 'The profile could not be published.');
      return;
    }
    applyDashboardConfiguration({
      draft: publishResponse.data?.draft || saveResponse.data?.draft || v2Draft,
      published: publishResponse.data?.published || saveResponse.data?.published || v2Draft,
      updatedAt: saveResponse.data?.updated_at || context.profileConfig?.updatedAt,
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
    loading = false;
    if (nextContext.loadError) error = nextContext.loadError;
    else if (!nextContext.viewingOwnProfile) error = 'Profile settings are available only for your own profile.';
  }

  function updateConfiguration(event) {
    configurationPreview = null;
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
    const savedLayout = nextDraft.layoutVariant;
    if (event.detail?.layoutChanged && ['immersive', 'editorial', 'focus'].includes(savedLayout) && currentEquippedLayout) void clearPaidLayoutOverride();
    activeDirtySection = '';
  }

  async function clearPaidLayoutOverride() {
    const { data, error: rpcError } = await supabase.rpc('unequip_item', { p_slot: 'profile_layout' });
    if (rpcError || !data?.success) return;
    await refreshProfileState($session?.user?.id || null);
  }

  function updateExpression(event) {
    const fields = event.detail || {};
    const nextDraft = normalizeProfileConfig({ ...toEditorProfileConfig(context.profileConfig?.draft), ...fields }, FALLBACK_PROFILE_COLOR);
    const nextPublished = normalizeProfileConfig({ ...toEditorProfileConfig(context.profileConfig?.published), ...fields }, FALLBACK_PROFILE_COLOR);
    configurationPreview = configurationPreview
      ? normalizeProfileConfig({ ...configurationPreview, ...fields }, FALLBACK_PROFILE_COLOR)
      : null;
    if (context.profileConfig?.version === 2 || context.profileConfig?.v2Draft) {
      const nextDraftV2 = buildConfigurationV2(nextDraft, context.profileConfig?.v2Draft);
      const nextPublishedV2 = buildConfigurationV2(nextPublished, context.profileConfig?.v2Published);
      context = { ...context, profileConfig: { ...(context.profileConfig || {}), version: 2, draft: nextDraftV2, published: nextPublishedV2, v2Draft: nextDraftV2, v2Published: nextPublishedV2 } };
    } else {
      context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: nextDraft, published: nextPublished } };
    }
  }

  function updateAppearance(event) {
    const nextAppearance = event.detail?.appearance;
    if (!nextAppearance) return;
    configurationPreview = normalizeProfileConfig({ ...toEditorProfileConfig(context.profileConfig?.draft), appearance: nextAppearance, signatureColor: nextAppearance.colors.accent }, FALLBACK_PROFILE_COLOR);
  }

  function handleAppearanceSaved(event) {
    updateConfiguration({ detail: event.detail });
    configurationPreview = event.detail?.draft || null;
  }

  function handleConfigurationReloaded(event) {
    updateConfiguration({ detail: event.detail });
    configurationPreview = event.detail?.draft || null;
  }

  function updateConfigurationPreview(event) {
    const nextConfig = event.detail?.config;
    if (!nextConfig) { configurationPreview = null; return; }
    configurationPreview = normalizeProfileConfig(nextConfig, FALLBACK_PROFILE_COLOR);
  }

  function handleSocialChange() { void loadSettings(); }
  function updateIdentity(event) {
    const nextPresentation = event.detail?.identityPresentation;
    const currentConfig = context.profileConfig || {};
    if (!nextPresentation) {
      context = { ...context, targetProfile: { ...context.targetProfile, bio: event.detail?.bio ?? null }, profileConfig: currentConfig };
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

  function handleDirtyPromptKeydown(event) {
    if (!showDirtyPrompt) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      stayOnPage();
      return;
    }
    trapFocus(event, dirtyPrompt);
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
  showPreview={showDashboardPreview}
  on:sectionchange={handleDashboardSectionChange}
>
  <div slot="topbar">
    {#if context && !loading && (activeSection === 'customize' || activeSection === 'links') && DashboardActionsComponent}
      <svelte:component this={DashboardActionsComponent} dirty={dashboardDirty} saving={dashboardSaving} status={dashboardStatus} error={dashboardError} on:reset={resetDashboard} on:publish={publishDashboard} />
    {/if}
  </div>

  <div class="profile-settings-page" aria-busy={loading}>
    {#if loading}
      <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h1>Loading</h1></div>
    {:else if error}
      <div class="profile-settings-page__state" role="alert"><Surface variant="panel" padding="lg"><h1>{error}</h1><Button variant="secondary" href={profilePath}>Back to profile</Button></Surface></div>
    {:else if context}
      {#if activeSection !== 'customize'}
        <header class="profile-settings-page__toolbar">
          <div><p class="profile-settings-page__breadcrumb">Dashboard <span aria-hidden="true">›</span> {activeLabel}</p><h1>{activeLabel}</h1></div>
          <div class="profile-settings-page__toolbar-actions">
            {#if previewAvailable}<button type="button" aria-expanded={previewOpen} on:click={togglePreview}>{previewOpen ? 'Hide preview' : 'Preview'}</button>{/if}
            <a href={profilePath} on:click={handleViewProfile}>View profile ↗</a>
          </div>
        </header>
      {/if}
      {#if context.dataWarning}<p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>{/if}
      {#if activeSection === 'customize'}
        <div class="profile-settings-page__customize-tabs">
          <div class="profile-settings-page__customize-tabs-actions">
            {#if isMobileViewport}
              <button type="button" aria-expanded={previewOpen} on:click={togglePreview}>{previewOpen ? 'Hide preview' : 'Preview'}</button>
            {/if}
          </div>
          <div class="profile-settings-page__tablist" role="tablist" aria-label="Customize profile">
            {#each CUSTOMIZE_TABS as tab (tab.id)}
              <button
                id={`profile-customize-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeCustomizeTab === tab.id}
                aria-controls="profile-customize-tabpanel"
                tabindex={activeCustomizeTab === tab.id ? 0 : -1}
                class:active={activeCustomizeTab === tab.id}
                on:click={() => selectCustomizeTab(tab.id)}
                on:keydown={handleCustomizeTabKeydown}
              >
                <span>{tab.label}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="profile-settings-page__content" id={activeSection === 'customize' ? 'profile-customize-tabpanel' : undefined} role={activeSection === 'customize' ? 'tabpanel' : undefined} aria-labelledby={activeSection === 'customize' ? `profile-customize-tab-${activeCustomizeTab}` : undefined}>
        {#if activeSection === 'customize'}
          {#if sectionComponents.customize}
            <svelte:component
              this={sectionComponents.customize}
              bind:this={customizePage}
              components={sectionComponents}
              profileId={context.profileId}
              accountUsername={accountUsername}
              targetProfile={context.targetProfile}
              profileConfig={editorProfileConfig}
              activeTab={activeCustomizeTab}
              entitlements={$profileEntitlements}
              staff={Boolean(context.targetProfile?.is_staff)}
              on:appearancechange={updateAppearance}
              on:dirty={handleSectionDirty}
              on:identitysaved={updateIdentity}
              on:configsaved={handleAppearanceSaved}
              on:configpublished={updateConfiguration}
              on:configreloaded={handleConfigurationReloaded}
              on:configpreview={updateConfigurationPreview}
              on:premiumrequest={handleDashboardSectionChange}
            />
          {:else if sectionLoading}
            <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading Customize</h2></div>
          {/if}
        {:else if activeSection === 'links'}
          <div class="profile-links-page">
            {#if sectionComponents['profile-layout']}
            <svelte:component this={sectionComponents['profile-layout']} bind:this={layoutEditor} profileId={context.profileId} draftConfig={editorProfileConfig?.draft} publishedConfig={editorProfileConfig?.published} updatedAt={context.profileConfig?.updatedAt} entitlements={$profileEntitlements} staff={Boolean(context.targetProfile?.is_staff)} showLayout={false} showLinks={true} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
            {:else if sectionLoading}
              <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading links</h2></div>
            {/if}
            {#if sectionComponents['profile-aliases']}
              <svelte:component this={sectionComponents['profile-aliases']} />
            {/if}
          </div>
        {:else if activeSection === 'premium'}
          {#if sectionComponents.premium}
            <svelte:component this={sectionComponents.premium} entitlements={$profileEntitlements} staff={Boolean(context.targetProfile?.is_staff)} />
          {:else if sectionLoading}
            <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading Premium</h2></div>
          {/if}
        {:else if activeSection === 'account'}
          <ProfileAccountSettings on:accountdeleted={handleAccountDeleted} />
        {:else if sectionComponents[activeSection]}
          {#if activeSection === 'overview'}
            <svelte:component this={sectionComponents[activeSection]} profile={context.targetProfile} timelineEvents={context.timelineEvents} collectionItems={context.collectionItems} allAchievements={context.allAchievements} unlockedAchievements={context.unlockedAchievements} progression={context.progression} />
          {:else if activeSection === 'profile-identity'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} bio={context.targetProfile?.bio || ''} config={editorProfileConfig} on:identitysaved={updateIdentity} on:configsaved={updateConfiguration} />
          {:else if activeSection === 'profile-aliases'}
            <svelte:component this={sectionComponents[activeSection]} />
          {:else if activeSection === 'profile-media'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} config={editorProfileConfig} fallbackInitial={(context.targetProfile?.username || '✦').slice(0, 1)} staff={Boolean(context.targetProfile?.is_staff)} entitlements={$profileEntitlements} on:expressionchange={updateExpression} />
          {:else if activeSection === 'profile-content'}
            <svelte:component this={sectionComponents[activeSection]} bind:this={contentEditor} profileId={context.profileId} draftConfig={editorProfileConfig?.draft} publishedConfig={editorProfileConfig?.published} updatedAt={context.profileConfig?.updatedAt} entitlements={$profileEntitlements} staff={Boolean(context.targetProfile?.is_staff)} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'profile-widgets'}
            <svelte:component this={sectionComponents[activeSection]} bind:this={widgetEditor} profileId={context.profileId} draftConfig={editorProfileConfig?.draft} publishedConfig={editorProfileConfig?.published} updatedAt={context.profileConfig?.updatedAt} entitlements={$profileEntitlements} staff={Boolean(context.targetProfile?.is_staff)} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'profile-collection'}
            <svelte:component this={sectionComponents[activeSection]} accountProfile={context.targetProfile} profileConfig={editorProfileConfig} entitlements={$profileEntitlements} staff={Boolean(context.targetProfile?.is_staff)} />
          {:else if activeSection === 'profile-layout'}
            <svelte:component this={sectionComponents[activeSection]} bind:this={layoutEditor} profileId={context.profileId} draftConfig={editorProfileConfig?.draft} publishedConfig={editorProfileConfig?.published} updatedAt={context.profileConfig?.updatedAt} entitlements={$profileEntitlements} staff={Boolean(context.targetProfile?.is_staff)} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'profile-social'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} isOwnProfile={true} isAuthenticated={$isAuthenticated} social={context.social} settings={context.socialSettings} socialDepthEnabled={featureFlags.socialDepth} on:socialchange={handleSocialChange} />
          {:else if activeSection === 'profile-insights'}
            <svelte:component this={sectionComponents[activeSection]} configuration={context.profileConfig} socialSettings={context.socialSettings} on:socialchange={handleSocialChange} />
          {:else if activeSection === 'profile-notifications'}
            <svelte:component this={sectionComponents[activeSection]} />
          {:else if activeSection === 'progression'}
            <svelte:component this={sectionComponents[activeSection]} profile={context.targetProfile} timelineEvents={context.timelineEvents} collectionItems={context.collectionItems} allAchievements={context.allAchievements} unlockedAchievements={context.unlockedAchievements} progression={context.progression} />
          {/if}
        {:else if sectionLoading}
          <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading</h2></div>
        {:else}
          <div class="profile-settings-page__state" role="status"><h2>Section unavailable</h2></div>
        {/if}
      </div>
    {/if}
  </div>

  <div slot="preview" class="profile-settings-preview">
    <header class="profile-settings-preview__header">
      <div>
        <h2>Live preview</h2>
        <p>This is how your profile looks</p>
      </div>
      {#if isMobileViewport || activeSection === 'links'}
        <button class="profile-settings-preview__close" type="button" aria-label="Close live preview" on:click={togglePreview}>×</button>
      {/if}
    </header>
    <div class="profile-settings-preview__body">
      <div class="profile-settings-preview__canvas" class:profile-settings-preview__canvas--mobile={previewDevice === 'mobile'} class:profile-settings-preview__canvas--appearance={activeSection === 'customize' && activeCustomizeTab === 'appearance'}>
        {#if PreviewComponent}
          <svelte:component this={PreviewComponent} previewMode={true} previewIdentityOnly={true} previewProfile={previewProfile} previewProfileConfig={previewProfileConfig} previewScores={context?.targetScores || []} previewTimelineEvents={context?.timelineEvents || []} previewCollectionItems={context?.collectionItems || []} previewAllAchievements={context?.allAchievements || []} />
        {:else if previewError}
          <div class="profile-settings-preview__loading" role="alert"><span aria-hidden="true">!</span><strong>Preview unavailable</strong><p>{previewError}</p><button type="button" on:click={loadPreviewComponent}>Retry preview</button></div>
        {:else}
          <div class="profile-settings-preview__loading" role="status" aria-live="polite"><span aria-hidden="true">✦</span> Preparing your live canvas…</div>
        {/if}
      </div>
      <div class="profile-settings-preview__device-panel" class:profile-settings-preview__device-panel--appearance={activeSection === 'customize' && activeCustomizeTab === 'appearance'}>
        <div class="profile-settings-preview__devices" role="group" aria-label="Preview device">
          <button type="button" class:active={previewDevice === 'desktop'} aria-pressed={previewDevice === 'desktop'} on:click={() => setPreviewDevice('desktop')}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1.5"></rect><path d="M8 20h8M12 17v3"></path></svg>Desktop</button>
          <button type="button" class:active={previewDevice === 'mobile'} aria-pressed={previewDevice === 'mobile'} on:click={() => setPreviewDevice('mobile')}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"></rect><path d="M11 18h2"></path></svg>Mobile</button>
        </div>
        {#if activeSection === 'customize' && activeCustomizeTab === 'appearance'}
          <div class="profile-settings-preview__device-sample" aria-label="Desktop preview sample"></div>
        {/if}
      </div>
      <aside class="profile-settings-preview__plus-card" aria-label="Chromadie Plus">
        <div class="profile-settings-preview__plus-icon" aria-hidden="true">♔</div>
        <div><h3>Unlock more with Chromadie Plus</h3><p>Get access to premium effects, animated cursors, unique borders and more.</p><a href="#premium" on:click={() => dispatch('sectionchange', { sectionId: 'premium' })}>View premium features <span aria-hidden="true">→</span></a></div>
      </aside>
    </div>
  </div>
</ProfileDashboardShell>

{#if showDirtyPrompt}
  <div class="profile-settings-prompt__backdrop" role="presentation">
    <div class="profile-settings-prompt" bind:this={dirtyPrompt} role="dialog" aria-modal="true" aria-labelledby="profile-settings-prompt-title" tabindex="-1">
      <h2 id="profile-settings-prompt-title">Unsaved changes</h2>
      <p>Stay to keep editing or discard this draft?</p>
      <div><button bind:this={dirtyPromptPrimary} type="button" on:click={stayOnPage}>Stay</button><button type="button" class="profile-settings-prompt__discard" on:click={discardAndContinue}>Discard</button></div>
    </div>
  </div>
{/if}

<style>
  .profile-settings-page { width: 100%; min-width: 0; }
  .profile-settings-page__toolbar { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: .2rem 0 1.45rem; }
  .profile-settings-page__breadcrumb { display: flex; gap: .45rem; margin: 0 0 .55rem; color: var(--site-faint, #7d7e87); font: .7rem/1 var(--site-mono, monospace); }
  .profile-settings-page__toolbar h1 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: clamp(1.5rem, 2.5vw, 2.25rem); letter-spacing: -.05em; }
  .profile-settings-page__toolbar-actions { display: flex; align-items: center; gap: .55rem; }
  .profile-settings-page__toolbar-actions :is(a, button) { min-height: 2rem; padding: .5rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-muted, #aaa8b0); font-size: .78rem; text-decoration: none; cursor: pointer; }
  .profile-settings-page__toolbar-actions :is(a, button):hover { border-color: var(--site-accent, #cdd2ff); color: var(--site-ink, #f2f0eb); }
  .profile-settings-page__customize-tabs { position: relative; display: grid; margin: 0 .75rem .45rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .5rem; background: var(--ctp-mantle, #181825); }
  .profile-settings-page__customize-tabs-actions { position: absolute; top: .45rem; right: .6rem; z-index: 1; display: none; gap: .45rem; }
  .profile-settings-page__customize-tabs-actions :is(a, button) { min-height: 1.9rem; padding: .4rem .6rem; border: 1px solid var(--ctp-surface1, #45475a); border-radius: .32rem; background: transparent; color: var(--ctp-subtext1, #bac2de); font-size: .7rem; text-decoration: none; cursor: pointer; }
  .profile-settings-page__customize-tabs-actions :is(a, button):hover, .profile-settings-page__customize-tabs-actions :is(a, button):focus-visible { border-color: var(--ctp-lavender, #b4befe); color: var(--ctp-text, #cdd6f4); }
  .profile-settings-page__tablist { display: flex; align-items: stretch; gap: 0; min-height: 3.05rem; padding: 0 .4rem; }
  .profile-settings-page__tablist button { position: relative; display: inline-flex; align-items: center; justify-content: center; min-width: 7rem; min-height: 3.05rem; padding: .55rem .9rem; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--ctp-subtext1, #bac2de); font: 600 .78rem/1 var(--site-font, sans-serif); cursor: pointer; }
  .profile-settings-page__tablist button:hover, .profile-settings-page__tablist button:focus-visible { color: var(--ctp-text, #cdd6f4); }
  .profile-settings-page__tablist button.active { border-bottom-color: var(--ctp-blue, #89b4fa); color: var(--ctp-blue, #89b4fa); }
  .profile-settings-page__tablist button:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 2px; }
  .profile-settings-page__warning { margin: 0 0 1rem; padding: .65rem .75rem; border: 1px solid color-mix(in srgb, var(--ctp-peach, #fab387) 35%, transparent); border-radius: .35rem; color: var(--ctp-peach, #fab387); font-size: .8rem; }
  .profile-settings-page__content { width: 100%; min-width: 0; }
  .profile-links-page { display: grid; gap: 1rem; min-width: 0; }
  .profile-settings-page__state { display: grid; min-height: 16rem; place-items: center; gap: .6rem; color: var(--site-muted, #aaa8b0); }
  .profile-settings-page__state h1 { margin: 0; font-size: 1.2rem; }
  .profile-settings-preview { display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; min-height: 0; height: 100%; }
  .profile-settings-preview__header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; min-height: 5.1rem; padding: 1.1rem 1rem .7rem; }
  .profile-settings-preview__header h2 { margin: 0; color: var(--ctp-text, var(--site-ink, #f2f0eb)); font-size: 1.05rem; letter-spacing: -.02em; }
  .profile-settings-preview__header p { margin: .35rem 0 0; color: var(--ctp-subtext0, var(--site-muted, #a6adc8)); font-size: .74rem; }
  .profile-settings-preview__close { display: grid; width: 2.25rem; height: 2.25rem; place-items: center; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .4rem; background: transparent; color: var(--site-muted, #aaa8b0); font-size: 1.1rem; cursor: pointer; }
  .profile-settings-preview__close:hover, .profile-settings-preview__close:focus-visible { border-color: var(--site-accent, #cdd2ff); color: var(--site-ink, #f2f0eb); }
  .profile-settings-preview__body { display: grid; align-content: start; gap: .9rem; min-height: 0; overflow: auto; padding: .2rem 1rem 1rem; background: var(--ctp-mantle, var(--site-deep, #11111b)); }
  .profile-settings-preview__canvas { display: grid; width: 100%; min-width: 0; place-items: start center; padding: .15rem 0 0; }
  .profile-settings-preview__canvas--appearance { min-height: 24rem; margin-bottom: .6rem; }
  .profile-settings-preview__canvas :global(.profile-shell-page--preview) { width: min(100%, 34rem); height: auto; min-height: 0; overflow: visible; border: 1px solid color-mix(in srgb, var(--ctp-lavender, #b4befe) 72%, var(--ctp-surface1, #45475a)); border-radius: .85rem; }
  .profile-settings-preview__canvas.profile-settings-preview__canvas--appearance :global(.profile-shell-page--preview) { height: 24rem !important; min-height: 24rem !important; overflow: hidden; }
  .profile-settings-preview__canvas--mobile :global(.profile-shell-page--preview) { width: min(19rem, 76%); }
  .profile-settings-preview__canvas :global(.profile-shell-page--preview .profile-shell__approved-canvas) { min-height: 0; }
  .profile-settings-preview__canvas :global(.profile-shell-page--preview .profile-shell__approved-main) { height: auto; min-height: 0; align-items: stretch; justify-content: flex-start; }
  .profile-settings-preview__canvas :global(.profile-shell-page--preview .profile-shell__opening) { min-height: 0; padding: 1.15rem; }
  .profile-settings-preview__device-panel { min-width: 0; }
  .profile-settings-preview__device-panel--appearance { display: grid; min-height: 13.2rem; overflow: hidden; border: 1px solid var(--ctp-surface0, #313244); border-radius: .55rem; background: var(--ctp-base, #1e1e2e); }
  .profile-settings-preview__devices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 3rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .55rem; background: var(--ctp-base, #1e1e2e); }
  .profile-settings-preview__device-panel--appearance .profile-settings-preview__devices { border: 0; border-bottom: 1px solid var(--ctp-surface0, #313244); border-radius: 0; }
  .profile-settings-preview__devices button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--ctp-subtext1, #bac2de); font: 600 .74rem/1 var(--site-font, sans-serif); cursor: pointer; }
  .profile-settings-preview__devices button.active { border-bottom-color: var(--ctp-blue, #89b4fa); color: var(--ctp-blue, #89b4fa); }
  .profile-settings-preview__devices button:focus-visible { outline: 2px solid var(--ctp-lavender, #b4befe); outline-offset: -2px; }
  .profile-settings-preview__devices svg { width: .9rem; height: .9rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
  .profile-settings-preview__device-sample { position: relative; min-height: 8.8rem; margin: .7rem; padding: .7rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .5rem; background: var(--ctp-base, #1e1e2e); }
  .profile-settings-preview__device-sample::before { position: absolute; top: .8rem; right: .9rem; left: .9rem; height: .8rem; border-bottom: 1px solid var(--ctp-surface0, #313244); background: var(--ctp-lavender, #b4befe); content: ''; opacity: .9; }
  .profile-settings-preview__device-sample::after { position: absolute; top: 2.25rem; right: .7rem; bottom: .7rem; left: .7rem; border: 1px solid var(--ctp-surface1, #45475a); border-radius: .35rem; background: var(--ctp-mantle, #181825); box-shadow: inset 3rem 1rem 0 -2.55rem var(--ctp-surface1, #45475a), inset 4.7rem 2.55rem 0 -4.25rem var(--ctp-text, #cdd6f4), inset 4.7rem 3.3rem 0 -4.25rem var(--ctp-overlay1, #7f849c), inset 4.7rem 4.05rem 0 -4.25rem var(--ctp-overlay1, #7f849c); content: ''; }
  .profile-settings-preview__device-panel--appearance + .profile-settings-preview__plus-card { margin-top: .9rem; }
  .profile-settings-preview__plus-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .7rem; padding: .85rem; border: 1px solid color-mix(in srgb, var(--ctp-mauve, #cba6f7) 30%, var(--ctp-surface0, #313244)); border-radius: .55rem; background: color-mix(in srgb, var(--ctp-mauve, #cba6f7) 5%, var(--ctp-mantle, #181825)); }
  .profile-settings-preview__plus-icon { display: grid; width: 1.5rem; height: 1.5rem; place-items: center; color: var(--ctp-mauve, #cba6f7); font-size: 1.25rem; }
  .profile-settings-preview__plus-card h3 { margin: 0; color: var(--ctp-mauve, #cba6f7); font-size: .82rem; }
  .profile-settings-preview__plus-card p { margin: .35rem 0 .65rem; color: var(--ctp-subtext1, #bac2de); font-size: .7rem; line-height: 1.4; }
  .profile-settings-preview__plus-card a { color: var(--ctp-mauve, #cba6f7); font-size: .72rem; font-weight: 650; text-decoration: none; }
  .profile-settings-preview__plus-card a:hover { text-decoration: underline; }
  .profile-settings-preview__loading { display: grid; place-items: center; min-height: 18rem; gap: .55rem; color: var(--site-muted, #aaa8b0); font-size: .8rem; text-align: center; }
  .profile-settings-preview__loading span { color: var(--site-accent, #cdd2ff); font-size: 1.2rem; }
  .profile-settings-preview__loading strong { color: var(--site-ink, #f2f0eb); font-size: .92rem; }
  .profile-settings-preview__loading p { max-width: 20rem; margin: 0; color: var(--site-faint, #7d7e87); line-height: 1.45; }
  .profile-settings-preview__loading button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .78rem; cursor: pointer; }
  .profile-settings-prompt__backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 1rem; background: rgba(0,0,0,.62); }
  .profile-settings-prompt { width: min(24rem, 100%); padding: 1.1rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: var(--site-raised, #111319); box-shadow: 0 1.5rem 4rem rgba(0,0,0,.4); }
  .profile-settings-prompt h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1rem; }
  .profile-settings-prompt p { margin: .5rem 0 1rem; color: var(--site-muted, #aaa8b0); font-size: .75rem; }
  .profile-settings-prompt > div { display: flex; justify-content: flex-end; gap: .5rem; }
  .profile-settings-prompt button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-settings-prompt__discard { border-color: var(--ctp-red, #f38ba8) !important; color: var(--ctp-red, #f38ba8) !important; }
  @media (max-width: 52rem) {
    .profile-settings-page__customize-tabs { margin-inline: 0; }
    .profile-settings-page__customize-tabs-actions { position: static; justify-content: flex-end; padding: .45rem .55rem 0; }
    .profile-settings-page__tablist { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 30rem) {
    .profile-settings-page__tablist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-settings-page__tablist button { width: 100%; }
    .profile-settings-page__tablist button { min-height: 2.8rem; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-settings-preview__body { scroll-behavior: auto; } }
</style>
