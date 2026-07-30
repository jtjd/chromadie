<script>
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

  $: safeColor = normalizeHexColor(bestRoll?.hex_code, accentColor);
  $: spotifyEmbedSrc = getSpotifyEmbedUrl(spotifyType, spotifyId);
  $: showVisualFixture = !audioSrc && !spotifyEmbedSrc && !PROFILE_MUSIC_ENABLED && import.meta.env.DEV && visualFixture === 'music';
</script>

{#if audioSrc}
  <div class="profile-music profile-music--audio" data-music-state="audio" aria-label="Profile audio">
    {#key audioSrc}
      <audio src={audioSrc} autoplay loop controls preload="auto"></audio>
    {/key}
    <span class="profile-music__audio-note">Audio may require a tap to start.</span>
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
  .profile-music--audio { display: grid; gap: 0.45rem; }
  .profile-music--audio audio { display: block; width: 100%; min-height: 2.4rem; accent-color: var(--profile-accent); }
  .profile-music__audio-note { color: rgba(220,230,248,0.58); font: 600 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.04em; }
  .profile-music__mark { display: grid; place-items: center; flex: 0 0 2.75rem; width: 2.75rem; height: 2.75rem; border-radius: 0.7rem; background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.58), var(--music-accent) 58%, rgba(0,0,0,0.48)); box-shadow: 0 0 1.35rem color-mix(in srgb, var(--music-accent) 42%, transparent); }
  .profile-music__mark::after { content: ''; width: 0.38rem; height: 0.38rem; border-radius: 50%; background: rgba(255,255,255,0.72); }
  .profile-music__copy { display: grid; flex: 1; min-width: 0; gap: 0.2rem; }
  .profile-music__copy span { color: rgba(220,230,248,0.62); font: 700 0.62rem / 1.1 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-music__copy strong { color: rgba(241,246,255,0.9); font: 600 0.9rem / 1.2 var(--font-body-stack); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-music__status { margin-left: auto; color: rgba(220,230,248,0.58); font: 600 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
  .profile-music__trace { display: block; width: 100%; height: 0.2rem; margin-top: 0.3rem; overflow: hidden; border-radius: 999px; background: rgba(230,238,255,0.12); }
  .profile-music__trace span { display: block; width: 28%; height: 100%; border-radius: inherit; opacity: 0.82; box-shadow: 0 0 0.7rem currentColor; }
  @media (max-width: 36rem) { .profile-music { min-height: 4.1rem; padding-inline: 0.75rem; } .profile-music__mark { flex-basis: 2.5rem; width: 2.5rem; height: 2.5rem; } .profile-music__status { font-size: 0.58rem; } }
</style>
