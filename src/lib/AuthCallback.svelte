<script>
  import { onMount } from 'svelte';
  import { session, authEvent } from './stores';
  import { getAppOrigin, getSafeNextUrl } from './authUrls';

  let status = 'loading';
  let message = 'Completing sign-in...';
  let timeoutId;
  let redirected = false;

  function getNextUrl() {
    if (typeof window === 'undefined') return getAppOrigin();

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    return getSafeNextUrl(next);
  }

  function clearUrl() {
    if (typeof window === 'undefined') return;

    const nextUrl = new URL(getNextUrl());
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description') || params.get('error') || '';
      if (errorDescription) {
        status = 'error';
        message = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
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
        window.location.replace(getNextUrl());
      }
    }, 900);
  }
</script>

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

<style>
  .bootstrap-error-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }

  .bootstrap-error-card {
    width: min(720px, 100%);
    padding: 2rem;
    text-align: left;
    border-color: rgba(139, 124, 246, 0.35);
    background:
      radial-gradient(circle at top right, rgba(139, 124, 246, 0.16), transparent 45%),
      rgba(10, 10, 14, 0.92);
  }

  .bootstrap-error-kicker {
    margin: 0 0 0.65rem 0;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .bootstrap-error-card h1 {
    margin: 0 0 0.85rem 0;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3rem);
    color: #fff;
  }

  .bootstrap-error-message,
  .bootstrap-error-help {
    margin: 0.6rem 0 0 0;
    color: var(--text-muted);
    line-height: 1.6;
  }
</style>
