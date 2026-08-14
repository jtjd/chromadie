<script>
  import HomepageProfileRenderer from './HomepageProfileRenderer.svelte';
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
      <p class="homepage-section-sub">The current profile system has five structural layouts—Compact, Sleek, Minimal, Modern, and Portfolio. Media and cosmetics provide the personality.</p>
    </div>

    <div class="homepage-profiles-grid">
      {#each fixtures as fixture (fixture.id)}
        <article class={`homepage-showcase-card homepage-showcase-card--${fixture.profileConfig.layoutVariant}`} aria-label={`${fixture.layoutLabel} layout example`}>
          <span class="homepage-showcase-card__label">{fixture.layoutLabel} layout</span>
          <HomepageProfileRenderer fixture={fixture} previewDevice="desktop" className="homepage-profile-renderer--showcase" />
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
    background: #050506;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    isolation: isolate;
  }

  .homepage-showcase-card::after { position: absolute; z-index: 1; inset: 0; content: ''; pointer-events: none; background: linear-gradient(to bottom, rgba(2, 2, 3, 0.12), rgba(2, 2, 3, 0.12) 45%, rgba(2, 2, 3, 0.72)); }
  .homepage-showcase-card__label { position: absolute; top: 20px; left: 20px; z-index: 5; padding: 7px 10px; border: 1px solid rgba(255, 255, 255, 0.11); border-radius: 100px; background: rgba(8, 8, 10, 0.58); color: rgba(245, 245, 247, 0.68); font: 600 0.68rem / 1 'Inter', sans-serif; letter-spacing: 0.1em; text-transform: uppercase; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .homepage-showcase-card :global(.homepage-profile-renderer) { position: absolute; inset: 0; z-index: 2; }
  .homepage-showcase-card :global(.profile-shell-page) { padding: 0; }
  .homepage-showcase-card :global(.profile-shell__opening.profile-shell__approved-opening) { width: min(100%, 320px); }
  .homepage-showcase-card--minimal :global(.profile-shell__opening.profile-shell__approved-opening) { width: 58%; margin-left: 30px; margin-right: auto; align-self: flex-end; }
  .homepage-showcase-card--portfolio :global(.profile-shell__opening.profile-shell__approved-opening) { width: 72%; }
  .homepage-showcase-card :global(.profile-shell__approved-main) { height: 100%; min-height: 100%; }

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
    .homepage-showcase-card--minimal :global(.profile-shell__opening.profile-shell__approved-opening),
    .homepage-showcase-card--portfolio :global(.profile-shell__opening.profile-shell__approved-opening) { width: min(100%, 320px); margin-inline: auto; align-self: center; }
  }
</style>
