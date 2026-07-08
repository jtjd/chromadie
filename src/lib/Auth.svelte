<script>
  import { supabase } from './supabase';
  import { onMount } from 'svelte';

  let tab = 'login'; // 'login' or 'signup'
  let email = '';
  let password = '';
  let username = '';
  let error = '';
  let loading = false;

  let turnstileWidgetId = null;
  const siteKey = import.meta.env.VITE_CLOUDFLARE_SITE_KEY;

  onMount(() => {
    const checkTurnstile = setInterval(() => {
      if (window.turnstile) {
        clearInterval(checkTurnstile);
        renderTurnstile();
      }
    }, 200);
    return () => clearInterval(checkTurnstile);
  });

  function renderTurnstile() {
    if (window.turnstile && document.getElementById('turnstile-container')) {
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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          captchaToken
        }
      });

      if (signUpError) {
        error = signUpError.message;
        resetCaptcha();
      } else {
        if (data.session) {
          // onAuthStateChange will handle the modal close
        } else {
          error = "Success! Check your email to verify your account.";
        }
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
        error = "Invalid email or password.";
        resetCaptcha();
      }
      // If successful, onAuthStateChange fires, $session updates, App.svelte closes modal.
    }
    loading = false;
  }
</script>

<div class="auth-container glass-panel">
  <h1>ChromaDie</h1>

  <div class="tabs">
    <button class={tab === 'login' ? 'active' : ''} on:click={() => tab = 'login'}>Login</button>
    <button class={tab === 'signup' ? 'active' : ''} on:click={() => tab = 'signup'}>Sign Up</button>
  </div>

  <form on:submit|preventDefault={handleAuth}>
    {#if tab === 'signup'}
      <input type="text" class="input-field" bind:value={username} placeholder="Username" required />
    {/if}
    <input type="email" class="input-field" bind:value={email} placeholder="Email" required />
    <input type="password" class="input-field" bind:value={password} placeholder="Password" required />

    <div id="turnstile-container"></div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button type="submit" class="btn btn-primary" disabled={loading}>
      {loading ? 'Loading...' : (tab === 'login' ? 'Log In' : 'Sign Up')}
    </button>
  </form>
</div>

<style>
  .auth-container {
    width: 100%;
    max-width: 420px;
    padding: 2.5rem;
  }
  h1 {
    text-align: center;
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 2.5rem;
    background: var(--spectrum);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
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
  }
  .error {
    color: #ff4444;
    font-size: 0.9rem;
    margin: 0 0 1rem 0;
    text-align: center;
  }
  #turnstile-container {
    margin-bottom: 1rem;
    min-height: 65px;
  }
</style>
