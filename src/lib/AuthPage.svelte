<script>
  import { onMount, tick } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import Auth from './Auth.svelte';
  import SiteFooter from './SiteFooter.svelte';
  import SiteModeHeader from './SiteModeHeader.svelte';
  import { accountState, authEvent, authInitialized, isAuthenticated, profileLoading, session } from './stores';
  import { buildAppUrl, getSafeNextUrl } from './authUrls.js';

  export let initialTab = 'login';
  export let initialUsername = '';
  export let next = '';

  let redirected = false;

  function getFallbackHomeUrl() {
    return buildAppUrl('/');
  }

  function getRedirectUrl() {
    // Explicit handoffs (for example, Profile Studio) stay intact. A normal
    // sign-in or signup starts at the homepage so the user sees the product.
    return getSafeNextUrl(next, getFallbackHomeUrl());
  }

  function navigateFromAuth(event) {
    const view = event.detail?.view;
    window.location.assign(view === 'leaderboard' ? '/leaderboard' : view === 'pricing' ? '/pricing' : '/');
  }

  function openAuthRoute(event) {
    const mode = event.detail?.mode === 'signup' ? 'signup' : 'login';
    const params = new SvelteURLSearchParams();
    const safeNext = typeof next === 'string'
      && next.startsWith('/')
      && !next.startsWith('//')
      && !next.includes('\\')
      ? next.slice(0, 512)
      : '';
    if (mode === 'signup' && initialUsername) {
      params.set('username', initialUsername.trim().slice(0, 20));
    }
    if (safeNext) params.set('next', safeNext);
    const query = params.toString() ? `?${params.toString()}` : '';
    window.location.assign(`/${mode}${query}`);
  }

  function redirectAfterAuth() {
    if (redirected || typeof window === 'undefined') return;
    redirected = true;
    window.location.replace(getRedirectUrl());
  }

  onMount(async () => {
    await tick();
    const firstField = document.querySelector('#username-input, #email-input');
    if (firstField instanceof HTMLElement) firstField.focus();
  });

  $: if (
    !redirected
    && $authInitialized
    && $session
    && !$profileLoading
    && ($authEvent === 'SIGNED_IN' || $authEvent === 'USER_UPDATED' || $authEvent === 'INITIAL_SESSION')
  ) {
    redirectAfterAuth();
  }
</script>

<svelte:head>
  <meta name="description" content={initialTab === 'signup' ? 'Create a ChromaDie account and keep building your public color identity.' : 'Sign in to keep your ChromaDie profile, rolls, and cosmetics in sync.'} />
</svelte:head>

<main class="auth-page site-atmosphere-page" aria-labelledby="auth-dialog-title">
  <div class="auth-page__content">
    <div class="auth-page__chrome-header" aria-label="ChromaDie navigation">
      <SiteModeHeader
        activeView="home"
        accountState={$accountState}
        isAuthenticated={$isAuthenticated}
        isHomeMode={true}
        isHomepageStyle={true}
        on:navigate={navigateFromAuth}
        on:login={openAuthRoute}
      />
    </div>

    <div class="auth-page__layout">
      <section class="auth-page__stage" aria-label={initialTab === 'signup' ? 'Create account' : 'Sign in'}>
        <Auth
          standalone={true}
          initialTab={initialTab}
          initialUsername={initialUsername}
          {next}
        />
      </section>
    </div>

    <div class="auth-page__chrome-footer">
      <SiteFooter isAuthenticated={$isAuthenticated} />
    </div>
  </div>
</main>

<style>
  .auth-page {
    --auth-page-canvas: #0b0b0d;
    --home-canvas: var(--bg, #0e0e10);
    min-height: 100svh;
    overflow: hidden;
    isolation: isolate;
    background-color: var(--auth-page-canvas);
    color: var(--text, #f5f5f6);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .auth-page__content { display: flex; min-height: 100svh; flex-direction: column; }
  .auth-page__chrome-header { flex: 0 0 auto; }
  .auth-page__layout { display: grid; flex: 1 1 auto; min-height: 0; place-items: center; padding: 2rem 1rem 3.5rem; }
  .auth-page__stage { display: grid; width: min(100%, 23rem); place-items: center; }

  /* Keep the complete shared capsule and navigation on both login and signup.
     Auth remains a focused task through its content card, not by removing
     route navigation from the surrounding site chrome. */
  :global(.auth-page .auth-container) { border-color: rgba(255, 255, 255, 0.09) !important; background: #141416 !important; box-shadow: 0 1.75rem 4.5rem rgba(0, 0, 0, 0.36) !important; }
  .auth-page__chrome-footer { display: none; }

  @media (max-width: 30rem) {
    .auth-page__layout { padding: 1rem 0.75rem 2rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-page *, .auth-page *::before, .auth-page *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>
