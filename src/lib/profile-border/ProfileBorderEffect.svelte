<script>
  import { onDestroy, onMount } from 'svelte';
  import { getProfileBorderDefinition, getProfileBorderKey } from './profileBorders.js';

  export let borderKey = '';
  export let className = '';
  export let compact = false;
  export let animated = true;

  let host;
  let visible = true;
  let reducedMotion = false;
  let mediaQuery;
  let observer;

  $: definition = getProfileBorderDefinition(borderKey);
  $: resolvedKey = getProfileBorderKey(borderKey);
  $: shouldAnimate = Boolean(definition && animated && visible && !reducedMotion);
  $: hostClass = [
    'profile-border-effect',
    `profile-border-effect--${resolvedKey || 'none'}`,
    compact ? 'profile-border-effect--compact' : '',
    shouldAnimate ? '' : 'profile-border-effect--static',
    className
  ].filter(Boolean).join(' ');

  function updateReducedMotion(event) {
    reducedMotion = Boolean(event?.matches ?? mediaQuery?.matches);
  }

  onMount(() => {
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);

    if ('IntersectionObserver' in window && host) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
      }, { rootMargin: '120px' });
      observer.observe(host);
    }

    return () => {
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      observer?.disconnect();
      observer = null;
    };
  });

  onDestroy(() => {
    mediaQuery?.removeEventListener?.('change', updateReducedMotion);
    observer?.disconnect();
  });
</script>

<div bind:this={host} class={hostClass} data-profile-border={resolvedKey || 'none'}>
  <div class="profile-border-effect__content">
    <slot />
  </div>
</div>

<style>
  .profile-border-effect {
    --border-accent: #cdd2ff;
    --border-shadow: rgba(205, 210, 255, 0.22);
    position: relative;
    min-width: 0;
    max-width: 100%;
    padding: 1px;
    border: 2px solid var(--border-accent);
    border-radius: var(--profile-border-radius, var(--radius-lg));
    box-sizing: border-box;
    overflow: visible;
    isolation: isolate;
  }

  .profile-border-effect,
  .profile-border-effect--surface {
    border-width: var(--profile-border-width, 1px);
    border-color: color-mix(in srgb, var(--profile-border-color, #ffffff) calc(var(--profile-border-opacity, .11) * 100%), var(--border-accent));
    background: var(--profile-surface-fill, color-mix(in srgb, var(--profile-surface, #090b0f) calc(var(--profile-surface-opacity, .64) * 100%), transparent));
    box-shadow: 0 2rem 5rem rgba(0, 0, 0, .34), inset 0 1px 0 rgba(255, 255, 255, .045);
    backdrop-filter: blur(var(--profile-surface-blur, 20px));
    -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
  }

  @supports ((-webkit-backdrop-filter: blur(0)) or (backdrop-filter: blur(0))) {
    .profile-border-effect,
    .profile-border-effect--surface {
      -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
      backdrop-filter: blur(var(--profile-surface-blur, 20px));
    }
  }

  .profile-border-effect--content {
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .profile-border-effect__content {
    min-width: 0;
    max-width: 100%;
    border-radius: inherit;
    position: relative;
    z-index: 1;
  }

  .profile-border-effect__content { overflow: visible; }

  .profile-border-effect:not(.profile-border-effect--none)::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 1.2rem var(--border-shadow);
    opacity: 0.82;
    pointer-events: none;
  }

  .profile-border-effect--none.profile-border-effect--content {
    padding: 0;
    border: 0;
    border-color: transparent;
    box-shadow: none;
    overflow: visible;
  }

  .profile-border-effect--content:not(.profile-border-effect--none) {
    padding: 2px;
  }

  .profile-border-effect--celestial {
    --border-accent: #a1c4fd;
    --border-shadow: rgba(170, 182, 255, 0.36);
    box-shadow: 0 0 35px rgba(161, 196, 253, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.3);
  }

  .profile-border-effect--chroma {
    --border-accent: #ff8fca;
    --border-shadow: rgba(97, 226, 255, 0.34);
    box-shadow: 0 0 0 1px rgba(255, 238, 132, 0.2), 0 0 17px var(--border-shadow);
  }

  .profile-border-effect--crystal {
    --border-accent: #bfeaff;
    --border-shadow: rgba(171, 222, 255, 0.32);
    box-shadow: 0 0 15px var(--border-shadow), inset 0 0 10px rgba(185, 242, 255, 0.3);
  }

  .profile-border-effect--glitch {
    --border-accent: #ff679b;
    --border-shadow: rgba(89, 235, 255, 0.32);
    box-shadow: 0 0 0 1px rgba(89, 235, 255, 0.25), 0 0 14px var(--border-shadow);
  }

  .profile-border-effect--gold {
    --border-accent: #e4bc68;
    --border-shadow: rgba(228, 188, 104, 0.28);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 10px rgba(255, 215, 0, 0.1);
  }

  .profile-border-effect--neon {
    --border-accent: #77fff0;
    --border-shadow: rgba(48, 255, 224, 0.34);
    box-shadow: 0 0 15px rgba(48, 255, 224, 0.4), inset 0 0 10px rgba(48, 255, 224, 0.1);
  }

  .profile-border-effect--prism {
    --border-accent: #cdd2ff;
    --border-shadow: rgba(205, 210, 255, 0.34);
    box-shadow: 0 0 15px rgba(194, 233, 251, 0.34);
  }

  .profile-border-effect--void {
    --border-accent: #9482d9;
    --border-shadow: rgba(107, 74, 198, 0.34);
    box-shadow: 0 0 2px rgba(230, 240, 255, 0.82), 0 0 14px rgba(123, 72, 218, 0.48), 0 0 34px rgba(0, 0, 0, 1), inset 0 0 32px rgba(0, 0, 0, 0.98);
  }

  .profile-border-effect--signal {
    --border-accent: #b7fd4d;
    --border-shadow: rgba(183, 253, 77, 0.25);
    box-shadow: 0 0 0 1px rgba(183, 253, 77, 0.2), 0 0 12px var(--border-shadow);
  }

  .profile-border-effect--celestial:not(.profile-border-effect--static) {
    animation: profile-border-celestial 4s ease-in-out infinite;
  }

  .profile-border-effect--chroma:not(.profile-border-effect--static) {
    animation: profile-border-chroma 4.8s ease-in-out infinite;
  }

  .profile-border-effect--prism:not(.profile-border-effect--static) {
    animation: profile-border-prism 5.2s ease-in-out infinite;
  }

  .profile-border-effect--crystal:not(.profile-border-effect--static) {
    animation: profile-border-crystal 3.8s ease-in-out infinite;
  }

  .profile-border-effect--glitch:not(.profile-border-effect--static) {
    animation: profile-border-glitch 2.8s steps(2, end) infinite;
  }

  .profile-border-effect--gold:not(.profile-border-effect--static) {
    animation: profile-border-gold 4.4s ease-in-out infinite;
  }

  .profile-border-effect--neon:not(.profile-border-effect--static) {
    animation: profile-border-neon 2.6s ease-in-out infinite;
  }

  .profile-border-effect--void:not(.profile-border-effect--static) {
    animation: profile-border-void 4.6s ease-in-out infinite;
  }

  .profile-border-effect--signal:not(.profile-border-effect--static) {
    animation: profile-border-signal 3.2s ease-in-out infinite;
  }

  .profile-border-effect--compact {
    padding: 1px;
  }

  .profile-border-effect--static {
    animation: none;
  }

  @keyframes profile-border-celestial {
    0%, 100% { box-shadow: 0 0 35px rgba(161, 196, 253, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2); }
    50% { box-shadow: 0 0 50px rgba(194, 233, 251, 0.9), inset 0 0 35px rgba(255, 255, 255, 0.5); }
  }

  @keyframes profile-border-chroma {
    0%, 100% {
      border-color: #ff8fca;
      box-shadow: 0 0 15px rgba(255, 77, 77, 0.5);
    }
    33% {
      border-color: #61e2ff;
      box-shadow: 0 0 15px rgba(46, 211, 201, 0.5);
    }
    66% {
      border-color: #ffe27a;
      box-shadow: 0 0 15px rgba(161, 92, 255, 0.5);
    }
  }

  @keyframes profile-border-prism {
    0%, 100% {
      border-color: #cdd2ff;
      box-shadow: 0 0 15px rgba(194, 233, 251, 0.24);
    }
    50% {
      border-color: #f7b7e2;
      box-shadow: 0 0 24px rgba(247, 183, 226, 0.42);
    }
  }

  @keyframes profile-border-crystal {
    0%, 100% {
      border-color: #bfeaff;
      box-shadow: 0 0 15px #b9f2ff, inset 0 0 10px rgba(185, 242, 255, 0.3);
    }
    50% {
      border-color: #ffffff;
      box-shadow: 0 0 25px #ffffff, inset 0 0 15px rgba(255, 255, 255, 0.5);
    }
  }

  @keyframes profile-border-glitch {
    0%, 82%, 100% {
      border-color: #ff679b;
      box-shadow: 1px 0 10px rgba(255, 0, 193, 0.3), -1px 0 10px rgba(0, 255, 249, 0.3);
    }
    84% {
      border-color: #59ebff;
      box-shadow: 5px 0 #ff00c1, -4px 0 #00fff9;
    }
    87% {
      border-color: #ffef7a;
      box-shadow: -5px 0 #ff00c1, 4px 0 #00fff9;
    }
  }

  @keyframes profile-border-gold {
    0%, 20% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 10px rgba(255, 215, 0, 0.1); }
    70%, 100% { box-shadow: 0 0 28px rgba(255, 235, 164, 0.5), inset 0 0 15px rgba(255, 235, 164, 0.18); }
  }

  @keyframes profile-border-neon {
    0%, 100% {
      border-color: #77fff0;
      box-shadow: 0 0 15px rgba(145, 70, 255, 0.4), inset 0 0 10px rgba(145, 70, 255, 0.1);
    }
    45% {
      border-color: #b3fff5;
      box-shadow: 0 0 26px rgba(0, 255, 249, 0.55), inset 0 0 16px rgba(0, 255, 249, 0.18);
    }
    70% {
      border-color: #4fe8d7;
      box-shadow: 0 0 12px rgba(48, 255, 224, 0.34);
    }
  }

  @keyframes profile-border-void {
    0%, 100% { box-shadow: 0 0 2px rgba(230, 240, 255, 0.65), 0 0 12px rgba(123, 72, 218, 0.35), 0 0 32px rgba(0, 0, 0, 1), inset 0 0 28px rgba(0, 0, 0, 0.94); }
    50% { box-shadow: 0 0 3px rgba(255, 255, 255, 0.95), 0 0 22px rgba(123, 72, 218, 0.72), 0 0 46px rgba(0, 0, 0, 1), inset 0 0 42px rgba(0, 0, 0, 1); }
  }

  @keyframes profile-border-signal {
    0%, 100% { box-shadow: 0 0 0 1px rgba(183, 253, 77, 0.18), 0 0 14px var(--border-shadow), inset 0 0 8px rgba(183, 253, 77, 0.08); }
    50% { box-shadow: 0 0 0 1px rgba(183, 253, 77, 0.4), 0 0 25px rgba(183, 253, 77, 0.48), inset 0 0 14px rgba(183, 253, 77, 0.16); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-border-effect,
    .profile-border-effect::before {
      animation: none !important;
    }
  }
</style>
