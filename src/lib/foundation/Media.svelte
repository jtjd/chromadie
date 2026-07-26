<script>
  import { normalizeMediaSource } from '../mediaSafety.js';

  export let src = '';
  export let alt = '';
  export let aspect = 'square';
  /** @type {'lazy' | 'eager'} */
  export let loading = 'lazy';
  export let className = '';
  export let fallbackLabel = 'Media unavailable';

  const allowedAspects = new Set(['square', 'landscape', 'portrait', 'wide']);
  $: safeAspect = allowedAspects.has(aspect) ? aspect : 'square';
  $: mediaClass = ['foundation-media', `foundation-media--${safeAspect}`, className].filter(Boolean).join(' ');
  $: safeSrc = normalizeMediaSource(src);
  let failedSource = '';
  $: if (safeSrc !== failedSource && safeSrc) failedSource = '';

  function handleError() {
    failedSource = safeSrc;
  }
</script>

<div class={mediaClass} data-media-state={safeSrc && failedSource !== safeSrc ? 'loading' : 'fallback'}>
  {#if safeSrc && failedSource !== safeSrc}
    <img src={safeSrc} {alt} {loading} decoding="async" on:error={handleError} />
  {:else}
    <div class="foundation-media__fallback" role={alt ? 'img' : 'presentation'} aria-label={alt || undefined}>
      <span aria-hidden="true">✦</span>
      {#if alt}<span>{fallbackLabel}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .foundation-media {
    position: relative;
    overflow: hidden;
    display: block;
    background: var(--surface-panel-soft);
    border: 1px solid var(--color-line-subtle);
  }

  .foundation-media--square { aspect-ratio: 1; border-radius: var(--radius-md); }
  .foundation-media--landscape { aspect-ratio: 16 / 10; border-radius: var(--radius-md); }
  .foundation-media--portrait { aspect-ratio: 4 / 5; border-radius: var(--radius-lg); }
  .foundation-media--wide { aspect-ratio: 2 / 1; border-radius: var(--radius-lg); }

  .foundation-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .foundation-media__fallback {
    display: grid;
    place-items: center;
    gap: 0.35rem;
    width: 100%;
    height: 100%;
    min-height: 3rem;
    color: var(--color-ink-muted);
    font-size: 0.72rem;
    text-align: center;
  }

  .foundation-media__fallback > span:first-child {
    color: var(--color-accent-bright);
    font-size: 1.35rem;
  }
</style>
