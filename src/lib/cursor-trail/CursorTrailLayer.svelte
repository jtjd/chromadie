<script>
  import { onDestroy, onMount } from 'svelte';
  import { getCursorTrailKey } from './cursorTrails.js';

  export let trailKey = '';
  export let recentColors = [];
  export let todayColor = '#8B7CF6';
  export let active = true;
  export let className = '';
  // Live profiles listen to the window pointer. Compact fitting-room cards
  // use the same renderer with a deterministic demo path so a card never
  // invents a second, CSS-only version of an effect.
  export let inputMode = 'window';

  let host;
  let canvas;
  let context;
  let observer;
  let resizeObserver;
  let mediaQuery;
  let visible = true;
  let reducedMotion = false;
  let touchOnly = false;
  let frame = 0;
  let lastTime = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let pointer = null;
  let history = [];
  let particles = [];
  let mounted = false;
  let demoCycle = 0;

  $: resolvedKey = getCursorTrailKey(trailKey);
  $: resolvedInputMode = inputMode === 'demo' ? 'demo' : 'window';
  $: isRunning = Boolean(resolvedKey && active && visible && (resolvedInputMode === 'demo' || !touchOnly));
  $: classList = ['cursor-trail-layer', className, `cursor-trail-layer--${resolvedInputMode}`, isRunning ? 'cursor-trail-layer--active' : '', reducedMotion ? 'cursor-trail-layer--reduced' : ''].filter(Boolean).join(' ');
  // A fitting-room card remains mounted while its parent tab is hidden. The
  // browser can pause its observers during that display:none interval, so a
  // demo trail must be able to restart from the reactive visible/running
  // boundary as well as from the IntersectionObserver callback.
  $: if (mounted && visible && isRunning && resolvedInputMode === 'demo' && !reducedMotion) startLoop();

  const FALLBACK_COLORS = ['#8B7CF6', '#8DDCFF', '#B7FD4D', '#F7B7E2'];

  function safeColor(value, fallback = '#8B7CF6') {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
  }

  function getColors() {
    const colors = [...(Array.isArray(recentColors) ? recentColors : []), todayColor, ...FALLBACK_COLORS]
      .map(color => safeColor(color, ''))
      .filter(Boolean);
    return [...new Set(colors)].slice(0, 6);
  }

  function updateReducedMotion(event) {
    reducedMotion = Boolean(event?.matches ?? mediaQuery?.matches);
    if (!mounted) return;
    if (reducedMotion) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (resolvedInputMode === 'demo') drawDemoFrame(performance.now(), true);
    } else if (resolvedInputMode === 'demo') {
      startLoop();
    }
  }

  function updateInputMode() {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    // A hybrid laptop can report touch points and a coarse primary pointer
    // while still having a real mouse/trackpad. Disable only when no fine
    // pointer is available, so the native cursor remains the source of truth.
    touchOnly = Boolean(!fine && (coarse || navigator.maxTouchPoints > 0));
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
    context.clearRect(0, 0, width, height);
  }

  function pointForEvent(event) {
    if (!host || !event || !['mouse', 'pen'].includes(event.pointerType || 'mouse')) return null;
    const rect = host.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return {
      x: Math.max(0, Math.min(width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(height, event.clientY - rect.top)),
      speed: Math.min(2.4, Math.max(0.2, Math.hypot(event.movementX || 0, event.movementY || 0) / 8)),
      time: performance.now()
    };
  }

  function addParticle(point, kind = 'dot') {
    if (particles.length > 70) particles.splice(0, particles.length - 70);
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.2 + Math.random() * 0.8;
    particles.push({
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 3.5,
      life: 1,
      decay: 0.018 + Math.random() * 0.028,
      rotation: angle,
      kind
    });
  }

  function handlePointerMove(event) {
    if (!isRunning) return;
    const point = pointForEvent(event);
    if (!point) return;
    pointer = point;
    history.push(point);
    if (history.length > 28) history.shift();
    if (resolvedKey === 'pixel-wake' || resolvedKey === 'glass-shards' || resolvedKey === 'ember-ash' || resolvedKey === 'gold-fleck' || resolvedKey === 'solar-sparks') {
      addParticle(point, resolvedKey);
      if (point.speed > 1.5) addParticle(point, resolvedKey);
    }
    if (reducedMotion) drawFrame(0, true);
    else startLoop();
  }

  function startLoop() {
    if (!frame && isRunning && !reducedMotion) frame = requestAnimationFrame(animate);
  }

  function demoPoint(timestamp) {
    const cycleDuration = 4600;
    const normalized = ((timestamp % cycleDuration) + cycleDuration) / cycleDuration;
    const phase = normalized * Math.PI * 2;
    const travel = (1 - Math.cos(phase)) / 2;
    const eased = travel * travel * (3 - 2 * travel);
    return {
      x: width * (0.12 + eased * 0.76),
      y: height * (0.76 - eased * 0.52 + Math.sin(phase * 2) * 0.035),
      speed: 1.1 + Math.abs(Math.sin(phase)) * 0.8,
      time: timestamp
    };
  }

  function updateDemoPoint(timestamp) {
    const point = demoPoint(timestamp);
    pointer = point;
    history.push(point);
    if (history.length > 28) history.shift();
    if (resolvedKey === 'pixel-wake' || resolvedKey === 'glass-shards' || resolvedKey === 'ember-ash' || resolvedKey === 'gold-fleck' || resolvedKey === 'solar-sparks') {
      if (Math.floor(timestamp / 90) !== demoCycle) {
        demoCycle = Math.floor(timestamp / 90);
        addParticle(point, resolvedKey);
      }
    }
  }

  function drawDemoFrame(timestamp, staticFrame = false) {
    if (!context || !resolvedKey) return;
    updateDemoPoint(staticFrame ? 0 : timestamp);
    drawFrame(staticFrame ? 0 : 1, staticFrame);
  }

  function animate(timestamp) {
    frame = 0;
    if (!isRunning) return;
    const delta = Math.min(40, Math.max(0, timestamp - (lastTime || timestamp)));
    lastTime = timestamp;
    if (resolvedInputMode === 'demo') updateDemoPoint(timestamp);
    drawFrame(delta / 16.67, false);
    if (resolvedInputMode === 'demo' || history.length || particles.length || pointer) frame = requestAnimationFrame(animate);
  }

  function clear() {
    context?.clearRect(0, 0, width, height);
  }

  function drawPath(points, color, lineWidth, alpha = 1, offsetX = 0, offsetY = 0) {
    if (!context || points.length < 2) return;
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    points.forEach((point, index) => {
      const x = point.x + offsetX;
      const y = point.y + offsetY;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();
  }

  function drawParticles(multiplier = 1) {
    if (!context) return;
    const colors = getColors();
    particles = particles.filter(particle => {
      particle.x += particle.vx * multiplier;
      particle.y += particle.vy * multiplier;
      particle.vy += 0.008 * multiplier;
      particle.life -= particle.decay * multiplier;
      if (particle.life <= 0) return false;
      const color = colors[Math.abs(Math.floor(particle.x + particle.y)) % colors.length];
      context.save();
      context.globalAlpha = particle.life * 0.8;
      context.fillStyle = color;
      context.strokeStyle = color;
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      if (particle.kind === 'glass-shards' || particle.kind === 'gold-fleck') {
        context.beginPath();
        context.moveTo(0, -particle.size);
        context.lineTo(particle.size * 0.75, particle.size * 0.65);
        context.lineTo(-particle.size * 0.65, particle.size * 0.5);
        context.closePath();
        context.stroke();
      } else {
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      }
      context.restore();
      return true;
    });
  }

  function drawFrame(multiplier = 1, staticFrame = false) {
    if (!context) return;
    clear();
    if (!pointer || !resolvedKey) return;
    const points = history.slice();
    const colors = getColors();
    const head = points[points.length - 1];
    const tail = points.slice(-18);

    if (resolvedKey === 'signal-trace') drawPath(tail, colors[0], 1.5, 0.82);
    else if (resolvedKey === 'pixel-wake') drawParticles(multiplier);
    else if (resolvedKey === 'chroma-ribbon') {
      drawPath(tail, colors[0], 1.3, 0.7, -1, 0);
      drawPath(tail, colors[1] || colors[0], 1.2, 0.7, 0, 1);
      drawPath(tail, colors[2] || colors[0], 1.1, 0.7, 1, 0);
    } else if (resolvedKey === 'glass-shards') { drawParticles(multiplier); drawPath(tail.slice(-8), colors[1] || colors[0], 0.8, 0.35); }
    else if (resolvedKey === 'ember-ash') { drawParticles(multiplier); drawPath(tail.slice(-10), '#F5A45D', 0.8, 0.24); }
    else if (resolvedKey === 'comet-thread') drawPath(tail, '#EAF2FF', 2.2, 0.54);
    else if (resolvedKey === 'ink-drops') { drawPath(tail.slice(-6), '#6D5A78', 0.7, 0.4); context.fillStyle = '#BBA7C6'; context.globalAlpha = 0.5; context.beginPath(); context.arc(head.x, head.y, 2.5, 0, Math.PI * 2); context.fill(); }
    else if (resolvedKey === 'orbit-dust') { drawPath(tail.slice(-8), colors[0], 0.7, 0.3); const radius = 5 + 5 * Math.sin((head.time || 0) / 220); context.fillStyle = colors[1] || colors[0]; context.globalAlpha = 0.8; context.fillRect(head.x + Math.cos(head.time / 180) * radius, head.y + Math.sin(head.time / 180) * radius, 2, 2); }
    else if (resolvedKey === 'static-echo') { drawPath(tail.slice(-10), colors[0], 1, 0.28, -3, 0); drawPath(tail.slice(-8), '#FF8FCA', 1, 0.28, 3, 1); }
    else if (resolvedKey === 'rain-trace') { drawPath(tail.slice(-7), colors[0], 0.8, 0.35); context.strokeStyle = colors[1] || colors[0]; context.globalAlpha = 0.6; context.lineWidth = 1; tail.slice(-5).forEach(point => { context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x, point.y + 7); context.stroke(); }); }
    else if (resolvedKey === 'gold-fleck') { drawParticles(multiplier); drawPath(tail.slice(-5), '#E4BC68', 0.8, 0.38); }
    else if (resolvedKey === 'ghost-tail') drawPath(tail, '#B6A1D8', 3.5, 0.18);
    else if (resolvedKey === 'color-memory') { tail.forEach((point, index) => drawPath(tail.slice(Math.max(0, index - 1), index + 1), colors[index % colors.length], 2, 0.7)); }
    else if (resolvedKey === 'marker-stroke') drawPath(tail, '#E7D4C4', 4.5, 0.42);
    else if (resolvedKey === 'solar-sparks') { drawParticles(multiplier); drawPath(tail.slice(-6), '#FFD77A', 1, 0.5); }
    else if (resolvedKey === 'void-lensing') {
      drawPath(tail, '#9C7BFF', 1.5, 0.3, -1, 0);
      context.save(); context.globalAlpha = 0.7; context.strokeStyle = '#66E8FF'; context.lineWidth = 1; context.beginPath(); context.arc(head.x, head.y, 7, 0, Math.PI * 2); context.stroke(); context.restore();
    }

    if (staticFrame) return;
    history = history.filter(point => (head.time - point.time) < 520);
    if (history.length === 0 && particles.length === 0) pointer = null;
  }

  function resetOnVisibility() {
    if (document.visibilityState !== 'visible') {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
    } else if (isRunning) {
      updateSize();
      if (resolvedInputMode === 'demo' && reducedMotion) drawDemoFrame(performance.now(), true);
      else if (resolvedInputMode === 'demo' || pointer) startLoop();
    }
  }

  function updateHostVisibility() {
    if (!host) return;
    const rect = host.getBoundingClientRect();
    visible = rect.width > 0 && rect.height > 0;
    if (!visible) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
      return;
    }
    updateSize();
    if (resolvedInputMode === 'demo' || pointer) startLoop();
  }

  onMount(() => {
    mounted = true;
    context = canvas?.getContext('2d', { alpha: true });
    updateInputMode();
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);
    window.addEventListener('resize', updateInputMode, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', resetOnVisibility);
    resizeObserver = new ResizeObserver(updateHostVisibility);
    if (host) resizeObserver.observe(host);
    if ('IntersectionObserver' in window && host) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (!visible) {
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          clear();
        } else {
          updateSize();
          if (resolvedInputMode === 'demo' || pointer) startLoop();
        }
      }, { rootMargin: '160px' });
      observer.observe(host);
    }
    updateSize();
    updateHostVisibility();
    if (resolvedInputMode === 'demo') {
      if (reducedMotion) drawDemoFrame(performance.now(), true);
      else startLoop();
    }
    return () => {
      mounted = false;
      window.removeEventListener('resize', updateInputMode);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', resetOnVisibility);
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      resizeObserver?.disconnect();
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
  });

  onDestroy(() => { if (frame) cancelAnimationFrame(frame); });
</script>

<div bind:this={host} class={classList} data-input-mode={resolvedInputMode} data-trail-key={resolvedKey} aria-hidden="true">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .cursor-trail-layer { position:absolute; inset:0; z-index:6; pointer-events:none; overflow:hidden; opacity:0; transition:opacity .2s ease; }
  .cursor-trail-layer--active { opacity:1; }
  .cursor-trail-layer canvas { display:block; width:100%; height:100%; }
  @media (prefers-reduced-motion: reduce) { .cursor-trail-layer { transition:none; } }
</style>
