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
      <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5.5v2a3.5 3.5 0 0 0 3.2 3.48M16 5h2.5v2a3.5 3.5 0 0 1-3.2 3.48M12 12.5v3M8.5 19.5h7M10 15.5h4" />
    </svg>
  {:else if normalizedTrack === 'ritual'}
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M13.5 3.5c.35 2.05-.28 3.37-1.8 4.75-1.2 1.08-1.7 2.2-1.42 3.43.24 1.05 1.08 1.73 2.12 1.73 1.12 0 1.94-.8 2.08-2.08 1.76 1.2 2.72 2.82 2.72 4.65A5.2 5.2 0 0 1 12 21.2a6.2 6.2 0 0 1-6.2-6.2c0-2.42 1.16-4.35 3.04-6.17.18 1.33.73 2.2 1.56 2.73-.2-2.7.92-5.36 3.1-8.06Z" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="8.25" />
      <path d="m14.8 9.2-2.35 5.6-5.25 2.35 2.35-5.6 5.25-2.35Z" />
      <circle cx="12.45" cy="12.45" r=".8" fill="currentColor" stroke="none" />
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

  .progression-path-icon--rank { color: #ffd21c; }
  .progression-path-icon--ritual { color: #ff5c68; }
  .progression-path-icon--ritual svg path { fill: currentColor; stroke-width: .75; }
  .progression-path-icon--discovery { color: #22d7f3; }
  .progression-path-icon--future { opacity: .48; }
</style>
