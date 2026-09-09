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
  export let placement = 'floating';

  let audioElement;
  let isPlaying = false;
  let volume = 0.75;
  let shuffleEnabled = false;
  let spotifyActive = false;
  let entryActivated = false;
  let activeTrackIndex = 0;
  let duration = 0;
  let mediaError = '';
  let lastTrackSetKey = '';
  let lastPlaylistSettingsKey = '';

  $: safeColor = colorEffectsEnabled
    ? normalizeHexColor(bestRoll?.hex_code, accentColor)
    : normalizeHexColor(accentColor, '#8B7CF6');
  $: spotifyEmbedSrc = getSpotifyEmbedUrl(spotifyType, spotifyId);
  $: playlist = normalizeRichAudioPlaylist(audioPlaylist || {});
  $: tracks = playlist.tracks;
  $: activeTrack = tracks[activeTrackIndex] || tracks[0] || null;
  $: activeTrackSrc = activeTrack ? getProfileMediaUrl(activeTrack.media_reference) : audioSrc;
  $: hasAudio = Boolean(activeTrackSrc);
  $: entryRequired = Boolean(hasAudio && playlist.autoplay && !entryActivated && !deferMedia);
  $: showAudioControls = playlist.controls !== false;
  $: trackSetKey = audioSrc + '|' + tracks.map(track => (track.asset_id || track.path) + ':' + track.order).join('|');
  $: playlistSettingsKey = playlist.volume + ':' + playlist.shuffle + ':' + playlist.loop + ':' + playlist.autoplay + ':' + playlist.controls;
  $: syncTrackState(trackSetKey);
  $: syncPlaylistSettings(playlistSettingsKey);
  $: trimStartSeconds = Number(activeTrack?.trim_start_ms || 0) / 1000;
  $: configuredTrimEndSeconds = Number(activeTrack?.trim_end_ms || 0) / 1000;
  $: naturalDuration = duration || Number(activeTrack?.duration_ms || 0) / 1000;
  $: trimEndSeconds = configuredTrimEndSeconds > trimStartSeconds
    ? configuredTrimEndSeconds
    : naturalDuration;
  $: showVisualFixture = !hasAudio && !spotifyEmbedSrc && !PROFILE_MUSIC_ENABLED && import.meta.env.DEV && visualFixture === 'music';
  $: if (audioElement) audioElement.volume = Number(volume);

  function syncTrackState(nextKey) {
    if (nextKey === lastTrackSetKey) return;
    lastTrackSetKey = nextKey;
    activeTrackIndex = 0;
    duration = 0;
    isPlaying = false;
  }

  function syncPlaylistSettings(nextKey) {
    if (nextKey === lastPlaylistSettingsKey) return;
    lastPlaylistSettingsKey = nextKey;
    volume = playlist.volume;
    shuffleEnabled = playlist.shuffle;
  }

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
    duration = 0;
    isPlaying = false;
    mediaError = '';
  }

  function nextTrack() {
    if (!tracks.length) return;
    let nextIndex = activeTrackIndex + 1;
    if (shuffleEnabled && tracks.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } while (nextIndex === activeTrackIndex);
    }
    setTrack(nextIndex);
    if (entryActivated || !playlist.autoplay) requestAnimationFrame(() => void playAudio());
  }

  function previousTrack() {
    setTrack(activeTrackIndex - 1);
    if (entryActivated) requestAnimationFrame(() => void playAudio());
  }

  function handleTrackEnded() {
    if (!tracks.length) return;
    if (activeTrackIndex < tracks.length - 1 || shuffleEnabled) {
      nextTrack();
    } else if (playlist.loop) {
      if (audioElement) audioElement.currentTime = trimStartSeconds;
      void playAudio();
    }
  }

  function applyTrimStart() {
    if (audioElement && trimStartSeconds > 0 && audioElement.currentTime < trimStartSeconds) {
      audioElement.currentTime = trimStartSeconds;
    }
    duration = Number(audioElement?.duration) || Number(activeTrack?.duration_ms || 0) / 1000;
  }

  function enforceTrimEnd() {
    if (audioElement && trimEndSeconds > trimStartSeconds && audioElement.currentTime >= trimEndSeconds) {
      audioElement.pause();
      handleTrackEnded();
    }
  }

  function handleTimeUpdate() {
    enforceTrimEnd();
  }

  function handleDurationChange(event) {
    duration = Number(event.currentTarget.duration) || Number(activeTrack?.duration_ms || 0) / 1000;
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
    volume = Math.min(1, Math.max(0, Number(nextVolume) || 0));
    if (audioElement) audioElement.volume = volume;
  }

  onDestroy(() => {
    if (audioElement) audioElement.pause();
  });
</script>

{#if hasAudio}
  <div class:profile-music--reduced-motion={reducedMotion} class:profile-music--compact={compact} class:profile-music--inline={placement === 'inline'} class:profile-music--floating={placement !== 'inline'} class="profile-music profile-music--audio" data-music-state="audio" aria-label="Profile audio" role="region">
    <button type="button" class="profile-music__keyboard-target" aria-label="Profile audio keyboard controls" on:click={toggleAudio} on:keydown={handleMediaKey}></button>
    {#if showAudioControls || entryRequired}
      <ProfileAudioControls {isPlaying} {volume} on:toggle={toggleAudio} on:volumechange={(event) => updateVolume(event.detail)} />
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
        on:durationchange={handleDurationChange}
        on:timeupdate={handleTimeUpdate}
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
  .profile-music--spotify { display: block; min-height: 0; padding: 0; overflow: hidden; }
  .profile-music--spotify iframe { display: block; width: 100%; height: 152px; border: 0; }
  .profile-music__load { padding: .55rem .75rem; border: 1px solid rgba(230,238,255,.2); border-radius: 999px; background: transparent; color: rgba(241,246,255,.84); font: 600 .68rem/1 var(--font-mono-stack); cursor: pointer; }
  .profile-music__load:hover { border-color: var(--music-accent, var(--color-accent-cyan)); color: var(--color-ink-strong); }
  .profile-music--audio { min-height: 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
  .profile-music--audio.profile-music--floating { position: fixed; z-index: 6; left: 14px; top: 14px; bottom: auto; pointer-events: none; }
  .profile-music--audio.profile-music--inline { display: block; width: 100%; }
  .profile-music--audio > :global(.profile-audio-control), .profile-music--audio > button, .profile-music--audio > span { pointer-events: auto; }
  .profile-music--audio > audio { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .profile-music__keyboard-target { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; border: 0; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
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
  .profile-music__open { flex: 0 0 auto; padding: .38rem .55rem; border: 1px solid rgba(230,238,255,.2); border-radius: 999px; color: rgba(241,246,255,.84); font: 600 .58rem/1 var(--font-mono-stack); text-decoration: none; }
  .profile-music__open:hover, .profile-music__open:focus-visible { border-color: var(--music-accent, var(--color-accent-cyan)); color: var(--color-ink-strong); }
  @media (max-width: 36rem) { .profile-music { min-height: 0; padding-inline: .35rem; } .profile-music--audio.profile-music--floating { left:14px; right:auto; } }
</style>
