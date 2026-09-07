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

  function focusUsername(event) {
    if (event.target instanceof HTMLInputElement) return;
    usernameInput?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!normalizedUsername) {
      usernameInput?.focus();
      return;
    }
    if (!usernameIsValid) {
      usernameInput?.focus();
      return;
    }
    window.location.href = signupHref;
  }
</script>

<section class="homepage-section homepage-start" aria-labelledby="homepage-start-title">
  <div class="homepage-start__copy">
    <p class="homepage-start__eyebrow">YOUR PAGE</p>
    <h2 class="homepage-section-heading" id="homepage-start-title">{isAuthenticated ? 'Make a few changes.' : 'Make your own profile.'}</h2>
    <p class="homepage-section-sub">{isAuthenticated ? 'Update your layout, add your links, or try a different effect.' : 'Save future rolls, collect conditions, and customize your page.'}</p>
  </div>

  <div class="homepage-start__action">
    {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
      <div class="homepage-start__address homepage-start__address--owned" aria-label="Your profile address">
        <span>chm.lol/</span><strong>you</strong>
      </div>
      <a class="homepage-button" href="/profile/settings">Customize your profile</a>
    {:else if accountState === ACCOUNT_STATES.SIGNED_OUT && !isAuthenticated}
      <form class="homepage-start__form" on:submit={handleSubmit} novalidate>
        <label class="homepage-start__address" class:homepage-start__address--invalid={!usernameIsValid} on:click={focusUsername}>
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
            pattern="[A-Za-z0-9_]{1,20}"
            placeholder="yourname"
            aria-label="Choose your profile name"
            aria-invalid={!usernameIsValid}
          />
        </label>
        <p class="homepage-start__address-note">
          {#if usernameIsValid}
            One address for your links, colors, collection, and profile style.
          {:else}
            Use 1–20 letters, numbers, or underscores.
          {/if}
        </p>
        <button class="homepage-button" type="submit">Create a free profile</button>
      </form>
      <a class="homepage-start__signin" href="/login?next=%2Fprofile%2Fsettings">Already have an account? Sign in</a>
    {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
      <p role="alert">Account details couldn’t load.</p><button class="homepage-button" type="button" on:click={() => dispatch('retry')}>Retry account</button>
    {:else}
      <p role="status">Loading your account…</p>
    {/if}
  </div>
</section>

<style>
  .homepage-start {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(460px, 1.1fr);
    align-items: center;
    gap: clamp(64px, 8vw, 128px);
    padding-block: 100px;
    overflow: hidden;
    border-top: 1px solid var(--homepage-border);
  }

  .homepage-start::after {
    position: absolute;
    z-index: -1;
    width: 420px;
    height: 260px;
    right: 2%;
    bottom: -150px;
    border-radius: 50%;
    background: rgba(255,255,255,.035);
    content: '';
    filter: blur(70px);
    pointer-events: none;
  }

  .homepage-start__copy { max-width: 560px; }
  .homepage-start__eyebrow {
    margin: 0 0 18px;
    color: var(--homepage-muted);
    font: 600 .68rem / 1.2 'Inter', sans-serif;
    letter-spacing: .13em;
  }

  .homepage-start__action {
    display: grid;
    width: min(100%, 620px);
    justify-self: end;
    gap: 14px;
  }

  .homepage-start__form { display: grid; gap: 14px; margin: 0; }

  .homepage-start__address {
    display: flex;
    min-width: 0;
    align-items: baseline;
    color: var(--homepage-muted);
    font: 500 clamp(2.15rem, 4vw, 4.15rem) / .96 var(--homepage-display);
    letter-spacing: -.055em;
    cursor: text;
  }

  .homepage-start__address span {
    flex: 0 0 auto;
    color: #85858f;
  }

  .homepage-start__address input {
    width: min(12ch, 100%);
    min-width: 0;
    margin: 0;
    padding: 0 0 7px;
    border: 0;
    border-bottom: 2px solid rgba(255,255,255,.18);
    border-radius: 0;
    outline: 0;
    background: transparent;
    color: var(--homepage-text);
    caret-color: #f5f5f7;
    font: inherit;
    font-weight: 600;
    letter-spacing: inherit;
    line-height: inherit;
    text-shadow: 0 0 34px rgba(255,255,255,.08);
  }

  .homepage-start__address input::placeholder { color: var(--homepage-text); opacity: .94; }

  .homepage-start__address input:focus {
    border-bottom-color: #5ebae3;
    box-shadow: 0 10px 24px -18px rgba(94,186,227,.9);
  }

  .homepage-start__address--invalid input {
    border-bottom-color: #f38ba8;
  }

  .homepage-start__address--owned {
    font-size: clamp(2rem, 3.5vw, 3.5rem);
    cursor: default;
  }

  .homepage-start__address--owned strong {
    color: var(--homepage-text);
    font-weight: 600;
  }

  .homepage-start__address-note {
    max-width: 490px;
    margin: 2px 0 4px;
    color: var(--homepage-secondary-muted);
    font-size: .92rem;
    line-height: 1.55;
  }

  .homepage-start .homepage-button {
    width: min(100%, 460px);
    min-height: 58px;
    color: #08080a;
  }

  button.homepage-button {
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .homepage-start__signin {
    display: inline-flex;
    width: fit-content;
    min-height: 40px;
    align-items: center;
    color: var(--homepage-secondary-muted);
    font-size: .9rem;
    text-underline-offset: 4px;
  }

  a:focus-visible,
  button:focus-visible,
  input:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  .homepage-start__address input:focus-visible { outline: 0; }

  @media (max-width: 900px) {
    .homepage-start { grid-template-columns: 1fr; gap: 42px; padding-block: 72px; }
    .homepage-start__action { justify-self: start; }
  }

  @media (max-width: 560px) {
    .homepage-start { padding-block: 58px; }
    .homepage-start__address { font-size: clamp(1.9rem, 10vw, 2.8rem); }
    .homepage-start__address input { width: min(11ch, 100%); }
  }
</style>
