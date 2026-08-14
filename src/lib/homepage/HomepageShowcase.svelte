<script>
  import HomepageProfileDemo from './HomepageProfileDemo.svelte';
  import { getHomepageShowcaseFixtures } from './homepageFixtures.js';

  const fixtures = getHomepageShowcaseFixtures();
</script>

<div class="homepage-showcase-wrap" id="showcase">
  <section class="homepage-section homepage-showcase" aria-labelledby="homepage-showcase-title">
    <div class="homepage-showcase__top">
      <div>
        <div class="homepage-section-kicker">Your page, not ours</div>
        <h2 id="homepage-showcase-title" class="homepage-section-heading">Profiles shouldn't all look <span>the same.</span></h2>
      </div>
      <p class="homepage-section-sub">Media and cosmetics give the same profile idea a different point of view. Background, avatar, links, music, and daily history make the page personal.</p>
    </div>

    <div class="homepage-profiles-grid">
      {#each fixtures as fixture (fixture.id)}
        <article
          class={`homepage-showcase-card homepage-showcase-card--${fixture.showcasePosition}`}
          style={`--homepage-showcase-background: url("${fixture.media.background}"); --homepage-showcase-accent: ${fixture.accent};`}
          aria-label={`${fixture.displayName} profile example`}
        >
          <HomepageProfileDemo fixture={fixture} variant="showcase" />
        </article>
      {/each}
    </div>
  </section>
</div>

<style>
  .homepage-showcase-wrap { border-top: 1px solid var(--homepage-border); border-bottom: 1px solid var(--homepage-border); background: #070708; }
  .homepage-showcase { padding: 120px 0 132px; }
  .homepage-showcase__top { display: flex; align-items: flex-end; justify-content: space-between; gap: 60px; }
  .homepage-showcase__top .homepage-section-sub { max-width: 420px; margin: 0 0 4px; }
  .homepage-profiles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 66px; }

  .homepage-showcase-card {
    position: relative;
    min-height: 470px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    background-image: var(--homepage-showcase-background);
    background-position: center;
    background-size: cover;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    isolation: isolate;
  }

  .homepage-showcase-card::after {
    position: absolute;
    z-index: 1;
    inset: 0;
    content: '';
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(2, 2, 3, 0.12), rgba(2, 2, 3, 0.42) 45%, rgba(2, 2, 3, 0.8));
  }

  .homepage-showcase-card--left :global(.homepage-profile-demo__mini-profile) {
    right: auto;
    left: 30px;
    width: 58%;
    border-color: transparent;
    background: rgba(5, 5, 6, 0.26);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .homepage-showcase-card--center :global(.homepage-profile-demo__mini-profile) {
    right: auto;
    left: 50%;
    width: 72%;
    transform: translateX(-50%);
    border-color: transparent;
    background: rgba(5, 5, 6, 0.26);
  }

  @media (max-width: 1100px) {
    .homepage-profiles-grid { grid-template-columns: repeat(2, 1fr); }
    .homepage-showcase-card:last-child { grid-column: 1 / -1; min-height: 410px; }
  }

  @media (max-width: 780px) {
    .homepage-showcase { padding: 86px 0 94px; }
    .homepage-showcase__top { display: block; }
    .homepage-showcase__top .homepage-section-sub { margin-top: 20px; }
    .homepage-profiles-grid { grid-template-columns: 1fr; gap: 14px; }
    .homepage-showcase-card,
    .homepage-showcase-card:last-child { grid-column: auto; min-height: 440px; }
    .homepage-showcase-card--left :global(.homepage-profile-demo__mini-profile),
    .homepage-showcase-card--center :global(.homepage-profile-demo__mini-profile) {
      right: 22px;
      left: 22px;
      width: auto;
      transform: none;
    }
  }
</style>
