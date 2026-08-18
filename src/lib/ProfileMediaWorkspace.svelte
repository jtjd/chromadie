<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileBackgroundTreatment from './ProfileBackgroundTreatment.svelte';

  export let mediaComponent = /** @type {any} */ (null);
  export let profileId = null;
  export let accountUsername = '';
  export let targetProfile = {};
  export let profileConfig = {};
  export let entitlements = [];
  export let staff = false;

  const dispatch = createEventDispatcher();
  let backgroundTreatmentEditor = null;

  function forward(event) {
    dispatch(event.type, event.detail);
  }

  export function getDraftBackground() {
    return backgroundTreatmentEditor?.getDraftBackground?.();
  }

  export function acceptSaved(nextAppearance) {
    backgroundTreatmentEditor?.acceptSaved?.(nextAppearance);
  }

  export function resetChanges() {
    backgroundTreatmentEditor?.resetChanges?.();
  }
</script>

<div class="profile-media-workspace" data-media-workspace-layout="reference">
  {#if mediaComponent}
    <svelte:component
      this={mediaComponent}
      profileId={profileId}
      config={profileConfig}
      fallbackInitial={(targetProfile?.username || accountUsername || '✦').slice(0, 1)}
      {staff}
      {entitlements}
      compact={true}
      on:expressionchange={forward}
    />
    <ProfileBackgroundTreatment
      bind:this={backgroundTreatmentEditor}
      draftAppearance={profileConfig?.draft?.appearance}
      on:backgroundchange={forward}
      on:dirty={forward}
    />
  {:else}
    <div class="profile-media-workspace__loading" role="status">Loading media controls…</div>
  {/if}
</div>

<style>
  .profile-media-workspace {
    display: grid;
    container: profile-media / inline-size;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 10px;
    min-width: 0;
    color: #f8f8f8;
    font-family: 'Inter', var(--font-body-stack, sans-serif);
  }

  /* The compact editor owns upload and mutation behavior. Studio owns the
   * reference geometry, so the child module chrome is intentionally flattened
   * into this two-column media workspace. */
  .profile-media-workspace :global(.profile-expression-editor),
  .profile-media-workspace :global(.profile-expression-editor > .foundation-module__body),
  .profile-media-workspace :global(.profile-expression-editor__compact-grid),
  .profile-media-workspace :global(.rich-media-editor--compact),
  .profile-media-workspace :global(.rich-media-editor--compact > .foundation-module__body) {
    display: contents;
  }

  .profile-media-workspace :global(.profile-expression-editor > .foundation-module__header),
  .profile-media-workspace :global(.rich-media-editor--compact > .foundation-module__header) {
    display: none;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--background) { order: 1; }
  .profile-media-workspace :global(.profile-expression-editor__compact-card--avatar) { order: 2; }
  .profile-media-workspace :global(.profile-expression-editor__compact-card--audio),
  .profile-media-workspace :global(.rich-media-editor__compact-card--audio) { order: 3; }
  .profile-media-workspace :global(.profile-expression-editor__compact-card--cursor),
  .profile-media-workspace :global(.rich-media-editor__compact-card--cursor) { order: 4; }

  .profile-media-workspace :global(.profile-expression-editor__compact-library),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify),
  .profile-media-workspace :global(.profile-background-treatment) {
    grid-column: 1 / -1;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify) { order: 5; }
  .profile-media-workspace :global(.profile-background-treatment) { order: 6; }
  .profile-media-workspace :global(.profile-expression-editor__compact-library) { order: 7; }
  .profile-media-workspace :global(.profile-expression-editor__message) {
    grid-column: 1 / -1;
    order: 0;
    margin: 0;
    color: #8f9099;
    font: 400 .78rem/1.4 'Inter', var(--font-body-stack, sans-serif);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card),
  .profile-media-workspace :global(.rich-media-editor__compact-card) {
    --media-card-accent: var(--studio-accent, #D8A6FF);
    display: grid;
    grid-template-rows: 115px auto;
    align-content: start;
    gap: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, .10);
    border-radius: 9px;
    background: rgba(255, 255, 255, .035);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview),
  .profile-media-workspace :global(.rich-media-editor__compact-preview),
  .profile-media-workspace :global(.profile-expression-editor__compact-audio-player) {
    order: 1;
    width: 100%;
    height: 115px;
    min-height: 115px;
    aspect-ratio: auto;
    overflow: hidden;
    padding: 0;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    border-radius: 0;
    background: rgba(0, 0, 0, .22);
    color: #85868e;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview:hover:not(:disabled)),
  .profile-media-workspace :global(.rich-media-editor__compact-preview:hover:not(:disabled)) {
    border-color: rgba(255, 255, 255, .08);
    background: rgba(0, 0, 0, .22);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview:focus-visible),
  .profile-media-workspace :global(.rich-media-editor__compact-preview:focus-visible) {
    outline: 2px solid var(--studio-accent, #D8A6FF);
    outline-offset: -2px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview .profile-media-icon),
  .profile-media-workspace :global(.rich-media-editor__compact-preview .profile-media-icon) {
    width: 2.35rem;
    height: 2.35rem;
    color: #85868e;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-upload-hint),
  .profile-media-workspace :global(.rich-media-editor__compact-upload-hint) { display: none; }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--avatar .profile-expression-editor__compact-preview) {
    place-items: center;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-avatar-frame) {
    width: 76px;
    height: 76px;
    flex: 0 0 76px;
    border: 2px solid var(--studio-accent, #D8A6FF);
    border-radius: 50%;
    background: #101014;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-copy),
  .profile-media-workspace :global(.rich-media-editor__compact-copy) {
    display: grid;
    align-content: start;
    gap: 4px;
    order: 2;
    min-width: 0;
    padding: 11px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-copy strong),
  .profile-media-workspace :global(.rich-media-editor__compact-copy strong) {
    display: block;
    overflow: visible;
    color: #f8f8f8;
    font: 600 .73rem/1.2 'Inter', var(--font-body-stack, sans-serif);
    letter-spacing: 0;
    text-overflow: clip;
    white-space: normal;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-copy strong::before),
  .profile-media-workspace :global(.rich-media-editor__compact-copy strong::before) { display: none; }

  .profile-media-workspace :global(.profile-expression-editor__compact-copy small),
  .profile-media-workspace :global(.rich-media-editor__compact-copy small) {
    display: block;
    color: #6d6e76;
    font: 400 .59rem/1.4 'Inter', var(--font-body-stack, sans-serif);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-actions),
  .profile-media-workspace :global(.rich-media-editor__compact-actions) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    margin-top: 4px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-actions button),
  .profile-media-workspace :global(.rich-media-editor__compact-actions button),
  .profile-media-workspace :global(.profile-expression-editor__compact-library-delete),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify button) {
    min-height: 31px;
    padding: 0 9px;
    border: 1px solid rgba(255, 255, 255, .20);
    border-radius: 6px;
    background: transparent;
    color: #a8a9b0;
    font: 500 .63rem/1 'Inter', var(--font-body-stack, sans-serif);
    cursor: pointer;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-actions button:hover:not(:disabled)),
  .profile-media-workspace :global(.rich-media-editor__compact-actions button:hover:not(:disabled)),
  .profile-media-workspace :global(.profile-expression-editor__compact-actions button:focus-visible),
  .profile-media-workspace :global(.rich-media-editor__compact-actions button:focus-visible),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify button:hover:not(:disabled)),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify button:focus-visible) {
    border-color: var(--studio-accent, #D8A6FF);
    color: #f8f8f8;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-remove),
  .profile-media-workspace :global(.rich-media-editor__compact-remove),
  .profile-media-workspace :global(.profile-expression-editor__compact-library-delete),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-remove) {
    border-color: rgba(255, 85, 120, .55);
    color: #ff5578;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-remove:hover:not(:disabled)),
  .profile-media-workspace :global(.rich-media-editor__compact-remove:hover:not(:disabled)),
  .profile-media-workspace :global(.profile-expression-editor__compact-library-delete:hover:not(:disabled)),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-remove:hover:not(:disabled)) {
    border-color: #ff5578;
    color: #ff5578;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-actions button:focus-visible),
  .profile-media-workspace :global(.rich-media-editor__compact-actions button:focus-visible),
  .profile-media-workspace :global(.profile-expression-editor__compact-library-delete:focus-visible),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify button:focus-visible) {
    outline: 2px solid var(--studio-accent, #D8A6FF);
    outline-offset: 2px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--locked) { opacity: 1; }
  .profile-media-workspace :global(.profile-expression-editor__compact-card--locked .profile-expression-editor__compact-preview),
  .profile-media-workspace :global(.rich-media-editor__compact-card--locked .rich-media-editor__compact-preview) { cursor: default; }

  .profile-media-workspace :global(.profile-expression-editor__compact-audio-player) {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 11px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-audio-play) {
    width: 2.25rem;
    height: 2.25rem;
    border-color: rgba(255, 255, 255, .20);
    background: transparent;
    color: #f8f8f8;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-audio-play:hover) {
    border-color: var(--studio-accent, #D8A6FF);
    background: color-mix(in srgb, var(--studio-accent, #D8A6FF) 8%, transparent);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-audio-track) { gap: 5px; }
  .profile-media-workspace :global(.profile-expression-editor__compact-audio-meta strong) { color: #a8a9b0; font: 500 .63rem/1 'Inter', sans-serif; }
  .profile-media-workspace :global(.profile-expression-editor__compact-audio-meta time) { color: #6d6e76; font: 500 .62rem/1 'Inter', sans-serif; }

  .profile-media-workspace :global(.profile-expression-editor__compact-library),
  .profile-media-workspace :global(.profile-expression-editor__compact-spotify),
  .profile-media-workspace :global(.profile-background-treatment) {
    box-sizing: border-box;
    width: 100%;
    padding: 27px 0 0;
    margin-top: 17px;
    border-top: 1px solid rgba(255, 255, 255, .10);
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 0;
    background: transparent;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-heading),
  .profile-media-workspace :global(.profile-background-treatment__heading) {
    display: block;
    margin-bottom: 15px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-heading h3),
  .profile-media-workspace :global(.profile-background-treatment__heading h3),
  .profile-media-workspace :global(.profile-expression-editor__compact-library-heading strong) {
    display: block;
    margin: 0;
    color: #f8f8f8;
    font: 600 1.05rem/1.2 'Manrope Variable', var(--font-display-stack, sans-serif);
    letter-spacing: -.01em;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-heading p),
  .profile-media-workspace :global(.profile-background-treatment__heading p),
  .profile-media-workspace :global(.profile-expression-editor__compact-library-heading span) {
    display: block;
    max-width: 420px;
    margin: 5px 0 0;
    color: #8f9099;
    font: 400 .68rem/1.45 'Inter', var(--font-body-stack, sans-serif);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row input) {
    width: 100%;
    min-height: 40px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, .10);
    border-radius: 7px;
    background: rgba(255, 255, 255, .035);
    padding: 0 11px;
    outline: 0;
    color: #ededf0;
    font: 400 .76rem/1 'Inter', sans-serif;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row input:focus) {
    border-color: var(--studio-accent, #D8A6FF);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--studio-accent, #D8A6FF) 8%, transparent);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-library) {
    display: grid;
    gap: 15px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-library-heading) { display: block; }
  .profile-media-workspace :global(.profile-expression-editor__compact-library-list) { display: grid; gap: 8px; }
  .profile-media-workspace :global(.profile-expression-editor__compact-library-item) {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, .10);
    border-radius: 8px;
    background: rgba(255, 255, 255, .035);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-library-media) {
    width: 54px;
    height: 42px;
    overflow: hidden;
    border-radius: 6px;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-library-media--wide) { width: 54px; height: 42px; }
  .profile-media-workspace :global(.profile-expression-editor__compact-library-copy) { display: grid; gap: 3px; min-width: 0; }
  .profile-media-workspace :global(.profile-expression-editor__compact-library-copy strong) { overflow: hidden; color: #f8f8f8; font: 600 .69rem/1.2 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .profile-media-workspace :global(.profile-expression-editor__compact-library-copy span) { overflow: hidden; color: #6d6e76; font: 400 .58rem/1.2 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }

  .profile-media-workspace :global(.profile-background-treatment) {
    display: grid;
    gap: 0;
    color: #f8f8f8;
  }

  .profile-media-workspace :global(.profile-background-treatment__controls) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 11px;
    align-items: end;
  }

  .profile-media-workspace :global(.profile-background-treatment label) { display: grid; gap: 8px; min-width: 0; }
  .profile-media-workspace :global(.profile-background-treatment label > span) { display: flex; justify-content: space-between; gap: 10px; color: #92939b; font: 400 .68rem/1 'Inter', sans-serif; }
  .profile-media-workspace :global(.profile-background-treatment output) { color: #6d6e76; font: 500 .62rem/1 'Inter', sans-serif; }
  .profile-media-workspace :global(.profile-background-treatment input[type="range"]) { width: 100%; accent-color: var(--studio-accent, #D8A6FF); }
  .profile-media-workspace :global(.profile-background-treatment__color > div) { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 7px; border: 1px solid rgba(255, 255, 255, .10); border-radius: 7px; background: rgba(255, 255, 255, .035); }
  .profile-media-workspace :global(.profile-background-treatment__color > span) { display: block; color: #92939b; font: 400 .68rem/1 'Inter', sans-serif; }
  .profile-media-workspace :global(.profile-background-treatment__color input[type="color"]) { width: 1.55rem; height: 1.55rem; padding: .12rem; border: 0; background: transparent; }
  .profile-media-workspace :global(.profile-background-treatment code) { color: #ededf0; font: 500 .64rem/1 ui-monospace, monospace; }

  .profile-media-workspace__loading {
    grid-column: 1 / -1;
    display: grid;
    min-height: 7rem;
    place-items: center;
    color: #8f9099;
    font: 400 .78rem/1.4 'Inter', sans-serif;
  }

  @media (max-width: 52rem) {
    .profile-media-workspace :global(.profile-expression-editor__compact-library-item) { grid-template-columns: 54px minmax(0, 1fr); }
    .profile-media-workspace :global(.profile-expression-editor__compact-library-delete) { grid-column: 2; justify-self: start; }
  }

  @media (max-width: 34rem) {
    .profile-media-workspace { grid-template-columns: minmax(0, 1fr); }
    .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row) { grid-template-columns: minmax(0, 1fr); }
    .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row button) { justify-self: start; }
    .profile-media-workspace :global(.profile-background-treatment__controls) { grid-template-columns: minmax(0, 1fr); }
  }

  @container profile-media (max-width: 34rem) {
    .profile-media-workspace { grid-template-columns: minmax(0, 1fr); }
    .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row) { grid-template-columns: minmax(0, 1fr); }
    .profile-media-workspace :global(.profile-expression-editor__compact-spotify-row button) { justify-self: start; }
    .profile-media-workspace :global(.profile-background-treatment__controls) { grid-template-columns: minmax(0, 1fr); }
  }
</style>
