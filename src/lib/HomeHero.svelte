<script>
  import { createEventDispatcher } from 'svelte';
  import HomeDailyResult from './HomeDailyResult.svelte';
  import HomeUsernameClaim from './HomeUsernameClaim.svelte';

  export let isAuthenticated = false;
  export let roll = null;

  const dispatch = createEventDispatcher();
</script>

<section class="home-hero" aria-labelledby="home-title">
  <div class="home-shell home-hero__shell">
    <div class="home-hero__intro">
      <div>
        <p class="home-kicker">Public profiles / one roll each day</p>
        <h1 id="home-title">A public profile that <span>changes every day.</span></h1>
      </div>
      <div class="home-hero__side">
        <p>Customize your page with a background, avatar, music, links, and profile effects. Each daily color becomes part of your profile history, earns EP, and changes where your page appears on chm.lol.</p>
        <HomeUsernameClaim isAuthenticated={isAuthenticated} inputId="home-claim-hero" showLabel={false} on:claim={event => dispatch('claim', event.detail)} on:profile={() => dispatch('profile')} />
      </div>
    </div>

    <div class="home-hero__stage">
      <div class="home-hero__profile-frame">
        <picture>
          <source media="(max-width: 760px)" srcset="/homepage/admin-profile-mobile.webp" />
          <img src="/homepage/admin-profile-desktop.png" alt="Example chm.lol public profile" width="2553" height="1379" fetchpriority="high" decoding="async" />
        </picture>
      </div>
      <HomeDailyResult roll={roll} />
    </div>
  </div>
</section>

<style>
  .home-hero { height: calc(100svh - 101px); min-height: 38.75rem; max-height: 61.25rem; padding: clamp(1.5rem, 3.4vh, 2.65rem) 0; }
  .home-hero__shell { display: grid; height: 100%; min-height: 0; grid-template-rows: auto minmax(0, 1fr); gap: clamp(1.1rem, 2.6vh, 1.65rem); }
  .home-hero__intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(26.25rem, 33.75rem); align-items: end; gap: 3.6rem; }
  .home-kicker { margin: 0; color: #858690; font: 500 0.68rem / 1 var(--home-mono); letter-spacing: 0.13em; text-transform: uppercase; }
  .home-hero h1 { max-width: 55rem; margin: 0.9rem 0 0; color: var(--home-ink); font: 650 clamp(3.1rem, min(6vw, 8.4vh), 5.5rem) / 0.9 var(--home-font); letter-spacing: -0.045em; }
  .home-hero h1 span { color: var(--home-accent); }
  .home-hero__side > p { margin: 0 0 1.05rem; color: var(--home-ink-muted); font-size: 1rem; line-height: 1.6; }
  .home-hero__stage { display: grid; grid-template-columns: minmax(0, 1fr) 14.9rem; min-height: 0; height: 100%; overflow: hidden; border: 1px solid #3a3e48; border-radius: 0.65rem; background: #0a0c10; box-shadow: 0 1.9rem 5rem rgba(0, 0, 0, 0.4); animation: home-stage-enter 0.95s 0.13s cubic-bezier(0.2, 0.72, 0.2, 1) both; }
  .home-hero__profile-frame { position: relative; min-width: 0; overflow: hidden; }
  .home-hero__profile-frame::after { position: absolute; right: 0; bottom: 0; left: 0; height: 22%; content: ''; background: linear-gradient(180deg, transparent, rgba(7, 8, 11, 0.34)); pointer-events: none; }
  .home-hero__profile-frame picture, .home-hero__profile-frame img { display: block; width: 100%; height: 100%; }
  .home-hero__profile-frame img { min-height: 0; object-fit: cover; object-position: center; filter: saturate(0.94) brightness(0.92); transform: scale(1.08); transition: transform 0.22s ease-out, filter 0.4s ease; will-change: transform; }
  .home-hero__profile-frame:hover img { filter: saturate(0.99) brightness(0.96); transform: scale(1.09); }
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
    :global(.home-daily) { min-height: 15.5rem; }
  }
  @media (max-width: 48rem) {
    .home-hero { padding-top: 2rem; }
    .home-hero h1 { max-width: 38rem; font-size: clamp(2.8rem, 11vw, 4.5rem); }
    .home-hero__stage { border-radius: 0.5rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-hero__intro > *, .home-hero__stage { animation: none; }
    .home-hero__profile-frame img { transition: none; transform: none; }
  }
</style>
