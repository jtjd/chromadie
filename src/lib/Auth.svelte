<script>
  import { supabase } from './supabase';
  import { getAuthCallbackUrl, getResetPasswordUrl } from './authUrls';
  import { onMount } from 'svelte';

  export let onClose = () => {};

  let tab = 'login'; // 'login', 'signup', or 'forgot'
  let email = '';
  let password = '';
  let username = '';
  let error = '';
  let notice = '';
  let loading = false;

  let turnstileWidgetId = null;
  const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;
  const RESERVED_USERNAMES = new Set(['guest', 'anon', 'anonymous']);

  function normalizeUsername(value) {
    return value.trim().toLowerCase();
  }

  function setMode(nextTab) {
    tab = nextTab;
    error = '';
    notice = '';
  }

  function getFriendlyAuthError(authError, fallback) {
    const message = authError?.message || '';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('captcha')) return 'Please complete the CAPTCHA.';
    if (lowerMessage.includes('already registered')) return 'That email is already registered.';
    if (lowerMessage.includes('email not confirmed')) return 'Check your email to confirm your account before signing in.';
    if (lowerMessage.includes('invalid login credentials')) return 'Invalid email or password.';
    if (lowerMessage.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    if (lowerMessage.includes('password')) return message || fallback;
    if (message) return message;
    return fallback;
  }

  onMount(() => {
    if (!siteKey) {
      error = "Authentication is not configured.";
      return;
    }

    const checkTurnstile = setInterval(() => {
      if (window.turnstile) {
        clearInterval(checkTurnstile);
        renderTurnstile();
      }
    }, 200);
    return () => clearInterval(checkTurnstile);
  });

  function renderTurnstile() {
    if (window.turnstile && document.getElementById('turnstile-container') && siteKey) {
      turnstileWidgetId = window.turnstile.render('#turnstile-container', {
        sitekey: siteKey
      });
    }
  }

  function getCaptchaToken() {
    if (turnstileWidgetId !== null && window.turnstile) {
      return window.turnstile.getResponse(turnstileWidgetId);
    }
    return null;
  }

  function resetCaptcha() {
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }

  async function handleAuth() {
    loading = true;
    error = '';
    notice = '';

    if (!siteKey) {
      error = "Authentication is not configured.";
      loading = false;
      return;
    }

    const captchaToken = getCaptchaToken();
    if (!captchaToken) {
      error = "Please complete the CAPTCHA.";
      loading = false;
      return;
    }

    if (tab === 'signup') {
      if (!username || !email || !password) {
        error = "Please fill out all fields.";
        loading = false;
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        error = "Username must be 3-20 characters (letters, numbers, underscores only).";
        loading = false;
        return;
      }
      if (RESERVED_USERNAMES.has(normalizeUsername(username))) {
        error = "That username is reserved. Please choose a different one.";
        loading = false;
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
          data: { username },
          captchaToken
        }
      });

      if (signUpError) {
        error = getFriendlyAuthError(signUpError, 'Could not create your account.');
        resetCaptcha();
      } else {
        if (data.session) {
          // onAuthStateChange will handle the modal close
        } else {
          notice = "Check your email to confirm your account before signing in.";
        }
      }
    } else if (tab === 'forgot') {
      if (!email) {
        error = "Please enter your email address.";
        loading = false;
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getResetPasswordUrl(),
        captchaToken
      });

      if (resetError) {
        error = getFriendlyAuthError(resetError, 'Could not send the reset email.');
        resetCaptcha();
      } else {
        notice = "If an account exists for that email, a reset link has been sent.";
      }
    } else {
      // Login Flow
      if (!email.includes('@')) {
        error = "Please log in using your email address.";
        loading = false;
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
        options: { captchaToken }
      });

      if (signInError) {
        error = getFriendlyAuthError(signInError, 'Could not sign you in.');
        resetCaptcha();
      }
      // If successful, onAuthStateChange fires, $session updates, App.svelte closes modal.
    }
    loading = false;
  }
</script>

<div class="auth-container glass-panel">
  <div class="auth-header">
    <div>
      <h1 id="auth-dialog-title">ChromaDie</h1>
      <p id="auth-dialog-desc" class="auth-description">
        Sign in to save progress, keep your leaderboard runs, and unlock cosmetics. Guests can still play immediately.
      </p>
    </div>
    <button type="button" class="close-auth-btn" aria-label="Close authentication dialog" on:click={onClose}>
      ✕
    </button>
  </div>

  <div class="tabs">
    <button type="button" class={tab === 'login' ? 'active' : ''} on:click={() => setMode('login')}>Login</button>
    <button type="button" class={tab === 'signup' ? 'active' : ''} on:click={() => setMode('signup')}>Sign Up</button>
  </div>

  <form on:submit|preventDefault={handleAuth}>
    {#if tab === 'signup'}
      <input type="text" class="input-field" bind:value={username} placeholder="Username" required />
    {/if}
    <input type="email" class="input-field" bind:value={email} placeholder="Email" required />

    {#if tab !== 'forgot'}
      <input type="password" class="input-field" bind:value={password} placeholder="Password" required />
    {/if}

    <div id="turnstile-container"></div>

    {#if notice}
      <p class="notice" role="status" aria-live="polite">{notice}</p>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if tab === 'login'}
      <button type="button" class="link-btn" on:click={() => setMode('forgot')}>
        Forgot password?
      </button>
    {:else if tab === 'forgot'}
      <button type="button" class="link-btn" on:click={() => setMode('login')}>
        Back to login
      </button>
    {/if}

    <button type="submit" class="btn btn-primary" disabled={loading}>
      {loading ? 'Loading...' : (tab === 'login' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Send Reset Link')}
    </button>
  </form>
</div>

<style>
  .auth-container {
    width: 100%;
    max-width: 420px;
    padding: clamp(1.5rem, 4vw, 2.5rem);
  }
  .auth-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  h1 {
    margin: 0;
    font-size: 2.5rem;
    background: var(--spectrum);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
  .auth-description {
    margin: 0.45rem 0 0 0;
    color: var(--text-muted);
    line-height: 1.5;
    font-size: 0.95rem;
  }
  .close-auth-btn {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid var(--card-border);
    background: rgba(255,255,255,0.04);
    color: #fff;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
  .close-auth-btn:hover {
    background: rgba(255,255,255,0.12);
  }
  .tabs {
    display: flex;
    margin-bottom: 1.5rem;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    padding: 4px;
  }
  .tabs button {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 6px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 500;
    transition: all 0.2s;
  }
  .tabs button.active {
    color: #fff;
    background: rgba(255,255,255,0.1);
  }
  .input-field {
    margin-bottom: 1rem;
  }
  button[type="submit"] {
    width: 100%;
    padding: 0.75rem;
    font-size: 1.1rem;
    margin-top: 1rem;
    min-height: 46px;
  }
  .error {
    color: #ff4444;
    font-size: 0.9rem;
    margin: 0 0 1rem 0;
    text-align: center;
  }
  .notice {
    color: #6ee787;
    font-size: 0.92rem;
    margin: 0 0 1rem 0;
    text-align: center;
    line-height: 1.5;
  }
  .link-btn {
    width: 100%;
    margin: 0.25rem 0 0.75rem;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--accent-purple);
    cursor: pointer;
    font-size: 0.92rem;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  #turnstile-container {
    margin-bottom: 1rem;
    min-height: 65px;
  }

  @media (max-width: 600px) {
    .auth-container {
      padding: 1.25rem;
    }
    .auth-header {
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 2rem;
    }
    .auth-description {
      font-size: 0.92rem;
    }
    .tabs {
      margin-bottom: 1.25rem;
    }
    .tabs button {
      min-height: 42px;
    }
    .input-field {
      margin-bottom: 0.85rem;
    }
    .link-btn {
      min-height: 40px;
    }
  }
</style>
