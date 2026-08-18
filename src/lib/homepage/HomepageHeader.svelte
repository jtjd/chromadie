<script>
  import { createEventDispatcher } from 'svelte';
  import { ACCOUNT_STATES } from '../authState.js';

  export let accountState = /** @type {string} */ (ACCOUNT_STATES.SIGNED_OUT);
  export let isAuthenticated = false;
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();

  function openProfile() {
    dispatch('navigate', { view: 'profile' });
  }

  function signIn() {
    dispatch('login', { mode: 'login' });
  }

  function signUp() {
    dispatch('login', { mode: 'signup' });
  }
</script>

<header class="homepage-header">
  <div class="homepage-shell homepage-header__inner">
    <a class="homepage-header__logo" href="#top" aria-label="chm.lol home">
      <span class="homepage-header__logo-mark" aria-hidden="true"></span>
      <span>chm.lol</span>
    </a>

    <nav class="homepage-header__nav" aria-label="Homepage">
      <a class="homepage-header__route-link" href="/leaderboard">Leaderboard</a>
      {#if isAuthenticated}<a class="homepage-header__route-link" href="/profile/settings">Customize</a>{/if}
      <a class="homepage-header__route-link" href="/pricing">Pricing</a>
      <a class="homepage-button homepage-header__claim-link" href="#claim">Claim handle</a>
    </nav>

    <div class="homepage-header__account" aria-label="Account actions">
      {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
        <button type="button" class="homepage-header__account-name" on:click={openProfile}>{username || 'Your profile'}</button>
        <button type="button" class="homepage-header__account-action" on:click={() => dispatch('logout')} disabled={logoutInProgress}>
          {logoutInProgress ? 'Signing out…' : 'Sign out'}
        </button>
      {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
        <button type="button" class="homepage-header__account-action" on:click={() => dispatch('retry')}>Retry account</button>
      {:else if accountState === ACCOUNT_STATES.BOOTING || accountState === ACCOUNT_STATES.PROFILE_LOADING}
        <span class="homepage-header__account-loading" role="status" aria-live="polite">Loading</span>
      {:else if !isAuthenticated}
        <button type="button" class="homepage-header__account-action" on:click={signIn}>Sign in</button>
        <button type="button" class="homepage-button homepage-header__account-signup" on:click={signUp}>Sign up</button>
      {/if}
    </div>
  </div>
</header>

<style>
  .homepage-header {
    position: relative;
    z-index: 10;
    height: 88px;
  }

  .homepage-header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    height: 100%;
  }

  .homepage-header__logo {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    gap: 11px;
    color: var(--homepage-text);
    font: 600 1.28rem / 1 var(--homepage-display);
    letter-spacing: -0.025em;
    text-decoration: none;
  }

  .homepage-header__logo-mark {
    position: relative;
    width: 24px;
    height: 24px;
    border: 2px solid color-mix(in srgb, var(--homepage-accent) 36%, transparent);
    border-radius: 999px;
    box-shadow: 0 0 18px var(--homepage-accent-glow);
  }

  .homepage-header__logo-mark::after {
    position: absolute;
    inset: 6px;
    content: '';
    border-radius: 999px;
    background: var(--homepage-accent);
  }

  .homepage-header__nav,
  .homepage-header__account {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .homepage-header__nav { margin-left: auto; }

  .homepage-header__nav a:not(.homepage-button),
  .homepage-header__account-action,
  .homepage-header__account-name,
  .homepage-header__account-loading {
    color: rgba(245, 245, 247, 0.6);
    font: 400 0.84rem / 1 'Inter', sans-serif;
    text-decoration: none;
  }

  .homepage-header__nav a:not(.homepage-button):hover,
  .homepage-header__account-action:hover:not(:disabled),
  .homepage-header__account-name:hover { color: var(--homepage-text); }

  .homepage-header__account-action,
  .homepage-header__account-name {
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .homepage-header__account-name { color: rgba(245, 245, 247, 0.8); }
  .homepage-header__account-loading { color: rgba(245, 245, 247, 0.35); font-size: 0.7rem; }
  .homepage-header__account-action:disabled { cursor: wait; opacity: 0.58; }

  .homepage-button {
    display: inline-flex;
    min-height: 42px;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    border: 0;
    border-radius: 9px;
    background: var(--homepage-text);
    color: #08080a;
    font: 600 0.88rem / 1 var(--homepage-display);
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .homepage-button:hover { transform: translateY(-1px); background: var(--homepage-accent); }
  .homepage-header__account-signup { display: none; }

  .homepage-header a:focus-visible,
  .homepage-header button:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 4px; }

  @media (max-width: 980px) {
    .homepage-header__inner { width: min(calc(100% - 40px), 980px); }
    .homepage-header__nav { gap: 20px; }
    .homepage-header__account { gap: 14px; }
  }

  @media (max-width: 780px) {
    .homepage-header { height: 70px; }
    .homepage-header__inner { width: calc(100% - 30px); }
    .homepage-header__nav { gap: 10px; }
    .homepage-header__nav a:not(.homepage-button),
    .homepage-header__account-action,
    .homepage-header__account-name,
    .homepage-header__account-loading { display: none; }
    .homepage-header__claim-link,
    .homepage-header__account-signup { min-height: 38px; padding: 0 14px; font-size: 0.8rem; }
    .homepage-header__account-signup { display: inline-flex; }
    .homepage-header__account { gap: 10px; }
  }

  @media (max-width: 460px) {
    .homepage-header__logo { gap: 8px; font-size: 1.1rem; }
    .homepage-header__logo-mark { width: 20px; height: 20px; }
    .homepage-header__logo-mark::after { inset: 5px; }
    .homepage-header__claim-link { padding-inline: 11px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-button { transition: none; }
  }
</style>
