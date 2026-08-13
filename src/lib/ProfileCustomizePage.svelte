<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileAppearanceEditor from './ProfileAppearanceEditor.svelte';
  import ProfileMediaWorkspace from './ProfileMediaWorkspace.svelte';

  export let components = {};
  export let profileId = null;
  export let accountUsername = '';
  export let targetProfile = {};
  export let profileConfig = {};
  export let entitlements = [];
  export let staff = false;
  export let activeTab = 'appearance';
  export let layoutVariant = 'compact';
  /** @type {any} */
  export let identityDraft = null;

  const dispatch = createEventDispatcher();
  let identityEditor = null;
  let appearanceEditor = null;
  let mediaWorkspaceEditor = null;
  let layoutEditor = null;

  $: identityComponent = components['profile-identity'];
  $: mediaComponent = components['profile-media'];
  $: collectionComponent = components['profile-collection'];
  $: layoutComponent = components['profile-layout'];
  $: selectedTab = ['appearance', 'media', 'layout'].includes(activeTab) ? activeTab : 'appearance';

  // The parent owns the canonical Studio draft. These three editors can keep
  // ephemeral control state while mounted, but they never restore profile
  // data from a session cache or submit a complete replacement draft.
  function forward(event) {
    dispatch(event.type, event.detail);
  }

  function forwardPatch(scope, event) {
    dispatch('studiopatch', { scope, detail: event.detail || {} });
  }

  function forwardDirty(source, event) {
    dispatch('dirty', { ...(event.detail || {}), source });
  }

  function requestPremium() {
    dispatch('premiumrequest', { sectionId: 'premium' });
  }

  export function getDraftIdentity() {
    return identityEditor?.getDraftIdentity?.() || null;
  }

  export function validateDraft() {
    return [identityEditor, appearanceEditor, layoutEditor]
      .filter(Boolean)
      .every(editor => editor.validateDraft?.() !== false);
  }

  export function acceptSaved(nextConfig) {
    identityEditor?.acceptSaved?.(nextConfig);
    const nextAppearance = nextConfig?.appearance || nextConfig;
    appearanceEditor?.acceptSaved?.(nextAppearance);
    mediaWorkspaceEditor?.acceptSaved?.(nextAppearance);
    layoutEditor?.acceptSaved?.(nextConfig);
  }

  export function resetChanges() {
    identityEditor?.resetChanges?.();
    appearanceEditor?.resetChanges?.();
    mediaWorkspaceEditor?.resetChanges?.();
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
        <ProfileMediaWorkspace bind:this={mediaWorkspaceEditor} {mediaComponent} {profileId} {accountUsername} {targetProfile} {profileConfig} {staff} {entitlements} on:expressionchange={event => forwardPatch('media', event)} on:backgroundchange={event => forwardPatch('appearance-background', event)} on:dirty={event => forwardDirty('customize:media', event)} />
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
          <svelte:component this={identityComponent} bind:this={identityEditor} profileId={profileId} username={targetProfile?.username || accountUsername} bio={identityDraft?.bio ?? targetProfile?.bio ?? ''} publishedBio={targetProfile?.bio ?? ''} config={profileConfig} studio={true} on:identitypreview={event => forwardPatch('identity', event)} on:identitysaved={forward} on:configsaved={forward} on:dirty={event => forwardDirty('customize:identity', event)} />
        {:else}
          <div class="profile-customize-page__loading" role="status">Loading identity controls…</div>
        {/if}
      </section>
    </div>
  </section>

  <section class="profile-customize-page__surface" class:is-tab-hidden={selectedTab !== 'appearance'} aria-hidden={selectedTab !== 'appearance'} hidden={selectedTab !== 'appearance'} aria-label="Profile appearance" data-editor-section="appearance" id="customize-appearance">
    <div class="profile-customize-page__editor">
      <ProfileAppearanceEditor bind:this={appearanceEditor} draftConfig={profileConfig?.draft} {layoutVariant} on:appearancechange={event => forwardPatch('appearance', event)} on:dirty={event => forwardDirty('customize:appearance', event)} />
    </div>
  </section>

  <section class="profile-customize-page__surface" class:is-tab-hidden={selectedTab !== 'appearance'} aria-hidden={selectedTab !== 'appearance'} hidden={selectedTab !== 'appearance'} aria-label="Visual effects" data-editor-section="effects" id="customize-effects">
    <div class="profile-customize-page__editor">
      {#if collectionComponent}
        <svelte:component this={collectionComponent} accountProfile={targetProfile} {profileConfig} {entitlements} {staff} compact={true} on:cosmeticpreview={forward} />
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
        <svelte:component this={layoutComponent} bind:this={layoutEditor} profileId={profileId} draftConfig={profileConfig?.draft} publishedConfig={profileConfig?.published} updatedAt={profileConfig?.updatedAt} {entitlements} {staff} studio={true} showLinks={false} on:dirty={event => forwardDirty('customize:layout', event)} on:configsaved={forward} on:configpublished={forward} on:configreloaded={forward} on:configpreview={event => forwardPatch('layout', event)} />
      {:else}
        <div class="profile-customize-page__loading" role="status">Loading template controls…</div>
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
    --customize-control-surface: var(--ctp-crust, #11111b);
    --customize-control-line: var(--ctp-surface1, #45475a);
    --customize-section-input: var(--customize-surface-inset);
    display: grid;
    box-sizing: border-box;
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

  /* Catppuccin's light palette inverts the depth order: Base is the darker
   * control well there, while Crust remains the deepest dark-mode token. */
  :global(.profile-dashboard-shell--light) .profile-customize-page { --customize-control-surface: var(--ctp-base, #dce0e8); }

  .profile-customize-page__surface { --customize-section-accent: var(--ctp-overlay1, #7f849c); --customize-section-surface: var(--studio-panel, var(--customize-surface)); --customize-section-input: var(--customize-control-surface); --customize-section-input-line: var(--customize-control-line); --site-canvas: var(--customize-section-surface); --site-deep: var(--customize-surface-deep); --site-raised: var(--customize-section-input); --site-surface: var(--customize-section-input); --site-line: var(--customize-border); --site-line-strong: var(--customize-border-strong); --site-surface-soft: var(--customize-section-input); --surface-inset: var(--customize-section-input); --color-canvas: var(--customize-section-surface); --color-canvas-raised: var(--customize-section-input); --color-canvas-deep: var(--customize-surface-deep); --color-accent: var(--customize-section-accent); --color-line-subtle: var(--customize-border); --color-line-strong: var(--customize-border-strong); --surface-panel: var(--customize-section-input); --surface-panel-strong: var(--ctp-surface0, #313244); --surface-panel-soft: var(--customize-section-input); display: grid; box-sizing: border-box; width: 100%; max-width: 100%; gap: .75rem; min-width: 0; padding: .85rem 1.05rem .8rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .52rem; background: var(--customize-section-surface); scroll-margin-top: 5rem; }
  .profile-customize-page__surface[data-editor-section="media"] { --customize-section-accent: var(--ctp-sapphire, #74c7ec); }
  .profile-customize-page__surface[data-editor-section="general"] { --customize-section-accent: var(--ctp-teal, #94e2d5); }
  .profile-customize-page__surface[data-editor-section="appearance"] { --customize-section-accent: var(--ctp-yellow, #f9e2af); }
  .profile-customize-page__surface[data-editor-section="effects"] { --customize-section-accent: var(--ctp-mauve, #cba6f7); }
  .profile-customize-page__surface[data-editor-section="layout"] { --customize-section-accent: var(--ctp-pink, #f5c2e7); }
  .profile-customize-page__surface[data-editor-section="general"] .profile-customize-page__surface-heading h3 { color: var(--ctp-sky, #89dceb); }
  .profile-customize-page__surface--assets { padding: .75rem 1.05rem .5rem; }
  .profile-customize-page__surface-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; min-width: 0; flex-wrap: wrap; }
  .profile-customize-page__surface-heading h3 { margin: 0; color: var(--customize-text-primary); font-size: 1rem; line-height: 1.2; letter-spacing: -.03em; }
  .profile-customize-page__surface-heading p { margin: .28rem 0 0; color: var(--customize-text-muted); font-size: .72rem; line-height: 1.35; }

  /* Appearance is a stack of the reference's independent cards. The tab
   * heading is carried by the color card, so the generic section chrome stays
   * out of the visual rhythm while the editor remains fully mounted. */
  .profile-customize-page__surface[data-editor-section="appearance"] { gap: .7rem; margin-top: -.25rem; padding: 0; border: 0; background: transparent; }
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
  .profile-customize-page__control { display: block; min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; scroll-margin-top: 5rem; }
  .profile-customize-page__control-heading { display: none; }
  .profile-customize-page__editor { min-width: 0; container-type: inline-size; container-name: profile-customize-editor; }
  .profile-customize-page__loading { display: grid; min-height: 7rem; place-items: center; color: var(--customize-text-muted); font-size: var(--customize-control-size); }

  /* The embedded editors keep their domain contracts, but share the compact
   * shell here so the single-page workspace reads like one interface. */
  .profile-customize-page :global(.foundation-module) { width: 100%; min-width: 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
  .profile-customize-page :global(.foundation-module__header),
  .profile-customize-page :global(.profile-editor__header),
  .profile-customize-page :global(.profile-cosmetics-heading) { display: none; }
  .profile-customize-page :global(.foundation-module__description) { display: none; }
  .profile-customize-page :global(.foundation-module__body) { padding: 0; }
  .profile-customize-page :global(.appearance-editor__heading h2),
  .profile-customize-page :global(.profile-editor__panel h3),
  .profile-customize-page :global(.profile-cosmetics-controls__heading strong) { color: var(--customize-text-primary); font-size: var(--customize-subheading-size); line-height: 1.25; }
  .profile-customize-page :global(.appearance-editor__field > span),
  .profile-customize-page :global(.appearance-editor__range > span),
  .profile-customize-page :global(.profile-editor__field),
  .profile-customize-page :global(.profile-editor__link-style label),
  .profile-customize-page :global(.profile-editor__metadata label),
  .profile-customize-page :global(.profile-cosmetics-slot label) { color: var(--customize-text-secondary); font-size: var(--customize-label-size); }
  .profile-customize-page :global(.appearance-editor__heading > span),
  .profile-customize-page :global(.appearance-editor__range output),
  .profile-customize-page :global(.profile-editor__version),
  .profile-customize-page :global(.profile-editor__panel-heading > span) { color: var(--customize-text-faint); font-family: var(--customize-font-mono); }
  .profile-customize-page :global(.profile-editor :is(input[type="text"], input[type="url"], input[type="email"], input[type="search"], input[type="number"], textarea, select)),
  .profile-customize-page :global(.appearance-editor__color-input),
  .profile-customize-page :global(.profile-cosmetics-slot select) { border-color: var(--customize-section-input-line) !important; background: var(--customize-section-input) !important; color: var(--customize-text-primary) !important; font-size: var(--customize-control-size); }
  .profile-customize-page :global(.profile-editor :is(input[type="text"], input[type="url"], input[type="email"], input[type="search"], input[type="number"], textarea, select)),
  .profile-customize-page :global(.profile-cosmetics-slot select) { min-height: 2rem; font-family: var(--customize-font-body); }
  .profile-customize-page :global(.profile-cosmetics-slot select) { min-height: max(var(--customize-secondary-height), 2.5rem); padding-inline: .65rem; font: 500 var(--customize-control-size) / 1 var(--customize-font-body); }
  /* Keep every text-like editor control darker than its section surface. The
   * media/color contracts stay untouched: range, swatch, file, and native
   * toggle inputs retain their editor-specific treatment. */
  .profile-customize-page :global(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])),
  .profile-customize-page :global(textarea),
  .profile-customize-page :global(select) { border-color: var(--customize-control-line) !important; background: var(--customize-control-surface) !important; color: var(--customize-text-primary) !important; }
  .profile-customize-page :global(.appearance-editor__range input),
  .profile-customize-page :global(.profile-editor__link-style input[type="range"]) { accent-color: var(--customize-accent-secondary); }
  .profile-customize-page :global(input[type="checkbox"]),
  .profile-customize-page :global(input[type="radio"]) { accent-color: var(--customize-accent-primary); }
  .profile-customize-page :global(.profile-cosmetics-slot select:focus-visible),
  .profile-customize-page :global(.profile-editor :is(input, textarea, select):focus-visible) { border-color: var(--customize-focus) !important; box-shadow: 0 0 0 2px color-mix(in srgb, var(--customize-focus) 24%, transparent); }
  .profile-customize-page :global(.appearance-editor__hex) { color: var(--customize-text-primary) !important; font: 500 var(--customize-control-size) / 1 var(--customize-font-mono) !important; }
  .profile-customize-page :global(.profile-editor :is(input, textarea)::placeholder) { color: var(--customize-text-faint); }
  .profile-customize-page :global(.profile-cosmetics-apply) { min-height: max(var(--customize-primary-height), 2.75rem); border: 1px solid var(--customize-accent-save) !important; border-radius: var(--customize-radius); background: var(--customize-accent-save) !important; color: var(--customize-surface-inset) !important; font: 700 var(--customize-label-size) / 1 var(--customize-font-body); }
  .profile-customize-page :global(.profile-cosmetics-apply:hover:not(:disabled)) { background: color-mix(in srgb, var(--customize-accent-save) 82%, var(--customize-text-primary)) !important; }
  .profile-customize-page :global(.profile-editor__text-button),
  .profile-customize-page :global(.profile-editor__remove),
  .profile-customize-page :global(.profile-editor__module-actions button),
  .profile-customize-page :global(.profile-editor__module-actions select),
  .profile-customize-page :global(.profile-expression-editor__button) { min-height: var(--customize-secondary-height) !important; border-radius: var(--customize-radius) !important; border-color: var(--customize-border-strong) !important; background: transparent !important; color: var(--customize-text-secondary) !important; font: 600 var(--customize-label-size) / 1 var(--customize-font-body) !important; }
  .profile-customize-page :global(.profile-editor__text-button:hover:not(:disabled)),
  .profile-customize-page :global(.profile-editor__remove:hover),
  .profile-customize-page :global(.profile-editor__module-actions button:hover:not(:disabled)),
  .profile-customize-page :global(.profile-editor__module-actions select:hover:not(:disabled)),
  .profile-customize-page :global(.profile-expression-editor__button:hover:not(:disabled)) { border-color: var(--customize-accent-secondary) !important; background: color-mix(in srgb, var(--customize-accent-secondary) 9%, transparent) !important; color: var(--customize-text-primary) !important; }
  .profile-customize-page :global(.profile-editor__remove:hover) { border-color: var(--customize-accent-danger) !important; background: color-mix(in srgb, var(--customize-accent-danger) 9%, transparent) !important; color: var(--customize-accent-danger) !important; }
  .profile-customize-page :global(.profile-cosmetics-apply:disabled) { cursor: not-allowed; opacity: .45; }
  .profile-customize-page :global(.profile-cosmetics-apply:focus-visible) { outline: 2px solid var(--customize-focus); outline-offset: 2px; }
  .profile-customize-page :global(.profile-editor) { gap: .65rem; }
  .profile-customize-page :global(.profile-editor__panel) { padding: .65rem 0; border: 0; border-top: 1px solid var(--customize-border-subtle); border-radius: 0; background: transparent; }
  .profile-customize-page :global(.profile-editor__hint) { display: none; }
  .profile-customize-page :global(.profile-editor__panel) { gap: .6rem; padding: .5rem 0; }
  .profile-customize-page :global(.profile-editor__layout-options) { gap: .85rem; padding: .85rem; border: 1px solid var(--customize-border-subtle); border-radius: var(--customize-radius); background: var(--customize-surface-inset); }
  .profile-customize-page :global(.profile-editor__layout-options .profile-editor__segmented-field > div) { min-height: var(--customize-secondary-height); }
  .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .profile-customize-page :global(.rich-media-editor__compact-preview),
  .profile-customize-page :global(.rich-media-editor__upload-card),
  .profile-customize-page :global(.rich-media-editor__upload-preview),
  .profile-customize-page :global(.rich-media-editor__asset),
  .profile-customize-page :global(.rich-media-editor__track),
  .profile-customize-page :global(.profile-editor__module-list li) { border-color: var(--customize-border-subtle) !important; }
  .profile-customize-page :global(.rich-media-editor__message),
  .profile-customize-page :global(.appearance-editor__message) { color: var(--customize-text-muted); font-size: var(--customize-label-size); }
  .profile-customize-page :global([role="alert"]) { color: var(--customize-accent-danger); }
  @media (max-width: 72rem) {
    .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 52rem) {
    .profile-customize-page { padding-inline: 0; overflow-x: clip; }
    .profile-customize-page__control-grid { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-editor__module-list),
    .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page__surface { padding-inline: .75rem; }
  }

  @media (max-width: 38rem) {
    .profile-customize-page__surface, .profile-customize-page__surface--assets { padding: .75rem; }
    .profile-customize-page__surface-heading { align-items: flex-start; flex-direction: column; }
    .profile-customize-page :global(.profile-editor__module-list) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.profile-cosmetics-controls) { grid-template-columns: minmax(0, 1fr); }
    .profile-customize-page :global(.appearance-editor__panel:not(.appearance-editor__panel--colors)) { height: auto; }
    .profile-customize-page__premium-banner { min-height: 5.6rem; padding-inline: 2.2rem; text-align: center; }
    .profile-customize-page__premium-banner::before, .profile-customize-page__premium-banner::after { font-size: 2.2rem; }
    .profile-customize-page__control { padding: 0; }
  }

  @media (max-width: 30rem) {
    .profile-customize-page__premium-banner::before { left: .45rem; }
    .profile-customize-page__premium-banner::after { right: .45rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-customize-page :global(*) { scroll-behavior: auto; }
  }
</style>
