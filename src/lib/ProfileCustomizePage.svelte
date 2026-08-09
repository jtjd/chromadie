<script>
  import { createEventDispatcher } from 'svelte';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import ProfileAppearanceEditor from './ProfileAppearanceEditor.svelte';

  export let components = {};
  export let profileId = null;
  export let accountUsername = '';
  export let targetProfile = {};
  export let profileConfig = {};
  export let entitlements = [];
  export let staff = false;

  const dispatch = createEventDispatcher();
  const categories = Object.freeze([
    { id: 'assets', label: 'Assets', description: 'Avatar, backgrounds, banner, audio, and cursors.' },
    { id: 'identity', label: 'Identity', description: 'Name, bio, location, and profile entry.' },
    { id: 'appearance', label: 'Appearance', description: 'Colors, surface, gradient, and borders.' },
    { id: 'effects', label: 'Effects', description: 'Name, atmosphere, and earned cosmetics.' },
    { id: 'content', label: 'Content', description: 'About text and featured projects.' },
    { id: 'widgets', label: 'Widgets', description: 'Connected music and creator cards.' },
    { id: 'layout', label: 'Layout', description: 'Template and profile module arrangement.' }
  ]);

  let activeCategory = 'appearance';
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
  $: draft = profileConfig?.draft || profileConfig?.published || {};
  $: plusActive = Boolean(staff || hasChromadiePlus(entitlements));
  $: assetTiles = [
    { id: 'avatar', label: 'Avatar', icon: '◉', active: Boolean(draft.avatar_path), premium: false },
    { id: 'background', label: 'Background', icon: '▧', active: Boolean(draft.background_path || draft.background_video_path), premium: false },
    { id: 'banner', label: 'Banner', icon: '▬', active: Boolean(draft.banner_path), premium: true },
    { id: 'audio', label: 'Audio', icon: '♪', active: Boolean(draft.audio_path || draft.audio_playlist?.length), premium: true },
    { id: 'cursors', label: 'Cursors', icon: '↖', active: Boolean(draft.cursor_path || draft.pointer_cursor_path), premium: true }
  ];

  function forward(event) {
    dispatch(event.type, event.detail);
  }

  function selectCategory(categoryId, focusTab = false) {
    if (!categories.some(category => category.id === categoryId)) return;
    activeCategory = categoryId;
    if (focusTab && typeof document !== 'undefined') {
      requestAnimationFrame(() => document.getElementById(`profile-customize-tab-${categoryId}`)?.focus());
    }
  }

  function handleCategoryKeydown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? categories.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length;
    selectCategory(categories[nextIndex].id, true);
  }

  export function resetChanges() {
    appearanceEditor?.resetChanges?.();
    contentEditor?.resetChanges?.();
    widgetEditor?.resetChanges?.();
    layoutEditor?.resetChanges?.();
  }
</script>

<div class="profile-customize-page">
  <section class="profile-customize-page__assets" aria-labelledby="profile-assets-title">
    <div class="profile-customize-page__section-heading">
      <div><h2 id="profile-assets-title">Profile assets</h2><p>Open the media manager to upload, replace, or reuse an asset.</p></div>
      <button type="button" on:click={() => selectCategory('assets')}>Manage all</button>
    </div>
    <div class="profile-customize-page__asset-grid">
      {#each assetTiles as asset (asset.id)}
        <button type="button" class:active={asset.active} on:click={() => selectCategory('assets')} aria-label={`Manage ${asset.label.toLowerCase()}`}>
          <span class="profile-customize-page__asset-icon" aria-hidden="true">{asset.icon}</span>
          <span class="profile-customize-page__asset-copy"><strong>{asset.label}</strong><small>{asset.active ? 'Configured' : (asset.premium && !plusActive ? 'Plus' : 'Add asset')}</small></span>
          <span class="profile-customize-page__asset-state" class:locked={asset.premium && !plusActive} aria-hidden="true">{asset.active ? '●' : (asset.premium && !plusActive ? '◇' : '+')}</span>
        </button>
      {/each}
    </div>
  </section>

  {#if !plusActive}
    <section class="profile-customize-page__plus" aria-label="Chromadie Plus">
      <span aria-hidden="true">◇</span>
      <p><strong>More profile expression with Plus.</strong> Video, banners, audio, cursors, and expanded capacity.</p>
      <button type="button" on:click={() => dispatch('premiumrequest', { sectionId: 'premium' })}>View Plus</button>
    </section>
  {/if}

  <div class="profile-customize-page__tabs" aria-label="Customization categories" role="tablist">
    {#each categories as category, index (category.id)}
      <button
        id={`profile-customize-tab-${category.id}`}
        type="button"
        role="tab"
        aria-selected={activeCategory === category.id}
        aria-controls={`profile-customize-panel-${category.id}`}
        tabindex={activeCategory === category.id ? 0 : -1}
        class:active={activeCategory === category.id}
        on:click={() => selectCategory(category.id)}
        on:keydown={event => handleCategoryKeydown(event, index)}
      >{category.label}</button>
    {/each}
  </div>

  <div class="profile-customize-page__panels">
    <div id="profile-customize-panel-appearance" role="tabpanel" aria-labelledby="profile-customize-tab-appearance" tabindex="0" hidden={activeCategory !== 'appearance'}>
      <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} on:appearancechange={forward} on:dirty={forward} on:configsaved={forward} on:configreloaded={forward} />
    </div>

    <div id="profile-customize-panel-identity" role="tabpanel" aria-labelledby="profile-customize-tab-identity" tabindex="0" hidden={activeCategory !== 'identity'}>
      {#if identityComponent}
        <svelte:component this={identityComponent} profileId={profileId} username={targetProfile?.username || accountUsername} bio={targetProfile?.bio || ''} config={profileConfig} on:identitysaved={forward} on:configsaved={forward} />
      {/if}
    </div>

    <div id="profile-customize-panel-assets" role="tabpanel" aria-labelledby="profile-customize-tab-assets" tabindex="0" hidden={activeCategory !== 'assets'}>
      {#if mediaComponent}
        <svelte:component this={mediaComponent} profileId={profileId} config={profileConfig} fallbackInitial={(targetProfile?.username || '✦').slice(0, 1)} {staff} {entitlements} on:expressionchange={forward} />
      {/if}
    </div>

    <div id="profile-customize-panel-content" role="tabpanel" aria-labelledby="profile-customize-tab-content" tabindex="0" hidden={activeCategory !== 'content'}>
      {#if contentComponent}
        <svelte:component this={contentComponent} bind:this={contentEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {/if}
    </div>

    <div id="profile-customize-panel-widgets" role="tabpanel" aria-labelledby="profile-customize-tab-widgets" tabindex="0" hidden={activeCategory !== 'widgets'}>
      {#if widgetComponent}
        <svelte:component this={widgetComponent} bind:this={widgetEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {/if}
    </div>

    <div id="profile-customize-panel-effects" role="tabpanel" aria-labelledby="profile-customize-tab-effects" tabindex="0" hidden={activeCategory !== 'effects'}>
      {#if collectionComponent}
        <svelte:component this={collectionComponent} accountProfile={targetProfile} {profileConfig} {entitlements} {staff} />
      {/if}
    </div>

    <div id="profile-customize-panel-layout" role="tabpanel" aria-labelledby="profile-customize-tab-layout" tabindex="0" hidden={activeCategory !== 'layout'}>
      {#if layoutComponent}
        <svelte:component this={layoutComponent} bind:this={layoutEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} showLinks={false} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {/if}
    </div>
  </div>
</div>

<style>
  .profile-customize-page { display: grid; width: 100%; gap: 1rem; min-width: 0; }
  .profile-customize-page__assets { display: grid; gap: .9rem; padding: 1rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .65rem; background: var(--site-raised, #111319); }
  .profile-customize-page__section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
  .profile-customize-page__section-heading h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1rem; letter-spacing: -.025em; }
  .profile-customize-page__section-heading p { margin: .25rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .8rem; line-height: 1.4; }
  .profile-customize-page__section-heading button, .profile-customize-page__plus button { min-height: 2.4rem; padding: .55rem .8rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .4rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .78rem; cursor: pointer; }
  .profile-customize-page__asset-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .65rem; }
  .profile-customize-page__asset-grid > button { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .7rem; min-width: 0; min-height: 5.2rem; padding: .8rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .5rem; background: var(--site-deep, #090a0d); color: var(--site-muted, #aaa8b0); text-align: left; cursor: pointer; }
  .profile-customize-page__asset-grid > button:hover, .profile-customize-page__asset-grid > button:focus-visible, .profile-customize-page__asset-grid > button.active { border-color: color-mix(in srgb, var(--site-accent, #cdd2ff) 48%, var(--site-line)); color: var(--site-ink, #f2f0eb); }
  .profile-customize-page__asset-grid > button:focus-visible, .profile-customize-page__tabs button:focus-visible, .profile-customize-page__section-heading button:focus-visible, .profile-customize-page__plus button:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 2px; }
  .profile-customize-page__asset-icon { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: .4rem; background: color-mix(in srgb, var(--site-accent, #cdd2ff) 10%, transparent); color: var(--site-accent, #cdd2ff); font-size: 1rem; }
  .profile-customize-page__asset-copy { display: grid; gap: .2rem; min-width: 0; }
  .profile-customize-page__asset-copy strong { overflow: hidden; color: currentColor; font-size: .84rem; text-overflow: ellipsis; white-space: nowrap; }
  .profile-customize-page__asset-copy small { color: var(--site-faint, #7d7e87); font-size: .7rem; }
  .profile-customize-page__asset-state { color: #6de2a4; font-size: .7rem; }
  .profile-customize-page__asset-state.locked { color: var(--site-accent, #cdd2ff); font-size: .9rem; }
  .profile-customize-page__plus { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; border: 1px solid color-mix(in srgb, var(--site-accent, #cdd2ff) 34%, var(--site-line)); border-radius: .55rem; background: color-mix(in srgb, var(--site-accent, #cdd2ff) 9%, transparent); }
  .profile-customize-page__plus > span { color: var(--site-accent, #cdd2ff); font-size: 1.1rem; }
  .profile-customize-page__plus p { flex: 1; margin: 0; color: var(--site-muted, #aaa8b0); font-size: .78rem; line-height: 1.4; }
  .profile-customize-page__plus strong { color: var(--site-ink, #f2f0eb); }
  .profile-customize-page__tabs { position: sticky; top: 0; z-index: 8; display: flex; gap: .25rem; min-width: 0; overflow-x: auto; padding: .4rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: color-mix(in srgb, var(--site-raised, #111319) 94%, transparent); backdrop-filter: blur(14px); scrollbar-width: thin; }
  .profile-customize-page__tabs button { flex: 0 0 auto; min-height: 2.5rem; padding: .55rem .8rem; border: 1px solid transparent; border-radius: .4rem; background: transparent; color: var(--site-muted, #aaa8b0); font-size: .8rem; cursor: pointer; }
  .profile-customize-page__tabs button:hover, .profile-customize-page__tabs button.active { border-color: var(--site-line-strong, rgba(255,255,255,.14)); background: var(--site-surface-soft, rgba(255,255,255,.04)); color: var(--site-ink, #f2f0eb); }
  .profile-customize-page__panels, .profile-customize-page__panels > div { min-width: 0; }
  .profile-customize-page__panels > div[hidden] { display: none; }
  @media (max-width: 82rem) { .profile-customize-page__asset-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 48rem) {
    .profile-customize-page__asset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page__asset-grid > button { min-height: 4.5rem; }
    .profile-customize-page__plus { align-items: flex-start; flex-wrap: wrap; }
    .profile-customize-page__plus button { margin-left: 2.1rem; }
  }
  @media (max-width: 30rem) { .profile-customize-page__asset-grid { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) { .profile-customize-page__tabs { scroll-behavior: auto; } }
</style>
