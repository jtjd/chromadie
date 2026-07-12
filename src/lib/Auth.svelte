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
      description: 'Keep your rolls, leaderboard history, and cosmetics synced across devices.',
      highlights: ['Keeps your progress', 'Tracks leaderboard runs', 'Unlocks cosmetics'],
      primary: 'Sign in',
      helper: 'Use the email address linked to your account.'
    },
    signup: {
      kicker: 'New account',
      title: 'Create your account',
      description: 'Save your progress, recover your account later, and unlock the full ChromaDie experience.',
      highlights: ['Email confirmation', 'Password recovery', 'Cross-device progress'],
      primary: 'Create account',
      helper: 'Usernames are public and can use letters, numbers, and underscores.'
    },
    forgot: {
      kicker: 'Account recovery',
      title: 'Reset your password',
      description: 'We’ll send a reset link if the account exists.',
      highlights: ['Secure reset link', 'No data lost', 'Returns you to sign in'],
      primary: 'Send reset link',
      helper: 'Use the email address tied to the account you want to recover.'
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
    const message = typeof authError === 'string'
      ? authError
      : authError?.message || authError?.error_description || authError?.error || '';
    const lowerMessage = message.toLowerCase();

    if (!message || message === '{}') return fallback;
    if (lowerMessage.includes('username') && (lowerMessage.includes('available') || lowerMessage.includes('moderation'))) {
      return 'That username is not available. Please choose another one.';
    }
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
      error = 'Authentication is not configured.';
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
      error = 'Authentication is not configured.';
      loading = false;
      return;
    }

    const captchaToken = getCaptchaToken();
    if (!captchaToken) {
      error = 'Please complete the security check.';
      loading = false;
      return;
    }

    if (tab === 'signup') {
      if (!username || !email || !password) {
        error = 'Please fill out the username, email, and password.';
        loading = false;
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        error = 'Username must be 3-20 characters and use only letters, numbers, or underscores.';
        loading = false;
        return;
      }
      if (RESERVED_USERNAMES.has(normalizeUsername(username))) {
        error = 'That username is reserved. Please choose another one.';
        loading = false;
        return;
      }

      const { data: usernameAllowed, error: moderationError } = await supabase.rpc('is_username_allowed', {
        p_username: username
      });
      if (!moderationError && usernameAllowed === false) {
        error = 'That username is not available. Please choose another one.';
        loading = false;
        resetCaptcha();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
          data: { username, display_name: username },
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
          notice = 'Check your email for a confirmation link, then come back to sign in.';
        }
      }
    } else if (tab === 'forgot') {
      if (!email) {
        error = 'Please enter the email address on your account.';
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
        notice = 'If that account exists, we sent a reset link to your inbox.';
      }
    } else {
      if (!email.includes('@')) {
        error = 'Use the email address linked to your account.';
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

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="auth-container glass-panel">
  <div class="auth-header">
    <div class="auth-heading-group">
      <p class="auth-brand">ChromaDie</p>
      <p class="auth-kicker">{mode.kicker}</p>
      <p id="auth-dialog-desc" class="auth-description">
        {mode.description}
      </p>
    </div>
    <button type="button" class="close-auth-btn" aria-label="Close authentication dialog" on:click={onClose}>
      ✕
    </button>
  </div>

  <div class="tabs">
    <button type="button" class={tab === 'login' ? 'active' : ''} on:click={() => setMode('login')}>Sign in</button>
    <button type="button" class={tab === 'signup' ? 'active' : ''} on:click={() => setMode('signup')}>Create account</button>
  </div>

  <form on:submit|preventDefault={handleAuth}>
    {#if tab === 'signup'}
      <label class="field-group" for="username-input">
        <span class="field-label">Username</span>
        <input id="username-input" type="text" class="input-field" bind:value={username} placeholder="Your username" autocomplete="nickname" spellcheck="false" minlength="3" maxlength="20" required />
        <span class="field-hint">{mode.helper}</span>
      </label>
    {/if}
    <label class="field-group" for="email-input">
      <span class="field-label">Email</span>
      <input id="email-input" type="email" class="input-field" bind:value={email} placeholder="you@example.com" autocomplete="username" required />
      <span class="field-hint">{tab === 'forgot' ? mode.helper : 'We use this for sign in, confirmations, and password resets.'}</span>
    </label>

    {#if tab !== 'forgot'}
      <label class="field-group" for="password-input">
        <span class="field-label">Password</span>
        <input id="password-input" type="password" class="input-field" bind:value={password} placeholder="Your password" autocomplete={tab === 'login' ? 'current-password' : 'new-password'} minlength="8" required />
        <span class="field-hint">{tab === 'signup' ? 'Use at least 8 characters.' : 'Enter the password tied to your account.'}</span>
      </label>
    {/if}

    {#if tab === 'signup'}
      <p class="privacy-link-note">
        Read the <a href="/privacy">Privacy Policy</a> before creating an account.
      </p>
    {/if}

    <div class="security-check">
      <span class="field-label">Security check</span>
      <div id="turnstile-container"></div>
    </div>

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
        Back to sign in
      </button>
    {/if}

    <button type="submit" class="btn btn-primary auth-submit" disabled={loading}>
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
    max-width: 480px;
    padding: clamp(1.6rem, 4vw, 2.75rem);
    position: relative;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-gutter: stable;
    border-color: rgba(255, 255, 255, 0.1);
    background:
      radial-gradient(circle at top left, rgba(139, 124, 246, 0.18), transparent 36%),
      radial-gradient(circle at bottom right, rgba(46, 211, 201, 0.08), transparent 34%),
      rgba(12, 13, 18, 0.88);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  }
  .auth-header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.35rem;
    padding: 0.9rem 0.95rem 0.85rem;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.016)),
      rgba(255,255,255,0.012);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
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
  }
  .auth-brand {
    margin: 0 0 0.45rem 0;
    color: rgba(255,255,255,0.68);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .auth-description {
    margin: 0.15rem 0 0 0;
    color: var(--text-muted);
    line-height: 1.55;
    font-size: 0.96rem;
    max-width: 34ch;
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.95rem;
  }
  .field-label {
    color: rgba(255,255,255,0.86);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.02em;
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
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
  }
  .close-auth-btn:hover {
    background: rgba(255,255,255,0.1);
    border-color: var(--card-border-hover);
    transform: translateY(-1px);
  }
  .tabs {
    display: flex;
    margin-bottom: 1rem;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018)),
      rgba(255,255,255,0.012);
    border-radius: 18px;
    padding: 0.2rem;
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .tabs button {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 0.7rem 0.9rem;
    cursor: pointer;
    border-radius: 14px;
    font-weight: 600;
    font-size: 0.92rem;
    transition: all 0.2s;
    min-height: 42px;
  }
  .tabs button.active {
    color: #fff;
    background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 8px 20px rgba(0,0,0,0.14);
  }
  .field-hint {
    color: var(--text-muted);
    font-size: 0.79rem;
    line-height: 1.45;
  }
  .input-field {
    width: 100%;
    min-height: 48px;
    padding: 0.9rem 1rem;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    color: var(--text-main);
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
    margin-bottom: 0;
    appearance: none;
    -webkit-appearance: none;
  }
  .input-field::placeholder {
    color: rgba(118, 123, 140, 0.8);
  }
  .input-field:focus {
    border-color: rgba(139, 124, 246, 0.6);
    box-shadow: 0 0 0 4px rgba(139, 124, 246, 0.14);
    background: rgba(255,255,255,0.06);
  }
  .input-field:-webkit-autofill,
  .input-field:-webkit-autofill:hover,
  .input-field:-webkit-autofill:focus,
  .input-field:-webkit-autofill:active {
    -webkit-text-fill-color: var(--text-main);
    caret-color: var(--text-main);
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.04) inset;
    border: 1px solid rgba(255,255,255,0.08);
    background-color: rgba(255,255,255,0.04);
    transition: background-color 9999s ease-out, color 9999s ease-out;
  }
  .security-check {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin: 0.35rem 0 1rem;
  }
  .privacy-link-note {
    margin: 0.15rem 0 0.75rem;
    color: var(--text-muted);
    font-size: 0.84rem;
    line-height: 1.5;
  }
  .privacy-link-note a {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  #turnstile-container {
    min-height: 92px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    overflow: hidden;
  }
  .auth-submit {
    width: 100%;
    margin-top: 0.5rem;
    min-height: 50px;
    border: none;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(233,233,240,0.92));
    color: #0d0e12;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    box-shadow: 0 12px 30px rgba(0,0,0,0.28);
    transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  }
  .auth-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 40px rgba(139, 124, 246, 0.22);
    filter: brightness(1.02);
  }
  .auth-submit:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .error {
    color: #fecaca;
    font-size: 0.9rem;
    margin: 0.75rem 0 0.25rem 0;
    text-align: left;
    line-height: 1.5;
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(248, 113, 113, 0.25);
    background: rgba(248, 113, 113, 0.08);
  }
  .notice {
    color: #d1fae5;
    font-size: 0.92rem;
    margin: 0.75rem 0 0.25rem 0;
    text-align: left;
    line-height: 1.5;
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(16, 185, 129, 0.25);
    background: rgba(16, 185, 129, 0.08);
  }
  .link-btn {
    width: 100%;
    margin: 0.25rem 0 0.7rem;
    padding: 0;
    border: none;
    background: transparent;
    color: #d7d2ff;
    cursor: pointer;
    font-size: 0.92rem;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    text-align: center;
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
      padding: 1.1rem;
      max-height: 100%;
    }
    .auth-header {
      position: static;
      gap: 0.75rem;
      margin-bottom: 1rem;
      top: auto;
      padding: 0.8rem 0.85rem 0.75rem;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012)),
        rgba(255,255,255,0.01);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    .auth-brand {
      font-size: 0.64rem;
      letter-spacing: 0.16em;
      margin-bottom: 0.3rem;
    }
    .auth-kicker {
      font-size: 0.68rem;
      letter-spacing: 0.14em;
      margin-bottom: 0.25rem;
    }
    .auth-description {
      font-size: 0.92rem;
      max-width: none;
    }
    .tabs {
      margin-bottom: 1.25rem;
      border-radius: 16px;
    }
    .tabs button {
      min-height: 42px;
      border-radius: 12px;
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
    .auth-submit {
      min-height: 48px;
    }
  }
</style>
