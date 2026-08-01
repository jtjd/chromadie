<script>
  import { onMount } from 'svelte';
  import { PROFILE_MUSIC_ENABLED } from './profileFeatures.js';
  import { getSpotifyEmbedUrl } from './profileExpression.js';
  import { normalizeHexColor } from './utils.js';
  import ProfileAudioControls from './ProfileAudioControls.svelte';

  export let accentColor = '#8B7CF6';
  /** @type {Record<string, any> | null} */
  export let bestRoll = null;
  export let visualFixture = '';
  export let spotifyType = '';
  export let spotifyId = '';
  export let audioSrc = '';
  export let deferMedia = false;
  let audioElement;
  let isPlaying = false;
  let volume = 0.75;
  let spotifyActive = false;

  $: safeColor = normalizeHexColor(bestRoll?.hex_code, accentColor);
  $: spotifyEmbedSrc = getSpotifyEmbedUrl(spotifyType, spotifyId);
  $: showVisualFixture = !audioSrc && !spotifyEmbedSrc && !PROFILE_MUSIC_ENABLED && import.meta.env.DEV && visualFixture === 'music';
  $: if (audioElement) audioElement.volume = Number(volume);

  async function startAudioAfterInteraction(event) {
    if (event?.target?.closest?.('.profile-audio-control')) return;
    if (deferMedia || !audioElement || !audioSrc || !audioElement.paused) return;
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
    if (!deferMedia) {
      window.addEventListener('pointerdown', startAudioAfterInteraction, { passive: true });
      window.addEventListener('keydown', startAudioAfterInteraction);
    }
    return () => {
      window.removeEventListener('pointerdown', startAudioAfterInteraction);
      window.removeEventListener('keydown', startAudioAfterInteraction);
    };
  });
</script>

{#if audioSrc}
  <div class="profile-music profile-music--audio" data-music-state="audio" aria-label="Profile audio">
    <ProfileAudioControls accent={safeColor} {isPlaying} {volume} on:toggle={toggleAudio} on:volumechange={(event) => volume = event.detail} />
    {#key audioSrc}
      <audio bind:this={audioElement} src={audioSrc} autoplay={!deferMedia} loop preload={deferMedia ? 'none' : 'auto'} aria-hidden="true" on:play={() => isPlaying = true} on:pause={() => isPlaying = false}></audio>
    {/key}
  </div>
{:else if spotifyEmbedSrc && (!deferMedia || spotifyActive)}
  <div class="profile-music profile-music--spotify" data-music-state="spotify" aria-label="Spotify profile music">
    <iframe
      src={spotifyEmbedSrc}
      title="Spotify player"
      loading="lazy"
      allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>
{:else if spotifyEmbedSrc && deferMedia}
  <div class="profile-music profile-music--spotify-deferred" data-music-state="spotify-deferred" aria-label="Spotify profile music">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true">♪</span>
    <div class="profile-music__copy">
      <span>Profile music</span>
      <strong>Spotify {spotifyType}</strong>
    </div>
    <button type="button" class="profile-music__load" on:click={() => spotifyActive = true}>Load player</button>
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
  .profile-music__load { margin-left: auto; padding: 0.55rem 0.75rem; border: 1px solid rgba(230,238,255,0.2); border-radius: 999px; background: transparent; color: rgba(241,246,255,0.84); font: 600 0.68rem / 1 var(--font-mono-stack); cursor: pointer; }
  .profile-music__load:hover { border-color: var(--music-accent, var(--color-accent-cyan)); color: var(--color-ink-strong); }
  .profile-music--audio { position: fixed; z-index: 6; left: clamp(1rem, 3vw, 2rem); bottom: max(1rem, env(safe-area-inset-bottom)); justify-content: flex-start; min-height: 0; padding: 0.5rem 0; border: 0; background: transparent; box-shadow: none; pointer-events: none; }
  .profile-music--audio > audio { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .profile-music__mark { display: grid; place-items: center; flex: 0 0 2.75rem; width: 2.75rem; height: 2.75rem; border-radius: 0.7rem; background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.58), var(--music-accent) 58%, rgba(0,0,0,0.48)); box-shadow: 0 0 1.35rem color-mix(in srgb, var(--music-accent) 42%, transparent); }
  .profile-music__mark::after { content: ''; width: 0.38rem; height: 0.38rem; border-radius: 50%; background: rgba(255,255,255,0.72); }
  .profile-music__copy { display: grid; flex: 1; min-width: 0; gap: 0.2rem; }
  .profile-music__copy span { color: rgba(220,230,248,0.62); font: 700 0.62rem / 1.1 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-music__copy strong { color: rgba(241,246,255,0.9); font: 600 0.9rem / 1.2 var(--font-body-stack); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-music__status { margin-left: auto; color: rgba(220,230,248,0.58); font: 600 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
  .profile-music__trace { display: block; width: 100%; height: 0.2rem; margin-top: 0.3rem; overflow: hidden; border-radius: 999px; background: rgba(230,238,255,0.12); }
  .profile-music__trace span { display: block; width: 28%; height: 100%; border-radius: inherit; opacity: 0.82; box-shadow: 0 0 0.7rem currentColor; }
  @media (max-width: 36rem) { .profile-music { min-height: 0; padding-inline: 0.35rem; } .profile-music__mark { flex-basis: 2.5rem; width: 2.5rem; height: 2.5rem; } .profile-music__status { font-size: 0.58rem; } }
</style>
