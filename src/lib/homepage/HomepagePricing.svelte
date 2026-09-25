<script>
  import { pricingComparisonRows } from '../pricingData.js';

  export let isAuthenticated = false;
  export let sectionId = 'pricing';

  $: freeHref = isAuthenticated ? '/profile/settings' : '/signup';
  $: freeLabel = isAuthenticated ? 'Open Profile Studio' : 'Create a free profile';
  const freeFeatures = pricingComparisonRows.filter(row => row.free);
  const plusFeatures = pricingComparisonRows.filter(row => !row.free && row.plus);
</script>

<section class="homepage-section homepage-pricing" id={sectionId} data-homepage-reveal aria-labelledby="homepage-pricing-title">
  <div class="homepage-pricing__intro">
    <h2 class="homepage-section-heading" id="homepage-pricing-title">Free to play.<br />Yours to keep.</h2>
    <p class="homepage-section-sub">Your daily rolls and a fully customizable profile are free. Add Plus when you want more room for your own media.</p>
  </div>

  <div class="homepage-pricing__cards" aria-label="Free profile and Chromadie Plus plans">
    <article class="homepage-pricing__card homepage-pricing__card--free">
      <div class="homepage-pricing__card-head">
        <h3>Free profile</h3>
        <p class="homepage-pricing__price">$0 <span>forever</span></p>
        <p class="homepage-pricing__description">Everything you need to get started.</p>
      </div>
      <div class="homepage-pricing__features">
        <p>Included with your profile</p>
        <ul>
          {#each freeFeatures as feature (feature.label)}
            <li>{feature.label}</li>
          {/each}
        </ul>
      </div>
      <div class="homepage-pricing__actions">
        <a href={freeHref}>{freeLabel}</a>
        <p class="homepage-pricing__terms">Free for everyone.</p>
      </div>
    </article>

    <article class="homepage-pricing__card homepage-pricing__card--plus">
      <div class="homepage-pricing__card-head">
        <h3>Chromadie Plus</h3>
        <p class="homepage-pricing__price">$7.99 <span>one-time</span></p>
        <p class="homepage-pricing__description">More ways to make it personal.</p>
      </div>
      <div class="homepage-pricing__features">
        <p>Everything in Free, plus</p>
        <ul>
          {#each plusFeatures as feature (feature.label)}
            <li>{feature.label}</li>
          {/each}
        </ul>
      </div>
      <div class="homepage-pricing__actions">
        <a href="/pricing">Explore Plus</a>
        <p class="homepage-pricing__terms">USD · lifetime · one identity · 1 GB shared media</p>
      </div>
    </article>
  </div>
</section>

<style>
  .homepage-pricing__intro { display: grid; grid-template-columns: 1.2fr 1fr; align-items: end; gap: 64px; }
  .homepage-pricing__intro .homepage-section-sub { margin: 0; }
  .homepage-pricing__cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; margin-top: 48px; border-top: 1px solid var(--homepage-border-strong); }
  .homepage-pricing__card { display: flex; min-width: 0; flex-direction: column; gap: 32px; padding: 36px 48px 0 0; }
  .homepage-pricing__card--plus { padding: 36px 0 0 48px; border-left: 1px solid var(--homepage-border); }
  .homepage-pricing__card h3 { margin: 0; color: var(--homepage-text); font: 600 1.25rem / 1.3 var(--homepage-display); letter-spacing: -.025em; }
  .homepage-pricing__price { margin: 24px 0 16px; color: var(--homepage-text); font: 500 clamp(3rem, 5vw, 4rem) / 1 var(--homepage-display); letter-spacing: -.06em; }
  .homepage-pricing__price span { display: inline-block; margin-left: 8px; color: var(--homepage-muted); font: 400 .875rem / 1 'Inter', sans-serif; letter-spacing: 0; vertical-align: baseline; }
  .homepage-pricing__description { margin: 0; color: var(--homepage-secondary-muted); font-size: .9375rem; line-height: 1.6; }
  .homepage-pricing__features > p { margin: 0 0 18px; color: var(--homepage-text); font-size: .875rem; font-weight: 500; }
  .homepage-pricing__card ul { display: grid; gap: 12px; margin: 0; padding: 0; color: var(--homepage-secondary-muted); font-size: .9375rem; line-height: 1.5; list-style: none; }
  .homepage-pricing__actions { margin-top: auto; }
  .homepage-pricing__actions a { display: inline-flex; width: 100%; padding-inline: 20px; min-height: 50px; align-items: center; justify-content: center; border: 1px solid var(--homepage-border-strong); border-radius: 8px; background: transparent; color: var(--homepage-text); font-size: .875rem; font-weight: 600; text-decoration: none; transition: background-color 180ms ease, border-color 180ms ease; }
  .homepage-pricing__actions a:hover { border-color: var(--homepage-muted); background: #1c1c20; }
  .homepage-pricing__card--free .homepage-pricing__actions a { background: var(--homepage-text); color: #08080a; border-color: transparent; }
  .homepage-pricing__card--free .homepage-pricing__actions a:hover { background: #dcdce2; }
  .homepage-pricing__actions a:focus-visible { outline: 2px solid var(--homepage-text); outline-offset: 4px; }
  .homepage-pricing__terms { margin: 14px 0 0; color: var(--homepage-muted); font-size: .75rem; line-height: 1.6; text-align: center; }
  @media (max-width: 780px) {
    .homepage-pricing__intro { grid-template-columns: 1fr; gap: 24px; }
    .homepage-pricing__card { padding-right: 24px; }
    .homepage-pricing__card--plus { padding-left: 24px; padding-right: 0; }
  }
  @media (max-width: 600px) {
    .homepage-pricing__cards { grid-template-columns: 1fr; gap: 40px; margin-top: 32px; }
    .homepage-pricing__card { padding: 32px 0 0; gap: 28px; }
    .homepage-pricing__card--plus { border-left: 0; border-top: 1px solid var(--homepage-border-strong); }
  }
  @media (prefers-reduced-motion: reduce) {
    .homepage-pricing__actions a { transition: none; }
  }
</style>
