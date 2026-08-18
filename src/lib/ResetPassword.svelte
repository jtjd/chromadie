<script>
  import { onMount } from 'svelte';
  import SiteFooter from './SiteFooter.svelte';
  import SiteModeHeader from './SiteModeHeader.svelte';
  import { ACCOUNT_STATES } from './authState.js';
  import { supabase } from './supabase';
  import { session, authEvent } from './stores';
  import { getAppOrigin, getSafeNextUrl } from './authUrls';

  let newPassword = '';
  let confirmPassword = '';
  let error = '';
  let notice = '';
  let loading = false;
  let ready = false;
  let success = false;
  let timeoutId;
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

  function parseNextUrl() {
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
    nextUrl = parseNextUrl();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description') || params.get('error') || '';
      if (errorDescription) {
        error = errorDescription.slice(0, 300);
      }
    }

    timeoutId = setTimeout(() => {
      if (!ready && !success) {
        error = error || 'This reset link is invalid or expired. Go back to the app and request a new one.';
      }
    }, 12000);

    return () => clearTimeout(timeoutId);
  });

  $: if ($authEvent === 'PASSWORD_RECOVERY' || $session) {
    ready = true;
  }

  async function handleReset() {
    loading = true;
    error = '';
    notice = '';

    if (!newPassword || !confirmPassword) {
      error = 'Please fill out both password fields.';
      loading = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      error = 'Passwords do not match.';
      loading = false;
      return;
    }

    if (newPassword.length < 8) {
      error = 'Password must be at least 8 characters long.';
      loading = false;
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      error = updateError.message || 'Could not update your password.';
      loading = false;
      return;
    }

    success = true;
    notice = 'Password updated. Redirecting to sign in...';
    clearUrl();
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.replace(nextUrl);
      }
    }, 1000);
    loading = false;
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
      <p class="bootstrap-error-kicker">Password reset</p>

      {#if success}
        <h1>Password updated</h1>
        <p class="bootstrap-error-message">{notice}</p>
      {:else if error && !ready}
        <h1>Reset link unavailable</h1>
        <p class="bootstrap-error-message">{error}</p>
        <p class="bootstrap-error-help">Return to the app and request a new reset link from the login form.</p>
      {:else if ready}
        <h1>Create a new password</h1>
        <p class="bootstrap-error-message">Enter the new password you want to use for ChromaDie.</p>
        <form class="reset-form" on:submit|preventDefault={handleReset}>
          <label for="reset-new-password">New password</label>
          <input id="reset-new-password" class="input-field" type="password" bind:value={newPassword} placeholder="New password" autocomplete="new-password" minlength="8" required />
          <label for="reset-confirm-password">Confirm new password</label>
          <input id="reset-confirm-password" class="input-field" type="password" bind:value={confirmPassword} placeholder="Confirm new password" autocomplete="new-password" minlength="8" required />
          {#if error}
            <p class="bootstrap-error-details">{error}</p>
          {/if}
          {#if notice}
            <p class="bootstrap-success">{notice}</p>
          {/if}
          <button type="submit" class="roll-btn" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      {:else}
        <h1>Preparing reset session</h1>
        <p class="bootstrap-error-message">Please wait while we verify your reset link.</p>
      {/if}
    </section>
  </main>

  <SiteFooter isAuthenticated={chromeAuthenticated} />
</div>

<style>
  .site-status-page {
    --site-canvas: #0b0910;
    --site-line: rgba(255, 255, 255, .1);
    --site-ink: #f5f5f7;
    --site-muted: #c4bdca;
    --site-accent: var(--site-brand-accent, #D8A6FF);
    display: flex;
    min-height: 100svh;
    flex-direction: column;
    background-color: var(--site-canvas);
    background-image: var(--site-atmosphere-veil), var(--site-atmosphere-image);
    background-position: center top;
    background-repeat: no-repeat;
    background-size: cover;
    background-attachment: fixed;
    color: var(--site-ink);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .reset-form {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-top: 1.25rem;
  }

  .bootstrap-success {
    margin: 0;
    color: var(--color-accent-bright);
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
    background: rgba(12, 12, 15, .78);
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
  .bootstrap-error-details,
  .bootstrap-error-help {
    margin: 0.6rem 0 0 0;
    color: var(--site-muted);
    line-height: 1.6;
  }

  .bootstrap-error-details {
    font-family: var(--font-mono-stack);
    color: #f9a8d4;
  }
</style>
