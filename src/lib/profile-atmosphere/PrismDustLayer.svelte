<script>
  import { onDestroy, onMount } from 'svelte';

  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let active = true;
  export let animated = true;
  export let className = '';

  const PALETTE = ['#7CF7FF', '#63A0FF', '#B04CFF', '#FF58D0', '#FFD35A'];
  let host;
  let canvas;
  let context;
  let frame = 0;
  let mounted = false;
  let visible = true;
  let inViewport = true;
  let reducedMotion = false;
  let mediaQuery;
  let resizeObserver;
  let intersectionObserver;
  let particles = [];
  let pointer = null;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let seed = '';
  let handleMediaChange;
  let handleVisibilityChange;

  $: colors = [todayColor, ...(Array.isArray(recentColors) ? recentColors : []), ...PALETTE]
    .map(color => /^#[0-9a-f]{6}$/i.test(String(color || '')) ? String(color).toUpperCase() : '')
    .filter(Boolean)
    .filter((color, index, list) => list.indexOf(color) === index)
    .slice(0, 6);
  $: seed = colors.join(':');
  $: motionActive = Boolean(active && animated && visible && inViewport && !reducedMotion);
  $: classList = ['profile-atmosphere', 'profile-atmosphere--prism-dust', className, motionActive ? 'profile-atmosphere--animated' : 'profile-atmosphere--static'].filter(Boolean).join(' ');

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.codePointAt(0);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0) / 4294967295;
  }

  function colorAt(index) {
    return colors[index % Math.max(1, colors.length)] || PALETTE[index % PALETTE.length];
  }

  function buildParticles() {
    particles = Array.from({ length: 180 }, (_, index) => {
      const depth = 0.25 + hash(`${seed}:depth:${index}`) * 0.75;
      return {
        x: 0.08 + hash(`${seed}:x:${index}`) * 0.84,
        y: 0.12 + hash(`${seed}:y:${index}`) * 0.76,
        vx: (hash(`${seed}:vx:${index}`) - 0.5) * 0.000065,
        vy: (hash(`${seed}:vy:${index}`) - 0.5) * 0.000045,
        depth,
        size: (1.25 + hash(`${seed}:size:${index}`) * 4.8) * (0.72 + depth * 0.42),
        rotation: hash(`${seed}:rot:${index}`) * Math.PI * 2,
        spin: (hash(`${seed}:spin:${index}`) - 0.5) * 0.0012,
        twinkle: hash(`${seed}:twinkle:${index}`) * Math.PI * 2,
        cluster: hash(`${seed}:cluster:${index}`) < 0.42 ? Math.floor(hash(`${seed}:cluster-index:${index}`) * 4) : -1,
        colorIndex: Math.floor(hash(`${seed}:color:${index}`) * PALETTE.length)
      };
    });
  }

  function updateSize() {
    if (!host || !canvas || !context) return;
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
    draw(0);
  }

  function pointerMove(event) {
    if (event.pointerType === 'touch') return;
    const rect = host?.getBoundingClientRect?.();
    if (!rect || !rect.width || !rect.height) return;
    pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function pointerLeave() {
    pointer = null;
  }

  function drawShard(particle, time) {
    const normalizedTime = Number.isFinite(time) ? time : 0;
    const driftX = Math.sin(normalizedTime * 0.00021 + particle.twinkle) * width * 0.008;
    const driftY = Math.cos(normalizedTime * 0.00017 + particle.twinkle * 0.7) * height * 0.006;
    const pointerPull = pointer
      ? Math.max(0, 1 - Math.hypot(particle.x * width - pointer.x, particle.y * height - pointer.y) / 150)
      : 0;
    const x = particle.x * width + driftX + (pointer ? (pointer.x - particle.x * width) * pointerPull * 0.025 : 0);
    const y = particle.y * height + driftY + (pointer ? (pointer.y - particle.y * height) * pointerPull * 0.018 : 0);
    const size = particle.size * (0.76 + Math.sin(normalizedTime * 0.0018 + particle.twinkle) * 0.12);
    const alpha = (0.13 + particle.depth * 0.52) * (0.62 + Math.sin(normalizedTime * 0.0022 + particle.twinkle) * 0.28);
    const color = colorAt(particle.colorIndex);

    context.save();
    context.globalAlpha = Math.max(0.05, alpha);
    context.translate(x, y);
    context.rotate(particle.rotation + normalizedTime * particle.spin);
    context.fillStyle = color;
    context.strokeStyle = '#F8FDFF';
    context.lineWidth = Math.max(0.35, size * 0.12);
    context.shadowColor = color;
    context.shadowBlur = particle.depth > 0.72 ? size * 1.5 : size * 0.5;
    context.beginPath();
    context.moveTo(0, -size);
    context.lineTo(size * 0.68, size * 0.12);
    context.lineTo(size * 0.14, size * 0.82);
    context.lineTo(-size * 0.72, size * 0.2);
    context.closePath();
    context.fill();
    if (particle.depth > 0.58) {
      context.globalAlpha *= 0.72;
      context.beginPath();
      context.moveTo(0, -size * 0.56);
      context.lineTo(size * 0.18, size * 0.22);
      context.lineTo(-size * 0.16, size * 0.3);
      context.closePath();
      context.fillStyle = '#FFFFFF';
      context.fill();
    }
    if (particle.depth > 0.78 && Math.sin(normalizedTime * 0.0014 + particle.twinkle) > 0.88) {
      context.globalAlpha = 0.84;
      context.strokeStyle = '#FFFFFF';
      context.lineWidth = 0.55;
      context.beginPath();
      context.moveTo(-size * 1.55, 0);
      context.lineTo(size * 1.55, 0);
      context.moveTo(0, -size * 1.55);
      context.lineTo(0, size * 1.55);
      context.stroke();
    }
    context.restore();
  }

  function draw(time = 0) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const normalizedTime = motionActive ? time : 0;
    const clusters = [
      [0.25, 0.28, 0.22],
      [0.76, 0.32, 0.18],
      [0.36, 0.72, 0.2],
      [0.78, 0.76, 0.16]
    ];
    clusters.forEach(([x, y, radius], index) => {
      const gradient = context.createRadialGradient(x * width, y * height, 0, x * width, y * height, Math.max(width, height) * radius);
      gradient.addColorStop(0, `${colorAt(index)}28`);
      gradient.addColorStop(1, `${colorAt(index)}00`);
      context.globalAlpha = 0.55;
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    });
    particles.forEach(particle => drawShard(particle, normalizedTime));
  }

  function startLoop() {
    if (!frame && motionActive) {
      frame = requestAnimationFrame(timestamp => {
        frame = 0;
        draw(timestamp);
        startLoop();
      });
    }
  }

  function syncMotion() {
    if (!mounted) return;
    if (!motionActive && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      draw(0);
    } else if (motionActive) startLoop();
  }

  $: if (mounted && seed) {
    buildParticles();
    draw(motionActive ? performance.now() : 0);
  }
  $: if (mounted) syncMotion();

  onMount(() => {
    mounted = true;
    context = canvas?.getContext?.('2d', { alpha: true });
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reducedMotion = Boolean(mediaQuery?.matches);
    handleMediaChange = event => {
      reducedMotion = Boolean(event.matches);
      syncMotion();
    };
    mediaQuery?.addEventListener?.('change', handleMediaChange);
    host?.addEventListener('pointermove', pointerMove, { passive: true });
    host?.addEventListener('pointerleave', pointerLeave, { passive: true });
    handleVisibilityChange = () => {
      visible = document.visibilityState === 'visible';
      syncMotion();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(host);
    }
    if (typeof IntersectionObserver === 'function') {
      intersectionObserver = new IntersectionObserver(entries => {
        inViewport = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
        syncMotion();
      }, { rootMargin: '160px' });
      intersectionObserver.observe(host);
    }
    updateSize();
    syncMotion();
  });

  onDestroy(() => {
    mounted = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (typeof window !== 'undefined') {
      host?.removeEventListener('pointermove', pointerMove);
      host?.removeEventListener('pointerleave', pointerLeave);
      mediaQuery?.removeEventListener?.('change', handleMediaChange);
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
  });
</script>

<div bind:this={host} class={classList} aria-hidden="true" data-atmosphere="prism-dust" data-atmosphere-mode={mode}>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .profile-atmosphere--prism-dust { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background: transparent; }
  .profile-atmosphere--prism-dust canvas { display: block; width: 100%; height: 100%; }
  .profile-atmosphere--prism-dust.profile-atmosphere--static { opacity: .88; }
  @media (prefers-reduced-motion: reduce) {
    .profile-atmosphere--prism-dust { animation: none; }
  }
</style>
