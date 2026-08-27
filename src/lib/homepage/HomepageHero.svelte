<script>
  import HomepageProfileDemo from './HomepageProfileDemo.svelte';
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';
  import { HOMEPAGE_FIXTURES } from './homepageFixtures.js';

  export let isAuthenticated = false;
  export let hasDailyRoll = false;

  const fixture = HOMEPAGE_FIXTURES[0];
  const latestRoll = fixture.scores[0];
  $: rollLabel = isAuthenticated && hasDailyRoll ? 'View today’s result' : 'Roll today';
</script>

<section
  class="homepage-hero homepage-shell homepage-hero--meilin"
  id="top"
  aria-labelledby="homepage-title"
  style={`--homepage-roll-accent: ${latestRoll.hex_code}; --homepage-roll-accent-glow: color-mix(in srgb, ${latestRoll.hex_code} 28%, transparent);`}
>
  <div class="homepage-hero__copy">
    <div class="homepage-eyebrow">A profile that changes every day</div>
    <h1 id="homepage-title">Your profile,<span>alive.</span></h1>
    <p class="homepage-hero__lede">Build a public profile with your background, avatar, links, music, layouts, and effects. Roll once a day and let every result become part of your history.</p>

    <div class="homepage-roll-compact" aria-label="Daily roll entry">
      <a class="homepage-roll-compact__button" href="/roll">{rollLabel}</a>
      {#if !isAuthenticated}
        <a class="homepage-roll-compact__claim" href="#claim">Claim your handle</a>
      {/if}
    </div>
  </div>

  <div class="homepage-hero__product">
    <div class="homepage-profile-stage" role="region" aria-label="Example public profile">
      <ProfileMotionEffect motionKey={fixture.profileMotion || ''} inputSurface="viewport">
        <div class="homepage-profile-pop">
          <HomepageProfileDemo {fixture} />
        </div>
      </ProfileMotionEffect>
    </div>
  </div>
</section>

<style>
  .homepage-hero {
    --homepage-accent-soft: color-mix(in srgb, var(--homepage-accent) 12%, transparent);
    --homepage-accent-glow: color-mix(in srgb, var(--homepage-accent) 28%, transparent);
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(300px, .78fr) minmax(500px, 1.22fr);
    min-height: calc(100svh - 88px);
    align-items: center;
    gap: clamp(64px, 8vw, 150px);
    padding: 34px 0 92px;
    isolation: isolate;
  }

  .homepage-hero__copy { width: min(100%, 390px); align-self: center; justify-self: start; }

  .homepage-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    color: rgba(250, 249, 252, .9);
    font: 600 .69rem / 1.2 'Inter', sans-serif;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .homepage-eyebrow::before { width: 24px; height: 1px; content: ''; background: var(--homepage-accent); box-shadow: 0 0 10px var(--homepage-accent-glow); }

  .homepage-hero h1 {
    margin: 0 0 24px;
    color: #0e0e10;
    font: 600 clamp(4rem, 5.4vw, 6rem) / .86 var(--homepage-display);
    letter-spacing: -.055em;
  }

  .homepage-hero h1 span { display: block; color: #fff; }

  .homepage-hero__lede {
    max-width: 350px;
    margin: 0;
    color: var(--homepage-secondary);
    font: 500 .98rem / 1.62 'Inter', sans-serif;
    letter-spacing: .01em;
    text-shadow: var(--homepage-secondary-shadow);
  }

  .homepage-roll-compact {
    display: grid;
    max-width: 360px;
    justify-items: center;
    gap: 12px;
    margin-top: 30px;
    padding: 18px 0;
    border-top: 1px solid rgba(255, 255, 255, .18);
    border-bottom: 1px solid rgba(255, 255, 255, .16);
  }

  .homepage-roll-compact__button {
    display: inline-flex;
    width: 100%;
    height: 50px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, .82);
    border-radius: 12px;
    background: var(--homepage-text);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .42), 0 10px 24px rgba(7, 4, 14, .18);
    color: #17151b;
    font: 650 .92rem / 1 var(--homepage-display);
    text-decoration: none;
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
  }

  .homepage-roll-compact__button:hover {
    border-color: color-mix(in srgb, var(--homepage-roll-accent) 72%, white 28%);
    background: color-mix(in srgb, var(--homepage-roll-accent) 72%, white 28%);
    box-shadow: 0 12px 28px var(--homepage-roll-accent-glow);
    transform: translateY(-1px);
  }

  .homepage-roll-compact__button:focus-visible,
  .homepage-roll-compact__claim:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 4px; }

  .homepage-roll-compact__claim {
    padding: 4px 8px;
    color: rgba(255, 255, 255, .86);
    font: 600 .73rem / 1.2 'Inter', sans-serif;
    text-decoration-color: rgba(255, 255, 255, .42);
    text-underline-offset: 4px;
  }

  .homepage-roll-compact__claim:hover { color: #fff; text-decoration-color: #fff; }

  .homepage-hero__product { min-width: 0; width: min(100%, 590px); justify-self: center; }
  .homepage-profile-stage { width: 100%; min-width: 0; filter: drop-shadow(0 30px 70px rgba(41, 18, 57, .2)); }
  .homepage-profile-pop { width: 100%; }

  @media (max-width: 1180px) {
    .homepage-hero { grid-template-columns: minmax(290px, .8fr) minmax(430px, 1.2fr); gap: clamp(38px, 5vw, 72px); }
    .homepage-hero__product { width: min(100%, 510px); }
    .homepage-hero h1 { font-size: clamp(3.6rem, 5.7vw, 5rem); }
  }

  @media (max-width: 930px) {
    .homepage-hero { grid-template-columns: 1fr; gap: 54px; min-height: auto; padding: 42px 0 92px; }
    .homepage-hero__copy { width: 100%; max-width: 580px; justify-self: stretch; }
    .homepage-hero h1 { max-width: 540px; font-size: clamp(4rem, 14vw, 5.5rem); }
    .homepage-hero__lede { max-width: 500px; }
    .homepage-roll-compact { max-width: 420px; }
    .homepage-hero__product { width: min(100%, 560px); justify-self: center; }
  }

  @media (max-width: 460px) {
    .homepage-hero { gap: 42px; padding-bottom: 76px; }
    .homepage-hero h1 { font-size: clamp(3.55rem, 17vw, 4.6rem); }
    .homepage-hero__lede { font-size: .93rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-roll-compact__button { transition: none; }
  }
</style>
