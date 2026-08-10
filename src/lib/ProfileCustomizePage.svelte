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
  export let activeTab = 'appearance';

  const dispatch = createEventDispatcher();
  let appearanceEditor = null;
  let contentEditor = null;
  let widgetEditor = null;
  let layoutEditor = null;
  let backgroundFit = 'cover';
  let backgroundPosition = 'center';
  let backgroundBlur = 30;
  let backgroundOverlay = '#1e1e2e80';
  let appearanceAtmosphere = 'Rain Window';
  let appearanceBorder = 'Celestial Border';
  let appearanceStrength = 45;

  $: identityComponent = components['profile-identity'];
  $: mediaComponent = components['profile-media'];
  $: contentComponent = components['profile-content'];
  $: widgetComponent = components['profile-widgets'];
  $: collectionComponent = components['profile-collection'];
  $: layoutComponent = components['profile-layout'];
  $: selectedTab = ['appearance', 'media', 'effects', 'layout'].includes(activeTab) ? activeTab : 'appearance';

  // Tab visibility is intentionally presentation-only. Every editor stays
  // mounted so staged drafts, media previews, and child editor refs survive
  // switching tabs before the dashboard publish action runs.
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
  <section class="profile-customize-page__surface profile-customize-page__surface--assets" class:is-tab-hidden={selectedTab !== 'media'} aria-hidden={selectedTab !== 'media'} hidden={selectedTab !== 'media'} aria-labelledby="profile-customize-media-title" data-editor-section="media">
    <div class="profile-customize-page__surface-heading">
      <div><h3 id="profile-customize-media-title">Profile media</h3><p>Manage the assets used on your profile.</p></div>
    </div>

    {#if mediaComponent}
      <div class="profile-customize-page__editor profile-customize-page__editor--media">
        <svelte:component this={mediaComponent} profileId={profileId} config={profileConfig} fallbackInitial={(targetProfile?.username || accountUsername || '✦').slice(0, 1)} {staff} {entitlements} compact={true} on:expressionchange={forward}>
          <div slot="background-options" class="profile-customize-page__background-options" aria-label="Background options">
            <label><span>Fit</span><select bind:value={backgroundFit}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></label>
            <label><span>Position</span><select bind:value={backgroundPosition}><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option></select></label>
            <label class="profile-customize-page__background-blur"><span>Blur <output>{backgroundBlur}%</output></span><input type="range" min="0" max="100" bind:value={backgroundBlur} /></label>
            <label class="profile-customize-page__background-overlay"><span>Overlay color</span><div><input type="color" value={backgroundOverlay.slice(0, 7)} aria-label="Overlay color" on:input={event => backgroundOverlay = `${event.currentTarget.value}80`} /><code>{backgroundOverlay}</code></div></label>
          </div>
        </svelte:component>
      </div>
    {:else}
      <div class="profile-customize-page__loading" role="status">Loading media controls…</div>
    {/if}
  </section>

  <button class="profile-customize-page__premium-banner" class:is-tab-hidden={selectedTab !== 'appearance'} aria-hidden={selectedTab !== 'appearance'} hidden={selectedTab !== 'appearance'} type="button" on:click={requestPremium}>
    <span class="profile-customize-page__premium-glyph" aria-hidden="true">◇</span>
    <span>Want more expression? Unlock more with <strong>Chromadie Plus</strong></span>
  </button>

  <section class="profile-customize-page__surface" class:is-tab-hidden={selectedTab !== 'appearance'} aria-hidden={selectedTab !== 'appearance'} hidden={selectedTab !== 'appearance'} aria-labelledby="profile-customize-general-title" data-editor-section="general">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-general-title">Profile identity</h3>
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

  <section class="profile-customize-page__surface" class:is-tab-hidden={selectedTab !== 'appearance'} aria-hidden={selectedTab !== 'appearance'} hidden={selectedTab !== 'appearance'} aria-labelledby="profile-customize-appearance-title" data-editor-section="appearance" id="customize-appearance">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-appearance-title">Profile colors</h3>
    </div>
    <div class="profile-customize-page__editor">
      <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={profileConfig?.draft} on:appearancechange={forward} on:dirty={forward} />
      <div class="profile-customize-page__appearance-effects" aria-label="Profile atmosphere and border">
        <label>
          <span>Profile atmosphere</span>
          <select bind:value={appearanceAtmosphere} aria-label="Profile atmosphere">
            <option>Rain Window</option>
            <option>No atmosphere</option>
            <option>City Lights</option>
          </select>
          <small><i aria-hidden="true"></i>Animated</small>
        </label>
        <label>
          <span>Profile border</span>
          <select bind:value={appearanceBorder} aria-label="Profile border">
            <option>Celestial Border</option>
            <option>No border</option>
            <option>Signal Border</option>
          </select>
          <small><i aria-hidden="true"></i>Subtle</small>
        </label>
        <label class="profile-customize-page__appearance-strength">
          <span>Atmosphere strength <output>{appearanceStrength}%</output></span>
          <input type="range" min="0" max="100" bind:value={appearanceStrength} aria-label="Atmosphere strength" />
        </label>
      </div>
    </div>
  </section>

  <section class="profile-customize-page__surface" class:is-tab-hidden={selectedTab !== 'effects'} aria-hidden={selectedTab !== 'effects'} hidden={selectedTab !== 'effects'} aria-labelledby="profile-customize-effects-title" data-editor-section="effects" id="customize-effects">
    <div class="profile-customize-page__surface-heading">
      <div><h3 id="profile-customize-effects-title">Visual effects</h3><p>Customize the visuals around your profile.</p></div>
    </div>
    <div class="profile-customize-page__editor">
      {#if collectionComponent}
        <svelte:component this={collectionComponent} accountProfile={targetProfile} {profileConfig} {entitlements} {staff} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading effects controls…</div>
      {/if}
    </div>
  </section>

  <section class="profile-customize-page__surface" class:is-tab-hidden={selectedTab !== 'layout'} aria-hidden={selectedTab !== 'layout'} hidden={selectedTab !== 'layout'} aria-labelledby="profile-customize-templates-title" data-editor-section="layout" id="customize-layout">
    <div class="profile-customize-page__surface-heading">
      <div><h3 id="profile-customize-templates-title">Profile layout</h3><p>Choose how your profile is structured.</p></div>
    </div>
    <div class="profile-customize-page__editor">
      {#if layoutComponent}
        <svelte:component this={layoutComponent} bind:this={layoutEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} showLinks={false} on:dirty={forward} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={forward} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading template controls…</div>
      {/if}
    </div>
  </section>

  <!-- Keep the legacy content editor mounted for route/ref compatibility, but
       do not surface it in the four-tab workspace.  Media owns the complete
       asset surface in the reference composition. -->
  <section class="profile-customize-page__surface is-tab-hidden" aria-hidden="true" hidden={true} aria-labelledby="profile-customize-other-title" data-editor-section="other" id="customize-other">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-other-title">Other Customization</h3>
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

  <!-- Widgets remain mounted for the legacy editor contract, but the Effects
       tab intentionally matches the reference's five visual-effect cards. -->
  <section class="profile-customize-page__surface is-tab-hidden" aria-hidden="true" hidden={true} aria-labelledby="profile-customize-widgets-title" data-editor-section="widgets" id="customize-widgets">
    <div class="profile-customize-page__surface-heading">
      <h3 id="profile-customize-widgets-title">Provider Widgets</h3>
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
    --customize-surface: var(--ctp-crust, #11111b);
    --customize-surface-raised: var(--ctp-mantle, #181825);
    --customize-surface-inset: var(--studio-inset, var(--ctp-base, #1e1e2e));
    --customize-surface-deep: var(--ctp-crust, #11111b);
    --customize-text-primary: var(--ctp-text, #cdd6f4);
    --customize-text-secondary: var(--ctp-subtext1, #bac2de);
    --customize-text-muted: var(--ctp-subtext0, #a6adc8);
    --customize-text-faint: var(--ctp-overlay1, #7f849c);
    --customize-border: var(--ctp-surface0, #313244);
    --customize-border-strong: var(--ctp-surface1, #45475a);
    --customize-border-subtle: color-mix(in srgb, var(--ctp-surface0, #313244) 66%, transparent);
    --customize-focus: var(--ctp-lavender, #b4befe);
    --customize-accent-primary: var(--ctp-teal, #94e2d5);
    --customize-accent-secondary: var(--ctp-sky, #89dceb);
    --customize-accent-add: var(--ctp-peach, #fab387);
    --customize-accent-save: var(--ctp-green, #a6e3a1);
    --customize-accent-danger: var(--ctp-red, #f38ba8);
    --customize-accent-premium: var(--ctp-mauve, #cba6f7);
    --customize-font-body: var(--font-body-stack, var(--site-font, sans-serif));
    --customize-font-mono: var(--font-mono-stack, ui-monospace, SFMono-Regular, Menlo, monospace);
    --customize-section-heading-size: 1.02rem;
    --customize-subheading-size: .92rem;
    --customize-label-size: .8rem;
    --customize-control-size: .84rem;
    --customize-secondary-height: 1.95rem;
    --customize-primary-height: 2.25rem;
    --customize-radius: .38rem;
    --customize-section-input: var(--customize-surface-inset);
    display: grid;
    width: 100%;
    gap: .65rem;
    min-width: 0;
    padding: 0 .75rem 1.5rem;
    color: var(--customize-text-primary);
    font-family: var(--customize-font-body);
    font-size: var(--customize-control-size);

    /* Embedded editors consume these aliases. Keeping them here makes the
     * Customize page a coherent visual surface without changing their APIs. */
    --site-canvas: var(--customize-surface);
    --site-deep: var(--customize-surface-deep);
    --site-raised: var(--customize-surface-raised);
    --site-ink: var(--customize-text-primary);
    --site-muted: var(--customize-text-secondary);
    --site-faint: var(--customize-text-faint);
    --site-accent: var(--customize-accent-primary);
    --site-accent-bright: var(--customize-focus);
    --site-line: var(--customize-border-subtle);
    --site-line-strong: var(--customize-border-strong);
    --site-surface: var(--customize-surface-raised);
    --site-surface-soft: var(--customize-surface-inset);
    --color-canvas: var(--customize-surface);
    --color-canvas-raised: var(--customize-surface-raised);
    --color-canvas-deep: var(--customize-surface-deep);
    --color-ink-strong: var(--customize-text-primary);
    --color-ink: var(--customize-text-secondary);
    --color-ink-muted: var(--customize-text-muted);
    --color-ink-faint: var(--customize-text-faint);
    --color-line-subtle: var(--customize-border-subtle);
    --color-line-strong: var(--customize-border-strong);
    --color-accent: var(--customize-accent-primary);
    --color-accent-bright: var(--customize-focus);
    --color-accent-cyan: var(--customize-accent-primary);
    --color-accent-roll: var(--customize-accent-save);
    --color-success: var(--customize-accent-save);
    --color-earned: var(--customize-accent-add);
    --color-warning: var(--ctp-yellow, #f9e2af);
    --color-danger: var(--customize-accent-danger);
    --surface-panel: var(--customize-surface-raised);
    --surface-panel-strong: var(--ctp-surface1, #45475a);
    --surface-panel-soft: var(--customize-surface-inset);
    --surface-inset: var(--customize-surface-inset);
  }

  .profile-customize-page__control-kicker { display: none; }

  .profile-customize-page > [hidden] { display: none !important; }

  .profile-customize-page__surface { --customize-section-accent: var(--ctp-overlay1, #7f849c); --customize-section-surface: var(--studio-panel, var(--customize-surface)); --customize-section-input: var(--customize-surface-inset); --customize-section-input-line: var(--ctp-surface0, #313244); --site-canvas: var(--customize-section-surface); --site-deep: var(--customize-surface-deep); --site-raised: var(--customize-section-input); --site-surface: var(--customize-section-input); --site-line: var(--customize-border); --site-line-strong: var(--customize-border-strong); --site-surface-soft: var(--customize-section-input); --surface-inset: var(--customize-section-input); --color-canvas: var(--customize-section-surface); --color-canvas-raised: var(--customize-section-input); --color-canvas-deep: var(--customize-surface-deep); --color-accent: var(--customize-section-accent); --color-line-subtle: var(--customize-border); --color-line-strong: var(--customize-border-strong); --surface-panel: var(--customize-section-input); --surface-panel-strong: var(--ctp-surface0, #313244); --surface-panel-soft: var(--customize-section-input); display: grid; gap: .75rem; min-width: 0; padding: .85rem 1.05rem .8rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .52rem; background: var(--customize-section-surface); scroll-margin-top: 5rem; }
  .profile-customize-page__surface[data-editor-section="media"] { --customize-section-accent: var(--ctp-sapphire, #74c7ec); }
  .profile-customize-page__surface[data-editor-section="general"] { --customize-section-accent: var(--ctp-teal, #94e2d5); }
  .profile-customize-page__surface[data-editor-section="appearance"] { --customize-section-accent: var(--ctp-yellow, #f9e2af); }
  .profile-customize-page__surface[data-editor-section="effects"] { --customize-section-accent: var(--ctp-mauve, #cba6f7); }
  .profile-customize-page__surface[data-editor-section="layout"] { --customize-section-accent: var(--ctp-pink, #f5c2e7); }
  .profile-customize-page__surface[data-editor-section="other"] { --customize-section-accent: var(--ctp-peach, #fab387); }
  .profile-customize-page__surface[data-editor-section="widgets"] { --customize-section-accent: var(--ctp-green, #a6e3a1); }
  .profile-customize-page__surface[data-editor-section="general"] .profile-customize-page__surface-heading h3 { color: var(--ctp-sky, #89dceb); }
  .profile-customize-page__surface[data-editor-section="appearance"] .profile-customize-page__surface-heading h3 { color: var(--ctp-yellow, #f9e2af); }
  .profile-customize-page__surface--assets { padding: .75rem 1.05rem .5rem; }
  .profile-customize-page__surface-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; min-width: 0; flex-wrap: wrap; }
  .profile-customize-page__surface-heading h3 { margin: 0; color: var(--customize-text-primary); font-size: 1rem; line-height: 1.2; letter-spacing: -.03em; }
  .profile-customize-page__surface-heading p { margin: .28rem 0 0; color: var(--customize-text-muted); font-size: .72rem; line-height: 1.35; }

  /* Appearance is a stack of the reference's independent cards. The tab
   * heading is carried by the color card, so the generic section chrome stays
   * out of the visual rhythm while the editor remains fully mounted. */
  .profile-customize-page__surface[data-editor-section="appearance"] { gap: .7rem; margin-top: -.25rem; padding: 0; border: 0; background: transparent; }
  .profile-customize-page__surface[data-editor-section="appearance"] > .profile-customize-page__surface-heading { display: none; }
  .profile-customize-page__surface[data-editor-section="effects"] > .profile-customize-page__surface-heading { display: none; }
  .profile-customize-page__surface[data-editor-section="appearance"] > .profile-customize-page__editor { display: grid; gap: .65rem; }

  .profile-customize-page__premium-banner { display: none; position: relative; align-items: center; justify-content: center; gap: .55rem; min-height: 5.6rem; overflow: hidden; padding: 1rem 2.8rem; border: 1px solid color-mix(in srgb, var(--customize-accent-premium) 36%, var(--ctp-surface1, #45475a)); border-radius: .5rem; background: var(--ctp-mantle, #181825); color: var(--customize-text-muted); font: 600 .94rem/1.35 var(--customize-font-body); cursor: pointer; }
  .profile-customize-page__premium-banner::before, .profile-customize-page__premium-banner::after { position: absolute; color: color-mix(in srgb, var(--customize-accent-premium) 12%, transparent); font-size: 2.7rem; line-height: 1; pointer-events: none; }
  .profile-customize-page__premium-banner::before { content: '◇'; left: 1rem; transform: rotate(-18deg); }
  .profile-customize-page__premium-banner::after { content: '✦'; right: 1rem; transform: rotate(18deg); }
  .profile-customize-page__premium-banner:hover, .profile-customize-page__premium-banner:focus-visible { border-color: var(--customize-accent-premium); background: var(--customize-surface-inset); }
  .profile-customize-page__premium-banner:focus-visible { outline: 2px solid var(--customize-focus); outline-offset: 3px; }
  .profile-customize-page__premium-banner strong { color: var(--customize-accent-premium); }
  .profile-customize-page__premium-glyph { color: var(--customize-accent-premium); font-size: .9rem; }

  .profile-customize-page__control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; min-width: 0; }
  .profile-customize-page__control-grid--general { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page__control-grid--other { align-items: start; gap: .55rem .7rem; }
  .profile-customize-page__control { display: block; min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; scroll-margin-top: 5rem; }
  .profile-customize-page__control-heading { display: none; }
  .profile-customize-page__control[data-editor-section="content"] { grid-column: 1 / -1; }
  .profile-customize-page__editor { min-width: 0; }
  .profile-customize-page__loading { display: grid; min-height: 7rem; place-items: center; color: var(--customize-text-muted); font-size: var(--customize-control-size); }

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
  .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.75rem; }
  .profile-customize-page :global(.profile-expression-editor__compact-grid .rich-media-editor--compact),
  .profile-customize-page :global(.profile-expression-editor__compact-grid .rich-media-editor--compact > .foundation-module__body) { display: contents; }
  .profile-customize-page :global(.profile-expression-editor__compact-grid .rich-media-editor--compact .rich-media-editor__advanced) { grid-column: 1 / -1; order: 5; }
  .profile-customize-page :global(.profile-expression-editor__section) { padding-top: .85rem !important; border-top-color: var(--customize-border-subtle) !important; }
  .profile-customize-page :global(.profile-expression-editor__asset-library) { margin-top: .65rem; padding-top: .75rem; border-top-color: var(--customize-border-subtle); }
  .profile-customize-page :global(.profile-expression-editor__asset-grid) { max-width: none; }
  .profile-customize-page :global(.profile-expression-editor__button) { min-height: var(--customize-secondary-height) !important; border-radius: var(--customize-radius) !important; font-size: var(--customize-label-size) !important; }
  .profile-customize-page :global(.profile-expression-editor__button--quiet) { border-color: var(--customize-border-strong) !important; background: transparent !important; color: var(--customize-text-muted) !important; }
  .profile-customize-page :global(.appearance-editor) { gap: .65rem; }
  .profile-customize-page :global(.appearance-editor__panel) { padding: .25rem 0 0; border: 0; border-bottom: 1px solid var(--customize-border-subtle); border-radius: 0; background: transparent; }
  .profile-customize-page :global(.appearance-editor__panel--colors) { padding-bottom: 0; }
  .profile-customize-page :global(.appearance-editor__panel:not(.appearance-editor__panel--colors)) { box-sizing: border-box; height: 7.45rem; padding: .8rem .85rem .75rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface); }
  .profile-customize-page :global(.appearance-editor__colors-layout),
  .profile-customize-page :global(.appearance-editor__color-grid),
  .profile-customize-page :global(.appearance-editor__picker) { min-height: 15.75rem; box-sizing: border-box; }
  .profile-customize-page :global(.appearance-editor__picker) { padding-bottom: .55rem; }
  .profile-customize-page :global(.appearance-editor__heading) { margin-bottom: .55rem; }
  .profile-customize-page :global(.appearance-editor__color-grid) { gap: .65rem .7rem; padding: 1rem; }
  .profile-customize-page :global(.appearance-editor__color-grid) { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); column-gap: 2.25rem; }
  .profile-customize-page :global(.appearance-editor__color-grid) { height: 15.75rem; overflow: hidden; }
  .profile-customize-page :global(.appearance-editor__colors-layout) { grid-template-columns: minmax(0, 1.6fr) minmax(14rem, 1fr); }
  .profile-customize-page :global(.appearance-editor__color-input),
  .profile-customize-page :global(.appearance-editor__hex) { min-height: 1.6rem !important; height: 1.6rem !important; }
  .profile-customize-page :global(.appearance-editor__color-input input[type="color"]) { width: 1.45rem; height: 1.45rem; }
  .profile-customize-page :global(.appearance-editor__color-grid .appearance-editor__hex) { padding: .25rem .35rem; font-size: .68rem !important; }
  .profile-customize-page :global(.appearance-editor__color-grid .appearance-editor__field) { grid-template-columns: minmax(0, 1fr) 4.7rem; }
  .profile-customize-page :global(.appearance-editor__color-grid .appearance-editor__colors-heading) { margin-bottom: .15rem; }
  .profile-customize-page :global(.appearance-editor__surface-grid) { grid-template-columns: minmax(15rem, .98fr) minmax(15rem, .98fr) minmax(17rem, 1.08fr); column-gap: 2.45rem; padding-inline: .35rem; }
  .profile-customize-page :global(.appearance-editor__surface-intro select) { min-height: 2rem; width: 100%; border: 1px solid var(--customize-border-strong); border-radius: var(--customize-radius); padding: .45rem .65rem; background: var(--customize-section-input); color: var(--customize-text-primary); font: 500 var(--customize-control-size)/1 var(--customize-font-body); }
  .profile-customize-page__appearance-effects { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, .95fr) minmax(0, 1.05fr); gap: .7rem 2rem; min-width: 0; min-height: 7.65rem; box-sizing: border-box; padding: .8rem 1.2rem .75rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface); }
  .profile-customize-page__appearance-effects > label { display: grid; min-width: 0; gap: .35rem; color: var(--customize-text-secondary); font-size: var(--customize-label-size); }
  .profile-customize-page__appearance-effects > label > span:first-child { display: flex; align-items: center; justify-content: space-between; gap: .45rem; }
  .profile-customize-page__appearance-effects select { width: 100%; min-height: 2rem; border: 1px solid var(--customize-border-strong); border-radius: var(--customize-radius); padding: .45rem .65rem; background: var(--customize-section-input); color: var(--customize-text-primary); font: 500 var(--customize-control-size)/1 var(--customize-font-body); }
  .profile-customize-page__appearance-effects small { display: inline-flex; align-items: center; gap: .35rem; color: var(--customize-text-muted); font-size: .68rem; }
  .profile-customize-page__appearance-effects small i { width: .38rem; height: .38rem; border-radius: 50%; background: var(--ctp-green, #a6e3a1); }
  .profile-customize-page__appearance-effects output { color: var(--customize-text-faint); font-family: var(--customize-font-mono); }
  .profile-customize-page__appearance-strength input[type="range"] { width: 100%; accent-color: var(--ctp-green, #a6e3a1); }
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
  .profile-customize-page :global(.identity-editor .foundation-module__body > .identity-editor__form) { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(0, .9fr) minmax(0, .9fr); column-gap: 1.5rem; row-gap: .4rem; }
  .profile-customize-page :global(.identity-editor__fields) { display: contents; }
  .profile-customize-page :global(.identity-editor__field--username) { grid-column: 1 / span 2; grid-row: 1; }
  .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: 1 / span 2; grid-row: 2 / span 2; align-self: stretch; align-content: stretch; grid-template-rows: auto minmax(0, 1fr) auto; }
  .profile-customize-page :global(.identity-editor__field[for="profile-bio"] textarea) { height: 5rem !important; min-height: 5rem !important; }
  .profile-customize-page :global(.identity-editor__grid) { display: contents; }
  .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field:first-child) { grid-column: 3 / span 2; grid-row: 1; }
  .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field:last-child) { grid-column: 3 / span 2; grid-row: 2; }
  .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field:first-child) { grid-column: 3; grid-row: 3; }
  .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field:last-child) { grid-column: 4; grid-row: 3; }
  .profile-customize-page :global(.identity-editor__options) { display: flex; grid-column: 1 / span 2; grid-row: 4; align-self: start; align-items: center; min-height: var(--customize-primary-height); flex-wrap: wrap; gap: .65rem 1rem; padding-bottom: .1rem; color: var(--customize-text-muted); font-size: var(--customize-label-size); }
  /* Match the reference's compact identity rhythm: the metadata rows sit a
   * little below the username while the toggles tuck up against the panel
   * edge.  These offsets are desktop-only and are reset in the responsive
   * layout below. */
  .profile-customize-page :global(.identity-editor__field[for="profile-bio"]),
  .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field:last-child) { position: relative; top: .44rem; }
  .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field) { position: relative; top: .68rem; }
  .profile-customize-page :global(.identity-editor__options) { position: relative; top: -.88rem; margin-bottom: -1.18rem; }
  .profile-customize-page :global(.identity-editor__footer) { grid-column: 3 / -1; grid-row: 4; }
  .profile-customize-page :global(.identity-editor__options label) { display: inline-flex; align-items: center; gap: .35rem; }
  .profile-customize-page :global(.identity-editor__field) { align-self: start; align-content: start; gap: .35rem; font-size: var(--customize-label-size); }
  .profile-customize-page :global(.identity-editor__field textarea) { min-height: 4.5rem; }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select)) { min-height: 2rem; border-radius: var(--customize-radius); padding: .45rem .65rem; font-size: var(--customize-control-size); font-family: var(--customize-font-body); }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea, select)),
  .profile-customize-page :global(.profile-editor :is(input[type="text"], input[type="url"], input[type="email"], input[type="search"], input[type="number"], textarea, select)),
  .profile-customize-page :global(.appearance-editor__color-input),
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input, select)),
  .profile-customize-page :global(.profile-cosmetics-slot select) { border-color: var(--customize-section-input-line) !important; background: var(--customize-section-input) !important; color: var(--customize-text-primary) !important; font-size: var(--customize-control-size); }
  .profile-customize-page :global(.profile-editor :is(input[type="text"], input[type="url"], input[type="email"], input[type="search"], input[type="number"], textarea, select)),
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input, select)),
  .profile-customize-page :global(.profile-cosmetics-slot select) { min-height: 2rem; font-family: var(--customize-font-body); }
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
  .profile-customize-page :global(.appearance-editor__hex) { color: var(--customize-text-primary) !important; font: 500 var(--customize-control-size) / 1 var(--customize-font-mono) !important; }
  .profile-customize-page :global(.identity-editor__field :is(input, textarea)::placeholder),
  .profile-customize-page :global(.profile-editor :is(input, textarea)::placeholder),
  .profile-customize-page :global(.profile-content-editor__fields :is(input, textarea)::placeholder),
  .profile-customize-page :global(.profile-widget-editor__panel :is(input)::placeholder) { color: var(--customize-text-faint); }
  .profile-customize-page :global(.identity-editor__field small),
  .profile-customize-page :global(.profile-content-editor__fields label small),
  .profile-customize-page :global(.profile-widget-editor__panel label small) { color: var(--customize-text-faint); font-size: .74rem; }
  .profile-customize-page :global(.identity-editor__footer) { grid-column: 3 / -1; grid-row: 3; align-items: center; justify-content: flex-end; align-self: end; margin-top: 0; padding-top: 0; border-top: 0; }
  .profile-customize-page :global(.identity-editor__hint) { display: none; }
  .profile-customize-page :global(.identity-editor__save),
  .profile-customize-page :global(.profile-cosmetics-apply) { min-height: var(--customize-primary-height); border: 1px solid var(--customize-accent-save) !important; border-radius: var(--customize-radius); background: var(--customize-accent-save) !important; color: var(--customize-surface-inset) !important; font: 700 var(--customize-label-size) / 1 var(--customize-font-body); }
  /* Publishing is the visible workspace action. Keep the legacy identity
   * submit in the tab order for keyboard users, while allowing the compact
   * Appearance card to match the reference's quiet lower-right edge. */
  .profile-customize-page :global(.identity-editor__save) { opacity: 0; pointer-events: none; }
  .profile-customize-page :global(.identity-editor__save:focus-visible) { opacity: 1; pointer-events: auto; }
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
  .profile-customize-page :global(.profile-cosmetics-surface) { padding: .65rem 0; border: 0; border-top: 1px solid var(--customize-border-subtle); border-radius: 0; background: transparent; }
  .profile-customize-page :global(.profile-content-editor) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .profile-customize-page :global(.profile-content-editor__panel) { padding: .45rem 0; }
  .profile-customize-page :global(.profile-content-editor__panel:first-of-type) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-content-editor__panel:nth-of-type(2)) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-content-editor__panel-heading) { margin-bottom: .55rem; }
  .profile-customize-page :global(.profile-content-editor__fields) { gap: .55rem; }
  .profile-customize-page :global(.profile-content-editor__panel:first-of-type .profile-content-editor__fields) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
  .profile-customize-page :global(.profile-content-editor__project) { gap: .55rem; padding: .65rem; border-color: var(--customize-border-subtle) !important; border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
  .profile-customize-page :global(.profile-content-editor__helper),
  .profile-customize-page :global(.profile-content-editor__hint),
  .profile-customize-page :global(.profile-widget-editor__hint),
  .profile-customize-page :global(.profile-editor__hint) { display: none; }
  .profile-customize-page :global(.profile-widget-editor) { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; }
  .profile-customize-page :global(.profile-widget-editor__list) { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
  .profile-customize-page :global(.profile-widget-editor__panel) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; padding: .55rem; border-color: var(--customize-border-subtle) !important; border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page :global(.profile-widget-editor__panel-heading),
  .profile-customize-page :global(.profile-widget-editor__helper),
  .profile-customize-page :global(.profile-widget-editor__remove) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-widget-editor__add) { grid-column: 1; }
  .profile-customize-page :global(.profile-widget-editor__note) { grid-column: 1 / -1; display: none; }
  .profile-customize-page :global(.profile-editor__panel) { gap: .6rem; padding: .5rem 0; }
  .profile-customize-page :global(.profile-editor__layout-options) { gap: .85rem; padding: .85rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page :global(.profile-editor__layout-options .profile-editor__segmented-field > div) { min-height: var(--customize-secondary-height); }
  .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .profile-customize-page :global(.profile-cosmetics-layout) { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page :global(.profile-cosmetics-preview) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-plus-guide) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-heading) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-controls) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem .65rem; padding: .25rem 0 0; border: 0; background: transparent; }
  .profile-customize-page :global(.profile-cosmetics-controls__heading) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-section-heading) { display: grid; }
  .profile-customize-page :global(.profile-cosmetics-slot) { padding: .55rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page :global(.profile-cosmetics-name-grid .profile-cosmetics-slot) { padding: 0; border: 0; background: transparent; }
  .profile-customize-page :global(.profile-cosmetics-visual-grid .profile-cosmetics-slot) { position: relative; align-content: start; gap: .45rem; }
  .profile-customize-page :global(.profile-cosmetics-visual-grid .profile-cosmetics-slot)::before { content: ''; position: absolute; top: .45rem; left: .45rem; z-index: 1; width: .34rem; height: .34rem; border-radius: 50%; background: var(--ctp-green, #a6e3a1); }
  .profile-customize-page :global(.profile-cosmetics-visual-grid) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1.25fr); }
  .profile-customize-page :global(.profile-cosmetics-slot--paid-layout) { display: none; }
  .profile-customize-page :global(.profile-cosmetics-slot--atmosphere-strength) { gap: .5rem; }
  .profile-customize-page :global(.profile-cosmetics-slot select) { min-height: 2.25rem; }
  .profile-customize-page :global(.profile-cosmetics-plus-guide) { grid-template-columns: 1fr; }
  /* The collection editor is a single tabbed surface.  Keep its heading,
   * name controls, visual controls, and apply action in one full-width stack
   * instead of inheriting the four-column parent editor grid. */
  .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: minmax(0, 1fr); }
  .profile-customize-page :global(.profile-cosmetics-section-heading),
  .profile-customize-page :global(.profile-cosmetics-name-grid),
  .profile-customize-page :global(.profile-cosmetics-visual-grid),
  .profile-customize-page :global(.profile-cosmetics-apply) { grid-column: 1 / -1; }

  .profile-customize-page :global(.profile-editor) { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(18rem, .8fr); gap: .8rem 1rem; }
  .profile-customize-page :global(.profile-editor__header) { display: none; }
  .profile-customize-page :global(.profile-editor__panel),
  .profile-customize-page :global(.profile-editor__module-list),
  .profile-customize-page :global(.profile-editor__links),
  .profile-customize-page :global(.profile-editor__link-style),
  .profile-customize-page :global(.profile-editor__metadata),
  .profile-customize-page :global(.profile-editor__message),
  .profile-customize-page :global(.profile-editor__hint) { grid-column: 1 / -1; }
  .profile-customize-page :global(.profile-editor__panel[aria-labelledby="profile-layout-style-title"]) { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
  .profile-customize-page :global(.profile-editor__panel[aria-labelledby="profile-layout-modules-title"]) { grid-column: 1; grid-row: 2; }
  .profile-customize-page :global(.profile-editor__panel[aria-labelledby="profile-layout-modules-title"]) { display: none; }
  .profile-customize-page :global(.profile-editor > section[aria-labelledby="profile-layout-modules-title"]) { display: none !important; }
  .profile-customize-page :global(.profile-template-picker) { grid-column: 1; }
  .profile-customize-page :global(.profile-editor .profile-template-picker__premium) { display: none !important; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-card),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-card) { grid-template-rows: minmax(1.05rem, auto) minmax(5.7rem, auto) auto; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-copy),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-copy) { min-height: 1.05rem; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-preview),
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-audio-player),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-preview) { align-self: start; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-preview .profile-media-icon),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-preview .profile-media-icon) { width: 2.35rem; height: 2.35rem; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-upload-hint),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-upload-hint) { font-size: .84rem; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-copy strong),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-copy strong) { font-size: .92rem; }
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-card--cursor .rich-media-editor__compact-preview:hover:not(:disabled)),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-card--pointer_cursor .rich-media-editor__compact-preview:hover:not(:disabled)) { border-color: var(--ctp-green, #a6e3a1) !important; box-shadow: 0 0 0 1px color-mix(in srgb, var(--ctp-green, #a6e3a1) 54%, transparent); }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-grid) { grid-template-columns: minmax(0, .9fr) minmax(0, .9fr) minmax(0, 1.5fr); gap: .65rem !important; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-card),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-card) { padding: .65rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-card--background) { order: 1; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-card--avatar) { order: 2; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-card--audio) { order: 3; }
  .profile-customize-page__editor--media :global(.profile-expression-editor__compact-card--cursor),
  .profile-customize-page__editor--media :global(.rich-media-editor__compact-card--cursor) { order: 4; }
  .profile-customize-page__background-options { grid-column: span 2; order: 5; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem .7rem; min-width: 0; padding: .65rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page__background-options label { display: grid; gap: .3rem; min-width: 0; color: var(--customize-text-secondary); font-size: var(--customize-label-size); }
  .profile-customize-page__background-options label > span { display: flex; align-items: center; justify-content: space-between; gap: .4rem; }
  .profile-customize-page__background-options output { color: var(--customize-text-faint); font-family: var(--customize-font-mono); }
  .profile-customize-page__background-options select { min-height: var(--customize-secondary-height); border: 1px solid var(--customize-border-strong); border-radius: var(--customize-radius); padding: 0 .6rem; background: var(--customize-surface-raised); color: var(--customize-text-primary); font-size: var(--customize-label-size); }
  .profile-customize-page__background-options input[type="range"] { width: 100%; accent-color: var(--customize-accent-secondary); }
  .profile-customize-page__background-options input[type="color"] { width: 1.7rem; height: 1.7rem; padding: .1rem; border: 1px solid var(--customize-border-strong); border-radius: .25rem; background: transparent; cursor: pointer; }
  .profile-customize-page__background-overlay > div { display: flex; align-items: center; gap: .45rem; min-height: var(--customize-secondary-height); }
  .profile-customize-page__background-overlay code { color: var(--customize-text-muted); font: .68rem/1 var(--customize-font-mono); }
  .profile-customize-page :global(.rich-media-editor__compact-preview),
  .profile-customize-page :global(.rich-media-editor__upload-card),
  .profile-customize-page :global(.rich-media-editor__upload-preview),
  .profile-customize-page :global(.rich-media-editor__asset),
  .profile-customize-page :global(.rich-media-editor__track),
  .profile-customize-page :global(.profile-editor__module-list li) { border-color: var(--customize-border-subtle) !important; }
  .profile-customize-page :global(.profile-widget-editor__empty) { border-color: var(--customize-border-strong) !important; background: var(--customize-surface-deep); }
  .profile-customize-page :global(.profile-content-editor__message),
  .profile-customize-page :global(.profile-widget-editor__message),
  .profile-customize-page :global(.rich-media-editor__message),
  .profile-customize-page :global(.appearance-editor__message) { color: var(--customize-text-muted); font-size: var(--customize-label-size); }
  .profile-customize-page :global([role="alert"]) { color: var(--customize-accent-danger); }
  .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  @media (max-width: 72rem) {
    .profile-customize-page :global(.profile-expression-editor__compact-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .profile-customize-page :global(.identity-editor .foundation-module__body > .identity-editor__form) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"]) { grid-column: 1 / -1; grid-row: auto; align-self: start; align-content: start; grid-template-rows: none; }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"] textarea) { height: auto; min-height: 4.5rem; }
    .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field),
    .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field) { grid-column: auto; grid-row: auto; }
    .profile-customize-page :global(.identity-editor__field[for="profile-bio"]),
    .profile-customize-page :global(.identity-editor__grid--meta .identity-editor__field:last-child),
    .profile-customize-page :global(.identity-editor__grid--behavior .identity-editor__field),
    .profile-customize-page :global(.identity-editor__options) { position: static; top: auto; margin-bottom: 0; }
    .profile-customize-page :global(.identity-editor__options) { grid-column: 1 / -1; grid-row: auto; }
    .profile-customize-page :global(.identity-editor__footer) { grid-column: 1 / -1; grid-row: auto; }
    .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page :global(.profile-content-editor__project .profile-content-editor__fields) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page__appearance-effects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 52rem) {
    .profile-customize-page { padding-inline: 0; }
    .profile-customize-page__control-grid { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-widget-editor__list),
    .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 38rem) {
    .profile-customize-page__surface, .profile-customize-page__surface--assets { padding: .75rem; }
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
    .profile-customize-page :global(.appearance-editor__panel:not(.appearance-editor__panel--colors)) { height: auto; }
    .profile-customize-page__appearance-effects { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page__premium-banner { min-height: 5.6rem; padding-inline: 2.2rem; text-align: center; }
    .profile-customize-page__premium-banner::before, .profile-customize-page__premium-banner::after { font-size: 2.2rem; }
    .profile-customize-page__control { padding: 0; }
    .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-customize-page__background-options { grid-column: 1 / -1; grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 30rem) {
    .profile-customize-page__editor--media :global(.rich-media-editor__upload-grid) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page__premium-banner::before { left: .45rem; }
    .profile-customize-page__premium-banner::after { right: .45rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-customize-page :global(*) { scroll-behavior: auto; }
  }
</style>
