<script>
  import { tick } from 'svelte';

  export let src = '';
  export let alt = '';
  export let width = undefined;
  export let height = undefined;
  export let buttonClass = '';
  export let imageClass = '';

  let open = false;
  let trigger;
  let closeButton;

  function openImage() {
    open = true;
    void tick().then(() => closeButton?.focus());
  }

  function closeImage() {
    open = false;
    void tick().then(() => trigger?.focus());
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && open) closeImage();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="home-image-lightbox">
  <button
    bind:this={trigger}
    class={`home-image-lightbox__trigger ${buttonClass}`}
    type="button"
    aria-label={`View larger image: ${alt}`}
    on:click={openImage}
  >
    <img class={`home-image-lightbox__image ${imageClass}`} {src} {alt} {width} {height} loading="lazy" decoding="async" />
    <span class="home-image-lightbox__hint" aria-hidden="true">View larger ↗</span>
  </button>
</div>

{#if open}
  <div class="home-image-lightbox__backdrop" role="presentation" on:click|self={closeImage}>
    <div class="home-image-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Expanded image preview" tabindex="-1">
      <button bind:this={closeButton} class="home-image-lightbox__close" type="button" aria-label="Close enlarged image" on:click={closeImage}>×</button>
      <img class="home-image-lightbox__expanded" {src} {alt} {width} {height} decoding="async" />
    </div>
  </div>
{/if}

<style>
  .home-image-lightbox { width: 100%; height: 100%; }
  .home-image-lightbox__trigger { position: relative; display: block; width: 100%; height: 100%; padding: 0; overflow: hidden; border: 0; background: transparent; color: inherit; cursor: zoom-in; text-align: left; }
  .home-image-lightbox__trigger:focus-visible { z-index: 1; outline: 2px solid var(--home-accent, #cdd2ff); outline-offset: -3px; }
  .home-image-lightbox__image { display: block; width: 100%; height: 100%; object-fit: cover; }
  .home-image-lightbox__hint { position: absolute; right: 0.75rem; bottom: 0.75rem; padding: 0.45rem 0.55rem; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 0.25rem; background: rgba(8, 9, 12, 0.78); color: #d2d0d7; font: 0.62rem / 1 var(--home-mono, ui-monospace, monospace); opacity: 0; transform: translateY(0.35rem); transition: opacity 0.2s ease, transform 0.2s ease; pointer-events: none; }
  .home-image-lightbox__trigger:hover .home-image-lightbox__hint,
  .home-image-lightbox__trigger:focus-visible .home-image-lightbox__hint { opacity: 1; transform: none; }
  .home-image-lightbox__backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(3, 4, 7, 0.84); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .home-image-lightbox__dialog { position: relative; display: grid; place-items: center; width: min(100%, 100rem); max-height: calc(100dvh - 2rem); padding: 2.75rem 1rem 1rem; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 0.65rem; background: #090a0d; box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.5); }
  .home-image-lightbox__expanded { display: block; width: auto; max-width: 100%; height: auto; max-height: calc(100dvh - 5rem); object-fit: contain; border-radius: 0.3rem; }
  .home-image-lightbox__close { position: absolute; top: 0.65rem; right: 0.65rem; display: grid; place-items: center; width: 2rem; height: 2rem; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 50%; background: rgba(255, 255, 255, 0.06); color: #f2f0eb; font: 1.25rem / 1 var(--home-font, ui-sans-serif, sans-serif); cursor: pointer; }
  .home-image-lightbox__close:hover { background: rgba(255, 255, 255, 0.12); }
  .home-image-lightbox__close:focus-visible { outline: 2px solid var(--home-accent, #cdd2ff); outline-offset: 3px; }
  @media (max-width: 48rem) {
    .home-image-lightbox__dialog { padding-inline: 0.55rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-image-lightbox__hint { transition: none; transform: none; }
  }
</style>
