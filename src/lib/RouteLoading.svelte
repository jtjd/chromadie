<script>
  export let label = 'Loading your account';
</script>

<section class="route-loading" role="status" aria-live="polite">
  <span class="route-loading__indicator" aria-hidden="true"></span>
  <span>{label}</span>
</section>

<style>
  .route-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    width: min(760px, calc(100% - 3rem));
    min-height: 9rem;
    margin: clamp(3rem, 7vw, 6rem) auto 5rem;
    padding: 1.5rem;
    border: 1px solid var(--border, rgba(255, 255, 255, .09));
    border-radius: 18px;
    background: var(--surface-2, #1e1e22);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: var(--color-ink-muted);
    font: 500 0.78rem / 1.4 var(--font-body-stack);
  }

  .route-loading__indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--white, #ffffff);
    box-shadow: 0 0 0.8rem var(--site-brand-accent-glow, rgba(255, 255, 255, .16));
    animation: route-loading-pulse 1.4s ease-in-out infinite;
  }

  @keyframes route-loading-pulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .route-loading__indicator { animation: none; opacity: 0.8; }
  }
</style>
