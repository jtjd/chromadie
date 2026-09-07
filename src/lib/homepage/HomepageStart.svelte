<script>
  import { createEventDispatcher } from 'svelte';
  import { ACCOUNT_STATES } from '../authState.js';
  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  const dispatch = createEventDispatcher();
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
      <div class="homepage-start__address" aria-label="Example profile address">
        <span>chm.lol/</span><strong>yourname</strong>
      </div>
      <p class="homepage-start__address-note">One address for your links, colors, collection, and profile style.</p>
      <a class="homepage-button" href="/signup?next=%2Fprofile%2Fsettings">Create a free profile</a>
      <a class="homepage-start__signin" href="/login?next=%2Fprofile%2Fsettings">Already have an account? Sign in</a>
    {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
      <p role="alert">Account details couldn’t load.</p><button class="homepage-button" type="button" on:click={() => dispatch('retry')}>Retry account</button>
    {:else}<p role="status">Loading your account…</p>{/if}
  </div>
</section>

<style>
  .homepage-start {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(460px, 1.1fr);
    align-items: center;
    gap: clamp(64px, 8vw, 128px);
    padding-block: 112px;
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
    gap: 16px;
  }

  .homepage-start__address {
    display: flex;
    min-width: 0;
    align-items: baseline;
    flex-wrap: wrap;
    color: var(--homepage-muted);
    font: 500 clamp(2.15rem, 4vw, 4.15rem) / .96 var(--homepage-display);
    letter-spacing: -.055em;
  }

  .homepage-start__address span { color: #6f6f79; }
  .homepage-start__address strong {
    position: relative;
    color: var(--homepage-text);
    font-weight: 600;
    text-shadow: 0 0 34px rgba(255,255,255,.08);
  }

  .homepage-start__address strong::after {
    position: absolute;
    right: 0;
    bottom: -8px;
    left: 0;
    height: 2px;
    content: '';
    background: linear-gradient(90deg, #5ebae3, #cba6f7 52%, #f5c2e7);
    transform: scaleX(.46);
    transform-origin: left;
    transition: transform .28s ease;
  }

  .homepage-start:hover .homepage-start__address strong::after { transform: scaleX(1); }
  .homepage-start__address--owned { font-size: clamp(2rem, 3.5vw, 3.5rem); }

  .homepage-start__address-note {
    max-width: 490px;
    margin: 4px 0 6px;
    color: var(--homepage-secondary-muted);
    font-size: .92rem;
    line-height: 1.55;
  }

  .homepage-start .homepage-button {
    width: min(100%, 420px);
    min-height: 54px;
    color: #08080a;
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
  button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }

  @media (max-width: 900px) {
    .homepage-start { grid-template-columns: 1fr; gap: 42px; padding-block: 76px; }
    .homepage-start__action { justify-self: start; }
  }

  @media (max-width: 560px) {
    .homepage-start { padding-block: 60px; }
    .homepage-start__address { font-size: clamp(1.9rem, 10vw, 2.8rem); }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-start__address strong::after { transition: none; }
  }
</style>
