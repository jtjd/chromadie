<script>
  import { onMount } from 'svelte';
  export let artwork;
  export let effectKey;
  export let animated = true;
  let canvas;
  let host;
  let ready = false;
  let failed = false;
  let controller;
  $: controller?.update(animated);
  onMount(() => {
    let disposed = false;
    import('./illustratedDecorationRenderer.js').then(({ createIllustratedDecoration }) => {
      if (disposed) return;
      controller = createIllustratedDecoration({ canvas, host, artwork, effectKey, enabled: animated,
        onReady: value => { ready = value; } });
    }).catch(() => { ready = false; });
    return () => { disposed = true; controller?.destroy(); };
  });
</script>

<span bind:this={host} class="illustrated-decoration" aria-hidden="true">
  {#if !failed}
    <img src={artwork} alt="" draggable="false" class:covered={ready} on:error={() => { failed = true; }} />
  {/if}
  <canvas bind:this={canvas} class:ready></canvas>
</span>

<style>
  .illustrated-decoration { position:absolute; inset:-19%; z-index:3; pointer-events:none; }
  img, canvas { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
  img.covered { visibility:hidden; }
  canvas { opacity:0; }
  canvas.ready { opacity:1; }
  @media (prefers-reduced-motion: reduce) {
    canvas.ready { opacity:0; }
    img.covered { visibility:visible; }
  }
</style>
