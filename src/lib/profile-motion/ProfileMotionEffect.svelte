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

  $: rendererKey = getProfileMotionRendererKey(motionKey);
  $: motionEnabled = rendererKey === 'perspective-tilt' && !disabled;
  $: nextSignature = `${motionEnabled}:${inputSurface}:${surfaceElement ? 'surface' : 'local'}`;

  function syncController() {
    if (!mounted) return;
    if (!motionEnabled || !motionElement) {
      controller?.destroy();
      controller = null;
      controllerSignature = nextSignature;
      controllerSurfaceElement = surfaceElement;
      return;
    }
    if (nextSignature === controllerSignature && controllerSurfaceElement === surfaceElement && (controller || !motionEnabled)) return;
    controller?.destroy();
    controller = null;
    controllerSignature = nextSignature;
    controllerSurfaceElement = surfaceElement;
    if (motionEnabled) {
      controller = createProfileMotionController({
        motionElement,
        surfaceElement,
        inputSurface,
        enabled: true
      });
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
    <div bind:this={motionElement} class="profile-motion-effect__motion">
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
    transform: rotateY(-10deg) rotateX(5deg);
    transform-style: preserve-3d;
    transition: transform 0.2s cubic-bezier(.23, 1, .32, 1);
    will-change: transform;
  }

  @media (max-width: 930px), (prefers-reduced-motion: reduce) {
    .profile-motion-effect__motion {
      transform: none;
      transition: none;
      will-change: auto;
    }
  }
</style>
