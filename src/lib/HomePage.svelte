<script>
  import { createEventDispatcher } from 'svelte';
  import { isUsernameShapeValid } from './usernamePolicy.js';
  import { trackProductEvent } from './productAnalytics.js';
  import CompactRollPreview from './CompactRollPreview.svelte';
  import { guestRollFixture } from './guestRollFixture.js';
  import HomepageProfileDirectory from './HomepageProfileDirectory.svelte';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
  let claimUsername = '';
  let claimError = '';
  let claimStarted = false;
  let claimInput;
  const sampleRoll = guestRollFixture;

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  function focusClaim() {
    claimInput?.scrollIntoView?.({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    });
    claimInput?.focus();
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
    <HomepageProfileDirectory on:navigate={forwardAction}>
      <section class="home-page__copy homepage-hero-intro" slot="intro" aria-labelledby="home-title">
        <p class="home-page__eyebrow">Public profiles / one roll daily</p>
        <h1 id="home-title">Public profiles.<br />One color roll a day.</h1>
        <p class="home-page__intro">Add your background, music, links, projects, or whatever else you want. <strong>Your daily color changes where the profile appears.</strong></p>

        {#if isAuthenticated}
          <div class="home-page__signed-in-actions" aria-label="Your profile actions">
            <p class="home-page__action-label">Your profile</p>
            <div>
              <button class="home-page__primary" type="button" on:click={() => dispatch('profile')}>View your profile <span aria-hidden="true">↗</span></button>
              <button class="home-page__secondary" type="button" on:click={() => dispatch('roll')}>Roll today’s color</button>
            </div>
          </div>
        {:else}
          <form class="home-page__claim" on:submit|preventDefault={() => submitClaim()} aria-label="Claim your profile URL">
            <label for="home-claim-username">Claim your username</label>
            <div class="home-page__claim-field">
              <span aria-hidden="true">chm.lol/</span>
              <input bind:this={claimInput} id="home-claim-username" bind:value={claimUsername} on:focus={beginClaim} on:input={beginClaim} placeholder="username" autocomplete="nickname" spellcheck="false" minlength="3" maxlength="20" aria-describedby={claimError ? 'home-claim-error' : 'home-claim-hint'} />
              <button type="submit">Claim</button>
            </div>
            <small id={claimError ? 'home-claim-error' : 'home-claim-hint'} class:home-page__claim-error={claimError} aria-live="polite">{claimError || 'Free · One roll every 24 hours'}</small>
          </form>
        {/if}
      </section>
    </HomepageProfileDirectory>

    <section class="home-page__mechanic" aria-labelledby="home-roll-title">
      <div class="home-page__mechanic-copy">
        <p class="home-page__eyebrow">The daily ritual</p>
        <h2 id="home-roll-title">Roll once a day. <span>Your score changes your position.</span></h2>
        <p>Higher profiles are seen by more people. Every roll becomes another detail in the page you are building.</p>
      </div>

      <aside class="home-page__roll-demo" aria-label="Sample roll preview">
        <div class="home-page__roll-demo-label">Sample roll</div>
        <div class="home-page__roll-demo-body">
          <CompactRollPreview displayColor={sampleRoll.hex} rarity={sampleRoll.rarity} size="4rem" scale={0.34} />
          <div>
            <strong>{Number(sampleRoll.score).toLocaleString()}</strong>
            <small>{sampleRoll.hex} / {sampleRoll.rarity}</small>
          </div>
        </div>
        <div class="home-page__roll-demo-note">Presentation only · your roll is server-authoritative</div>
      </aside>
    </section>

    <section class="home-page__final" aria-labelledby="final-claim-title">
      <div class="home-page__final-copy">
        <p class="home-page__eyebrow">Start with your username</p>
        <h2 id="final-claim-title">Claim<br />your page.</h2>
      </div>
      <div class="home-page__final-action">
        <p>Choose a username, customize your page, and roll your first color.</p>
        {#if isAuthenticated}
          <button class="home-page__primary" type="button" on:click={() => dispatch('profile')}>View your profile <span aria-hidden="true">↗</span></button>
        {:else}
          <button class="home-page__primary" type="button" on:click={focusClaim}>Claim your profile <span aria-hidden="true">↑</span></button>
        {/if}
      </div>
    </section>
  </div>
</main>

<style>
  .home-page {
    --home-canvas: #080908;
    --home-surface: #0e100e;
    --home-ink: #f1f3ed;
    --home-ink-muted: #a4a9a0;
    --home-ink-faint: #737970;
    --home-line: rgba(241, 243, 237, 0.13);
    --home-line-strong: rgba(241, 243, 237, 0.24);
    --home-color: var(--color-accent);
    --home-link: var(--color-accent-cyan);
    --home-font: 'Instrument Sans Variable', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
    --home-mono: 'IBM Plex Mono', ui-monospace, monospace;
    position: relative;
    width: 100%;
    min-height: 100%;
    overflow: hidden;
    color: var(--home-ink);
    background: var(--home-canvas);
    font-family: var(--home-font);
    isolation: isolate;
  }

  .home-page::before { position: absolute; z-index: -1; inset: 0; content: ''; background-image: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0 0.4px, transparent 0.55px); background-size: 19px 19px; opacity: 0.12; pointer-events: none; }
  .home-page__inner { width: min(100%, 94rem); margin-inline: auto; padding: 0 clamp(1.1rem, 3vw, 2.5rem) clamp(5rem, 9vw, 8rem); }
  .home-page__copy { max-width: 34rem; }
  .home-page__eyebrow, .home-page__action-label { margin: 0; color: var(--home-ink-faint); font: 600 0.63rem / 1.2 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-page h1 { max-width: 38rem; margin: 1rem 0 0; color: var(--home-ink); font: 650 clamp(3rem, 5.1vw, 5.7rem) / 0.9 var(--home-font); letter-spacing: -0.055em; text-wrap: balance; }
  .home-page__intro { max-width: 32rem; margin: 1.55rem 0 0; color: var(--home-ink-muted); font-size: clamp(0.95rem, 1.25vw, 1.08rem); line-height: 1.48; }
  .home-page__intro strong { color: var(--home-ink); font-weight: 650; }
  .home-page__claim { display: grid; gap: 0.5rem; width: min(100%, 30rem); margin-top: 1.7rem; }
  .home-page__claim label { color: var(--home-ink); font: 600 0.78rem / 1 var(--home-font); }
  .home-page__claim-field { display: flex; align-items: center; min-height: 2.9rem; overflow: hidden; border: 1px solid var(--home-line-strong); border-radius: 0.45rem; background: var(--home-surface); color: var(--home-ink-faint); font: 400 0.72rem / 1 var(--home-mono); }
  .home-page__claim-field:focus-within { border-color: color-mix(in srgb, var(--home-link) 62%, var(--home-line-strong)); }
  .home-page__claim-field > span { padding-left: 0.8rem; white-space: nowrap; }
  .home-page__claim-field input { flex: 1; width: auto; min-width: 0; padding: 0.78rem 0.3rem; border: 0; outline: 0; background: transparent; color: var(--home-ink); font: inherit; }
  .home-page__claim-field input::placeholder { color: rgba(241, 243, 237, 0.36); }
  .home-page__claim-field button { align-self: stretch; flex: 0 0 auto; min-width: 4.4rem; padding-inline: 0.9rem; border: 0; border-left: 1px solid var(--home-line); background: var(--home-color); color: #11140d; font: 650 0.76rem / 1 var(--home-font); cursor: pointer; }
  .home-page__claim-field button:hover, .home-page__primary:hover { background: var(--color-accent-bright); }
  .home-page__claim small { color: var(--home-ink-faint); font: 400 0.63rem / 1.35 var(--home-mono); }
  .home-page__claim-error { color: #ff8791 !important; }
  .home-page__signed-in-actions { display: grid; gap: 0.65rem; margin-top: 1.8rem; }
  .home-page__signed-in-actions > div { display: flex; flex-wrap: wrap; gap: 0.55rem; }
  .home-page__primary, .home-page__secondary { min-height: 2.85rem; padding: 0.68rem 0.9rem; border-radius: 0.45rem; font: 650 0.76rem / 1 var(--home-font); cursor: pointer; }
  .home-page__primary { border: 1px solid var(--home-color); background: var(--home-color); color: #11140d; }
  .home-page__secondary { border: 1px solid var(--home-line-strong); background: var(--home-surface); color: var(--home-ink-muted); }
  .home-page__secondary:hover { border-color: var(--home-ink-muted); color: var(--home-ink); }
  .home-page__mechanic { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, 18rem); align-items: center; gap: clamp(1.5rem, 6vw, 6rem); margin-top: clamp(4rem, 9vw, 7rem); padding: clamp(2.5rem, 5vw, 4.5rem) 0; border-top: 1px solid var(--home-line); border-bottom: 1px solid var(--home-line); }
  .home-page__mechanic-copy { max-width: 46rem; }
  .home-page__mechanic-copy h2 { max-width: 42rem; margin: 0.55rem 0 0; color: var(--home-ink); font: 650 clamp(2.2rem, 4.2vw, 4.1rem) / 0.98 var(--home-font); letter-spacing: -0.055em; }
  .home-page__mechanic-copy h2 span { color: var(--home-ink-faint); }
  .home-page__mechanic-copy > p:last-child { max-width: 34rem; margin: 1rem 0 0; color: var(--home-ink-muted); font-size: 0.94rem; line-height: 1.55; }
  .home-page__roll-demo { overflow: hidden; border: 1px solid var(--home-line); background: var(--home-surface); }
  .home-page__roll-demo-label { padding: 0.78rem 0.9rem; border-bottom: 1px solid var(--home-line); color: var(--home-ink-faint); font: 600 0.59rem / 1 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-page__roll-demo-body { display: grid; grid-template-columns: 4rem minmax(0, 1fr); align-items: center; gap: 0.8rem; min-height: 6.2rem; padding: 1rem; }
  .home-page__roll-demo-body strong { display: block; color: var(--home-ink); font: 700 1.8rem / 0.95 var(--home-font); letter-spacing: -0.05em; }
  .home-page__roll-demo-body small { display: block; margin-top: 0.4rem; color: var(--home-ink-faint); font: 600 0.57rem / 1.2 var(--home-mono); }
  .home-page__roll-demo-note { padding: 0.7rem 0.9rem; border-top: 1px solid var(--home-line); color: var(--home-ink-faint); font: 400 0.55rem / 1.35 var(--home-mono); }
  .home-page__final { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, 28rem); align-items: end; gap: clamp(2rem, 6vw, 6rem); margin-top: 0; padding: clamp(4rem, 8vw, 7rem) 0 clamp(5rem, 9vw, 8rem); border-top: 1px solid var(--home-line); }
  .home-page__final h2 { margin: 0.55rem 0 0; color: var(--home-ink); font: 650 clamp(3.8rem, 8vw, 7rem) / 0.9 var(--home-font); letter-spacing: -0.065em; }
  .home-page__final-action p { max-width: 24rem; margin: 0; color: var(--home-ink-muted); font-size: 0.94rem; line-height: 1.55; }
  .home-page__final .home-page__primary { margin-top: 1.4rem; }

  @media (min-width: 64rem) {
    .home-page h1 { max-width: 38rem; font-size: clamp(3.4rem, 4.5vw, 5.2rem); }
  }

  @media (max-width: 48rem) {
    .home-page__inner { padding-bottom: 5rem; }
    .home-page h1 { max-width: 31rem; font-size: clamp(2.8rem, 11vw, 4.5rem); }
    .home-page__intro { margin-top: 1.2rem; }
    .home-page__mechanic, .home-page__final { grid-template-columns: 1fr; gap: 1.5rem; }
    .home-page__roll-demo { width: min(100%, 22rem); }
  }

  @media (max-width: 36rem) {
    .home-page__claim { width: 100%; }
    .home-page__claim-field { min-height: 3rem; }
    .home-page__signed-in-actions > div { align-items: stretch; flex-direction: column; }
    .home-page__roll-demo { width: 100%; }
    .home-page__final h2 { font-size: clamp(3.6rem, 18vw, 5.5rem); }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-page button { transition: none; }
  }
</style>
