<script>
  import { onMount } from 'svelte';
  import SiteFooter from './SiteFooter.svelte';
  import SiteModeHeader from './SiteModeHeader.svelte';
  import { ACCOUNT_STATES } from './authState.js';
  import { session, authEvent } from './stores';
  import { getAppOrigin, getSafeNextUrl } from './authUrls';

  let status = 'loading';
  let message = 'Completing sign-in...';
  let timeoutId;
  let redirected = false;
  let nextUrl = getAppOrigin();

  $: chromeAuthenticated = Boolean($session);
  $: chromeAccountState = chromeAuthenticated ? ACCOUNT_STATES.AUTHENTICATED : ACCOUNT_STATES.SIGNED_OUT;

  function navigateFromChrome(event) {
    const view = event.detail?.view;
    window.location.assign(view === 'leaderboard' ? '/leaderboard' : view === 'pricing' ? '/pricing' : view === 'profile-settings' ? '/profile/settings' : '/');
  }

  function openAuthRoute(event) {
    window.location.assign(event.detail?.mode === 'signup' ? '/signup' : '/login');
  }

  function getNextUrl() {
    if (typeof window === 'undefined') return getAppOrigin();

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    return getSafeNextUrl(next);
  }

  function clearUrl() {
    if (typeof window === 'undefined') return;

    const target = new URL(nextUrl);
    window.history.replaceState({}, '', `${target.pathname}${target.search}`);
  }

  onMount(() => {
    nextUrl = getNextUrl();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description') || params.get('error') || '';
      if (errorDescription) {
        status = 'error';
        // URLSearchParams already decodes query values. Avoid a second decode,
        // which can throw on a literal percent sign in a provider error.
        message = errorDescription.slice(0, 300);
      }
    }

    timeoutId = setTimeout(() => {
      if (!redirected && !$session) {
        status = 'error';
        message = 'This confirmation link is invalid or expired. Go back to the app and request a new one if needed.';
      }
    }, 12000);

    return () => clearTimeout(timeoutId);
  });

  $: if (!redirected && ($session || $authEvent === 'SIGNED_IN' || $authEvent === 'USER_UPDATED')) {
    redirected = true;
    status = 'success';
    message = 'Email confirmed. Redirecting...';
    clearUrl();
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.replace(nextUrl);
      }
    }, 900);
  }
</script>

<div class="site-status-page site-atmosphere-page">
  <SiteModeHeader
    activeView="home"
    accountState={chromeAccountState}
    isAuthenticated={chromeAuthenticated}
    isHomeMode={true}
    isHomepageStyle={true}
    on:navigate={navigateFromChrome}
    on:login={openAuthRoute}
    on:claim={() => window.location.assign('/signup')}
  />

  <main class="bootstrap-error-shell">
    <section class="bootstrap-error-card glass-panel" role="status" aria-live="polite">
      <p class="bootstrap-error-kicker">Authentication</p>
      <h1>{status === 'success' ? 'Email confirmed' : status === 'error' ? 'Could not confirm' : 'Confirming your account'}</h1>
      <p class="bootstrap-error-message">{message}</p>
      {#if status === 'error'}
        <p class="bootstrap-error-help">Return to the app and sign in again, or request a fresh confirmation email.</p>
      {/if}
    </section>
  </main>

  <SiteFooter isAuthenticated={chromeAuthenticated} />
</div>

<style>
  .site-status-page {
    --site-canvas: var(--bg, #0e0e10);
    --site-line: var(--border, rgba(255, 255, 255, .09));
    --site-ink: var(--text, #f5f5f6);
    --site-muted: var(--text-muted, #8d8c92);
    --site-accent: var(--white, #ffffff);
    display: flex;
    min-height: 100svh;
    flex-direction: column;
    background-color: var(--site-canvas);
    background-image: none;
    color: var(--site-ink);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .bootstrap-error-shell {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }

  .bootstrap-error-card {
    width: min(720px, 100%);
    padding: clamp(1.35rem, 4vw, 2.25rem);
    text-align: left;
    border-color: var(--site-line);
    border-radius: 18px;
    background: var(--surface-2, #1e1e22);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .18);
  }

  .bootstrap-error-kicker {
    margin: 0 0 0.65rem 0;
    color: var(--site-accent);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .bootstrap-error-card h1 {
    margin: 0 0 0.85rem 0;
    font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
    font-size: clamp(2rem, 4vw, 3rem);
    color: #fff;
  }

  .bootstrap-error-message,
  .bootstrap-error-help {
    margin: 0.6rem 0 0 0;
    color: var(--site-muted);
    line-height: 1.6;
  }
</style>
