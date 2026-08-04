<script>
  import { onDestroy, onMount } from 'svelte';

  export let effectKey = '';
  export let accentColor = '#8B7CF6';
  export let recentColors = [];
  export let active = true;
  export let animated = true;

  const PARTICLE_EFFECTS = new Set(['prism-orbit', 'ember-crown']);
  const FALLBACK_COLORS = ['#8B7CF6', '#8DDCFF', '#B7FD4D', '#F7B7E2'];

  let host;
  let canvas;
  let context;
  let resizeObserver;
  let intersectionObserver;
  let mediaQuery;
  let mounted = false;
  let visible = true;
  let reducedMotion = false;
  let frame = 0;
  let startedAt = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;

  $: supported = PARTICLE_EFFECTS.has(effectKey);
  $: running = Boolean(supported && active && animated && visible && !reducedMotion);

  $: if (mounted) {
    if (running) startLoop();
    else {
      stopLoop();
      drawFrame(0);
    }
  }

  function safeColor(value, fallback = '#8B7CF6') {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
  }

  function hexToRgba(value, alpha = 1) {
    const color = safeColor(value);
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  function getPalette() {
    const colors = [
      ...(Array.isArray(recentColors) ? recentColors : []),
      accentColor,
      ...FALLBACK_COLORS
    ].map(color => safeColor(color, '')).filter(Boolean);
    return [...new Set(colors)].slice(0, 4);
  }

  function updateReducedMotion(event) {
    reducedMotion = Boolean(event?.matches ?? mediaQuery?.matches);
  }

  function updateSize() {
    if (!host || !canvas || !context) return;
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(0);
  }

  function startLoop() {
    if (!running || frame) return;
    startedAt = performance.now();
    frame = requestAnimationFrame(animate);
  }

  function stopLoop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function animate(timestamp) {
    frame = 0;
    if (!running) return;
    drawFrame(timestamp - startedAt);
    frame = requestAnimationFrame(animate);
  }

  function clear() {
    context?.clearRect(0, 0, width, height);
  }

  function drawShard(x, y, size, rotation, color) {
    if (!context) return;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.globalCompositeOperation = 'screen';
    context.shadowColor = hexToRgba(color, 0.72);
    context.shadowBlur = Math.max(3, size * 0.9);

    const gradient = context.createLinearGradient(-size, -size, size, size);
    gradient.addColorStop(0, hexToRgba('#FFFFFF', 0.74));
    gradient.addColorStop(0.22, hexToRgba(color, 0.68));
    gradient.addColorStop(1, hexToRgba(color, 0.04));
    context.fillStyle = gradient;
    context.strokeStyle = hexToRgba('#FFFFFF', 0.62);
    context.lineWidth = 0.7;
    context.beginPath();
    context.moveTo(0, -size * 1.25);
    context.lineTo(size * 0.72, size * 0.58);
    context.lineTo(-size * 0.62, size * 0.86);
    context.closePath();
    context.fill();
    context.stroke();

    context.shadowBlur = 0;
    context.strokeStyle = hexToRgba('#FFFFFF', 0.38);
    context.lineWidth = 0.45;
    context.beginPath();
    context.moveTo(0, -size * 1.16);
    context.lineTo(0, size * 0.2);
    context.lineTo(size * 0.58, size * 0.56);
    context.stroke();
    context.restore();
  }

  function drawPrism(elapsed) {
    const palette = getPalette();
    const seconds = elapsed / 1000;
    const radius = Math.min(width, height) * 0.42;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let index = 0; index < 3; index += 1) {
      const phase = [-0.6, 1.35, 3.2][index];
      const angle = seconds * (0.38 + index * 0.035) + phase;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.62;
      const size = Math.max(3, Math.min(width, height) * (0.055 + index * 0.006));
      drawShard(x, y, size, angle + Math.PI / 2 + Math.sin(seconds * 0.8 + index) * 0.14, palette[index % palette.length]);
    }
  }

  function drawFlare(x, y, size, color, alpha) {
    if (!context) return;
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = alpha;
    context.strokeStyle = hexToRgba('#FFF1B8', 0.9);
    context.shadowColor = hexToRgba(color, 0.86);
    context.shadowBlur = size * 2;
    context.lineWidth = 0.9;
    context.beginPath();
    context.moveTo(x, y - size * 2.2);
    context.lineTo(x, y + size * 2.2);
    context.moveTo(x - size * 1.6, y);
    context.lineTo(x + size * 1.6, y);
    context.stroke();
    context.restore();
  }

  function drawEmber(x, y, size, rotation, color, alpha) {
    if (!context) return;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = alpha;
    context.shadowColor = hexToRgba(color, 0.9);
    context.shadowBlur = size * 1.6;
    const gradient = context.createLinearGradient(0, -size * 1.5, 0, size * 1.5);
    gradient.addColorStop(0, '#FFF1B8');
    gradient.addColorStop(0.4, color);
    gradient.addColorStop(1, hexToRgba(color, 0.02));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, -size * 1.7);
    context.bezierCurveTo(size * 0.9, -size * 0.55, size * 0.8, size * 0.86, 0, size * 1.35);
    context.bezierCurveTo(-size * 0.75, size * 0.74, -size * 0.7, -size * 0.62, 0, -size * 1.7);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawEmberCrown(elapsed) {
    const palette = ['#FFD77A', '#F5A45D', '#FFF1B8', '#E3A84D'];
    const seconds = elapsed / 1000;
    const originY = height * 0.27;
    const driftWidth = Math.min(width, height) * 0.22;

    for (let index = 0; index < 8; index += 1) {
      const duration = 2.9 + (index % 4) * 0.48;
      const progress = (seconds / duration + index * 0.137) % 1;
      const x = width * (0.26 + (index % 5) * 0.12) + Math.sin(seconds * (0.75 + index * 0.06) + index) * driftWidth * 0.34;
      const y = originY - progress * height * (0.24 + (index % 3) * 0.05);
      const size = Math.max(1.2, Math.min(width, height) * (0.018 + (index % 3) * 0.006));
      const alpha = Math.sin(progress * Math.PI) * (0.52 + (index % 3) * 0.1);
      drawEmber(x, y, size, Math.sin(seconds * 0.8 + index) * 0.45, palette[index % palette.length], alpha);
      if (index === 2 && progress > 0.42 && progress < 0.58) drawFlare(x, y, size, palette[index % palette.length], (1 - Math.abs(progress - 0.5) * 8) * 0.72);
    }
  }

  function drawFrame(elapsed = 0) {
    if (!context || !supported) return;
    clear();
    if (effectKey === 'prism-orbit') drawPrism(elapsed);
    if (effectKey === 'ember-crown') drawEmberCrown(elapsed);
  }

  function resetVisibility() {
    if (document.visibilityState !== 'visible') {
      stopLoop();
      clear();
    } else {
      drawFrame(0);
      if (running) startLoop();
    }
  }

  onMount(() => {
    context = canvas?.getContext('2d', { alpha: true });
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);
    document.addEventListener('visibilitychange', resetVisibility);

    resizeObserver = new ResizeObserver(updateSize);
    if (host) resizeObserver.observe(host);
    if ('IntersectionObserver' in window && host) {
      intersectionObserver = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (!visible) {
          stopLoop();
          clear();
        } else {
          drawFrame(0);
          if (running) startLoop();
        }
      }, { rootMargin: '120px' });
      intersectionObserver.observe(host);
    }

    mounted = true;
    updateSize();
    if (running) startLoop();

    return () => {
      mounted = false;
      stopLoop();
      document.removeEventListener('visibilitychange', resetVisibility);
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  });

  onDestroy(stopLoop);
</script>

<div bind:this={host} class="avatar-particles" aria-hidden="true">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .avatar-particles { position:absolute; inset:-18%; z-index:4; pointer-events:none; overflow:visible; }
  .avatar-particles canvas { display:block; width:100%; height:100%; overflow:visible; }
</style>
