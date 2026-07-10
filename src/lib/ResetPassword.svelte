<script>
  import { onMount } from 'svelte';
  import { supabase } from './supabase';
  import { session, authEvent } from './stores';
  import { getAppOrigin } from './authUrls';

  let newPassword = '';
  let confirmPassword = '';
  let error = '';
  let notice = '';
  let loading = false;
  let ready = false;
  let success = false;
  let timeoutId;
  let nextUrl = getAppOrigin();

  function parseNextUrl() {
    if (typeof window === 'undefined') return getAppOrigin();

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && next.startsWith('/')) {
      return new URL(next, getAppOrigin()).toString();
    }
    return getAppOrigin();
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
        error = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
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
        <input class="input-field" type="password" bind:value={newPassword} placeholder="New password" minlength="8" required />
        <input class="input-field" type="password" bind:value={confirmPassword} placeholder="Confirm new password" minlength="8" required />
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

<style>
  .reset-form {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-top: 1.25rem;
  }

  .bootstrap-success {
    margin: 0;
    color: #6ee787;
  }

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
  .bootstrap-error-details,
  .bootstrap-error-help {
    margin: 0.6rem 0 0 0;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .bootstrap-error-details {
    font-family: 'JetBrains Mono', monospace;
    color: #f9a8d4;
  }
</style>
