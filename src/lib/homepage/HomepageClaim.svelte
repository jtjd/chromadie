<script>
  import { createEventDispatcher } from 'svelte';
  import { isUsernameShapeValid } from '../usernamePolicy.js';
  import { trackProductEvent } from '../productAnalytics.js';

  export let isAuthenticated = false;
  export let accountReady = true;
  export let accountUnavailable = false;
  export let inputId = 'homepage-claim-username';
  export let anchorId = 'homepage-claim';
  export let buttonLabel = 'Claim';

  const dispatch = createEventDispatcher();
  let username = '';
  let error = '';
  let claimStarted = false;

  function beginClaim() {
    if (claimStarted) return;
    claimStarted = true;
    trackProductEvent('username_claim_started');
  }

  function submitClaim() {
    const nextUsername = username.trim();
    if (!isUsernameShapeValid(nextUsername)) {
      error = 'Use 1–20 letters, numbers, or underscores.';
      return;
    }
    error = '';
    trackProductEvent('username_claim_completed');
    dispatch('claim', { username: nextUsername });
  }
</script>

<div class="homepage-claim-slot" id={anchorId}>
  {#if accountUnavailable}
    <span class="homepage-claim__loading" role="status" aria-live="polite">Account unavailable. Try again above.</span>
  {:else if !accountReady}
    <span class="homepage-claim__loading" role="status" aria-live="polite">Checking your account…</span>
  {:else if isAuthenticated}
    <button class="homepage-claim__primary" type="button" on:click={() => dispatch('profile')}>
      View your profile
    </button>
  {:else}
    <form class="homepage-claim" on:submit|preventDefault={submitClaim} aria-label="Claim your profile URL">
      <div class="homepage-claim__field">
        <span class="homepage-claim__prefix" aria-hidden="true">chm.lol/</span>
        <input
          id={inputId}
          aria-label="Username"
          bind:value={username}
          on:focus={beginClaim}
          on:input={() => { beginClaim(); if (error) error = ''; }}
          placeholder="username"
          autocomplete="nickname"
          spellcheck="false"
          minlength="1"
          maxlength="20"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button class="homepage-button" type="submit">{buttonLabel}</button>
      </div>
      {#if error}
        <small id={`${inputId}-error`} class="homepage-claim__error" aria-live="polite">{error}</small>
      {/if}
    </form>
  {/if}
</div>

<style>
  .homepage-claim-slot { width: min(100%, 410px); }

  .homepage-claim { display: grid; gap: 0.5rem; width: 100%; }

  .homepage-claim__field {
    display: flex;
    min-width: 0;
    width: 100%;
    align-items: center;
    padding: 6px 6px 6px 16px;
    border: 1px solid var(--homepage-border);
    border-radius: 11px;
    background: rgba(8, 8, 10, 0.76);
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.26);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .homepage-claim__field:focus-within {
    border-color: var(--homepage-accent);
    box-shadow: 0 0 0 3px var(--homepage-accent-soft), 0 16px 38px rgba(0, 0, 0, 0.26);
  }

  .homepage-claim__prefix { color: rgba(245, 245, 247, 0.5); font: 500 0.9rem / 1 'Clash Display', sans-serif; white-space: nowrap; }

  .homepage-claim__field input {
    min-width: 0;
    flex: 1;
    height: 42px;
    padding: 0 8px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--homepage-text);
    font: 500 0.96rem / 1 'Clash Display', sans-serif;
  }

  .homepage-claim__field input::placeholder { color: rgba(245, 245, 247, 0.23); }

  .homepage-claim__field .homepage-button,
  .homepage-claim__primary {
    min-height: 42px;
    border: 0;
    background: var(--homepage-text);
    color: #08080a;
    font: 600 0.88rem / 1 'Clash Display', sans-serif;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease;
  }

  .homepage-claim__field .homepage-button { min-width: 92px; padding: 0 18px; }
  .homepage-claim__field .homepage-button:hover,
  .homepage-claim__primary:hover { background: var(--homepage-accent); }
  .homepage-claim__field .homepage-button:active,
  .homepage-claim__primary:active { transform: translateY(1px); }

  .homepage-claim__error { color: #ff8791; font: 400 0.68rem / 1.35 'Inter', sans-serif; }

  .homepage-claim__primary {
    width: 100%;
    padding: 0.72rem 1rem;
    border: 1px solid var(--homepage-accent);
    border-radius: 9px;
    background: var(--homepage-accent);
  }

  .homepage-claim__loading { display: inline-flex; min-height: 42px; align-items: center; color: var(--homepage-muted); font: 500 0.72rem / 1 'Inter', sans-serif; }

  .homepage-claim__primary:focus-visible,
  .homepage-claim__field .homepage-button:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 3px; }

  @media (max-width: 460px) {
    .homepage-claim__field { padding-left: 12px; }
    .homepage-claim__field input { padding-inline: 5px; font-size: 0.9rem; }
    .homepage-claim__field .homepage-button { min-width: 82px; padding-inline: 10px; }
  }

  @media (min-width: 931px) and (max-width: 1180px) {
    .homepage-claim-slot { width: 390px; }
  }

  @media (max-width: 930px) {
    .homepage-claim-slot { width: min(100%, 410px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-claim__field,
    .homepage-claim__field .homepage-button,
    .homepage-claim__primary { transition: none; }
  }
</style>
