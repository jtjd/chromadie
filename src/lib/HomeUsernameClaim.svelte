<script>
  import { createEventDispatcher } from 'svelte';
  import { isUsernameShapeValid } from './usernamePolicy.js';
  import { trackProductEvent } from './productAnalytics.js';

  export let isAuthenticated = false;
  export let accountReady = true;
  export let accountUnavailable = false;
  export let inputId = 'home-claim-username';
  export let showLabel = true;
  export let showNote = true;
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
      error = 'Use 3–20 letters, numbers, or underscores.';
      return;
    }
    error = '';
    trackProductEvent('username_claim_completed');
    dispatch('claim', { username: nextUsername });
  }
</script>

{#if accountUnavailable}
  <span class="home-claim__loading" role="status" aria-live="polite">Account unavailable. Try again above.</span>
{:else if !accountReady}
  <span class="home-claim__loading" role="status" aria-live="polite">Checking your account…</span>
{:else if isAuthenticated}
  <button class="home-claim__primary" type="button" on:click={() => dispatch('profile')}>
    View your profile <span aria-hidden="true">↗</span>
  </button>
{:else}
  <form class="home-claim" on:submit|preventDefault={submitClaim} aria-label="Claim your profile URL">
    {#if showLabel}<label for={inputId}>Claim your username</label>{/if}
    <div class="home-claim__field">
      <span aria-hidden="true">chm.lol/</span>
      <input
        id={inputId}
        aria-label={showLabel ? undefined : 'Username'}
        bind:value={username}
        on:focus={beginClaim}
        on:input={() => { beginClaim(); if (error) error = ''; }}
        placeholder="username"
        autocomplete="nickname"
        spellcheck="false"
        minlength="3"
        maxlength="20"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : showNote ? `${inputId}-hint` : undefined}
      />
      <button type="submit">{buttonLabel}</button>
    </div>
    {#if showNote || error}
      <small id={error ? `${inputId}-error` : `${inputId}-hint`} class:home-claim__error={error} aria-live="polite">
        {error || 'Free · One roll each day'}
      </small>
    {/if}
  </form>
{/if}

<style>
  .home-claim { display: grid; gap: 0.5rem; width: min(100%, 36rem); }
  .home-claim label { color: var(--home-ink); font: 600 0.78rem / 1 var(--home-font); }
  .home-claim__field { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; min-height: 3rem; overflow: hidden; border: 1px solid #4a4d57; border-radius: 0.35rem; background: #121419; color: #777983; font: 400 0.72rem / 1 var(--home-mono); box-shadow: 0 1.1rem 3rem rgba(0, 0, 0, 0.22); transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease; }
  .home-claim__field:focus-within { border-color: #72788d; box-shadow: 0 1.1rem 3.25rem rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(205, 210, 255, 0.055); transform: translateY(-1px); }
  .home-claim__field > span { padding-left: 0.9rem; white-space: nowrap; }
  .home-claim__field input { width: 100%; min-width: 0; padding: 0.82rem 0.4rem 0.82rem 0.25rem; border: 0; outline: 0; background: transparent; color: #fff; font: inherit; }
  .home-claim__field input::placeholder { color: rgba(241, 243, 237, 0.36); }
  .home-claim__field button, .home-claim__primary { min-height: 3rem; border: 0; background: #efede7; color: #0d0e11; font: 700 0.78rem / 1 var(--home-font); cursor: pointer; transition: background 0.2s ease, transform 0.2s ease; }
  .home-claim__field button { padding: 0 1.35rem; border-left: 1px solid #4a4d57; }
  .home-claim__field button:hover, .home-claim__primary:hover { background: #fff; }
  .home-claim__field button:active, .home-claim__primary:active { transform: translateY(1px); }
  .home-claim small { color: #797b85; font: 400 0.63rem / 1.35 var(--home-mono); }
  .home-claim__error { color: #ff8791 !important; }
  .home-claim__primary { padding: 0.72rem 1rem; border: 1px solid var(--home-accent, #cdd2ff); border-radius: 0.35rem; background: var(--home-accent, #cdd2ff); color: #101116; }
  .home-claim__loading { display: inline-flex; align-items: center; min-height: 3rem; color: #9b9da8; font: 600 0.72rem / 1 var(--home-mono); }
  .home-claim__primary:focus-visible, .home-claim__field button:focus-visible { outline: 2px solid #8ddcff; outline-offset: 3px; }

  @media (max-width: 36rem) {
    .home-claim__field > span { padding-left: 0.75rem; }
    .home-claim__field input { padding-left: 0.15rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-claim__field, .home-claim__field button, .home-claim__primary { transition: none; }
  }
</style>
