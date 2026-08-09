<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileAppearanceEditor from './ProfileAppearanceEditor.svelte';

  export let components = {};
  export let profileId = null;
  export let accountUsername = '';
  export let targetProfile = {};
  export let profileConfig = {};
  export let entitlements = [];
  export let staff = false;

  const dispatch = createEventDispatcher();
  let appearanceEditor = null;
  let contentEditor = null;
  let widgetEditor = null;
  let layoutEditor = null;

  $: identityComponent = components['profile-identity'];
  $: mediaComponent = components['profile-media'];
  $: contentComponent = components['profile-content'];
  $: widgetComponent = components['profile-widgets'];
  $: collectionComponent = components['profile-collection'];
  $: layoutComponent = components['profile-layout'];

  function forward(event) {
    dispatch(event.type, event.detail);
  }

  export function resetChanges() {
    appearanceEditor?.resetChanges?.();
    contentEditor?.resetChanges?.();
    widgetEditor?.resetChanges?.();
    layoutEditor?.resetChanges?.();
  }
</script>

<div class="profile-customize-page">
  <section class="profile-customize-page__intro" aria-labelledby="profile-customize-title">
    <div>
      <p class="profile-customize-page__eyebrow">Customize</p>
      <h2 id="profile-customize-title">Profile appearance</h2>
      <p>Identity, colors, media, content, widgets, and layout.</p>
    </div>
    <span class="profile-customize-page__count">Profile</span>
  </section>

  <div class="profile-customize-page__stack">
    <ProfileAppearanceEditor
      bind:this={appearanceEditor}
      draftConfig={profileConfig?.draft}
      publishedConfig={profileConfig?.published}
      updatedAt={profileConfig?.updatedAt}
      on:appearancechange={forward}
      on:dirty={forward}
      on:configsaved={forward}
      on:configreloaded={forward}
    />

    {#if identityComponent}
      <svelte:component
        this={identityComponent}
        profileId={profileId}
        username={targetProfile?.username || accountUsername}
        bio={targetProfile?.bio || ''}
        config={profileConfig}
        on:identitysaved={forward}
        on:configsaved={forward}
      />
    {/if}

    {#if mediaComponent}
      <svelte:component
        this={mediaComponent}
        profileId={profileId}
        config={profileConfig}
        fallbackInitial={(targetProfile?.username || '✦').slice(0, 1)}
        {staff}
        {entitlements}
        on:expressionchange={forward}
      />
    {/if}

    {#if contentComponent}
      <svelte:component
        this={contentComponent}
        bind:this={contentEditor}
        profileId={profileId}
        draftConfig={profileConfig?.draft}
        publishedConfig={profileConfig?.published}
        updatedAt={profileConfig?.updatedAt}
        {entitlements}
        {staff}
        on:dirty={forward}
        on:configsaved={forward}
        on:configpublished={forward}
        on:configreloaded={forward}
        on:configpreview={forward}
      />
    {/if}

    {#if widgetComponent}
      <svelte:component
        this={widgetComponent}
        bind:this={widgetEditor}
        profileId={profileId}
        draftConfig={profileConfig?.draft}
        publishedConfig={profileConfig?.published}
        updatedAt={profileConfig?.updatedAt}
        {entitlements}
        {staff}
        on:dirty={forward}
        on:configsaved={forward}
        on:configpublished={forward}
        on:configreloaded={forward}
        on:configpreview={forward}
      />
    {/if}

    {#if collectionComponent}
      <svelte:component
        this={collectionComponent}
        accountProfile={targetProfile}
        {profileConfig}
        {entitlements}
        {staff}
      />
    {/if}

    {#if layoutComponent}
      <svelte:component
        this={layoutComponent}
        bind:this={layoutEditor}
        profileId={profileId}
        draftConfig={profileConfig?.draft}
        publishedConfig={profileConfig?.published}
        updatedAt={profileConfig?.updatedAt}
        {entitlements}
        {staff}
        showLinks={false}
        on:dirty={forward}
        on:configsaved={forward}
        on:configpublished={forward}
        on:configreloaded={forward}
        on:configpreview={forward}
      />
    {/if}
  </div>
</div>

<style>
  .profile-customize-page { display: grid; width: 100%; gap: 1.35rem; min-width: 0; }
  .profile-customize-page__intro { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: 1.35rem 1.4rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .65rem; background: linear-gradient(120deg, color-mix(in srgb, var(--site-accent, #cdd2ff) 8%, var(--site-raised, #111319)), var(--site-raised, #111319)); }
  .profile-customize-page__eyebrow { margin: 0 0 .65rem; color: var(--site-faint, #7d7e87); font: .58rem/1 var(--site-mono, monospace); letter-spacing: .14em; text-transform: uppercase; }
  .profile-customize-page__intro h2 { max-width: 22ch; margin: 0; color: var(--site-ink, #f2f0eb); font-size: clamp(1.45rem, 2.7vw, 2.15rem); letter-spacing: -.045em; }
  .profile-customize-page__intro p:last-child { max-width: 40rem; margin: .55rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .82rem; line-height: 1.45; }
  .profile-customize-page__count { flex: 0 0 auto; color: var(--site-faint, #7d7e87); font: .6rem/1 var(--site-mono, monospace); letter-spacing: .1em; text-transform: uppercase; }
  .profile-customize-page__stack { display: flex; width: 100%; flex-direction: column; gap: 1rem; min-width: 0; }
  .profile-customize-page__stack :global(> *) { width: 100%; min-width: 0; box-sizing: border-box; }
  .profile-customize-page__stack :global(> section) { scroll-margin-top: 1rem; }
  @media (max-width: 48rem) {
    .profile-customize-page__intro { display: grid; gap: 1rem; }
    .profile-customize-page__count { justify-self: start; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-customize-page__stack :global(*) { scroll-behavior: auto; } }
</style>
