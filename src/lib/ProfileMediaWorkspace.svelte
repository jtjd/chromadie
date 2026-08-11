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
      on:appearancechange={forward}
      on:dirty={forward}
    />
  {:else}
    <div class="profile-media-workspace__loading" role="status">Loading media controls…</div>
  {/if}
</div>

<style>
  .profile-media-workspace {
    display: grid;
    grid-template-columns: minmax(12rem, .9fr) minmax(12rem, .9fr) minmax(0, 1.5fr);
    grid-auto-rows: max-content;
    align-items: start;
    gap: .65rem;
    min-width: 0;
    color: var(--customize-text-primary, #cdd6f4);
  }

  /* The compact media editor is intentionally flattened into this workspace
   * grid. Its upload handlers and draft contract stay in the child editor;
   * only the presentation ownership moves here. */
  .profile-media-workspace :global(.profile-expression-editor),
  .profile-media-workspace :global(.profile-expression-editor > .foundation-module__body),
  .profile-media-workspace :global(.profile-expression-editor__compact-grid) { display: contents; }
  .profile-media-workspace :global(.profile-expression-editor > .foundation-module__header) { display: none; }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--background) {
    grid-column: 1;
    grid-row: 1;
    order: initial;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--avatar) {
    grid-column: 2;
    grid-row: 1;
    order: initial;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--audio),
  .profile-media-workspace :global(.rich-media-editor__compact-card--audio) {
    grid-column: 3;
    grid-row: 1;
    order: initial;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card--cursor),
  .profile-media-workspace :global(.rich-media-editor__compact-card--cursor) {
    grid-column: 1;
    grid-row: 2;
    order: initial;
  }

  .profile-media-workspace :global(.profile-background-treatment) {
    grid-column: 2 / -1;
    grid-row: 2;
    align-self: start;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-card),
  .profile-media-workspace :global(.rich-media-editor__compact-card) {
    grid-template-rows: minmax(1.05rem, auto) minmax(0, auto) auto;
    min-height: 0;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview),
  .profile-media-workspace :global(.rich-media-editor__compact-preview),
  .profile-media-workspace :global(.profile-expression-editor__compact-audio-player) {
    min-height: clamp(5.25rem, 8vw, 7.25rem);
    height: clamp(5.25rem, 8vw, 7.25rem);
    aspect-ratio: auto;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview--avatar) {
    aspect-ratio: auto;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-audio-player) {
    min-height: clamp(5.75rem, 8vw, 7.25rem);
    height: clamp(5.75rem, 8vw, 7.25rem);
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-audio-player .profile-audio-waveform) {
    min-height: 1.7rem;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview .profile-expression-editor__compact-media),
  .profile-media-workspace :global(.rich-media-editor__compact-preview img),
  .profile-media-workspace :global(.rich-media-editor__cursor-badge) {
    max-height: 100%;
  }

  .profile-media-workspace :global(.profile-expression-editor__compact-preview--avatar .foundation-media),
  .profile-media-workspace :global(.profile-expression-editor__compact-preview--avatar .foundation-media img) {
    max-width: min(4.6rem, 58%);
    max-height: min(4.6rem, 78%);
  }

  .profile-media-workspace :global(.profile-background-treatment) {
    gap: .55rem;
    padding: .65rem;
    background: var(--customize-surface-inset, #1e1e2e);
  }

  .profile-media-workspace :global(.profile-background-treatment__heading p) {
    margin-top: .18rem;
    font-size: .68rem;
  }

  .profile-media-workspace :global(.profile-background-treatment__controls) {
    gap: .55rem .8rem;
  }

  .profile-media-workspace__loading {
    grid-column: 1 / -1;
    display: grid;
    min-height: 7rem;
    place-items: center;
    color: var(--customize-text-muted, #a6adc8);
  }

  @media (max-width: 52rem) {
    .profile-media-workspace {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .profile-media-workspace :global(.profile-expression-editor__compact-card--audio),
    .profile-media-workspace :global(.rich-media-editor__compact-card--audio) {
      grid-column: 1;
      grid-row: 2;
    }

    .profile-media-workspace :global(.profile-expression-editor__compact-card--cursor),
    .profile-media-workspace :global(.rich-media-editor__compact-card--cursor) {
      grid-column: 2;
      grid-row: 2;
    }

    .profile-media-workspace :global(.profile-background-treatment) {
      grid-column: 1 / -1;
      grid-row: 3;
    }
  }

  @media (max-width: 30rem) {
    .profile-media-workspace {
      grid-template-columns: minmax(0, 1fr);
    }

    .profile-media-workspace :global(.profile-expression-editor__compact-card--background),
    .profile-media-workspace :global(.profile-expression-editor__compact-card--avatar),
    .profile-media-workspace :global(.profile-expression-editor__compact-card--audio),
    .profile-media-workspace :global(.rich-media-editor__compact-card--audio),
    .profile-media-workspace :global(.profile-expression-editor__compact-card--cursor),
    .profile-media-workspace :global(.rich-media-editor__compact-card--cursor),
    .profile-media-workspace :global(.profile-background-treatment) {
      grid-column: 1;
      grid-row: auto;
    }
  }
</style>
