<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import HomepageClaim from './HomepageClaim.svelte';
  import HomepageDailyLeaderboard from './HomepageDailyLeaderboard.svelte';
  import HomepageProfileDemo from './HomepageProfileDemo.svelte';
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';
  import { HOMEPAGE_FIXTURES } from './homepageFixtures.js';

  export let isAuthenticated = false;
  export let dailyLeaderboardRows = [];
  export let dailyLeaderboardLoading = true;
  export let dailyLeaderboardError = '';
  export let accountReady = true;
  export let accountUnavailable = false;

  const dispatch = createEventDispatcher();
  const PREVIEW_ROLL_DELAYS = Object.freeze([76, 78, 82, 88, 100, 116, 136]);
  const PREVIEW_ROLL_TICKS = PREVIEW_ROLL_DELAYS.length + 1;
  const LAND_DURATION_MS = 36;
  const IMPACT_DURATION_MS = 1120;
  const PREVIEW_ROLLS = Object.freeze([
    Object.freeze({ hex_code: '#D8A6FF', score: 74231, rarity: 'Rare', identity: 'Soft Electric Orchid' }),
    Object.freeze({ hex_code: '#78DCCA', score: 38642, rarity: 'Uncommon', identity: 'Luminous Mint Tide' }),
    Object.freeze({ hex_code: '#FFB7D5', score: 61184, rarity: 'Rare', identity: 'Bright Dream Rose' }),
    Object.freeze({ hex_code: '#8EBBFF', score: 47906, rarity: 'Uncommon', identity: 'Clear Horizon Blue' }),
    Object.freeze({ hex_code: '#FFD58A', score: 52873, rarity: 'Rare', identity: 'Soft Golden Hour' }),
    Object.freeze({ hex_code: '#B8F29A', score: 34718, rarity: 'Uncommon', identity: 'Fresh Meadow Light' }),
    Object.freeze({ hex_code: '#C99CFF', score: 68415, rarity: 'Rare', identity: 'Vivid Violet Haze' })
  ]);
  const PROFILE_PARTICLES = Object.freeze([
    Object.freeze({ x: -142, y: -116, size: 7, delay: 0, bright: true }),
    Object.freeze({ x: -118, y: -46, size: 5, delay: 32, bright: false }),
    Object.freeze({ x: -102, y: 82, size: 8, delay: 58, bright: false }),
    Object.freeze({ x: -72, y: -142, size: 4, delay: 84, bright: true }),
    Object.freeze({ x: -54, y: 126, size: 6, delay: 112, bright: false }),
    Object.freeze({ x: -18, y: -128, size: 9, delay: 142, bright: true }),
    Object.freeze({ x: 12, y: 148, size: 5, delay: 176, bright: false }),
    Object.freeze({ x: 46, y: -138, size: 6, delay: 204, bright: false }),
    Object.freeze({ x: 72, y: 126, size: 8, delay: 236, bright: true }),
    Object.freeze({ x: 104, y: -98, size: 5, delay: 264, bright: false }),
    Object.freeze({ x: 132, y: -30, size: 7, delay: 292, bright: true }),
    Object.freeze({ x: 148, y: 54, size: 4, delay: 324, bright: false }),
    Object.freeze({ x: 118, y: 98, size: 6, delay: 348, bright: false }),
    Object.freeze({ x: 84, y: 154, size: 9, delay: 378, bright: true }),
    Object.freeze({ x: 32, y: 112, size: 5, delay: 406, bright: false }),
    Object.freeze({ x: -2, y: -156, size: 6, delay: 438, bright: false }),
    Object.freeze({ x: -86, y: -104, size: 8, delay: 468, bright: true }),
    Object.freeze({ x: -136, y: 28, size: 5, delay: 496, bright: false }),
    Object.freeze({ x: -126, y: 134, size: 7, delay: 524, bright: false }),
    Object.freeze({ x: 58, y: 72, size: 4, delay: 556, bright: true })
  ]);
  let fixtureIndex = 0;
  let previewRoll = null;
  let previewRollTimer;
  let impactTimer;
  let previewRollCount = 0;
  let rollPhase = 'idle';
  let hasLeaderboardEntry = false;
  let leaderboardScore = 0;
  let resetLabel = '—';
  let resetTimer;

  $: fixture = HOMEPAGE_FIXTURES[fixtureIndex];
  $: latestRoll = previewRoll || fixture.scores[0];
  $: isPreviewRolling = rollPhase !== 'idle';
  $: previewRollButtonLabel = rollPhase === 'spin' ? 'Rolling…' : hasLeaderboardEntry ? 'Roll again' : 'Roll';
  $: profileImpactActive = rollPhase === 'impact';
  $: particleBurstActive = rollPhase === 'impact';

  function updateResetLabel() {
    const now = new Date();
    const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const seconds = Math.max(0, Math.floor((nextReset - now.getTime()) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    resetLabel = [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  onMount(() => {
    function scheduleResetLabel() {
      updateResetLabel();
      resetTimer = setTimeout(scheduleResetLabel, 1000);
    }

    scheduleResetLabel();
    return () => clearTimeout(resetTimer);
  });

  function hasReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function clearPreviewRollTimers() {
    clearTimeout(previewRollTimer);
    clearTimeout(impactTimer);
    previewRollTimer = undefined;
    impactTimer = undefined;
  }

  function setLocalPreviewRoll(result) {
    previewRoll = result;
  }

  function finishPreviewRoll() {
    const finalRoll = PREVIEW_ROLLS[(previewRollCount * 3 + 4) % PREVIEW_ROLLS.length];
    previewRollCount += 1;
    setLocalPreviewRoll(finalRoll);
    hasLeaderboardEntry = true;
    leaderboardScore = Number(finalRoll.score) || 0;
    rollPhase = 'land';
    dispatch('accentpreview', { accent: finalRoll.hex_code });

    if (hasReducedMotion()) {
      rollPhase = 'idle';
      return;
    }

    impactTimer = setTimeout(() => {
      rollPhase = 'impact';
      impactTimer = setTimeout(() => { rollPhase = 'idle'; }, IMPACT_DURATION_MS);
    }, LAND_DURATION_MS);
  }

  function previewDailyRoll() {
    if (isPreviewRolling) return;

    clearPreviewRollTimers();
    rollPhase = 'spin';

    if (hasReducedMotion()) {
      finishPreviewRoll();
      return;
    }

    let tick = 0;
    setLocalPreviewRoll(PREVIEW_ROLLS[previewRollCount % PREVIEW_ROLLS.length]);
    function advancePreviewRoll() {
      tick += 1;
      if (tick >= PREVIEW_ROLL_TICKS) {
        previewRollTimer = undefined;
        finishPreviewRoll();
        return;
      }
      setLocalPreviewRoll(PREVIEW_ROLLS[(previewRollCount + tick) % PREVIEW_ROLLS.length]);
      previewRollTimer = setTimeout(advancePreviewRoll, PREVIEW_ROLL_DELAYS[tick]);
    }
    previewRollTimer = setTimeout(advancePreviewRoll, PREVIEW_ROLL_DELAYS[0]);
  }

  function moveFixture(direction) {
    clearPreviewRollTimers();
    previewRoll = null;
    rollPhase = 'idle';
    hasLeaderboardEntry = false;
    leaderboardScore = 0;
    fixtureIndex = (fixtureIndex + direction + HOMEPAGE_FIXTURES.length) % HOMEPAGE_FIXTURES.length;
    dispatch('fixturechange', { fixture: HOMEPAGE_FIXTURES[fixtureIndex] });
  }

  function forward(event) {
    dispatch(event.type, event.detail);
  }

</script>

<section
  class="homepage-hero homepage-shell"
  id="top"
  aria-labelledby="homepage-title"
  style={`--homepage-roll-accent: ${latestRoll.hex_code}; --homepage-roll-accent-glow: color-mix(in srgb, ${latestRoll.hex_code} 28%, transparent);`}
>
  <div class="homepage-hero__copy">
    <div class="homepage-eyebrow">A profile that changes every day</div>
    <h1 id="homepage-title">Your profile,<span>alive.</span></h1>
    <p class="homepage-hero__lede">Build a public profile with your background, avatar, links, music, layouts, and effects. Roll once a day and let every result become part of your history.</p>

    <div
      class="homepage-roll-compact"
      aria-label="Daily roll demo"
      data-roll-hex={latestRoll.hex_code}
      data-roll-score={latestRoll.score}
    >
      <div class="homepage-roll-compact__header">
        <strong>Roll today</strong>
        <span>{hasLeaderboardEntry ? 'Your result' : 'One roll · every day'}</span>
      </div>
      {#if hasLeaderboardEntry}
        <div class="homepage-roll-compact__result">
          <span class="homepage-roll-compact__dot" style={`background: ${latestRoll.hex_code};`} aria-hidden="true"></span>
          <div>
            <strong>+{leaderboardScore.toLocaleString()} EP</strong>
            <small>{latestRoll.identity} · {latestRoll.rarity}</small>
          </div>
        </div>
      {:else}
        <p class="homepage-roll-compact__prompt">See where today’s color takes you.</p>
      {/if}
      <button class="homepage-roll-compact__button" type="button" disabled={isPreviewRolling} on:click={previewDailyRoll}>{previewRollButtonLabel}</button>
    </div>
  </div>

  <div class="homepage-hero__product">
    <div
      class="homepage-profile-stage"
      role="region"
      aria-label="Profile examples"
    >
      <button class="homepage-theme-button homepage-theme-button--prev" type="button" aria-label="Previous profile example" on:click={() => moveFixture(-1)}>‹</button>
      <ProfileMotionEffect
        motionKey={fixture.profileMotion || ''}
        inputSurface="viewport"
      >
        <div class="homepage-profile-pop" class:homepage-profile-pop--active={profileImpactActive}>
          <HomepageProfileDemo fixture={fixture} {previewRoll} />
        </div>
      </ProfileMotionEffect>
      {#if particleBurstActive}
        <div class="homepage-roll-particles" aria-hidden="true">
          {#each PROFILE_PARTICLES as particle (particle)}
            <span
              class:homepage-roll-particle--bright={particle.bright}
              style={`--particle-x: ${particle.x}px; --particle-y: ${particle.y}px; --particle-size: ${particle.size}px; --particle-delay: ${particle.delay}ms;`}
            ></span>
          {/each}
        </div>
      {/if}
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

  <HomepageDailyLeaderboard
    rows={dailyLeaderboardRows}
    loading={dailyLeaderboardLoading}
    error={dailyLeaderboardError}
    {resetLabel}
  />
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

  .homepage-eyebrow {
    color: rgba(250, 249, 252, 0.9);
    font: 600 0.69rem / 1.2 'Inter', sans-serif;
    letter-spacing: 0.14em;
    text-shadow: 0 1px 8px rgba(7, 4, 14, .62);
    text-transform: uppercase;
  }

  .homepage-eyebrow { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .homepage-eyebrow::before { width: 24px; height: 1px; content: ''; background: var(--homepage-accent); box-shadow: 0 0 10px var(--homepage-accent-glow); }

  .homepage-hero h1 {
    margin: 0 0 24px;
    color: var(--homepage-text);
    font: 600 clamp(3.8rem, 5.1vw, 5.7rem) / 0.86 var(--homepage-display);
    letter-spacing: -0.055em;
    text-shadow: 0 8px 40px rgba(0, 0, 0, 0.55);
  }

  .homepage-hero h1 span { display: block; color: var(--homepage-roll-accent, var(--homepage-accent)); }

  .homepage-hero__lede {
    max-width: 330px;
    margin: 0;
    color: rgba(250, 249, 252, 0.94);
    font: 450 0.98rem / 1.62 'Inter', sans-serif;
    text-shadow: 0 1px 3px rgba(7, 4, 14, .72), 0 0 16px rgba(7, 4, 14, .24);
  }

  .homepage-roll-compact {
    max-width: 340px;
    margin-top: 30px;
    padding: 16px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .homepage-roll-compact__header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .homepage-roll-compact__header strong { color: var(--homepage-text); font: 600 0.82rem / 1.1 var(--homepage-display); }
  .homepage-roll-compact__header span { color: rgba(250, 249, 252, .72); font: 450 0.64rem / 1.1 'Inter', sans-serif; text-shadow: 0 1px 3px rgba(7, 4, 14, .68); white-space: nowrap; }
  .homepage-roll-compact__prompt { margin: 0; color: rgba(250, 249, 252, .72); font: 450 0.72rem / 1.35 'Inter', sans-serif; text-shadow: 0 1px 3px rgba(7, 4, 14, .68); }
  .homepage-roll-compact__result { display: flex; align-items: center; gap: 9px; min-height: 38px; }
  .homepage-roll-compact__dot { width: 11px; height: 11px; flex: 0 0 auto; border-radius: 999px; box-shadow: 0 0 14px var(--homepage-roll-accent-glow, var(--homepage-accent-glow)); }
  .homepage-roll-compact__result strong { display: block; color: rgba(250, 249, 252, .94); font: 600 0.84rem / 1.1 var(--homepage-display); }
  .homepage-roll-compact__result small { display: block; margin-top: 4px; color: rgba(250, 249, 252, .68); font: 400 0.66rem / 1.2 'Inter', sans-serif; text-shadow: 0 1px 3px rgba(7, 4, 14, .68); }

  .homepage-roll-compact__button {
    width: 100%;
    height: 42px;
    margin-top: 14px;
    border: 1px solid var(--homepage-accent);
    border-radius: 9px;
    background: rgba(5, 5, 6, 0.28);
    color: var(--homepage-accent);
    cursor: pointer;
    font: 600 0.82rem / 1 var(--homepage-display);
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  }

  .homepage-roll-compact__button:hover:not(:disabled) {
    background: var(--homepage-accent);
    color: #050506;
    box-shadow: 0 0 24px var(--homepage-accent-glow);
  }

  .homepage-roll-compact__button:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 3px; }
  .homepage-roll-compact__button:disabled { opacity: 0.6; cursor: wait; }

  .homepage-hero__product {
    grid-column: 2;
    display: flex;
    min-width: 0;
    width: 470px;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    justify-self: center;
  }

  .homepage-profile-stage { position: relative; width: 440px; min-width: 0; padding: 0 28px; outline: none; }
  .homepage-profile-pop { width: 100%; transform-origin: center; }
  .homepage-profile-pop--active { animation: homepage-profile-pop 0.38s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .homepage-profile-stage:focus-visible { border-radius: 24px; outline: 2px solid var(--homepage-accent); outline-offset: 5px; }

  .homepage-roll-particles {
    position: absolute;
    z-index: 7;
    inset: 0 28px;
    overflow: visible;
    pointer-events: none;
  }

  .homepage-roll-particles span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--particle-size);
    height: var(--particle-size);
    border-radius: 999px;
    background: var(--homepage-roll-accent);
    box-shadow: 0 0 12px var(--homepage-roll-accent-glow);
    opacity: 0;
    animation: homepage-roll-particle 1.08s cubic-bezier(0.16, 0.8, 0.24, 1) var(--particle-delay) forwards;
  }

  .homepage-roll-particles span.homepage-roll-particle--bright {
    background: color-mix(in srgb, var(--homepage-roll-accent) 58%, white);
    box-shadow: 0 0 16px color-mix(in srgb, var(--homepage-roll-accent) 74%, white), 0 0 28px var(--homepage-roll-accent-glow);
  }

  @keyframes homepage-profile-pop {
    0% { transform: scale(1); }
    28% { transform: scale(1.06); }
    62% { transform: scale(0.985); }
    100% { transform: scale(1); }
  }

  @keyframes homepage-roll-particle {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.35); }
    14% { opacity: 0.95; }
    48% { opacity: 0.72; }
    100% { opacity: 0; transform: translate(calc(-50% + var(--particle-x)), calc(-50% + var(--particle-y))) scale(0); }
  }

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

  @media (max-width: 1180px) {
    .homepage-hero { grid-template-columns: minmax(0, 1fr) 430px minmax(0, 0.7fr); gap: 24px; }
    .homepage-hero__product { width: 430px; }
    .homepage-profile-stage { width: 410px; }
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
  }

  @media (max-width: 460px) {
    .homepage-profile-stage { padding-inline: 18px; }
    .homepage-theme-button--prev { left: 0; }
    .homepage-theme-button--next { right: 0; }
    .homepage-hero__product { gap: 14px; }
    .homepage-roll-compact__header { align-items: flex-start; flex-direction: column; gap: 5px; }
    .homepage-roll-compact__header span { font-size: 0.62rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-profile-pop--active { animation: none; }
    .homepage-roll-particles { display: none; }
    .homepage-roll-compact__button { transition: none; }
    .homepage-theme-button { transition: none; }
  }
</style>
