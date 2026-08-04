<script>
  import { getAvatarEffectDefinition } from './avatarEffects.js';

  export let effectKey = '';
  export let accentColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let animated = true;
  export let className = '';

  $: definition = getAvatarEffectDefinition(effectKey);
  $: compact = mode === 'compact' || mode === 'card';
  $: effectClass = [
    'avatar-effect',
    className,
    definition ? `avatar-effect--${definition.key}` : 'avatar-effect--none',
    compact ? 'avatar-effect--compact' : '',
    animated && !compact ? 'avatar-effect--animated' : 'avatar-effect--static'
  ].filter(Boolean).join(' ');
  $: colors = [accentColor, ...(Array.isArray(recentColors) ? recentColors : [])].filter(color => /^#[0-9a-f]{6}$/i.test(String(color || ''))).slice(0, 4);
</script>

<div class={effectClass} style={`--avatar-accent:${colors[0] || '#8B7CF6'}; --avatar-color-2:${colors[1] || '#8DDCFF'}; --avatar-color-3:${colors[2] || '#B7FD4D'};`}>
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
</div>

<style>
  .avatar-effect { position:relative; isolation:isolate; }
  .avatar-effect > :global(img), .avatar-effect > :global(.identity-card__avatar-glow), .avatar-effect > :global(.identity-card__avatar-letter), .avatar-effect > :global(.identity-card__avatar-mark) { position:relative; z-index:2; }
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
  .avatar-effect--color-archive .avatar-effect__arc { border-right-color:var(--avatar-color-3); border-bottom-color:var(--avatar-color-2); }
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
  .avatar-effect--ghost-double::after { opacity:.23; background:inherit; transform:translate(3px,1px); mix-blend-mode:screen; }
  .avatar-effect--static-offset::after { opacity:.38; background:linear-gradient(90deg, transparent 0 22%, #69E9FF 22% 24%, transparent 24% 76%, #FF8FCA 76% 78%, transparent 78%); mix-blend-mode:screen; }
  .avatar-effect--animated.avatar-effect--neon-halo .avatar-effect__halo, .avatar-effect--animated.avatar-effect--daily-aura .avatar-effect__halo { animation:avatar-effect-breathe 2.8s ease-in-out infinite; }
  .avatar-effect--animated.avatar-effect--signal-ring .avatar-effect__ring, .avatar-effect--animated.avatar-effect--chroma-arc .avatar-effect__arc { animation:avatar-effect-spin 5.5s linear infinite; }
  .avatar-effect--animated.avatar-effect--crt-scan .avatar-effect__scan { animation:avatar-effect-scan 3.6s ease-in-out infinite; }
  .avatar-effect--animated.avatar-effect--static-offset::after { animation:avatar-effect-offset 3.2s steps(2,end) infinite; }
  .avatar-effect--animated.avatar-effect--color-archive .avatar-effect__arc { animation:avatar-effect-spin 8s linear infinite; }
  @keyframes avatar-effect-breathe { 0%,100% { transform:scale(.96); opacity:.5; } 50% { transform:scale(1.04); opacity:.95; } }
  @keyframes avatar-effect-spin { to { transform:rotate(360deg); } }
  @keyframes avatar-effect-scan { 0%,100% { transform:translateY(-35%); opacity:.1; } 50% { transform:translateY(35%); opacity:.8; } }
  @keyframes avatar-effect-offset { 0%,80%,100% { opacity:.1; } 84% { transform:translateX(-2px); opacity:.7; } 88% { transform:translateX(2px); opacity:.45; } }
  .avatar-effect--compact .avatar-effect__halo { filter:none; }
  @media (prefers-reduced-motion: reduce) { .avatar-effect--animated .avatar-effect__halo, .avatar-effect--animated .avatar-effect__ring, .avatar-effect--animated .avatar-effect__arc, .avatar-effect--animated .avatar-effect__scan, .avatar-effect--animated::after { animation:none !important; } }
</style>
