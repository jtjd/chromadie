<script>
  import { onMount } from 'svelte';
  import { PROFILE_MUSIC_ENABLED } from './profileFeatures.js';
  import { getSpotifyEmbedUrl } from './profileExpression.js';
  import { normalizeHexColor } from './utils.js';

  export let accentColor = '#8B7CF6';
  /** @type {Record<string, any> | null} */
  export let bestRoll = null;
  export let visualFixture = '';
  export let spotifyType = '';
  export let spotifyId = '';
  export let audioSrc = '';
  let audioElement;
  let isPlaying = false;
  let volume = 0.75;

  $: safeColor = normalizeHexColor(bestRoll?.hex_code, accentColor);
  $: spotifyEmbedSrc = getSpotifyEmbedUrl(spotifyType, spotifyId);
  $: showVisualFixture = !audioSrc && !spotifyEmbedSrc && !PROFILE_MUSIC_ENABLED && import.meta.env.DEV && visualFixture === 'music';
  $: if (audioElement) audioElement.volume = Number(volume);

  async function startAudioAfterInteraction() {
    if (!audioElement || !audioSrc || !audioElement.paused) return;
    try {
      await audioElement.play();
      window.removeEventListener('pointerdown', startAudioAfterInteraction);
      window.removeEventListener('keydown', startAudioAfterInteraction);
    } catch {
      // The native controls remain available when the browser still denies playback.
    }
  }

  async function toggleAudio() {
    if (!audioElement) return;
    if (audioElement.paused) {
      try {
        await audioElement.play();
      } catch {
        // The browser may still require the native media permission gesture.
      }
    } else {
      audioElement.pause();
    }
  }

  onMount(() => {
    window.addEventListener('pointerdown', startAudioAfterInteraction, { passive: true });
    window.addEventListener('keydown', startAudioAfterInteraction);
    return () => {
      window.removeEventListener('pointerdown', startAudioAfterInteraction);
      window.removeEventListener('keydown', startAudioAfterInteraction);
    };
  });
</script>

{#if audioSrc}
  <div class="profile-music profile-music--audio" data-music-state="audio" aria-label="Profile audio">
    <div class="profile-audio-control">
      <button type="button" class="profile-audio-control__toggle" aria-label={isPlaying ? 'Pause profile audio' : 'Play profile audio'} title={isPlaying ? 'Pause profile audio' : 'Play profile audio'} on:click={toggleAudio}>
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
        <input type="range" min="0" max="1" step="0.01" bind:value={volume} aria-label="Volume" />
      </label>
    </div>
    {#key audioSrc}
      <audio bind:this={audioElement} src={audioSrc} autoplay loop preload="auto" aria-hidden="true" on:play={() => isPlaying = true} on:pause={() => isPlaying = false}></audio>
    {/key}
  </div>
{:else if spotifyEmbedSrc}
  <div class="profile-music profile-music--spotify" data-music-state="spotify" aria-label="Spotify profile music">
    <iframe
      src={spotifyEmbedSrc}
      title="Spotify player"
      loading="lazy"
      allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>
{:else if PROFILE_MUSIC_ENABLED}
  <div class="profile-music profile-music--configured" data-music-state="configured" aria-label="Profile expression">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true">♪</span>
    <div class="profile-music__copy">
      <span>Expression</span>
      <strong>Profile atmosphere</strong>
    </div>
    <span class="profile-music__status">configured</span>
  </div>
{:else if showVisualFixture}
  <!-- Development-only composition fixture. It contains no playback or mock track data. -->
  <div class="profile-music profile-music--expression" data-music-state="fixture" aria-label="Expression preview">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true"></span>
    <div class="profile-music__copy">
      <span>Color trace</span>
      <strong>Daily atmosphere</strong>
      <span class="profile-music__trace" aria-hidden="true">
        <span style={'background: ' + safeColor + ';'}></span>
      </span>
    </div>
    <span class="profile-music__status">preview</span>
  </div>
{/if}

<style>
  .profile-music { display: flex; align-items: center; gap: 1rem; min-height: 4.375rem; padding: 0.75rem 1rem; border: 1px solid rgba(230,238,255,0.14); border-radius: 1rem; background: rgba(255,255,255,0.055); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 1.5rem 3rem rgba(0,0,0,0.18); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
  .profile-music--spotify { display: block; min-height: 0; padding: 0; overflow: hidden; }
  .profile-music--spotify iframe { display: block; width: 100%; height: 152px; border: 0; }
  .profile-music--audio { justify-content: flex-start; min-height: 0; padding: 0.5rem 0; border: 0; background: transparent; box-shadow: none; }
  .profile-audio-control { display: flex; align-items: center; gap: 0.45rem; }
  .profile-audio-control__toggle, .profile-audio-control__volume { display: inline-flex; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--profile-accent) 58%, rgba(230,238,255,0.2)); background: color-mix(in srgb, var(--profile-accent) 13%, rgba(9,11,20,0.88)); color: color-mix(in srgb, var(--profile-accent) 84%, white); box-shadow: 0 0 1.2rem color-mix(in srgb, var(--profile-accent) 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.08); }
  .profile-audio-control__toggle { display: grid; place-items: center; width: 3.1rem; height: 3.1rem; padding: 0; border-radius: 50%; cursor: pointer; transition: transform 160ms ease, background 160ms ease; }
  .profile-audio-control__toggle:hover { transform: scale(1.06); background: color-mix(in srgb, var(--profile-accent) 25%, rgba(9,11,20,0.92)); }
  .profile-audio-control__toggle:focus-visible, .profile-audio-control__volume:focus-within { outline: 2px solid var(--profile-accent); outline-offset: 3px; }
  .profile-audio-control__toggle svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .profile-audio-control__volume { width: 2.6rem; height: 2.35rem; gap: 0.4rem; padding: 0 0.65rem; border-radius: 999px; overflow: hidden; cursor: pointer; transition: width 180ms ease, background 160ms ease; }
  .profile-audio-control:hover .profile-audio-control__volume, .profile-audio-control__volume:focus-within { width: 9.5rem; background: color-mix(in srgb, var(--profile-accent) 18%, rgba(9,11,20,0.92)); }
  .profile-audio-control__volume > svg { flex: 0 0 1rem; width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  .profile-audio-control__volume input { width: 0; min-width: 0; opacity: 0; accent-color: var(--profile-accent); cursor: pointer; transition: width 180ms ease, opacity 160ms ease; }
  .profile-audio-control:hover .profile-audio-control__volume input, .profile-audio-control__volume:focus-within input { width: 6.8rem; opacity: 1; }
  .profile-music--audio > audio { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .profile-music__mark { display: grid; place-items: center; flex: 0 0 2.75rem; width: 2.75rem; height: 2.75rem; border-radius: 0.7rem; background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.58), var(--music-accent) 58%, rgba(0,0,0,0.48)); box-shadow: 0 0 1.35rem color-mix(in srgb, var(--music-accent) 42%, transparent); }
  .profile-music__mark::after { content: ''; width: 0.38rem; height: 0.38rem; border-radius: 50%; background: rgba(255,255,255,0.72); }
  .profile-music__copy { display: grid; flex: 1; min-width: 0; gap: 0.2rem; }
  .profile-music__copy span { color: rgba(220,230,248,0.62); font: 700 0.62rem / 1.1 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-music__copy strong { color: rgba(241,246,255,0.9); font: 600 0.9rem / 1.2 var(--font-body-stack); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-music__status { margin-left: auto; color: rgba(220,230,248,0.58); font: 600 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
  .profile-music__trace { display: block; width: 100%; height: 0.2rem; margin-top: 0.3rem; overflow: hidden; border-radius: 999px; background: rgba(230,238,255,0.12); }
  .profile-music__trace span { display: block; width: 28%; height: 100%; border-radius: inherit; opacity: 0.82; box-shadow: 0 0 0.7rem currentColor; }
  @media (max-width: 36rem) { .profile-music { min-height: 0; padding-inline: 0.35rem; } .profile-audio-control__toggle { width: 2.85rem; height: 2.85rem; } .profile-audio-control:hover .profile-audio-control__volume, .profile-audio-control__volume:focus-within { width: 8.5rem; } .profile-audio-control:hover .profile-audio-control__volume input, .profile-audio-control__volume:focus-within input { width: 5.8rem; } .profile-music__mark { flex-basis: 2.5rem; width: 2.5rem; height: 2.5rem; } .profile-music__status { font-size: 0.58rem; } }
</style>
