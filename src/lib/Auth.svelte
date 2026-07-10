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
  let captchaToken = '';
  const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;
  const RESERVED_USERNAMES = new Set(['guest', 'anon', 'anonymous']);
  const MODE_COPY = {
    login: {
      kicker: 'Welcome back',
      title: 'Sign in',
      description: 'Pick up where you left off. Your rolls, leaderboard history, and cosmetics stay tied to your account.',
      highlights: ['Daily roll history', 'Leaderboard progress', 'Unlocked cosmetics'],
      primary: 'Sign In',
      helper: 'Use the email address tied to your account.'
    },
    signup: {
      kicker: 'New account',
      title: 'Create your account',
      description: 'Save your progress across devices, receive confirmation emails, and unlock the full account experience.',
      highlights: ['Email confirmation', 'Password recovery', 'Cross-device progress'],
      primary: 'Create Account',
      helper: 'Usernames are public and can contain letters, numbers, and underscores.'
    },
    forgot: {
      kicker: 'Account recovery',
      title: 'Reset your password',
      description: 'We will send a reset link to your inbox if the account exists.',
      highlights: ['Safe reset link', 'Keeps your account', 'Returns you to sign in'],
      primary: 'Send Reset Link',
      helper: 'Use the email address on the account you want to recover.'
    }
  };

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

    if (lowerMessage.includes('captcha')) return 'Please complete the security check.';
    if (lowerMessage.includes('already registered')) return 'That email is already registered. Try signing in instead.';
    if (lowerMessage.includes('email not confirmed')) return 'Check your inbox to confirm your account before signing in.';
    if (lowerMessage.includes('invalid login credentials')) return 'Invalid email or password. Double-check both and try again.';
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
      captchaToken = '';
      turnstileWidgetId = window.turnstile.render('#turnstile-container', {
        sitekey: siteKey,
        callback(token) {
          captchaToken = token || '';
        },
        'expired-callback'() {
          captchaToken = '';
        },
        'error-callback'() {
          captchaToken = '';
        }
      });
    }
  }

  function getCaptchaToken() {
    return captchaToken || null;
  }

  function resetCaptcha() {
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
    }
    captchaToken = '';
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
        error = "Please fill out the username, email, and password.";
        loading = false;
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        error = "Username must be 3-20 characters and use only letters, numbers, or underscores.";
        loading = false;
        return;
      }
      if (RESERVED_USERNAMES.has(normalizeUsername(username))) {
        error = "That username is reserved. Please choose another one.";
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
          notice = "Check your email for a confirmation link, then come back to sign in.";
        }
      }
    } else if (tab === 'forgot') {
      if (!email) {
        error = "Please enter the email address on your account.";
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
        notice = "If that account exists, we sent a reset link to your inbox.";
      }
    } else {
      // Login Flow
      if (!email.includes('@')) {
        error = "Use the email address tied to your account.";
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

  $: mode = MODE_COPY[tab] || MODE_COPY.login;
</script>

<div class="auth-container glass-panel">
  <div class="auth-header">
    <div class="auth-heading-group">
      <p class="auth-brand">ChromaDie</p>
      <p class="auth-kicker">{mode.kicker}</p>
      <h1 id="auth-dialog-title">{mode.title}</h1>
      <p id="auth-dialog-desc" class="auth-description">
        {mode.description}
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

  <div class="auth-highlights" aria-label="What this account unlocks">
    {#each mode.highlights as item}
      <span class="auth-highlight">{item}</span>
    {/each}
  </div>

  <form on:submit|preventDefault={handleAuth}>
    {#if tab === 'signup'}
      <label class="field-group" for="username-input">
        <span class="field-label">Username</span>
        <input id="username-input" type="text" class="input-field" bind:value={username} placeholder="Your username" autocomplete="username" spellcheck="false" minlength="3" maxlength="20" required />
        <span class="field-hint">{mode.helper}</span>
      </label>
    {/if}
    <label class="field-group" for="email-input">
      <span class="field-label">Email</span>
      <input id="email-input" type="email" class="input-field" bind:value={email} placeholder="you@example.com" autocomplete="email" required />
      <span class="field-hint">{tab === 'forgot' ? mode.helper : 'We use this for sign in, confirmations, and password resets.'}</span>
    </label>

    {#if tab !== 'forgot'}
      <label class="field-group" for="password-input">
        <span class="field-label">Password</span>
        <input id="password-input" type="password" class="input-field" bind:value={password} placeholder="Your password" autocomplete={tab === 'login' ? 'current-password' : 'new-password'} minlength="8" required />
        <span class="field-hint">{tab === 'signup' ? 'Use at least 8 characters.' : 'Enter the password tied to your account.'}</span>
      </label>
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
      {loading ? 'Working...' : mode.primary}
    </button>

    <p class="auth-footnote">
      {#if tab === 'signup'}
        A confirmation email will be sent before your account is fully active.
      {:else if tab === 'forgot'}
        Reset links expire, so use the newest email you receive.
      {:else}
        Guests can still play immediately if you want to come back later.
      {/if}
    </p>
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
  .auth-heading-group {
    min-width: 0;
  }
  .auth-kicker {
    margin: 0 0 0.35rem 0;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
  }
  .auth-brand {
    margin: 0 0 0.2rem 0;
    color: rgba(255,255,255,0.78);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.68rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
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
  .auth-highlights {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 1rem;
  }
  .auth-highlight {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(139, 124, 246, 0.22);
    background: rgba(139, 124, 246, 0.08);
    color: #e8e4ff;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1rem;
  }
  .field-label {
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: 'Space Grotesk', sans-serif;
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
  .field-hint {
    color: var(--text-muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }
  .input-field {
    margin-bottom: 0;
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
  .auth-footnote {
    margin: 0.9rem 0 0 0;
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.5;
    text-align: center;
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
    .auth-highlights {
      gap: 6px;
      margin-bottom: 0.9rem;
    }
    .auth-highlight {
      font-size: 0.72rem;
      min-height: 30px;
      padding: 0 10px;
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
      min-height: 46px;
    }
    .link-btn {
      min-height: 40px;
    }
    .field-label {
      font-size: 0.75rem;
    }
    .field-hint,
    .auth-footnote {
      font-size: 0.76rem;
    }
  }
</style>
