<script>
  import { createEventDispatcher } from 'svelte';
  import { isUsernameShapeValid } from './usernamePolicy.js';
  import { trackProductEvent } from './productAnalytics.js';
  import HomeDiscovery from './HomeDiscovery.svelte';
  import HomeRollShowcase from './HomeRollShowcase.svelte';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
  let claimUsername = '';
  let claimError = '';
  let claimStarted = false;

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  function beginClaim() {
    if (claimStarted) return;
    claimStarted = true;
    trackProductEvent('username_claim_started');
  }

  function submitClaim(value = claimUsername) {
    const nextUsername = value.trim();
    if (!isUsernameShapeValid(nextUsername)) {
      claimError = 'Use 3–20 letters, numbers, or underscores.';
      return;
    }
    claimError = '';
    trackProductEvent('username_claim_completed');
    dispatch('claim', { username: nextUsername });
  }
</script>

<main class="home-page" aria-labelledby="home-title">
  <div class="home-page__inner">
    <section class="home-page__hero">
      <div class="home-page__intro-grid">
        <div class="home-page__copy">
          <p class="home-page__eyebrow">Daily color profile</p>
          <h1 id="home-title">A public profile built through one daily color roll.</h1>
          <p class="home-page__intro">Roll once a day to collect colors, earn EP, unlock cosmetics, and customize a profile you can share.</p>
        </div>

        <div class="home-page__actions">
          {#if isAuthenticated}
            <p class="home-page__action-label">Your daily profile</p>
            <button class="home-page__primary" type="button" on:click={() => dispatch('profile')}>View your profile <span aria-hidden="true">↗</span></button>
            <button class="home-page__secondary" type="button" on:click={() => dispatch('roll')}>Roll today’s color</button>
          {:else}
            <form class="home-page__claim" on:submit|preventDefault={() => submitClaim()} aria-label="Claim your profile URL">
              <label for="home-claim-username">Claim your username</label>
              <div class="home-page__claim-field">
                <span aria-hidden="true">chm.lol/</span>
                <input id="home-claim-username" bind:value={claimUsername} on:focus={beginClaim} on:input={beginClaim} placeholder="username" autocomplete="nickname" spellcheck="false" minlength="3" maxlength="20" aria-describedby={claimError ? 'home-claim-error' : 'home-claim-hint'} />
                <button type="submit">Claim</button>
              </div>
              <small id={claimError ? 'home-claim-error' : 'home-claim-hint'} class:home-page__claim-error={claimError} aria-live="polite">{claimError || 'Free to use · One roll each day'}</small>
            </form>
          {/if}
        </div>
      </div>

      <HomeRollShowcase isAuthenticated={isAuthenticated} on:signup={forwardAction} on:profile={forwardAction} />
    </section>

    <HomeDiscovery on:navigate={forwardAction} />
  </div>
</main>

<style>
  .home-page {
    --home-canvas: #080908;
    --home-surface: #0e100e;
    --home-surface-raised: #121412;
    --home-ink: #f1f3ed;
    --home-ink-muted: #a4a9a0;
    --home-ink-faint: #737970;
    --home-line: rgba(241, 243, 237, 0.13);
    --home-line-strong: rgba(241, 243, 237, 0.24);
    --home-color: #b7fd4d;
    --home-font: 'Spline Sans Variable', ui-sans-serif, system-ui, sans-serif;
    --home-mono: 'IBM Plex Mono', ui-monospace, monospace;
    position: relative;
    width: 100%;
    overflow: hidden;
    color: var(--home-ink);
    background: var(--home-canvas);
    font-family: var(--home-font);
    isolation: isolate;
  }

  .home-page::before {
    position: absolute;
    z-index: -1;
    inset: 0;
    content: '';
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0 0.4px, transparent 0.55px);
    background-size: 19px 19px;
    opacity: 0.12;
    pointer-events: none;
  }

  .home-page__inner {
    width: min(100%, 78rem);
    margin-inline: auto;
    padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 4vw, 3rem) clamp(5rem, 9vw, 8rem);
  }

  .home-page__hero {
    display: grid;
    align-content: center;
    min-height: calc(100dvh - 4.75rem);
  }

  .home-page__intro-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(19rem, 0.65fr);
    align-items: end;
    gap: clamp(2rem, 7vw, 7rem);
  }

  .home-page__copy {
    max-width: 49rem;
  }

  .home-page__eyebrow,
  .home-page__action-label {
    margin: 0;
    color: var(--home-ink-faint);
    font: 600 0.67rem / 1.2 var(--home-mono);
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .home-page h1 {
    max-width: 48rem;
    margin: 1rem 0 0;
    color: var(--home-ink);
    font: 620 clamp(2.75rem, 5.2vw, 5rem) / 0.98 var(--home-font);
    letter-spacing: -0.055em;
    text-wrap: balance;
  }

  .home-page__intro {
    max-width: 42rem;
    margin: 1.4rem 0 0;
    color: var(--home-ink-muted);
    font-size: clamp(1rem, 1.35vw, 1.13rem);
    line-height: 1.55;
  }

  .home-page__actions {
    display: grid;
    gap: 0.65rem;
    align-self: end;
  }

  .home-page__claim {
    display: grid;
    gap: 0.6rem;
    width: 100%;
  }

  .home-page__claim label {
    color: var(--home-ink);
    font: 600 0.82rem / 1 var(--home-font);
  }

  .home-page__claim-field {
    display: flex;
    align-items: center;
    min-height: 3.15rem;
    border: 1px solid var(--home-line-strong);
    border-radius: 0.55rem;
    background: var(--home-surface);
    color: var(--home-ink-faint);
    font: 400 0.76rem / 1 var(--home-mono);
  }

  .home-page__claim-field:focus-within {
    border-color: color-mix(in srgb, var(--home-color) 62%, var(--home-line-strong));
  }

  .home-page__claim-field > span {
    padding-left: 0.85rem;
  }

  .home-page__claim-field input {
    width: 7rem;
    min-width: 0;
    padding: 0.85rem 0.25rem;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--home-ink);
    font: inherit;
  }

  .home-page__claim-field input:focus-visible {
    outline: 0;
  }

  .home-page__claim-field button {
    align-self: stretch;
    margin-left: auto;
    padding-inline: 1.1rem;
    border: 0;
    border-left: 1px solid var(--home-line);
    background: var(--home-color);
    color: #11140d;
    font: 650 0.78rem / 1 var(--home-font);
    cursor: pointer;
  }

  .home-page__claim-field button:hover {
    background: #c7ff72;
  }

  .home-page__claim small {
    color: var(--home-ink-faint);
    font: 400 0.66rem / 1.35 var(--home-mono);
  }

  .home-page__claim-error {
    color: #ff8791 !important;
  }

  .home-page__primary,
  .home-page__secondary {
    min-height: 3rem;
    padding: 0.7rem 1rem;
    border-radius: 0.55rem;
    font: 650 0.82rem / 1 var(--home-font);
    cursor: pointer;
  }

  .home-page__primary {
    border: 1px solid var(--home-color);
    background: var(--home-color);
    color: #11140d;
  }

  .home-page__primary:hover {
    background: #c7ff72;
  }

  .home-page__secondary {
    border: 1px solid var(--home-line-strong);
    background: var(--home-surface);
    color: var(--home-ink-muted);
  }

  .home-page__secondary:hover {
    border-color: var(--home-ink-muted);
    color: var(--home-ink);
  }

  @media (max-width: 48rem) {
    .home-page__inner {
      padding-top: 2rem;
    }

    .home-page__hero {
      min-height: auto;
    }

    .home-page__intro-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .home-page__actions {
      max-width: 28rem;
    }

  }

  @media (max-width: 36rem) {
    .home-page__inner {
      padding-inline: 1.1rem;
      padding-bottom: 5rem;
    }

    .home-page h1 {
      font-size: clamp(2.45rem, 11.5vw, 3.45rem);
    }

    .home-page__claim-field input {
      flex: 1;
      width: auto;
    }

  }

  @media (prefers-reduced-motion: reduce) {
    .home-page button {
      transition: none;
    }
  }
</style>
