<script>
  import { createEventDispatcher } from 'svelte';

  export let accent = '#8B7CF6';
  export let isPlaying = false;
  export let volume = 0.75;
  export let placement = 'inline';
  export let label = 'Profile audio';

  const dispatch = createEventDispatcher();

  function handleVolumeInput(event) {
    volume = Number(event.currentTarget.value);
    dispatch('volumechange', volume);
  }
</script>

<div class={'profile-audio-control profile-audio-control--' + placement} style={'--profile-audio-accent: ' + accent} aria-label={label}>
  <button type="button" class="profile-audio-control__toggle" aria-label={isPlaying ? 'Pause profile audio' : 'Play profile audio'} title={isPlaying ? 'Pause profile audio' : 'Play profile audio'} aria-pressed={isPlaying} on:click={() => dispatch('toggle')}>
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {#if isPlaying}
        <path d="M7 5.5v13M17 5.5v13" />
      {:else}
        <path d="m8 5 10 7-10 7V5Z" />
      {/if}
    </svg>
  </button>
  <label class="profile-audio-control__volume" aria-label="Profile audio volume">
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.2 1.1a4 4 0 0 1 0 3.8m2.15-6a8 8 0 0 1 0 8.2" /></svg>
    <input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" on:input={handleVolumeInput} />
  </label>
</div>

<style>
  .profile-audio-control {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    pointer-events: auto;
  }

  .profile-audio-control--canvas {
    position: absolute;
    z-index: 4;
    left: 0.85rem;
    bottom: 0.8rem;
  }

  .profile-audio-control__toggle,
  .profile-audio-control__volume {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--profile-audio-accent) 58%, rgba(230, 238, 255, 0.2));
    background: color-mix(in srgb, var(--profile-audio-accent) 13%, rgba(9, 11, 20, 0.88));
    color: color-mix(in srgb, var(--profile-audio-accent) 84%, white);
    box-shadow: 0 0 1.2rem color-mix(in srgb, var(--profile-audio-accent) 18%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .profile-audio-control__toggle {
    display: grid;
    place-items: center;
    width: 3.1rem;
    height: 3.1rem;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 160ms ease, background 160ms ease;
  }

  .profile-audio-control__toggle:hover {
    transform: scale(1.06);
    background: color-mix(in srgb, var(--profile-audio-accent) 25%, rgba(9, 11, 20, 0.92));
  }

  .profile-audio-control__toggle:focus-visible,
  .profile-audio-control__volume:focus-within {
    outline: 2px solid var(--profile-audio-accent);
    outline-offset: 3px;
  }

  .profile-audio-control__toggle svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .profile-audio-control__volume {
    width: 2.6rem;
    height: 2.35rem;
    gap: 0.4rem;
    padding: 0 0.65rem;
    border-radius: 999px;
    overflow: hidden;
    cursor: pointer;
    transition: width 180ms ease, background 160ms ease;
  }

  .profile-audio-control:hover .profile-audio-control__volume,
  .profile-audio-control__volume:focus-within {
    width: 9.5rem;
    background: color-mix(in srgb, var(--profile-audio-accent) 18%, rgba(9, 11, 20, 0.92));
  }

  .profile-audio-control__volume > svg {
    flex: 0 0 1rem;
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .profile-audio-control__volume input {
    width: 0;
    min-width: 0;
    opacity: 0;
    accent-color: var(--profile-audio-accent);
    cursor: pointer;
    transition: width 180ms ease, opacity 160ms ease;
  }

  .profile-audio-control:hover .profile-audio-control__volume input,
  .profile-audio-control__volume:focus-within input {
    width: 6.8rem;
    opacity: 1;
  }

  @media (max-width: 36rem) {
    .profile-audio-control__toggle { width: 2.85rem; height: 2.85rem; }
    .profile-audio-control:hover .profile-audio-control__volume,
    .profile-audio-control__volume:focus-within { width: 8.5rem; }
    .profile-audio-control:hover .profile-audio-control__volume input,
    .profile-audio-control__volume:focus-within input { width: 5.8rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-audio-control__toggle,
    .profile-audio-control__volume,
    .profile-audio-control__volume input { transition-duration: 0.001ms; }
  }
</style>
