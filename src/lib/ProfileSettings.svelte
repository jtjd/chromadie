<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y.js';
  import { authUser, equippedItems, isAuthenticated, profile, refreshProfileState, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import ProfileAppearanceEditor from './ProfileAppearanceEditor.svelte';
  import ProfileAccountSettings from './ProfileAccountSettings.svelte';
  import ProfileDashboardShell from './ProfileDashboardShell.svelte';

  const SECTION_LOADERS = Object.freeze({
    overview: () => import('./ProfileStudioOverview.svelte'),
    identity: () => import('./IdentityEditor.svelte'),
    expression: () => import('./ProfileExpressionEditor.svelte'),
    collection: () => import('./ProfileCosmeticsEditor.svelte'),
    layout: () => import('./ProfileEditor.svelte'),
    social: () => import('./ProfileSocial.svelte'),
    progression: () => import('./ProfileProgression.svelte')
  });

  const SETTINGS_SECTIONS = Object.freeze([
    { id: 'overview', label: 'Overview', group: 'Workspace', icon: '⌂' },
    { id: 'customize', label: 'Customize', group: 'Workspace', icon: '✦' },
    { id: 'identity', label: 'Identity', group: 'Profile', icon: '◌' },
    { id: 'expression', label: 'Media', group: 'Profile', icon: '▧' },
    { id: 'layout', label: 'Layout & links', group: 'Profile', icon: '⌘' },
    { id: 'social', label: 'Privacy & social', group: 'Profile', icon: '◍' },
    { id: 'collection', label: 'Collection', group: 'Profile', icon: '◇' },
    { id: 'progression', label: 'Progression', group: 'Workspace', icon: '↗' },
    { id: 'account', label: 'Account', group: 'Workspace', icon: '·' }
  ]);

  const HASH_ALIASES = Object.freeze({
    customize: 'customize',
    appearance: 'customize',
    expression: 'expression',
    media: 'expression',
    identity: 'identity',
    layout: 'layout',
    social: 'social',
    collection: 'collection',
    progression: 'progression',
    account: 'account'
  });

  export let logoutInProgress = false;
  const dispatch = createEventDispatcher();

  function createInitialSettingsContext() {
    const currentProfile = { ...($profile || {}) };
    const fallbackColor = currentProfile.mood_color || '#8B7CF6';
    return {
      profileId: currentProfile.id || $session?.user?.id || null,
      viewingOwnProfile: true,
      targetProfile: currentProfile,
      targetScores: [],
      timelineEvents: [],
      collectionItems: [],
      profileConfig: { version: 1, draft: createDefaultProfileConfig(fallbackColor), published: createDefaultProfileConfig(fallbackColor) },
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
  let previewOpen = false;
  let PreviewComponent = null;
  let previewTrigger = null;
  let previewDialog = null;
  let previousBodyOverflow = '';
  let sectionComponents = {};
  let sectionLoading = false;
  let sectionRequestId = 0;

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
  onMount(() => {
    const syncHash = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      const sectionId = HASH_ALIASES[rawHash] || rawHash;
      if (SETTINGS_SECTIONS.some(section => section.id === sectionId)) {
        activeSection = sectionId;
        void loadSectionComponent(sectionId);
      }
    };
    syncHash();
    void loadSectionComponent(activeSection);
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  });

  onDestroy(() => {
    if (previewOpen && typeof document !== 'undefined') document.body.style.overflow = previousBodyOverflow;
  });

  function setActiveSection(sectionId) {
    if (!SETTINGS_SECTIONS.some(section => section.id === sectionId)) return;
    activeSection = sectionId;
    void loadSectionComponent(sectionId);
    if (typeof window !== 'undefined') window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${sectionId}`);
  }

  function handleDashboardSectionChange(event) { setActiveSection(event.detail?.sectionId); }
  function forwardDashboardNavigation(event) { dispatch('navigate', event.detail); }
  function forwardDashboardLogout() { dispatch('logout'); }

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
    return { ...next, avatar_path: current.avatar_path ?? next.avatar_path ?? null, background_path: current.background_path ?? next.background_path ?? null, audio_path: current.audio_path ?? next.audio_path ?? null, spotify_type: current.spotify_type ?? next.spotify_type ?? null, spotify_id: current.spotify_id ?? next.spotify_id ?? null };
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
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
    const currentDraft = context?.profileConfig?.draft || {};
    const currentPublished = context?.profileConfig?.published || {};
    context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: normalizeProfileConfig(preserveExpressionFields(event.detail?.draft, currentDraft), fallbackColor), published: normalizeProfileConfig(preserveExpressionFields(event.detail?.published, currentPublished), fallbackColor), updatedAt: event.detail?.updatedAt || context.profileConfig?.updatedAt, publishedAt: event.detail?.publishedAt || context.profileConfig?.publishedAt } };
    const savedLayout = normalizeProfileConfig(event.detail?.draft, fallbackColor).layoutVariant;
    if (event.detail?.layoutChanged && ['immersive', 'editorial', 'focus'].includes(savedLayout) && currentEquippedLayout) void clearPaidLayoutOverride();
  }

  async function clearPaidLayoutOverride() {
    const { data, error: rpcError } = await supabase.rpc('unequip_item', { p_slot: 'profile_layout' });
    if (rpcError || !data?.success) return;
    await refreshProfileState($session?.user?.id || null);
  }

  function updateExpression(event) {
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
    const fields = event.detail || {};
    context = { ...context, profileConfig: { ...(context.profileConfig || {}), draft: normalizeProfileConfig({ ...context.profileConfig?.draft, ...fields }, fallbackColor), published: normalizeProfileConfig({ ...context.profileConfig?.published, ...fields }, fallbackColor) } };
  }

  function updateAppearance(event) {
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
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

  function updateConfigurationPreview(event) {
    const nextConfig = event.detail?.config;
    if (!nextConfig) { configurationPreview = null; return; }
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
    configurationPreview = normalizeProfileConfig(nextConfig, fallbackColor);
  }

  function handleSocialChange() { void loadSettings(); }
  function updateIdentity(event) { context = { ...context, targetProfile: { ...context.targetProfile, bio: event.detail?.bio ?? null } }; }

  async function openPreview(event) {
    previewTrigger = event.currentTarget;
    if (!PreviewComponent) {
      const module = await import('./ProfileShell.svelte');
      PreviewComponent = module.default;
    }
    previewOpen = true;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => focusFirstElement(previewDialog));
  }

  function closePreview() {
    previewOpen = false;
    if (typeof document !== 'undefined') document.body.style.overflow = previousBodyOverflow;
    requestAnimationFrame(() => restoreFocus(previewTrigger));
  }

  function handlePreviewKeydown(event) {
    if (!previewOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closePreview(); return; }
    trapFocus(event, previewDialog);
  }

  function handleAccountDeleted(event) { dispatch('accountdeleted', event.detail); }
</script>

<svelte:window on:keydown={handlePreviewKeydown} />

<ProfileDashboardShell
  sections={[...SETTINGS_SECTIONS]}
  {activeSection}
  {profilePath}
  username={accountUsername}
  {logoutInProgress}
  on:sectionchange={handleDashboardSectionChange}
  on:navigate={forwardDashboardNavigation}
  on:logout={forwardDashboardLogout}
>
  <div class="profile-settings-page" aria-busy={loading}>
    {#if loading}
      <div class="profile-settings-page__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h1>Loading</h1></div>
    {:else if error}
      <div class="profile-settings-page__state" role="alert"><Surface variant="panel" padding="lg"><h1>{error}</h1><Button variant="secondary" href={profilePath}>Back to profile</Button></Surface></div>
    {:else if context}
      <header class="profile-settings-page__toolbar">
        <div><p class="profile-settings-page__breadcrumb">Dashboard <span aria-hidden="true">›</span> {activeLabel}</p><h1>{activeLabel}</h1></div>
        <div class="profile-settings-page__toolbar-actions"><a href={profilePath}>View profile ↗</a><button type="button" on:click={openPreview}>Live preview</button></div>
      </header>
      {#if context.dataWarning}<p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>{/if}

      <div class="profile-settings-page__content">
        {#if activeSection === 'customize'}
          <ProfileAppearanceEditor draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} updatedAt={context.profileConfig?.updatedAt} on:appearancechange={updateAppearance} on:configsaved={handleAppearanceSaved} />
        {:else if activeSection === 'account'}
          <ProfileAccountSettings on:accountdeleted={handleAccountDeleted} />
        {:else if sectionComponents[activeSection]}
          {#if activeSection === 'overview'}
            <svelte:component this={sectionComponents[activeSection]} profile={context.targetProfile} timelineEvents={context.timelineEvents} collectionItems={context.collectionItems} allAchievements={context.allAchievements} unlockedAchievements={context.unlockedAchievements} progression={context.progression} />
          {:else if activeSection === 'identity'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} bio={context.targetProfile?.bio || ''} on:identitysaved={updateIdentity} />
          {:else if activeSection === 'expression'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} config={context.profileConfig} fallbackInitial={(context.targetProfile?.username || '✦').slice(0, 1)} staff={Boolean(context.targetProfile?.is_staff)} on:expressionchange={updateExpression} />
          {:else if activeSection === 'collection'}
            <svelte:component this={sectionComponents[activeSection]} accountProfile={context.targetProfile} profileConfig={context.profileConfig} />
          {:else if activeSection === 'layout'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configpreview={updateConfigurationPreview} />
          {:else if activeSection === 'social'}
            <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} isOwnProfile={true} isAuthenticated={$isAuthenticated} social={context.social} settings={context.socialSettings} on:socialchange={handleSocialChange} />
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
</ProfileDashboardShell>

{#if previewOpen}
  <div class="profile-preview-drawer__backdrop" role="presentation" on:click|self={closePreview}>
    <div class="profile-preview-drawer" bind:this={previewDialog} role="dialog" aria-modal="true" aria-labelledby="profile-preview-title">
      <header class="profile-preview-drawer__header"><h2 id="profile-preview-title">Live preview</h2><button class="profile-preview-drawer__close" type="button" aria-label="Close live preview" on:click={closePreview}>×</button></header>
      <div class="profile-preview-drawer__body">
        {#if PreviewComponent}<svelte:component this={PreviewComponent} previewMode={true} previewProfile={context.targetProfile} previewProfileConfig={previewProfileConfig} />{/if}
      </div>
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
  .profile-preview-drawer__backdrop { position: fixed; inset: 0; z-index: 100; display: flex; justify-content: flex-end; background: rgba(0,0,0,.58); }
  .profile-preview-drawer { display: grid; grid-template-rows: auto minmax(0,1fr); width: min(46rem, 50vw); height: 100%; border-left: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); background: var(--site-deep, #090a0d); box-shadow: -1.5rem 0 4rem rgba(0,0,0,.34); }
  .profile-preview-drawer__header { display: flex; align-items: center; justify-content: space-between; min-height: 3.8rem; padding: .7rem 1rem; border-bottom: 1px solid var(--site-line, rgba(255,255,255,.08)); }
  .profile-preview-drawer__header h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .85rem; }
  .profile-preview-drawer__close { width: 2rem; height: 2rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: 1.2rem; cursor: pointer; }
  .profile-preview-drawer__body { min-height: 0; overflow: auto; }
  @media (max-width: 64rem) { .profile-preview-drawer { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { .profile-preview-drawer__backdrop { scroll-behavior: auto; } }
</style>
