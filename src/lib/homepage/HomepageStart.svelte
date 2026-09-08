<script>
  import { createEventDispatcher } from 'svelte';
  import { ACCOUNT_STATES } from '../authState.js';
  import { isUsernameShapeValid } from '../usernamePolicy.js';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);

  const dispatch = createEventDispatcher();
  let desiredUsername = '';
  let usernameInput;

  $: normalizedUsername = desiredUsername.trim();
  $: usernameIsValid = !normalizedUsername || isUsernameShapeValid(normalizedUsername);
  $: signupHref = `/signup?next=%2Fprofile%2Fsettings${normalizedUsername && usernameIsValid ? `&username=${encodeURIComponent(normalizedUsername)}` : ''}`;

  function handleSubmit(event) {
    event.preventDefault();
    if (!normalizedUsername || !usernameIsValid) {
      usernameInput?.focus();
      return;
    }
    window.location.href = signupHref;
  }
</script>

<section class="homepage-section homepage-start" aria-labelledby="homepage-start-title">
  <div class="homepage-start__content">
    <h2 class="homepage-section-heading" id="homepage-start-title">
      {isAuthenticated ? 'Make it yours.' : 'Make your own profile.'}
    </h2>

    {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
      <div class="homepage-start__owned">
        <span class="homepage-start__owned-address">chm.lol/<strong>you</strong></span>
        <a class="homepage-button" href="/profile/settings">Customize your profile</a>
      </div>
    {:else if accountState === ACCOUNT_STATES.SIGNED_OUT && !isAuthenticated}
      <form class="homepage-start__claim" on:submit={handleSubmit} novalidate>
        <label class="homepage-start__field" class:homepage-start__field--invalid={!usernameIsValid}>
          <span>chm.lol/</span>
          <input
            bind:this={usernameInput}
            bind:value={desiredUsername}
            type="text"
            name="username"
            inputmode="text"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            maxlength="20"
            pattern={'[A-Za-z0-9_]{1,20}'}
            placeholder="yourname"
            aria-label="Choose your profile name"
            aria-invalid={!usernameIsValid}
          />
        </label>
        <button class="homepage-button homepage-start__claim-button" type="submit">Claim your profile</button>
      </form>

      {#if !usernameIsValid}
        <p class="homepage-start__error" role="alert">Use 1–20 letters, numbers, or underscores.</p>
      {/if}

      <a class="homepage-start__signin" href="/login?next=%2Fprofile%2Fsettings">Already have an account? Sign in</a>
    {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
      <div class="homepage-start__status">
        <p role="alert">Account details couldn’t load.</p>
        <button class="homepage-button" type="button" on:click={() => dispatch('retry')}>Retry account</button>
      </div>
    {:else}
      <p class="homepage-start__status" role="status">Loading your account…</p>
    {/if}
  </div>
</section>

<style>
  .homepage-start {
    padding-block: 96px 104px;
    border-top: 1px solid var(--homepage-border);
  }

  .homepage-start__content {
    display: grid;
    width: min(100%, 920px);
    margin-inline: auto;
    justify-items: center;
    text-align: center;
  }

  .homepage-start__content :global(.homepage-section-heading) {
    max-width: 720px;
    margin-bottom: 30px;
  }

  .homepage-start__claim {
    display: grid;
    grid-template-columns: minmax(300px, 1fr) auto;
    width: min(100%, 720px);
    gap: 12px;
    margin: 0;
  }

  .homepage-start__field {
    display: flex;
    min-width: 0;
    min-height: 58px;
    align-items: center;
    padding: 0 18px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 9px;
    background: #f5f5f7;
    cursor: text;
  }

  .homepage-start__field:focus-within {
    border-color: rgba(255,255,255,.52);
    box-shadow: 0 0 0 3px rgba(255,255,255,.07);
  }

  .homepage-start__field--invalid {
    border-color: #f38ba8;
  }

  .homepage-start__field span {
    flex: 0 0 auto;
    color: #75757e;
    font: 600 1rem / 1 var(--homepage-display);
  }

  .homepage-start__field input {
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #101014;
    caret-color: #101014;
    font: 600 1rem / 1 var(--homepage-display);
  }

  .homepage-start__field input::placeholder {
    color: #8a8a93;
    opacity: 1;
  }

  .homepage-start .homepage-button {
    min-height: 58px;
    padding-inline: 26px;
    border: 0;
    color: #08080a;
    font: 600 .96rem / 1 var(--homepage-display);
    white-space: nowrap;
    cursor: pointer;
  }

  .homepage-start__claim-button {
    min-width: 205px;
  }

  .homepage-start__signin {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    margin-top: 12px;
    color: var(--homepage-secondary-muted);
    font-size: .86rem;
    text-underline-offset: 4px;
  }

  .homepage-start__error {
    width: min(100%, 720px);
    margin: 8px 0 0;
    color: #f38ba8;
    font-size: .8rem;
    text-align: left;
  }

  .homepage-start__owned,
  .homepage-start__status {
    display: grid;
    justify-items: center;
    gap: 18px;
  }

  .homepage-start__owned-address {
    color: var(--homepage-muted);
    font: 500 clamp(2rem, 4vw, 3.4rem) / 1 var(--homepage-display);
    letter-spacing: -.045em;
  }

  .homepage-start__owned-address strong {
    color: var(--homepage-text);
    font-weight: 600;
  }

  a:focus-visible,
  button:focus-visible,
  input:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  .homepage-start__field input:focus-visible { outline: 0; }

  @media (max-width: 720px) {
    .homepage-start { padding-block: 70px 76px; }
    .homepage-start__content :global(.homepage-section-heading) { margin-bottom: 24px; }
    .homepage-start__claim { grid-template-columns: 1fr; }
    .homepage-start__claim-button { width: 100%; }
  }

  @media (max-width: 520px) {
    .homepage-start { padding-block: 58px 64px; }
    .homepage-start__field { min-height: 54px; padding-inline: 15px; }
    .homepage-start .homepage-button { min-height: 54px; }
  }
</style>
