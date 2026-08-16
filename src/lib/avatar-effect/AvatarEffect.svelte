<script>
  import AvatarParticles from './AvatarParticles.svelte';
  import { getAvatarEffectDefinition } from './avatarEffects.js';

  export let effectKey = '';
  export let accentColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let animated = true;
  // Cards stay quiet by default; the contextual preview can opt into motion.
  export let active = false;
  export let className = '';
  export let avatarSrc = '';
  export let fallbackText = '';

  /** @type {any} */
  let definition;
  $: definition = getAvatarEffectDefinition(effectKey);
  $: compact = mode === 'compact' || mode === 'card';
  $: motionActive = Boolean(animated && (active || !compact));
  $: colors = [accentColor, ...(Array.isArray(recentColors) ? recentColors : [])]
    .filter(color => /^#[0-9a-f]{6}$/i.test(String(color || '')))
    .slice(0, 4);
  $: effectClass = [
    'avatar-effect',
    className,
    definition ? `avatar-effect--${definition.key}` : 'avatar-effect--none',
    definition?.authoredOverlay ? 'avatar-effect--authored' : '',
    definition?.imageAware ? 'avatar-effect--image-aware' : '',
    definition?.particles ? 'avatar-effect--texture-backed' : '',
    compact ? 'avatar-effect--compact' : '',
    motionActive ? 'avatar-effect--animated' : 'avatar-effect--static'
  ].filter(Boolean).join(' ');
  $: effectStyle = [
    `--avatar-accent:${colors[0] || '#8B7CF6'}`,
    `--avatar-color-2:${colors[1] || '#8DDCFF'}`,
    `--avatar-color-3:${colors[2] || '#B7FD4D'}`,
    `--avatar-color-4:${colors[3] || '#F7B7E2'}`
  ].join(';');
</script>

<div class={effectClass} style={effectStyle}>
  {#if definition?.authoredOverlay}
    <img class="avatar-effect__authored-plate" src={definition.authoredOverlay} alt="" aria-hidden="true" />
  {/if}

  {#if definition?.imageAware}
    {#if avatarSrc}
      <img class="avatar-effect__duplicate" src={avatarSrc} alt="" aria-hidden="true" />
    {:else if fallbackText}
      <span class="avatar-effect__duplicate avatar-effect__duplicate--fallback" aria-hidden="true">{fallbackText}</span>
    {/if}
  {/if}

  <span class="avatar-effect__halo" aria-hidden="true"></span>
  <span class="avatar-effect__ring" aria-hidden="true"></span>
  <span class="avatar-effect__arc" aria-hidden="true"></span>
  <span class="avatar-effect__marks" aria-hidden="true"></span>
  <span class="avatar-effect__scan" aria-hidden="true"></span>
  <span class="avatar-effect__satellites" aria-hidden="true"></span>
  <span class="avatar-effect__crown" aria-hidden="true"></span>
  <span class="avatar-effect__laurel" aria-hidden="true"></span>
  <span class="avatar-effect__tear" aria-hidden="true"></span>
  <slot />

  {#if definition?.particles}
    <AvatarParticles
      effectKey={definition.key}
      accentColor={colors[0] || '#8B7CF6'}
      recentColors={colors.slice(1)}
      active={motionActive}
      animated={motionActive}
    />
  {/if}
</div>

<style>
  .avatar-effect { position:relative; isolation:isolate; }
  .avatar-effect > :global(img), .avatar-effect > :global(.leaderboard-entry__avatar-initial), .avatar-effect > :global(.home-rank-row__avatar) { position:relative; z-index:2; }
  .avatar-effect__authored-plate, .avatar-effect > .avatar-effect__authored-plate { position:absolute; z-index:3; inset:-25%; width:150%; height:150%; max-width:none; object-fit:contain; pointer-events:none; user-select:none; }
  .avatar-effect__duplicate, .avatar-effect > .avatar-effect__duplicate { position:absolute; z-index:1; inset:0; width:100%; height:100%; object-fit:cover; border-radius:inherit; clip-path:circle(50% at 50% 50%); opacity:.2; transform:translate(4px, -1px) scale(1.012); filter:saturate(1.55) contrast(1.1) hue-rotate(14deg); mix-blend-mode:screen; pointer-events:none; }
  .avatar-effect__duplicate--fallback { display:grid; place-items:center; color:rgba(245,247,255,.74); font:600 2.2rem/1 var(--font-display-stack); letter-spacing:-.08em; }
  .avatar-effect--animated .avatar-effect__duplicate { animation:avatar-effect-ghost 3.8s steps(2,end) infinite; }
  .avatar-effect__halo, .avatar-effect__ring, .avatar-effect__arc, .avatar-effect__marks, .avatar-effect__scan, .avatar-effect__satellites, .avatar-effect__crown, .avatar-effect__laurel, .avatar-effect__tear { position:absolute; z-index:3; pointer-events:none; content:''; }
  .avatar-effect__halo { inset:-10%; border-radius:50%; box-shadow:0 0 1.5rem var(--avatar-accent); opacity:0; }
  .avatar-effect--neon-halo .avatar-effect__halo, .avatar-effect--daily-aura .avatar-effect__halo, .avatar-effect--void-eclipse .avatar-effect__halo { opacity:.72; }
  .avatar-effect--neon-halo .avatar-effect__halo { background:radial-gradient(circle, transparent 55%, color-mix(in srgb, var(--avatar-accent) 46%, transparent) 70%, transparent 76%); }
  .avatar-effect--daily-aura .avatar-effect__halo { background:radial-gradient(circle, transparent 58%, color-mix(in srgb, var(--avatar-accent) 58%, transparent) 73%, transparent 80%); }
  .avatar-effect--void-eclipse .avatar-effect__halo { background:radial-gradient(circle, transparent 42%, rgba(0,0,0,.42) 60%, transparent 76%); box-shadow:0 0 1.2rem #7e64d6; }
  .avatar-effect__ring { inset:-5%; border:1px solid var(--avatar-accent); border-radius:50%; opacity:0; box-shadow:0 0 0 .15rem color-mix(in srgb, var(--avatar-accent) 18%, transparent); }
  .avatar-effect--signal-ring .avatar-effect__ring, .avatar-effect--crt-scan .avatar-effect__ring { opacity:.88; }
  .avatar-effect--signal-ring .avatar-effect__ring { border-style:dashed; }
  .avatar-effect__marks { inset:8%; border:1px solid transparent; border-top-color:var(--avatar-color-2); border-bottom-color:var(--avatar-color-3); border-radius:50%; opacity:0; }
  .avatar-effect--crystal-aperture .avatar-effect__marks, .avatar-effect--night-frame .avatar-effect__marks { opacity:.8; clip-path:polygon(0 0, 28% 0, 0 28%, 0 72%, 28% 100%, 0 100%, 0 72%, 0 28%, 72% 0, 100% 0, 100% 28%, 72% 100%, 100% 100%, 100% 72%, 100% 28%); background:color-mix(in srgb, var(--avatar-accent) 76%, transparent); }
  .avatar-effect--night-frame .avatar-effect__marks { inset:4%; background:transparent; border:1px solid color-mix(in srgb, var(--avatar-accent) 55%, transparent); clip-path:none; }
  .avatar-effect__arc { inset:-9%; border:2px solid transparent; border-left-color:var(--avatar-accent); border-top-color:var(--avatar-color-2); border-radius:50%; opacity:0; }
  .avatar-effect--chroma-arc .avatar-effect__arc, .avatar-effect--prism-orbit .avatar-effect__arc, .avatar-effect--color-archive .avatar-effect__arc { opacity:.9; }
  .avatar-effect--color-archive .avatar-effect__arc { border-right-color:var(--avatar-color-3); border-bottom-color:var(--avatar-color-4); }
  .avatar-effect__scan { inset:0; border-radius:inherit; background:linear-gradient(180deg, transparent 35%, color-mix(in srgb, var(--avatar-color-2) 28%, transparent) 47%, transparent 55%); opacity:0; mix-blend-mode:screen; }
  .avatar-effect--crt-scan .avatar-effect__scan, .avatar-effect--static-offset .avatar-effect__scan { opacity:.75; }
  .avatar-effect__satellites { inset:-12%; opacity:0; background:radial-gradient(circle at 12% 34%, var(--avatar-color-2) 0 2px, transparent 2.5px), radial-gradient(circle at 90% 22%, var(--avatar-accent) 0 2px, transparent 2.5px), radial-gradient(circle at 84% 85%, var(--avatar-color-3) 0 2px, transparent 2.5px); }
  .avatar-effect--pixel-satellites .avatar-effect__satellites, .avatar-effect--prism-orbit .avatar-effect__satellites { opacity:.95; }
  .avatar-effect--pixel-satellites .avatar-effect__satellites { image-rendering:pixelated; }
  .avatar-effect__crown { top:-18%; left:15%; right:15%; height:32%; opacity:0; border-top:2px solid #F5C66B; clip-path:polygon(0 100%, 16% 35%, 32% 80%, 50% 0, 68% 80%, 84% 35%, 100% 100%); background:linear-gradient(90deg, transparent, #F5C66B, transparent); }
  .avatar-effect--ember-crown .avatar-effect__crown { opacity:.95; }
  .avatar-effect__laurel { inset:35% -6% -5%; opacity:0; border:2px solid #E4BC68; border-top-color:transparent; border-radius:50%; transform:rotate(-18deg); }
  .avatar-effect--gold-laurel .avatar-effect__laurel { opacity:.85; }
  .avatar-effect__tear { inset:-3%; opacity:0; border:1px solid color-mix(in srgb, var(--avatar-accent) 60%, white); clip-path:polygon(0 10%, 14% 0, 28% 8%, 44% 0, 60% 7%, 76% 0, 100% 12%, 94% 28%, 100% 44%, 92% 62%, 100% 80%, 84% 100%, 68% 92%, 52% 100%, 34% 92%, 18% 100%, 0 86%, 8% 68%, 0 50%, 7% 30%); }
  .avatar-effect--paper-tear .avatar-effect__tear, .avatar-effect--ink-stamp .avatar-effect__tear { opacity:.8; }
  .avatar-effect--ink-stamp .avatar-effect__tear { border-style:dotted; transform:rotate(-2deg); }
  .avatar-effect--ashfall::after, .avatar-effect--ghost-double::after, .avatar-effect--static-offset::after { position:absolute; inset:0; z-index:1; pointer-events:none; content:''; }
  .avatar-effect--ashfall::after { opacity:.6; background:radial-gradient(circle at 24% 6%, #E7D4C4 0 1px, transparent 1.5px), radial-gradient(circle at 72% 14%, #C9B39A 0 1px, transparent 1.5px), radial-gradient(circle at 52% 88%, #B7A18D 0 1px, transparent 1.5px); }
  .avatar-effect--ghost-double::after { opacity:0; background:transparent; }
  .avatar-effect--static-offset::after { opacity:.38; background:linear-gradient(90deg, transparent 0 22%, #69E9FF 22% 24%, transparent 24% 76%, #FF8FCA 76% 78%, transparent 78%); mix-blend-mode:screen; }

  /* Authored plates carry the visual identity; CSS only provides layout-safe fallbacks. */
  .avatar-effect--prism-orbit .avatar-effect__arc,
  .avatar-effect--prism-orbit .avatar-effect__satellites,
  .avatar-effect--ember-crown .avatar-effect__crown,
  .avatar-effect--authored .avatar-effect__tear,
  .avatar-effect--authored .avatar-effect__marks { display:none; }

  .avatar-effect--animated .avatar-effect__authored-plate { transform-origin:50% 50%; }
  .avatar-effect--animated.avatar-effect--prism-orbit .avatar-effect__authored-plate { animation:avatar-authored-prism 8s cubic-bezier(.45,0,.25,1) infinite; }
  .avatar-effect--animated.avatar-effect--ember-crown .avatar-effect__authored-plate { animation:avatar-authored-crown 4.6s ease-in-out infinite; }
  .avatar-effect--animated.avatar-effect--ghost-double .avatar-effect__authored-plate { animation:avatar-authored-ghost 4.4s steps(3,end) infinite; }
  .avatar-effect--ember-crown .avatar-effect__authored-plate { transform:translateY(-22%) scale(.94); }

  .avatar-effect--animated.avatar-effect--neon-halo .avatar-effect__halo, .avatar-effect--animated.avatar-effect--daily-aura .avatar-effect__halo { animation:avatar-effect-breathe 2.8s ease-in-out infinite; }
  .avatar-effect--animated.avatar-effect--signal-ring .avatar-effect__ring, .avatar-effect--animated.avatar-effect--chroma-arc .avatar-effect__arc { animation:avatar-effect-spin 5.5s linear infinite; }
  .avatar-effect--animated.avatar-effect--crt-scan .avatar-effect__scan { animation:avatar-effect-scan 3.6s ease-in-out infinite; }
  .avatar-effect--animated.avatar-effect--static-offset::after { animation:avatar-effect-offset 3.2s steps(2,end) infinite; }
  .avatar-effect--animated.avatar-effect--color-archive .avatar-effect__arc { animation:avatar-effect-spin 8s linear infinite; }
  @keyframes avatar-effect-breathe { 0%,100% { transform:scale(.96); opacity:.5; } 50% { transform:scale(1.04); opacity:.95; } }
  @keyframes avatar-effect-spin { to { transform:rotate(360deg); } }
  @keyframes avatar-effect-scan { 0%,100% { transform:translateY(-35%); opacity:.1; } 50% { transform:translateY(35%); opacity:.8; } }
  @keyframes avatar-effect-offset { 0%,80%,100% { opacity:.1; } 84% { transform:translateX(-2px); opacity:.7; } 88% { transform:translateX(2px); opacity:.45; } }
  @keyframes avatar-authored-prism { 0%,100% { transform:rotate(-2deg) scale(.985); filter:saturate(.94) brightness(.96); } 42% { transform:rotate(1.5deg) scale(1.01); filter:saturate(1.12) brightness(1.05); } 74% { transform:rotate(-.5deg) scale(1); filter:saturate(1) brightness(1); } }
  @keyframes avatar-authored-crown { 0%,100% { transform:translateY(calc(-22% + 2px)) scale(.94) rotate(-.8deg); filter:brightness(.94); } 45% { transform:translateY(calc(-22% - 2px)) scale(.96) rotate(.5deg); filter:brightness(1.1); } 70% { transform:translateY(-22%) scale(.94) rotate(-.2deg); filter:brightness(1); } }
  @keyframes avatar-authored-ghost { 0%,64%,100% { transform:translateX(0) scale(1); filter:saturate(.92) brightness(.96); opacity:.86; } 70% { transform:translateX(-3px) scale(1.018); filter:saturate(1.18) brightness(1.08); opacity:1; } 76% { transform:translateX(2px) scale(.992); filter:saturate(1.08) brightness(1.02); opacity:.9; } }
  @keyframes avatar-effect-ghost { 0%,70%,100% { opacity:.12; transform:translate(4px,-1px) scale(1.012); clip-path:circle(50% at 50% 50%); } 74% { opacity:.36; transform:translate(-3px,1px) scale(1.018); clip-path:polygon(0 18%, 100% 18%, 100% 34%, 0 34%, 0 58%, 100% 58%, 100% 72%, 0 72%); } 79% { opacity:.2; transform:translate(3px,0) scale(1.014); clip-path:circle(50% at 50% 50%); } }
  .avatar-effect--compact .avatar-effect__halo { filter:none; }
  @media (prefers-reduced-motion: reduce) {
    .avatar-effect--animated .avatar-effect__halo,
    .avatar-effect--animated .avatar-effect__ring,
    .avatar-effect--animated .avatar-effect__arc,
    .avatar-effect--animated .avatar-effect__scan,
    .avatar-effect--animated::after,
    .avatar-effect--animated .avatar-effect__duplicate,
    .avatar-effect--animated .avatar-effect__authored-plate { animation:none !important; }
  }
</style>
