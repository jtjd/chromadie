<script>
  import { onMount } from 'svelte';
  import { getIllustratedDecorationFrame } from './illustratedDecorationFrames.js';
  export let artwork;
  export let effectKey;
  export let animated = true;
  let canvas;
  let host;
  let ready = false;
  let failed = false;
  let controller;
  $: aperture = getIllustratedDecorationFrame(effectKey);
  $: plateScale = .5 / aperture.radius;
  $: plateStyle = `--plate-size:${plateScale * 100}%;--plate-left:${(0.5 - aperture.x * plateScale) * 100}%;--plate-top:${(0.5 - aperture.y * plateScale) * 100}%;--aperture-x:${aperture.x * 100}%;--aperture-y:${aperture.y * 100}%;--aperture-radius:${aperture.radius * 100}%;`;
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

<span bind:this={host} class="illustrated-decoration" data-decoration={effectKey} style={plateStyle} aria-hidden="true">
  {#if !failed}
    <img src={artwork} alt="" draggable="false" class:covered={ready} on:error={() => { failed = true; }} />
  {/if}
  <canvas bind:this={canvas} class:ready></canvas>
</span>

<style>
  /* Each plate is fitted to its portrait opening, not its outer silhouette.
     Equal width/height preserves the authored image and shader coordinates. */
  .illustrated-decoration { position:absolute; width:var(--plate-size); height:var(--plate-size); left:var(--plate-left); top:var(--plate-top); z-index:3; pointer-events:none; }
  img, canvas { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; -webkit-mask:radial-gradient(circle at var(--aperture-x) var(--aperture-y), transparent 0 calc(var(--aperture-radius) - 1px), #000 var(--aperture-radius)); mask:radial-gradient(circle at var(--aperture-x) var(--aperture-y), transparent 0 calc(var(--aperture-radius) - 1px), #000 var(--aperture-radius)); }
  img.covered { visibility:hidden; }
  canvas { opacity:0; }
  canvas.ready { opacity:1; }
  @media (prefers-reduced-motion: reduce) {
    canvas.ready { opacity:0; }
    img.covered { visibility:visible; }
  }
</style>
