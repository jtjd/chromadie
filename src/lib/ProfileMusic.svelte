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

  $: safeColor = normalizeHexColor(bestRoll?.hex_code, accentColor);
  $: spotifyEmbedSrc = getSpotifyEmbedUrl(spotifyType, spotifyId);
  $: showVisualFixture = !audioSrc && !spotifyEmbedSrc && !PROFILE_MUSIC_ENABLED && import.meta.env.DEV && visualFixture === 'music';

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
    <details class="profile-audio-details">
      <summary aria-label="Open profile audio controls" title="Profile audio controls">
        <span class="profile-audio-details__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.2 1.1a4 4 0 0 1 0 3.8m2.15-6a8 8 0 0 1 0 8.2" /></svg>
        </span>
        <span class="profile-audio-details__bars" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="profile-audio-details__chevron" aria-hidden="true">⌄</span>
      </summary>
      {#key audioSrc}
        <audio bind:this={audioElement} src={audioSrc} autoplay loop controls preload="auto"></audio>
      {/key}
    </details>
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
  .profile-music--audio { justify-content: flex-end; min-height: 0; padding: 0.35rem; border: 0; background: transparent; box-shadow: none; }
  .profile-audio-details { position: relative; }
  .profile-audio-details summary { display: flex; align-items: center; gap: 0.45rem; min-width: 4.1rem; min-height: 2.35rem; padding: 0.35rem 0.55rem; border: 1px solid rgba(230,238,255,0.16); border-radius: 999px; background: rgba(9,11,20,0.68); color: rgba(241,246,255,0.78); cursor: pointer; list-style: none; transition: border-color 160ms ease, background 160ms ease, color 160ms ease; }
  .profile-audio-details summary::-webkit-details-marker { display: none; }
  .profile-audio-details summary:hover, .profile-audio-details[open] summary { border-color: color-mix(in srgb, var(--profile-accent) 62%, transparent); background: rgba(16,18,31,0.9); color: var(--profile-accent); }
  .profile-audio-details summary:focus-visible { outline: 2px solid var(--profile-accent); outline-offset: 3px; }
  .profile-audio-details__icon { display: grid; place-items: center; width: 1.25rem; height: 1.25rem; }
  .profile-audio-details__icon svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  .profile-audio-details__bars { display: inline-flex; align-items: center; gap: 2px; height: 1rem; }
  .profile-audio-details__bars i { display: block; width: 2px; height: 0.35rem; border-radius: 99px; background: currentColor; opacity: 0.7; }
  .profile-audio-details__bars i:nth-child(2) { height: 0.7rem; }
  .profile-audio-details__bars i:nth-child(3) { height: 0.5rem; }
  .profile-audio-details__chevron { margin-left: 0.1rem; color: rgba(241,246,255,0.5); font-size: 0.9rem; line-height: 1; transform: translateY(-0.08rem); }
  .profile-audio-details[open] .profile-audio-details__chevron { transform: rotate(180deg) translateY(0.08rem); }
  .profile-audio-details audio { display: block; width: min(22rem, 72vw); margin-top: 0.45rem; min-height: 2.4rem; accent-color: var(--profile-accent); }
  .profile-music__mark { display: grid; place-items: center; flex: 0 0 2.75rem; width: 2.75rem; height: 2.75rem; border-radius: 0.7rem; background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.58), var(--music-accent) 58%, rgba(0,0,0,0.48)); box-shadow: 0 0 1.35rem color-mix(in srgb, var(--music-accent) 42%, transparent); }
  .profile-music__mark::after { content: ''; width: 0.38rem; height: 0.38rem; border-radius: 50%; background: rgba(255,255,255,0.72); }
  .profile-music__copy { display: grid; flex: 1; min-width: 0; gap: 0.2rem; }
  .profile-music__copy span { color: rgba(220,230,248,0.62); font: 700 0.62rem / 1.1 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-music__copy strong { color: rgba(241,246,255,0.9); font: 600 0.9rem / 1.2 var(--font-body-stack); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-music__status { margin-left: auto; color: rgba(220,230,248,0.58); font: 600 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
  .profile-music__trace { display: block; width: 100%; height: 0.2rem; margin-top: 0.3rem; overflow: hidden; border-radius: 999px; background: rgba(230,238,255,0.12); }
  .profile-music__trace span { display: block; width: 28%; height: 100%; border-radius: inherit; opacity: 0.82; box-shadow: 0 0 0.7rem currentColor; }
  @media (max-width: 36rem) { .profile-music { min-height: 0; padding-inline: 0.35rem; } .profile-audio-details audio { width: min(18rem, 82vw); } .profile-music__mark { flex-basis: 2.5rem; width: 2.5rem; height: 2.5rem; } .profile-music__status { font-size: 0.58rem; } }
</style>
