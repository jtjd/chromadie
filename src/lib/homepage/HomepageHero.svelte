<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import HomepageClaim from './HomepageClaim.svelte';
  import HomepageDailyLeaderboard from './HomepageDailyLeaderboard.svelte';
  import HomepageProfileDemo from './HomepageProfileDemo.svelte';
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';
  import { HOMEPAGE_FIXTURES } from './homepageFixtures.js';

  export let isAuthenticated = false;
  export let dailyLeaderboardRows = [];
  export let currentLeaderboardUser = null;
  export let dailyLeaderboardLoading = true;
  export let dailyLeaderboardError = '';
  export let accountReady = true;
  export let accountUnavailable = false;

  const dispatch = createEventDispatcher();
  let fixtureIndex = 0;
  let resetLabel = '—';
  let resetTimer;

  $: fixture = HOMEPAGE_FIXTURES[fixtureIndex];
  $: latestRoll = fixture.scores[0];

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

  function moveFixture(direction) {
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
      aria-label="Daily roll entry"
    >
      <a class="homepage-roll-compact__button" href="/roll">Roll today</a>
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
        <div class="homepage-profile-pop">
          <HomepageProfileDemo fixture={fixture} />
        </div>
      </ProfileMotionEffect>
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
    currentUser={currentLeaderboardUser}
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
    max-width: 360px;
    margin-top: 30px;
    padding: 18px 0;
    border-top: 1px solid rgba(255, 255, 255, .18);
    border-bottom: 1px solid rgba(255, 255, 255, .16);
  }

  .homepage-roll-compact__button {
    display: inline-flex;
    width: 100%;
    height: 48px;
    align-items: center;
    justify-content: center;
    margin-top: 0;
    border: 1px solid rgba(255, 255, 255, .82);
    border-radius: 12px;
    background: var(--homepage-text);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .42), 0 10px 24px rgba(7, 4, 14, .18);
    color: #17151b;
    cursor: pointer;
    font: 600 0.9rem / 1 var(--homepage-display);
    text-decoration: none;
    text-shadow: none;
    transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  }

  .homepage-roll-compact__button:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--homepage-accent) 72%, white 28%);
    background: var(--homepage-accent);
    color: #17151b;
    box-shadow: 0 12px 28px color-mix(in srgb, var(--homepage-accent) 32%, transparent), 0 0 24px color-mix(in srgb, var(--homepage-accent) 24%, transparent);
    text-shadow: none;
    transform: translateY(-1px);
  }

  .homepage-roll-compact__button:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 3px; }
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
  .homepage-profile-pop { width: 100%; }
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
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-roll-compact__button { transition: none; }
    .homepage-theme-button { transition: none; }
  }
</style>
