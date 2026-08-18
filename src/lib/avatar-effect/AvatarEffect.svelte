<script>
  import { getAvatarEffectDefinition } from './avatarEffects.js';

  export let effectKey = '';
  export let accentColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let animated = true;
  export let active = false;
  export let className = '';
  export let avatarSrc = '';
  export let fallbackText = '';
  export let colorizeLiquidBlob = false;

  /** @type {any} */
  let definition;
  $: definition = getAvatarEffectDefinition(effectKey);
  $: activeDefinitionKey = definition?.key || 'none';
  $: compact = mode === 'compact' || mode === 'card';
  $: motionActive = Boolean(animated && (active || !compact));
  $: colors = [accentColor, ...(Array.isArray(recentColors) ? recentColors : [])]
    .filter(color => /^#[0-9a-f]{6}$/i.test(String(color || '')))
    .slice(0, 4);
  $: effectClass = [
    'avatar-effect',
    className,
    `avatar-effect--${activeDefinitionKey}`,
    colorizeLiquidBlob ? 'avatar-effect--colorize-liquid-blob' : '',
    compact ? 'avatar-effect--compact' : '',
    motionActive ? 'avatar-effect--animated' : 'avatar-effect--static'
  ].filter(Boolean).join(' ');
  $: effectStyle = [
    `--avatar-accent:${colors[0] || '#8B7CF6'}`,
    `--avatar-color-2:${colors[1] || '#8DDCFF'}`,
    `--avatar-color-3:${colors[2] || '#B7FD4D'}`,
    `--avatar-color-4:${colors[3] || '#F7B7E2'}`
  ].join(';');
  $: showGlitchLayers = activeDefinitionKey === 'glitch-slicer' && Boolean(avatarSrc || fallbackText);
  $: showHudLayers = activeDefinitionKey === 'cyber-hud';
</script>

<div class={effectClass} style={effectStyle} data-avatar-effect={activeDefinitionKey}>
  {#if showGlitchLayers}
    <span class="avatar-effect__glitch-layers" aria-hidden="true">
      {#if avatarSrc}
        <img class="avatar-effect__glitch-layer avatar-effect__glitch-layer--red" src={avatarSrc} alt="" />
        <img class="avatar-effect__glitch-layer avatar-effect__glitch-layer--cyan" src={avatarSrc} alt="" />
      {:else}
        <span class="avatar-effect__glitch-layer avatar-effect__glitch-layer--red">{fallbackText}</span>
        <span class="avatar-effect__glitch-layer avatar-effect__glitch-layer--cyan">{fallbackText}</span>
      {/if}
    </span>
  {/if}

  {#if showHudLayers}
    <span class="avatar-effect__hud-layers" aria-hidden="true">
      <span class="avatar-effect__hud-ring avatar-effect__hud-ring--one"></span>
      <span class="avatar-effect__hud-ring avatar-effect__hud-ring--two"></span>
      <span class="avatar-effect__hud-tick avatar-effect__hud-tick--one"></span>
      <span class="avatar-effect__hud-tick avatar-effect__hud-tick--two"></span>
    </span>
  {/if}

  <span class="avatar-effect__slot"><slot /></span>
</div>

<style>
  .avatar-effect {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    box-sizing: border-box;
    isolation: isolate;
  }

  .avatar-effect__slot {
    position: relative;
    z-index: 2;
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
  }

  .avatar-effect__slot > :global(img),
  .avatar-effect__slot > :global(span) {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    border-radius: 50%;
  }

  .avatar-effect__slot > :global(img) {
    object-fit: cover;
  }

  .avatar-effect__glitch-layers,
  .avatar-effect__hud-layers {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .avatar-effect__glitch-layers {
    z-index: 1;
    overflow: hidden;
    border-radius: inherit;
  }

  .avatar-effect__glitch-layer {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: inherit;
    color: inherit;
    font: inherit;
    object-fit: cover;
    opacity: 0;
  }

  .avatar-effect__glitch-layer--red {
    filter: sepia(1) saturate(8) hue-rotate(315deg) contrast(1.15);
    mix-blend-mode: multiply;
  }

  .avatar-effect__glitch-layer--cyan {
    filter: sepia(1) saturate(8) hue-rotate(145deg) contrast(1.15);
    mix-blend-mode: multiply;
  }

  .avatar-effect__hud-layers {
    z-index: 1;
  }

  .avatar-effect__hud-ring,
  .avatar-effect__hud-tick {
    position: absolute;
    pointer-events: none;
  }

  .avatar-effect__hud-ring {
    top: 50%;
    left: 50%;
    border: 1px solid transparent;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .avatar-effect__hud-ring--one {
    width: 85.7%;
    height: 85.7%;
    border-top: 2px solid #fff;
    border-right: 2px solid #fff;
  }

  .avatar-effect__hud-ring--two {
    width: 92.8%;
    height: 92.8%;
    border-bottom: 2px solid #fff;
    border-left: 2px solid #fff;
  }

  .avatar-effect__hud-tick {
    width: 5.7%;
    height: 5.7%;
    border: 2px solid #fff;
  }

  .avatar-effect__hud-tick--one {
    top: 3.6%;
    left: 3.6%;
    border-right: 0;
    border-bottom: 0;
  }

  .avatar-effect__hud-tick--two {
    right: 3.6%;
    bottom: 3.6%;
    border-top: 0;
    border-left: 0;
  }

  .avatar-effect.avatar-effect--3d-parallax {
    perspective: 800px;
    transform-style: preserve-3d;
  }

  .avatar-effect.avatar-effect--3d-parallax::before {
    position: absolute;
    z-index: 0;
    inset: 0;
    border-radius: 1rem;
    background: rgba(255, 255, 255, .15);
    content: '';
    opacity: .5;
    transform: translateZ(-30px) scale(.9);
    filter: blur(20px);
  }

  .avatar-effect.avatar-effect--3d-parallax .avatar-effect__slot {
    transform: translateZ(20px);
  }

  .avatar-effect.avatar-effect--3d-parallax .avatar-effect__slot > :global(img),
  .avatar-effect.avatar-effect--3d-parallax .avatar-effect__slot > :global(span) {
    border-radius: 1rem;
    box-shadow: 0 15px 25px rgba(0, 0, 0, .6), 0 0 0 1px rgba(255, 255, 255, .1);
  }

  .avatar-effect.avatar-effect--glitch-slicer {
    overflow: hidden;
    border: 2px solid rgba(248, 248, 248, .94);
    border-radius: 50%;
  }

  .avatar-effect.avatar-effect--glitch-slicer .avatar-effect__slot > :global(img),
  .avatar-effect.avatar-effect--glitch-slicer .avatar-effect__slot > :global(span) {
    border-radius: 0;
  }

  .avatar-effect.avatar-effect--liquid-blob {
    display: grid;
    place-items: center;
    background: #fff;
    box-shadow: 0 0 25px rgba(255, 255, 255, .4);
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }

  .avatar-effect.avatar-effect--liquid-blob .avatar-effect__slot {
    width: 90%;
    height: 90%;
    border-radius: inherit;
    overflow: hidden;
  }

  .avatar-effect.avatar-effect--liquid-blob .avatar-effect__slot > :global(img),
  .avatar-effect.avatar-effect--liquid-blob .avatar-effect__slot > :global(span) {
    border: 0;
    border-radius: inherit;
  }

  .avatar-effect.avatar-effect--colorize-liquid-blob.avatar-effect--liquid-blob {
    background: var(--avatar-accent, #fff);
    box-shadow: 0 0 25px color-mix(in srgb, var(--avatar-accent, #fff) 44%, transparent);
  }

  .avatar-effect.avatar-effect--cyber-hud {
    display: grid;
    place-items: center;
  }

  .avatar-effect.avatar-effect--cyber-hud .avatar-effect__slot {
    width: 71.4%;
    height: 71.4%;
    border-radius: 50%;
  }

  .avatar-effect.avatar-effect--cyber-hud .avatar-effect__slot > :global(img),
  .avatar-effect.avatar-effect--cyber-hud .avatar-effect__slot > :global(span) {
    border: 1px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 15px rgba(255, 255, 255, .4);
  }

  .avatar-effect--animated.avatar-effect--3d-parallax {
    animation: avatar-effect-tilt 6s infinite ease-in-out;
  }

  .avatar-effect--animated.avatar-effect--glitch-slicer .avatar-effect__slot {
    animation: avatar-effect-glitch 2.5s infinite steps(10);
  }

  .avatar-effect--animated.avatar-effect--glitch-slicer .avatar-effect__glitch-layer--red {
    animation: avatar-effect-glitch-red 2.5s infinite steps(10);
  }

  .avatar-effect--animated.avatar-effect--glitch-slicer .avatar-effect__glitch-layer--cyan {
    animation: avatar-effect-glitch-cyan 2.5s infinite steps(10);
  }

  .avatar-effect--animated.avatar-effect--liquid-blob,
  .avatar-effect--animated.avatar-effect--liquid-blob .avatar-effect__slot > :global(img),
  .avatar-effect--animated.avatar-effect--liquid-blob .avatar-effect__slot > :global(span) {
    animation: avatar-effect-morph 8s infinite ease-in-out;
  }

  .avatar-effect--animated.avatar-effect--cyber-hud .avatar-effect__hud-ring--one {
    animation: avatar-effect-spin 3s linear infinite;
  }

  .avatar-effect--animated.avatar-effect--cyber-hud .avatar-effect__hud-ring--two {
    animation: avatar-effect-spin-reverse 4s linear infinite;
  }

  @keyframes avatar-effect-tilt {
    0%, 100% { transform: perspective(800px) rotateY(-15deg) rotateX(10deg); }
    50% { transform: perspective(800px) rotateY(15deg) rotateX(-10deg); }
  }

  @keyframes avatar-effect-glitch {
    0%, 90% { transform: translate(0); }
    92% { transform: translate(-2px, 1px); }
    94% { transform: translate(2px, -1px); }
    96% { transform: translate(-1px, -2px); }
    98% { transform: translate(1px, 2px); }
  }

  @keyframes avatar-effect-glitch-red {
    0%, 90% { clip-path: inset(0 0 0 0); transform: translate(0); opacity: 0; }
    92% { clip-path: inset(20% 0 60% 0); transform: translate(-3px); opacity: .72; }
    94% { clip-path: inset(80% 0 10% 0); transform: translate(3px); opacity: .72; }
  }

  @keyframes avatar-effect-glitch-cyan {
    0%, 90% { clip-path: inset(0 0 0 0); transform: translate(0); opacity: 0; }
    92% { clip-path: inset(70% 0 10% 0); transform: translate(3px); opacity: .72; }
    94% { clip-path: inset(10% 0 80% 0); transform: translate(-3px); opacity: .72; }
  }

  @keyframes avatar-effect-morph {
    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  }

  @keyframes avatar-effect-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
  @keyframes avatar-effect-spin-reverse { to { transform: translate(-50%, -50%) rotate(-360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .avatar-effect--animated.avatar-effect--3d-parallax,
    .avatar-effect--animated.avatar-effect--glitch-slicer .avatar-effect__slot,
    .avatar-effect--animated.avatar-effect--glitch-slicer .avatar-effect__glitch-layer,
    .avatar-effect--animated.avatar-effect--liquid-blob,
    .avatar-effect--animated.avatar-effect--liquid-blob .avatar-effect__slot > :global(img),
    .avatar-effect--animated.avatar-effect--liquid-blob .avatar-effect__slot > :global(span),
    .avatar-effect--animated.avatar-effect--cyber-hud .avatar-effect__hud-ring {
      animation: none !important;
    }
  }
</style>
