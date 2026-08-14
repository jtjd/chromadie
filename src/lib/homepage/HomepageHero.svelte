<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import HomepageClaim from './HomepageClaim.svelte';
  import HomepageProfileDemo from './HomepageProfileDemo.svelte';
  import { HOMEPAGE_FIXTURES } from './homepageFixtures.js';

  export let isAuthenticated = false;
  export let accountReady = true;
  export let accountUnavailable = false;

  const dispatch = createEventDispatcher();
  const PROFILE_TILT_MAX_Y = 6;
  const PROFILE_TILT_MAX_X = 4;
  let fixtureIndex = 0;
  let profileTiltEnabled = false;
  let profileTiltStyle = '';

  $: fixture = HOMEPAGE_FIXTURES[fixtureIndex];
  $: exampleNumber = String(fixtureIndex + 1).padStart(2, '0');
  $: latestRoll = fixture.scores[0];

  function moveFixture(direction) {
    fixtureIndex = (fixtureIndex + direction + HOMEPAGE_FIXTURES.length) % HOMEPAGE_FIXTURES.length;
    dispatch('fixturechange', { fixture: HOMEPAGE_FIXTURES[fixtureIndex] });
  }

  function forward(event) {
    dispatch(event.type, event.detail);
  }

  function handleProfilePointerMove(event) {
    if (!profileTiltEnabled || event.pointerType === 'touch') return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const pointerX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const pointerY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    const rotateY = ((pointerX - 0.5) * PROFILE_TILT_MAX_Y * 2).toFixed(2);
    const rotateX = ((0.5 - pointerY) * PROFILE_TILT_MAX_X * 2).toFixed(2);
    profileTiltStyle = `transform: rotateY(${rotateY}deg) rotateX(${rotateX}deg);`;
  }

  function resetProfileTilt() {
    profileTiltStyle = '';
  }

  onMount(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function updateTiltAvailability() {
      profileTiltEnabled = finePointer.matches && !reducedMotion.matches;
      if (!profileTiltEnabled) resetProfileTilt();
    }

    updateTiltAvailability();
    finePointer.addEventListener('change', updateTiltAvailability);
    reducedMotion.addEventListener('change', updateTiltAvailability);

    return () => {
      finePointer.removeEventListener('change', updateTiltAvailability);
      reducedMotion.removeEventListener('change', updateTiltAvailability);
    };
  });
</script>

<section
  class="homepage-hero homepage-shell"
  id="top"
  aria-labelledby="homepage-title"
>
  <div class="homepage-hero__copy">
    <div class="homepage-eyebrow">A profile that changes every day</div>
    <h1 id="homepage-title">Your profile,<span>alive.</span></h1>
    <p class="homepage-hero__lede">Build a public profile with your background, avatar, links, music, layouts, and effects. Roll once a day and let every result become part of your history.</p>

    <div class="homepage-roll-compact" aria-label="Example daily roll">
      <div class="homepage-roll-compact__top">
        <div>
          <strong>Example daily roll</strong>
          <span>Color, score, rarity, and conditions become part of your daily history.</span>
        </div>
        <div class="homepage-roll-compact__result">
          <span class="homepage-roll-compact__dot" style={`background: ${latestRoll.hex_code};`} aria-hidden="true"></span>
          <span>{latestRoll.hex_code}</span>
        </div>
      </div>
      <div class="homepage-roll-compact__meta">
        <span>{latestRoll.identity}</span>
        <strong>{Number(latestRoll.score).toLocaleString()} EP · {latestRoll.rarity}</strong>
      </div>
    </div>
  </div>

  <div class="homepage-hero__product">
    <div
      class="homepage-profile-stage"
      role="region"
      aria-label="Profile examples"
    >
      <button class="homepage-theme-button homepage-theme-button--prev" type="button" aria-label="Previous profile example" on:click={() => moveFixture(-1)}>‹</button>
      <div
        class="homepage-profile-wrap"
        role="presentation"
        style={profileTiltStyle}
        on:pointermove={handleProfilePointerMove}
        on:pointerleave={resetProfileTilt}
      >
        <HomepageProfileDemo fixture={fixture} />
      </div>
      <button class="homepage-theme-button homepage-theme-button--next" type="button" aria-label="Next profile example" on:click={() => moveFixture(1)}>›</button>
    </div>

    <HomepageClaim
      isAuthenticated={isAuthenticated}
      {accountReady}
      {accountUnavailable}
      inputId="homepage-claim-hero"
      anchorId="claim"
      on:claim={forward}
      on:profile={forward}
    />
    <p class="homepage-product-caption">Switch examples to change the profile environment.</p>
  </div>

  <aside class="homepage-hero__context" aria-label="Profile preview details">
    <div class="homepage-context-kicker">Profile example</div>
    <div class="homepage-context-rule"></div>
    <div class="homepage-context-row"><span>Example</span><strong>{exampleNumber} / 04</strong></div>
    <div class="homepage-context-row"><span>Identity</span><strong>{fixture.displayName}</strong></div>
    <div class="homepage-context-row"><span>Daily roll</span><strong>Color + score</strong></div>
    <div class="homepage-context-row"><span>Media</span><strong>Background + avatar</strong></div>
    <p class="homepage-context-note">The profile remains the center of the page. Media, links, daily history, and equipped effects provide the variation.</p>
    <div class="homepage-context-dots" aria-hidden="true">
      {#each HOMEPAGE_FIXTURES as item, index (item.id)}
        <span class:active={index === fixtureIndex} class="homepage-context-dot"></span>
      {/each}
    </div>
  </aside>
</section>

<style>
  .homepage-hero {
    --homepage-accent-soft: color-mix(in srgb, var(--homepage-accent) 12%, transparent);
    --homepage-accent-glow: color-mix(in srgb, var(--homepage-accent) 28%, transparent);
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 470px minmax(0, 1fr);
    align-items: center;
    gap: clamp(28px, 4vw, 72px);
    min-height: calc(100svh - 88px);
    padding: 34px 0 70px;
    isolation: isolate;
  }

  .homepage-hero__copy { align-self: center; justify-self: start; width: min(100%, 360px); }

  .homepage-eyebrow,
  .homepage-context-kicker {
    color: rgba(245, 245, 247, 0.62);
    font: 600 0.69rem / 1.2 'Inter', sans-serif;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .homepage-eyebrow { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .homepage-eyebrow::before { width: 24px; height: 1px; content: ''; background: var(--homepage-accent); box-shadow: 0 0 10px var(--homepage-accent-glow); }

  .homepage-hero h1 {
    margin: 0 0 24px;
    color: var(--homepage-text);
    font: 600 clamp(3.8rem, 5.1vw, 5.7rem) / 0.86 'Clash Display', sans-serif;
    letter-spacing: -0.055em;
    text-shadow: 0 8px 40px rgba(0, 0, 0, 0.55);
  }

  .homepage-hero h1 span { display: block; color: var(--homepage-accent); }

  .homepage-hero__lede {
    max-width: 330px;
    margin: 0;
    color: rgba(245, 245, 247, 0.72);
    font: 400 0.98rem / 1.62 'Inter', sans-serif;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.72);
  }

  .homepage-roll-compact {
    max-width: 340px;
    margin-top: 30px;
    padding: 16px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .homepage-roll-compact__top { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 14px; }
  .homepage-roll-compact__top strong { display: block; color: var(--homepage-text); font: 600 0.82rem / 1.1 'Clash Display', sans-serif; }
  .homepage-roll-compact__top span:not(.homepage-roll-compact__dot) { display: block; max-width: 220px; margin-top: 3px; color: var(--homepage-muted); font: 400 0.72rem / 1.35 'Inter', sans-serif; }
  .homepage-roll-compact__result { display: flex; align-items: center; gap: 7px; color: var(--homepage-muted); font: 500 0.68rem / 1 'Clash Display', sans-serif; }
  .homepage-roll-compact__dot { width: 9px; height: 9px; border-radius: 999px; box-shadow: 0 0 12px var(--homepage-accent-glow); }
  .homepage-roll-compact__meta { display: flex; justify-content: space-between; gap: 14px; margin-top: 12px; color: var(--homepage-muted); font: 400 0.68rem / 1.2 'Inter', sans-serif; }
  .homepage-roll-compact__meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .homepage-roll-compact__meta strong { color: rgba(245, 245, 247, 0.7); font-weight: 500; white-space: nowrap; }

  .homepage-hero__product {
    grid-column: 2;
    display: flex;
    min-width: 0;
    width: 470px;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    justify-self: center;
    perspective: 1400px;
  }

  .homepage-profile-stage { position: relative; width: 440px; min-width: 0; padding: 0 28px; outline: none; }
  .homepage-profile-wrap { width: 100%; transform: rotateY(-4deg) rotateX(2deg); transform-style: preserve-3d; transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.25s ease; }
  .homepage-profile-stage:focus-visible { border-radius: 24px; outline: 2px solid var(--homepage-accent); outline-offset: 5px; }

  .homepage-theme-button {
    position: absolute;
    top: 48%;
    z-index: 6;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--homepage-border);
    border-radius: 10px;
    background: rgba(10, 10, 13, 0.6);
    color: var(--homepage-text);
    cursor: pointer;
    font: 400 1.25rem / 1 'Inter', sans-serif;
    transform: translateY(-50%);
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .homepage-theme-button:hover { border-color: var(--homepage-accent); background: var(--homepage-accent); color: #050506; }
  .homepage-theme-button:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 3px; }
  .homepage-theme-button--prev { left: 0; }
  .homepage-theme-button--next { right: 0; }

  .homepage-product-caption { margin: 0; color: rgba(245, 245, 247, 0.38); font: 400 0.7rem / 1.2 'Inter', sans-serif; text-align: center; }

  .homepage-hero__context { align-self: center; justify-self: end; width: min(100%, 270px); padding-top: 42px; }
  .homepage-context-rule { height: 1px; margin-bottom: 4px; background: rgba(255, 255, 255, 0.12); }
  .homepage-context-row { display: flex; min-height: 54px; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
  .homepage-context-row span { color: rgba(245, 245, 247, 0.42); font: 400 0.72rem / 1.2 'Inter', sans-serif; }
  .homepage-context-row strong { color: rgba(245, 245, 247, 0.82); font: 500 0.78rem / 1.2 'Clash Display', sans-serif; text-align: right; }
  .homepage-context-note { max-width: 240px; margin: 18px 0 0; color: rgba(245, 245, 247, 0.47); font: 400 0.76rem / 1.55 'Inter', sans-serif; }
  .homepage-context-dots { display: flex; gap: 6px; margin-top: 16px; }
  .homepage-context-dot { width: 22px; height: 3px; border-radius: 999px; background: rgba(255, 255, 255, 0.13); transition: background 0.2s ease, width 0.2s ease; }
  .homepage-context-dot.active { width: 34px; background: var(--homepage-accent); box-shadow: 0 0 12px var(--homepage-accent-glow); }

  @media (max-width: 1180px) {
    .homepage-hero { grid-template-columns: minmax(0, 1fr) 430px minmax(0, 0.7fr); gap: 24px; }
    .homepage-hero__product { width: 430px; }
    .homepage-profile-stage { width: 410px; }
    .homepage-hero__context { width: 210px; }
    .homepage-hero h1 { font-size: clamp(3.55rem, 5.4vw, 4.8rem); }
  }

  @media (max-width: 930px) {
    .homepage-hero { grid-template-columns: 1fr; gap: 42px; min-height: auto; padding: 42px 0 76px; }
    .homepage-hero__copy { width: 100%; max-width: 560px; justify-self: stretch; }
    .homepage-hero h1 { max-width: 520px; font-size: clamp(4rem, 14vw, 5.5rem); }
    .homepage-hero__lede { max-width: 480px; }
    .homepage-roll-compact { max-width: 420px; }
    .homepage-hero__product { grid-column: 1; width: 100%; max-width: 470px; }
    .homepage-profile-stage { width: 100%; max-width: 440px; }
    .homepage-profile-wrap { transform: none; }
    .homepage-hero__context { display: none; }
  }

  @media (max-width: 460px) {
    .homepage-profile-stage { padding-inline: 18px; }
    .homepage-theme-button--prev { left: 0; }
    .homepage-theme-button--next { right: 0; }
    .homepage-hero__product { gap: 14px; }
    .homepage-roll-compact__meta { align-items: flex-start; flex-direction: column; gap: 4px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-profile-wrap { transform: none; transition: none; }
    .homepage-theme-button,
    .homepage-context-dot { transition: none; }
  }
</style>
