<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { createProfileShimmerController } from './profileShimmerRenderer.js';

  export let host = null;
  export let enabled = true;

  let trail;
  let controller;

  function syncController() {
    if (!host || !trail) return;
    if (!controller) {
      controller = createProfileShimmerController({
        host,
        layer: trail,
        enabled
      });
      return;
    }
    controller.update({ enabled });
  }

  onMount(syncController);
  afterUpdate(syncController);

  onDestroy(() => {
    controller?.destroy();
    controller = null;
  });
</script>

<div class="profile-shimmer-frame" aria-hidden="true">
  <div bind:this={trail} class="profile-shimmer-frame__layer profile-shimmer-frame__layer--trail"></div>
  <div class="profile-shimmer-frame__layer profile-shimmer-frame__layer--pulse"></div>
</div>
<div class="profile-border-effect__content"><slot /></div>

<style>
  .profile-shimmer-frame {
    position: absolute;
    inset: 0;
    z-index: 2;
    border-radius: inherit;
    pointer-events: none;
  }

  .profile-shimmer-frame__layer {
    display: block;
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: var(--profile-border-width, 1px);
    pointer-events: none;
    box-sizing: border-box;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .profile-shimmer-frame__layer--trail {
    background:
      radial-gradient(circle at var(--profile-shimmer-x-0, 50%) var(--profile-shimmer-y-0, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 57%, transparent) 0 8px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 29%, transparent) 18px, transparent 42px),
      radial-gradient(circle at var(--profile-shimmer-x-1, 50%) var(--profile-shimmer-y-1, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 50%, transparent) 0 9px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 24%, transparent) 21px, transparent 49px),
      radial-gradient(circle at var(--profile-shimmer-x-2, 50%) var(--profile-shimmer-y-2, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 42%, transparent) 0 11px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 20%, transparent) 25px, transparent 57px),
      radial-gradient(circle at var(--profile-shimmer-x-3, 50%) var(--profile-shimmer-y-3, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 34%, transparent) 0 13px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 16%, transparent) 30px, transparent 66px),
      radial-gradient(circle at var(--profile-shimmer-x-4, 50%) var(--profile-shimmer-y-4, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 26%, transparent) 0 15px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 12%, transparent) 35px, transparent 76px),
      radial-gradient(circle at var(--profile-shimmer-x-5, 50%) var(--profile-shimmer-y-5, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 19%, transparent) 0 17px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 9%, transparent) 41px, transparent 87px),
      radial-gradient(circle at var(--profile-shimmer-x-6, 50%) var(--profile-shimmer-y-6, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 13%, transparent) 0 19px, color-mix(in srgb, var(--profile-border-color, #CDD2FF) 6%, transparent) 47px, transparent 98px),
      radial-gradient(circle at var(--profile-shimmer-x-7, 50%) var(--profile-shimmer-y-7, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 9%, transparent) 0 21px, transparent 108px),
      radial-gradient(circle at var(--profile-shimmer-x-8, 50%) var(--profile-shimmer-y-8, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 6%, transparent) 0 24px, transparent 118px),
      radial-gradient(circle at var(--profile-shimmer-x-9, 50%) var(--profile-shimmer-y-9, 0), color-mix(in srgb, var(--profile-border-color, #CDD2FF) 4%, transparent) 0 27px, transparent 128px);
    filter: blur(.65px) drop-shadow(0 0 9px color-mix(in srgb, var(--profile-border-color, #CDD2FF) 41%, transparent));
  }

  .profile-shimmer-frame__layer--pulse {
    background: color-mix(in srgb, var(--profile-border-color, #CDD2FF) 78%, transparent);
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--profile-border-color, #CDD2FF) 24%, transparent));
    opacity: .72;
    animation: profile-shimmer-frame-pulse 4.8s ease-in-out infinite;
  }

  @keyframes profile-shimmer-frame-pulse {
    0%, 100% {
      opacity: .58;
      filter: drop-shadow(0 0 4px color-mix(in srgb, var(--profile-border-color, #CDD2FF) 18%, transparent)) drop-shadow(0 0 10px color-mix(in srgb, var(--profile-border-color, #CDD2FF) 10%, transparent));
    }
    48% {
      opacity: 1;
      filter: drop-shadow(0 0 8px color-mix(in srgb, var(--profile-border-color, #CDD2FF) 38%, transparent)) drop-shadow(0 0 18px color-mix(in srgb, var(--profile-border-color, #CDD2FF) 22%, transparent));
    }
  }

  :global(.profile-border-effect--static) .profile-shimmer-frame__layer--pulse {
    animation: none;
    opacity: .78;
  }

  .profile-border-effect__content {
    min-width: 0;
    max-width: 100%;
    border-radius: inherit;
    position: relative;
    z-index: 1;
    overflow: visible;
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-shimmer-frame__layer--pulse { animation: none; opacity: .78; }
  }
</style>
