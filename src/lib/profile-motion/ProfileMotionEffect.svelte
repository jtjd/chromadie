<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { createProfileMotionController } from './profileMotionController.js';
  import { getProfileMotionRendererKey } from './profileMotions.js';

  export let motionKey = '';
  export let inputSurface = 'viewport';
  export let disabled = false;
  export let surfaceElement = null;
  export let className = '';

  let motionElement;
  let mounted = false;
  let controller = null;
  let controllerSignature = '';
  let controllerSurfaceElement = null;
  let motionEffectsModule;
  let motionEffectsPromise;
  let motionEffectsLoadVersion = 0;
  let effectHost;
  let haloShellOne;
  let haloShellTwo;
  let haloShellThree;
  let waveRing;

  $: rendererKey = getProfileMotionRendererKey(motionKey);
  $: motionEnabled = rendererKey === 'perspective-tilt' && !disabled;
  $: effectEnabled = ['perspective-tilt', 'halo-offset', 'wavefront'].includes(rendererKey) && !disabled;
  $: nextSignature = `${rendererKey}:${effectEnabled}:${inputSurface}:${surfaceElement ? 'surface' : 'local'}`;

  function syncController() {
    if (!mounted) return;
    if (!effectEnabled) {
      controller?.destroy();
      controller = null;
      controllerSignature = nextSignature;
      controllerSurfaceElement = surfaceElement;
      return;
    }
    if (nextSignature === controllerSignature && controllerSurfaceElement === surfaceElement && controller) return;
    controller?.destroy();
    controller = null;
    controllerSignature = nextSignature;
    controllerSurfaceElement = surfaceElement;
    if (rendererKey === 'perspective-tilt' && motionElement) {
      controller = createProfileMotionController({
        motionElement,
        surfaceElement,
        inputSurface,
        enabled: true
      });
    } else if ((rendererKey === 'halo-offset' || rendererKey === 'wavefront') && effectHost) {
      const requestVersion = ++motionEffectsLoadVersion;
      const install = renderer => {
        if (!mounted || requestVersion !== motionEffectsLoadVersion || controllerSignature !== nextSignature || !effectHost) return;
        if (rendererKey === 'halo-offset') {
          controller = renderer.createHaloOffsetController({
            host: effectHost,
            shells: [haloShellOne, haloShellTwo, haloShellThree],
            enabled: true
          });
        } else {
          controller = renderer.createWavefrontController({
            host: effectHost,
            motionElement,
            ring: waveRing,
            enabled: true
          });
        }
      };
      if (motionEffectsModule) {
        install(motionEffectsModule);
      } else {
        motionEffectsPromise ||= import('./profileMotionEffects.js');
        motionEffectsPromise.then(renderer => {
          motionEffectsModule = renderer;
          install(renderer);
        }).catch(() => {});
      }
    }
  }

  onMount(() => {
    mounted = true;
    syncController();
  });

  afterUpdate(syncController);

  onDestroy(() => {
    controller?.destroy();
    controller = null;
  });
</script>

{#if motionEnabled}
  <div
    class={'profile-motion-effect ' + className}
    data-profile-motion={rendererKey}
    data-profile-motion-surface={inputSurface}
  >
    <div bind:this={motionElement} class="profile-motion-effect__motion profile-motion-effect__motion--perspective">
      <slot></slot>
    </div>
  </div>
{:else if rendererKey === 'halo-offset' && !disabled}
  <div
    bind:this={effectHost}
    class={'profile-motion-effect profile-motion-effect--halo-offset ' + className}
    data-profile-motion={rendererKey}
    data-profile-motion-surface={inputSurface}
  >
    <span bind:this={haloShellOne} class="profile-motion-effect__halo-shell profile-motion-effect__halo-shell--one" aria-hidden="true"></span>
    <span bind:this={haloShellTwo} class="profile-motion-effect__halo-shell profile-motion-effect__halo-shell--two" aria-hidden="true"></span>
    <span bind:this={haloShellThree} class="profile-motion-effect__halo-shell profile-motion-effect__halo-shell--three" aria-hidden="true"></span>
    <div bind:this={motionElement} class="profile-motion-effect__motion profile-motion-effect__motion--decorative">
      <slot></slot>
    </div>
  </div>
{:else if rendererKey === 'wavefront' && !disabled}
  <div
    bind:this={effectHost}
    class={'profile-motion-effect profile-motion-effect--wavefront ' + className}
    data-profile-motion={rendererKey}
    data-profile-motion-surface={inputSurface}
  >
    <span bind:this={waveRing} class="profile-motion-effect__wave-ring" aria-hidden="true"></span>
    <div bind:this={motionElement} class="profile-motion-effect__motion profile-motion-effect__motion--decorative">
      <slot></slot>
    </div>
  </div>
{:else}
  <slot></slot>
{/if}

<style>
  .profile-motion-effect {
    width: 100%;
    min-width: 0;
    perspective: 1200px;
  }

  .profile-motion-effect__motion {
    width: 100%;
    min-width: 0;
    transform: rotateY(-4deg) rotateX(2deg);
    transform-style: preserve-3d;
    transition: transform 0.2s cubic-bezier(.23, 1, .32, 1);
    will-change: transform;
  }

  .profile-motion-effect__motion--decorative {
    position: relative;
    z-index: 1;
    transform: none;
    transform-style: flat;
    transition: none;
    will-change: auto;
  }

  .profile-motion-effect--halo-offset,
  .profile-motion-effect--wavefront {
    position: relative;
    isolation: isolate;
    overflow: visible;
  }

  .profile-motion-effect__halo-shell {
    position: absolute;
    z-index: 0;
    inset: 0;
    pointer-events: none;
    border: 1px solid rgba(205, 210, 255, .28);
    border-radius: var(--profile-border-radius, 1.25rem);
    box-shadow: 0 0 18px rgba(141, 220, 255, .09), inset 0 0 14px rgba(183, 253, 77, .035);
    opacity: .72;
    transform: translate3d(0, 0, 0);
    will-change: transform;
  }

  .profile-motion-effect__halo-shell--one {
    border-color: color-mix(in srgb, var(--profile-accent, #8DDCFF) 58%, transparent);
    opacity: .5;
  }

  .profile-motion-effect__halo-shell--two {
    border-color: color-mix(in srgb, #B7FD4D 45%, transparent);
    opacity: .32;
  }

  .profile-motion-effect__halo-shell--three {
    border-color: color-mix(in srgb, #B78BFF 48%, transparent);
    opacity: .22;
  }

  .profile-motion-effect__wave-ring {
    position: absolute;
    z-index: 2;
    display: block;
    width: 1px;
    height: 1px;
    border: 1px solid rgba(238, 249, 255, .78);
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(141, 220, 255, .18), 0 0 18px rgba(141, 220, 255, .22);
    opacity: 0;
    pointer-events: none;
    will-change: left, top, width, height, opacity;
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-motion-effect__halo-shell,
    .profile-motion-effect__wave-ring {
      transition: none;
      animation: none;
    }
  }

  @media (max-width: 930px), (prefers-reduced-motion: reduce) {
    .profile-motion-effect__motion {
      transform: none;
      transition: none;
      will-change: auto;
    }
  }
</style>
