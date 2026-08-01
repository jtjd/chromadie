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
    min-height: 5rem;
    color: var(--color-ink-muted);
    font: 500 0.78rem / 1.4 var(--font-body-stack);
  }

  .route-loading__indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-accent-bright);
    box-shadow: 0 0 0.8rem rgba(183, 253, 77, 0.45);
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
