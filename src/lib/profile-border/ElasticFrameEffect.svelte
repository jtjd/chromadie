<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { createElasticFrameController } from './elasticFrameRenderer.js';

  export let host = null;
  export let enabled = true;

  let controller;
  let paths = { outer: '', inner: '' };
  let viewBox = { width: 1, height: 1 };

  function syncController() {
    if (!host) return;
    if (!controller) {
      controller = createElasticFrameController({
        host,
        enabled,
        setPaths: (nextPaths, size) => {
          paths = nextPaths;
          viewBox = size || viewBox;
        }
      });
      return;
    }
    controller.update({ enabled });
  }

  onMount(syncController);
  afterUpdate(syncController);

  onDestroy(() => {
    controller?.destroy();
    controller = null;
  });
</script>

<svg
  class="elastic-frame-effect"
  viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <linearGradient id="profile-elastic-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F7FBFF" stop-opacity=".92" />
      <stop offset=".42" stop-color="var(--border-accent)" stop-opacity=".9" />
      <stop offset="1" stop-color="#B78BFF" stop-opacity=".76" />
    </linearGradient>
  </defs>
  <path class="elastic-frame-effect__path elastic-frame-effect__path--outer" d={paths.outer} />
  <path class="elastic-frame-effect__path elastic-frame-effect__path--inner" d={paths.inner} />
</svg>
<div class="profile-border-effect__content"><slot /></div>

<style>
  .elastic-frame-effect {
    position: absolute;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .elastic-frame-effect__path {
    fill: none;
    stroke: url(#profile-elastic-gradient);
    vector-effect: non-scaling-stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .elastic-frame-effect__path--outer { stroke-width: 1.6; opacity: .92; }
  .elastic-frame-effect__path--inner { stroke-width: .72; opacity: .56; }

  :global(.profile-border-effect--static) .elastic-frame-effect__path--outer { opacity: .72; }
  :global(.profile-border-effect--static) .elastic-frame-effect__path--inner { opacity: .42; }

  .profile-border-effect__content {
    min-width: 0;
    max-width: 100%;
    border-radius: inherit;
    position: relative;
    z-index: 1;
    overflow: visible;
  }
</style>
