<script>
  import { createEventDispatcher } from 'svelte';
  import { isUsernameShapeValid } from './usernamePolicy.js';
  import { trackProductEvent } from './productAnalytics.js';
  import { HOMEPAGE_DEMO_PROFILES } from './homepageDemoData.js';
  import HomeRollShowcase from './HomeRollShowcase.svelte';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
  let claimUsername = '';
  let finalClaimUsername = '';
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

  function openExplore() {
    trackProductEvent('explore_clicked');
    dispatch('explore');
  }

  function openExample() {
    trackProductEvent('example_profile_opened');
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
          <button class="home-page__secondary" type="button" on:click={openExplore}>Explore profiles <span aria-hidden="true">↗</span></button>
        {/if}
      </div>
    </div>

    <HomeRollShowcase />
  </section>

  <section class="home-page__section home-page__examples" aria-labelledby="examples-title">
    <div class="home-page__section-heading">
      <p class="home-page__eyebrow">make it yours</p>
      <h2 id="examples-title">Example profiles</h2>
      <p>Every profile can carry a different point of view.</p>
    </div>
    <div class="home-page__example-grid">
      {#each HOMEPAGE_DEMO_PROFILES as demo (demo.id)}
        <article class="demo-profile" style={`--demo-bg: ${demo.background}; --demo-avatar: ${demo.avatar}; --demo-accent: ${demo.accent}; --demo-color: ${demo.color};`}>
          <div class="demo-profile__topline"><span>{demo.label}</span><span aria-hidden="true">↗</span></div>
          <div class="demo-profile__identity">
            <span class="demo-profile__avatar" aria-hidden="true"></span>
            <div><strong>@{demo.username}</strong><p>{demo.bio}</p></div>
          </div>
          <div class="demo-profile__meta"><span>{demo.music}</span><span>rank {demo.rank}</span></div>
          <div class="demo-profile__links">{#each demo.links as link (link)}<span>{link}</span>{/each}</div>
          <div class="demo-profile__color"><span aria-hidden="true"></span><span>{demo.color}</span><small>{demo.effect}</small></div>
          <a class="demo-profile__open" href={`/u/${demo.username}`} on:click={openExample}>Open full profile <span aria-hidden="true">↗</span></a>
        </article>
      {/each}
    </div>
  </section>

  <section class="home-page__section home-page__loop" aria-labelledby="loop-title">
    <div class="home-page__section-heading">
      <p class="home-page__eyebrow">the daily loop</p>
      <h2 id="loop-title">One roll each day</h2>
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

  <section class="home-page__final" aria-labelledby="final-claim-title">
    <p class="home-page__eyebrow">your page starts here</p>
    <h2 id="final-claim-title">Claim your profile</h2>
    <p>Choose a username, customize your page, and roll your first color.</p>
    {#if isAuthenticated}
      <button class="home-page__primary" type="button" on:click={() => dispatch('profile')}>View your profile <span aria-hidden="true">↗</span></button>
    {:else}
      <form class="home-page__claim home-page__claim--final" on:submit|preventDefault={() => submitClaim(finalClaimUsername)} aria-label="Claim your profile URL">
        <label for="home-final-username">Claim your username</label>
        <div class="home-page__claim-field"><span aria-hidden="true">chm.lol/</span><input id="home-final-username" bind:value={finalClaimUsername} on:focus={beginClaim} on:input={beginClaim} placeholder="username" autocomplete="nickname" spellcheck="false" minlength="3" maxlength="20" aria-describedby="home-final-hint" /><button type="submit">Claim</button></div>
        <small id="home-final-hint" class:home-page__claim-error={claimError} aria-live="polite">{claimError || 'Free to use · One roll each day'}</small>
      </form>
    {/if}
  </section>
</main>

<style>
  .home-page { width: min(100%, 78rem); margin-inline: auto; padding: 3rem clamp(1.25rem, 4vw, 3rem) 6rem; color: var(--color-ink-strong); }
  .home-page__hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(22rem, 34rem); align-items: center; gap: clamp(2rem, 7vw, 7rem); min-height: min(48rem, calc(100dvh - 5rem)); padding-block: clamp(3rem, 8vh, 7rem); }
  .home-page__copy { max-width: 38rem; }
  .home-page__eyebrow { margin: 0; color: var(--color-ink-faint); font: 500 .68rem/1.2 var(--font-mono-stack); letter-spacing: .1em; text-transform: lowercase; }
  .home-page h1 { max-width: 34rem; margin: 1.25rem 0 0; font: 700 clamp(2.8rem, 5.5vw, 5.4rem)/.98 var(--font-display-stack); letter-spacing: -.055em; text-wrap: balance; }
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
  .home-page__section-heading h2, .home-page__final h2 { margin: .55rem 0 0; font: 700 clamp(2rem, 4vw, 3.4rem)/1 var(--font-display-stack); letter-spacing: -.045em; }
  .home-page__section-heading > p:last-child, .home-page__final > p { margin: .8rem 0 0; color: var(--color-ink-muted); font-size: 1rem; }
  .home-page__example-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 2rem; }
  .demo-profile { position: relative; min-height: 24rem; display: flex; flex-direction: column; padding: 1.2rem; border: 1px solid rgba(255,255,255,.14); border-radius: 1rem; overflow: hidden; isolation: isolate; background: var(--demo-bg); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
  .demo-profile::after { content: ''; position: absolute; inset: 0; z-index: -1; background: radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--demo-accent), transparent 72%), transparent 38%); pointer-events: none; }
  .demo-profile__topline, .demo-profile__meta, .demo-profile__color { display: flex; align-items: center; justify-content: space-between; gap: .75rem; color: rgba(245,247,255,.62); font: 500 .62rem/1.2 var(--font-mono-stack); }
  .demo-profile__identity { display: flex; align-items: center; gap: .8rem; margin-top: 3.8rem; }
  .demo-profile__avatar { flex: 0 0 3.8rem; width: 3.8rem; height: 3.8rem; border: 2px solid color-mix(in srgb, var(--demo-accent), transparent 45%); border-radius: 50%; background: var(--demo-avatar); box-shadow: 0 0 1.5rem color-mix(in srgb, var(--demo-accent), transparent 72%); }
  .demo-profile__identity strong { font: 700 1.45rem/1 var(--font-display-stack); }
  .demo-profile__identity p { max-width: 15rem; margin: .45rem 0 0; color: rgba(245,247,255,.72); font-size: .78rem; line-height: 1.35; }
  .demo-profile__meta { margin-top: 1.4rem; padding-top: .8rem; border-top: 1px solid rgba(255,255,255,.14); }
  .demo-profile__links { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .8rem; color: rgba(245,247,255,.8); font: 500 .65rem/1 var(--font-mono-stack); }
  .demo-profile__links span { padding: .35rem .48rem; border: 1px solid rgba(255,255,255,.2); border-radius: var(--radius-pill); }
  .demo-profile__color { justify-content: flex-start; margin-top: auto; padding-top: 1rem; color: rgba(245,247,255,.72); }
  .demo-profile__color > span:first-child { width: 1rem; height: 1rem; border-radius: 50%; background: var(--demo-color); box-shadow: 0 0 .8rem color-mix(in srgb, var(--demo-color), transparent 25%); }
  .demo-profile__color small { margin-left: auto; color: rgba(245,247,255,.58); }
  .demo-profile__open { display: flex; justify-content: space-between; margin-top: 1.2rem; padding-top: .9rem; border-top: 1px solid rgba(255,255,255,.14); color: var(--color-ink-strong); font: 600 .76rem/1 var(--font-body-stack); text-decoration: none; }
  .demo-profile__open:hover { color: var(--demo-accent); }
  .home-page__loop-layout { display: grid; grid-template-columns: 1.25fr .75fr; gap: 2rem; margin-top: 2rem; }
  .home-page__steps { display: flex; align-items: center; flex-wrap: wrap; gap: .7rem; color: var(--color-ink-strong); font: 600 clamp(.9rem, 1.5vw, 1.15rem)/1.2 var(--font-body-stack); }
  .home-page__steps span { display: inline-flex; align-items: baseline; gap: .45rem; }
  .home-page__steps b { color: var(--color-ink-faint); font: 500 .6rem/1 var(--font-mono-stack); }
  .home-page__steps i { color: var(--color-accent-bright); font-style: normal; }
  .home-page__loop-detail { display: grid; gap: .65rem; }
  .home-page__roll-result, .home-page__leaderboard-preview { display: flex; align-items: center; gap: .7rem; padding: .75rem; border: 1px solid rgba(255,255,255,.12); border-radius: .7rem; background: rgba(12,14,20,.52); }
  .home-page__roll-result > span { width: 2.25rem; height: 2.25rem; border-radius: .55rem; box-shadow: 0 0 1.4rem rgba(182,102,201,.42); }
  .home-page__roll-result strong, .home-page__leaderboard-preview strong { display: block; font: 700 1rem/1 var(--font-display-stack); }
  .home-page__roll-result small, .home-page__leaderboard-preview small, .home-page__leaderboard-preview > span { display: block; margin-top: .3rem; color: var(--color-ink-faint); font: 500 .58rem/1.2 var(--font-mono-stack); }
  .home-page__leaderboard-preview { display: block; }
  .home-page__leaderboard-preview strong { margin-top: .5rem; color: #d6ff63; }
  .home-page__loop-copy { max-width: 58rem; margin: 1.5rem 0 0; color: var(--color-ink-muted); font-size: .92rem; line-height: 1.55; }
  .home-page__final { display: grid; justify-items: start; padding-top: clamp(6rem, 12vw, 11rem); }
  .home-page__claim--final { margin-top: 1.8rem; }
  @media (max-width: 48rem) { .home-page { padding-top: 1rem; } .home-page__hero { grid-template-columns: 1fr; min-height: auto; gap: 3rem; padding-block: 3.5rem 2rem; } .home-page__example-grid, .home-page__loop-layout { grid-template-columns: 1fr; } .demo-profile { min-height: 22rem; } }
  @media (max-width: 36rem) { .home-page { padding-inline: 1.1rem; } .home-page h1 { font-size: clamp(2.55rem, 12vw, 3.7rem); } .home-page__actions { align-items: stretch; flex-direction: column; } .home-page__claim { width: 100%; } .home-page__claim-field input { flex: 1; width: auto; } .home-page__steps { align-items: flex-start; flex-direction: column; gap: .8rem; } .home-page__steps i { display: none; } }
  @media (prefers-reduced-motion: reduce) { .home-page button, .home-page a { transition: none; } }
</style>
