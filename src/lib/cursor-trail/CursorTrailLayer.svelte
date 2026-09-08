<script>
  import { onDestroy, onMount } from 'svelte';
  import { getCursorTrailRendererKey } from './cursorTrails.js';
  import { AUTHORED_PARTICLE_KEYS, createAuthoredParticle, advanceAuthoredParticle, drawAuthoredParticle } from './authoredParticles.js';
  import {
    GUNS_BUBBLE_BASE_DIMENSION,
    GUNS_SPRINGY_EMOJI_NODES,
    GUNS_TEXT_FLAG_GAP,
    advanceGunsBubbleParticle,
    advanceGunsCharacterParticle,
    advanceGunsEmojiParticle,
    advanceGunsFairyDustParticle,
    advanceGunsSpringyEmojiNodes,
    advanceGunsTextFlag,
    createGunsBubbleParticle,
    createGunsCharacterParticle,
    createGunsEmojiParticle,
    createGunsFairyDustParticle,
    createGunsSpringyEmojiNodes,
    createGunsTextFlagNodes
  } from '../competitor-effects/gunsCursorAlgorithms.js';

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
  let plasmaNodes = [];
  let plasmaParticles = [];
  let effectStateKey = '';
  let characterSprites = [];
  let emojiSprites = [];
  let springyEmojiSprite = null;
  let textFlagNodes = [];
  let textFlagPhase = 0;
  let springyEmojiNodes = createGunsSpringyEmojiNodes();
  let mounted = false;
  let lastEmission = null;

  $: resolvedKey = getCursorTrailRendererKey(trailKey);
  $: resolvedInputMode = inputMode === 'demo' ? 'demo' : 'window';
  $: isRunning = Boolean(resolvedKey && active && visible && (resolvedInputMode === 'demo' || !touchOnly));
  $: classList = ['cursor-trail-layer', className, `cursor-trail-layer--${resolvedInputMode}`, isRunning ? 'cursor-trail-layer--active' : '', reducedMotion ? 'cursor-trail-layer--reduced' : ''].filter(Boolean).join(' ');
  $: if (mounted && resolvedKey !== effectStateKey) resetEffectState();
  // A fitting-room card remains mounted while its parent tab is hidden. The
  // browser can pause its observers during that display:none interval, so a
  // demo trail must be able to restart from the reactive visible/running
  // boundary as well as from the IntersectionObserver callback.
  $: if (mounted && visible && isRunning && resolvedInputMode === 'demo' && !reducedMotion) startLoop();

  const FALLBACK_COLORS = ['#7700FF', '#00D5FF', '#B0FF00', '#FF0090'];

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

  const GUNS_CHARACTER_GLYPHS = ['h', 'e', 'l', 'l', 'o'];
  const GUNS_CHARACTER_COLORS = ['#9900FF', '#FF00CC', '#00CCFF', '#FF0066', '#AA00FF'];
  const GUNS_EMOJI_GLYPHS = ['😀', '😂', '😆', '😊'];
  const GUNS_TEXT_FLAG_TEXT = ' Chromadie';
  const PARTICLE_TRAIL_KEYS = new Set([...AUTHORED_PARTICLE_KEYS, 'solar-sparks', 'bubble-wake', 'character-bloom', 'emoji-bloom']);
  const CONTINUOUS_TRAIL_KEYS = new Set(['text-flag', 'springy-emoji']);

  function createGlyphSprite(value, font, heightMultiplier = 2, color = '') {
    if (typeof document === 'undefined') return null;
    const measureCanvas = document.createElement('canvas');
    const measureContext = measureCanvas.getContext('2d');
    if (!measureContext) return null;
    measureContext.font = font;
    const metrics = measureContext.measureText(value);
    const ascent = Math.max(1, metrics.actualBoundingBoxAscent || Number.parseInt(font, 10) || 16);
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = Math.max(1, Math.ceil(metrics.width));
    glyphCanvas.height = Math.max(1, Math.ceil(ascent * heightMultiplier));
    const glyphContext = glyphCanvas.getContext('2d');
    if (!glyphContext) return null;
    glyphContext.textAlign = 'center';
    glyphContext.font = font;
    glyphContext.textBaseline = 'middle';
    if (color) glyphContext.fillStyle = color;
    glyphContext.fillText(value, glyphCanvas.width / 2, ascent);
    return { canvas: glyphCanvas, width: glyphCanvas.width, height: glyphCanvas.height, value };
  }

  function createGunsEffectSprites() {
    if (typeof document === 'undefined') return;
    characterSprites = GUNS_CHARACTER_GLYPHS.map((glyph, index) => createGlyphSprite(
      glyph,
      '15px serif',
      2.5,
      GUNS_CHARACTER_COLORS[index]
    )).filter(Boolean);
    emojiSprites = GUNS_EMOJI_GLYPHS.map(glyph => createGlyphSprite(glyph, '21px serif', 2)).filter(Boolean);
    springyEmojiSprite = createGlyphSprite('🤪', '16px serif', 2);
  }

  function resetEffectState() {
    effectStateKey = resolvedKey;
    history = [];
    particles = [];
    pointer = null;
    lastEmission = null;
    lastTime = 0;
    textFlagPhase = 0;
    textFlagNodes = createGunsTextFlagNodes(GUNS_TEXT_FLAG_TEXT, { x: width / 2, y: height / 2 });
    springyEmojiNodes = createGunsSpringyEmojiNodes({ x: width / 2, y: height / 2 }, GUNS_SPRINGY_EMOJI_NODES);
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
      clear();
      history = [];
      particles = [];
      pointer = null;
      if (resolvedInputMode === 'demo') drawDemoFrame(performance.now(), true);
    } else if (resolvedInputMode === 'demo') {
      startLoop();
    }
  }

  function updateInputMode() {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const fine = window.matchMedia?.('(any-pointer: fine)').matches;
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
    if (!pointer) {
      textFlagNodes = createGunsTextFlagNodes(GUNS_TEXT_FLAG_TEXT, { x: width / 2, y: height / 2 });
      springyEmojiNodes = createGunsSpringyEmojiNodes({ x: width / 2, y: height / 2 }, GUNS_SPRINGY_EMOJI_NODES);
    }
    if (reducedMotion && resolvedInputMode === 'demo') drawDemoFrame(0, true);
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
    if (particles.length >= 70) particles.splice(0, particles.length - 69);
    if (AUTHORED_PARTICLE_KEYS.has(kind)) {
      particles.push(createAuthoredParticle(point, kind, getColors()));
      return;
    }
    if (kind === 'solar-sparks') {
      const fairyDustParticle = createGunsFairyDustParticle(point.x, point.y);
      fairyDustParticle.kind = kind;
      fairyDustParticle.color = FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)];
      particles.push(fairyDustParticle);
      return;
    }
    if (kind === 'bubble-wake') {
      const bubbleParticle = createGunsBubbleParticle(point.x, point.y);
      bubbleParticle.kind = kind;
      particles.push(bubbleParticle);
      return;
    }
    if (kind === 'character-bloom' && characterSprites.length) {
      const sprite = characterSprites[Math.floor(Math.random() * characterSprites.length)];
      const characterParticle = createGunsCharacterParticle(point.x, point.y, Math.random, sprite.value, sprite);
      characterParticle.kind = kind;
      particles.push(characterParticle);
      return;
    }
    if (kind === 'emoji-bloom' && emojiSprites.length) {
      const sprite = emojiSprites[Math.floor(Math.random() * emojiSprites.length)];
      const emojiParticle = createGunsEmojiParticle(point.x, point.y, Math.random, sprite.value, sprite);
      emojiParticle.kind = kind;
      particles.push(emojiParticle);
      return;
    }
  }

  function handlePointerMove(event) {
    if (!isRunning || reducedMotion || document.visibilityState !== 'visible') return;
    const point = pointForEvent(event);
    if (!point) {
      if (pointer) pointer.active = false;
      return;
    }
    pointer = point;
    history.push(point);
    if (history.length > 28) history.shift();
    emitAtPoint(point);
    startLoop();
  }

  function emitAtPoint(point) {
    if (!PARTICLE_TRAIL_KEYS.has(resolvedKey)) return;
    const spacing = resolvedKey === 'void-lensing' ? 24 : 8;
    if (lastEmission && (point.time - lastEmission.time < 28
      || Math.hypot(point.x - lastEmission.x, point.y - lastEmission.y) < spacing)) return;
    addParticle(point, resolvedKey);
    if (['glass-shards', 'ember-ash', 'gold-fleck', 'pixel-wake', 'orbit-dust'].includes(resolvedKey)) {
      addParticle(point, resolvedKey);
    }
    lastEmission = point;
  }

  function startLoop() {
    if (!frame && isRunning && !reducedMotion && document.visibilityState === 'visible') {
      lastTime = 0;
      frame = requestAnimationFrame(animate);
    }
  }

  function demoPoint(timestamp) {
    const cycleDuration = 4600;
    const normalized = ((timestamp % cycleDuration) + cycleDuration) / cycleDuration;
    const phase = normalized * Math.PI * 2;
    return {
      x: width * (0.5 + Math.sin(phase) * 0.3),
      y: height * (0.52 + Math.sin(phase * 2) * 0.17),
      speed: 1.1 + Math.abs(Math.sin(phase)) * 0.8,
      time: timestamp,
      active: true
    };
  }

  function updateDemoPoint(timestamp) {
    const point = demoPoint(timestamp);
    pointer = point;
    history.push(point);
    if (history.length > 28) history.shift();
    emitAtPoint(point);
  }

  function drawDemoFrame(timestamp, staticFrame = false) {
    if (!context || !resolvedKey) return;
    if (staticFrame) {
      particles = [];
      history = [];
      lastEmission = null;
      for (let sample = 0; sample < 9; sample++) {
        updateDemoPoint(1300 + sample * 65);
        drawFrame(3, true);
      }
      return;
    }
    updateDemoPoint(timestamp);
    drawFrame(staticFrame ? 0 : 1, staticFrame);
  }

  function animate(timestamp) {
    frame = 0;
    if (!isRunning || reducedMotion || document.visibilityState !== 'visible') return;
    const delta = Math.min(40, Math.max(0, timestamp - (lastTime || timestamp)));
    lastTime = timestamp;
    if (resolvedInputMode === 'demo') updateDemoPoint(timestamp);
    else if (pointer && timestamp - pointer.time > 1400) {
      pointer = null;
      history = [];
      particles = [];
      lastEmission = null;
    }
    drawFrame(delta / 16.67, false);
    if (resolvedInputMode === 'demo' || history.length || particles.length || pointer) frame = requestAnimationFrame(animate);
  }

  function clear() {
    context?.clearRect(0, 0, width, height);
  }

  function drawParticles(multiplier = 1) {
    if (!context) return;
    const colors = getColors();
    particles = particles.filter(particle => {
      if (AUTHORED_PARTICLE_KEYS.has(particle.kind)) {
        if (!advanceAuthoredParticle(particle, multiplier)) return false;
        drawAuthoredParticle(context, particle);
        return true;
      }
      if (particle.kind === 'solar-sparks') {
        advanceGunsFairyDustParticle(particle, multiplier);
        if (particle.lifeSpan <= 0) return false;
        context.save();
        context.globalAlpha = Math.min(1, particle.scale * 2);
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
      if (particle.kind === 'bubble-wake') {
        advanceGunsBubbleParticle(particle, multiplier);
        if (particle.lifeSpan < 0) return false;
        const dimension = particle.baseDimension || GUNS_BUBBLE_BASE_DIMENSION;
        const scale = particle.scale;
        context.save();
        context.fillStyle = '#00D5FF';
        context.strokeStyle = '#0066FF';
        context.beginPath();
        context.arc(particle.x - dimension / 2 * scale, particle.y - dimension / 2, dimension * scale, 0, Math.PI * 2);
        context.stroke();
        context.fill();
        context.closePath();
        context.restore();
        return true;
      }
      if (particle.kind === 'character-bloom' || particle.kind === 'emoji-bloom') {
        if (particle.kind === 'character-bloom') advanceGunsCharacterParticle(particle, multiplier);
        else advanceGunsEmojiParticle(particle, multiplier);
        if (particle.lifeSpan < 0 || !particle.sprite?.canvas) return false;
        const sprite = particle.sprite;
        context.save();
        context.translate(particle.x, particle.y);
        if (particle.rotation) context.rotate(particle.rotation);
        context.drawImage(
          sprite.canvas,
          -sprite.width / 2 * particle.scale,
          -sprite.height / 2,
          sprite.width * particle.scale,
          sprite.height * particle.scale
        );
        context.restore();
        return true;
      }
      return false;
    });
  }

  function drawTextFlag(staticFrame = false) {
    if (!context || !pointer || !textFlagNodes.length) return;
    if (staticFrame) {
      textFlagNodes = createGunsTextFlagNodes(GUNS_TEXT_FLAG_TEXT, pointer);
      textFlagPhase = 0;
    } else {
      textFlagPhase = advanceGunsTextFlag(textFlagNodes, pointer, textFlagPhase, { gap: GUNS_TEXT_FLAG_GAP });
    }
    context.save();
    context.fillStyle = '#FF00BB';
    context.font = '12px monospace';
    context.textBaseline = 'alphabetic';
    textFlagNodes.slice().reverse().forEach(node => context.fillText(node.letter, node.x, node.y));
    context.restore();
  }

  function drawSpringyEmoji(staticFrame = false, multiplier = 1) {
    if (!context || !pointer || !springyEmojiSprite?.canvas) return;
    if (staticFrame) {
      springyEmojiNodes = createGunsSpringyEmojiNodes(pointer, GUNS_SPRINGY_EMOJI_NODES);
    } else {
      advanceGunsSpringyEmojiNodes(springyEmojiNodes, pointer, width, height, multiplier);
    }
    const sprite = springyEmojiSprite;
    springyEmojiNodes.forEach(node => {
      context.drawImage(sprite.canvas, node.x - sprite.width / 2, node.y - sprite.height / 2, sprite.width, sprite.height);
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
    context.globalCompositeOperation = 'source-over';

    nodes.forEach((node, index) => {
      const gradient = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, 54);
      const color = index % 2 ? '#00DFFF' : '#8800FF';
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
      const color = particle.hot ? '#00FFFF' : '#9900FF';
      const alpha = particle.hot ? 1 : 0.8 + plasmaNoise(index, 21) * 0.2;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = particle.hot ? 5 : 2;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (particle.hot ? 1.18 : 1), 0, Math.PI * 2);
      context.fill();
      if (particle.hot) {
        context.globalAlpha = 0.95;
        context.fillStyle = '#00FFFF';
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
        context.strokeStyle = index % 2 ? '#00FFFF' : '#AA00FF';
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

    if (AUTHORED_PARTICLE_KEYS.has(resolvedKey)) drawParticles(multiplier);
    else if (resolvedKey === 'plasma-swarm') drawPlasmaSwarm(multiplier, staticFrame);
    else if (resolvedKey === 'solar-sparks') drawParticles(multiplier);
    else if (resolvedKey === 'bubble-wake' || resolvedKey === 'character-bloom' || resolvedKey === 'emoji-bloom') drawParticles(multiplier);
    else if (resolvedKey === 'text-flag') drawTextFlag(staticFrame);
    else if (resolvedKey === 'springy-emoji') drawSpringyEmoji(staticFrame, multiplier);


    if (staticFrame) return;
    history = history.filter(point => (performance.now() - point.time) < 520);
    if (history.length === 0 && particles.length === 0 && !CONTINUOUS_TRAIL_KEYS.has(resolvedKey)) pointer = null;
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
    createGunsEffectSprites();
    resetEffectState();
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
