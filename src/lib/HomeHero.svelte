<script>
  import { createEventDispatcher } from 'svelte';
  import HomeDailyResult from './HomeDailyResult.svelte';
  import HomeUsernameClaim from './HomeUsernameClaim.svelte';
  import { normalizeHexColor } from './utils.js';

  export let isAuthenticated = false;
  /** @type {any} */
  export let roll = null;
  export let rollIsPreview = false;
  export let previewAvailable = false;
  export let loading = false;
  export let tickerVisible = false;

  const dispatch = createEventDispatcher();
  $: hasLiveResult = Boolean(roll?.hexCode && roll?.score !== null && roll?.score !== undefined);
  $: heroColor = normalizeHexColor(roll?.hexCode, '#8B7CF6');
</script>

<section class="home-hero" class:home-hero--with-ticker={tickerVisible} style={`--home-hero-color: ${heroColor};`} aria-labelledby="home-title">
  <div class="home-shell home-hero__shell">
    <div class="home-hero__intro">
      <div>
        <p class="home-kicker">Public profiles / one roll each day</p>
        <h1 id="home-title">A public profile that <span>changes every day.</span></h1>
      </div>
      <div class="home-hero__side">
        <p>Add your background, avatar, music, links, and effects. Each daily color becomes part of your public history and changes where your profile appears.</p>
        <HomeUsernameClaim
          isAuthenticated={isAuthenticated}
          inputId="home-claim-hero"
          showLabel={false}
          buttonLabel="Claim page"
          on:claim={event => dispatch('claim', event.detail)}
          on:profile={() => dispatch('profile')}
        />
      </div>
    </div>

    <div
      class="home-hero__stage"
      class:home-hero__stage--profile-only={!hasLiveResult && !loading}
      style={`--home-hero-color: ${heroColor};`}
    >
      <div class="home-hero__profile-frame">
        <div class="home-browser" aria-label="Example public profile shown in a browser window">
          <div class="home-browser__bar">
            <div class="home-browser__traffic" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <div class="home-browser__navigation" aria-hidden="true">
              <span class="home-browser__nav home-browser__nav--back"></span>
              <span class="home-browser__nav home-browser__nav--forward"></span>
            </div>
            <span class="home-browser__separator" aria-hidden="true"></span>
            <span class="home-browser__privacy" aria-hidden="true">
              <svg viewBox="0 0 16 16" focusable="false"><path d="M8 1.5 13 3v3.6c0 3.2-2 6.2-5 7.8-3-1.6-5-4.6-5-7.8V3l5-1.5Z" /><path d="m5.8 7.8 1.4 1.4 3-3" /></svg>
            </span>
            <div class="home-browser__address">
              <span class="home-browser__address-text">
                <svg viewBox="0 0 16 16" focusable="false"><rect x="3.2" y="6.8" width="9.6" height="7" rx="1.2" /><path d="M5.2 6.8V5a2.8 2.8 0 0 1 5.6 0v1.8" /></svg>
                <span>chm.lol/tjz</span>
              </span>
              <svg class="home-browser__reload" viewBox="0 0 16 16" focusable="false"><path d="M13 5.5V2.8l-2.1 2.1A5.2 5.2 0 1 0 13.1 9" /></svg>
            </div>
            <div class="home-browser__actions" aria-hidden="true">
              <span class="home-browser__action home-browser__action--share"><svg viewBox="0 0 16 16" focusable="false"><path d="M8 10.8V2.7" /><path d="m5.2 5.5 2.8-2.8 2.8 2.8" /><path d="M3.2 8.7v4.1c0 .7.5 1.2 1.2 1.2h7.2c.7 0 1.2-.5 1.2-1.2V8.7" /></svg></span>
              <span class="home-browser__action home-browser__action--plus">+</span>
              <span class="home-browser__action home-browser__action--tabs"><i></i></span>
            </div>
          </div>
          <div class="home-browser__viewport">
            <picture>
              <img src="/homepage/admin-profile-desktop.png" alt="Example chm.lol public profile" width="2553" height="1379" fetchpriority="high" decoding="async" />
            </picture>
          </div>
        </div>
      </div>
      <HomeDailyResult roll={roll} rollIsPreview={rollIsPreview} previewAvailable={previewAvailable} loading={loading} compactUnavailable={true} />
    </div>
  </div>
</section>

<style>
  .home-hero { height: calc(100svh - 4rem); min-height: 38.75rem; max-height: 61.25rem; padding: clamp(1.5rem, 3.4vh, 2.65rem) 0; }
  .home-hero--with-ticker { height: calc(100svh - 101px); }
  .home-hero__shell { display: grid; height: 100%; min-height: 0; grid-template-rows: auto minmax(0, 1fr); gap: clamp(1.1rem, 2.6vh, 1.65rem); }
  .home-hero__intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(26.25rem, 33.75rem); align-items: end; gap: 3.6rem; }
  .home-kicker { margin: 0; color: #858690; font: 500 0.68rem / 1 var(--home-mono); letter-spacing: 0.13em; text-transform: uppercase; }
  .home-hero h1 { max-width: 55rem; margin: 0.9rem 0 0; color: var(--home-ink); font: 650 clamp(3.1rem, min(6vw, 8.4vh), 5.5rem) / 0.9 var(--home-font); letter-spacing: -0.045em; }
  .home-hero h1 span { color: color-mix(in srgb, var(--home-hero-color) 62%, #f2f0eb); text-shadow: 0 0 2.2rem color-mix(in srgb, var(--home-hero-color) 24%, transparent); transition: color 0.45s ease, text-shadow 0.45s ease; }
  .home-hero__side > p { margin: 0 0 1.05rem; color: #b5b4bc; font-size: 1rem; line-height: 1.6; }
  .home-hero__stage { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 18rem; min-height: 0; height: 100%; overflow: hidden; border: 1px solid #3a3e48; border-radius: 0.65rem; background: #0a0c10; box-shadow: 0 1.9rem 5rem rgba(0, 0, 0, 0.4); animation: home-stage-enter 0.95s 0.13s cubic-bezier(0.2, 0.72, 0.2, 1) both; }
  .home-hero__stage--profile-only { grid-template-columns: 1fr; }
  .home-hero__profile-frame { position: relative; min-width: 0; min-height: 0; overflow: hidden; }
  .home-browser { display: grid; width: 100%; height: 100%; min-height: 0; overflow: hidden; grid-template-rows: auto minmax(0, 1fr); border: 0; border-radius: 0; background: #080a0d; box-shadow: none; }
  .home-browser__bar { display: flex; align-items: center; gap: 0.52rem; min-height: 2.5rem; padding: 0.42rem 0.7rem; border-bottom: 1px solid #4a5260; background: #1c2029; color: #b7bcc7; }
  .home-browser__traffic { display: flex; flex: 0 0 auto; align-items: center; gap: 0.3rem; }
  .home-browser__traffic span { display: block; width: 0.48rem; height: 0.48rem; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 50%; background: #737985; }
  .home-browser__traffic span:first-child { background: #d28a91; }
  .home-browser__traffic span:nth-child(2) { background: #d4c174; }
  .home-browser__traffic span:last-child { background: #83c1a9; }
  .home-browser__navigation { display: flex; flex: 0 0 auto; align-items: center; gap: 0.18rem; margin-left: 0.3rem; }
  .home-browser__nav { position: relative; display: block; width: 0.9rem; height: 1.25rem; color: #d9dde5; opacity: 0.86; }
  .home-browser__nav::before { position: absolute; top: 50%; width: 0.42rem; height: 0.42rem; content: ''; border-top: 1px solid currentColor; border-left: 1px solid currentColor; }
  .home-browser__nav--back::before { left: 0.22rem; transform: translateY(-50%) rotate(-45deg); }
  .home-browser__nav--forward::before { left: 0.08rem; transform: translateY(-50%) rotate(135deg); }
  .home-browser__separator { width: 1px; height: 1.15rem; flex: 0 0 auto; background: #48505d; }
  .home-browser__privacy { display: grid; width: 1rem; height: 1.2rem; flex: 0 0 auto; place-items: center; color: #c9ced8; }
  .home-browser__privacy svg { width: 0.82rem; height: 0.82rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.15; }
  .home-browser__address { display: flex; min-width: 0; flex: 1 1 auto; align-items: center; justify-content: space-between; gap: 0.5rem; overflow: hidden; padding: 0.36rem 0.55rem; border: 1px solid #596372; border-radius: 0.32rem; background: #11151d; color: #e0e3e8; font: 0.6rem / 1 var(--home-mono); }
  .home-browser__address-text { display: flex; min-width: 0; align-items: center; gap: 0.38rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .home-browser__address-text svg { width: 0.75rem; height: 0.75rem; flex: 0 0 auto; fill: none; stroke: #aeb6c4; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.15; }
  .home-browser__address-text span { overflow: hidden; text-overflow: ellipsis; }
  .home-browser__reload { width: 0.78rem; height: 0.78rem; flex: 0 0 auto; fill: none; stroke: #b8bfcc; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.15; }
  .home-browser__actions { display: flex; flex: 0 0 auto; align-items: center; gap: 0.38rem; margin-left: 0.18rem; color: #d2d7df; }
  .home-browser__action { display: grid; width: 1.05rem; height: 1.25rem; place-items: center; }
  .home-browser__action svg { width: 0.82rem; height: 0.82rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.15; }
  .home-browser__action--plus { font: 1.05rem / 1 ui-sans-serif, sans-serif; }
  .home-browser__action--tabs i { display: block; width: 0.72rem; height: 0.72rem; border: 1px solid currentColor; border-radius: 0.12rem; opacity: 0.88; }
  .home-browser__viewport { position: relative; min-height: 0; overflow: hidden; }
  .home-browser__viewport::after { position: absolute; inset: 0; content: ''; background: radial-gradient(circle at 74% 50%, color-mix(in srgb, var(--home-hero-color) 14%, transparent), transparent 43%), linear-gradient(180deg, transparent 76%, rgba(7, 8, 11, 0.32)); pointer-events: none; }
  .home-browser__viewport picture, .home-browser__viewport img { display: block; width: 100%; height: 100%; }
  .home-browser__viewport img { min-height: 0; object-fit: cover; object-position: center; filter: saturate(0.99) brightness(0.98); transform: scale(1.52); transition: transform 0.22s ease-out, filter 0.4s ease; will-change: transform; }
  .home-browser:hover .home-browser__viewport img { filter: saturate(1.02) brightness(1); transform: scale(1.535); }
  @keyframes home-stage-enter { from { opacity: 0; transform: translateY(1.5rem) scale(0.992); } to { opacity: 1; transform: none; } }
  .home-hero__intro > * { animation: home-hero-enter 0.8s cubic-bezier(0.2, 0.72, 0.2, 1) both; }
  .home-hero__intro > :nth-child(2) { animation-delay: 0.1s; }
  @keyframes home-hero-enter { from { opacity: 0; transform: translateY(1.1rem); } to { opacity: 1; transform: none; } }

  @media (min-width: 67.56rem) and (max-height: 47.5rem) {
    .home-hero { min-height: 35.6rem; padding: 1.25rem 0; }
    .home-hero__shell { gap: 1rem; }
    .home-hero h1 { font-size: clamp(2.9rem, 7.4vh, 3.65rem); }
    .home-hero__side > p { margin-bottom: 0.75rem; font-size: 0.88rem; line-height: 1.48; }
    :global(.home-daily__main) { padding-top: 0.8rem; padding-bottom: 0.8rem; }
  }
  @media (max-width: 67.5rem) {
    .home-hero { height: auto; max-height: none; }
    .home-hero__intro { grid-template-columns: 1fr; gap: 1.35rem; }
    .home-hero__stage { grid-template-columns: 1fr; height: auto; }
    .home-hero__profile-frame { aspect-ratio: 16 / 9; }
    .home-browser__viewport img { transform: scale(1.2); }
    .home-browser:hover .home-browser__viewport img { transform: scale(1.215); }
    :global(.home-daily:not(.home-daily--compact)) { min-height: 15.5rem; }
  }
  @media (max-width: 48rem) {
    .home-hero { padding-top: 2rem; }
    .home-hero h1 { max-width: 38rem; font-size: clamp(2.8rem, 11vw, 4.5rem); }
    .home-hero__stage { border-radius: 0.5rem; }
    .home-browser__bar { gap: 0.3rem; padding-inline: 0.45rem; }
    .home-browser__navigation { margin-left: 0.08rem; }
    .home-browser__privacy { display: none; }
    .home-browser__actions { gap: 0.18rem; margin-left: 0.04rem; }
    .home-browser__address { padding-inline: 0.45rem; }
    .home-browser__viewport img { object-position: center 59%; transform: scale(2.08); }
    .home-browser:hover .home-browser__viewport img { transform: scale(2.1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-hero__intro > *, .home-hero__stage { animation: none; }
    .home-browser__viewport img, .home-hero h1 span { transition: none; }
  }
</style>
