<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileAppearanceEditor from './ProfileAppearanceEditor.svelte';
  import ProfileMediaWorkspace from './ProfileMediaWorkspace.svelte';
  import ProfileReferenceLayoutEditor from './ProfileReferenceLayoutEditor.svelte';

  export let components = {};
  export let profileId = null;
  export let accountUsername = '';
  export let targetProfile = {};
  export let profileConfig = {};
  export let entitlements = [];
  export let staff = false;
  export let activeTab = 'appearance';
  /** @type {any} */
  export let identityDraft = null;
  /** @type {any} */
  export let cosmeticPreviewLoadout = null;

  const dispatch = createEventDispatcher();
  let identityEditor = null;
  let appearanceEditor = null;
  let mediaWorkspaceEditor = null;
  let linksEditor = null;
  let layoutEditor = null;

  $: identityComponent = components['profile-identity'];
  $: mediaComponent = components['profile-media'];
  $: collectionComponent = components['profile-collection'];
  $: linksComponent = components['profile-layout'];
  $: aliasesComponent = components['profile-aliases'];
  $: selectedTab = ['appearance', 'media', 'links', 'layout'].includes(activeTab) ? activeTab : 'appearance';

  function forwardPatch(scope, event) {
    dispatch('studiopatch', { scope, detail: event.detail || {} });
  }

  function forwardDirty(source, event) {
    dispatch('dirty', { ...(event.detail || {}), source });
  }

  export function getDraftIdentity() {
    return identityEditor?.getDraftIdentity?.() || null;
  }

  export function validateDraft() {
    return [identityEditor, appearanceEditor, linksEditor, layoutEditor]
      .filter(Boolean)
      .every(editor => editor.validateDraft?.() !== false);
  }

  export function acceptSaved(nextConfig) {
    identityEditor?.acceptSaved?.(nextConfig);
    appearanceEditor?.acceptSaved?.(nextConfig?.appearance || nextConfig);
    mediaWorkspaceEditor?.acceptSaved?.(nextConfig?.appearance || nextConfig);
    linksEditor?.acceptSaved?.(nextConfig);
    layoutEditor?.acceptSaved?.(nextConfig);
  }

  export function resetChanges() {
    identityEditor?.resetChanges?.();
    appearanceEditor?.resetChanges?.();
    mediaWorkspaceEditor?.resetChanges?.();
    linksEditor?.resetChanges?.();
    layoutEditor?.resetChanges?.();
  }
</script>

<div class="studio-customize" data-studio-customize-tab={selectedTab}>
  {#if selectedTab === 'appearance'}
    <div class="studio-panel" id="customize-appearance" role="region" aria-label="Profile appearance">
      <section id="customize-identity" class="studio-section studio-section--identity" aria-labelledby="studio-identity-title">
        <header class="studio-section__head">
          <div>
            <h2 id="studio-identity-title">Profile identity</h2>
            <p>Bio and the finite presentation controls currently supported by Profile Studio.</p>
          </div>
        </header>
        {#if identityComponent}
          <svelte:component
            this={identityComponent}
            bind:this={identityEditor}
            profileId={profileId}
            username={targetProfile?.username || accountUsername}
            bio={identityDraft?.bio ?? targetProfile?.bio ?? ''}
            publishedBio={targetProfile?.bio ?? ''}
            config={profileConfig}
            studio={true}
            on:identitypreview={event => forwardPatch('identity', event)}
            on:dirty={event => forwardDirty('customize:identity', event)}
          />
        {:else}
          <div class="studio-loading" role="status">Loading identity controls…</div>
        {/if}
      </section>

      <section class="studio-section studio-section--appearance" aria-label="Profile colors and surface">
        <ProfileAppearanceEditor
          bind:this={appearanceEditor}
          draftConfig={profileConfig?.draft}
          layoutVariant={profileConfig?.draft?.layoutVariant || profileConfig?.published?.layoutVariant || 'compact'}
          on:appearancechange={event => forwardPatch('appearance', event)}
          on:dirty={event => forwardDirty('customize:appearance', event)}
        />
      </section>

      <section id="customize-effects" class="studio-section studio-section--effects" aria-labelledby="studio-effects-title">
        {#if collectionComponent}
          <svelte:component
            this={collectionComponent}
            accountProfile={targetProfile}
            {profileConfig}
            compact={true}
            presentation="studio"
            stagedLoadout={cosmeticPreviewLoadout}
            on:cosmeticpreview={event => dispatch('cosmeticpreview', event.detail)}
            on:studiopatch={event => forwardPatch(event.detail?.scope || 'appearance', { detail: event.detail?.detail || {} })}
            on:dirty={event => forwardDirty('customize:appearance', event)}
          />
        {:else}
          <div class="studio-loading" role="status">Loading profile effects…</div>
        {/if}
      </section>
    </div>
  {:else if selectedTab === 'media'}
    <div class="studio-panel" id="customize-media" role="region" aria-label="Profile media">
      <section class="studio-section studio-section--media" aria-labelledby="studio-media-title">
        <header class="studio-section__head">
          <div>
            <h2 id="studio-media-title">Profile media</h2>
            <p>Avatar, background, audio, and cursor media are managed here through the profile media library.</p>
          </div>
        </header>
        {#if mediaComponent}
          <ProfileMediaWorkspace
            bind:this={mediaWorkspaceEditor}
            {mediaComponent}
            {profileId}
            {accountUsername}
            {targetProfile}
            {profileConfig}
            {staff}
            {entitlements}
            on:expressionchange={event => forwardPatch('media', event)}
            on:backgroundchange={event => forwardPatch('appearance-background', event)}
            on:dirty={event => forwardDirty('customize:media', event)}
          />
        {:else}
          <div class="studio-loading" role="status">Loading media controls…</div>
        {/if}
      </section>
    </div>
  {:else if selectedTab === 'links'}
    <div class="studio-panel" id="customize-links" role="region" aria-label="Profile links">
      <section class="studio-section studio-section--links" aria-labelledby="studio-links-title">
        <header class="studio-section__head">
          <div>
            <h2 id="studio-links-title">Profile links</h2>
            <p>Choose what people can open from your profile and shape the sharing details around it.</p>
          </div>
        </header>
        {#if linksComponent}
          <svelte:component
            this={linksComponent}
            bind:this={linksEditor}
            {profileId}
            draftConfig={profileConfig?.draft}
            publishedConfig={profileConfig?.published}
            updatedAt={profileConfig?.updatedAt}
            {entitlements}
            {staff}
            studio={true}
            presentation="customize"
            on:dirty={event => forwardDirty('customize:links', event)}
            on:configpreview={event => forwardPatch('links', event)}
          />
        {:else}
          <div class="studio-loading" role="status">Loading link controls…</div>
        {/if}
      </section>

      {#if aliasesComponent}
        <section class="studio-section studio-section--aliases" aria-labelledby="studio-aliases-title">
          <header class="studio-section__head">
            <div>
              <h2 id="studio-aliases-title">Profile aliases</h2>
              <p>Keep alternate share paths connected to your canonical profile.</p>
            </div>
          </header>
          <svelte:component this={aliasesComponent} />
        </section>
      {/if}
    </div>
  {:else}
    <div class="studio-panel" id="customize-layout" role="region" aria-label="Profile layout">
      <ProfileReferenceLayoutEditor
        bind:this={layoutEditor}
        draftConfig={profileConfig?.draft}
        publishedConfig={profileConfig?.published}
        on:studiopatch={event => forwardPatch(event.detail?.scope || 'layout', { detail: event.detail?.detail || {} })}
        on:dirty={event => forwardDirty('customize:layout', event)}
      />
    </div>
  {/if}
</div>

<style>
  .studio-customize {
    --studio-bg: var(--bg, #0e0e10);
    --studio-panel: var(--surface, #161619);
    --studio-card: var(--surface-2, #1e1e22);
    --studio-control: var(--surface-3, #28282c);
    --studio-control-deep: var(--surface, #161619);
    --studio-border: var(--border, rgba(255, 255, 255, .09));
    --studio-border-strong: var(--border, rgba(255, 255, 255, .09));
    --studio-border-soft: var(--border-soft, rgba(255, 255, 255, .05));
    --studio-text: var(--text, #f5f5f6);
    --studio-secondary: var(--text-muted, #8d8c92);
    --studio-muted: var(--text-muted, #8d8c92);
    --studio-faint: var(--text-faint, #59585e);
    --studio-accent: var(--site-brand-accent, var(--white, #ffffff));
    --studio-danger: #ff5578;
    width: 100%;
    min-width: 0;
    color: var(--studio-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
  }

  .studio-panel {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 26px;
    border: 1px solid var(--studio-border);
    border-radius: 18px;
    background: var(--studio-panel);
    backdrop-filter: blur(28px) saturate(145%);
    box-shadow: 0 26px 70px rgba(0, 0, 0, .24);
  }

  .studio-section {
    min-width: 0;
    padding: 0 0 27px;
    margin: 0 0 27px;
    border-bottom: 1px solid var(--studio-border);
  }

  .studio-section:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: 0; }
  .studio-section__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 15px; }
  .studio-section__head h2 { margin: 0; color: var(--studio-text); font: 600 1.05rem/1.2 'Manrope Variable', var(--font-display-stack, sans-serif); letter-spacing: -.02em; }
  .studio-section__head p { max-width: 420px; margin: 5px 0 0; color: var(--studio-muted); font: 400 .68rem/1.45 'Inter', var(--font-body-stack, sans-serif); }
  .studio-loading { display: grid; min-height: 7rem; place-items: center; color: var(--studio-muted); font: 400 .78rem/1.4 'Inter', sans-serif; }

  /* IdentityEditor keeps its validation and preview contract; Studio owns its
   * reference geometry and deliberately removes the old module chrome. */
  .studio-customize :global(.identity-editor--studio .foundation-module__header),
  .studio-customize :global(.identity-editor--studio .foundation-module__description) { display: none !important; }
  .studio-customize :global(.foundation-module.identity-editor--studio),
  .studio-customize :global(.identity-editor--studio .foundation-module__body) { width: 100%; padding: 0 !important; border: 0 !important; background: transparent !important; box-shadow: none !important; }
  .studio-customize :global(.identity-editor--studio .identity-editor__form) { display: block !important; }
  .studio-customize :global(.identity-editor--studio .identity-editor__fields) { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field--username) { grid-column: 1; grid-row: 1; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field[for='profile-bio']) { grid-column: 1 / -1; grid-row: 2; top: auto; }
  .studio-customize :global(.identity-editor--studio .identity-editor__grid) { display: contents !important; }
  .studio-customize :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:first-child) { grid-column: 2; grid-row: 1; position: static; }
  .studio-customize :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:last-child) { grid-column: 1; grid-row: 3; position: static; }
  .studio-customize :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:first-child) { grid-column: 2; grid-row: 3; position: static; }
  .studio-customize :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:last-child) { grid-column: 1; grid-row: 4; position: static; }
  .studio-customize :global(.identity-editor--studio .identity-editor__options) { grid-column: 1 / -1; grid-row: 5; position: static; min-height: 40px; margin: 0; padding: 0; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field :is(input, textarea, select)) { min-height: 40px; border: 1px solid var(--studio-border) !important; border-radius: 7px; background: var(--studio-control) !important; color: var(--studio-text) !important; font: 500 .78rem/1.35 'Inter', sans-serif; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field textarea) { min-height: 76px; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field > span),
  .studio-customize :global(.identity-editor--studio .identity-editor__options) { color: var(--studio-muted); font: 400 .64rem/1.35 'Inter', sans-serif; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field > span) { letter-spacing: .055em; text-transform: uppercase; }
  .studio-customize :global(.identity-editor--studio .identity-editor__field > span small) { letter-spacing: 0; text-transform: none; }
  .studio-customize :global(.identity-editor--studio .identity-editor__label-row) { align-items: baseline; }
  .studio-customize :global(.identity-editor--studio .identity-editor__counter) { color: var(--studio-faint); font: 400 .61rem/1 'Inter', sans-serif; }
  .studio-customize :global(.identity-editor--studio .identity-editor__footer) { display: none !important; }

  /* AppearanceEditor owns color/picker behavior. These rules only restore the
   * reference's panel geometry and palette, with no Catppuccin fallbacks. */
  .studio-customize :global(.appearance-editor) { gap: 27px; }
  .studio-customize :global(.appearance-editor__colors-layout) { grid-template-columns: minmax(0, 1fr) !important; gap: 10px; }
  .studio-customize :global(.appearance-editor__color-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; padding: 0; border: 0; border-radius: 0; background: transparent; }
  .studio-customize :global(.appearance-editor__colors-heading) { grid-column: 1 / -1; }
  .studio-customize :global(.appearance-editor__colors-heading h2),
  .studio-customize :global(.appearance-editor__heading h2) { color: var(--studio-text) !important; font: 600 1.05rem/1.2 'Manrope Variable', sans-serif !important; }
  .studio-customize :global(.appearance-editor__colors-heading p),
  .studio-customize :global(.appearance-editor__heading p) { color: var(--studio-muted) !important; font: 400 .68rem/1.45 'Inter', sans-serif !important; }
  .studio-customize :global(.appearance-editor__field) { min-width: 0; }
  .studio-customize :global(.appearance-editor__color-grid .appearance-editor__field) { grid-template-columns: minmax(0, 1fr) 92px; min-height: 40px; padding: 9px 10px; border: 1px solid var(--studio-border); border-radius: 8px; background: var(--studio-control); }
  .studio-customize :global(.appearance-editor__field > span),
  .studio-customize :global(.appearance-editor__range > span) { color: var(--studio-secondary) !important; font: 400 .7rem/1.3 'Inter', sans-serif !important; }
  .studio-customize :global(.appearance-editor__color-dot) { width: 13px; height: 13px; box-shadow: 0 0 10px color-mix(in srgb, var(--dot-color) 35%, transparent); }
  .studio-customize :global(.appearance-editor__color-input) { display: block; min-height: 29px; height: 29px; overflow: visible; border: 0; border-radius: 0; background: transparent; }
  .studio-customize :global(.appearance-editor__color-input:focus-within) { border-color: transparent; box-shadow: none; }
  .studio-customize :global(.appearance-editor__hex) { min-height: 29px; height: 29px; box-sizing: border-box; padding: 0 7px !important; border: 1px solid var(--studio-border-strong); border-radius: 7px; background: var(--studio-control-deep) !important; color: var(--studio-text) !important; font: 500 .64rem/1 ui-monospace, monospace !important; }
  .studio-customize :global(.appearance-editor__panel:not(.appearance-editor__panel--colors)) { min-height: 0; padding: 0; border: 0; border-radius: 0; background: transparent; }
  .studio-customize :global(.appearance-editor__surface-grid) { grid-template-columns: 1.15fr 1fr 1fr; gap: 13px; padding: 0; }
  .studio-customize :global(.appearance-editor__surface-intro) { grid-column: 1 / -1; }
  .studio-customize :global(.appearance-editor__surface-color) { align-self: end; grid-template-columns: minmax(0, 1fr); }
  .studio-customize :global(.appearance-editor__surface-color .appearance-editor__color-input),
  .studio-customize :global(.appearance-editor__surface-color .appearance-editor__hex) { min-height: 40px; height: 40px; }
  .studio-customize :global(.appearance-editor__range) { margin-top: 0; gap: 8px; }
  .studio-customize :global(.appearance-editor__range output) { color: var(--studio-faint); font: 500 .62rem/1 'Inter', sans-serif; }
  .studio-customize :global(.appearance-editor__range input) { accent-color: var(--studio-accent); }
  .studio-customize :global(.appearance-editor__picker) { display: none; }
  .studio-customize :global(.appearance-editor__picker-toggle) { display: none !important; }
  .studio-customize :global(.appearance-editor--picker-open .appearance-editor__picker) { display: grid; }
  .studio-customize :global(.appearance-editor__message) { color: var(--studio-danger); font: 400 .7rem/1.4 'Inter', sans-serif; }

  /* Cosmetic behavior remains in ProfileCosmeticsEditor; its Studio branch
   * is flattened into the reference effect-card grid. */
  .studio-customize :global(.profile-cosmetics-surface--studio) { width: 100%; padding: 0 !important; border: 0 !important; background: transparent !important; box-shadow: none !important; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-heading),
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-controls__heading),
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-section-heading--visual) { display: none !important; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-layout),
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-controls) { display: block; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading) { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 1rem; margin: 0 0 15px; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading > div) { min-width: 0; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading h2) { margin: 0; color: var(--studio-text); font: 600 1.05rem/1.2 'Manrope Variable', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading p) { max-width: 420px; margin: 5px 0 0; color: var(--studio-muted); font: 400 .68rem/1.45 'Inter', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading button) { align-self: start; min-height: 0; padding: 0; border: 0; background: transparent; color: var(--studio-muted); font: 400 .63rem/1 'Inter', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-name-grid),
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-visual-grid) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-name-grid) { margin-bottom: 10px; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-section-heading) { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin: 0 0 15px; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-section-heading h3) { margin: 0; color: var(--studio-text); font: 600 1.05rem/1.2 'Manrope Variable', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-section-heading p) { display: block; max-width: 420px; margin: 5px 0 0; color: var(--studio-muted); font: 400 .68rem/1.45 'Inter', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-section-heading button) { align-self: start; border: 0; background: transparent; color: var(--studio-muted); font: 400 .63rem/1 'Inter', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-slot) { min-width: 0; padding: 11px; border: 1px solid var(--studio-border); border-radius: 9px; background: var(--studio-control); }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-slot label) { color: var(--studio-secondary); font: 400 .7rem/1.3 'Inter', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-slot select) { min-height: 34px; border: 1px solid var(--studio-border); border-radius: 6px; background: var(--studio-control-deep); color: var(--studio-text); font: 500 .66rem/1 'Inter', sans-serif; }
  .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-apply) { min-height: 36px; margin-top: 12px; border-radius: 7px; background: var(--studio-accent); color: #050506; font: 700 .7rem/1 'Inter', sans-serif; }

  .studio-customize :global(.aliases-editor) { min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; font-family: 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor .foundation-module__header) { display: none; }
  .studio-customize :global(.aliases-editor__content) { gap: 13px; }
  .studio-customize :global(.aliases-editor__row),
  .studio-customize :global(.aliases-editor__empty),
  .studio-customize :global(.aliases-editor__state) { padding: 11px; border: 1px solid var(--studio-border); border-radius: 8px; background: var(--studio-control); color: var(--studio-secondary); }
  .studio-customize :global(.aliases-editor__row a) { color: var(--studio-text); font: 500 .74rem/1.3 ui-monospace, monospace; }
  .studio-customize :global(.aliases-editor__row a:hover) { color: var(--studio-accent); }
  .studio-customize :global(.aliases-editor__empty strong) { color: var(--studio-text); font: 600 .78rem/1.25 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor__empty p),
  .studio-customize :global(.aliases-editor__state),
  .studio-customize :global(.aliases-editor__form small) { color: var(--studio-muted); font: 400 .68rem/1.45 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor__form) { gap: 8px; padding-top: 13px; border-top-color: var(--studio-border); }
  .studio-customize :global(.aliases-editor__form label) { color: var(--studio-secondary); font: 400 .7rem/1.3 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor__prefix),
  .studio-customize :global(.aliases-editor__input-row input) { min-height: 38px; border-color: var(--studio-border-strong); border-radius: 8px; background: var(--studio-control-deep); color: var(--studio-text); font: 500 .72rem/1.2 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor__prefix) { padding-inline: 11px; }
  .studio-customize :global(.aliases-editor__save),
  .studio-customize :global(.aliases-editor__remove) { min-height: 38px; border-color: var(--studio-border-strong); border-radius: 8px; padding: 0 12px; background: transparent; color: var(--studio-secondary); font: 600 .68rem/1 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor__save) { border-color: var(--studio-accent); color: var(--studio-accent); }
  .studio-customize :global(.aliases-editor__save:hover:not(:disabled)) { background: color-mix(in srgb, var(--studio-accent) 10%, transparent); color: var(--studio-text); }
  .studio-customize :global(.aliases-editor__remove:hover:not(:disabled)) { border-color: var(--studio-danger); color: var(--studio-danger); }
  .studio-customize :global(.aliases-editor__message) { color: var(--studio-accent); font: 400 .7rem/1.4 'Inter', sans-serif; }
  .studio-customize :global(.aliases-editor__message--error) { color: var(--studio-danger); }

  .studio-customize :global(input:focus-visible),
  .studio-customize :global(textarea:focus-visible),
  .studio-customize :global(select:focus-visible),
  .studio-customize :global(button:focus-visible) { outline: 2px solid var(--studio-accent); outline-offset: 2px; }

  @media (max-width: 52rem) {
    .studio-panel { padding: 20px; }
    .studio-customize :global(.appearance-editor__color-grid),
    .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-name-grid),
    .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-visual-grid) { grid-template-columns: minmax(0, 1fr); }
    .studio-customize :global(.appearance-editor__surface-grid) { grid-template-columns: minmax(0, 1fr); }
    .studio-customize :global(.appearance-editor__surface-intro) { grid-column: 1; }
    .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading) { grid-template-columns: minmax(0, 1fr); }
    .studio-customize :global(.profile-cosmetics-surface--studio .profile-cosmetics-studio-heading button) { justify-self: start; }
  }

  @media (max-width: 38rem) {
    .studio-panel { padding: 16px; }
    .studio-customize :global(.identity-editor--studio .identity-editor__fields) { grid-template-columns: minmax(0, 1fr); }
    .studio-customize :global(.identity-editor--studio .identity-editor__field--username),
    .studio-customize :global(.identity-editor--studio .identity-editor__field[for='profile-bio']),
    .studio-customize :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:first-child),
    .studio-customize :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:last-child),
    .studio-customize :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:first-child),
    .studio-customize :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:last-child),
    .studio-customize :global(.identity-editor--studio .identity-editor__options) { grid-column: 1; grid-row: auto; }
  }

  @media (prefers-reduced-motion: reduce) {
    .studio-customize :global(*) { scroll-behavior: auto; }
  }
</style>
