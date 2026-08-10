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
      <div>
        <h3 id="profile-customize-media-title">Profile media</h3>
        <p class="profile-customize-page__surface-note">Shape the profile canvas with media visitors can explore.</p>
      </div>
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

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-general-title" data-editor-section="general">
    <div class="profile-customize-page__surface-heading">
      <div>
        <h3 id="profile-customize-general-title">General Customization</h3>
        <p class="profile-customize-page__surface-note">Set your bio and choose the identity details visitors can see.</p>
      </div>
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
      <div>
        <h3 id="profile-customize-appearance-title">Color Customization</h3>
        <p class="profile-customize-page__surface-note">Preview your palette here; publish the profile when it is ready.</p>
      </div>
    </div>
    <div class="profile-customize-page__editor">
      <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={profileConfig?.draft} on:appearancechange={forward} on:dirty={forward} />
    </div>
  </section>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-effects-title" data-editor-section="effects" id="customize-effects">
    <div class="profile-customize-page__surface-heading">
      <div>
        <h3 id="profile-customize-effects-title">Effects Customization</h3>
        <p class="profile-customize-page__surface-note">Preview owned expression layers, then apply the look you want to keep.</p>
      </div>
    </div>
    <div class="profile-customize-page__editor">
      {#if collectionComponent}
        <svelte:component this={collectionComponent} accountProfile={targetProfile} {profileConfig} {entitlements} {staff} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading effects controls…</div>
      {/if}
    </div>
  </section>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-templates-title" data-editor-section="layout" id="customize-layout">
    <div class="profile-customize-page__surface-heading">
      <div>
        <h3 id="profile-customize-templates-title">Templates</h3>
        <p class="profile-customize-page__surface-note">Choose the profile structure visitors will see; changes stay staged until publish.</p>
      </div>
    </div>
    <div class="profile-customize-page__editor">
      {#if layoutComponent}
        <svelte:component this={layoutComponent} bind:this={layoutEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} showLinks={false} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading template controls…</div>
      {/if}
    </div>
  </section>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-other-title" data-editor-section="other" id="customize-other">
    <div class="profile-customize-page__surface-heading">
      <div>
        <h3 id="profile-customize-other-title">Other Customization</h3>
        <p class="profile-customize-page__surface-note">Tell more of your story with a short bio or projects; projects need a title and HTTPS URL.</p>
      </div>
    </div>

    <div class="profile-customize-page__control-grid profile-customize-page__control-grid--other">
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

    </div>
  </section>

  <section class="profile-customize-page__surface" aria-labelledby="profile-customize-widgets-title" data-editor-section="widgets" id="customize-widgets">
    <div class="profile-customize-page__surface-heading">
      <div>
        <h3 id="profile-customize-widgets-title">Provider Widgets</h3>
        <p class="profile-customize-page__surface-note">Use official HTTPS provider URLs only; arbitrary embeds and scripts are never accepted.</p>
      </div>
    </div>
    <div class="profile-customize-page__editor">
      {#if widgetComponent}
        <svelte:component this={widgetComponent} bind:this={widgetEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading widget controls…</div>
      {/if}
    </div>
  </section>

</div>

<style>
  .profile-customize-page {
    --customize-surface: var(--ctp-base, #1e1e2e);
    --customize-surface-raised: var(--ctp-surface0, #313244);
    --customize-surface-inset: var(--ctp-mantle, #181825);
    --customize-text-primary: var(--ctp-text, #cdd6f4);
    --customize-text-secondary: var(--ctp-subtext1, #bac2de);
    --customize-text-muted: var(--ctp-subtext0, #a6adc8);
    --customize-text-faint: var(--ctp-overlay1, #7f849c);
    --customize-border: color-mix(in srgb, var(--ctp-overlay0, #6c7086) 48%, transparent);
    --customize-border-strong: color-mix(in srgb, var(--ctp-overlay1, #7f849c) 70%, transparent);
    --customize-focus: var(--ctp-lavender, #b4befe);
    --customize-accent-primary: var(--ctp-teal, #94e2d5);
    --customize-accent-secondary: var(--ctp-sky, #89dceb);
    --customize-accent-add: var(--ctp-peach, #fab387);
    --customize-accent-save: var(--ctp-green, #a6e3a1);
    --customize-accent-danger: var(--ctp-red, #f38ba8);
    --customize-accent-premium: var(--ctp-mauve, #cba6f7);
    --customize-font-body: var(--font-body-stack, var(--site-font, sans-serif));
    --customize-font-mono: var(--font-mono-stack, ui-monospace, SFMono-Regular, Menlo, monospace);
    --customize-section-heading-size: 1rem;
    --customize-subheading-size: .88rem;
    --customize-label-size: .75rem;
    --customize-control-size: .82rem;
    --customize-secondary-height: 2.1rem;
    --customize-primary-height: 2.35rem;
    --customize-radius: .35rem;
    --customize-panel: var(--customize-surface-raised);
    --customize-section-input: var(--customize-surface-raised);
    --customize-inset: var(--customize-surface-inset);
    --customize-line: var(--customize-border);
    --customize-line-strong: var(--customize-border-strong);
    --customize-muted: var(--customize-text-muted);
    --customize-faint: var(--customize-text-faint);
    display: grid;
    width: 100%;
    gap: .75rem;
    min-width: 0;
    padding-bottom: 1.5rem;
    color: var(--customize-text-primary);
    font-family: var(--customize-font-body);
  }

  .profile-customize-page__control-kicker { display: none; }

  .profile-customize-page__surface { --customize-section-accent: var(--ctp-overlay2, #9399b2); --customize-section-surface: var(--customize-surface); --customize-section-input: color-mix(in srgb, var(--customize-surface-raised) 62%, var(--customize-section-surface)); --customize-section-input-line: color-mix(in srgb, var(--ctp-surface2, #585b70) 58%, var(--customize-section-surface)); display: grid; gap: .7rem; min-width: 0; padding: .85rem; border: 1px solid color-mix(in srgb, var(--customize-section-accent) 30%, var(--customize-border)); border-radius: .68rem; background: var(--customize-section-surface); scroll-margin-top: 5rem; }
  .profile-customize-page__surface[data-editor-section="media"] { --customize-section-accent: var(--ctp-sapphire, #74c7ec); --customize-section-surface: var(--ctp-base, #1e1e2e); }
  .profile-customize-page__surface[data-editor-section="general"] { --customize-section-accent: var(--ctp-teal, #94e2d5); --customize-section-surface: var(--ctp-mantle, #181825); }
  .profile-customize-page__surface[data-editor-section="appearance"] { --customize-section-accent: var(--ctp-yellow, #f9e2af); --customize-section-surface: var(--ctp-base, #1e1e2e); }
  .profile-customize-page__surface[data-editor-section="other"] { --customize-section-accent: var(--ctp-peach, #fab387); --customize-section-surface: var(--ctp-base, #1e1e2e); }
  .profile-customize-page__surface[data-editor-section="widgets"] { --customize-section-accent: var(--ctp-green, #a6e3a1); --customize-section-surface: var(--ctp-mantle, #181825); }
  .profile-customize-page__surface[data-editor-section="effects"] { --customize-section-accent: var(--ctp-mauve, #cba6f7); --customize-section-surface: var(--ctp-base, #1e1e2e); }
  .profile-customize-page__surface[data-editor-section="layout"] { --customize-section-accent: var(--ctp-pink, #f5c2e7); --customize-section-surface: var(--ctp-mantle, #181825); }
  .profile-customize-page__surface--assets { padding: 1rem; }
  .profile-customize-page__surface-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; min-width: 0; flex-wrap: wrap; }
  .profile-customize-page__surface-heading h3 { margin: 0; color: color-mix(in srgb, var(--customize-section-accent) 76%, var(--customize-text-primary)); font-size: var(--customize-section-heading-size); line-height: 1.2; letter-spacing: -.03em; }
  .profile-customize-page__surface-note { max-width: 52rem; margin: .25rem 0 0; color: var(--customize-text-muted); font-size: var(--customize-label-size); line-height: 1.4; }

  .profile-customize-page__premium-banner { position: relative; display: flex; align-items: center; justify-content: center; gap: .45rem; min-height: 3.1rem; overflow: hidden; padding: .65rem 3.2rem; border: 1px solid color-mix(in srgb, var(--customize-accent-premium) 42%, var(--customize-border)); border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--customize-accent-premium) 14%, var(--customize-surface-inset)), color-mix(in srgb, var(--customize-accent-premium) 7%, var(--customize-surface-inset))); color: var(--customize-focus); font: 600 .72rem/1.35 var(--customize-font-body); cursor: pointer; }
  .profile-customize-page__premium-banner::before, .profile-customize-page__premium-banner::after { position: absolute; color: color-mix(in srgb, var(--customize-accent-premium) 24%, transparent); font-size: 4rem; line-height: 1; pointer-events: none; }
  .profile-customize-page__premium-banner::before { content: '◇'; left: 1.2rem; transform: rotate(-18deg); }
  .profile-customize-page__premium-banner::after { content: '✦'; right: 1.2rem; transform: rotate(18deg); }
  .profile-customize-page__premium-banner:hover, .profile-customize-page__premium-banner:focus-visible { border-color: color-mix(in srgb, var(--customize-accent-premium) 72%, var(--customize-text-primary)); background: linear-gradient(90deg, color-mix(in srgb, var(--customize-accent-premium) 19%, var(--customize-surface-inset)), color-mix(in srgb, var(--customize-accent-premium) 10%, var(--customize-surface-inset))); }
  .profile-customize-page__premium-banner:focus-visible { outline: 2px solid var(--customize-focus); outline-offset: 3px; }
  .profile-customize-page__premium-banner strong { color: var(--customize-accent-premium); }
  .profile-customize-page__premium-glyph { color: var(--customize-accent-premium); font-size: .9rem; }
  .profile-customize-page__premium-arrow { position: absolute; right: 1rem; color: var(--customize-accent-premium); font-size: .95rem; }

  .profile-customize-page__control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; min-width: 0; }
  .profile-customize-page__control-grid--general { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page__control-grid--other { align-items: start; gap: .55rem .7rem; }
  .profile-customize-page__control { display: block; min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; scroll-margin-top: 5rem; }
  .profile-customize-page__control-heading { display: none; }
  .profile-customize-page__control[data-editor-section="content"] { grid-column: 1 / -1; }
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
  .profile-customize-page :global(.appearance-editor__color-grid) { gap: .55rem .7rem; }
  .profile-customize-page :global(.appearance-editor__range-grid) { gap: .55rem .7rem; }
  .profile-customize-page :global(.appearance-editor__heading h2),
  .profile-customize-page :global(.profile-content-editor__panel-heading h3),
  .profile-customize-page :global(.profile-widget-editor__panel-heading strong),
  .profile-customize-page :global(.profile-editor__panel h3),
  .profile-customize-page :global(.profile-cosmetics-controls__heading strong) { color: var(--customize-text-primary); font-size: var(--customize-subheading-size); line-height: 1.25; }
  .profile-customize-page :global(.appearance-editor__field > span),
  .profile-customize-page :global(.appearance-editor__range > span),
  .profile-customize-page :global(.profile-content-editor__fields label > span),
  .profile-customize-page :global(.profile-content-editor__switch),
  .profile-customize-page :global(.profile-widget-editor__panel label > span),
  .profile-customize-page :global(.profile-widget-editor__panel-heading label),
  .profile-customize-page :global(.profile-editor__field),
  .profile-customize-page :global(.profile-editor__link-style label),
  .profile-customize-page :global(.profile-editor__metadata label),
  .profile-customize-page :global(.profile-cosmetics-slot label) { color: var(--customize-text-secondary); font-size: var(--customize-label-size); }
  .profile-customize-page :global(.appearance-editor__heading > span),
  .profile-customize-page :global(.appearance-editor__range output),
  .profile-customize-page :global(.profile-content-editor__fields output),
  .profile-customize-page :global(.profile-editor__version),
  .profile-customize-page :global(.profile-editor__panel-heading > span),
  .profile-customize-page :global(.profile-widget-editor__version) { color: var(--customize-text-faint); font-family: var(--customize-font-mono); }
  .profile-customize-page :global(.identity-editor .foundation-module__body) { display: block; }
  .profile-customize-page :global(.identity-editor .foundation-module__body > .identity-editor__form) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: .65rem; row-gap: .4rem; }
  .profile-customize-page :global(.identity-editor__fields) { display: contents; }
  .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: 1 / span 2; grid-row: 1 / span 2; align-self: stretch; align-content: stretch; grid-template-rows: auto minmax(0, 1fr) auto; }
  .profile-customize-page :global(.identity-editor__field[for="profile-bio"] textarea) { height: 100%; min-height: 0; }
  .profile-customize-page :global(.identity-editor__grid) { display: contents; }
  .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field:first-child) { grid-column: 3; grid-row: 1; }
  .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field:last-child) { grid-column: 4; grid-row: 1; }
  .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field:first-child) { grid-column: 3; grid-row: 2; }
  .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field:last-child) { grid-column: 4; grid-row: 2; }
  .profile-customize-page :global(.identity-editor__options) { display: flex; grid-column: 1 / span 2; grid-row: 3; align-self: start; align-items: center; min-height: 2.3rem; flex-wrap: wrap; gap: .65rem 1rem; padding-bottom: .1rem; color: var(--customize-muted); font-size: .76rem; }
  .profile-customize-page :global(.identity-editor__options label) { display: inline-flex; align-items: center; gap: .35rem; }
  .profile-customize-page :global(.identity-editor__field) { align-self: start; align-content: start; gap: .35rem; font-size: .78rem; }
  .profile-customize-page :global(.identity-editor__field textarea) { min-height: 4.5rem; }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select)) { min-height: 2.3rem; border-radius: .35rem; padding: .55rem .6rem; font-size: .82rem; }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select)),
  .profile-customize-page :global(.profile-editor :is(input[type="text"], input[type="url"], input[type="email"], input[type="search"], input[type="number"], textarea, select)),
  .profile-customize-page :global(.appearance-editor__color-input),
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input, select)),
  .profile-customize-page :global(.profile-cosmetics-slot select) { border-color: var(--customize-section-input-line) !important; background: var(--customize-section-input) !important; color: var(--customize-text-primary) !important; font-size: var(--customize-control-size); }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select)),
  .profile-customize-page :global(.profile-editor :is(input[type="text"], input[type="url"], input[type="email"], input[type="search"], input[type="number"], textarea, select)),
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input, select)),
  .profile-customize-page :global(.profile-cosmetics-slot select) { min-height: var(--customize-primary-height); font-family: var(--customize-font-body); }
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input, select)) { padding: .5rem .65rem; font: 500 var(--customize-control-size) / 1.35 var(--customize-font-body); }
  .profile-customize-page :global(.profile-cosmetics-slot select) { padding-inline: .65rem; font: 500 var(--customize-control-size) / 1 var(--customize-font-body); }
  .profile-customize-page :global(.appearance-editor__range input),
  .profile-customize-page :global(.profile-editor__link-style input[type="range"]) { accent-color: var(--customize-accent-secondary); }
  .profile-customize-page :global(input[type="checkbox"]),
  .profile-customize-page :global(input[type="radio"]) { accent-color: var(--customize-accent-primary); }
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea):focus),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input, select):focus),
  .profile-customize-page :global(.profile-cosmetics-slot select:focus-visible),
  .profile-customize-page :global(.profile-editor :is(input, textarea, select):focus-visible),
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select):focus-visible) { border-color: var(--customize-focus) !important; box-shadow: 0 0 0 2px color-mix(in srgb, var(--customize-focus) 24%, transparent); }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea)::placeholder),
  .profile-customize-page :global(.profile-editor :is(input, textarea)::placeholder),
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)::placeholder),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input)::placeholder) { color: var(--customize-text-faint); }
  .profile-customize-page :global(.identity-editor__footer) { grid-column: 3 / -1; grid-row: 3; align-items: center; justify-content: flex-end; align-self: end; margin-top: 0; padding-top: 0; border-top: 0; }
  .profile-customize-page :global(.identity-editor__hint) { display: none; }
  .profile-customize-page :global(.identity-editor__save),
  .profile-customize-page :global(.profile-cosmetics-apply) { min-height: var(--customize-primary-height); border: 1px solid var(--customize-accent-save) !important; border-radius: var(--customize-radius); background: var(--customize-accent-save) !important; color: var(--customize-surface-inset) !important; font: 700 var(--customize-label-size) / 1 var(--customize-font-body); }
  .profile-customize-page :global(.identity-editor__save:hover:not(:disabled)),
  .profile-customize-page :global(.profile-cosmetics-apply:hover:not(:disabled)) { background: color-mix(in srgb, var(--customize-accent-save) 82%, var(--customize-text-primary)) !important; }
  .profile-customize-page :global(.profile-content-editor__text-button),
  .profile-customize-page :global(.profile-content-editor__remove),
  .profile-customize-page :global(.profile-widget-editor__add),
  .profile-customize-page :global(.profile-widget-editor__remove),
  .profile-customize-page :global(.profile-editor__text-button),
  .profile-customize-page :global(.profile-editor__remove),
  .profile-customize-page :global(.profile-editor__module-actions button),
  .profile-customize-page :global(.profile-editor__module-actions select),
  .profile-customize-page :global(.profile-expression-editor__button) { min-height: var(--customize-secondary-height) !important; border-radius: var(--customize-radius) !important; border-color: var(--customize-border-strong) !important; background: transparent !important; color: var(--customize-text-secondary) !important; font: 600 var(--customize-label-size) / 1 var(--customize-font-body) !important; }
  .profile-customize-page :global(.profile-content-editor__text-button:hover:not(:disabled)),
  .profile-customize-page :global(.profile-content-editor__remove:hover),
  .profile-customize-page :global(.profile-widget-editor__add:hover:not(:disabled)),
  .profile-customize-page :global(.profile-widget-editor__remove:hover),
  .profile-customize-page :global(.profile-editor__text-button:hover:not(:disabled)),
  .profile-customize-page :global(.profile-editor__remove:hover),
  .profile-customize-page :global(.profile-editor__module-actions button:hover:not(:disabled)),
  .profile-customize-page :global(.profile-editor__module-actions select:hover:not(:disabled)),
  .profile-customize-page :global(.profile-expression-editor__button:hover:not(:disabled)) { border-color: var(--customize-accent-secondary) !important; background: color-mix(in srgb, var(--customize-accent-secondary) 9%, transparent) !important; color: var(--customize-text-primary) !important; }
  .profile-customize-page :global(.profile-content-editor__text-button),
  .profile-customize-page :global(.profile-widget-editor__add) { border-color: color-mix(in srgb, var(--customize-accent-add) 62%, var(--customize-border-strong)) !important; color: var(--customize-accent-add) !important; }
  .profile-customize-page :global(.profile-content-editor__text-button:hover:not(:disabled)),
  .profile-customize-page :global(.profile-widget-editor__add:hover:not(:disabled)) { border-color: var(--customize-accent-add) !important; background: color-mix(in srgb, var(--customize-accent-add) 10%, transparent) !important; }
  .profile-customize-page :global(.profile-content-editor__remove:hover),
  .profile-customize-page :global(.profile-widget-editor__remove:hover),
  .profile-customize-page :global(.profile-editor__remove:hover) { border-color: var(--customize-accent-danger) !important; background: color-mix(in srgb, var(--customize-accent-danger) 9%, transparent) !important; color: var(--customize-accent-danger) !important; }
  .profile-customize-page :global(.profile-content-editor__text-button:disabled),
  .profile-customize-page :global(.profile-widget-editor__add:disabled),
  .profile-customize-page :global(.profile-cosmetics-apply:disabled),
  .profile-customize-page :global(.identity-editor__save:disabled) { cursor: not-allowed; opacity: .45; }
  .profile-customize-page :global(.identity-editor__save:focus-visible),
  .profile-customize-page :global(.profile-cosmetics-apply:focus-visible) { outline: 2px solid var(--customize-focus); outline-offset: 2px; }
  .profile-customize-page :global(.profile-content-editor),
  .profile-customize-page :global(.profile-widget-editor),
  .profile-customize-page :global(.profile-editor) { gap: .65rem; }
  .profile-customize-page :global(.profile-content-editor__panel),
  .profile-customize-page :global(.profile-widget-editor__panel),
  .profile-customize-page :global(.profile-editor__panel),
  .profile-customize-page :global(.profile-cosmetics-surface) { padding: .65rem 0; border: 0; border-top: 1px solid var(--customize-line); border-radius: 0; background: transparent; }
  .profile-customize-page :global(.profile-content-editor) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .profile-customize-page :global(.profile-content-editor__panel) { padding: .45rem 0; }
  .profile-customize-page :global(.profile-content-editor__panel:first-of-type) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-content-editor__panel:nth-of-type(2)) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-content-editor__panel-heading) { margin-bottom: .55rem; }
  .profile-customize-page :global(.profile-content-editor__fields) { gap: .55rem; }
  .profile-customize-page :global(.profile-content-editor__panel:first-of-type .profile-content-editor__fields) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
  .profile-customize-page :global(.profile-content-editor__project) { gap: .55rem; padding: .65rem; }
  .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
  .profile-customize-page :global(.profile-content-editor__helper),
  .profile-customize-page :global(.profile-content-editor__hint),
  .profile-customize-page :global(.profile-widget-editor__hint),
  .profile-customize-page :global(.profile-editor__hint) { display: none; }
  .profile-customize-page :global(.profile-widget-editor) { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; }
  .profile-customize-page :global(.profile-widget-editor__list) { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
  .profile-customize-page :global(.profile-widget-editor__panel) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; padding: .55rem; }
  .profile-customize-page :global(.profile-widget-editor__panel-heading),
  .profile-customize-page :global(.profile-widget-editor__helper),
  .profile-customize-page :global(.profile-widget-editor__remove) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-widget-editor__add) { grid-column: 1; }
  .profile-customize-page :global(.profile-widget-editor__note) { grid-column: 1 / -1; display: none; }
  .profile-customize-page :global(.profile-editor__panel) { gap: .6rem; padding: .5rem 0; }
  .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .profile-customize-page :global(.profile-cosmetics-layout) { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page :global(.profile-cosmetics-preview) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-plus-guide) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-controls) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem .65rem; padding: .25rem 0 0; border: 0; background: transparent; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading) { grid-column: 1 / -1; margin-top: .25rem; padding-top: .65rem; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading:first-child) { margin-top: 0; padding-top: 0; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading p) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-slot) { padding-top: .45rem; }
  .profile-customize-page :global(.profile-cosmetics-plus-guide) { grid-template-columns: 1fr; }
  .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  @media (max-width: 72rem) {
    .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .profile-customize-page :global(.identity-editor .foundation-module__body > .identity-editor__form) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: 1 / -1; grid-row: auto; align-self: start; align-content: start; grid-template-rows: none; }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"] textarea) { height: auto; min-height: 4.5rem; }
    .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field),
    .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field) { grid-column: auto; grid-row: auto; }
    .profile-customize-page :global(.identity-editor__options) { grid-column: 1 / -1; grid-row: auto; }
    .profile-customize-page :global(.identity-editor__footer) { grid-column: 1 / -1; grid-row: auto; }
    .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 52rem) {
    .profile-customize-page__control-grid { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 38rem) {
    .profile-customize-page__surface, .profile-customize-page__surface--assets { padding: .8rem; }
    .profile-customize-page__surface-heading { align-items: flex-start; flex-direction: column; }
    .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-content-editor__panel:first-of-type .profile-content-editor__fields) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.identity-editor .foundation-module__body > .identity-editor__form) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: auto; }
    .profile-customize-page :global(.identity-editor__options) { grid-column: auto; }
    .profile-customize-page :global(.profile-content-editor), .profile-customize-page :global(.profile-widget-editor) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-content-editor__panel:nth-of-type(2)), .profile-customize-page :global(.profile-widget-editor__list) { grid-column: auto; }
    .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields), .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-widget-editor__panel) { grid-template-columns: minmax(0, 1fr); }
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
