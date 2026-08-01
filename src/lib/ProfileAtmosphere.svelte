<script>
  import { onDestroy, onMount } from 'svelte';

  export let accent = '#8B7CF6';
  export let secondaryAccent = '#71D6FF';
  export let backgroundSrc = '';
  export let effect = '';
  export let rollState = 'idle';
  export let rollColor = '';
  export let canvasOnly = false;

  const EFFECTS = new Set(['rain', 'snow', 'fireflies', 'scanlines']);
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  let effectCanvas;
  let canvasContext;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelRatio = 1;
  let activeEffect = '';
  let particles = [];
  let animationFrame = 0;
  let mounted = false;
  let prefersReducedMotion = false;
  let motionQuery;
  let resizeObserver;

  $: safeRollState = ['rolling', 'settled'].includes(rollState) ? rollState : 'idle';
  $: safeRollColor = rollColor || accent;
  $: safeEffect = EFFECTS.has(effect) ? effect : '';
  $: backgroundStyle = backgroundSrc
    ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 24%, rgba(0, 0, 0, 0.62)), rgba(0, 0, 0, 0.66)), url("${backgroundSrc}")`
    : 'none';

  $: if (mounted && safeEffect !== activeEffect) {
    setEffect(safeEffect);
  }

  function hashSeed(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let state = hashSeed(seed) || 1;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function parseColor(value, fallback) {
    const normalized = String(value || '').trim();
    const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return fallback;
    const hex = match[1].length === 3
      ? match[1].split('').map(valuePart => valuePart + valuePart).join('')
      : match[1];
    return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
  }

  function rgba(color, alpha) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function resizeCanvas() {
    if (!effectCanvas || !canvasContext) return;
    const bounds = effectCanvas.getBoundingClientRect();
    canvasWidth = Math.max(1, bounds.width);
    canvasHeight = Math.max(1, bounds.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    effectCanvas.width = Math.round(canvasWidth * pixelRatio);
    effectCanvas.height = Math.round(canvasHeight * pixelRatio);
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (activeEffect) particles = makeParticles(activeEffect);
    drawFrame(0);
  }

  function makeParticles(nextEffect) {
    const random = createRandom(`${nextEffect}:${accent}:${secondaryAccent}`);
    const area = canvasWidth * canvasHeight;
    const count = nextEffect === 'rain'
      ? clamp(Math.round(area / 8500), 64, 220)
      : nextEffect === 'snow'
        ? clamp(Math.round(area / 13500), 36, 130)
        : nextEffect === 'fireflies'
          ? clamp(Math.round(area / 21000), 24, 92)
          : 0;

    return Array.from({ length: count }, () => {
      const depth = 0.18 + random() * 0.82;
      if (nextEffect === 'rain') {
        return {
          x: random(),
          y: random(),
          depth,
          length: 8 + depth * 24,
          speed: 260 + depth * 420,
          drift: 0.06 + random() * 0.12,
          alpha: 0.12 + depth * 0.34,
          width: 0.45 + depth * 0.9
        };
      }
      if (nextEffect === 'snow') {
        return {
          x: random(),
          y: random(),
          depth,
          radius: 0.7 + depth * 2.8,
          speed: 10 + depth * 26,
          sway: 8 + random() * 24,
          frequency: 0.35 + random() * 0.85,
          phase: random() * Math.PI * 2,
          alpha: 0.22 + depth * 0.48
        };
      }
      return {
        x: random(),
        y: random(),
        depth,
        radius: 0.8 + depth * 2.2,
        drift: 3 + random() * 12,
        frequency: 0.08 + random() * 0.2,
        phase: random() * Math.PI * 2,
        pulse: 0.7 + random() * 1.6,
        alpha: 0.18 + depth * 0.48
      };
    });
  }

  function clearCanvas() {
    canvasContext?.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawRain(time) {
    const color = parseColor(secondaryAccent, [113, 214, 255]);
    canvasContext.save();
    canvasContext.lineCap = 'round';
    for (const particle of particles) {
      const y = (particle.y * canvasHeight + time * particle.speed) % (canvasHeight + particle.length * 2) - particle.length;
      const x = (particle.x * canvasWidth + y * particle.drift) % (canvasWidth + 40) - 20;
      const endX = x + particle.length * 0.16;
      const endY = y + particle.length;
      canvasContext.strokeStyle = rgba(color, particle.alpha);
      canvasContext.lineWidth = particle.width;
      canvasContext.beginPath();
      canvasContext.moveTo(x, y);
      canvasContext.lineTo(endX, endY);
      canvasContext.stroke();
    }
    canvasContext.restore();
  }

  function drawSnow(time) {
    const color = parseColor(secondaryAccent, [113, 214, 255]);
    canvasContext.save();
    canvasContext.globalCompositeOperation = 'screen';
    for (const particle of particles) {
      const y = (particle.y * canvasHeight + time * particle.speed) % (canvasHeight + 24) - 12;
      const x = particle.x * canvasWidth + Math.sin(time * particle.frequency + particle.phase) * particle.sway;
      const glow = canvasContext.createRadialGradient(x, y, 0, x, y, particle.radius * 4);
      glow.addColorStop(0, rgba(color, particle.alpha));
      glow.addColorStop(1, rgba(color, 0));
      canvasContext.fillStyle = glow;
      canvasContext.beginPath();
      canvasContext.arc(x, y, particle.radius * 4, 0, Math.PI * 2);
      canvasContext.fill();
    }
    canvasContext.restore();
  }

  function drawFireflies(time) {
    const primary = parseColor(accent, [139, 124, 246]);
    const secondary = parseColor(secondaryAccent, [113, 214, 255]);
    canvasContext.save();
    canvasContext.globalCompositeOperation = 'screen';
    for (const [index, particle] of particles.entries()) {
      const x = particle.x * canvasWidth
        + Math.sin(time * particle.frequency + particle.phase) * particle.drift
        + Math.cos(time * 0.07 + index) * particle.drift * 0.35;
      const y = particle.y * canvasHeight
        + Math.cos(time * particle.frequency * 0.8 + particle.phase) * particle.drift;
      const pulse = 0.48 + (Math.sin(time * particle.pulse + particle.phase) + 1) * 0.26;
      const radius = particle.radius * (0.85 + pulse * 0.3);
      const color = index % 3 === 0 ? secondary : primary;
      const glow = canvasContext.createRadialGradient(x, y, 0, x, y, radius * 7);
      glow.addColorStop(0, rgba(color, particle.alpha * pulse));
      glow.addColorStop(0.18, rgba(color, particle.alpha * 0.46));
      glow.addColorStop(1, rgba(color, 0));
      canvasContext.fillStyle = glow;
      canvasContext.beginPath();
      canvasContext.arc(x, y, radius * 7, 0, Math.PI * 2);
      canvasContext.fill();
      canvasContext.fillStyle = rgba(color, particle.alpha * Math.min(1, pulse + 0.2));
      canvasContext.beginPath();
      canvasContext.arc(x, y, radius, 0, Math.PI * 2);
      canvasContext.fill();
    }
    canvasContext.restore();
  }

  function drawScanlines(time) {
    const color = parseColor(accent, [139, 124, 246]);
    const offset = (time * 8) % 5;
    canvasContext.save();
    canvasContext.fillStyle = rgba(color, 0.045);
    for (let y = offset; y < canvasHeight; y += 5) canvasContext.fillRect(0, y, canvasWidth, 1);
    const sweepY = (time * 34) % (canvasHeight + 180) - 90;
    const sweep = canvasContext.createLinearGradient(0, sweepY - 90, 0, sweepY + 90);
    sweep.addColorStop(0, rgba(color, 0));
    sweep.addColorStop(0.5, rgba(color, 0.09));
    sweep.addColorStop(1, rgba(color, 0));
    canvasContext.fillStyle = sweep;
    canvasContext.fillRect(0, sweepY - 90, canvasWidth, 180);
    canvasContext.restore();
  }

  function drawFrame(timestamp) {
    if (!canvasContext) return;
    const time = timestamp / 1000;
    clearCanvas();
    if (activeEffect === 'rain') drawRain(time);
    else if (activeEffect === 'snow') drawSnow(time);
    else if (activeEffect === 'fireflies') drawFireflies(time);
    else if (activeEffect === 'scanlines') drawScanlines(time);
  }

  function animationTick(timestamp) {
    animationFrame = 0;
    drawFrame(timestamp);
    if (activeEffect && !prefersReducedMotion) {
      animationFrame = requestAnimationFrame(animationTick);
    }
  }

  function stopAnimation() {
    if (!animationFrame) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function startAnimation() {
    if (!activeEffect || prefersReducedMotion || animationFrame) return;
    animationFrame = requestAnimationFrame(animationTick);
  }

  function setEffect(nextEffect) {
    activeEffect = nextEffect;
    particles = makeParticles(nextEffect);
    stopAnimation();
    drawFrame(0);
    startAnimation();
  }

  function handleMotionChange(event) {
    prefersReducedMotion = event.matches;
    stopAnimation();
    drawFrame(0);
    startAnimation();
  }

  onMount(() => {
    mounted = true;
    canvasContext = effectCanvas?.getContext('2d');
    if (!canvasContext) return undefined;
    motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    prefersReducedMotion = motionQuery.matches;
    motionQuery.addEventListener?.('change', handleMotionChange);
    resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(resizeCanvas)
      : null;
    resizeObserver?.observe(effectCanvas);
    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCanvas();
    setEffect(safeEffect);

    return () => {
      mounted = false;
      stopAnimation();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      motionQuery?.removeEventListener?.('change', handleMotionChange);
      canvasContext = null;
    };
  });

  onDestroy(stopAnimation);
</script>

<div
  class={'profile-atmosphere profile-atmosphere--' + safeRollState + (safeEffect ? ' profile-atmosphere--effect-' + safeEffect : '') + (canvasOnly ? ' profile-atmosphere--canvas-only' : '')}
  style={'--atmosphere-accent: ' + accent + '; --atmosphere-secondary: ' + secondaryAccent + '; --atmosphere-roll-color: ' + safeRollColor + '; --atmosphere-background: ' + backgroundStyle + ';'}
  aria-hidden="true"
>
  {#if !canvasOnly}
    <span class="profile-atmosphere__background"></span>
    <span class="profile-atmosphere__core"></span>
    <span class="profile-atmosphere__corner profile-atmosphere__corner--top"></span>
    <span class="profile-atmosphere__corner profile-atmosphere__corner--bottom"></span>
    <span class="profile-atmosphere__roll-flare"></span>
    <span class="profile-atmosphere__roll-ring"></span>
    <span class="profile-atmosphere__vignette"></span>
    <span class="profile-atmosphere__grain"></span>
  {/if}
  <canvas bind:this={effectCanvas} class="profile-atmosphere__effect-canvas" aria-hidden="true"></canvas>
</div>

<style>
  .profile-atmosphere {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background: #07080b;
    isolation: isolate;
  }

  .profile-atmosphere--canvas-only {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    background: transparent;
  }

  .profile-atmosphere__core,
  .profile-atmosphere__background,
  .profile-atmosphere__corner,
  .profile-atmosphere__roll-flare,
  .profile-atmosphere__roll-ring,
  .profile-atmosphere__vignette,
  .profile-atmosphere__grain,
  .profile-atmosphere__effect-canvas {
    position: absolute;
    inset: 0;
  }

  .profile-atmosphere__effect-canvas {
    z-index: 1;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .profile-atmosphere__core {
    background:
      radial-gradient(ellipse 66% 54% at 50% 42%, color-mix(in srgb, var(--atmosphere-accent) 17%, transparent), transparent 72%),
      radial-gradient(ellipse 48% 38% at 50% 86%, color-mix(in srgb, var(--atmosphere-secondary) 7%, transparent), transparent 74%);
    opacity: 0.9;
    animation: profile-atmosphere-breathe 24s ease-in-out infinite;
  }

  .profile-atmosphere__background {
    background-image: var(--atmosphere-background);
    background-position: center;
    background-size: cover;
    filter: saturate(0.82);
    opacity: 0.66;
  }

  .profile-atmosphere__corner--top {
    inset: -16rem -14rem auto auto;
    width: 34rem;
    height: 34rem;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--atmosphere-accent) 30%, transparent), transparent 70%);
    filter: blur(72px);
    opacity: 0.42;
  }

  .profile-atmosphere__corner--bottom {
    inset: auto auto -19rem -14rem;
    width: 36rem;
    height: 36rem;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--atmosphere-secondary) 20%, transparent), transparent 68%);
    filter: blur(88px);
    opacity: 0.28;
  }

  .profile-atmosphere__roll-flare {
    background: radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--atmosphere-roll-color) 42%, transparent), transparent 42%);
    mix-blend-mode: screen;
    opacity: 0;
  }

  .profile-atmosphere__roll-ring {
    inset: 28% 28% 30%;
    border: 1px solid color-mix(in srgb, var(--atmosphere-roll-color) 58%, transparent);
    border-radius: 50%;
    box-shadow: 0 0 3rem color-mix(in srgb, var(--atmosphere-roll-color) 24%, transparent);
    opacity: 0;
  }

  .profile-atmosphere__vignette {
    background: radial-gradient(ellipse 82% 76% at 50% 44%, transparent 30%, rgba(0, 0, 0, 0.6) 100%);
    z-index: 1;
  }

  .profile-atmosphere__grain {
    z-index: 2;
    opacity: 0.022;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0 0.45px, transparent 0.65px);
    background-size: 17px 17px;
    mix-blend-mode: screen;
  }

  @keyframes profile-atmosphere-breathe {
    0%, 100% { transform: scale(1); opacity: 0.78; }
    50% { transform: scale(1.025); opacity: 0.96; }
  }

  .profile-atmosphere--rolling .profile-atmosphere__core {
    animation: profile-atmosphere-roll-core 1.55s ease-in-out infinite;
  }

  .profile-atmosphere--rolling .profile-atmosphere__roll-flare {
    animation: profile-atmosphere-roll-flare 1.55s ease-out infinite;
  }

  .profile-atmosphere--rolling .profile-atmosphere__roll-ring {
    animation: profile-atmosphere-roll-ring 1.55s ease-out infinite;
  }

  .profile-atmosphere--settled .profile-atmosphere__roll-flare {
    animation: profile-atmosphere-roll-flare 1.15s ease-out;
  }

  .profile-atmosphere--settled .profile-atmosphere__roll-ring {
    animation: profile-atmosphere-roll-ring 1.15s ease-out;
  }

  @keyframes profile-atmosphere-roll-core {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.09); opacity: 1; }
  }

  @keyframes profile-atmosphere-roll-flare {
    0% { opacity: 0; transform: scale(0.72); }
    28% { opacity: 0.72; }
    100% { opacity: 0; transform: scale(1.3); }
  }

  @keyframes profile-atmosphere-roll-ring {
    0% { opacity: 0; transform: scale(0.58); }
    18% { opacity: 0.68; }
    100% { opacity: 0; transform: scale(1.36); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-atmosphere__core,
    .profile-atmosphere--rolling .profile-atmosphere__core,
    .profile-atmosphere--rolling .profile-atmosphere__roll-flare,
    .profile-atmosphere--rolling .profile-atmosphere__roll-ring,
    .profile-atmosphere--settled .profile-atmosphere__roll-flare,
    .profile-atmosphere--settled .profile-atmosphere__roll-ring {
      animation: none;
    }

    .profile-atmosphere--rolling .profile-atmosphere__roll-flare,
    .profile-atmosphere--settled .profile-atmosphere__roll-flare {
      opacity: 0.2;
    }

    .profile-atmosphere--rolling .profile-atmosphere__roll-ring,
    .profile-atmosphere--settled .profile-atmosphere__roll-ring {
      opacity: 0.16;
    }
  }
</style>
