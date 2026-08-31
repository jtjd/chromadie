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
  <header class="profile-customize-page__header">
    <div>
      <p class="profile-customize-page__eyebrow">Profile Studio / Customize</p>
      <h2>Customize your profile.</h2>
      <p class="profile-customize-page__header-copy">Edit media, identity, appearance, content, widgets, and layout.</p>
    </div>
    <span class="profile-customize-page__state"><span aria-hidden="true"></span> Draft workspace</span>
  </header>

  <section class="profile-customize-page__section profile-customize-page__section--media" aria-labelledby="profile-customize-media-title" data-editor-section="media">
    <div class="profile-customize-page__section-heading">
      <div><p class="profile-customize-page__section-index">01 / Media</p><h3 id="profile-customize-media-title">Profile media</h3><p>Upload, replace, and choose the assets shown on your profile.</p></div>
    </div>
    {#if mediaComponent}
      <svelte:component this={mediaComponent} profileId={profileId} config={profileConfig} fallbackInitial={(targetProfile?.username || '✦').slice(0, 1)} {staff} {entitlements} on:expressionchange={forward} />
    {:else}
      <div class="profile-customize-page__loading" role="status">Loading media controls…</div>
    {/if}
  </section>

  <section class="profile-customize-page__section" aria-labelledby="profile-customize-identity-title" data-editor-section="identity">
    <div class="profile-customize-page__section-heading">
      <div><p class="profile-customize-page__section-index">02 / Identity</p><h3 id="profile-customize-identity-title">Identity</h3><p>Name, bio, location, and profile entry settings.</p></div>
    </div>
    {#if identityComponent}
      <svelte:component this={identityComponent} profileId={profileId} username={targetProfile?.username || accountUsername} bio={targetProfile?.bio || ''} config={profileConfig} on:identitysaved={forward} on:configsaved={forward} />
    {:else}
      <div class="profile-customize-page__loading" role="status">Loading identity controls…</div>
    {/if}
  </section>

  <section class="profile-customize-page__section" aria-labelledby="profile-customize-appearance-title" data-editor-section="appearance">
    <div class="profile-customize-page__section-heading">
      <div><p class="profile-customize-page__section-index">03 / Appearance</p><h3 id="profile-customize-appearance-title">Appearance</h3><p>Colors, surfaces, gradients, and borders.</p></div>
    </div>
    <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} on:appearancechange={forward} on:dirty={forward} on:configsaved={forward} on:configreloaded={forward} />
  </section>

  <div class="profile-customize-page__section-grid">
    <section class="profile-customize-page__section" aria-labelledby="profile-customize-content-title" data-editor-section="content">
      <div class="profile-customize-page__section-heading">
        <div><p class="profile-customize-page__section-index">04 / Content</p><h3 id="profile-customize-content-title">About and projects</h3></div>
      </div>
      {#if contentComponent}
        <svelte:component this={contentComponent} bind:this={contentEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading content controls…</div>
      {/if}
    </section>

    <section class="profile-customize-page__section" aria-labelledby="profile-customize-widgets-title" data-editor-section="widgets">
      <div class="profile-customize-page__section-heading">
        <div><p class="profile-customize-page__section-index">05 / Widgets</p><h3 id="profile-customize-widgets-title">Connected services</h3></div>
      </div>
      {#if widgetComponent}
        <svelte:component this={widgetComponent} bind:this={widgetEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading widget controls…</div>
      {/if}
    </section>
  </div>

  <div class="profile-customize-page__section-grid">
    <section class="profile-customize-page__section" aria-labelledby="profile-customize-effects-title" data-editor-section="effects">
      <div class="profile-customize-page__section-heading">
        <div><p class="profile-customize-page__section-index">06 / Effects and collection</p><h3 id="profile-customize-effects-title">Effects and collection</h3></div>
      </div>
      {#if collectionComponent}
        <svelte:component this={collectionComponent} accountProfile={targetProfile} {profileConfig} {entitlements} {staff} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading effects controls…</div>
      {/if}
    </section>

    <section class="profile-customize-page__section" aria-labelledby="profile-customize-layout-title" data-editor-section="layout">
      <div class="profile-customize-page__section-heading">
        <div><p class="profile-customize-page__section-index">07 / Layout</p><h3 id="profile-customize-layout-title">Layout</h3></div>
      </div>
      {#if layoutComponent}
        <svelte:component this={layoutComponent} bind:this={layoutEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} showLinks={false} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading layout controls…</div>
      {/if}
    </section>
  </div>
</div>

<style>
  .profile-customize-page { display: grid; width: 100%; gap: 1.15rem; min-width: 0; }
  .profile-customize-page__header { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: 1rem 0 .35rem; }
  .profile-customize-page__eyebrow, .profile-customize-page__section-index { margin: 0 0 .5rem; color: var(--site-faint, #7d7e87); font: .64rem/1 var(--site-mono, monospace); letter-spacing: .13em; text-transform: uppercase; }
  .profile-customize-page__header h2 { max-width: 26ch; margin: 0; color: var(--site-ink, #f2f0eb); font-size: clamp(1.65rem, 3.1vw, 2.65rem); letter-spacing: -.055em; }
  .profile-customize-page__header-copy { max-width: 42rem; margin: .5rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .88rem; line-height: 1.45; }
  .profile-customize-page__state { display: inline-flex; align-items: center; gap: .45rem; flex: 0 0 auto; color: var(--site-muted, #aaa8b0); font: .68rem/1 var(--site-mono, monospace); }
  .profile-customize-page__state span { width: .45rem; height: .45rem; border-radius: 50%; background: #6de2a4; box-shadow: 0 0 .8rem rgba(109,226,164,.52); }
  .profile-customize-page__section { display: grid; gap: .8rem; min-width: 0; padding: 1rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .65rem; background: var(--site-raised, #111319); }
  .profile-customize-page__section--media { padding: 1.1rem; }
  .profile-customize-page__section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
  .profile-customize-page__section-heading h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1.1rem; letter-spacing: -.025em; }
  .profile-customize-page__section-heading p:last-child { margin: .3rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .78rem; line-height: 1.4; }
  .profile-customize-page__section-index { margin-bottom: .35rem; font-size: .58rem; }
  .profile-customize-page__section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.15rem; min-width: 0; }
  .profile-customize-page__loading { display: grid; min-height: 8rem; place-items: center; color: var(--site-muted, #aaa8b0); font-size: .8rem; }
  .profile-customize-page__section :global(.foundation-module) { width: 100%; min-width: 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
  .profile-customize-page__section :global(.foundation-module__header) { display: none; }
  .profile-customize-page__section :global(.foundation-module__description) { display: none; }
  .profile-customize-page__section :global(.appearance-editor__actions),
  .profile-customize-page__section :global(.profile-content-editor__actions),
  .profile-customize-page__section :global(.profile-widget-editor__actions),
  .profile-customize-page__section :global(.profile-editor__actions) {
    position: static;
    box-shadow: none;
    backdrop-filter: none;
  }
  @media (max-width: 64rem) {
    .profile-customize-page__section-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 48rem) {
    .profile-customize-page__header { align-items: start; flex-direction: column; }
    .profile-customize-page__header h2 { font-size: 1.8rem; }
    .profile-customize-page__section, .profile-customize-page__section--media { padding: .8rem; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-customize-page :global(*) { scroll-behavior: auto; } }
</style>
