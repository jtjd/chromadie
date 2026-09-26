<script>
  import { onMount } from 'svelte';
  import { drawAuthoredAtmosphere } from './authoredScenes.js';

  export let atmosphereKey;
  export let mode = 'profile';
  export let active = true;
  export let animated = true;
  export let className = '';
  export let painter = drawAuthoredAtmosphere;

  let canvas;
  let running = false;
  let controller;
  $: controller?.update({ atmosphereKey, mode, active, animated, painter });

  onMount(() => {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let config = { atmosphereKey, mode, active, animated, painter };
    let width = 0, height = 0, frame = 0, time = 0, last = 0;
    let intersects = true, destroyed = false;
    function draw() { config.painter(context, config.atmosphereKey, width, height, time); }
    function tick(now) {
      frame = 0;
      if (!running || destroyed) return;
      if (!last) last = now;
      if (now - last >= 1000 / 30) {
        time += Math.min(now - last, 80) / 1000;
        last = now; draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      running = Boolean(!destroyed && config.active && config.animated && !media.matches
        && !['card', 'compact'].includes(config.mode) && intersects && width > 0 && height > 0
        && document.visibilityState === 'visible');
      if (running && !frame) { last = 0; frame = requestAnimationFrame(tick); }
      else if (!running && frame) { cancelAnimationFrame(frame); frame = 0; }
    }
    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      // Cap total pixel allocation as well as DPR on tall public profiles.
      const dpr = Math.min(1.75, window.devicePixelRatio || 1, Math.sqrt(1800000 / Math.max(1, width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(); sync();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(entries => {
      intersects = entries.some(entry => entry.isIntersecting); sync();
    });
    intersectionObserver.observe(canvas);
    controller = { update(next) {
      if (config.atmosphereKey !== next.atmosphereKey) time = 0;
      config = next; draw(); sync();
    } };
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pageshow', sync);
    resize();
    return () => {
      destroyed = true; running = false; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pageshow', sync);
      controller = null;
    };
  });
</script>

<div class={`profile-atmosphere authored-atmosphere ${className}`} aria-hidden="true"
  data-atmosphere={atmosphereKey} data-atmosphere-state={running ? 'animated' : 'poster'} data-atmosphere-mode={mode}>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .authored-atmosphere { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
