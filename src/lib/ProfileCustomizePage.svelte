<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileConfig } from './profileConfig.js';
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

  function requestPremium() {
    dispatch('premiumrequest', { sectionId: 'premium' });
  }

  function normalizeDraft(value) {
    return normalizeProfileConfig(value || profileConfig?.draft || profileConfig?.published);
  }

  export function getDraftConfig() {
    const base = normalizeDraft();
    const appearance = appearanceEditor?.getDraftAppearance?.();
    const content = contentEditor?.getDraftConfig?.();
    const widgets = widgetEditor?.getDraftConfig?.();
    const layout = layoutEditor?.getDraftConfig?.();
    return normalizeProfileConfig({
      ...base,
      ...(layout || {}),
      appearance: appearance || base.appearance,
      content: content?.content || base.content,
      widgets: widgets?.widgets || base.widgets
    });
  }

  export function validateDraft() {
    return [appearanceEditor, contentEditor, widgetEditor, layoutEditor]
      .filter(Boolean)
      .every(editor => editor.validateDraft?.() !== false);
  }

  export function acceptSaved(nextConfig) {
    const next = normalizeDraft(nextConfig);
    appearanceEditor?.acceptSaved?.(next.appearance);
    contentEditor?.acceptSaved?.(next);
    widgetEditor?.acceptSaved?.(next);
    layoutEditor?.acceptSaved?.(next);
  }

  export function resetChanges() {
    appearanceEditor?.resetChanges?.();
    contentEditor?.resetChanges?.();
    widgetEditor?.resetChanges?.();
    layoutEditor?.resetChanges?.();
  }
</script>

<div class="profile-customize-page">
  <section class="profile-customize-page__surface profile-customize-page__surface--assets" aria-labelledby="profile-customize-media-title" data-editor-section="media">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-media-title">Profile media</h3>
    </div>

    {#if mediaComponent}
      <div class="profile-customize-page__editor profile-customize-page__editor--media">
        <svelte:component this={mediaComponent} profileId={profileId} config={profileConfig} fallbackInitial={(targetProfile?.username || accountUsername || '✦').slice(0, 1)} {staff} {entitlements} compact={true} on:expressionchange={forward} />
      </div>
    {:else}
      <div class="profile-customize-page__loading" role="status">Loading media controls…</div>
    {/if}
  </section>

  <button class="profile-customize-page__premium-banner" type="button" on:click={requestPremium}>
    <span class="profile-customize-page__premium-glyph" aria-hidden="true">◇</span>
    <span>Want more expression? Unlock more with <strong>Chromadie Plus</strong></span>
    <span class="profile-customize-page__premium-arrow" aria-hidden="true">↗</span>
  </button>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-general-title">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-general-title">General Customization</h3>
    </div>

    <div class="profile-customize-page__control-grid profile-customize-page__control-grid--general">
      <section class="profile-customize-page__control" aria-labelledby="profile-customize-identity-title" data-editor-section="identity" id="customize-identity">
        <div class="profile-customize-page__control-heading">
          <div><span class="profile-customize-page__control-kicker">Identity</span><h4 id="profile-customize-identity-title">Bio and presence</h4></div>
          <span aria-hidden="true">01</span>
        </div>
        {#if identityComponent}
          <svelte:component this={identityComponent} profileId={profileId} username={targetProfile?.username || accountUsername} bio={targetProfile?.bio || ''} config={profileConfig} on:identitysaved={forward} on:configsaved={forward} />
        {:else}
          <div class="profile-customize-page__loading" role="status">Loading identity controls…</div>
        {/if}
      </section>
    </div>
  </section>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-appearance-title" data-editor-section="appearance" id="customize-appearance">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-appearance-title">Color Customization</h3>
    </div>
    <div class="profile-customize-page__editor">
      <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={profileConfig?.draft} on:appearancechange={forward} on:dirty={forward} />
    </div>
  </section>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-other-title" data-editor-section="other" id="customize-other">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-other-title">Other Customization</h3>
    </div>

    <div class="profile-customize-page__control-grid">
      <section class="profile-customize-page__control" aria-labelledby="profile-customize-content-title" data-editor-section="content" id="customize-content">
        <div class="profile-customize-page__control-heading">
          <div><span class="profile-customize-page__control-kicker">Content</span><h4 id="profile-customize-content-title">About and projects</h4></div>
          <span aria-hidden="true">02</span>
        </div>
        {#if contentComponent}
          <svelte:component this={contentComponent} bind:this={contentEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
        {:else}
          <div class="profile-customize-page__loading" role="status">Loading content controls…</div>
        {/if}
      </section>

      <section class="profile-customize-page__control" aria-labelledby="profile-customize-widgets-title" data-editor-section="widgets" id="customize-widgets">
        <div class="profile-customize-page__control-heading">
          <div><span class="profile-customize-page__control-kicker">Connected services</span><h4 id="profile-customize-widgets-title">Provider widgets</h4></div>
          <span aria-hidden="true">03</span>
        </div>
        {#if widgetComponent}
          <svelte:component this={widgetComponent} bind:this={widgetEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
        {:else}
          <div class="profile-customize-page__loading" role="status">Loading widget controls…</div>
        {/if}
      </section>

      <section class="profile-customize-page__control" aria-labelledby="profile-customize-effects-title" data-editor-section="effects" id="customize-effects">
        <div class="profile-customize-page__control-heading">
          <div><span class="profile-customize-page__control-kicker">Collection</span><h4 id="profile-customize-effects-title">Effects and collection</h4></div>
          <span aria-hidden="true">04</span>
        </div>
        {#if collectionComponent}
          <svelte:component this={collectionComponent} accountProfile={targetProfile} {profileConfig} {entitlements} {staff} />
        {:else}
          <div class="profile-customize-page__loading" role="status">Loading effects controls…</div>
        {/if}
      </section>

      <section class="profile-customize-page__control" aria-labelledby="profile-customize-layout-title" data-editor-section="layout" id="customize-layout">
        <div class="profile-customize-page__control-heading">
          <div><span class="profile-customize-page__control-kicker">Composition</span><h4 id="profile-customize-layout-title">Layout and templates</h4></div>
          <span aria-hidden="true">05</span>
        </div>
        {#if layoutComponent}
          <svelte:component this={layoutComponent} bind:this={layoutEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} showLinks={false} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
        {:else}
          <div class="profile-customize-page__loading" role="status">Loading layout controls…</div>
        {/if}
      </section>
    </div>
  </section>
</div>

<style>
  .profile-customize-page {
    --customize-panel: #111111;
    --customize-inset: #0b0b0b;
    --customize-line: rgba(255, 255, 255, .075);
    --customize-line-strong: rgba(255, 255, 255, .14);
    --customize-muted: #929198;
    --customize-faint: #696870;
    --customize-purple: #b45ad6;
    display: grid;
    width: 100%;
    gap: .75rem;
    min-width: 0;
    padding-bottom: 1.5rem;
  }

  .profile-customize-page__control-kicker { display: none; }

  .profile-customize-page__surface { display: grid; gap: .7rem; min-width: 0; padding: .85rem; border: 1px solid var(--customize-line); border-radius: .68rem; background: var(--customize-panel); scroll-margin-top: 5rem; }
  .profile-customize-page__surface--assets { padding: 1rem; }
  .profile-customize-page__surface-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-width: 0; }
  .profile-customize-page__surface-heading h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1.05rem; letter-spacing: -.03em; }

  .profile-customize-page__premium-banner { position: relative; display: flex; align-items: center; justify-content: center; gap: .45rem; min-height: 3.1rem; overflow: hidden; padding: .65rem 3.2rem; border: 1px solid color-mix(in srgb, var(--customize-purple) 42%, var(--customize-line)); border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--customize-purple) 14%, #181019), color-mix(in srgb, var(--customize-purple) 7%, #181019)); color: #d6b1e5; font: 600 .72rem/1.35 var(--site-font, sans-serif); cursor: pointer; }
  .profile-customize-page__premium-banner::before, .profile-customize-page__premium-banner::after { position: absolute; color: color-mix(in srgb, var(--customize-purple) 24%, transparent); font-size: 4rem; line-height: 1; pointer-events: none; }
  .profile-customize-page__premium-banner::before { content: '◇'; left: 1.2rem; transform: rotate(-18deg); }
  .profile-customize-page__premium-banner::after { content: '✦'; right: 1.2rem; transform: rotate(18deg); }
  .profile-customize-page__premium-banner:hover, .profile-customize-page__premium-banner:focus-visible { border-color: color-mix(in srgb, var(--customize-purple) 72%, white); background: linear-gradient(90deg, color-mix(in srgb, var(--customize-purple) 19%, #181019), color-mix(in srgb, var(--customize-purple) 10%, #181019)); }
  .profile-customize-page__premium-banner:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 3px; }
  .profile-customize-page__premium-banner strong { color: #d27cf0; }
  .profile-customize-page__premium-glyph { color: #d27cf0; font-size: .9rem; }
  .profile-customize-page__premium-arrow { position: absolute; right: 1rem; color: #d27cf0; font-size: .95rem; }

  .profile-customize-page__control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; min-width: 0; }
  .profile-customize-page__control-grid--general { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page__control { display: block; min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; scroll-margin-top: 5rem; }
  .profile-customize-page__control-heading { display: none; }
  .profile-customize-page__control[data-editor-section="content"], .profile-customize-page__control[data-editor-section="layout"] { grid-column: 1 / -1; }
  .profile-customize-page__editor { min-width: 0; }
  .profile-customize-page__loading { display: grid; min-height: 7rem; place-items: center; color: var(--customize-muted); font-size: .82rem; }

  /* The embedded editors keep their domain contracts, but share the compact
   * shell here so the single-page workspace reads like one interface. */
  .profile-customize-page :global(.foundation-module) { width: 100%; min-width: 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
  .profile-customize-page :global(.foundation-module__header),
  .profile-customize-page :global(.profile-content-editor__header),
  .profile-customize-page :global(.profile-widget-editor__header),
  .profile-customize-page :global(.profile-editor__header),
  .profile-customize-page :global(.profile-cosmetics-heading) { display: none; }
  .profile-customize-page :global(.foundation-module__description) { display: none; }
  .profile-customize-page :global(.foundation-module__body) { padding: 0; }
  .profile-customize-page :global(.profile-expression-editor) { display: grid; gap: .65rem; }
  .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
  .profile-customize-page :global(.profile-expression-editor__compact-grid .rich-media-editor--compact),
  .profile-customize-page :global(.profile-expression-editor__compact-grid .rich-media-editor--compact > .foundation-module__body) { display: contents; }
  .profile-customize-page :global(.profile-expression-editor__compact-grid .rich-media-editor--compact .rich-media-editor__advanced) { grid-column: 1 / -1; order: 5; }
  .profile-customize-page :global(.profile-expression-editor__section) { padding-top: .9rem !important; border-top-color: var(--customize-line) !important; }
  .profile-customize-page :global(.profile-expression-editor__asset-library) { margin-top: .65rem; padding-top: .75rem; border-top-color: var(--customize-line); }
  .profile-customize-page :global(.profile-expression-editor__asset-grid) { max-width: none; }
  .profile-customize-page :global(.profile-expression-editor__button) { min-height: 2.25rem !important; border-radius: .35rem !important; font-size: .76rem !important; }
  .profile-customize-page :global(.profile-expression-editor__button--quiet) { border-color: var(--customize-line-strong) !important; background: transparent !important; color: var(--customize-muted) !important; }
  .profile-customize-page :global(.appearance-editor) { gap: .55rem; }
  .profile-customize-page :global(.appearance-editor__panel) { padding: .25rem 0 .55rem; border: 0; border-bottom: 1px solid var(--customize-line); border-radius: 0; background: transparent; }
  .profile-customize-page :global(.appearance-editor__heading) { margin-bottom: .5rem; }
  .profile-customize-page :global(.appearance-editor__heading h2) { font-size: .82rem; }
  .profile-customize-page :global(.appearance-editor__color-grid) { gap: .55rem .7rem; }
  .profile-customize-page :global(.appearance-editor__range-grid) { gap: .55rem .7rem; }
  .profile-customize-page :global(.appearance-editor__field > span),
  .profile-customize-page :global(.appearance-editor__range > span) { font-size: .75rem; }
  .profile-customize-page :global(.identity-editor .foundation-module__body) { display: block; }
  .profile-customize-page :global(.identity-editor .foundation-module__body > .identity-editor__form) { display: grid; gap: .65rem; }
  .profile-customize-page :global(.identity-editor__fields) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .65rem; }
  .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: span 2; }
  .profile-customize-page :global(.identity-editor__grid) { display: contents; }
  .profile-customize-page :global(.identity-editor__options) { display: flex; grid-column: span 2; align-self: end; align-items: center; min-height: 2.3rem; flex-wrap: wrap; gap: .65rem 1rem; padding-bottom: .1rem; color: var(--customize-muted); font-size: .76rem; }
  .profile-customize-page :global(.identity-editor__options label) { display: inline-flex; align-items: center; gap: .35rem; }
  .profile-customize-page :global(.identity-editor__field) { align-self: start; align-content: start; gap: .35rem; font-size: .78rem; }
  .profile-customize-page :global(.identity-editor__field textarea) { min-height: 4.5rem; }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select)) { min-height: 2.3rem; border-radius: .35rem; padding: .55rem .6rem; font-size: .82rem; }
  .profile-customize-page :global(.identity-editor__footer) { grid-column: 1 / -1; align-items: center; margin-top: .05rem; padding-top: .55rem; border-top: 1px solid var(--customize-line); }
  .profile-customize-page :global(.identity-editor__hint) { display: none; }
  .profile-customize-page :global(.identity-editor__save) { min-height: 2.25rem; padding-inline: .9rem; font-size: .78rem; }
  .profile-customize-page :global(.profile-content-editor),
  .profile-customize-page :global(.profile-widget-editor),
  .profile-customize-page :global(.profile-editor) { gap: .65rem; }
  .profile-customize-page :global(.profile-content-editor__panel),
  .profile-customize-page :global(.profile-widget-editor__panel),
  .profile-customize-page :global(.profile-editor__panel),
  .profile-customize-page :global(.profile-cosmetics-surface) { padding: .65rem 0; border: 0; border-top: 1px solid var(--customize-line); border-radius: 0; background: transparent; }
  .profile-customize-page :global(.profile-content-editor) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .profile-customize-page :global(.profile-content-editor__panel) { padding: .45rem 0; }
  .profile-customize-page :global(.profile-content-editor__panel:nth-of-type(2)) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-content-editor__panel-heading) { margin-bottom: .55rem; }
  .profile-customize-page :global(.profile-content-editor__fields) { gap: .55rem; }
  .profile-customize-page :global(.profile-content-editor__project) { gap: .55rem; padding: .65rem; }
  .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
  .profile-customize-page :global(.profile-content-editor__helper) { display: none; }
  .profile-customize-page :global(.profile-widget-editor) { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; }
  .profile-customize-page :global(.profile-widget-editor__list) { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
  .profile-customize-page :global(.profile-widget-editor__panel) { gap: .55rem; padding: .65rem; }
  .profile-customize-page :global(.profile-widget-editor__add) { grid-column: 1; }
  .profile-customize-page :global(.profile-widget-editor__note) { grid-column: 1 / -1; display: none; }
  .profile-customize-page :global(.profile-editor__panel) { gap: .6rem; padding: .5rem 0; }
  .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .profile-customize-page :global(.profile-cosmetics-layout) { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page :global(.profile-cosmetics-preview) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-plus-guide) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-controls) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem .75rem; padding: 0; border: 0; background: transparent; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading) { grid-column: 1 / -1; margin-top: .25rem; padding-top: .65rem; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading:first-child) { margin-top: 0; padding-top: 0; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading p) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-slot) { padding-top: .5rem; }
  .profile-customize-page :global(.profile-cosmetics-plus-guide) { grid-template-columns: 1fr; }
  .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  @media (max-width: 72rem) {
    .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .profile-customize-page :global(.identity-editor__fields) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 52rem) {
    .profile-customize-page__control-grid { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 38rem) {
    .profile-customize-page__surface, .profile-customize-page__surface--assets { padding: .8rem; }
    .profile-customize-page__surface-heading { align-items: flex-start; flex-direction: column; }
    .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.identity-editor__fields) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: auto; }
    .profile-customize-page :global(.identity-editor__options) { grid-column: auto; }
    .profile-customize-page :global(.profile-content-editor), .profile-customize-page :global(.profile-widget-editor) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-content-editor__panel:nth-of-type(2)), .profile-customize-page :global(.profile-widget-editor__list) { grid-column: auto; }
    .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields), .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-cosmetics-controls__heading) { grid-column: auto; }
    .profile-customize-page__premium-banner { min-height: 3.6rem; padding-inline: 2.5rem; text-align: center; }
    .profile-customize-page__premium-arrow { right: .65rem; }
    .profile-customize-page__control { padding: .75rem; }
    .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-customize-page :global(*) { scroll-behavior: auto; }
  }
</style>
