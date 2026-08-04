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
    padding: 2px;
    border: 1px solid var(--border-accent);
    border-radius: inherit;
    box-sizing: border-box;
    overflow: hidden;
    isolation: isolate;
  }

  .profile-border-effect__content {
    min-width: 0;
    max-width: 100%;
    border-radius: inherit;
    position: relative;
    z-index: 1;
  }

  .profile-border-effect--none {
    padding: 0;
    border: 0;
    border-color: transparent;
    box-shadow: none;
  }

  .profile-border-effect--celestial {
    --border-accent: #d8dcff;
    --border-shadow: rgba(170, 182, 255, 0.36);
    box-shadow: 0 0 0 1px rgba(235, 239, 255, 0.22), 0 0 18px var(--border-shadow);
  }

  .profile-border-effect--chroma {
    --border-accent: #ff8fca;
    --border-shadow: rgba(97, 226, 255, 0.34);
    box-shadow: 0 0 0 1px rgba(255, 238, 132, 0.2), 0 0 17px var(--border-shadow);
  }

  .profile-border-effect--crystal {
    --border-accent: #bfeaff;
    --border-shadow: rgba(171, 222, 255, 0.32);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34), 0 0 15px var(--border-shadow);
  }

  .profile-border-effect--glitch {
    --border-accent: #ff679b;
    --border-shadow: rgba(89, 235, 255, 0.32);
    box-shadow: 0 0 0 1px rgba(89, 235, 255, 0.25), 0 0 14px var(--border-shadow);
  }

  .profile-border-effect--gold {
    --border-accent: #e4bc68;
    --border-shadow: rgba(228, 188, 104, 0.28);
    box-shadow: inset 0 0 0 1px rgba(255, 235, 164, 0.25), 0 0 14px var(--border-shadow);
  }

  .profile-border-effect--neon {
    --border-accent: #77fff0;
    --border-shadow: rgba(48, 255, 224, 0.34);
    box-shadow: 0 0 12px var(--border-shadow);
  }

  .profile-border-effect--prism {
    --border-accent: #cdd2ff;
    --border-shadow: rgba(205, 210, 255, 0.34);
    box-shadow: 0 0 0 1px rgba(255, 163, 220, 0.2), 0 0 16px var(--border-shadow);
  }

  .profile-border-effect--void {
    --border-accent: #9482d9;
    --border-shadow: rgba(107, 74, 198, 0.34);
    box-shadow: inset 0 0 0 1px rgba(3, 2, 10, 0.5), 0 0 16px var(--border-shadow);
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
    0%, 100% { box-shadow: 0 0 0 1px rgba(235, 239, 255, 0.2), 0 0 12px var(--border-shadow); }
    50% { box-shadow: 0 0 0 1px rgba(235, 239, 255, 0.42), 0 0 22px var(--border-shadow); }
  }

  @keyframes profile-border-chroma {
    0%, 100% {
      border-color: #ff8fca;
      box-shadow: 0 0 0 1px rgba(255, 238, 132, 0.2), 0 0 17px rgba(97, 226, 255, 0.34);
    }
    33% {
      border-color: #61e2ff;
      box-shadow: 0 0 0 1px rgba(255, 143, 202, 0.24), 0 0 21px rgba(97, 226, 255, 0.44);
    }
    66% {
      border-color: #ffe27a;
      box-shadow: 0 0 0 1px rgba(97, 226, 255, 0.24), 0 0 19px rgba(255, 143, 202, 0.38);
    }
  }

  @keyframes profile-border-prism {
    0%, 100% {
      border-color: #cdd2ff;
      box-shadow: 0 0 0 1px rgba(255, 163, 220, 0.2), 0 0 14px rgba(205, 210, 255, 0.3);
    }
    50% {
      border-color: #f7b7e2;
      box-shadow: 0 0 0 1px rgba(205, 210, 255, 0.28), 0 0 24px rgba(247, 183, 226, 0.42);
    }
  }

  @keyframes profile-border-crystal {
    0%, 100% {
      border-color: #bfeaff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28), 0 0 12px rgba(171, 222, 255, 0.28);
    }
    50% {
      border-color: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.52), 0 0 24px rgba(171, 222, 255, 0.42);
    }
  }

  @keyframes profile-border-glitch {
    0%, 82%, 100% {
      border-color: #ff679b;
      box-shadow: 0 0 0 1px rgba(89, 235, 255, 0.25), 0 0 14px rgba(89, 235, 255, 0.32);
    }
    84% {
      border-color: #59ebff;
      box-shadow: 0 0 0 1px rgba(255, 239, 122, 0.3), 0 0 20px rgba(89, 235, 255, 0.42);
    }
    87% {
      border-color: #ffef7a;
      box-shadow: 0 0 0 1px rgba(255, 103, 155, 0.3), 0 0 8px rgba(255, 103, 155, 0.28);
    }
  }

  @keyframes profile-border-gold {
    0%, 100% { box-shadow: inset 0 0 0 1px rgba(255, 235, 164, 0.18), 0 0 10px var(--border-shadow); }
    50% { box-shadow: inset 0 0 0 1px rgba(255, 235, 164, 0.42), 0 0 20px var(--border-shadow); }
  }

  @keyframes profile-border-neon {
    0%, 100% {
      border-color: #77fff0;
      box-shadow: 0 0 8px rgba(48, 255, 224, 0.28);
    }
    45% {
      border-color: #b3fff5;
      box-shadow: 0 0 22px rgba(48, 255, 224, 0.48);
    }
    70% {
      border-color: #4fe8d7;
      box-shadow: 0 0 12px rgba(48, 255, 224, 0.34);
    }
  }

  @keyframes profile-border-void {
    0%, 100% { box-shadow: inset 0 0 0 1px rgba(3, 2, 10, 0.52), 0 0 10px var(--border-shadow); }
    50% { box-shadow: inset 0 0 0 1px rgba(3, 2, 10, 0.72), 0 0 20px var(--border-shadow); }
  }

  @keyframes profile-border-signal {
    0%, 100% { box-shadow: 0 0 0 1px rgba(183, 253, 77, 0.18), 0 0 8px var(--border-shadow); }
    50% { box-shadow: 0 0 0 1px rgba(183, 253, 77, 0.4), 0 0 16px var(--border-shadow); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-border-effect {
      animation: none !important;
    }
  }
</style>
