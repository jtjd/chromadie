<script>
  import { createEventDispatcher } from 'svelte';
  export let isPlaying = false;
  export let volume = 0.75;
  const dispatch = createEventDispatcher();
</script>

<div class="profile-audio-control" style={`--volume-fill:${volume * 100}%;`}>
  <button type="button" aria-label={isPlaying ? 'Pause profile audio' : 'Play profile audio'} aria-pressed={isPlaying} on:click={() => dispatch('toggle')}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 9v6h4l5 4V5L7 9H3Z" />
      {#if isPlaying && volume > 0}<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />{:else}<path d="m16 9 5 6m0-6-5 6" />{/if}
    </svg>
  </button>
  <div class="profile-audio-control__volume">
    <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} on:input={(event) => dispatch('volumechange', Number(event.currentTarget.value))} />
  </div>
</div>

<style>
  .profile-audio-control { display:flex; align-items:center; width:52px; height:52px; box-sizing:border-box; border-radius:16px; background:color-mix(in srgb, var(--profile-text, #fff) 4%, transparent); color:var(--profile-text, #fff); overflow:hidden; transition:width 200ms ease; pointer-events:auto; }
  .profile-audio-control:hover, .profile-audio-control:focus-within { width:166px; }
  button { display:grid; place-items:center; flex:0 0 52px; width:52px; height:52px; border:0; padding:13px; background:transparent; color:inherit; cursor:pointer; }
  svg { width:26px; height:26px; }
  button:focus-visible { outline:2px solid currentColor; outline-offset:-5px; border-radius:16px; }
  .profile-audio-control__volume { flex:0 0 102px; padding-right:12px; opacity:0; transition:opacity 150ms ease; }
  .profile-audio-control:hover .profile-audio-control__volume, .profile-audio-control:focus-within .profile-audio-control__volume { opacity:1; }
  input { appearance:none; display:block; width:102px; height:9px; margin:0; border-radius:9px; background:linear-gradient(to right,currentColor var(--volume-fill),color-mix(in srgb,currentColor 25%,transparent) var(--volume-fill)); color:inherit; cursor:pointer; }
  input::-webkit-slider-thumb { appearance:none; width:9px; height:9px; border:0; border-radius:50%; background:currentColor; }
  input::-moz-range-thumb { width:9px; height:9px; border:0; border-radius:50%; background:currentColor; }
  @media(prefers-reduced-motion:reduce) { .profile-audio-control,.profile-audio-control__volume { transition:none; } }
</style>
