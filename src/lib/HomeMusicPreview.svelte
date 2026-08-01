<script>
  import ProfileAudioControls from './ProfileAudioControls.svelte';

  export let accent = '#8ddcff';
  let isPlaying = false;
  let volume = 0.75;
</script>

<div class="home-music-preview" aria-label="Example profile audio controls">
  <ProfileAudioControls placement="canvas" {accent} {isPlaying} {volume} on:toggle={() => isPlaying = !isPlaying} on:volumechange={(event) => volume = event.detail} />
</div>

<style>
  .home-music-preview {
    position: absolute;
    z-index: 4;
    inset: 0;
    pointer-events: none;
  }

  .home-music-preview :global(.profile-audio-control) { pointer-events: auto; }
</style>
