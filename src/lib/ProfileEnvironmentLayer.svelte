<script>
  import AtmosphereLayer from './profile-atmosphere/LazyAtmosphereLayer.svelte';
  import CursorTrailLayer from './cursor-trail/LazyCursorTrailLayer.svelte';

  /** @type {any} */
  export let snapshot = null;
  export let mode = 'public';
  export let reducedMotion = false;

  $: environment = snapshot?.environment || {};
  $: backgroundSrc = environment.backgroundImageUrl || '';
  $: backgroundVideoSrc = environment.backgroundVideoUrl || '';
  $: backgroundVideoActive = Boolean(backgroundVideoSrc && !reducedMotion);
  $: atmosphereKey = environment.atmosphereKey || '';
  $: cursorTrailKey = environment.cursorTrailKey || '';
  $: todayColor = snapshot?.colors?.nameToday || '#8B7CF6';
  $: recentColors = snapshot?.colors?.nameRecent || [];
  $: pageStyle = snapshot?.styles?.page || '';
</script>

<div
  class={'profile-environment profile-environment--' + mode}
  style={pageStyle}
  aria-hidden="true"
>
  {#if backgroundSrc && !backgroundVideoActive}
    <img class="profile-environment__image" src={backgroundSrc} alt="" loading="eager" decoding="async" />
  {/if}
  {#if backgroundSrc}
    <div class="profile-environment__overlay"></div>
  {/if}
  {#if backgroundVideoActive}
    <video class="profile-environment__video" src={backgroundVideoSrc} autoplay muted loop playsinline></video>
  {/if}
  {#if atmosphereKey}
    <AtmosphereLayer atmosphereKey={atmosphereKey} todayColor={todayColor} recentColors={recentColors} active={true} animated={!reducedMotion} mode="profile" className="profile-environment__atmosphere" />
  {/if}
  {#if cursorTrailKey}
    <CursorTrailLayer trailKey={cursorTrailKey} recentColors={recentColors} todayColor={todayColor} active={true} inputMode={mode === 'studio' ? 'demo' : 'window'} className="profile-environment__cursor" />
  {/if}
</div>

<style>
  .profile-environment {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background: var(--profile-background-paint, var(--profile-background, #050506));
    pointer-events: none;
  }

  .profile-environment--public,
  .profile-environment--studio { position: fixed; }

  .profile-environment__image,
  .profile-environment__video {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: var(--profile-background-image-opacity, 1);
    filter: blur(var(--profile-background-blur, 0px));
  }

  .profile-environment__image { transform: scale(1.04); }
  .profile-environment__video { transform: scale(1.04); opacity: calc(var(--profile-background-image-opacity, 1) * .92); }
  .profile-environment__overlay { position: absolute; inset: 0; z-index: 1; background: var(--profile-background-overlay, transparent); opacity: var(--profile-background-overlay-opacity, 0); }
  :global(.profile-environment__atmosphere) { position: absolute; inset: 0; z-index: 2; }
  :global(.profile-environment__cursor) { position: absolute; inset: 0; z-index: 3; }

  @media (prefers-reduced-motion: reduce) {
    .profile-environment__video { display: none; }
  }
</style>
