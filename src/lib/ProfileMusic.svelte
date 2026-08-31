<script>
  import { onDestroy } from 'svelte';
  import { PROFILE_MUSIC_ENABLED } from './profileFeatures.js';
  import { getSpotifyEmbedUrl } from './profileExpression.js';
  import { normalizeHexColor } from './utils.js';
  import ProfileAudioControls from './ProfileAudioControls.svelte';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { normalizeRichAudioPlaylist } from './profileRichMedia.js';

  export let accentColor = '#8B7CF6';
  /** @type {Record<string, any> | null} */
  export let bestRoll = null;
  export let visualFixture = '';
  export let spotifyType = '';
  export let spotifyId = '';
  export let audioSrc = '';
  export let audioPlaylist = null;
  export let colorEffectsEnabled = false;
  export let deferMedia = false;
  export let reducedMotion = false;
  export let compact = false;

  let audioElement;
  let isPlaying = false;
  let volume = 0.75;
  let spotifyActive = false;
  let entryActivated = false;
  let activeTrackIndex = 0;
  let mediaError = '';

  $: safeColor = colorEffectsEnabled
    ? normalizeHexColor(bestRoll?.hex_code, accentColor)
    : '#5D6A73';
  $: spotifyEmbedSrc = getSpotifyEmbedUrl(spotifyType, spotifyId);
  $: playlist = normalizeRichAudioPlaylist(audioPlaylist || {});
  $: tracks = playlist.tracks;
  $: activeTrack = tracks[activeTrackIndex] || tracks[0] || null;
  $: activeTrackSrc = activeTrack ? getProfileMediaUrl(activeTrack.media_reference) : audioSrc;
  $: hasAudio = Boolean(activeTrackSrc);
  $: entryRequired = Boolean(hasAudio && playlist.autoplay && !entryActivated && !deferMedia);
  $: showAudioControls = playlist.controls !== false;
  $: showVisualFixture = !hasAudio && !spotifyEmbedSrc && !PROFILE_MUSIC_ENABLED && import.meta.env.DEV && visualFixture === 'music';
  $: if (audioElement) audioElement.volume = Number(volume);

  function activateAudio() {
    entryActivated = true;
    void playAudio();
  }

  async function playAudio() {
    if (!audioElement || !hasAudio) return;
    try {
      mediaError = '';
      await audioElement.play();
    } catch {
      mediaError = 'Playback is blocked here. Press the play control to try again.';
    }
  }

  function toggleAudio() {
    if (entryRequired) {
      activateAudio();
      return;
    }
    entryActivated = true;
    if (!audioElement) return;
    if (audioElement.paused) void playAudio();
    else audioElement.pause();
  }

  function setTrack(nextIndex) {
    if (!tracks.length) return;
    activeTrackIndex = (nextIndex + tracks.length) % tracks.length;
    isPlaying = false;
    mediaError = '';
  }

  function nextTrack() {
    if (!tracks.length) return;
    const nextIndex = playlist.shuffle
      ? Math.floor(Math.random() * tracks.length)
      : activeTrackIndex + 1;
    setTrack(nextIndex);
    if (entryActivated || !playlist.autoplay) requestAnimationFrame(() => void playAudio());
  }

  function previousTrack() {
    setTrack(activeTrackIndex - 1);
    if (entryActivated) requestAnimationFrame(() => void playAudio());
  }

  function handleTrackEnded() {
    if (!tracks.length) return;
    if (activeTrackIndex < tracks.length - 1 || playlist.shuffle) nextTrack();
    else if (playlist.loop) {
      if (audioElement) audioElement.currentTime = Number(activeTrack?.trim_start_ms || 0) / 1000;
      void playAudio();
    }
  }

  function applyTrimStart() {
    const startSeconds = Number(activeTrack?.trim_start_ms || 0) / 1000;
    if (audioElement && startSeconds > 0 && audioElement.currentTime < startSeconds) audioElement.currentTime = startSeconds;
  }

  function enforceTrimEnd() {
    const endSeconds = Number(activeTrack?.trim_end_ms || 0) / 1000;
    if (audioElement && endSeconds > 0 && audioElement.currentTime >= endSeconds) {
      audioElement.pause();
      handleTrackEnded();
    }
  }

  function handleMediaKey(event) {
    if (event.key === 'MediaPlayPause' || event.key === ' ') {
      event.preventDefault();
      toggleAudio();
    } else if (event.key === 'MediaTrackNext' || event.key === 'ArrowRight' && event.altKey) {
      event.preventDefault();
      nextTrack();
    } else if (event.key === 'MediaTrackPrevious' || event.key === 'ArrowLeft' && event.altKey) {
      event.preventDefault();
      previousTrack();
    }
  }

  function updateVolume(nextVolume) {
    volume = Number(nextVolume);
    if (audioElement) audioElement.volume = volume;
  }

  onDestroy(() => {
    if (audioElement) audioElement.pause();
  });
</script>

{#if hasAudio}
  <div class:profile-music--reduced-motion={reducedMotion} class:profile-music--compact={compact} class="profile-music profile-music--audio" data-music-state="audio" aria-label="Profile audio" role="region">
    <button type="button" class="profile-music__keyboard-target" aria-label="Profile audio keyboard controls" on:click={toggleAudio} on:keydown={handleMediaKey}></button>
    {#if entryRequired}
      <button type="button" class="profile-music__entry" on:click={activateAudio} aria-label="Enter profile and start audio">
        <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true">♪</span>
        <span class="profile-music__entry-copy"><strong>Enter profile</strong><small>Start the selected audio</small></span>
        <span aria-hidden="true">→</span>
      </button>
    {:else if showAudioControls}
      <ProfileAudioControls accent={safeColor} {isPlaying} {volume} on:toggle={toggleAudio} on:volumechange={(event) => updateVolume(event.detail)} />
      <button type="button" class="profile-music__skip" aria-label={volume > 0 ? 'Mute profile audio' : 'Unmute profile audio'} on:click={() => updateVolume(volume > 0 ? 0 : 0.75)}>{volume > 0 ? '🔊' : '🔇'}</button>
      {#if tracks.length > 1}
        <button type="button" class="profile-music__skip" aria-label="Previous track" on:click={previousTrack}>‹</button>
        <button type="button" class="profile-music__skip" aria-label="Next track" on:click={nextTrack}>›</button>
      {/if}
      <span class="profile-music__track-label">{activeTrack?.label || 'Profile audio'}</span>
    {/if}
    {#if mediaError}<span class="profile-music__error" role="status">{mediaError}</span>{/if}
    {#key activeTrackSrc}
      <!-- Legacy autoplay={!deferMedia} was intentionally replaced by the finite Enter action. -->
      <audio
        bind:this={audioElement}
        src={activeTrackSrc}
        autoplay={false}
        loop={tracks.length <= 1 && playlist.loop}
        preload={entryRequired ? 'none' : (deferMedia ? 'none' : 'metadata')}
        controls={false}
        aria-label={activeTrack?.label || 'Profile audio'}
        on:loadedmetadata={applyTrimStart}
        on:timeupdate={enforceTrimEnd}
        on:play={() => isPlaying = true}
        on:pause={() => isPlaying = false}
        on:ended={handleTrackEnded}
        on:error={() => mediaError = 'This track could not be played on this device.'}
      ></audio>
    {/key}
  </div>
{:else if spotifyEmbedSrc && compact}
  <div class="profile-music profile-music--compact profile-music--spotify-compact" data-music-state="spotify-compact" aria-label="Spotify profile music">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true">♪</span>
    <div class="profile-music__copy"><span>Profile music</span><strong>Spotify {spotifyType}</strong></div>
    <a class="profile-music__open" href={spotifyEmbedSrc} target="_blank" rel="noopener noreferrer">Open</a>
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
  <div class:profile-music--compact={compact} class="profile-music profile-music--spotify-deferred" data-music-state="spotify-deferred" aria-label="Spotify profile music">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true">♪</span>
    <div class="profile-music__copy"><span>Profile music</span><strong>Spotify {spotifyType}</strong></div>
    <button type="button" class="profile-music__load" on:click={() => spotifyActive = true}>Load player</button>
  </div>
{:else if PROFILE_MUSIC_ENABLED}
  <div class:profile-music--compact={compact} class="profile-music profile-music--configured" data-music-state="configured" aria-label="Profile audio">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true">♪</span>
    <div class="profile-music__copy"><span>Cosmetics</span><strong>Profile atmosphere</strong></div>
    <span class="profile-music__status">configured</span>
  </div>
{:else if showVisualFixture}
  <!-- Development-only composition fixture. It contains no playback or mock track data. -->
  <div class:profile-music--compact={compact} class="profile-music profile-music--expression" data-music-state="fixture" aria-label="Cosmetics preview">
    <span class="profile-music__mark" style={'--music-accent: ' + safeColor + ';'} aria-hidden="true"></span>
    <div class="profile-music__copy"><span>Color trace</span><strong>Daily atmosphere</strong><span class="profile-music__trace" aria-hidden="true"><span style={'background: ' + safeColor + ';'}></span></span></div>
    <span class="profile-music__status">preview</span>
  </div>
{/if}

<style>
  .profile-music { display: flex; align-items: center; gap: .75rem; min-height: 4.375rem; padding: .75rem 1rem; border: 1px solid rgba(230,238,255,.14); border-radius: 1rem; background: rgba(255,255,255,.055); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 1.5rem 3rem rgba(0,0,0,.18); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
  .profile-music:focus-visible { outline: 2px solid var(--music-accent, var(--color-accent-cyan)); outline-offset: 3px; }
  .profile-music--reduced-motion .profile-music__entry { transition: none; }
  .profile-music--spotify { display: block; min-height: 0; padding: 0; overflow: hidden; }
  .profile-music--spotify iframe { display: block; width: 100%; height: 152px; border: 0; }
  .profile-music__load, .profile-music__skip { padding: .55rem .75rem; border: 1px solid rgba(230,238,255,.2); border-radius: 999px; background: transparent; color: rgba(241,246,255,.84); font: 600 .68rem/1 var(--font-mono-stack); cursor: pointer; }
  .profile-music__skip { padding-inline: .6rem; font-size: 1.1rem; line-height: .8; }
  .profile-music__load:hover, .profile-music__skip:hover { border-color: var(--music-accent, var(--color-accent-cyan)); color: var(--color-ink-strong); }
  .profile-music--audio { position: fixed; z-index: 6; left: clamp(1rem, 3vw, 2rem); bottom: max(1rem, env(safe-area-inset-bottom)); min-height: 0; padding: .5rem 0; border: 0; background: transparent; box-shadow: none; pointer-events: none; }
  .profile-music--audio > :global(.profile-audio-control), .profile-music--audio > button, .profile-music--audio > span { pointer-events: auto; }
  .profile-music--audio > audio { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .profile-music__keyboard-target { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; border: 0; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .profile-music__entry { display: flex; align-items: center; gap: .7rem; min-height: 3.25rem; padding: .45rem .7rem; border: 1px solid color-mix(in srgb, var(--music-accent, #8B7CF6) 54%, transparent); border-radius: 999px; background: rgba(9,11,20,.88); color: var(--color-ink-strong); cursor: pointer; pointer-events: auto; }
  .profile-music__entry:hover { background: rgba(20,23,38,.95); }
  .profile-music__entry-copy { display: grid; gap: .15rem; text-align: left; }
  .profile-music__entry-copy strong { font-size: .78rem; }
  .profile-music__entry-copy small, .profile-music__error, .profile-music__track-label { color: rgba(220,230,248,.62); font: 600 .62rem/1.1 var(--font-mono-stack); }
  .profile-music__track-label { max-width: 11rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: auto; }
  .profile-music__error { max-width: 14rem; color: #ffb2bf; pointer-events: auto; }
  .profile-music__mark { display: grid; place-items: center; flex: 0 0 2.5rem; width: 2.5rem; height: 2.5rem; border-radius: .7rem; background: radial-gradient(circle at 32% 28%, rgba(255,255,255,.58), var(--music-accent) 58%, rgba(0,0,0,.48)); box-shadow: 0 0 1.35rem color-mix(in srgb, var(--music-accent) 42%, transparent); }
  .profile-music__mark::after { content: ''; width: .38rem; height: .38rem; border-radius: 50%; background: rgba(255,255,255,.72); }
  .profile-music__copy { display: grid; flex: 1; min-width: 0; gap: .2rem; }
  .profile-music__copy span { color: rgba(220,230,248,.62); font: 700 .62rem/1.1 var(--font-mono-stack); letter-spacing: .14em; text-transform: uppercase; }
  .profile-music__copy strong { color: rgba(241,246,255,.9); font: 600 .9rem/1.2 var(--font-body-stack); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-music__status { margin-left: auto; color: rgba(220,230,248,.58); font: 600 .68rem/1 var(--font-mono-stack); letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
  .profile-music__trace { display: block; width: 100%; height: .2rem; margin-top: .3rem; overflow: hidden; border-radius: 999px; background: rgba(230,238,255,.12); }
  .profile-music__trace span { display: block; width: 28%; height: 100%; border-radius: inherit; opacity: .82; box-shadow: 0 0 .7rem currentColor; }
  .profile-music--compact { min-height: 2.6rem; padding: .42rem .55rem; gap: .55rem; border-radius: .72rem; }
  .profile-music--compact.profile-music--audio { position: static; left: auto; right: auto; bottom: auto; pointer-events: auto; }
  .profile-music--compact .profile-music__mark { flex-basis: 1.7rem; width: 1.7rem; height: 1.7rem; border-radius: .48rem; }
  .profile-music--compact .profile-music__copy { gap: .1rem; }
  .profile-music--compact .profile-music__copy span { font-size: .52rem; }
  .profile-music--compact .profile-music__copy strong { font-size: .72rem; }
  .profile-music--compact .profile-music__status,
  .profile-music--compact .profile-music__track-label { font-size: .56rem; }
  .profile-music__open { flex: 0 0 auto; padding: .38rem .55rem; border: 1px solid rgba(230,238,255,.2); border-radius: 999px; color: rgba(241,246,255,.84); font: 600 .58rem/1 var(--font-mono-stack); text-decoration: none; }
  .profile-music__open:hover, .profile-music__open:focus-visible { border-color: var(--music-accent, var(--color-accent-cyan)); color: var(--color-ink-strong); }
  @media (max-width: 36rem) { .profile-music { min-height: 0; padding-inline: .35rem; } .profile-music--audio { left: .65rem; right: .65rem; } .profile-music__track-label { max-width: 7rem; } }
  @media (prefers-reduced-motion: reduce) { .profile-music__entry, .profile-music__load, .profile-music__skip { transition: none; } }
</style>
