<script>
  import { onMount, tick } from 'svelte';
  import { supabase } from './supabase';
  import { getAuthCallbackUrl, getResetPasswordUrl } from './authUrls';
  import { isProtectedUsername, isUsernameShapeValid, normalizeUsernameKey } from './usernamePolicy.js';

  export let onClose = () => {};
  export let standalone = false;
  export let initialTab = 'login';
  export let initialUsername = '';
  export let next = '';

  let tab = initialTab === 'signup' ? 'signup' : 'login'; // 'login', 'signup', or 'forgot'
  let signupStep = 1;
  let email = '';
  let password = '';
  let username = initialUsername || '';
  let termsAccepted = false;
  let updatesOptIn = false;
  let showPassword = false;
  let error = '';
  let notice = '';
  let loading = false;

  let usernameCheckState = 'idle'; // idle, checking, available, unavailable, error
  let usernameCheckMessage = '';
  let usernameCheckKey = '';
  let usernameCheckRequestId = 0;
  let usernameCheckTimer = null;

  let turnstileWidgetId = null;
  let captchaToken = '';
  let turnstileState = 'loading';
  let turnstilePoll = null;
  const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;

  function isLocalDevelopment() {
    const localIntegrationTest = import.meta.env?.VITE_LOCAL_INTEGRATION_TEST === 'true';
    if ((!import.meta.env.DEV && !localIntegrationTest) || typeof window === 'undefined') return false;
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  function setMode(nextTab) {
    const previousTab = tab;
    tab = nextTab === 'signup' ? 'signup' : nextTab === 'forgot' ? 'forgot' : 'login';
    if (tab === 'signup') signupStep = 1;
    showPassword = false;
    error = '';
    notice = '';
    if (previousTab !== tab) {
      removeTurnstile();
      if (!isLocalDevelopment() && turnstileState === 'ready') {
        void tick().then(() => {
          if (tab !== 'signup' || signupStep === 3) renderTurnstile();
        });
      }
    }
    if (tab === 'signup') scheduleUsernameCheck(0);
  }

  function getAuthPath(nextTab) {
    const params = [];
    if (next) params.push(`next=${encodeURIComponent(String(next).slice(0, 512))}`);
    if (nextTab === 'signup' && isUsernameShapeValid(username) && !isProtectedUsername(username)) {
      params.push(`username=${encodeURIComponent(username.trim().slice(0, 20))}`);
    }
    const query = params.join('&');
    return `/${nextTab}${query ? `?${query}` : ''}`;
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

  function clearMessages() {
    error = '';
    notice = '';
  }

  function scheduleUsernameCheck(delay = 360) {
    if (usernameCheckTimer !== null) clearTimeout(usernameCheckTimer);
    const requested = username.trim();
    const requestKey = normalizeUsernameKey(requested);
    usernameCheckRequestId += 1;

    if (!requested) {
      usernameCheckState = 'idle';
      usernameCheckMessage = '';
      usernameCheckKey = '';
      return;
    }

    if (!isUsernameShapeValid(requested)) {
      usernameCheckState = 'unavailable';
      usernameCheckMessage = 'Use 1–20 letters, numbers, or underscores.';
      usernameCheckKey = requestKey;
      return;
    }

    if (isProtectedUsername(requested)) {
      usernameCheckState = 'unavailable';
      usernameCheckMessage = 'That username is reserved.';
      usernameCheckKey = requestKey;
      return;
    }

    usernameCheckState = 'checking';
    usernameCheckMessage = 'Checking availability…';
    usernameCheckKey = requestKey;
    usernameCheckTimer = setTimeout(() => {
      usernameCheckTimer = null;
      void checkUsernameAvailability(requested);
    }, delay);
  }

  async function checkUsernameAvailability(value = username) {
    const requested = String(value || '').trim();
    const requestKey = normalizeUsernameKey(requested);
    const requestId = ++usernameCheckRequestId;

    if (!isUsernameShapeValid(requested)) {
      if (requestId === usernameCheckRequestId) {
        usernameCheckState = requested ? 'unavailable' : 'idle';
        usernameCheckMessage = requested ? 'Use 1–20 letters, numbers, or underscores.' : '';
        usernameCheckKey = requestKey;
      }
      return false;
    }

    if (isProtectedUsername(requested)) {
      if (requestId === usernameCheckRequestId) {
        usernameCheckState = 'unavailable';
        usernameCheckMessage = 'That username is reserved.';
        usernameCheckKey = requestKey;
      }
      return false;
    }

    usernameCheckState = 'checking';
    usernameCheckMessage = 'Checking availability…';
    usernameCheckKey = requestKey;

    try {
      const [allowedResult, availableResult] = await Promise.all([
        supabase.rpc('is_username_allowed', { p_username: requested }),
        supabase.rpc('is_username_available', { p_username: requested })
      ]);

      if (requestId !== usernameCheckRequestId) return false;

      const allowed = allowedResult?.data;
      const available = availableResult?.data;
      if (allowedResult?.error || availableResult?.error) {
        usernameCheckState = 'error';
        usernameCheckMessage = 'We could not check that name. Try again.';
        return false;
      }

      const isAvailable = allowed === true && available === true;
      usernameCheckState = isAvailable ? 'available' : 'unavailable';
      usernameCheckMessage = isAvailable ? 'Username available' : 'That username is not available.';
      return isAvailable;
    } catch {
      if (requestId !== usernameCheckRequestId) return false;
      usernameCheckState = 'error';
      usernameCheckMessage = 'We could not check that name. Try again.';
      return false;
    }
  }

  async function focusField(selector) {
    await tick();
    const field = document.querySelector(selector);
    if (field instanceof HTMLElement) field.focus();
  }

  async function handleUsernameContinue() {
    if (loading) return;
    clearMessages();
    const requested = username.trim();
    if (!isUsernameShapeValid(requested)) {
      error = 'Username must be 1-20 characters and use only letters, numbers, or underscores.';
      return;
    }

    loading = true;
    username = requested;
    const available = usernameCheckState === 'available'
      && usernameCheckKey === normalizeUsernameKey(requested)
      ? true
      : await checkUsernameAvailability(requested);
    loading = false;

    if (!available) {
      error = usernameCheckState === 'error'
        ? 'We could not check that name. Try again.'
        : 'That username is not available. Please choose another one.';
      return;
    }

    signupStep = 2;
    await focusField('#email-input');
  }

  async function handleEmailContinue() {
    if (loading) return;
    clearMessages();
    const requestedEmail = email.trim();
    if (!requestedEmail || !requestedEmail.includes('@')) {
      error = 'Enter a valid email address to continue.';
      return;
    }

    email = requestedEmail;
    signupStep = 3;
    await tick();
    if (!isLocalDevelopment() && turnstileState === 'ready') renderTurnstile();
    await focusField('#password-input');
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

  function removeTurnstile() {
    if (turnstileWidgetId !== null && typeof window !== 'undefined' && window.turnstile) {
      window.turnstile.remove(turnstileWidgetId);
    }
    turnstileWidgetId = null;
    captchaToken = '';
  }

  function renderTurnstile() {
    if (turnstileWidgetId !== null) return;
    if (window.turnstile && document.getElementById('turnstile-container') && siteKey) {
      captchaToken = '';
      turnstileWidgetId = window.turnstile.render('#turnstile-container', {
        sitekey: siteKey,
        callback(token) {
          captchaToken = token || '';
          turnstileState = 'ready';
        },
        'expired-callback'() {
          captchaToken = '';
        },
        'error-callback'() {
          captchaToken = '';
          turnstileState = 'error';
          error = 'The security check failed to load. Please retry.';
        }
      });
      turnstileState = 'ready';
    }
  }

  function retryTurnstile() {
    error = '';
    turnstileState = 'loading';
    if (!window.turnstile) {
      window.location.reload();
      return;
    }
    if (turnstileWidgetId !== null) {
      window.turnstile.remove(turnstileWidgetId);
      turnstileWidgetId = null;
    }
    renderTurnstile();
  }

  async function handleProvider(provider) {
    if (loading) return;
    loading = true;
    clearMessages();

    if (typeof supabase?.auth?.signInWithOAuth !== 'function') {
      error = 'Social sign-in is not configured yet.';
      loading = false;
      return;
    }

    const { data, error: providerError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getAuthCallbackUrl(next) }
    });

    if (providerError) {
      error = getFriendlyAuthError(providerError, `Could not continue with ${provider}.`);
      loading = false;
      return;
    }

    // GoTrue normally redirects itself. Keeping this fallback supports the
    // transport's non-redirect test mode and older auth-js releases.
    if (data?.url && typeof window !== 'undefined') window.location.assign(data.url);
    loading = false;
  }

  async function handleAuth() {
    if (loading) return;
    loading = true;
    clearMessages();
    const localDevelopment = isLocalDevelopment();

    if (tab === 'signup') {
      const requestedUsername = username.trim();
      const requestedEmail = email.trim();
      if (!requestedUsername || !requestedEmail || !password) {
        error = 'Please fill out the remaining fields.';
        loading = false;
        return;
      }
      if (!isUsernameShapeValid(requestedUsername)) {
      error = 'Username must be 1-20 characters and use only letters, numbers, or underscores.';
        loading = false;
        return;
      }
      if (!requestedEmail.includes('@')) {
        error = 'Enter a valid email address.';
        loading = false;
        return;
      }
      if (password.length < 8) {
        error = 'Password must be at least 8 characters long.';
        loading = false;
        return;
      }
      if (!termsAccepted) {
        error = 'Please agree to the Terms and Privacy Policy to continue.';
        loading = false;
        return;
      }

      const available = await checkUsernameAvailability(requestedUsername);
      if (!available) {
        error = usernameCheckState === 'error'
          ? 'We could not check that name. Try again.'
          : 'That username is not available. Please choose another one.';
        loading = false;
        return;
      }
      username = requestedUsername;
      email = requestedEmail;
    } else if (tab === 'forgot') {
      email = email.trim();
      if (!email) {
        error = 'Please enter the email address on your account.';
        loading = false;
        return;
      }
    } else {
      email = email.trim();
      if (!email.includes('@')) {
        error = 'Use the email address linked to your account.';
        loading = false;
        return;
      }
    }

    if (!localDevelopment && !siteKey) {
      error = 'Authentication is not configured.';
      loading = false;
      return;
    }

    const token = localDevelopment ? null : getCaptchaToken();
    if (!localDevelopment && !token) {
      error = 'Please complete the security check.';
      loading = false;
      return;
    }

    if (tab === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(next),
          data: {
            username,
            display_name: username,
            updates_opt_in: updatesOptIn
          },
          ...(token ? { captchaToken: token } : {})
        }
      });

      if (signUpError) {
        error = getFriendlyAuthError(signUpError, 'Could not create your account.');
        resetCaptcha();
      } else if (!data.session) {
        notice = 'Check your email for a confirmation link, then come back to sign in.';
      }
    } else if (tab === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getResetPasswordUrl(next),
        ...(token ? { captchaToken: token } : {})
      });

      if (resetError) {
        error = getFriendlyAuthError(resetError, 'Could not send the reset email.');
        resetCaptcha();
      } else {
        notice = 'If that account exists, we sent a reset link to your inbox.';
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: token ? { captchaToken: token } : {}
      });

      if (signInError) {
        error = getFriendlyAuthError(signInError, 'Could not sign you in.');
        resetCaptcha();
      }
      // A successful sign-in is redirected by the route shell's auth event.
    }

    loading = false;
  }

  async function handleSubmit() {
    if (tab === 'signup' && signupStep === 1) return handleUsernameContinue();
    if (tab === 'signup' && signupStep === 2) return handleEmailContinue();
    return handleAuth();
  }

  async function goToSignupStep(step) {
    clearMessages();
    const nextStep = Math.min(3, Math.max(1, step));
    if (nextStep !== signupStep && nextStep !== 3) removeTurnstile();
    signupStep = nextStep;
    if (signupStep === 3) {
      await tick();
      if (!isLocalDevelopment() && turnstileState === 'ready') renderTurnstile();
    }
    await focusField(signupStep === 1 ? '#username-input' : signupStep === 2 ? '#email-input' : '#password-input');
  }

  onMount(() => {
    if (tab === 'signup') scheduleUsernameCheck(0);

    if (isLocalDevelopment()) {
      turnstileState = 'ready';
      return () => {
        if (usernameCheckTimer !== null) clearTimeout(usernameCheckTimer);
      };
    }

    if (!siteKey) {
      turnstileState = 'error';
      return () => {
        if (usernameCheckTimer !== null) clearTimeout(usernameCheckTimer);
      };
    }

    let attempts = 0;
    turnstilePoll = setInterval(() => {
      attempts += 1;
      if (window.turnstile) {
        clearInterval(turnstilePoll);
        turnstilePoll = null;
        turnstileState = 'ready';
        renderTurnstile();
      } else if (attempts >= 50) {
        clearInterval(turnstilePoll);
        turnstilePoll = null;
        turnstileState = 'error';
        error = 'The security check could not load. Check your connection or content blocker, then retry.';
      }
    }, 200);

    return () => {
      if (turnstilePoll !== null) clearInterval(turnstilePoll);
      if (usernameCheckTimer !== null) clearTimeout(usernameCheckTimer);
      if (turnstileWidgetId !== null && window.turnstile) window.turnstile.remove(turnstileWidgetId);
    };
  });

  $: title = tab === 'login'
    ? 'Log in to your account'
    : tab === 'forgot'
      ? 'Reset your password'
      : signupStep === 3 ? 'Finish your signup' : 'Create your account';
  $: description = tab === 'login'
    ? 'Pick up where your color story left off.'
    : tab === 'forgot'
      ? 'We’ll send a reset link if the account exists.'
      : signupStep === 1
        ? 'Start with the name people will use to find your page.'
        : signupStep === 2
          ? 'Add an email so your page and daily rolls stay yours.'
          : 'Protect your page, then you’re ready to roll.';
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="auth-container" class:auth-container--modal={!standalone}>
  <div class="auth-mark" aria-hidden="true">
    <img src="/brand/am-mark-v1.webp" alt="" width="48" height="40" decoding="async" />
  </div>

  <div class="auth-header">
    <div class="auth-heading-group">
      <h1 id="auth-dialog-title" class="auth-title">{title}</h1>
      <p id="auth-dialog-desc" class="auth-description">{description}</p>
    </div>
    {#if !standalone}
      <button type="button" class="close-auth-btn" aria-label="Close authentication dialog" on:click={onClose}>×</button>
    {/if}
  </div>

  {#if !standalone}
    <div class="tabs" role="tablist" aria-label="Account access">
      <button type="button" class:active={tab === 'login'} on:click={() => setMode('login')}>Sign in</button>
      <button type="button" class:active={tab === 'signup'} on:click={() => setMode('signup')}>Create account</button>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    {#if tab === 'signup' && signupStep === 1}
      <label class="field-group" for="username-input">
        <span class="field-label">Username</span>
        <div class="input-shell" class:input-shell--status={usernameCheckState === 'available'}>
          <span class="input-prefix" aria-hidden="true">chm.lol/</span>
          <input id="username-input" type="text" class="input-field input-field--prefixed" bind:value={username} on:input={() => { clearMessages(); scheduleUsernameCheck(); }} placeholder="yourname" autocomplete="nickname" spellcheck="false" minlength="1" maxlength="20" required />
        </div>
        {#if usernameCheckState !== 'idle'}
          <span class:field-status--available={usernameCheckState === 'available'} class:field-status--error={usernameCheckState === 'unavailable' || usernameCheckState === 'error'} class="field-status" role="status" aria-live="polite">
            {usernameCheckMessage}
          </span>
        {:else}
        <span class="field-hint">Letters, numbers, and underscores. 1-20 characters.</span>
        {/if}
      </label>

      {#if error}<p class="auth-message auth-message--error" role="alert" aria-live="polite">{error}</p>{/if}
      <button type="submit" class="auth-submit" disabled={loading || usernameCheckState === 'checking'}>
        {loading || usernameCheckState === 'checking' ? 'Checking…' : 'Continue'}
      </button>
    {:else if tab === 'signup' && signupStep === 2}
      <button type="button" class="back-link" on:click={() => goToSignupStep(1)}>← Back</button>
      <div class="auth-summary">
        <div>
          <span>Username</span>
          <strong>chm.lol/{username}</strong>
        </div>
        <button type="button" on:click={() => goToSignupStep(1)}>Edit</button>
      </div>

      <label class="field-group" for="email-input">
        <span class="field-label">Email</span>
        <input id="email-input" type="email" class="input-field" bind:value={email} placeholder="you@example.com" autocomplete="email" required />
      </label>

      {#if error}<p class="auth-message auth-message--error" role="alert" aria-live="polite">{error}</p>{/if}
      <button type="submit" class="auth-submit" disabled={loading}>Continue</button>
    {:else if tab === 'signup' && signupStep === 3}
      <button type="button" class="back-link" on:click={() => goToSignupStep(2)}>← Back</button>
      <div class="auth-summary">
        <div>
          <span>Email address</span>
          <strong>{email}</strong>
        </div>
        <button type="button" on:click={() => goToSignupStep(2)}>Edit</button>
      </div>
      <div class="auth-summary">
        <div>
          <span>Username</span>
          <strong>chm.lol/{username}</strong>
        </div>
        <button type="button" on:click={() => goToSignupStep(1)}>Edit</button>
      </div>

      <label class="field-group" for="password-input">
        <span class="field-label">Password</span>
        <div class="input-shell">
          <input id="password-input" type={showPassword ? 'text' : 'password'} class="input-field input-field--password" bind:value={password} placeholder="Create a password" autocomplete="new-password" minlength="8" required />
          <button type="button" class="password-toggle" on:click={() => showPassword = !showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        <span class="field-hint">Use at least 8 characters.</span>
      </label>

      <label class="check-row" for="terms-accepted">
        <input id="terms-accepted" type="checkbox" bind:checked={termsAccepted} />
        <span>I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</span>
      </label>
      <label class="check-row" for="updates-opt-in">
        <input id="updates-opt-in" type="checkbox" bind:checked={updatesOptIn} />
        <span>I agree to receive occasional updates from ChromaDie.</span>
      </label>

      {#if !isLocalDevelopment()}
        <div class="security-check" class:security-check--error={turnstileState === 'error'}>
          <span class="field-label">Security check</span>
          <div id="turnstile-container"></div>
          {#if turnstileState === 'loading'}<span class="field-hint" role="status">Loading security check…</span>{:else if turnstileState === 'error'}<button type="button" class="link-btn" on:click={retryTurnstile}>Retry security check</button>{/if}
        </div>
      {/if}

      {#if notice}<p class="auth-message auth-message--notice" role="status" aria-live="polite">{notice}</p>{/if}
      {#if error}<p class="auth-message auth-message--error" role="alert" aria-live="polite">{error}</p>{/if}
      <button type="submit" class="auth-submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
    {:else if tab === 'login'}
      <label class="field-group" for="email-input">
        <span class="field-label">Email</span>
        <input id="email-input" type="email" class="input-field" bind:value={email} placeholder="you@example.com" autocomplete="username" required />
      </label>
      <label class="field-group" for="password-input">
        <span class="field-label">Password</span>
        <div class="input-shell">
          <input id="password-input" type={showPassword ? 'text' : 'password'} class="input-field input-field--password" bind:value={password} placeholder="Your password" autocomplete="current-password" required />
          <button type="button" class="password-toggle" on:click={() => showPassword = !showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
      </label>

      {#if !isLocalDevelopment()}
        <div class="security-check" class:security-check--error={turnstileState === 'error'}>
          <span class="field-label">Security check</span>
          <div id="turnstile-container"></div>
          {#if turnstileState === 'loading'}<span class="field-hint" role="status">Loading security check…</span>{:else if turnstileState === 'error'}<button type="button" class="link-btn" on:click={retryTurnstile}>Retry security check</button>{/if}
        </div>
      {/if}

      {#if error}<p class="auth-message auth-message--error" role="alert" aria-live="polite">{error}</p>{/if}
      {#if notice}<p class="auth-message auth-message--notice" role="status" aria-live="polite">{notice}</p>{/if}
      <button type="button" class="forgot-link" on:click={() => setMode('forgot')}>Forgot password?</button>
      <button type="submit" class="auth-submit" disabled={loading}>{loading ? 'Signing in…' : 'Log in'}</button>

      <div class="auth-divider" aria-hidden="true"><span></span><strong>OR</strong><span></span></div>
      <div class="provider-list" aria-label="Social sign-in options">
        <button type="button" class="provider-button" on:click={() => handleProvider('google')} disabled={loading}>
          <span class="provider-icon provider-icon--google" aria-hidden="true">G</span> Continue with Google
        </button>
        <button type="button" class="provider-button" on:click={() => handleProvider('discord')} disabled={loading}>
          <span class="provider-icon provider-icon--discord" aria-hidden="true">●</span> Continue with Discord
        </button>
      </div>
      <p class="auth-footnote">Guests can play immediately and come back when you’re ready.</p>
    {:else}
      <label class="field-group" for="email-input">
        <span class="field-label">Email</span>
        <input id="email-input" type="email" class="input-field" bind:value={email} placeholder="you@example.com" autocomplete="email" required />
      </label>
      {#if !isLocalDevelopment()}
        <div class="security-check" class:security-check--error={turnstileState === 'error'}>
          <span class="field-label">Security check</span>
          <div id="turnstile-container"></div>
          {#if turnstileState === 'loading'}<span class="field-hint" role="status">Loading security check…</span>{:else if turnstileState === 'error'}<button type="button" class="link-btn" on:click={retryTurnstile}>Retry security check</button>{/if}
        </div>
      {/if}
      {#if error}<p class="auth-message auth-message--error" role="alert" aria-live="polite">{error}</p>{/if}
      {#if notice}<p class="auth-message auth-message--notice" role="status" aria-live="polite">{notice}</p>{/if}
      <button type="submit" class="auth-submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
      <button type="button" class="back-link back-link--centered" on:click={() => setMode('login')}>Back to sign in</button>
    {/if}
  </form>

  {#if standalone}
    <nav class="auth-switch" aria-label="Account access">
      {#if tab === 'login'}
        <span>New here?</span>
        <a href={getAuthPath('signup')}>Create an account</a>
      {:else if tab === 'signup'}
        <span>Already have an account?</span>
        <a href={getAuthPath('login')}>Sign in</a>
      {:else}
        <a href={getAuthPath('login')}>Back to sign in</a>
      {/if}
    </nav>
  {/if}
</div>

<style>
  .auth-container {
    --auth-canvas: #0b0b0d;
    --auth-panel: #151517;
    --auth-panel-soft: #101012;
    --auth-line: rgba(255, 255, 255, 0.1);
    --auth-line-soft: rgba(255, 255, 255, 0.07);
    --auth-ink: #f3f3f5;
    --auth-muted: #929198;
    --auth-faint: #66656d;
    --auth-accent: #ffffff;
    --auth-accent-bright: #ffffff;
    width: min(100%, 23rem);
    padding: 1.45rem 1.35rem 1.3rem;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--auth-line-soft);
    border-radius: 18px;
    background: var(--auth-panel);
    color: var(--auth-ink);
    box-shadow: 0 1.75rem 4.5rem rgba(0, 0, 0, 0.36);
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .auth-mark { display: block; width: 2.75rem; height: 2.25rem; margin-bottom: 1rem; background: transparent; }
  .auth-mark img { width: 2.4rem; height: auto; opacity: 0.88; }
  .auth-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.05rem; }
  .auth-heading-group { min-width: 0; }
  .auth-title { margin: 0; color: var(--auth-ink); font: 650 1.45rem / 1.08 'Manrope Variable', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.035em; }
  .auth-description { max-width: 32ch; margin: 0.5rem 0 0; color: var(--auth-muted); font-size: 0.78rem; line-height: 1.45; }
  .close-auth-btn { flex: 0 0 auto; width: 2rem; height: 2rem; border: 1px solid var(--auth-line-soft); border-radius: 0.55rem; background: transparent; color: var(--auth-muted); cursor: pointer; font-size: 1.2rem; line-height: 1; }
  .close-auth-btn:hover, .close-auth-btn:focus-visible { border-color: var(--auth-line); color: var(--auth-ink); }

  .auth-switch { display: flex; align-items: center; justify-content: center; gap: 0.3rem; margin: 1rem 0 0; color: var(--auth-muted); font-size: 0.72rem; }
  .auth-switch a, .back-link, .forgot-link, .link-btn { color: var(--auth-accent-bright); text-decoration: underline; text-underline-offset: 0.18em; }
  .auth-switch a:hover, .back-link:hover, .forgot-link:hover, .link-btn:hover { color: var(--auth-ink); }

  .tabs { display: flex; gap: 0.2rem; margin: 0 0 1.15rem; padding: 0.2rem; border: 1px solid var(--auth-line-soft); border-radius: 0.65rem; background: var(--auth-panel-soft); }
  .tabs button { flex: 1; min-height: 2.35rem; border: 0; border-radius: 0.45rem; background: transparent; color: var(--auth-muted); cursor: pointer; font: 600 0.76rem / 1 'Inter', sans-serif; }
  .tabs button.active { background: rgba(255, 255, 255, 0.12); color: var(--auth-ink); }

  form { display: grid; gap: 0; }
  .field-group { display: grid; gap: 0.38rem; margin: 0 0 0.9rem; }
  .field-label { color: rgba(243, 243, 245, 0.84); font-size: 0.72rem; font-weight: 650; }
  .field-hint, .field-status { color: var(--auth-muted); font-size: 0.68rem; line-height: 1.4; }
  .field-status { display: inline-flex; align-items: center; gap: 0.3rem; }
  .field-status::before { content: '•'; color: currentColor; }
  .field-status--available { color: #71d6a5; }
  .field-status--error { color: #ef8a99; }

  .input-shell { display: flex; min-width: 0; align-items: center; border: 1px solid var(--auth-line-soft); border-radius: 0.65rem; background: var(--auth-canvas); transition: border-color 0.18s ease, box-shadow 0.18s ease; }
  .input-shell:focus-within { border-color: var(--auth-accent); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12); }
  .input-shell--status { border-color: rgba(113, 214, 165, 0.42); }
  .input-prefix { flex: 0 0 auto; padding-left: 0.78rem; color: var(--auth-muted); font-size: 0.76rem; }
  .input-field { width: 100%; min-width: 0; min-height: 2.65rem; padding: 0.7rem 0.78rem; border: 1px solid var(--auth-line-soft); border-radius: 0.65rem; outline: 0; background: var(--auth-canvas); color: var(--auth-ink); font: 400 0.8rem / 1.2 'Inter', sans-serif; transition: border-color 0.18s ease, box-shadow 0.18s ease; }
  .input-shell .input-field { border: 0; background: transparent; box-shadow: none; }
  .input-field--prefixed { padding-left: 0.3rem; }
  .input-field--password { padding-right: 0.2rem; }
  .input-field::placeholder { color: #5e5d65; }
  .input-field:focus { border-color: var(--auth-accent); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12); }
  .input-field:focus-visible { outline: 0; }
  .input-shell .input-field:focus { box-shadow: none; }
  .input-field:-webkit-autofill { -webkit-text-fill-color: var(--auth-ink); box-shadow: 0 0 0 1000px var(--auth-canvas) inset; }
  .password-toggle { flex: 0 0 auto; margin-right: 0.58rem; border: 0; background: transparent; color: var(--auth-muted); cursor: pointer; font-size: 0.66rem; }
  .password-toggle:hover, .password-toggle:focus-visible { color: var(--auth-ink); }

  .auth-summary { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; margin: 0 0 0.85rem; padding: 0.68rem 0; border-block: 1px solid var(--auth-line-soft); }
  .auth-summary + .auth-summary { margin-top: -0.85rem; border-top: 0; }
  .auth-summary div { display: grid; gap: 0.18rem; min-width: 0; }
  .auth-summary span { color: var(--auth-muted); font-size: 0.64rem; }
  .auth-summary strong { overflow: hidden; color: var(--auth-ink); font-size: 0.76rem; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
  .auth-summary button { border: 0; background: transparent; color: var(--auth-accent-bright); cursor: pointer; font-size: 0.68rem; text-decoration: underline; text-underline-offset: 0.18em; }
  .back-link, .forgot-link, .link-btn { width: fit-content; padding: 0; border: 0; background: transparent; cursor: pointer; font: 500 0.7rem / 1.4 'Inter', sans-serif; }
  .back-link { margin: 0 0 0.75rem; text-decoration: none; }
  .back-link--centered { justify-self: center; margin: 0.95rem 0 0; }
  .forgot-link { justify-self: end; margin: -0.22rem 0 0.78rem; }

  .check-row { display: grid; grid-template-columns: 1rem minmax(0, 1fr); align-items: start; gap: 0.55rem; margin: 0 0 0.65rem; color: var(--auth-muted); font-size: 0.68rem; line-height: 1.4; }
  .check-row input { width: 0.95rem; height: 0.95rem; margin: 0.06rem 0 0; accent-color: var(--auth-accent); }
  .check-row a { color: var(--auth-ink); text-decoration: underline; text-underline-offset: 0.15em; }

  .security-check { display: grid; gap: 0.36rem; margin: 0.2rem 0 0.75rem; }
  .security-check--error .field-label { color: #ef8a99; }
  #turnstile-container { display: grid; min-height: 4.6rem; place-items: center; overflow: hidden; border: 1px solid var(--auth-line-soft); border-radius: 0.6rem; background: var(--auth-panel-soft); }

  .auth-submit { width: 100%; min-height: 2.7rem; margin-top: 0.15rem; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 0.65rem; background: var(--auth-accent); color: #0b0b0d; cursor: pointer; font: 650 0.78rem / 1 'Manrope Variable', sans-serif; transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease; }
  .auth-submit:hover:not(:disabled) { background: #e9e9ec; box-shadow: 0 0.65rem 1.5rem rgba(255, 255, 255, 0.1); transform: translateY(-1px); }
  .auth-submit:disabled { cursor: wait; opacity: 0.55; }
  .auth-message { margin: 0 0 0.75rem; padding-left: 0.65rem; border-left: 2px solid currentColor; font-size: 0.7rem; line-height: 1.45; }
  .auth-message--error { color: #ef8a99; }
  .auth-message--notice { color: #71d6a5; }

  .auth-divider { display: flex; align-items: center; gap: 0.6rem; margin: 1rem 0 0.8rem; color: var(--auth-faint); font-size: 0.6rem; }
  .auth-divider span { flex: 1; height: 1px; background: var(--auth-line-soft); }
  .auth-divider strong { font-weight: 600; }
  .provider-list { display: grid; gap: 0.5rem; }
  .provider-button { display: flex; min-height: 2.45rem; align-items: center; justify-content: center; gap: 0.55rem; border: 1px solid var(--auth-line-soft); border-radius: 0.62rem; background: var(--auth-panel-soft); color: var(--auth-ink); cursor: pointer; font: 500 0.72rem / 1 'Inter', sans-serif; transition: border-color 0.18s ease, background 0.18s ease; }
  .provider-button:hover:not(:disabled), .provider-button:focus-visible { border-color: var(--auth-line); background: #1a1a1d; }
  .provider-button:disabled { cursor: wait; opacity: 0.55; }
  .provider-icon { display: inline-grid; width: 1rem; height: 1rem; place-items: center; font-size: 0.78rem; font-weight: 750; }
  .provider-icon--google { color: var(--auth-ink); }
  .provider-icon--discord { color: var(--auth-muted); font-size: 0.66rem; }
  .auth-footnote { margin: 0.95rem 0 0; color: var(--auth-muted); font-size: 0.66rem; line-height: 1.45; text-align: center; }

  @media (max-width: 26rem) {
    .auth-container { padding-inline: 1rem; border-radius: 15px; }
    .auth-title { font-size: 1.32rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-container *, .auth-container *::before, .auth-container *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>
