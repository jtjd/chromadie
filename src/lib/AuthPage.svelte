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
        showClaim={false}
        on:navigate={navigateFromAuth}
        on:login={openAuthRoute}
        on:claim={() => openAuthRoute({ detail: { mode: 'signup' } })}
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
    background: var(--auth-page-canvas);
    color: var(--text, #f5f5f6);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .auth-page__content { display: flex; min-height: 100svh; flex-direction: column; }
  .auth-page__chrome-header { flex: 0 0 auto; }
  .auth-page__layout { display: grid; flex: 1 1 auto; min-height: 0; place-items: center; padding: 2rem 1rem 3.5rem; }
  .auth-page__stage { display: grid; width: min(100%, 23rem); place-items: center; }

  /* Auth is a focused task. Keep the shared header mounted for route
     consistency while reducing it to the quiet brand mark used on this page. */
  :global(.auth-page .site-mode-header) { height: 4.25rem; }
  :global(.auth-page .site-mode-header__inner) { width: min(1080px, calc(100% - 2rem)); justify-content: flex-start; }
  :global(.auth-page .site-mode-header__nav), :global(.auth-page .site-mode-header__right) { display: none; }
  :global(.auth-page .site-mode-header .site-mode-header__mobile-menu) { display: none !important; }
  :global(.auth-page .site-mode-header__brand-logo) { width: 3.6rem; }
  :global(.auth-page .auth-container) { border-color: rgba(255, 255, 255, 0.09) !important; background: #141416 !important; box-shadow: 0 1.75rem 4.5rem rgba(0, 0, 0, 0.36) !important; }
  .auth-page__chrome-footer { display: none; }

  @media (max-width: 30rem) {
    .auth-page__layout { padding: 1rem 0.75rem 2rem; }
    :global(.auth-page .site-mode-header) { height: 3.75rem; }
    :global(.auth-page .site-mode-header__inner) { width: calc(100% - 1.5rem); }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-page *, .auth-page *::before, .auth-page *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>
