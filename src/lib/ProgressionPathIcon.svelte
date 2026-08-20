<script>
  export let track = 'rank';
  export let state = 'future';

  $: normalizedTrack = track === 'ritual' || track === 'discovery' ? track : 'rank';
  $: normalizedState = state === 'complete' || state === 'active' || state === 'new' ? state : 'future';
</script>

<span
  class={`progression-path-icon progression-path-icon--${normalizedTrack} progression-path-icon--${normalizedState}`}
  aria-hidden="true"
>
  {#if normalizedTrack === 'rank'}
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M4.5 17.5a7.5 7.5 0 0 1 15 0" />
      <path d="M12 4v5" />
      <path d="m9.5 6.5 2.5-2.5 2.5 2.5" />
    </svg>
  {:else if normalizedTrack === 'ritual'}
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M4 12h16" />
      <circle cx="4" cy="12" r="1.6" />
      <circle cx="10" cy="12" r="1.6" />
      <circle cx="16" cy="12" r="1.6" />
      <circle cx="22" cy="12" r="1.6" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="m12 3.5 7.2 4.25v8.5L12 20.5l-7.2-4.25v-8.5L12 3.5Z" />
      <path d="m4.8 7.75 7.2 4.4 7.2-4.4M12 12.15v8.35" />
    </svg>
  {/if}
</span>

<style>
  .progression-path-icon {
    display: inline-grid;
    place-items: center;
    flex: 0 0 1.55rem;
    width: 1.55rem;
    height: 1.55rem;
    color: var(--color-ink-muted);
  }

  .progression-path-icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.35;
  }

  .progression-path-icon--complete { color: var(--color-ink-strong); }
  .progression-path-icon--active,
  .progression-path-icon--new { color: var(--color-ink-strong); }
  .progression-path-icon--future { opacity: .65; }
</style>
