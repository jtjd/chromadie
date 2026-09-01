<script>
  import { onDestroy, onMount } from 'svelte';
  import { getCursorTrailKey } from './cursorTrails.js';
  import {
    GUNS_TRAILING_CURSOR_PARTICLES,
    GUNS_TRAILING_CURSOR_RATE,
    advanceGunsFairyDustParticle,
    advanceGunsTrailingCursorNodes,
    createGunsFairyDustParticle,
    createGunsTrailingCursorNodes
  } from '../competitor-effects/gunsCursorAlgorithms.js';

  export let trailKey = '';
  export let recentColors = [];
  export let todayColor = '#8B7CF6';
  export let active = true;
  export let className = '';
  export let cursorSrc = '';
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
  let plasmaNodes = [];
  let plasmaParticles = [];
  let trailingNodes = [];
  let trailingImage = null;
  let requestedCursorSrc = null;
  let trailingKey = '';
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

  function lerp(first, second, amount) {
    const t = Math.max(0, Math.min(1, Number(amount) || 0));
    return first + (second - first) * t;
  }

  function getColors() {
    const colors = [...(Array.isArray(recentColors) ? recentColors : []), todayColor, ...FALLBACK_COLORS]
      .map(color => safeColor(color, ''))
      .filter(Boolean);
    return [...new Set(colors)].slice(0, 6);
  }

  function plasmaNoise(index, channel = 0, tick = 0) {
    let hash = 2166136261;
    for (const character of `${resolvedKey}:${index}:${channel}:${tick}`) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  function resetPlasmaState() {
    plasmaNodes = Array.from({ length: 4 }, (_, index) => ({
      phase: plasmaNoise(index, 1) * Math.PI * 2,
      x: width * (0.25 + index * 0.16),
      y: height * (0.35 + (index % 2) * 0.18),
      driftX: 0.45 + plasmaNoise(index, 2) * 0.35,
      driftY: 0.38 + plasmaNoise(index, 3) * 0.3
    }));
    plasmaParticles = Array.from({ length: 130 }, (_, index) => ({
      x: plasmaNodes[index % plasmaNodes.length].x + (plasmaNoise(index, 11) - 0.5) * 80,
      y: plasmaNodes[index % plasmaNodes.length].y + (plasmaNoise(index, 12) - 0.5) * 80,
      vx: (plasmaNoise(index, 13) - 0.5) * 1.6,
      vy: (plasmaNoise(index, 14) - 0.5) * 1.6,
      node: index % 4,
      size: 1.2 + plasmaNoise(index, 15) * 2.4,
      hot: plasmaNoise(index, 16) > 0.78,
      phase: plasmaNoise(index, 17) * Math.PI * 2
    }));
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
    resetPlasmaState();
  }

  function pointForEvent(event) {
    if (!host || !event || !['mouse', 'pen'].includes(event.pointerType || 'mouse')) return null;
    const rect = host.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return {
      x: Math.max(0, Math.min(width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(height, event.clientY - rect.top)),
      speed: Math.min(2.4, Math.max(0.2, Math.hypot(event.movementX || 0, event.movementY || 0) / 8)),
      time: performance.now(),
      active: true
    };
  }

  function addParticle(point, kind = 'dot') {
    if (particles.length > 70) particles.splice(0, particles.length - 70);
    if (kind === 'solar-sparks') {
      const fairyDustParticle = createGunsFairyDustParticle(point.x, point.y);
      fairyDustParticle.kind = kind;
      const colors = getColors();
      fairyDustParticle.color = colors[Math.floor(Math.random() * colors.length)] || '#D61C59';
      particles.push(fairyDustParticle);
      return;
    }
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
    const previous = history[history.length - 1];
    pointer = point;
    history.push(point);
    if (history.length > 28) history.shift();
    const movedEnough = !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 1.5;
    if (resolvedKey === 'pixel-wake' || resolvedKey === 'glass-shards' || resolvedKey === 'ember-ash' || resolvedKey === 'gold-fleck' || (resolvedKey === 'solar-sparks' && movedEnough)) {
      addParticle(point, resolvedKey);
      if (point.speed > 1.5 && resolvedKey !== 'solar-sparks') addParticle(point, resolvedKey);
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
      time: timestamp,
      active: true
    };
  }

  function updateDemoPoint(timestamp) {
    const point = demoPoint(timestamp);
    const previous = history[history.length - 1];
    pointer = point;
    history.push(point);
    if (history.length > 28) history.shift();
    const movedEnough = !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 1.5;
    if (resolvedKey === 'pixel-wake' || resolvedKey === 'glass-shards' || resolvedKey === 'ember-ash' || resolvedKey === 'gold-fleck' || (resolvedKey === 'solar-sparks' && movedEnough)) {
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
      if (particle.kind === 'solar-sparks') {
        advanceGunsFairyDustParticle(particle, multiplier);
        if (particle.lifeSpan <= 0) return false;
        context.save();
        context.globalAlpha = particle.scale;
        context.fillStyle = particle.color || colors[0];
        context.font = '21px serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.translate(particle.x, particle.y);
        context.scale(particle.scale, particle.scale);
        if (context.fillText) context.fillText('*', 0, 0);
        else context.fillRect(-1, -1, 2, 2);
        context.restore();
        return true;
      }
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

  function ensureTrailingImage() {
    if (requestedCursorSrc === cursorSrc) return;
    requestedCursorSrc = cursorSrc || '';
    trailingImage = null;
    if (!requestedCursorSrc || typeof Image === 'undefined') return;
    const image = new Image();
    image.decoding = 'async';
    image.src = requestedCursorSrc;
    trailingImage = image;
  }

  function drawGunsTrailingCursor() {
    if (!context || !pointer) return;
    ensureTrailingImage();
    if (trailingKey !== resolvedKey) {
      trailingNodes = [];
      trailingKey = resolvedKey;
    }
    if (!trailingNodes.length) {
      trailingNodes = createGunsTrailingCursorNodes(pointer, GUNS_TRAILING_CURSOR_PARTICLES);
    }
    advanceGunsTrailingCursorNodes(trailingNodes, pointer, GUNS_TRAILING_CURSOR_RATE);
    const image = trailingImage?.complete && (trailingImage.naturalWidth || trailingImage.width)
      ? trailingImage
      : null;
    const colors = getColors();
    trailingNodes.forEach((node, index) => {
      context.save();
      if (image && context.drawImage) {
        // The upstream trailingCursor draws each custom cursor image at the
        // node's top-left without an opacity falloff.
        context.drawImage(image, node.x, node.y);
      } else {
        // A .cur may not expose a drawable Image in every browser. Keep the
        // algorithm and provide a small code-owned fallback instead of
        // copying the upstream package's embedded bitmap.
        context.globalAlpha = 0.12 + (1 - index / trailingNodes.length) * 0.24;
        context.fillStyle = colors[index % colors.length] || '#B6A1D8';
        context.beginPath();
        context.arc(node.x, node.y, Math.max(1.5, 4 - index * 0.16), 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });
  }

  function drawPlasmaSwarm(multiplier = 1, staticFrame = false) {
    if (!context || !pointer) return;
    const time = staticFrame
      ? 0
      : (typeof performance !== 'undefined' ? performance.now() : pointer.time || 0);
    const pointerActive = !staticFrame && (resolvedInputMode === 'demo' || pointer.active === true);
    const targetX = pointer.x;
    const targetY = pointer.y;

    // Keep the field alive at rest, then pull the charged clusters toward the
    // local pointer when the profile is being explored. This is the same
    // charge-buildup behavior as the approved reference, rather than a plain
    // line trail recolored with the player's palette.
    plasmaNodes.forEach((node, index) => {
      if (!staticFrame) {
        node.phase += (0.012 + index * 0.002) * multiplier;
        node.x += Math.sin(node.phase + index) * node.driftX * multiplier;
        node.y += Math.cos(node.phase * 0.8 + index) * node.driftY * multiplier;
        if (pointerActive) {
          node.x = lerp(node.x, targetX + Math.cos(index * 1.57) * 65, 0.02 * multiplier);
          node.y = lerp(node.y, targetY + Math.sin(index * 1.57) * 55, 0.02 * multiplier);
        }
      }
    });

    const nodes = plasmaNodes;
    context.save();
    context.globalCompositeOperation = 'lighter';

    nodes.forEach((node, index) => {
      const gradient = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, 54);
      const color = index % 2 ? '#00FFFF' : '#824DFF';
      gradient.addColorStop(0, `${color}8C`);
      gradient.addColorStop(0.45, `${color}3D`);
      gradient.addColorStop(1, `${color}00`);
      context.globalAlpha = 0.42;
      context.fillStyle = gradient;
      context.fillRect(node.x - 64, node.y - 64, 128, 128);
    });

    plasmaParticles.forEach((particle, index) => {
      const node = nodes[particle.node];
      if (!node) return;
      if (!staticFrame) {
        const distanceX = node.x - particle.x;
        const distanceY = node.y - particle.y;
        const distance = Math.hypot(distanceX, distanceY) || 1;
        const tick = Math.floor(time / 120);
        const noiseX = (plasmaNoise(index, 31, tick) - 0.5) * 0.08;
        const noiseY = (plasmaNoise(index, 32, tick) - 0.5) * 0.08;
        particle.vx = (particle.vx + (distanceX / distance) * 0.06 * multiplier + noiseX) * 0.94;
        particle.vy = (particle.vy + (distanceY / distance) * 0.06 * multiplier + noiseY) * 0.94;
        particle.x += particle.vx * multiplier;
        particle.y += particle.vy * multiplier;
        if (distance < 14) {
          particle.vx += (plasmaNoise(index, 33, tick) - 0.5) * 2.4;
          particle.vy += (plasmaNoise(index, 34, tick) - 0.5) * 2.4;
          particle.hot = plasmaNoise(index, 35, tick) > 0.64;
        }
      }
      const color = particle.hot ? '#7CFFFA' : '#7A4DFF';
      const alpha = particle.hot ? 0.84 : 0.38 + plasmaNoise(index, 21) * 0.32;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = particle.hot ? 5 : 2;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (particle.hot ? 1.18 : 1), 0, Math.PI * 2);
      context.fill();
      if (particle.hot) {
        context.globalAlpha = 0.95;
        context.fillStyle = '#FFFFFF';
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 0.35, 0, Math.PI * 2);
        context.fill();
      }
    });

    // Short electrical links appear only while clusters are close enough to
    // read as one charged system. The control-point drift is deterministic,
    // so the arcs shimmer without noisy frame-to-frame jumps.
    context.lineCap = 'round';
    context.lineWidth = 1.2;
    nodes.forEach((node, index) => {
      nodes.slice(index + 1).forEach((other, otherIndex) => {
        const distance = Math.hypot(other.x - node.x, other.y - node.y);
        if (distance >= 170) return;
        const tick = Math.floor(time / 180);
        context.globalAlpha = (1 - distance / 170) * 0.24;
        context.strokeStyle = index % 2 ? 'rgba(120,255,255,.9)' : 'rgba(160,100,255,.9)';
        context.beginPath();
        context.moveTo(node.x, node.y);
        const controlX = (node.x + other.x) / 2 + (plasmaNoise(index * 7 + otherIndex, 41, tick) - 0.5) * 32;
        const controlY = (node.y + other.y) / 2 + (plasmaNoise(index * 11 + otherIndex, 42, tick) - 0.5) * 32;
        context.quadraticCurveTo(controlX, controlY, other.x, other.y);
        context.stroke();
      });
    });

    context.restore();
  }

  function drawFrame(multiplier = 1, staticFrame = false) {
    if (!context) return;
    clear();
    if (!pointer || !resolvedKey) return;
    const points = history.slice();
    const colors = getColors();
    const head = points[points.length - 1];
    const tail = points.slice(-18);

    if (resolvedKey === 'plasma-swarm') drawPlasmaSwarm(multiplier, staticFrame);
    else if (resolvedKey === 'signal-trace') drawPath(tail, colors[0], 1.5, 0.82);
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
    else if (resolvedKey === 'ghost-tail') drawGunsTrailingCursor();
    else if (resolvedKey === 'color-memory') { tail.forEach((point, index) => drawPath(tail.slice(Math.max(0, index - 1), index + 1), colors[index % colors.length], 2, 0.7)); }
    else if (resolvedKey === 'marker-stroke') drawPath(tail, '#E7D4C4', 4.5, 0.42);
    else if (resolvedKey === 'solar-sparks') drawParticles(multiplier);
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
