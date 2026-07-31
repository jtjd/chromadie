<script>
  import { createEventDispatcher } from 'svelte';
  import { isUsernameShapeValid } from './usernamePolicy.js';
  import { trackProductEvent } from './productAnalytics.js';
  import HomeRollShowcase from './HomeRollShowcase.svelte';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
  let claimUsername = '';
  let claimError = '';
  let claimStarted = false;

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
  <section class="home-page__hero">
    <div class="home-page__copy">
      <p class="home-page__eyebrow">chm.lol · public identity</p>
      <h1 id="home-title">A customizable public profile with a daily color roll.</h1>
      <p class="home-page__intro">Add your own background, avatar, music, links, and personal content. Roll once each day to collect colors, unlock profile effects, and move up the leaderboard.</p>
      <p class="home-page__supporting">Strong rolls make your profile easier to discover.</p>

      <div class="home-page__actions">
        {#if isAuthenticated}
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

    <HomeRollShowcase />
  </section>

  <section class="home-page__section home-page__loop" aria-labelledby="loop-title">
    <div class="home-page__section-heading">
      <p class="home-page__eyebrow">the daily loop</p>
      <h2 id="loop-title">One roll each day</h2>
      <a class="home-page__guide-link" href="/how-to-play">How to play <span aria-hidden="true">↗</span></a>
    </div>
    <div class="home-page__loop-layout">
      <div class="home-page__steps" aria-label="Roll a color, earn EP, move up the leaderboard, and get discovered">
        <span><b>01</b>Roll a color</span><i aria-hidden="true">→</i><span><b>02</b>Earn EP</span><i aria-hidden="true">→</i><span><b>03</b>Move up the leaderboard</span><i aria-hidden="true">→</i><span><b>04</b>Get discovered</span>
      </div>
      <div class="home-page__loop-detail">
        <div class="home-page__roll-result"><span style="background:#B666C9" aria-hidden="true"></span><div><strong>#B666C9</strong><small>today’s color · strong roll</small></div></div>
        <div class="home-page__leaderboard-preview"><span>leaderboard</span><strong>#12&nbsp; @neonuser</strong><small>public profile · links · music</small></div>
      </div>
    </div>
    <p class="home-page__loop-copy">Your color is scored from its RGB values and special conditions. Strong rolls earn more EP and improve your leaderboard position. Profiles on the leaderboard and discovery pages can lead visitors to your links, music, projects, or other content.</p>
  </section>

</main>

<style>
  .home-page { width: min(100%, 78rem); margin-inline: auto; padding: 3rem clamp(1.25rem, 4vw, 3rem) 6rem; color: var(--color-ink-strong); }
  .home-page__hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(22rem, 34rem); align-items: center; gap: clamp(2rem, 7vw, 7rem); min-height: min(48rem, calc(100dvh - 5rem)); padding-block: clamp(3rem, 8vh, 7rem); }
  .home-page__copy { max-width: 38rem; }
  .home-page__eyebrow { margin: 0; color: var(--color-ink-faint); font: 500 .68rem/1.2 var(--font-mono-stack); letter-spacing: .1em; text-transform: lowercase; }
  .home-page h1 { max-width: 42rem; margin: 1.25rem 0 0; font: 700 clamp(2.7rem, 4.4vw, 4.7rem)/.96 var(--font-display-stack); letter-spacing: -.055em; text-wrap: balance; }
  .home-page__intro { max-width: 34rem; margin: 1.7rem 0 0; color: var(--color-ink-muted); font-size: clamp(1rem, 1.4vw, 1.16rem); line-height: 1.55; }
  .home-page__supporting { margin: .8rem 0 0; color: var(--color-accent-bright); font: 500 .78rem/1.4 var(--font-mono-stack); }
  .home-page__actions { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 1rem 1.25rem; margin-top: 2rem; }
  .home-page__claim { display: grid; gap: .55rem; min-width: min(100%, 22rem); }
  .home-page__claim label { color: var(--color-ink-strong); font: 600 .82rem/1 var(--font-body-stack); }
  .home-page__claim-field { display: flex; align-items: center; min-height: 2.9rem; border: 1px solid rgba(233,235,239,.28); border-radius: var(--radius-sm); background: rgba(7,8,11,.42); color: var(--color-ink-faint); font: 500 .78rem/1 var(--font-mono-stack); }
  .home-page__claim-field > span { padding-left: .8rem; }
  .home-page__claim-field input { width: 8rem; min-width: 0; padding: .78rem .25rem; border: 0; outline: 0; background: transparent; color: var(--color-ink-strong); font: inherit; }
  .home-page__claim-field input:focus-visible { outline: 1px solid var(--color-accent-bright); outline-offset: -2px; }
  .home-page__claim-field button { align-self: stretch; margin-left: auto; padding-inline: 1rem; border: 0; border-left: 1px solid rgba(233,235,239,.18); background: rgba(139,124,246,.16); color: var(--color-ink-strong); font: 600 .78rem/1 var(--font-body-stack); cursor: pointer; }
  .home-page__claim-field button:hover { background: rgba(139,124,246,.3); }
  .home-page__claim small { color: var(--color-ink-faint); font: 500 .68rem/1.35 var(--font-mono-stack); }
  .home-page__claim-error { color: var(--color-danger) !important; }
  .home-page__primary, .home-page__secondary { min-height: 2.75rem; padding: .65rem 1rem; border-radius: var(--radius-sm); font: 600 .82rem/1 var(--font-body-stack); cursor: pointer; }
  .home-page__primary { border: 1px solid rgba(214,255,99,.42); background: rgba(214,255,99,.12); color: #e7f6b7; }
  .home-page__primary:hover { background: rgba(214,255,99,.2); }
  .home-page__secondary { border: 1px solid rgba(233,235,239,.2); background: transparent; color: var(--color-ink-muted); }
  .home-page__secondary:hover { border-color: var(--color-accent-bright); color: var(--color-ink-strong); }
  .home-page__section { padding-top: clamp(5rem, 10vw, 9rem); }
  .home-page__section-heading h2 { margin: .55rem 0 0; font: 700 clamp(2rem, 4vw, 3.4rem)/1 var(--font-display-stack); letter-spacing: -.045em; }
  .home-page__section-heading > p:last-child { margin: .8rem 0 0; color: var(--color-ink-muted); font-size: 1rem; }
  .home-page__guide-link { display: inline-flex; gap: .4rem; align-items: center; margin-top: 1rem; color: var(--color-accent-bright); font: 600 .76rem/1 var(--font-mono-stack); text-decoration: none; }
  .home-page__guide-link:hover { color: var(--color-ink-strong); }
  .home-page__loop { margin-top: 1rem; padding: clamp(2rem, 4vw, 3rem); border: 1px solid rgba(139,124,246,.2); border-radius: 1.2rem; background: radial-gradient(circle at 85% 0%, rgba(139,124,246,.12), transparent 34%), linear-gradient(135deg, rgba(21,16,29,.7), rgba(8,11,17,.72)); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 1.5rem 4rem rgba(0,0,0,.16); }
  .home-page__loop-layout { display: grid; gap: 1.4rem; margin-top: 2rem; }
  .home-page__steps { display: flex; align-items: center; gap: .55rem; padding: .7rem; border: 1px solid rgba(255,255,255,.1); border-radius: .85rem; background: rgba(5,7,13,.38); color: var(--color-ink-strong); font: 600 clamp(.82rem, 1.25vw, 1rem)/1.2 var(--font-body-stack); }
  .home-page__steps span { display: flex; flex: 1; align-items: baseline; gap: .45rem; min-width: 0; padding: .7rem .55rem; }
  .home-page__steps b { color: var(--color-accent-bright); font: 500 .58rem/1 var(--font-mono-stack); }
  .home-page__steps i { color: var(--color-accent-bright); font-style: normal; }
  .home-page__loop-detail { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .8rem; }
  .home-page__roll-result, .home-page__leaderboard-preview { display: flex; align-items: center; gap: .7rem; min-height: 4.7rem; padding: 1rem; border: 1px solid rgba(255,255,255,.14); border-radius: .8rem; background: rgba(7,9,16,.6); }
  .home-page__roll-result > span { width: 2.25rem; height: 2.25rem; border-radius: .55rem; box-shadow: 0 0 1.4rem rgba(182,102,201,.42); }
  .home-page__roll-result strong, .home-page__leaderboard-preview strong { display: block; font: 700 1rem/1 var(--font-display-stack); }
  .home-page__roll-result small, .home-page__leaderboard-preview small, .home-page__leaderboard-preview > span { display: block; margin-top: .3rem; color: var(--color-ink-faint); font: 500 .58rem/1.2 var(--font-mono-stack); }
  .home-page__leaderboard-preview { display: block; }
  .home-page__leaderboard-preview strong { margin-top: .5rem; color: #d6ff63; }
  .home-page__loop-copy { max-width: 58rem; margin: 1.4rem 0 0; color: var(--color-ink-muted); font-size: .88rem; line-height: 1.55; }
  @media (max-width: 48rem) { .home-page { padding-top: 1rem; } .home-page__hero { grid-template-columns: 1fr; min-height: auto; gap: 3rem; padding-block: 3.5rem 2rem; } .home-page__steps { flex-wrap: wrap; } .home-page__steps span { flex: 1 1 calc(50% - 1rem); } .home-page__steps i { display: none; } }
  @media (max-width: 36rem) { .home-page { padding-inline: 1.1rem; } .home-page h1 { font-size: clamp(2.55rem, 12vw, 3.7rem); } .home-page__actions { align-items: stretch; flex-direction: column; } .home-page__claim { width: 100%; } .home-page__claim-field input { flex: 1; width: auto; } .home-page__steps { align-items: stretch; flex-direction: column; gap: .2rem; } .home-page__steps span { flex: none; } .home-page__loop-detail { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .home-page button { transition: none; } }
</style>
