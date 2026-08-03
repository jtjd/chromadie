<script>
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import HomepageProfileDirectory from './HomepageProfileDirectory.svelte';
  import HomeHero from './HomeHero.svelte';
  import HomeProductView from './HomeProductView.svelte';
  import HomeHowItWorks from './HomeHowItWorks.svelte';
  import HomeLeaderboard from './HomeLeaderboard.svelte';
  import HomeUsernameClaim from './HomeUsernameClaim.svelte';
  import { ACCOUNT_STATES } from './authState.js';
  import { HOMEPAGE_LOADING_COLOR } from './homepageDirectory.js';
  import { normalizeHexColor } from './utils.js';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);

  const dispatch = createEventDispatcher();
  let revealObserver;
  let revealScrollHandler;

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  $: accountReady = accountState === ACCOUNT_STATES.SIGNED_OUT || accountState === ACCOUNT_STATES.AUTHENTICATED;
  $: accountUnavailable = accountState === ACCOUNT_STATES.PROFILE_ERROR;

  function revealHomepageContent() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const elements = [...document.querySelectorAll('.home-page .home-reveal')];
    const revealVisibleElements = () => {
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) element.classList.add('home-reveal--visible');
      });
    };
    if (reducedMotion || typeof IntersectionObserver !== 'function') {
      elements.forEach(element => element.classList.add('home-reveal--visible'));
      return;
    }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('home-reveal--visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    elements.forEach(element => revealObserver.observe(element));
    revealScrollHandler = revealVisibleElements;
    window.addEventListener('scroll', revealScrollHandler, { passive: true });
    revealVisibleElements();
  }

  onMount(() => {
    void tick().then(revealHomepageContent);
  });
  onDestroy(() => {
    revealObserver?.disconnect();
    if (revealScrollHandler) window.removeEventListener('scroll', revealScrollHandler);
  });
</script>

<main class="home-page" aria-labelledby="home-title">
  <HomepageProfileDirectory on:navigate={forwardAction} on:activecolor={event => dispatch('activecolor', event.detail)} let:directory>
    <div
      class="home-page__content"
      style={`--home-active-color: ${normalizeHexColor((directory.heroRoll || directory.previewRoll)?.hexCode, HOMEPAGE_LOADING_COLOR)};`}
    >
      <HomeHero
        isAuthenticated={isAuthenticated}
        {accountReady}
        {accountUnavailable}
        roll={directory.heroRoll || directory.previewRoll}
        rollIsPreview={!directory.heroRoll && Boolean(directory.previewRoll)}
        previewAvailable={directory.previewAvailable}
        loading={directory.loading}
        tickerVisible={directory.tickerEvents.length > 0}
        on:claim={forwardAction}
        on:profile={forwardAction}
      />
      <HomeProductView />
      <HomeHowItWorks />
      <HomeLeaderboard
        rows={directory.leaderboard}
        featuredProfiles={directory.featuredProfiles}
        loading={directory.loading}
        error={directory.error}
      />

      <section class="home-final home-reveal" id="claim" aria-labelledby="home-final-title">
        <div class="home-shell">
          <p class="home-kicker">chm.lol/yourname</p>
          <h2 id="home-final-title">Claim the page that changes with you.</h2>
          <p>Free to begin. One color each day. Every result becomes part of your public history.</p>
          <HomeUsernameClaim isAuthenticated={isAuthenticated} {accountReady} {accountUnavailable} inputId="home-claim-final" showLabel={false} showNote={false} on:claim={forwardAction} on:profile={forwardAction} />
        </div>
      </section>
    </div>
  </HomepageProfileDirectory>
</main>

<style>
  .home-page { --home-canvas: #0d0f13; --home-deep: #090a0d; --home-raised: #111319; --home-line: rgba(255, 255, 255, 0.075); --home-ink: #f2f0eb; --home-ink-muted: #aaa8b0; --home-ink-faint: #7d7e87; --home-accent: #cdd2ff; --home-daily: #a9006d; --home-font: 'Instrument Sans Variable', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif; --home-mono: 'IBM Plex Mono', ui-monospace, monospace; position: relative; min-height: 100%; overflow: hidden; isolation: isolate; color: var(--home-ink); background: linear-gradient(180deg, #121419 0%, var(--home-canvas) 34%, var(--home-deep) 100%); font-family: var(--home-font); }
  .home-page::before { position: fixed; z-index: -1; inset: 0; content: ''; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.009) 0 1px, transparent 1px 4px); opacity: 0.55; }
  .home-page__content { --home-accent: color-mix(in srgb, var(--home-active-color, #8B7CF6) 42%, #f2f0eb); }
  :global(.home-shell) { width: min(calc(100% - 2.5rem), 86.25rem); margin: 0 auto; }
  :global(.home-kicker) { color: #858690; font: 500 0.68rem / 1 var(--home-mono); letter-spacing: 0.13em; text-transform: uppercase; }
  .home-final { position: relative; overflow: hidden; padding: 6.1rem 0 6.75rem; border-top: 1px solid var(--home-line); background: radial-gradient(circle at 50% -35%, color-mix(in srgb, var(--home-active-color) 10%, transparent), transparent 55%), #090a0d; text-align: center; }
  .home-final::before { display: block; width: 3.4rem; height: 1px; margin: 0 auto 1.7rem; content: ''; background: var(--home-accent); opacity: 0.72; }
  .home-final h2 { max-width: 62rem; margin: 0.8rem auto 1.05rem; background: linear-gradient(92deg, #f2f0eb 0%, #f2f0eb 42%, var(--home-accent) 50%, #f2f0eb 58%, #f2f0eb 100%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; font: 650 clamp(3rem, 6.1vw, 5.1rem) / 0.92 var(--home-font); letter-spacing: -0.044em; animation: home-final-sweep 10s ease-in-out infinite; }
  .home-final > .home-shell > p:not(.home-kicker) { margin: 0; color: var(--home-ink-muted); font-size: 1.06rem; }
  .home-final :global(.home-claim) { width: min(100%, 36.9rem); margin: 1.7rem auto 0; text-align: left; }
  :global(.home-reveal--visible) { opacity: 1 !important; transform: none !important; }
  @keyframes home-final-sweep { 0%, 74% { background-position: 100% 0; } 92%, 100% { background-position: -20% 0; } }
  @media (max-width: 48rem) {
    :global(.home-shell) { width: min(calc(100% - 2rem), 86.25rem); }
    .home-final { padding: 5rem 0 5.75rem; }
    .home-final h2 { font-size: clamp(2.85rem, 14vw, 4.5rem); }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-final h2 { animation: none; }
  }
</style>
