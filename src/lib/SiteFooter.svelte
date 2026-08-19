<script>
  export let isAuthenticated = false;
  export let variant = 'site';
</script>

<footer class="site-footer" class:site-footer--studio={variant === 'studio'} data-site-chrome="footer">
  <div class="site-footer__identity">
    {#if variant === 'studio'}
      <a class="site-footer__brand" href="/" aria-label="chm.lol home">
        <img class="site-footer__brand-logo" src="/brand/am-mark-v1.webp" alt="" width="52" height="42" decoding="async" />
      </a>
    {:else}
      <span>chm.lol</span>
    {/if}
    <span>A public profile that changes every day.</span>
  </div>

  <nav class="site-footer__nav" aria-label="Footer navigation">
    <a href="/roll">Roll</a>
    <a href="/leaderboard">Leaderboard</a>
    {#if isAuthenticated}<a href="/progression">Progression</a>{/if}
    {#if isAuthenticated}<a href="/profile/settings">Customize</a>{/if}
    <a href="/pricing">Pricing</a>
    <a href="/how-to-play">How to Play</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="mailto:support@chromadie.com">Support</a>
    <a href="mailto:business@chromadie.com">Business</a>
  </nav>
</footer>

<style>
  .site-footer {
    --site-footer-border: var(--homepage-border, rgba(255, 255, 255, 0.11));
    --site-footer-muted: var(--homepage-muted-2, #6f6f79);
    --site-footer-ink: var(--homepage-text, #f5f5f7);
    position: relative;
    z-index: 1;
    display: flex;
    width: min(1160px, calc(100% - 48px));
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin: auto auto 0;
    padding: 28px 0 36px;
    border-top: 1px solid var(--site-footer-border);
    color: var(--site-footer-muted);
    font: 400 0.76rem / 1.4 'Inter', sans-serif;
  }

  .site-footer__identity {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }

  .site-footer__nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px 18px;
  }

  .site-footer__nav a {
    color: inherit;
    text-decoration: none;
    transition: color 0.18s ease;
  }

  .site-footer__nav a:hover,
  .site-footer__nav a:focus-visible {
    color: var(--site-footer-ink);
  }

  @media (max-width: 780px) {
    .site-footer {
      width: calc(100% - 30px);
      align-items: flex-start;
      flex-direction: column;
    }

    .site-footer__nav {
      justify-content: flex-start;
    }
  }

  @media (max-height: 32rem) {
    .site-footer { padding-block: 20px 24px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .site-footer__nav a { transition: none; }
  }
</style>
