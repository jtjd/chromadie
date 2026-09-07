<script>
  import { createEventDispatcher } from 'svelte';
  import { ACCOUNT_STATES } from '../authState.js';
  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  const dispatch = createEventDispatcher();
</script>

<section class="homepage-section homepage-start" aria-labelledby="homepage-start-title">
  <div>
    <h2 class="homepage-section-heading" id="homepage-start-title">{isAuthenticated ? 'Make a few changes.' : 'Make your own profile.'}</h2>
    <p class="homepage-section-sub">{isAuthenticated ? 'Update your layout, add your links, or try a different effect.' : 'Save future rolls, collect conditions, and customize your page.'}</p>
  </div>
  <div class="homepage-start__action">
    {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
      <a class="homepage-button" href="/profile/settings">Customize your profile</a>
    {:else if accountState === ACCOUNT_STATES.SIGNED_OUT && !isAuthenticated}
      <span class="homepage-start__address" aria-label="Example profile address">chm.lol/<strong>yourname</strong></span>
      <a class="homepage-button" href="/signup?next=%2Fprofile%2Fsettings">Create a free profile</a>
      <a class="homepage-start__signin" href="/login?next=%2Fprofile%2Fsettings">Already have an account? Sign in</a>
    {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
      <p role="alert">Account details couldn’t load.</p><button class="homepage-button" type="button" on:click={() => dispatch('retry')}>Retry account</button>
    {:else}<p role="status">Loading your account…</p>{/if}
  </div>
</section>

<style>
  .homepage-start { display: grid; grid-template-columns: 1.2fr 1fr; align-items: center; gap: 64px; padding-block: 80px; border-top: 1px solid var(--homepage-border); }
  .homepage-start__action { display: grid; justify-items: stretch; gap: 16px; width: min(100%, 360px); justify-self: end; text-align: center; }
  .homepage-start__address { font: 500 clamp(1.2rem, 2.5vw, 1.75rem) / 1.3 var(--homepage-display); color: var(--homepage-muted); }
  .homepage-start__address strong { color: var(--homepage-text); font-weight: 500; }
  .homepage-start .homepage-button { min-height: 52px; color: #08080a; }
  .homepage-start__signin { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; color: var(--homepage-secondary-muted); font-size: 1rem; text-underline-offset: 4px; }
  a:focus-visible, button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 780px) { .homepage-start { grid-template-columns: 1fr; gap: 32px; padding-block: 56px; } .homepage-start__action { justify-self: start; } }
</style>
