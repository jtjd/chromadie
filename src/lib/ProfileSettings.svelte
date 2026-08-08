<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { restoreFocus, trapFocus } from './a11y.js';
  import { authUser, equippedItems, isAuthenticated, profile, profileEntitlements, refreshProfileState, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
  import { normalizeRichMediaConfig } from './profileRichMedia.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import ProfileAppearanceEditor from './ProfileAppearanceEditor.svelte';
  import ProfileAccountSettings from './ProfileAccountSettings.svelte';
  import ProfileDashboardShell from './ProfileDashboardShell.svelte';

  const SECTION_LOADERS = Object.freeze({
    overview: () => import('./ProfileStudioOverview.svelte'),
    'profile-identity': () => import('./IdentityEditor.svelte'),
    'profile-aliases': () => import('./ProfileAliasesEditor.svelte'),
    'profile-media': () => import('./ProfileExpressionEditor.svelte'),
    'profile-content': () => import('./ProfileContentEditor.svelte'),
    'profile-widgets': () => import('./ProfileWidgetEditor.svelte'),
    'profile-collection': () => import('./ProfileCosmeticsEditor.svelte'),
    'profile-layout': () => import('./ProfileEditor.svelte'),
    'profile-social': () => import('./ProfileSocial.svelte'),
    'profile-insights': () => import('./ProfileInsights.svelte'),
    progression: () => import('./ProfileProgression.svelte')
  });

  const SETTINGS_SECTIONS = Object.freeze([
    { id: 'overview', label: 'Overview', groupKey: 'top', icon: '⌂' },
    { id: 'profile-insights', label: 'Insights', groupKey: 'top', icon: '◒' },
    { id: 'customize', label: 'Customize', groupKey: 'top', icon: '✦' },
    { id: 'profile-identity', label: 'Identity', groupKey: 'profile', groupLabel: 'Profile', icon: '◌' },
    { id: 'profile-aliases', label: 'Aliases', groupKey: 'profile', groupLabel: 'Profile', icon: '↗' },
    { id: 'profile-media', label: 'Media', groupKey: 'profile', groupLabel: 'Profile', icon: '▧' },
    { id: 'profile-content', label: 'About & projects', groupKey: 'profile', groupLabel: 'Profile', icon: '✎' },
    { id: 'profile-widgets', label: 'Provider widgets', groupKey: 'profile', groupLabel: 'Profile', icon: '▶' },
    { id: 'profile-layout', label: 'Layout & links', groupKey: 'profile', groupLabel: 'Profile', icon: '⌘' },
    { id: 'profile-social', label: 'Privacy & social', groupKey: 'profile', groupLabel: 'Profile', icon: '◍' },
    { id: 'profile-collection', label: 'Collection', groupKey: 'profile', groupLabel: 'Profile', icon: '◇' },
    { id: 'progression', label: 'Progression', groupKey: 'bottom', icon: '↗' },
    { id: 'account', label: 'Account', groupKey: 'bottom', icon: '·' }
  ]);

  const HASH_ALIASES = Object.freeze({
    customize: 'customize',
    appearance: 'customize',
    'profile-identity': 'profile-identity',
    'profile-aliases': 'profile-aliases',
    'profile-media': 'profile-media',
    'profile-content': 'profile-content',
    'profile-widgets': 'profile-widgets',
    'profile-layout': 'profile-layout',
    'profile-social': 'profile-social',
    'profile-insights': 'profile-insights',
    'profile-collection': 'profile-collection',
    identity: 'profile-identity',
    aliases: 'profile-aliases',
    expression: 'profile-media',
    media: 'profile-media',
    content: 'profile-content',
    widgets: 'profile-widgets',
    layout: 'profile-layout',
    social: 'profile-social',
    insights: 'profile-insights',
    collection: 'profile-collection',
    progression: 'progression',
    account: 'account'
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
  let activeSection = 'overview';
  let configurationPreview = null;
  let PreviewComponent = null;
  let previewError = '';
  let sectionComponents = {};
  let sectionLoading = false;
  let sectionRequestId = 0;
  let activeDirtySection = '';
  let pendingNavigation = null;
  let showDirtyPrompt = false;
  let dirtyPrompt = null;
  let dirtyPromptPrimary = null;
  let dirtyPromptReturnFocus = null;
  let appearanceEditor = null;
  let layoutEditor = null;
  let contentEditor = null;
  let widgetEditor = null;

  function getEquippedLayout(value) {
    return value && typeof value === 'object' && typeof value.profile_layout === 'string' ? value.profile_layout : '';
  }
  $: currentEquippedLayout = getEquippedLayout($equippedItems);
  $: accountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: accountKey = $isAuthenticated && $session?.user?.id ? $session.user.id : '';
  $: if (accountKey) void loadSettings();
  $: profilePath = context?.targetProfile?.username ? getCanonicalProfilePath(context.targetProfile.username) : '/profile';
  $: activeLabel = SETTINGS_SECTIONS.find(section => section.id === activeSection)?.label || 'Overview';
  $: previewProfileConfig = configurationPreview || context?.profileConfig?.draft;
  $: previewProfile = context?.targetProfile
    ? { ...context.targetProfile, equipped_cosmetics: $equippedItems || context.targetProfile.equipped_cosmetics || {} }
    : null;
  onMount(() => {
    void loadPreviewComponent();
    const getSectionFromLocation = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      const sectionId = HASH_ALIASES[rawHash] || rawHash;
      return SETTINGS_SECTIONS.some(section => section.id === sectionId) ? sectionId : 'overview';
    };
    const restoreLocation = () => {
      const nextSection = getSectionFromLocation();
      if (nextSection === activeSection) return;
      if (activeDirtySection) {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${activeSection}`);
        openDirtyPrompt({ type: 'section', value: nextSection });
        return;
      }
      setActiveSection(nextSection, { push: false });
    };
    setActiveSection(getSectionFromLocation(), { push: false });
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
    };
  });

  function setActiveSection(sectionId, { push = true } = {}) {
    if (!SETTINGS_SECTIONS.some(section => section.id === sectionId)) return;
    activeSection = sectionId;
    void loadSectionComponent(sectionId);
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}${window.location.search}#${sectionId}`;
      if (push) window.history.pushState({ dashboardSection: sectionId }, '', url);
      else if (window.location.hash !== `#${sectionId}`) window.history.replaceState({ dashboardSection: sectionId }, '', url);
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

  function handleSectionDirty(event) {
    const isDirty = event.detail?.dirty === true;
    activeDirtySection = isDirty ? activeSection : (activeDirtySection === activeSection ? '' : activeDirtySection);
  }

  function resetActiveEditor() {
    if (activeDirtySection === 'customize') appearanceEditor?.resetChanges?.();
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
    if (next.type === 'section') setActiveSection(next.value);
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

  async function loadSectionComponent(sectionId) {
    const loader = SECTION_LOADERS[sectionId];
    if (!loader || sectionComponents[sectionId]) return;
    const request = ++sectionRequestId;
    sectionLoading = true;
    try {
      const module = await loader();
      if (request !== sectionRequestId) return;
      sectionComponents = { ...sectionComponents, [sectionId]: module.default };
    } finally {
      if (request === sectionRequestId) sectionLoading = false;
    }
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

  async function loadSettings() {
    const nextRequestId = ++requestId;
    const previousContext = context;
    loading = !previousContext;
    error = '';
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
    const fallbackColor = '#CDD2FF';
    const currentDraft = context?.profileConfig?.draft || {};
    const currentPublished = context?.profileConfig?.published || {};
    context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: normalizeProfileConfig(preserveExpressionFields(event.detail?.draft, currentDraft), fallbackColor), published: normalizeProfileConfig(preserveExpressionFields(event.detail?.published, currentPublished), fallbackColor), updatedAt: event.detail?.updatedAt || context.profileConfig?.updatedAt, publishedAt: event.detail?.publishedAt || context.profileConfig?.publishedAt } };
    const savedLayout = normalizeProfileConfig(event.detail?.draft, fallbackColor).layoutVariant;
    if (event.detail?.layoutChanged && ['immersive', 'editorial', 'focus'].includes(savedLayout) && currentEquippedLayout) void clearPaidLayoutOverride();
    activeDirtySection = '';
  }

  async function clearPaidLayoutOverride() {
    const { data, error: rpcError } = await supabase.rpc('unequip_item', { p_slot: 'profile_layout' });
    if (rpcError || !data?.success) return;
    await refreshProfileState($session?.user?.id || null);
  }

  function updateExpression(event) {
    const fallbackColor = '#CDD2FF';
    const fields = event.detail || {};
    const nextDraft = normalizeProfileConfig({ ...context.profileConfig?.draft, ...fields }, fallbackColor);
    const nextPublished = normalizeProfileConfig({ ...context.profileConfig?.published, ...fields }, fallbackColor);
    configurationPreview = configurationPreview
      ? normalizeProfileConfig({ ...configurationPreview, ...fields }, fallbackColor)
      : null;
    context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: nextDraft, published: nextPublished } };
  }

  function updateAppearance(event) {
    const fallbackColor = '#CDD2FF';
    const nextAppearance = event.detail?.appearance;
    if (!nextAppearance) return;
    const nextDraft = normalizeProfileConfig({ ...context.profileConfig?.draft, appearance: nextAppearance, signatureColor: nextAppearance.colors.accent }, fallbackColor);
    configurationPreview = nextDraft;
    context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: nextDraft } };
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
    const fallbackColor = '#CDD2FF';
    configurationPreview = normalizeProfileConfig(nextConfig, fallbackColor);
  }

  function handleSocialChange() { void loadSettings(); }
  function updateIdentity(event) { context = { ...context, targetProfile: { ...context.targetProfile, bio: event.detail?.bio ?? null } }; }

  async function loadPreviewComponent() {
    if (PreviewComponent) return;
    previewError = '';
    try {
      const module = await import('./ProfileShell.svelte');
      PreviewComponent = module.default;
    } catch (loadError) {
      previewError = loadError instanceof Error ? loadError.message : 'The live preview could not be loaded.';
    }
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
  sections={[...SETTINGS_SECTIONS]}
  {activeSection}
  showPreview={true}
  on:sectionchange={handleDashboardSectionChange}
>
  <div class="profile-settings-page" aria-busy={loading}>
    {#if loading}
      <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h1>Loading</h1></div>
    {:else if error}
      <div class="profile-settings-page__state" role="alert"><Surface variant="panel" padding="lg"><h1>{error}</h1><Button variant="secondary" href={profilePath}>Back to profile</Button></Surface></div>
    {:else if context}
      <header class="profile-settings-page__toolbar">
        <div><p class="profile-settings-page__breadcrumb">Dashboard <span aria-hidden="true">›</span> {activeLabel}</p><h1>{activeLabel}</h1></div>
        <div class="profile-settings-page__toolbar-actions"><a href={profilePath} on:click={handleViewProfile}>View profile ↗</a></div>
      </header>
      {#if context.dataWarning}<p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>{/if}

      <div class="profile-settings-page__content">
        {#if activeSection === 'customize'}
          <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} updatedAt={context.profileConfig?.updatedAt} on:appearancechange={updateAppearance} on:dirty={handleSectionDirty} on:configsaved={handleAppearanceSaved} on:configreloaded={handleConfigurationReloaded} />
        {:else if activeSection === 'account'}
          <ProfileAccountSettings on:accountdeleted={handleAccountDeleted} />
        {:else if sectionComponents[activeSection]}
          {#if activeSection === 'overview'}
            <svelte:component this={sectionComponents[activeSection]} profile={context.targetProfile} timelineEvents={context.timelineEvents} collectionItems={context.collectionItems} allAchievements={context.allAchievements} unlockedAchievements={context.unlockedAchievements} progression={context.progression} />
          {:else if activeSection === 'profile-identity'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} bio={context.targetProfile?.bio || ''} on:identitysaved={updateIdentity} />
          {:else if activeSection === 'profile-aliases'}
            <svelte:component this={sectionComponents[activeSection]} />
          {:else if activeSection === 'profile-media'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} config={context.profileConfig} fallbackInitial={(context.targetProfile?.username || '✦').slice(0, 1)} staff={Boolean(context.targetProfile?.is_staff)} entitlements={$profileEntitlements} on:expressionchange={updateExpression} />
          {:else if activeSection === 'profile-content'}
            <svelte:component this={sectionComponents[activeSection]} bind:this={contentEditor} profileId={context.profileId} draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} updatedAt={context.profileConfig?.updatedAt} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'profile-widgets'}
            <svelte:component this={sectionComponents[activeSection]} bind:this={widgetEditor} profileId={context.profileId} draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} updatedAt={context.profileConfig?.updatedAt} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'profile-collection'}
            <svelte:component this={sectionComponents[activeSection]} accountProfile={context.targetProfile} profileConfig={context.profileConfig} />
          {:else if activeSection === 'profile-layout'}
            <svelte:component this={sectionComponents[activeSection]} bind:this={layoutEditor} profileId={context.profileId} draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} updatedAt={context.profileConfig?.updatedAt} entitlements={$profileEntitlements} on:dirty={handleSectionDirty} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configreloaded={handleConfigurationReloaded} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'profile-social'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} isOwnProfile={true} isAuthenticated={$isAuthenticated} social={context.social} settings={context.socialSettings} on:socialchange={handleSocialChange} />
          {:else if activeSection === 'profile-insights'}
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
        <p class="profile-settings-preview__eyebrow">Profile canvas</p>
        <h2>Live preview</h2>
      </div>
      <span class="profile-settings-preview__status"><span aria-hidden="true"></span> Draft</span>
    </header>
    <div class="profile-settings-preview__body">
      {#if PreviewComponent}
        <svelte:component this={PreviewComponent} previewMode={true} previewProfile={previewProfile} previewProfileConfig={previewProfileConfig} previewScores={context?.targetScores || []} previewTimelineEvents={context?.timelineEvents || []} previewCollectionItems={context?.collectionItems || []} previewAllAchievements={context?.allAchievements || []} />
      {:else if previewError}
        <div class="profile-settings-preview__loading" role="alert"><span aria-hidden="true">!</span><strong>Preview unavailable</strong><p>{previewError}</p><button type="button" on:click={loadPreviewComponent}>Retry preview</button></div>
      {:else}
        <div class="profile-settings-preview__loading" role="status" aria-live="polite"><span aria-hidden="true">✦</span> Preparing your live canvas…</div>
      {/if}
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
  .profile-settings-page { min-width: 0; }
  .profile-settings-page__toolbar { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: .2rem 0 1.45rem; }
  .profile-settings-page__breadcrumb { display: flex; gap: .45rem; margin: 0 0 .55rem; color: var(--site-faint, #7d7e87); font: .62rem/1 var(--site-mono, monospace); }
  .profile-settings-page__toolbar h1 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: clamp(1.5rem, 2.5vw, 2.25rem); letter-spacing: -.05em; }
  .profile-settings-page__toolbar-actions { display: flex; align-items: center; gap: .55rem; }
  .profile-settings-page__toolbar-actions :is(a, button) { min-height: 2rem; padding: .5rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-muted, #aaa8b0); font-size: .68rem; text-decoration: none; cursor: pointer; }
  .profile-settings-page__toolbar-actions :is(a, button):hover { border-color: var(--site-accent, #cdd2ff); color: var(--site-ink, #f2f0eb); }
  .profile-settings-page__warning { margin: 0 0 1rem; padding: .65rem .75rem; border: 1px solid rgba(255, 183, 94, .35); border-radius: .35rem; color: #ffc783; font-size: .72rem; }
  .profile-settings-page__content { min-width: 0; }
  .profile-settings-page__state { display: grid; min-height: 16rem; place-items: center; gap: .6rem; color: var(--site-muted, #aaa8b0); }
  .profile-settings-page__state h1 { margin: 0; font-size: 1.2rem; }
  .profile-settings-preview { display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; min-height: 0; height: 100%; }
  .profile-settings-preview__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-height: 4.6rem; padding: .85rem 1rem; border-bottom: 1px solid var(--site-line, rgba(255,255,255,.08)); }
  .profile-settings-preview__eyebrow { margin: 0 0 .3rem; color: var(--site-faint, #7d7e87); font: .58rem/1 var(--site-mono, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .profile-settings-preview__header h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .95rem; letter-spacing: -.02em; }
  .profile-settings-preview__status { display: inline-flex; align-items: center; gap: .4rem; color: var(--site-muted, #aaa8b0); font: .62rem/1 var(--site-mono, monospace); white-space: nowrap; }
  .profile-settings-preview__status span { width: .42rem; height: .42rem; border-radius: 50%; background: #6de2a4; box-shadow: 0 0 .8rem rgba(109,226,164,.6); }
  .profile-settings-preview__body { min-height: 0; overflow: auto; padding: .9rem; background: radial-gradient(circle at 50% 0%, rgba(205,210,255,.06), transparent 42%), var(--site-deep, #090a0d); }
  .profile-settings-preview__body :global(.profile-shell-page--preview) { height: auto; min-height: 100%; overflow: visible; }
  .profile-settings-preview__body :global(.profile-shell-page--preview .profile-shell__approved-main) { height: auto; min-height: 0; }
  .profile-settings-preview__loading { display: grid; place-items: center; min-height: 18rem; gap: .55rem; color: var(--site-muted, #aaa8b0); font-size: .72rem; text-align: center; }
  .profile-settings-preview__loading span { color: var(--site-accent, #cdd2ff); font-size: 1.2rem; }
  .profile-settings-preview__loading strong { color: var(--site-ink, #f2f0eb); font-size: .85rem; }
  .profile-settings-preview__loading p { max-width: 20rem; margin: 0; color: var(--site-faint, #7d7e87); line-height: 1.45; }
  .profile-settings-preview__loading button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-settings-prompt__backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 1rem; background: rgba(0,0,0,.62); }
  .profile-settings-prompt { width: min(24rem, 100%); padding: 1.1rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: var(--site-raised, #111319); box-shadow: 0 1.5rem 4rem rgba(0,0,0,.4); }
  .profile-settings-prompt h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1rem; }
  .profile-settings-prompt p { margin: .5rem 0 1rem; color: var(--site-muted, #aaa8b0); font-size: .75rem; }
  .profile-settings-prompt > div { display: flex; justify-content: flex-end; gap: .5rem; }
  .profile-settings-prompt button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-settings-prompt__discard { border-color: #ff9da9 !important; color: #ffb4bd !important; }
  @media (prefers-reduced-motion: reduce) { .profile-settings-preview__body { scroll-behavior: auto; } }
</style>
