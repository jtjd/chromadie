<script>
  import { onDestroy, onMount } from 'svelte';

  export let effectKey = '';
  export let accentColor = '#8B7CF6';
  export let recentColors = [];
  export let active = true;
  export let animated = true;

  // One authored texture atlas keeps the visual vocabulary coherent without
  // spawning a particle system (or an animation loop) per product card.
  const SPRITES = Object.freeze({
    ember: [0, 0],
    gold: [1, 0],
    glass: [2, 0],
    ash: [3, 0],
    glitch: [0, 1],
    ink: [1, 1],
    dust: [2, 1],
    prism: [3, 1]
  });

  const PARTICLE_PRESETS = Object.freeze({
    'signal-ring': [
      { sprite: 'dust', x: .5, y: .04, size: .14, alpha: .72 },
      { sprite: 'gold', x: .93, y: .5, size: .1, alpha: .62 },
      { sprite: 'dust', x: .08, y: .54, size: .1, alpha: .52 },
      { sprite: 'glitch', x: .5, y: .96, size: .08, alpha: .38 }
    ],
    'neon-halo': [
      { sprite: 'dust', x: .14, y: .22, size: .1, alpha: .46 },
      { sprite: 'prism', x: .87, y: .28, size: .08, alpha: .42 },
      { sprite: 'dust', x: .76, y: .9, size: .11, alpha: .38 }
    ],
    'prism-orbit': [
      { sprite: 'glass', x: .5, y: .07, size: .13, alpha: .86, motion: 'orbit', phase: -.4 },
      { sprite: 'prism', x: .91, y: .58, size: .1, alpha: .7, motion: 'orbit', phase: 1.75 },
      { sprite: 'glass', x: .2, y: .84, size: .08, alpha: .62, motion: 'orbit', phase: 3.2 },
      { sprite: 'dust', x: .25, y: .25, size: .055, alpha: .58, motion: 'drift' },
      { sprite: 'glass', x: .75, y: .2, size: .045, alpha: .54, motion: 'drift' }
    ],
    'crystal-aperture': [
      { sprite: 'glass', x: .1, y: .12, size: .12, alpha: .68 },
      { sprite: 'prism', x: .9, y: .12, size: .09, alpha: .58 },
      { sprite: 'glass', x: .12, y: .88, size: .08, alpha: .5 },
      { sprite: 'dust', x: .88, y: .84, size: .08, alpha: .46 }
    ],
    'chroma-arc': [
      { sprite: 'prism', x: .18, y: .18, size: .11, alpha: .72, motion: 'breathe' },
      { sprite: 'glass', x: .82, y: .22, size: .1, alpha: .66, motion: 'breathe', phase: 1 },
      { sprite: 'glitch', x: .82, y: .8, size: .075, alpha: .55, motion: 'flicker' },
      { sprite: 'prism', x: .2, y: .82, size: .08, alpha: .54, motion: 'flicker', phase: 2 }
    ],
    'ember-crown': [
      { sprite: 'ember', x: .3, y: .28, size: .11, alpha: .8, motion: 'rise', phase: .2 },
      { sprite: 'gold', x: .43, y: .16, size: .085, alpha: .78, motion: 'rise', phase: 1.2 },
      { sprite: 'ember', x: .58, y: .22, size: .1, alpha: .76, motion: 'rise', phase: 2.1 },
      { sprite: 'gold', x: .7, y: .34, size: .075, alpha: .64, motion: 'rise', phase: 2.8 },
      { sprite: 'ember', x: .8, y: .2, size: .06, alpha: .58, motion: 'rise', phase: 3.7 }
    ],
    ashfall: [
      { sprite: 'ash', x: .25, y: .1, size: .08, alpha: .6, motion: 'fall', phase: .1 },
      { sprite: 'ash', x: .55, y: .22, size: .06, alpha: .46, motion: 'fall', phase: 1.2 },
      { sprite: 'dust', x: .78, y: .12, size: .07, alpha: .5, motion: 'fall', phase: 2.2 },
      { sprite: 'ash', x: .85, y: .7, size: .05, alpha: .42, motion: 'fall', phase: 3.1 }
    ],
    'gold-laurel': [
      { sprite: 'gold', x: .18, y: .42, size: .1, alpha: .7, motion: 'breathe' },
      { sprite: 'gold', x: .82, y: .42, size: .1, alpha: .7, motion: 'breathe', phase: 1.4 },
      { sprite: 'dust', x: .27, y: .82, size: .06, alpha: .5 },
      { sprite: 'dust', x: .73, y: .82, size: .06, alpha: .5 }
    ],
    'ink-stamp': [
      { sprite: 'ink', x: .2, y: .2, size: .12, alpha: .68, rotation: -.3 },
      { sprite: 'ink', x: .82, y: .75, size: .09, alpha: .5, rotation: .35 },
      { sprite: 'glitch', x: .75, y: .24, size: .07, alpha: .5, motion: 'flicker' }
    ],
    'paper-tear': [
      { sprite: 'ink', x: .16, y: .72, size: .1, alpha: .52, rotation: -.2 },
      { sprite: 'ash', x: .83, y: .2, size: .08, alpha: .48, rotation: .45 },
      { sprite: 'dust', x: .32, y: .12, size: .05, alpha: .5 }
    ],
    'static-offset': [
      { sprite: 'glitch', x: .18, y: .32, size: .095, alpha: .7, motion: 'flicker' },
      { sprite: 'glitch', x: .84, y: .62, size: .08, alpha: .58, motion: 'flicker', phase: 1.6 },
      { sprite: 'dust', x: .7, y: .16, size: .05, alpha: .46 }
    ],
    'pixel-satellites': [
      { sprite: 'prism', x: .12, y: .3, size: .075, alpha: .7, motion: 'orbit', phase: -.8 },
      { sprite: 'glass', x: .88, y: .27, size: .06, alpha: .58, motion: 'orbit', phase: 1.8 },
      { sprite: 'prism', x: .84, y: .82, size: .05, alpha: .5, motion: 'orbit', phase: 3.3 }
    ],
    'crt-scan': [
      { sprite: 'glitch', x: .2, y: .15, size: .08, alpha: .48, motion: 'scan' },
      { sprite: 'dust', x: .82, y: .2, size: .06, alpha: .48, motion: 'scan', phase: 1 },
      { sprite: 'glitch', x: .78, y: .84, size: .05, alpha: .42, motion: 'scan', phase: 2 }
    ],
    'void-eclipse': [
      { sprite: 'ash', x: .18, y: .28, size: .1, alpha: .44, motion: 'drift' },
      { sprite: 'ash', x: .83, y: .7, size: .08, alpha: .42, motion: 'drift', phase: 2 },
      { sprite: 'dust', x: .72, y: .14, size: .055, alpha: .34 }
    ],
    'ghost-double': [
      { sprite: 'glitch', x: .18, y: .48, size: .1, alpha: .58, motion: 'flicker' },
      { sprite: 'glitch', x: .85, y: .48, size: .1, alpha: .58, motion: 'flicker', phase: 1.9 },
      { sprite: 'dust', x: .5, y: .12, size: .06, alpha: .44, motion: 'drift' }
    ],
    'night-frame': [
      { sprite: 'glass', x: .12, y: .14, size: .07, alpha: .46 },
      { sprite: 'ash', x: .88, y: .15, size: .07, alpha: .42 },
      { sprite: 'dust', x: .86, y: .86, size: .06, alpha: .42 },
      { sprite: 'dust', x: .14, y: .85, size: .05, alpha: .38 }
    ],
    'daily-aura': [
      { sprite: 'dust', x: .18, y: .26, size: .09, alpha: .58, motion: 'breathe' },
      { sprite: 'prism', x: .82, y: .3, size: .07, alpha: .52, motion: 'breathe', phase: 1 },
      { sprite: 'dust', x: .75, y: .82, size: .08, alpha: .48, motion: 'breathe', phase: 2 }
    ],
    'color-archive': [
      { sprite: 'glass', x: .16, y: .28, size: .09, alpha: .72, motion: 'orbit', phase: 0 },
      { sprite: 'prism', x: .84, y: .28, size: .09, alpha: .68, motion: 'orbit', phase: 1.6 },
      { sprite: 'gold', x: .82, y: .78, size: .075, alpha: .62, motion: 'orbit', phase: 3.1 },
      { sprite: 'ember', x: .18, y: .78, size: .07, alpha: .58, motion: 'orbit', phase: 4.7 }
    ]
  });

  const FALLBACK_COLORS = ['#8B7CF6', '#8DDCFF', '#B7FD4D', '#F7B7E2'];
  let atlasImage;
  let atlasPromise;

  function loadAtlas() {
    if (atlasImage) return Promise.resolve(atlasImage);
    if (!atlasPromise) {
      atlasPromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => { atlasImage = image; resolve(image); };
        image.onerror = reject;
        image.src = '/avatar-effects/particle-atlas.png';
      });
    }
    return atlasPromise;
  }

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

  $: preset = PARTICLE_PRESETS[effectKey] || [];
  $: supported = preset.length > 0;
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

  function drawSprite(sprite, x, y, size, rotation = 0, alpha = 1) {
    if (!context || !atlasImage || !SPRITES[sprite]) return;
    const [column, row] = SPRITES[sprite];
    const sourceWidth = atlasImage.naturalWidth / 4;
    const sourceHeight = atlasImage.naturalHeight / 2;
    const drawSize = Math.max(2, Math.min(Math.min(width, height) * .42, size));
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.globalAlpha = Math.max(0, Math.min(1, alpha));
    context.globalCompositeOperation = sprite === 'ink' ? 'source-over' : 'screen';
    context.drawImage(
      atlasImage,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize
    );
    context.restore();
  }

  function particlePosition(particle, index, elapsed) {
    const seconds = elapsed / 1000;
    const baseX = particle.x * width;
    const baseY = particle.y * height;
    const phase = particle.phase || index * .72;
    switch (particle.motion) {
      case 'orbit': {
        const angle = seconds * (.24 + (index % 3) * .035) + phase;
        const radius = Math.min(width, height) * (.045 + (index % 2) * .018);
        return { x: baseX + Math.cos(angle) * radius, y: baseY + Math.sin(angle) * radius * .8 };
      }
      case 'rise': {
        const cycle = (seconds / (2.9 + (index % 3) * .42) + phase) % 1;
        return { x: baseX + Math.sin(seconds * .8 + phase) * Math.min(width, height) * .045, y: baseY - cycle * Math.min(width, height) * .22 };
      }
      case 'fall': {
        const cycle = (seconds / (3.4 + (index % 3) * .4) + phase) % 1;
        return { x: baseX + Math.sin(seconds * .5 + phase) * Math.min(width, height) * .025, y: baseY + cycle * Math.min(width, height) * .28 };
      }
      case 'drift':
        return { x: baseX + Math.sin(seconds * .5 + phase) * Math.min(width, height) * .035, y: baseY + Math.cos(seconds * .42 + phase) * Math.min(width, height) * .03 };
      case 'scan':
        return { x: baseX + Math.sin(seconds * 1.1 + phase) * Math.min(width, height) * .025, y: baseY + Math.sin(seconds * .8 + phase) * Math.min(width, height) * .07 };
      default:
        return { x: baseX, y: baseY };
    }
  }

  function particleAlpha(particle, index, elapsed) {
    const seconds = elapsed / 1000;
    if (particle.motion === 'flicker') {
      const pulse = Math.sin(seconds * 5.2 + (particle.phase || index)) > .75 ? .95 : .35;
      return particle.alpha * pulse;
    }
    if (particle.motion === 'breathe') return particle.alpha * (.76 + Math.sin(seconds * .9 + (particle.phase || index)) * .24);
    if (particle.motion === 'rise' || particle.motion === 'fall') {
      const cycle = (seconds / (2.9 + (index % 3) * .42) + (particle.phase || 0)) % 1;
      return particle.alpha * Math.sin(cycle * Math.PI);
    }
    return particle.alpha;
  }

  function drawFrame(elapsed = 0) {
    if (!context || !supported || !atlasImage) return;
    clear();
    const palette = getPalette();
    preset.forEach((particle, index) => {
      const position = particlePosition(particle, index, elapsed);
      const size = Math.min(width, height) * (particle.size || .07);
      const angle = (particle.rotation || 0) + (particle.motion === 'orbit' ? elapsed / 1000 * .18 : 0);
      // Accent colours still influence opacity and pacing while the authored
      // texture keeps the material itself detailed and non-CSS.
      const alpha = particleAlpha(particle, index, elapsed) * (palette.length ? 1 : .8);
      drawSprite(particle.sprite, position.x, position.y, size, angle, alpha);
    });
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
    loadAtlas().then(() => {
      if (!mounted) return;
      drawFrame(0);
      if (running) startLoop();
    }).catch(() => {
      // The CSS layer remains usable if an authored texture cannot load.
    });

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
