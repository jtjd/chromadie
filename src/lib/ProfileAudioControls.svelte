<script>
  import { createEventDispatcher } from 'svelte';

  export let accent = '#8B7CF6';
  export let isPlaying = false;
  export let volume = 0.75;
  export let placement = 'inline';
  export let trackLabel = 'Profile audio';
  export let currentTime = 0;
  export let duration = 0;
  export let trackIndex = 0;
  export let trackCount = 0;
  export let shuffle = false;

  const dispatch = createEventDispatcher();
  let previousVolume = 0.75;

  $: safeDuration = Math.max(0, Number(duration) || 0);
  $: safeCurrentTime = Math.min(safeDuration || Number.MAX_SAFE_INTEGER, Math.max(0, Number(currentTime) || 0));
  $: progressPercent = safeDuration > 0 ? Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100)) : 0;
  $: if (Number(volume) > 0) previousVolume = Number(volume);

  function formatTime(value) {
    const seconds = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function handleVolumeInput(event) {
    volume = Number(event.currentTarget.value);
    dispatch('volumechange', volume);
  }

  function toggleMute() {
    const nextVolume = Number(volume) > 0 ? 0 : Math.max(0.1, previousVolume || 0.75);
    dispatch('volumechange', nextVolume);
  }

  function handleSeekInput(event) {
    dispatch('seek', Number(event.currentTarget.value));
  }
</script>

<div
  class={'profile-audio-control profile-audio-control--' + placement}
  style={`--profile-audio-accent:${accent};--profile-audio-progress:${progressPercent}%;`}
  aria-label="Profile audio controls"
>
  <div class="profile-audio-control__header">
    <div class="profile-audio-control__transport" aria-label="Track controls">
      {#if trackCount > 1}
        <button type="button" class="profile-audio-control__button profile-audio-control__button--secondary" aria-label="Previous track" title="Previous track" on:click={() => dispatch('previous')}>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 5v14m12-12-8 5 8 5V7Z" /></svg>
        </button>
      {/if}
      <button type="button" class="profile-audio-control__button profile-audio-control__button--primary" aria-label={isPlaying ? 'Pause profile audio' : 'Play profile audio'} title={isPlaying ? 'Pause profile audio' : 'Play profile audio'} aria-pressed={isPlaying} on:click={() => dispatch('toggle')}>
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          {#if isPlaying}
            <path d="M8 5.5v13M16 5.5v13" />
          {:else}
            <path d="m8 5 10 7-10 7V5Z" />
          {/if}
        </svg>
      </button>
      {#if trackCount > 1}
        <button type="button" class="profile-audio-control__button profile-audio-control__button--secondary" aria-label="Next track" title="Next track" on:click={() => dispatch('next')}>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M18 5v14M6 7l8 5-8 5V7Z" /></svg>
        </button>
      {/if}
    </div>

    <div class="profile-audio-control__track-copy">
      <strong title={trackLabel}>{trackLabel}</strong>
      <span>{trackCount > 1 ? `${trackIndex + 1} / ${trackCount}` : 'Profile audio'}</span>
    </div>

    <button type="button" class:profile-audio-control__button--active={shuffle} class="profile-audio-control__button profile-audio-control__button--secondary" aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'} title={shuffle ? 'Disable shuffle' : 'Enable shuffle'} aria-pressed={shuffle} on:click={() => dispatch('shuffle')}>
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 7h2.4c2.8 0 4.1 3.8 6.1 7s3.3 3 5.5 3H20m-3-3 3 3-3 3M4 17h2.4c1.3 0 2.3-.8 3.2-2m1.1-6c1.1-1.9 2.2-2.9 4.3-2.9H20m-3-3 3 3-3 3" /></svg>
    </button>
  </div>

  <label class="profile-audio-control__progress" aria-label="Seek profile audio">
    <input type="range" min="0" max={safeDuration || 0} step="0.1" value={safeCurrentTime} disabled={safeDuration <= 0} aria-label="Seek profile audio" on:input={handleSeekInput} />
  </label>

  <div class="profile-audio-control__footer">
    <span class="profile-audio-control__time" aria-live="off">{formatTime(safeCurrentTime)} <span aria-hidden="true">/</span> {formatTime(safeDuration)}</span>
    <div class="profile-audio-control__volume" role="group" aria-label="Profile audio volume">
      <button type="button" class="profile-audio-control__volume-button" aria-label={Number(volume) > 0 ? 'Mute profile audio' : 'Unmute profile audio'} title={Number(volume) > 0 ? 'Mute profile audio' : 'Unmute profile audio'} aria-pressed={Number(volume) === 0} on:click={toggleMute}>
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          {#if Number(volume) === 0}
            <path d="m4 4 16 16M10 9V5l5 4v6m0 4-5-4H6V9h2" />
          {:else}
            <path d="M4 9v6h4l5 4V5L8 9H4Zm12.2 1.1a4 4 0 0 1 0 3.8m2.15-6a8 8 0 0 1 0 8.2" />
          {/if}
        </svg>
      </button>
      <input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" on:input={handleVolumeInput} />
    </div>
  </div>
</div>

<style>
  .profile-audio-control {
    --profile-audio-border: color-mix(in srgb, var(--profile-audio-accent) 30%, rgba(230, 238, 255, .16));
    display: grid;
    width: min(100%, 34rem);
    gap: .8rem;
    box-sizing: border-box;
    padding: .9rem 1rem .75rem;
    border: 1px solid var(--profile-audio-border);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--profile-audio-accent) 7%, rgba(9, 11, 20, .9));
    color: var(--color-ink-strong, #f1f6ff);
    box-shadow: 0 .9rem 2rem rgba(0, 0, 0, .2), inset 0 1px 0 rgba(255, 255, 255, .08);
    pointer-events: auto;
  }

  .profile-audio-control--floating { width: min(28rem, calc(100vw - 2rem)); }
  .profile-audio-control__header,
  .profile-audio-control__footer { display: flex; align-items: center; gap: .7rem; min-width: 0; }
  .profile-audio-control__header { gap: .8rem; }
  .profile-audio-control__transport { display: flex; align-items: center; gap: .25rem; flex: 0 0 auto; }
  .profile-audio-control__button,
  .profile-audio-control__volume-button {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 50%;
    background: transparent;
    color: color-mix(in srgb, var(--profile-audio-accent) 76%, white);
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
  }
  .profile-audio-control__button:hover,
  .profile-audio-control__button:focus-visible,
  .profile-audio-control__volume-button:hover,
  .profile-audio-control__volume-button:focus-visible {
    border-color: var(--profile-audio-border);
    background: color-mix(in srgb, var(--profile-audio-accent) 14%, transparent);
    color: var(--color-ink-strong, #f1f6ff);
  }
  .profile-audio-control__button:focus-visible,
  .profile-audio-control__volume-button:focus-visible { outline: 2px solid var(--profile-audio-accent); outline-offset: 2px; }
  .profile-audio-control__button--primary {
    width: 2.7rem;
    height: 2.7rem;
    border-color: color-mix(in srgb, var(--profile-audio-accent) 58%, rgba(230, 238, 255, .2));
    background: color-mix(in srgb, var(--profile-audio-accent) 24%, rgba(9, 11, 20, .82));
    color: color-mix(in srgb, var(--profile-audio-accent) 78%, white);
    box-shadow: 0 0 .9rem color-mix(in srgb, var(--profile-audio-accent) 18%, transparent);
  }
  .profile-audio-control__button--primary:hover { transform: scale(1.05); background: color-mix(in srgb, var(--profile-audio-accent) 34%, rgba(9, 11, 20, .9)); }
  .profile-audio-control__button--active { border-color: var(--profile-audio-border); background: color-mix(in srgb, var(--profile-audio-accent) 18%, transparent); color: var(--color-ink-strong, #f1f6ff); }
  .profile-audio-control__button svg,
  .profile-audio-control__volume-button svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .profile-audio-control__button--primary svg { width: 1.1rem; height: 1.1rem; }
  .profile-audio-control__track-copy { display: grid; min-width: 0; flex: 1; gap: .2rem; }
  .profile-audio-control__track-copy strong { overflow: hidden; color: var(--color-ink-strong, #f1f6ff); font: 650 .78rem/1.2 var(--font-body-stack, sans-serif); text-overflow: ellipsis; white-space: nowrap; }
  .profile-audio-control__track-copy span,
  .profile-audio-control__time { color: var(--color-ink-muted, rgba(220, 230, 248, .62)); font: 600 .6rem/1 var(--font-mono-stack, monospace); letter-spacing: .04em; }
  .profile-audio-control__progress { display: block; height: .5rem; padding: .15rem 0; cursor: pointer; }
  .profile-audio-control__progress input,
  .profile-audio-control__volume input { display: block; width: 100%; height: .2rem; margin: 0; accent-color: var(--profile-audio-accent); cursor: pointer; }
  .profile-audio-control__progress input { appearance: none; border-radius: 999px; background: linear-gradient(to right, var(--profile-audio-accent) 0 var(--profile-audio-progress), rgba(230, 238, 255, .15) var(--profile-audio-progress) 100%); }
  .profile-audio-control__progress input::-webkit-slider-thumb,
  .profile-audio-control__volume input::-webkit-slider-thumb { width: .55rem; height: .55rem; appearance: none; border: 1px solid rgba(255, 255, 255, .8); border-radius: 50%; background: var(--profile-audio-accent); box-shadow: 0 0 .55rem color-mix(in srgb, var(--profile-audio-accent) 46%, transparent); }
  .profile-audio-control__progress input::-moz-range-thumb,
  .profile-audio-control__volume input::-moz-range-thumb { width: .55rem; height: .55rem; border: 1px solid rgba(255, 255, 255, .8); border-radius: 50%; background: var(--profile-audio-accent); box-shadow: 0 0 .55rem color-mix(in srgb, var(--profile-audio-accent) 46%, transparent); }
  .profile-audio-control__progress input:disabled { cursor: default; opacity: .5; }
  .profile-audio-control__footer { justify-content: space-between; }
  .profile-audio-control__volume { display: flex; align-items: center; gap: .45rem; width: min(9rem, 34%); min-width: 5.5rem; }
  .profile-audio-control__volume-button { width: 1.8rem; height: 1.8rem; }
  .profile-audio-control__volume input { flex: 1; min-width: 0; }

  @media (max-width: 36rem) {
    .profile-audio-control { padding-inline: .75rem; }
    .profile-audio-control__header { gap: .5rem; }
    .profile-audio-control__button--secondary { width: 1.8rem; height: 1.8rem; }
    .profile-audio-control__button--primary { width: 2.45rem; height: 2.45rem; }
    .profile-audio-control__volume { width: 42%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-audio-control__button,
    .profile-audio-control__volume-button { transition-duration: .001ms; }
  }
</style>
