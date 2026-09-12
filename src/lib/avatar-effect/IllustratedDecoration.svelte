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

<span bind:this={host} class="illustrated-decoration" data-decoration={effectKey} aria-hidden="true">
  {#if !failed}
    <img src={artwork} alt="" draggable="false" class:covered={ready} on:error={() => { failed = true; }} />
  {/if}
  <canvas bind:this={canvas} class:ready></canvas>
</span>

<style>
  /* Each plate is fitted to its portrait opening, not its outer silhouette.
     Equal width/height preserves the authored image and shader coordinates. */
  .illustrated-decoration { position:absolute; width:var(--plate-size); height:var(--plate-size); left:var(--plate-left); top:var(--plate-top); z-index:3; pointer-events:none; }
  [data-decoration="moonlit-clouds"] { --plate-size:145%; --plate-left:-26%; --plate-top:-13.5%; }
  [data-decoration="enchanted-garden"] { --plate-size:160%; --plate-left:-36%; --plate-top:-20%; }
  [data-decoration="prismatic-fracture"] { --plate-size:148%; --plate-left:-25%; --plate-top:-23%; }
  [data-decoration="sakura-neko"] { --plate-size:147%; --plate-left:-24%; --plate-top:-20.5%; }
  [data-decoration="cloud-bunny"] { --plate-size:145%; --plate-left:-25%; --plate-top:-28.5%; }
  [data-decoration="crimson-ronin"] { --plate-size:148%; --plate-left:-25%; --plate-top:-24%; }
  [data-decoration="midnight-oni"] { --plate-size:150%; --plate-left:-25%; --plate-top:-26.5%; }
  [data-decoration="koi-current"] { --plate-size:142%; --plate-left:-21%; --plate-top:-19.5%; }

  img, canvas { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
  img.covered { visibility:hidden; }
  canvas { opacity:0; }
  canvas.ready { opacity:1; }
  @media (prefers-reduced-motion: reduce) {
    canvas.ready { opacity:0; }
    img.covered { visibility:visible; }
  }
</style>
