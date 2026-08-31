<script>
  import { createEventDispatcher } from 'svelte';
  import Surface from './foundation/Surface.svelte';
  import { getProfileStudioSectionRegistration } from './profile-studio/sectionRegistry.js';

  export let activeSection = 'customize';
  export let activeCustomizeTab = 'appearance';
  /** @type {any} */
  export let context = null;
  /** @type {any} */
  export let editorProfileConfig = null;
  /** @type {any} */
  export let sectionComponents = {};
  export let sectionLoading = false;
  export let loading = false;
  export let error = '';
  export let profilePath = '/profile';
  export let accountUsername = '';
  export let entitlements = [];
  export let staff = false;
  export let isAuthenticated = false;
  export let featureFlags = {};
  /** @type {any} */
  export let studioIdentityDraft = null;
  /** @type {any} */
  export let cosmeticPreviewLoadout = null;

  const dispatch = createEventDispatcher();
  let customizePage = null;
  let layoutEditor = null;

  $: isCustomize = activeSection === 'customize';
  $: activeRegistration = getProfileStudioSectionRegistration(activeSection);

  function forward(event) {
    dispatch(event.type, event.detail);
  }

  function forwardStudioPatch(scope, event) {
    dispatch('studiopatch', { scope, detail: event.detail || {} });
  }

  function forwardDirty(source, event) {
    dispatch('dirty', { ...(event.detail || {}), source });
  }

  export function getDraftIdentity() {
    if (activeSection === 'customize') return customizePage?.getDraftIdentity?.() || null;
    return null;
  }

  export function validateDraft() {
    if (activeSection === 'customize') return customizePage?.validateDraft?.() !== false;
    if (activeSection === 'profile-layout') return layoutEditor?.validateDraft?.() !== false;
    return true;
  }

  export function acceptSaved(nextConfig) {
    customizePage?.acceptSaved?.(nextConfig);
    layoutEditor?.acceptSaved?.(nextConfig);
  }

  export function resetChanges(sectionId = activeSection) {
    if (sectionId === 'customize') customizePage?.resetChanges?.();
    if (sectionId === 'profile-layout') layoutEditor?.resetChanges?.();
  }
</script>

<div class="profile-studio-workspace" data-section-owner={activeRegistration?.owner || 'dashboard'} data-section-destination={activeRegistration?.destination || 'unknown'} aria-busy={loading}>
  {#if loading}
    <div class="profile-studio-workspace__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h1>Loading</h1></div>
  {:else if error}
    <div class="profile-studio-workspace__state" role="alert"><Surface variant="panel" padding="lg"><h1>{error}</h1><a class="profile-studio-workspace__back" href={profilePath}>Back to profile</a></Surface></div>
  {:else if context}
    <div class="profile-studio-workspace__content" id={isCustomize ? 'profile-customize-tabpanel' : undefined} role={isCustomize ? 'tabpanel' : undefined} aria-labelledby={isCustomize ? `profile-customize-tab-${activeCustomizeTab}` : undefined}>
      {#if isCustomize}
        {#if sectionComponents.customize}
          <svelte:component
            this={sectionComponents.customize}
            bind:this={customizePage}
            components={sectionComponents}
            profileId={context.profileId}
            accountUsername={accountUsername}
            targetProfile={context.targetProfile}
            profileConfig={editorProfileConfig}
            identityDraft={studioIdentityDraft}
            {cosmeticPreviewLoadout}
            activeTab={activeCustomizeTab}
            {entitlements}
            {staff}
            on:studiopatch={forward}
            on:cosmeticpreview={forward}
            on:dirty={forward}
            on:identitysaved={forward}
            on:configsaved={forward}
            on:configpublished={forward}
            on:configreloaded={forward}
          />
        {:else if sectionLoading}
          <div class="profile-studio-workspace__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading Customize</h2></div>
        {/if}
      {:else if activeSection === 'premium'}
        {#if sectionComponents.premium}
          <svelte:component this={sectionComponents.premium} {entitlements} {staff} />
        {:else if sectionLoading}
          <div class="profile-studio-workspace__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading Premium</h2></div>
        {/if}
      {:else if activeSection === 'account'}
        {#if sectionComponents.account}
          <svelte:component this={sectionComponents.account} on:accountdeleted={forward} />
        {:else if sectionLoading}
          <div class="profile-studio-workspace__state" role="status" aria-live="polite"><span aria-hidden="true">✦</span><h2>Loading Account</h2></div>
        {/if}
      {:else if sectionComponents[activeSection]}
        {#if activeSection === 'overview'}
          <svelte:component this={sectionComponents[activeSection]} profile={context.targetProfile} timelineEvents={context.timelineEvents} collectionItems={context.collectionItems} allAchievements={context.allAchievements} unlockedAchievements={context.unlockedAchievements} progression={context.progression} {featureFlags} />
        {:else if activeSection === 'profile-identity'}
          <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} bio={context.targetProfile?.bio || ''} config={editorProfileConfig} on:identitysaved={forward} on:configsaved={forward} />
        {:else if activeSection === 'profile-aliases'}
          <svelte:component this={sectionComponents[activeSection]} />
        {:else if activeSection === 'profile-media'}
          <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} config={editorProfileConfig} fallbackInitial={(context.targetProfile?.username || '✦').slice(0, 1)} {staff} {entitlements} on:expressionchange={event => forwardStudioPatch('media', event)} />
        {:else if activeSection === 'profile-collection'}
          <svelte:component this={sectionComponents[activeSection]} accountProfile={context.targetProfile} profileConfig={editorProfileConfig} {entitlements} {staff} />
        {:else if activeSection === 'profile-layout'}
          <svelte:component this={sectionComponents[activeSection]} bind:this={layoutEditor} profileId={context.profileId} draftConfig={editorProfileConfig?.draft} publishedConfig={editorProfileConfig?.published} updatedAt={context.profileConfig?.updatedAt} on:dirty={event => forwardDirty('profile-layout', event)} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={event => forwardStudioPatch('layout', event)} />
        {:else if activeSection === 'profile-social'}
          <svelte:component this={sectionComponents[activeSection]} profileId={context.profileId} username={context.targetProfile?.username || accountUsername} isOwnProfile={true} {isAuthenticated} social={context.social} settings={context.socialSettings} socialDepthEnabled={featureFlags.socialDepth} on:socialchange={forward} />
        {:else if activeSection === 'profile-insights'}
          <svelte:component this={sectionComponents[activeSection]} configuration={context.profileConfig} socialSettings={context.socialSettings} on:socialchange={forward} />
        {:else if activeSection === 'profile-notifications'}
          <svelte:component this={sectionComponents[activeSection]} />
        {/if}
      {:else if sectionLoading}
        <div class="profile-studio-workspace__state" role="status"><h2>Loading</h2></div>
      {:else}
        <div class="profile-studio-workspace__state" role="status"><h2>Section unavailable</h2></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .profile-studio-workspace { width: 100%; min-width: 0; }
  .profile-studio-workspace__content { width: 100%; min-width: 0; }
  .profile-studio-workspace__state { display: grid; min-height: 16rem; place-items: center; gap: .6rem; color: var(--studio-muted, #bac2de); }
  .profile-studio-workspace__state h1, .profile-studio-workspace__state h2 { margin: 0; color: var(--studio-text, #cdd6f4); font-size: 1.2rem; }
  .profile-studio-workspace__state :global(.surface) { max-width: 42rem; }
  .profile-studio-workspace__back { display: inline-flex; min-height: 2.25rem; align-items: center; justify-content: center; margin-top: .8rem; padding: .45rem .75rem; border: 1px solid var(--studio-border-strong, #45475a); border-radius: .35rem; color: var(--studio-text, #cdd6f4); font-size: .8rem; font-weight: 650; text-decoration: none; }
  .profile-studio-workspace__back:hover, .profile-studio-workspace__back:focus-visible { border-color: var(--studio-focus, #b4befe); color: var(--studio-focus, #b4befe); }
  @media (prefers-reduced-motion: reduce) { .profile-studio-workspace { scroll-behavior: auto; } }
</style>
